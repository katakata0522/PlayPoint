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
    file: 'articles/2025-12-25-playpoints-rank-maintenance.html',
    phrases: ['翌年末まで', 'ポイント残高', '今年の獲得ポイント']
  },
  {
    key: 'en',
    lang: 'en',
    file: 'en/articles/google-play-points-level-maintenance-reset.html',
    phrases: ['next calendar year', 'annual level progress', 'return or cancel']
  },
  {
    key: 'ko',
    lang: 'ko',
    file: 'ko/articles/google-play-points-level-maintenance-reset.html',
    phrases: ['다음 해 말까지', '등급 진행 상황', '환불하거나 취소']
  },
  {
    key: 'tw',
    lang: 'zh-TW',
    file: 'tw/articles/google-play-points-level-maintenance-reset.html',
    phrases: ['下一個日曆年度', '等級進度', '退回或取消']
  }
];
const urls = Object.fromEntries(pages.map(page => [
  page.lang,
  `https://playpoint-sim.com/${page.file}`
]));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('ランク維持記事は4言語で公式条件と固有の説明を保つ', () => {
  for (const page of pages) {
    const html = read(page.file);
    assert.ok(fs.existsSync(path.join(root, page.file)), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9080348'), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9077192'), page.file);
    for (const phrase of page.phrases) {
      assert.ok(html.includes(phrase), `${page.file}: ${phrase}`);
    }
  }
});

test('日本語の既存記事と記事データは同じ更新日を持つ', () => {
  const html = read(pages[0].file);
  const articles = JSON.parse(read('blog/articles.json'));
  const article = articles.find(item => item.id === 'playpoints-rank-maintenance');
  const metaDate = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const schemaDate = html.match(/"dateModified": "(\d{4}-\d{2}-\d{2})"/)?.[1];

  assert.match(metaDate || '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(schemaDate, metaDate);
  assert.ok(article);
  assert.equal(article.modified, metaDate);
});

test('専用サイトマップは4言語URLと完全なhreflangを持ちrobots.txtから発見できる', () => {
  const sitemap = read('sitemap-intl-rank-maintenance.xml');
  const robots = read('robots.txt');

  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/sitemap-intl-rank-maintenance.xml'));
  assert.strictEqual((sitemap.match(/<url>/g) || []).length, 4);

  for (const page of pages) {
    assert.ok(sitemap.includes(`<loc>${urls[page.lang]}</loc>`));
    for (const alternate of pages) {
      assert.ok(sitemap.includes(`hreflang="${alternate.lang}" href="${urls[alternate.lang]}"`));
    }
  }
});

test('言語別一覧と人向けサイトマップから新しい記事へ移動できる', () => {
  const human = read('sitemap.html');
  for (const page of pages.filter(page => page.key !== 'ja')) {
    const hub = read(`${page.key}/articles/index.html`);
    const href = `/${page.file}`;
    assert.ok(hub.includes(href), `${page.key} hub`);
    assert.ok(human.includes(`href="${page.file}"`), `human sitemap: ${page.file}`);
  }
});
