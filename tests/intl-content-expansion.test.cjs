'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const locales = [
  { key: 'en', lang: 'en' },
  { key: 'ko', lang: 'ko' },
  { key: 'tw', lang: 'zh-TW' }
];
const topics = [
  {
    slug: "google-play-balance-combine-payment.html",
    phrases: {
      en: ["another payment method", "Play credit", "tax-inclusive"],
      ko: ["다른 결제 수단", "Play 크레딧", "세금 포함"],
      tw: ["其他付款方式", "Play 抵用金", "含稅"]
    },
    officialIds: ["6080850", "9077312"]
  },
  {
    slug: "google-play-points-device-change.html",
    phrases: {
      en: ["same Google account", "Play country", "point history"],
      ko: ["같은 Google 계정", "Play 국가", "포인트 내역"],
      tw: ["相同 Google 帳號", "Play 國家/地區", "點數記錄"]
    },
    officialIds: ["9077312", "7431675"]
  },
  {
    slug: "google-play-points-rounding-tax.html",
    phrases: {
      en: ["1 point per $1", "nearest whole point", "tax"],
      ko: ["₩1,000당 1포인트", "가장 가까운 정수", "세금"],
      tw: ["每消費 NT$30 得 1 點", "四捨五入", "稅金"]
    },
    officialIds: ["9080348", "9077192"]
  },
  {
    slug: "google-play-points-balance-history-progress.html",
    phrases: {
      en: ["points balance", "level progress", "150 points for Silver"],
      ko: ["포인트 잔액", "등급 진행도", "150포인트"],
      tw: ["點數餘額", "等級進度", "NT$30"]
    },
    officialIds: ["15776969", "9080348"]
  },
  {
    slug: "google-play-points-apps-books-purchases.html",
    phrases: {
      en: ["paid app", "books", "sales tax"],
      ko: ["유료 앱", "도서", "세금"],
      tw: ["付費 App", "圖書", "稅金"]
    },
    officialIds: ["15776742", "16517110"]
  },
  {
    slug: "google-play-games-vs-play-points.html",
    phrases: {
      en: ["Play Games XP", "achievements", "mobile"],
      ko: ["Play Games 경험치", "업적", "모바일"],
      tw: ["Play Games 經驗值", "成就", "手機"]
    },
    officialIds: ["3129346", "11534416"]
  },
  {
    slug: "google-play-points-earn-free.html",
    phrases: {
      en: ["weekly prizes", "featured install", "Play Pass"],
      ko: ["주간 리워드", "추천 무료 앱", "Play Pass"],
      tw: ["每週獎勵", "指定免費 App", "Play Pass"]
    },
    officialIds: ["15776969", "16507543"]
  },
  {
    slug: "google-play-points-500-1000-cost.html",
    phrases: {
      en: ["$500", "$1,000", "$312.50"],
      ko: ["₩500,000", "₩1,000,000", "₩250,000"],
      tw: ["NT$15,000", "NT$30,000", "NT$7,500"]
    },
    officialIds: ["9080348", "15776742"]
  },
  {
    slug: "google-play-points-discounts-promo-codes.html",
    phrases: {
      en: ["promo code", "original list price", "sales tax"],
      ko: ["프로모션 코드", "정가", "세금"],
      tw: ["促銷代碼", "原價", "稅金"]
    },
    officialIds: ["15698521", "15776916"]
  }
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}
function articlePath(locale, topic) {
  return `${locale.key}/articles/${topic.slug}`;
}
function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('国・地域別の実用記事を3言語で十分な本文として公開する', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = articlePath(locale, topic);
      assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
      const html = read(relativePath);
      const canonical = `https://playpoint-sim.com/${relativePath}`;
      const data = schemas(html);

      assert.ok(html.includes(`<html lang="${locale.lang}">`), relativePath);
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), relativePath);
      assert.strictEqual((html.match(/<h1\b/g) || []).length, 1, relativePath);
      assert.ok((html.match(/<h2\b/g) || []).length >= 6, relativePath);
      assert.ok(html.length >= 5500, `${relativePath}: thin content ${html.length}`);
      assert.ok(html.includes('rel="author"'), relativePath);
      assert.ok(html.includes('related-links-section'), relativePath);
      assert.ok(data.some(item => item['@type'] === 'Article'), relativePath);
      assert.ok(data.some(item => item['@type'] === 'FAQPage'), relativePath);
      assert.ok(!html.includes('hreflang="zh-Hant"'), relativePath);

      for (const phrase of topic.phrases[locale.key]) {
        assert.ok(html.includes(phrase), `${relativePath}: ${phrase}`);
      }
      for (const id of topic.officialIds) {
        assert.ok(
          html.includes(`support.google.com/googleplay/answer/${id}`) ||
          html.includes(`support.google.com/googleplay/android-developer/answer/${id}`),
          `${relativePath}: ${id}`
        );
      }
      for (const candidate of locales) {
        const target = `https://playpoint-sim.com/${articlePath(candidate, topic)}`;
        assert.ok(html.includes(`hreflang="${candidate.lang}" href="${target}"`), `${relativePath}: ${candidate.lang}`);
      }
      assert.ok(html.includes(`hreflang="x-default" href="https://playpoint-sim.com/${articlePath(locales[0], topic)}"`));
    }
  }
});

test('言語別記事一覧と専用サイトマップから27ページを発見できる', () => {
  const sitemap = read('sitemap-intl-content-expansion.xml');
  const robots = read('robots.txt');
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-content-expansion.xml'));
  assert.strictEqual((sitemap.match(/<url>/g) || []).length, topics.length * locales.length);

  for (const locale of locales) {
    const index = read(`${locale.key}/articles/index.html`);
    for (const topic of topics) {
      const relativePath = articlePath(locale, topic);
      const url = `https://playpoint-sim.com/${relativePath}`;
      assert.ok(index.includes(`/${relativePath}`), `${locale.key} index: ${topic.slug}`);
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
      assert.ok(sitemap.includes(`hreflang="${locale.lang}" href="${url}"`), `${url}: hreflang`);
    }
  }
});

test('国際記事内のローカルリンク先が存在する', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = articlePath(locale, topic);
      const html = read(relativePath);
      const hrefs = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)].map(match => match[1]);
      for (const href of hrefs) {
        let target = href.replace(/^\//, '');
        if (!target || target.endsWith('/')) target += 'index.html';
        assert.ok(fs.existsSync(path.join(root, target)), `${relativePath}: ${href}`);
      }
    }
  }
});

test('日本語では重複する残高併用記事を追加しない', () => {
  assert.ok(!fs.existsSync(path.join(root, 'articles/google-play-balance-combine-payment.html')));
  const cashConversion = read('articles/2026-07-24-play-points-cash-conversion.html');
  const creditTrouble = read('articles/2026-07-25-play-credit-not-working.html');
  assert.ok(cashConversion.includes('Google Playクレジット'));
  assert.ok(creditTrouble.includes('Playクレジット'));
});
