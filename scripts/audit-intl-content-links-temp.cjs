'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://playpoint-sim.com';
const LOCALES = {
  en: { lang: 'en', home: '/en/articles/' },
  ko: { lang: 'ko', home: '/ko/articles/' },
  tw: { lang: 'zh-TW', home: '/tw/articles/' }
};
const REQUIRED_HREFLANG = ['ja', 'en', 'ko', 'zh-TW', 'x-default'];
const timeoutMs = 15000;

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

function normalizeText(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function stripHtml(html) {
  return normalizeText(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function extractTagTexts(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map(match => stripHtml(match[1]))
    .filter(Boolean);
}

function extractLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const raw = decodeEntities(match[1]).trim();
    if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    try {
      const url = new URL(raw, baseUrl);
      url.hash = '';
      links.push(url.href);
    } catch {}
  }
  return [...new Set(links)];
}

function extractCanonical(html, baseUrl) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttr(tag, 'rel');
    if (rel && rel.toLowerCase().split(/\s+/).includes('canonical')) {
      const href = getAttr(tag, 'href');
      if (!href) return null;
      try { return new URL(href, baseUrl).href; } catch { return href; }
    }
  }
  return null;
}

function extractHreflang(html, baseUrl) {
  const result = {};
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttr(tag, 'rel');
    const lang = getAttr(tag, 'hreflang');
    const href = getAttr(tag, 'href');
    if (!rel || !lang || !href || !rel.toLowerCase().split(/\s+/).includes('alternate')) continue;
    try { result[lang] = new URL(href, baseUrl).href; } catch { result[lang] = href; }
  }
  return result;
}

async function request(url, method = 'GET') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': 'PlayPoint-internal-audit/2026-08-27',
        'accept': method === 'GET' ? 'text/html,application/xhtml+xml,*/*;q=0.8' : '*/*',
        'cache-control': 'no-cache'
      }
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPage(url) {
  try {
    let response = await request(url, 'GET');
    const chain = [];
    let current = url;
    for (let i = 0; i < 5 && response.status >= 300 && response.status < 400; i++) {
      const location = response.headers.get('location');
      if (!location) break;
      const next = new URL(location, current).href;
      chain.push({ status: response.status, from: current, to: next });
      current = next;
      response = await request(current, 'GET');
    }
    return { status: response.status, finalUrl: current, redirects: chain, html: await response.text(), error: null };
  } catch (error) {
    return { status: 0, finalUrl: url, redirects: [], html: '', error: String(error && error.message || error) };
  }
}

