'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const locales = [
  { key: 'ja', lang: 'ja', siteName: 'Google Play Points 計算機', prefix: '' },
  { key: 'en', lang: 'en', siteName: 'Google Play Points Calculator', prefix: 'en/articles/' },
  { key: 'ko', lang: 'ko', siteName: 'Google Play Points 계산기', prefix: 'ko/articles/' },
  { key: 'tw', lang: 'zh-TW', siteName: 'Google Play Points 計算器', prefix: 'tw/articles/' }
];
const topics = [
  {
    slug: 'google-play-points-coupon-not-applied.html',
    jaFile: 'articles/2026-07-25-play-points-coupon-not-applied.html',
    officialIds: ['15776916', '9077247', '15698521'],
    phrases: {
      ja: ['クーポン額以上', '1つだけ', '同じアカウント'],
      en: ['equal to or greater than', 'one credit or promotion', 'same account'],
      ko: ['쿠폰 금액 이상', '하나의 크레딧이나 프로모션', '같은 계정'],
      tw: ['不低於折價券金額', '一項抵用金或促銷活動', '同一個帳號']
    },
    peer: 'google-play-points-play-credit-not-working.html'
  },
  {
    slug: 'google-play-points-play-credit-not-working.html',
    jaFile: 'articles/2026-07-25-play-credit-not-working.html',
    officialIds: ['15776916', '6080850', '7431675', '16104278'],
    phrases: {
      ja: ['交換後1年', '同じ通貨', '国を変更'],
      en: ['expires after one year', 'same currency', 'changed your Play country'],
      ko: ['1년 후 만료', '같은 통화', 'Play 국가를 변경'],
      tw: ['一年後到期', '相同幣別', '變更 Play 國家/地區']
    },
    peer: 'google-play-points-coupon-not-applied.html'
  }
];

function fileFor(topic, locale) {
  return locale.key === 'ja' ? topic.jaFile : `${locale.prefix}${topic.slug}`;
}
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('クーポン・Playクレジット記事は4言語で固有の事実と相互導線を保つ', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = fileFor(topic, locale);
      assert.ok(fs.existsSync(path.join(root, relativePath)), relativePath);
      const html = read(relativePath);
      const peerTopic = topics.find(candidate => candidate.slug === topic.peer);
      const peerPath = fileFor(peerTopic, locale);

      assert.ok(html.includes(path.basename(peerPath)), `${relativePath}: peer ${peerPath}`);
      for (const id of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${id}`), `${relativePath}: ${id}`);
      }
      for (const phrase of topic.phrases[locale.key]) {
        assert.ok(html.includes(phrase), `${relativePath}: ${phrase}`);
      }
    }
  }
});

test('専用サイトマップは8記事と完全なhreflangを持ちrobots.txtから発見できる', () => {
  const sitemap = read('sitemap-intl-coupon-credit.xml');
  const robots = read('robots.txt');
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-coupon-credit.xml'));
  assert.strictEqual((sitemap.match(/<url>/g) || []).length, 8);
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = fileFor(topic, locale);
      const url = `https://playpoint-sim.com/${relativePath}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
      assert.ok(sitemap.includes(`hreflang="${locale.lang}" href="${url}"`), `${url}: sitemap hreflang`);
    }
  }
});

test('言語別一覧・人向けサイトマップ・日本語ブログから記事を発見できる', () => {
  const humanSitemap = read('sitemap.html');
  const blog = read('blog/index.html');
  for (const locale of locales.filter(locale => locale.key !== 'ja')) {
    const hub = read(`${locale.key}/articles/index.html`);
    for (const topic of topics) {
      assert.ok(hub.includes(`/${fileFor(topic, locale)}`), `${locale.key} hub: ${topic.slug}`);
      assert.ok(humanSitemap.includes(`href="${fileFor(topic, locale)}"`), `human sitemap: ${topic.slug}`);
    }
    for (const older of [
      'google-play-points-weekly-reward.html',
      'google-play-points-multiple-accounts.html',
      'google-play-points-use-coupons.html',
      'google-play-points-join-eligibility.html'
    ]) {
      assert.ok(hub.includes(older), `${locale.key} hub missing older standalone article: ${older}`);
    }
  }
  for (const topic of topics) {
    assert.ok(humanSitemap.includes(`href="${topic.jaFile}"`), topic.jaFile);
    assert.ok(blog.includes(`../${topic.jaFile}`), topic.jaFile);
  }
});
