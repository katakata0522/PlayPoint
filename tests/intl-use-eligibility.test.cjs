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

function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('ポイント利用・参加条件記事は3言語でSEO公開要件を満たす', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} がありません`);
      const html = read(relativePath);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
      const jsonLd = schemas(html);
      const canonical = `https://playpoint-sim.com/${relativePath}`;

      assert.ok(html.includes(`<html lang="${locale.lang}">`));
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
      assert.ok(title.length > 20 && title.length <= 65, `${relativePath} title=${title.length}`);
      assert.ok(description.length >= 45 && description.length <= 170, `${relativePath} description=${description.length}`);
      assert.strictEqual((html.match(/<h1\b/g) || []).length, 1);
      assert.ok(html.includes(`<meta property="og:site_name" content="${locale.siteName}">`));
      assert.ok(html.includes('<meta name="last-modified" content="2026-07-25">'));
      assert.ok(jsonLd.some(schema => schema['@type'] === 'Article'));
      assert.ok(jsonLd.some(schema => schema['@type'] === 'FAQPage'));
      assert.ok(html.includes('utm_campaign=intl_article_cta'));
      assert.ok(html.includes('/author/katakata.html'));
      assert.ok(html.includes(`/${locale.dir}/articles/${topic.peer}`));

      for (const hreflang of ['ja', 'en', 'ko', 'zh-TW', 'x-default']) {
        assert.ok(html.includes(`hreflang="${hreflang}"`), `${relativePath}: ${hreflang}`);
      }
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

test('新規記事のサイト内リンク先は存在する', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
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
