'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit', 'intl-content-link-report.json'), 'utf8'));
const LANG_KEY = { en: 'en', ko: 'ko', tw: 'zh-TW' };

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(html) {
  return decodeEntities(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractH1(html) {
  const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripHtml(match[1]) : '';
}

function extractHubLinks(html) {
  const links = [];
  const main = html.match(/<main\b[^>]*intl-article-hub[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  for (const match of main.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(match[1]);
    if (!/^\/(en|ko|tw)\/articles\/[^/]+\.html$/.test(href)) continue;
    links.push({ href, label: stripHtml(match[2]) });
  }
  return links;
}

function articleFileFromHref(href) {
  return href.replace(/^\//, '');
}

function negationTokens(locale, text) {
  if (locale === 'ko') return [...new Set(text.match(/(?:않|없|못|아니|미적용|미완료|되지 않)/g) || [])];
  if (locale === 'tw') return [...new Set(text.match(/(?:沒有|無法|不會|不能|未|無|沒)/g) || [])];
  return [...new Set((text.toLowerCase().match(/\b(?:not|no|without|cannot|can't|won't|doesn't|isn't|aren't)\b/g) || []))];
}

const pageByUrl = new Map(report.pages.map(page => [page.url, page]));
const canonicalMismatch = report.pages
  .filter(page => page.canonical !== page.url)
  .map(page => ({ url: page.url, canonical: page.canonical }));
const selfHreflangMismatch = [];
const reciprocityFailures = [];
for (const page of report.pages) {
  const selfLang = LANG_KEY[page.locale];
  if (page.hreflang[selfLang] !== page.url) {
    selfHreflangMismatch.push({ url: page.url, lang: selfLang, target: page.hreflang[selfLang] || null });
  }
  for (const [targetLang, targetUrl] of Object.entries(page.hreflang)) {
    if (!['en', 'ko', 'zh-TW'].includes(targetLang)) continue;
    const target = pageByUrl.get(targetUrl);
    if (!target) continue;
    if (target.hreflang[selfLang] !== page.url) {
      reciprocityFailures.push({ from: page.url, hreflang: targetLang, to: targetUrl, expectedBackLang: selfLang, actualBack: target.hreflang[selfLang] || null });
    }
  }
}

const hubNegationMismatches = [];
for (const locale of ['en', 'ko', 'tw']) {
  const hubPath = path.join(ROOT, locale, 'articles', 'index.html');
  const hubHtml = fs.readFileSync(hubPath, 'utf8');
  for (const link of extractHubLinks(hubHtml)) {
    const targetPath = path.join(ROOT, articleFileFromHref(link.href));
    if (!fs.existsSync(targetPath)) continue;
    const h1 = extractH1(fs.readFileSync(targetPath, 'utf8'));
    const h1Neg = negationTokens(locale, h1);
    const labelNeg = negationTokens(locale, link.label);
    if (h1Neg.length && !labelNeg.length) {
      hubNegationMismatches.push({ locale, href: link.href, label: link.label, h1, h1Neg });
    }
  }
}

const languageFindings = { en: [], ko: [], tw: [] };
const counts = {
  twBareGoldTier: 0,
  twHongKongPlatinumTerm: 0,
  twCumulativeRateTerm: 0,
  twSimplifiedExclusiveChars: 0,
  koActualJapaneseText: 0,
  enActualCjkText: 0,
  repeatedEnglishWord: 0
};

const simplifiedExclusive = /[这后发会为与帐级奖励积数购买应书国变过还没现]/g;
for (const locale of ['en', 'ko', 'tw']) {
  const dir = path.join(ROOT, locale, 'articles');
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, file), 'utf8');
    const text = stripHtml(html);
    const findings = [];
    if (locale === 'en') {
      const cjk = text.match(/[\u3041-\u3096\u30A1-\u30FA\u30FC\uAC00-\uD7A3\u4E00-\u9FFF]/u);
      if (cjk) { findings.push({ code: 'actual-cjk-in-en', sample: cjk[0] }); counts.enActualCjkText++; }
      const repeated = text.match(/\b([A-Za-z]{2,})\s+\1\b/i);
      if (repeated) { findings.push({ code: 'repeated-english-word', sample: repeated[0] }); counts.repeatedEnglishWord++; }
    }
    if (locale === 'ko') {
      const jp = text.match(/[\u3041-\u3096\u30A1-\u30FA\u30FC]/u);
      if (jp) { findings.push({ code: 'actual-japanese-in-ko', sample: jp[0] }); counts.koActualJapaneseText++; }
    }
    if (locale === 'tw') {
      const bareGold = [...text.matchAll(/金級/g)].filter(match => {
        const prev = text[match.index - 1] || '';
        return prev !== '黃' && prev !== '白' && prev !== '鉑';
      });
      if (bareGold.length) { findings.push({ code: 'tw-bare-gold-tier', count: bareGold.length }); counts.twBareGoldTier += bareGold.length; }
      const hkPlat = text.match(/鉑金級/g) || [];
      if (hkPlat.length) { findings.push({ code: 'tw-hk-platinum-term', count: hkPlat.length }); counts.twHongKongPlatinumTerm += hkPlat.length; }
      const cumulative = text.match(/累積率/g) || [];
      if (cumulative.length) { findings.push({ code: 'tw-cumulative-rate-term', count: cumulative.length }); counts.twCumulativeRateTerm += cumulative.length; }
      const simplified = text.match(simplifiedExclusive) || [];
      if (simplified.length) { findings.push({ code: 'simplified-exclusive-char', chars: [...new Set(simplified)].slice(0, 20) }); counts.twSimplifiedExclusiveChars += simplified.length; }
    }
    if (findings.length) languageFindings[locale].push({ file, findings });
  }
}

const output = {
  generatedAt: new Date().toISOString(),
  canonicalMismatch,
  selfHreflangMismatch,
  reciprocityFailures,
  hubNegationMismatches,
  counts,
  languageFindings
};
fs.writeFileSync(path.join(ROOT, 'audit', 'intl-deep-language-summary.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
  canonicalMismatch: canonicalMismatch.length,
  selfHreflangMismatch: selfHreflangMismatch.length,
  reciprocityFailures: reciprocityFailures.length,
  hubNegationMismatches,
  counts
}, null, 2));