async function checkUrl(url) {
  try {
    let response = await request(url, 'HEAD');
    if (response.status === 405 || response.status === 403 || response.status === 400) response = await request(url, 'GET');
    return { url, status: response.status, location: response.headers.get('location') || null, error: null };
  } catch (error) {
    return { url, status: 0, location: null, error: String(error && error.message || error) };
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function pageFlags(locale, url, html, text, meta) {
  const flags = [];
  const pathname = new URL(url).pathname;
  const expectedLang = LOCALES[locale].lang;
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || '';
  const actualLang = getAttr(htmlTag, 'lang');
  if (!actualLang || actualLang.toLowerCase() !== expectedLang.toLowerCase()) {
    flags.push({ severity: 'error', code: 'html-lang', detail: `expected ${expectedLang}, got ${actualLang || 'missing'}` });
  }

  if (!meta.canonical) flags.push({ severity: 'error', code: 'canonical-missing', detail: '' });
  else {
    const c = new URL(meta.canonical);
    if (c.origin !== BASE) flags.push({ severity: 'error', code: 'canonical-origin', detail: meta.canonical });
    if (!c.pathname.startsWith(`/${locale}/articles/`)) flags.push({ severity: 'error', code: 'canonical-locale', detail: meta.canonical });
  }
  for (const hreflang of REQUIRED_HREFLANG) {
    if (!meta.hreflang[hreflang]) flags.push({ severity: 'error', code: 'hreflang-missing', detail: hreflang });
  }

  const placeholder = text.match(/\b(?:TODO|TBD|undefined|null|NaN|lorem ipsum|translation pending)\b|\[object Object\]|翻訳中|번역 중/iu);
  if (placeholder) flags.push({ severity: 'error', code: 'placeholder', detail: placeholder[0] });

  if (locale === 'en') {
    const foreign = text.match(/[\u3040-\u30ff\uac00-\ud7af]/u);
    if (foreign) flags.push({ severity: 'error', code: 'foreign-script', detail: foreign[0] });
  } else if (locale === 'ko') {
    const jp = text.match(/[\u3040-\u30ff]/u);
    if (jp) flags.push({ severity: 'error', code: 'japanese-script', detail: jp[0] });
    if (/\b(?:Related articles|Article navigation|Editorial policy|Updated|Answer:)\b/i.test(text)) {
      flags.push({ severity: 'warn', code: 'english-ui-copy', detail: 'English UI/article phrase found in Korean page' });
    }
    const googlePlayPointsCount = (text.match(/Google Play Points/g) || []).length;
    const koreanPointsCount = (text.match(/Google Play 포인트/g) || []).length;
    if (googlePlayPointsCount >= 5 && koreanPointsCount === 0) {
      flags.push({ severity: 'warn', code: 'ko-brand-prose', detail: `${googlePlayPointsCount}x Google Play Points, 0x Google Play 포인트` });
    }
  } else if (locale === 'tw') {
    const foreign = text.match(/[\u3040-\u30ff\uac00-\ud7af]/u);
    if (foreign) flags.push({ severity: 'error', code: 'foreign-script', detail: foreign[0] });
    if (/\b(?:Related articles|Article navigation|Editorial policy|Updated|Answer:)\b/i.test(text)) {
      flags.push({ severity: 'warn', code: 'english-ui-copy', detail: 'English UI/article phrase found in Traditional Chinese page' });
    }
    const brandCount = (text.match(/Google Play Points/g) || []).length;
    const localCount = (text.match(/Google Play 點數/g) || []).length;
    if (brandCount >= 5 && localCount === 0) {
      flags.push({ severity: 'warn', code: 'tw-brand-prose', detail: `${brandCount}x Google Play Points, 0x Google Play 點數` });
    }
    for (const simplified of ['积分', '等级', '应用程序', '帐户', '兑换', '获取']) {
      if (text.includes(simplified)) flags.push({ severity: 'warn', code: 'simplified-chinese', detail: simplified });
    }
  }

  if (!meta.title) flags.push({ severity: 'error', code: 'title-missing', detail: '' });
  if (!meta.h1) flags.push({ severity: 'error', code: 'h1-missing', detail: '' });
  if (meta.h1 && meta.title && normalizeText(meta.title).toLowerCase() === normalizeText(meta.h1).toLowerCase() && pathname.endsWith('/articles/')) {
    // fine; explicit no-op so hub equality is not treated as an error
  }
  return flags;
}

async function main() {
  const discovered = new Set(Object.values(LOCALES).map(x => BASE + x.home));
  const sitemapResult = await fetchPage(BASE + '/sitemap.xml');
  if (sitemapResult.status === 200) {
    for (const match of sitemapResult.html.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
      const href = decodeEntities(match[1].trim());
      try {
        const u = new URL(href);
        if (u.origin === BASE && /^\/(en|ko|tw)\/articles\/(?:[^/]+\.html)?$/.test(u.pathname)) discovered.add(u.href);
      } catch {}
    }
  }

  const pageMap = new Map();
  let pending = [...discovered];
  while (pending.length) {
    const batch = pending.splice(0, 20).filter(url => !pageMap.has(url));
    const fetched = await mapLimit(batch, 6, async url => [url, await fetchPage(url)]);
    for (const [url, result] of fetched) {
      pageMap.set(url, result);
      if (result.status !== 200 || !result.html) continue;
      for (const link of extractLinks(result.html, url)) {
        const u = new URL(link);
        if (u.origin === BASE && /^\/(en|ko|tw)\/articles\/(?:[^/]+\.html)?$/.test(u.pathname) && !pageMap.has(u.href) && !discovered.has(u.href)) {
          discovered.add(u.href);
          pending.push(u.href);
        }
      }
    }
  }

  const pages = [];
  const allLinks = new Set();
  const externalLinks = new Set();
  const corpus = { en: [], ko: [], tw: [] };
  for (const [url, result] of [...pageMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const locale = new URL(url).pathname.split('/')[1];
    if (!LOCALES[locale]) continue;
    const html = result.html || '';
    const text = stripHtml(html);
    const title = extractTagTexts(html, 'title')[0] || '';
    const headings = ['h1', 'h2', 'h3'].flatMap(tag => extractTagTexts(html, tag).map(value => ({ tag, text: value })));
    const h1 = headings.find(h => h.tag === 'h1')?.text || '';
    const canonical = extractCanonical(html, url);
    const hreflang = extractHreflang(html, url);
    const links = extractLinks(html, url);
    links.forEach(link => {
      if (new URL(link).origin === BASE) allLinks.add(link);
      else externalLinks.add(link);
    });
    Object.values(hreflang).forEach(link => {
      try {
        if (new URL(link).origin === BASE) allLinks.add(link); else externalLinks.add(link);
      } catch {}
    });
    const meta = { title, h1, canonical, hreflang };
    const flags = [];
    if (result.status !== 200) flags.push({ severity: 'error', code: 'page-http', detail: String(result.status || result.error) });
    flags.push(...pageFlags(locale, url, html, text, meta));
    for (const redirect of result.redirects) flags.push({ severity: 'warn', code: 'page-redirect', detail: `${redirect.status} ${redirect.to}` });

    pages.push({
      locale,
      url,
      status: result.status,
      finalUrl: result.finalUrl,
      title,
      h1,
      headings,
      canonical,
      hreflang,
      linkCount: links.length,
      flags
    });
    corpus[locale].push(`URL: ${url}\nTITLE: ${title}\nHEADINGS:\n${headings.map(h => `${h.tag.toUpperCase()}: ${h.text}`).join('\n')}\nTEXT:\n${text}\n`);
  }

  const internalChecks = await mapLimit([...allLinks].sort(), 10, checkUrl);
  const externalCandidates = [...externalLinks]
    .filter(url => /^https?:/i.test(url))
    .sort();
  const externalChecks = await mapLimit(externalCandidates, 6, checkUrl);

  const internalFailures = internalChecks.filter(x => x.status === 0 || x.status >= 400);
  const internalRedirects = internalChecks.filter(x => x.status >= 300 && x.status < 400);
  const externalFailures = externalChecks.filter(x => x.status === 0 || x.status >= 400);

  const crossLocaleArticleLinks = [];
  for (const page of pages) {
    const result = pageMap.get(page.url);
    if (!result?.html) continue;
    for (const link of extractLinks(result.html, page.url)) {
      const p = new URL(link).pathname;
      const match = p.match(/^\/(en|ko|tw)\/articles\//);
      if (match && match[1] !== page.locale) crossLocaleArticleLinks.push({ from: page.url, to: link });
    }
  }

  const flaggedPages = pages.filter(page => page.flags.length);
  const summary = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    sitemapStatus: sitemapResult.status,
    articlePages: pages.length,
    pagesByLocale: Object.fromEntries(Object.keys(LOCALES).map(locale => [locale, pages.filter(p => p.locale === locale).length])),
    pageHttpErrors: pages.filter(p => p.status !== 200).length,
    flaggedPages: flaggedPages.length,
    errorFlags: pages.flatMap(p => p.flags).filter(f => f.severity === 'error').length,
    warningFlags: pages.flatMap(p => p.flags).filter(f => f.severity === 'warn').length,
    internalLinksChecked: internalChecks.length,
    internalFailures: internalFailures.length,
    internalRedirects: internalRedirects.length,
    externalLinksChecked: externalChecks.length,
    externalFailures: externalFailures.length,
    crossLocaleArticleLinks: crossLocaleArticleLinks.length
  };

  const report = { summary, internalFailures, internalRedirects, externalFailures, crossLocaleArticleLinks, pages };
  fs.mkdirSync(path.join(process.cwd(), 'audit'), { recursive: true });
  fs.writeFileSync(path.join('audit', 'intl-content-link-report.json'), JSON.stringify(report, null, 2) + '\n');
  for (const locale of Object.keys(corpus)) {
    fs.writeFileSync(path.join('audit', `intl-corpus-${locale}.txt`), corpus[locale].join('\n---\n\n'));
  }
  console.log(JSON.stringify(summary, null, 2));
  if (internalFailures.length) console.log('INTERNAL_FAILURES', JSON.stringify(internalFailures, null, 2));
  if (crossLocaleArticleLinks.length) console.log('CROSS_LOCALE', JSON.stringify(crossLocaleArticleLinks, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
