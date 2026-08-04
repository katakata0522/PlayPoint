'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PUBLISHED_AT = '2026-08-04';
const SITEMAP_FILE = 'sitemap-intl-content-expansion.xml';
const TOPICS = [
  {
    slug: 'google-play-balance-combine-payment.html',
    labels: {
      en: 'Can you combine Google Play balance with another payment method?',
      ko: 'Google Play 잔액과 다른 결제 수단을 함께 사용할 수 있나요?',
      tw: 'Google Play 餘額可以和其他付款方式一起使用嗎？'
    }
  },
  {
    slug: 'google-play-points-device-change.html',
    labels: {
      en: 'Play Points after changing phones or devices',
      ko: '휴대전화 변경 후 Play Points가 보이지 않을 때',
      tw: '換手機後 Play Points 沒有顯示時'
    }
  },
  {
    slug: 'google-play-points-rounding-tax.html',
    labels: {
      en: 'How Play Points handle tax, rounding and split purchases',
      ko: 'Play Points 세금·반올림·분할 결제 계산',
      tw: 'Play Points 稅金、四捨五入與分開購買計算'
    }
  }
];
const LOCALES = [
  { key: 'en', hreflang: 'en' },
  { key: 'ko', hreflang: 'ko' },
  { key: 'tw', hreflang: 'zh-TW' }
];

function articlePath(locale, slug) {
  return `${locale}/articles/${slug}`;
}

function insertIndexLinks(rootDir, locale) {
  const relativePath = `${locale}/articles/index.html`;
  const absolutePath = path.join(rootDir, relativePath);
  let html = fs.readFileSync(absolutePath, 'utf8');
  const links = TOPICS.map(topic => `                <li><a href="/${articlePath(locale, topic.slug)}">${topic.labels[locale]}</a></li>`).join('\n');
  if (TOPICS.every(topic => html.includes(`/${articlePath(locale, topic.slug)}`))) return;
  const anchor = '            <ul>\n';
  if (!html.includes(anchor)) throw new Error(`Could not find article-list anchor in ${relativePath}`);
  html = html.replace(anchor, `${anchor}${links}\n`);
  fs.writeFileSync(absolutePath, html);
}

function writeSitemap(rootDir) {
  const urls = [];
  for (const topic of TOPICS) {
    for (const locale of LOCALES) {
      const loc = `https://playpoint-sim.com/${articlePath(locale.key, topic.slug)}`;
      const alternates = LOCALES.map(candidate =>
        `    <xhtml:link rel="alternate" hreflang="${candidate.hreflang}" href="https://playpoint-sim.com/${articlePath(candidate.key, topic.slug)}" />`
      ).join('\n');
      urls.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${PUBLISHED_AT}</lastmod>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/${articlePath('en', topic.slug)}" />\n  </url>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(rootDir, SITEMAP_FILE), xml);
}

function syncRobots(rootDir) {
  const robotsPath = path.join(rootDir, 'robots.txt');
  let robots = fs.readFileSync(robotsPath, 'utf8').trimEnd();
  const line = `Sitemap: https://playpoint-sim.com/${SITEMAP_FILE}`;
  if (!robots.includes(line)) robots += `\n${line}`;
  fs.writeFileSync(robotsPath, `${robots}\n`);
}

function verifyArticles(rootDir) {
  for (const topic of TOPICS) {
    for (const locale of LOCALES) {
      const relativePath = articlePath(locale.key, topic.slug);
      if (!fs.existsSync(path.join(rootDir, relativePath))) {
        throw new Error(`International content expansion article is missing: ${relativePath}`);
      }
    }
  }
}

function applyIntlContentExpansion(rootDir) {
  verifyArticles(rootDir);
  for (const locale of LOCALES) insertIndexLinks(rootDir, locale.key);
  writeSitemap(rootDir);
  syncRobots(rootDir);
  console.log(`[intl-content-expansion] published ${TOPICS.length * LOCALES.length} locale articles`);
}

function getIntlContentExpansionFiles() {
  return [
    ...LOCALES.map(locale => `${locale.key}/articles/index.html`),
    SITEMAP_FILE,
    'robots.txt'
  ];
}

module.exports = {
  LOCALES,
  PUBLISHED_AT,
  SITEMAP_FILE,
  TOPICS,
  applyIntlContentExpansion,
  getIntlContentExpansionFiles
};
