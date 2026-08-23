'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const REGION_CONTENT_DATE = '2026-08-23';

const REGION_PAGES = Object.freeze({
  hk: {
    source: 'tw',
    hreflang: 'zh-HK',
    currency: 'HKD',
    title: 'Google Play Points 計算器（香港）｜香港等級與消費金額試算',
    description: '香港 Google Play Points 計算器。依香港官方等級與每 HK$7 的獲點率，估算升級所需消費金額與可獲得點數。',
    mainTitle: 'Google Play Points 計算器（香港）',
    siteDescription: '依照香港 Google Play Points 的等級與獲點率，估算升級所需消費金額。<br>輸入目前等級、目標等級及尚欠點數，即可用港元計算。',
    factNote: `<div class="region-fact-note" role="note" aria-label="香港 Play Points 官方條件"><p><strong>香港版：</strong>基本獲點率以每 HK$7 計算。香港目前有銅級、銀級、金級、鉑金級、鑽石級五個等級。</p><p><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DHK&hl=zh-HK" target="_blank" rel="noopener noreferrer">查看 Google Play 香港官方等級與獲點率</a></p></div>`
  },
  in: {
    source: 'en',
    hreflang: 'en-IN',
    currency: 'INR',
    title: 'Google Play Points Calculator for India | INR level-up estimate',
    description: 'Google Play Points calculator for India. Estimate level-up spending in INR using India-specific levels and the official earn rate per ₹5.',
    mainTitle: 'Google Play Points Calculator — India',
    siteDescription: 'Estimate the spending needed to reach your next Google Play Points level using India-specific levels and earn rates.<br>Enter your current level, target level, and points needed to calculate in INR.',
    factNote: `<div class="region-fact-note" role="note" aria-label="India Play Points official conditions"><p><strong>India edition:</strong> base earning is calculated per ₹5. Google currently lists Bronze, Silver, Gold, and Platinum for India, with Platinum starting at 4,000 points.</p><p><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DIN&hl=en-IN" target="_blank" rel="noopener noreferrer">Check the official Google Play India level and earn-rate table</a></p></div>`
  }
});

function replaceMetaContent(html, selector, value) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(<meta ${escaped} content=")[^"]*(">)`), `$1${value}$2`);
}

function stripVisitorThanks(html) {
  return html.replace(/\n\s*<div class="visitor-thanks"[\s\S]*?<\/div>\s*\n/, '\n');
}

function ensureTopHreflang(html) {
  let next = html
    .replace(/\s*<link rel="alternate" hreflang="zh-HK"[^>]*>\s*/g, '\n')
    .replace(/\s*<link rel="alternate" hreflang="en-IN"[^>]*>\s*/g, '\n');
  const insertion = `    <link rel="alternate" hreflang="zh-HK" href="${SITE_ORIGIN}/hk/">\n    <link rel="alternate" hreflang="en-IN" href="${SITE_ORIGIN}/in/">\n`;
  if (!next.includes('hreflang="x-default"')) {
    throw new Error('Top page is missing x-default hreflang anchor.');
  }
  return next.replace(/\s*(<link rel="alternate" hreflang="x-default")/, `\n${insertion}    $1`);
}

function replaceContentDate(html) {
  return html
    .replace(/(<meta name="last-modified" content=")\d{4}-\d{2}-\d{2}(">)/, `$1${REGION_CONTENT_DATE}$2`)
    .replace(/(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}T[^\"]*(">)/, `$1${REGION_CONTENT_DATE}T00:00:00+09:00$2`)
    .replace(/("dateModified": ")\d{4}-\d{2}-\d{2}(")/g, `$1${REGION_CONTENT_DATE}$2`)
    .replace(/(Last Updated:\s*)\d{4}-\d{2}-\d{2}/g, `$1${REGION_CONTENT_DATE}`)
    .replace(/(最後更新：\s*)\d{4}-\d{2}-\d{2}/g, `$1${REGION_CONTENT_DATE}`);
}

function buildHongKongPage(source) {
  const config = REGION_PAGES.hk;
  let html = stripVisitorThanks(source);
  html = html.replace('<html lang="zh-TW">', '<html lang="zh-HK">');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`);
  html = replaceMetaContent(html, 'name="description"', config.description);
  html = replaceMetaContent(html, 'property="og:title"', config.title);
  html = replaceMetaContent(html, 'property="og:description"', config.description);
  html = replaceMetaContent(html, 'name="twitter:title"', config.title);
  html = replaceMetaContent(html, 'name="twitter:description"', config.description);
  html = html.replaceAll(`${SITE_ORIGIN}/tw/`, `${SITE_ORIGIN}/hk/`);
  html = html.replace(/"priceCurrency": "TWD"/g, '"priceCurrency": "HKD"');
  html = html.replace(/"inLanguage": "zh-TW"/g, '"inLanguage": "zh-HK"');
  html = html.replace('<button data-region="TW" class="active">繁體中文</button>', '<button data-region="TW">繁體中文</button>');
  html = html.replace('href="./articles/" data-lang-key="linkArticles"', 'href="../tw/articles/" data-lang-key="linkArticles"');
  html = html.replace(/(<h1 id="main-title"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${config.mainTitle}$2`);
  html = html.replace(/(<p id="site-description"[^>]*>)[\s\S]*?(<\/p>)/, `$1${config.siteDescription}$2`);
  html = html.replace(/(<p id="site-description"[^>]*>[\s\S]*?<\/p>)/, `$1\n\n    ${config.factNote}`);
  html = html.replace('每 NT$30 獲得點數（自動帶入，可修改）', '每 HK$7 獲得點數（自動帶入，可修改）');
  html = html.replace(/活動特別獲點率（例：每 NT\$30 3 點）/g, '活動特別獲點率（例：每 HK$7 3 點）');
  html = html.replace(/消費金額 \(NT\$\)/g, '消費金額（HK$）');
  html = html.replace(/白金級/g, '鉑金級');
  html = replaceContentDate(html);
  return ensureTopHreflang(html);
}

