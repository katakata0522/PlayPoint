'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_INTERNATIONAL_LOCALE,
  INTERNATIONAL_LOCALES
} = require('./locale-ids.cjs');

const PUBLISHED_AT = '2026-08-04';
const SITEMAP_FILE = 'sitemap-intl-content-expansion.xml';
const TOPICS = [
  {
    slug: "google-play-balance-combine-payment.html",
    labels: {
      en: "Can you combine Google Play balance with another payment method?",
      ko: "Google Play 잔액과 다른 결제 수단을 함께 사용할 수 있나요?",
      tw: "Google Play 餘額可以和其他付款方式一起使用嗎？"
    }
  },
  {
    slug: "google-play-points-device-change.html",
    labels: {
      en: "Play Points after changing phones or devices",
      ko: "휴대전화 변경 후 Play Points가 보이지 않을 때",
      tw: "換手機後 Play Points 沒有顯示時"
    }
  },
  {
    slug: "google-play-points-rounding-tax.html",
    labels: {
      en: "How Play Points handle tax, rounding and split purchases",
      ko: "Play Points 세금·반올림·분할 결제 계산",
      tw: "Play Points 稅金、四捨五入與分開購買計算"
    }
  },
  {
    slug: "google-play-points-balance-history-progress.html",
    labels: {
      en: "Where to check Play Points balance, history and level progress",
      ko: "Play Points 잔액·내역·등급 진행도 확인 방법",
      tw: "Play Points 餘額、記錄與等級進度怎麼看"
    }
  },
  {
    slug: "google-play-points-apps-books-purchases.html",
    labels: {
      en: "Do paid apps, games and books earn Play Points?",
      ko: "유료 앱·게임·도서 구매의 Play Points 적립 조건",
      tw: "付費 App、遊戲與電子書的 Play Points 累積條件"
    }
  },
  {
    slug: "google-play-games-vs-play-points.html",
    labels: {
      en: "Google Play Games vs Play Points: XP, achievements and rewards",
      ko: "Google Play Games와 Play Points 차이",
      tw: "Google Play Games 與 Play Points 的差別"
    }
  },
  {
    slug: "google-play-points-earn-free.html",
    labels: {
      en: "Legitimate ways to earn Play Points without extra spending",
      ko: "추가 결제 없이 Play Points를 모으는 공식 방법",
      tw: "不增加額外消費取得 Play Points 的官方方法"
    }
  },
  {
    slug: "google-play-points-500-1000-cost.html",
    labels: {
      en: "How much spending for 500 or 1,000 Play Points?",
      ko: "Play Points 500·1,000포인트 필요 금액",
      tw: "Play Points 500、1,000 點需要多少金額"
    }
  },
  {
    slug: "google-play-points-discounts-promo-codes.html",
    labels: {
      en: "Do discounts and promo codes still earn Play Points?",
      ko: "할인·프로모션 코드 사용 시 Play Points 적립 기준",
      tw: "折扣、促銷代碼的 Play Points 累積規則"
    }
  },
  {
    slug: "google-play-points-levels.html",
    publishedAt: '2026-08-05',
    labels: {
      en: "Google Play Points levels by region",
      ko: "한국 Google Play Points 등급표",
      tw: "台灣 Google Play Points 等級表"
    }
  },
  {
    slug: "google-play-points-country-change.html",
    publishedAt: '2026-08-05',
    labels: {
      en: "What happens after changing Play country",
      ko: "Play 국가 변경 시 포인트 영향",
      tw: "變更 Play 國家／地區後的影響"
    }
  },
  {
    slug: "google-play-points-promotion-stacking.html",
    publishedAt: '2026-08-05',
    labels: {
      en: "Do Play Points promotions stack?",
      ko: "Play Points 배율 중복 규칙",
      tw: "Play Points 活動倍率會疊加嗎"
    }
  },
  {
    slug: "google-play-points-fastest-silver.html",
    publishedAt: '2026-08-05',
    labels: {
      en: "Reach Silver efficiently in the US",
      ko: "한국 실버 효율적으로 달성",
      tw: "台灣銀級高效累積攻略"
    }
  }
];
const HREFLANG_BY_LOCALE = Object.freeze({
  en: 'en',
  ko: 'ko',
  tw: 'zh-TW'
});
const LOCALES = INTERNATIONAL_LOCALES.map(key => ({
  key,
  hreflang: HREFLANG_BY_LOCALE[key]
}));

function articlePath(locale, slug) {
  return `${locale}/articles/${slug}`;
}

function insertIndexLinks(rootDir, locale) {
  const relativePath = `${locale}/articles/index.html`;
  const absolutePath = path.join(rootDir, relativePath);
  let html = fs.readFileSync(absolutePath, 'utf8');
  const missingTopics = TOPICS.filter(topic => !html.includes(`/${articlePath(locale, topic.slug)}`));
  if (!missingTopics.length) return;
  const links = missingTopics
    .map(topic => `                <li><a href="/${articlePath(locale, topic.slug)}">${topic.labels[locale]}</a></li>`)
    .join('\n');
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
      urls.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${topic.publishedAt || PUBLISHED_AT}</lastmod>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/${articlePath(DEFAULT_INTERNATIONAL_LOCALE, topic.slug)}" />\n  </url>`);
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
  HREFLANG_BY_LOCALE,
  LOCALES,
  PUBLISHED_AT,
  SITEMAP_FILE,
  TOPICS,
  applyIntlContentExpansion,
  getIntlContentExpansionFiles
};
