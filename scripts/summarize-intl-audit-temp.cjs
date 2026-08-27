'use strict';

const fs = require('node:fs');
const path = require('node:path');

const reportPath = path.join('audit', 'intl-content-link-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const timeoutMs = 15000;

function stripHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'PlayPoint-internal-audit/2026-08-27', 'cache-control': 'no-cache' }
    });
    return { url, status: response.status, finalUrl: response.url, error: null };
  } catch (error) {
    return { url, status: 0, finalUrl: null, error: String(error && error.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function readArticle(locale, slug) {
  const file = path.join(locale, 'articles', slug);
  return fs.existsSync(file) ? stripHtml(fs.readFileSync(file, 'utf8')) : '';
}

function snippets(text, regex, radius = 130) {
  const results = [];
  let match;
  const global = regex.global ? regex : new RegExp(regex.source, regex.flags + 'g');
  while ((match = global.exec(text)) && results.length < 12) {
    const start = Math.max(0, match.index - radius);
    const end = Math.min(text.length, match.index + match[0].length + radius);
    results.push(text.slice(start, end));
    if (match[0].length === 0) global.lastIndex++;
  }
  return results;
}

(async () => {
  const flagCounts = {};
  const flagsByCode = {};
  for (const page of report.pages) {
    for (const flag of page.flags) {
      flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
      (flagsByCode[flag.code] ||= []).push({ url: page.url, severity: flag.severity, detail: flag.detail });
    }
  }

  const externalRechecks = await mapLimit(report.externalFailures.map(x => x.url), 6, get);
  const actualExternalFailures = externalRechecks.filter(x => x.status === 0 || x.status >= 400);

  const termAudit = {};
  for (const locale of ['en', 'ko', 'tw']) {
    const files = fs.readdirSync(path.join(locale, 'articles')).filter(f => f.endsWith('.html') && f !== 'index.html');
    const findings = [];
    for (const file of files) {
      const text = readArticle(locale, file);
      const local = [];
      if (locale === 'en') {
        if (/[\u3040-\u30ff\uac00-\ud7af]/u.test(text)) local.push('foreign-script');
        if (/\b(?:Bronze|Silver|Gold|Platinum|Diamond)\b/.test(text) && /(?:250|1,000|4,000|15,000)/.test(text) && /United States|US account|\$1/.test(text)) local.push('possible-jp-threshold-in-us-context');
      }
      if (locale === 'ko') {
        if (/[\u3040-\u30ff]/u.test(text)) local.push('japanese-script');
        if (/\b(?:Bronze|Silver|Gold|Platinum|Diamond)\b/.test(text)) local.push('english-level-name');
        if (/(?:250|1,000|4,000)/.test(text) && /(한국|대한민국|₩1,000|1,000원)/.test(text)) local.push('possible-wrong-kr-threshold');
        if (/Google Play Points/.test(text) && !/Google Play 포인트/.test(text)) local.push('brand-not-localized-in-prose');
      }
      if (locale === 'tw') {
        if (/[\u3040-\u30ff\uac00-\ud7af]/u.test(text)) local.push('foreign-script');
        if (/(?:青铜级|白银级|黄金级|积分|等级|帐户|应用程序)/.test(text)) local.push('simplified-chinese');
        if (/(?:金級|鉑金級)/.test(text)) local.push('hk-level-term-on-tw');
        if (/Google Play Points/.test(text) && !/Google Play 點數/.test(text)) local.push('brand-not-localized-in-prose');
      }
      if (/\b(?:TODO|TBD|undefined|null|NaN)\b|\[object Object\]/i.test(text)) local.push('placeholder');
      if (local.length) findings.push({ file, findings: [...new Set(local)] });
    }
    termAudit[locale] = findings;
  }

  const factSnippets = {
    enLevels: snippets(readArticle('en', 'google-play-points-levels.html'), /(?:Bronze|Silver|Gold|Platinum|Diamond|\$1|150|599|600|2,999|3,000|9,999|10,000)/g),
    koLevels: snippets(readArticle('ko', 'google-play-points-levels.html'), /(?:브론즈|실버|골드|플래티넘|다이아몬드|1,000원|150|599|600|2,399|2,400|14,999|15,000)/g),
    twLevels: snippets(readArticle('tw', 'google-play-points-levels.html'), /(?:銅級|銀級|黃金級|白金級|鑽石級|NT\$30|250|999|1,000|3,999|4,000|14,999|15,000)/g)
  };

  const output = {
    generatedAt: new Date().toISOString(),
    originalSummary: report.summary,
    flagCounts,
    flagsByCode,
    externalRechecks: {
      checked: externalRechecks.length,
      ok: externalRechecks.filter(x => x.status >= 200 && x.status < 400).length,
      actualFailures: actualExternalFailures
    },
    termAudit,
    factSnippets
  };
  fs.writeFileSync(path.join('audit', 'intl-content-link-summary.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ flagCounts, external: output.externalRechecks, termCounts: Object.fromEntries(Object.entries(termAudit).map(([k,v]) => [k,v.length])) }, null, 2));
})();
