'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const topics = [
  {
    slug: 'google-play-points-weekly-reward.html',
    officialIds: ['15776969', '16507543'],
    requiredPhrases: {
      en: ['Silver', 'Friday', 'Thursday', 'Play Pass'],
      ko: ['실버', '금요일', '목요일', 'Play Pass'],
      tw: ['銀級', '週五', '週四', 'Play Pass']
    }
  },
  {
    slug: 'google-play-points-multiple-accounts.html',
    officialIds: ['9077192', '9077247'],
    requiredPhrases: {
      en: ['cannot be transferred', 'family payment', 'before joining'],
      ko: ['이전할 수 없습니다', '가족 결제수단', '가입 전'],
      tw: ['不能在帳號之間轉移', '家庭付款方式', '加入前']
    }
  }
];
const locales = [
  { dir: 'en', lang: 'en', siteName: 'Google Play Points Calculator' },
  { dir: 'ko', lang: 'ko', siteName: 'Google Play Points 계산기' },
  { dir: 'tw', lang: 'zh-TW', siteName: 'Google Play Points 計算器' }
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('週次特典と複数アカウント記事は3言語で公開要件を満たす', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} がありません`);
      const html = read(relativePath);
      const canonical = `https://playpoint-sim.com/${relativePath}`;
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
      const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
      const schemas = jsonLd(html);

      assert.ok(html.includes(`<html lang="${locale.lang}">`), `${relativePath} のlangが不正です`);
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${relativePath} のcanonicalが不正です`);
      assert.ok(title.length > 20 && title.length <= 65, `${relativePath} のtitle長が不正です: ${title.length}`);
      assert.ok(description.length >= 45 && description.length <= 170, `${relativePath} のdescription長が不正です: ${description.length}`);
      assert.strictEqual((html.match(/<h1\b/g) || []).length, 1, `${relativePath} のh1数が不正です`);
      assert.ok(html.includes(`<meta property="og:site_name" content="${locale.siteName}">`), `${relativePath} のsiteNameが不正です`);
      assert.ok(html.includes('<meta name="last-modified" content="2026-07-25">') || html.includes('<meta name="last-modified" content="2026-08-05">'), `${relativePath} の更新日が不正です`);
      assert.ok(schemas.some(schema => schema['@type'] === 'Article'), `${relativePath} にArticle構造化データがありません`);
      assert.ok(schemas.some(schema => schema['@type'] === 'FAQPage'), `${relativePath} にFAQ構造化データがありません`);
      assert.ok(html.includes('class="cta-btn"'), `${relativePath} にCTAがありません`);
      assert.ok(!html.includes('utm_medium=internal'), `${relativePath} にサイト内UTMが残っています`);
      assert.ok(html.includes('/author/katakata.html'), `${relativePath} に著者導線がありません`);
      assert.ok(html.includes(`/${locale.dir}/articles/`), `${relativePath} が言語別記事一覧へ戻りません`);

      for (const hreflang of ['ja', 'en', 'ko', 'zh-TW', 'x-default']) {
        assert.ok(html.includes(`hreflang="${hreflang}"`), `${relativePath} に ${hreflang} がありません`);
      }
      for (const officialId of topic.officialIds) {
        assert.ok(html.includes(`support.google.com/googleplay/answer/${officialId}`), `${relativePath} に公式出典 ${officialId} がありません`);
      }
      for (const phrase of topic.requiredPhrases[locale.dir]) {
        assert.ok(html.includes(phrase), `${relativePath} に重要文言がありません: ${phrase}`);
      }
    }
  }
});

test('新規記事は同一言語内で相互に接続される', () => {
  for (const locale of locales) {
    const weekly = read(`${locale.dir}/articles/google-play-points-weekly-reward.html`);
    const accounts = read(`${locale.dir}/articles/google-play-points-multiple-accounts.html`);
    assert.ok(weekly.includes(`/${locale.dir}/articles/google-play-points-multiple-accounts.html`));
    assert.ok(accounts.includes(`/${locale.dir}/articles/google-play-points-weekly-reward.html`));
    assert.ok(weekly.includes(`/${locale.dir}/status/platinum/`));
    assert.ok(accounts.includes(`/${locale.dir}/status/platinum/`));
  }
});

test('国際ガイド専用サイトマップをrobots.txtから発見できる', () => {
  const robots = read('robots.txt');
  const sitemap = read('sitemap-intl-guides.xml');

  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap.xml'));
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-guides.xml'));
  assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));

  for (const topic of topics) {
    for (const locale of locales) {
      const url = `https://playpoint-sim.com/${locale.dir}/articles/${topic.slug}`;
      assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${url} が専用サイトマップにありません`);
    }
  }

  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(sitemapUrls.length >= 6, '専用サイトマップの記事数が少なすぎます');
  assert.strictEqual(new Set(sitemapUrls).size, sitemapUrls.length, '専用サイトマップに重複URLがあります');
});

test('新規国際記事のローカルリンク先はすべて存在する', () => {
  for (const topic of topics) {
    for (const locale of locales) {
      const relativePath = `${locale.dir}/articles/${topic.slug}`;
      const html = read(relativePath);
      const hrefs = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)].map(match => match[1]);
      for (const href of hrefs) {
        let target = href.replace(/^\//, '');
        if (!target || target.endsWith('/')) target += 'index.html';
        assert.ok(fs.existsSync(path.join(root, target)), `${relativePath} のリンク先がありません: ${href}`);
      }
    }
  }
});