function buildIndiaPage(source) {
  const config = REGION_PAGES.in;
  let html = source;
  html = html.replace('<html lang="en">', '<html lang="en-IN">');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`);
  html = replaceMetaContent(html, 'name="description"', config.description);
  html = replaceMetaContent(html, 'property="og:title"', config.title);
  html = replaceMetaContent(html, 'property="og:description"', config.description);
  html = replaceMetaContent(html, 'name="twitter:title"', config.title);
  html = replaceMetaContent(html, 'name="twitter:description"', config.description);
  html = html.replaceAll(`${SITE_ORIGIN}/en/`, `${SITE_ORIGIN}/in/`);
  html = html.replace(/"priceCurrency": "USD"/g, '"priceCurrency": "INR"');
  html = html.replace(/"inLanguage": "en"/g, '"inLanguage": "en-IN"');
  html = html.replace('<button data-region="US" class="active">English</button>', '<button data-region="US">English</button>');
  html = html.replace('href="./articles/" data-lang-key="linkArticles"', 'href="../en/articles/" data-lang-key="linkArticles"');
  html = html.replace(/(<h1 id="main-title"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${config.mainTitle}$2`);
  html = html.replace(/(<p id="site-description"[^>]*>)[\s\S]*?(<\/p>)/, `$1${config.siteDescription}$2`);
  html = html.replace(/(<p id="site-description"[^>]*>[\s\S]*?<\/p>)/, `$1\n\n    ${config.factNote}`);
  html = html.replace('Points per $1 (auto-filled, editable)', 'Points per ₹5 (auto-filled, editable)');
  html = html.replace(/Promotion special earn rate \(e\.g\. 3 pt \/ \$1\)/g, 'Promotion special earn rate (e.g. 3 pt / ₹5)');
  html = html.replace(/Amount spent \(USD\)/g, 'Amount spent (INR)');
  html = html.replace(/Estimate the required spending to reach Platinum or Diamond status\./g, 'Estimate the required spending to reach Platinum status in India.');
  html = html.replace(/such as "just a little more to Platinum," "want to know if I can reach Diamond," or /g, 'such as "just a little more to Platinum" or ');
  html = replaceContentDate(html);
  return ensureTopHreflang(html);
}

function writeFileIfChanged(filePath, content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current === normalized) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

function syncTopHreflang(rootDir) {
  const files = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];
  let changed = 0;
  for (const relativePath of files) {
    const filePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(filePath)) continue;
    const current = fs.readFileSync(filePath, 'utf8');
    if (writeFileIfChanged(filePath, ensureTopHreflang(current))) changed += 1;
  }
  return changed;
}

function syncRegionPages(rootDir) {
  const tw = fs.readFileSync(path.join(rootDir, 'tw', 'index.html'), 'utf8');
  const en = fs.readFileSync(path.join(rootDir, 'en', 'index.html'), 'utf8');
  const hkChanged = writeFileIfChanged(path.join(rootDir, 'hk', 'index.html'), buildHongKongPage(tw));
  const inChanged = writeFileIfChanged(path.join(rootDir, 'in', 'index.html'), buildIndiaPage(en));
  const hreflangChanged = syncTopHreflang(rootDir);
  console.log(`[region-pages] HK: ${hkChanged ? 'updated' : 'unchanged'}, IN: ${inChanged ? 'updated' : 'unchanged'}, hreflang files: ${hreflangChanged}`);
  return { hkChanged, inChanged, hreflangChanged };
}

function syncRegionSitemap(rootDir) {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return false;
  let sitemap = fs.readFileSync(sitemapPath, 'utf8');
  for (const locale of ['hk', 'in']) {
    const url = `${SITE_ORIGIN}/${locale}/`;
    const existing = new RegExp(`(<url>\\s*<loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>\\s*<lastmod>)[^<]+(</lastmod>[\\s\\S]*?</url>)`);
    if (existing.test(sitemap)) {
      sitemap = sitemap.replace(existing, `$1${REGION_CONTENT_DATE}$2`);
    } else {
      sitemap = sitemap.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${REGION_CONTENT_DATE}</lastmod>\n  </url>\n</urlset>`);
    }
  }
  return writeFileIfChanged(sitemapPath, sitemap);
}

module.exports = {
  REGION_CONTENT_DATE,
  REGION_PAGES,
  buildHongKongPage,
  buildIndiaPage,
  ensureTopHreflang,
  syncRegionPages,
  syncRegionSitemap
};
