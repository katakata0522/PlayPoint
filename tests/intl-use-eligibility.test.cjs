'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const locales = [
  { dir: 'en', lang: 'en', siteName: 'Google Play Points Calculator' },
  { dir: 'ko', lang: 'ko', siteName: 'Google Play Points 계산기' },
  { dir: 'tw', lang: 'zh-TW', siteName: 'Google Play Points 計算器' }
];
const topics = [
  {
    slug: 'google-play-points-use-coupons.html',
    officialIds: ['9079840', '9077247'],
    phrases: {
      en: ['expire after one year', 'automatically', 'Play credit'],
      ko: ['1년 후 만료', '자동 적용', 'Play 크레딧'],
      tw: ['一年後到期', '自動套用', 'Play 抵用金']
    },
    peer: 'google-play-points-join-eligibility.html'
  },
  {
    slug: 'google-play-points-join-eligibility.html',
    officialIds: ['15776077', '9077247'],
    phrases: {
      en: ['supported countries', 'managed by a school or a parent', 'billing address'],
      ko: ['지원되는 국가', '학교나 부모가 관리', '청구지 주소'],
      tw: ['支援的國家/地區', '學校或家長管理', '帳單地址']
    },
    peer: 'google-play-points-use-coupons.html'
  }
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('ポイント利用・参加条件記事は3言語で固有の事実と相互導線を保つ', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} がありません`);
      const html = read(relativePath);

      assert.ok(html.includes(`/${locale.dir}/articles/${topic.peer}`), `${relativePath}: peer article`);
      for (const id of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${id}`), `${relativePath}: ${id}`);
      }
      for (const phrase of topic.phrases[locale.dir]) {
        assert.ok(html.includes(phrase), `${relativePath}: ${phrase}`);
      }
    }
  }
});

test('専用サイトマップは6記事を公開しrobots.txtから発見できる', () => {
  const sitemap = read('sitemap-intl-use-eligibility.xml');
  const robots = read('robots.txt');
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-use-eligibility.xml'));
  assert.strictEqual((sitemap.match(/<url>/g) || []).length, 6);
  for (const topic of topics) {
    for (const locale of locales) {
      const url = `https://playpoint-sim.com/${locale.dir}/articles/${topic.slug}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
    }
  }
});
