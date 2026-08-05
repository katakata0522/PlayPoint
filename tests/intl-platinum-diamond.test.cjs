'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const pages = [
  {
    key: 'ja',
    lang: 'ja',
    file: 'articles/2025-12-25-diamond-worth-it.html',
    phrases: ['4,000〜14,999ポイント', '15,000ポイント以上', '約22万8,600円', '75万円'],
    sourceCountry: 'JP'
  },
  {
    key: 'en',
    lang: 'en',
    file: 'en/articles/google-play-points-platinum-diamond-cost.html',
    phrases: ['3,000–9,999', '10,000 or more', '$2,143', '$6,250'],
    sourceCountry: 'US'
  },
  {
    key: 'ko',
    lang: 'ko',
    file: 'ko/articles/google-play-points-platinum-diamond-cost.html',
    phrases: ['2,400~14,999', '15,000포인트 이상', '₩1,500,000', '₩7,500,000'],
    sourceCountry: 'KR'
  },
  {
    key: 'tw',
    lang: 'zh-TW',
    file: 'tw/articles/google-play-points-platinum-diamond-cost.html',
    phrases: ['4,000 至 14,999 點', '15,000 點以上', 'NT$68,572', 'NT$225,000'],
    sourceCountry: 'TW'
  }
];

const urls = {
  ja: 'https://playpoint-sim.com/articles/2025-12-25-diamond-worth-it.html',
  en: 'https://playpoint-sim.com/en/articles/google-play-points-platinum-diamond-cost.html',
  ko: 'https://playpoint-sim.com/ko/articles/google-play-points-platinum-diamond-cost.html',
  'zh-TW': 'https://playpoint-sim.com/tw/articles/google-play-points-platinum-diamond-cost.html'
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('プラチナ・ダイヤモンド比較は地域別公式数値と計算条件を明示する', () => {
  for (const page of pages) {
    const html = read(page.file);
    assert.ok(html.includes(`<html lang="${page.lang}"`), page.file);
    const expectedModified = page.key === 'ja' ? '2026-08-04' : '2026-07-25';
    assert.ok(html.includes(`<meta name="last-modified" content="${expectedModified}"`), page.file);
    assert.ok(html.includes('article:modified_time'), page.file);
    assert.ok(html.includes(`CountryCode%3D${page.sourceCountry}`), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9080348'), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9077192'), page.file);
    assert.ok(html.includes('articles/ogp/diamond-worth-it.png'), page.file);
    assert.ok(html.includes('/author/katakata.html'), page.file);
    assert.strictEqual((html.match(/<h1\b/g) || []).length, 1, page.file);

    for (const phrase of page.phrases) {
      assert.ok(html.includes(phrase), `${page.file}: ${phrase}`);
    }

    const parsed = schemas(html);
    assert.ok(parsed.some(schema => schema['@type'] === 'Article'), page.file);
    assert.ok(parsed.some(schema => schema['@type'] === 'FAQPage'), page.file);

    for (const [lang, url] of Object.entries(urls)) {
      assert.ok(html.includes(`hreflang="${lang}" href="${url}"`), `${page.file}: ${lang}`);
    }
    assert.ok(html.includes(`hreflang="x-default" href="${urls.en}"`), page.file);
  }
});

test('地域の通貨とランク条件を他地域から流用していない', () => {
  const en = read(pages[1].file);
  const ko = read(pages[2].file);
  const tw = read(pages[3].file);

  assert.ok(!en.includes('₩1,500,000'));
  assert.ok(!en.includes('NT$68,572'));
  assert.ok(!ko.includes('NT$68,572'));
  assert.ok(!tw.includes('₩1,500,000'));

  assert.ok(ko.includes('낮은 등급에서 새로 올라갈 때'));
  assert.ok(tw.includes('若從較低等級開始升級'));
  assert.ok(en.includes('not universal costs to reach a level'));
});

test('専用サイトマップと記事一覧から4言語ページを発見できる', () => {
  const sitemap = read('sitemap-intl-platinum-diamond.xml');
  const robots = read('robots.txt');
  const human = read('sitemap.html');

  assert.strictEqual((sitemap.match(/<url>/g) || []).length, 4);
  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-platinum-diamond.xml'));

  for (const [lang, url] of Object.entries(urls)) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`));
    for (const [alternateLang, alternateUrl] of Object.entries(urls)) {
      assert.ok(sitemap.includes(`hreflang="${alternateLang}" href="${alternateUrl}"`));
    }
    if (lang !== 'ja') assert.ok(human.includes(url.replace('https://playpoint-sim.com/', '')));
  }

  assert.ok(read('en/articles/index.html').includes('/en/articles/google-play-points-platinum-diamond-cost.html'));
  assert.ok(read('ko/articles/index.html').includes('/ko/articles/google-play-points-platinum-diamond-cost.html'));
  assert.ok(read('tw/articles/index.html').includes('/tw/articles/google-play-points-platinum-diamond-cost.html'));
});

test('日本語記事データと配信ファイルの更新日・説明が一致する', () => {
  const articles = JSON.parse(read('blog/articles.json'));
  const article = articles.find(item => item.id === 'diamond-worth-it');
  assert.ok(article);
  assert.strictEqual(article.modified, '2026-08-04');
  assert.ok(article.description.includes('日本のGoogle公式情報'));

  const atom = read('atom.xml');
  const blogSitemap = read('blog/sitemap.xml');
  assert.ok(atom.includes('<updated>2026-08-04T12:00:00+09:00</updated>'));
  assert.ok(blogSitemap.includes('<loc>https://playpoint-sim.com/articles/2025-12-25-diamond-worth-it.html</loc>'));
});

test('独立管理の記事は生成処理で上書きされずサイトマップ対象に残る', () => {
  const generator = read('scripts/intl-seo-pages.cjs');
  assert.ok(generator.includes('const MANUAL_COMPARISON_ARTICLES'));
  assert.ok(generator.includes('if (article.manual) continue;'));
  assert.ok(generator.includes("file: 'ko/articles/google-play-points-platinum-diamond-cost.html'"));
  assert.ok(generator.includes("file: 'tw/articles/google-play-points-platinum-diamond-cost.html'"));
});
