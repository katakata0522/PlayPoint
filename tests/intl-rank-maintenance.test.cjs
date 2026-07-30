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
function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

test('ランク維持記事は4言語で相互接続され公式条件とSEO要件を満たす', () => {
  for (const page of pages) {
    const html = read(page.file);
    const parsed = schemas(html);

    assert.ok(html.includes(`<html lang="${page.lang}"`), page.file);
    assert.ok(html.includes(`<link rel="canonical" href="${urls[page.lang]}"`), page.file);
    assert.strictEqual((html.match(/<h1\b/g) || []).length, 1, page.file);
    if (page.key !== 'ja') assert.ok((html.match(/<h2\b/g) || []).length >= 8, page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9080348'), page.file);
    assert.ok(html.includes('support.google.com/googleplay/answer/9077192'), page.file);
    assert.ok(html.includes('articles/ogp/playpoints-rank-maintenance.png'), page.file);
    assert.ok(html.includes('/author/katakata.html'), page.file);
    assert.ok(parsed.some(schema => schema['@type'] === 'Article'), page.file);
    assert.ok(parsed.some(schema => schema['@type'] === 'FAQPage'), page.file);

    for (const alternate of pages) {
      assert.ok(
        html.includes(`hreflang="${alternate.lang}" href="${urls[alternate.lang]}"`),
        `${page.file}: ${alternate.lang}`
      );
    }
    assert.ok(html.includes(`hreflang="x-default" href="${urls.en}"`), page.file);

    for (const phrase of page.phrases) {
      assert.ok(html.includes(phrase), `${page.file}: ${phrase}`);
    }

    if (page.key !== 'ja') {
      assert.ok(html.length >= 7000, `${page.file}: thin content ${html.length}`);
      assert.ok(html.includes('<meta name="last-modified" content="2026-07-25">'), page.file);
      assert.ok(html.includes('article:published_time'), page.file);
      assert.ok(html.includes('article:modified_time'), page.file);
      assert.ok(html.includes('class="cta-btn"'), page.file);
      assert.ok(!html.includes('utm_medium=internal'), page.file);
    }
  }
});

test('日本語の既存記事と記事データは同じ更新日を持つ', () => {
  const html = read(pages[0].file);
  const articles = JSON.parse(read('blog/articles.json'));
  const article = articles.find(item => item.id === 'playpoints-rank-maintenance');

  assert.ok(html.includes('<meta name="last-modified" content="2026-07-30"'));
  assert.ok(html.includes('"dateModified": "2026-07-30"'));
  assert.ok(article);
  assert.strictEqual(article.modified, '2026-07-30');
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

test('新しい多言語記事のサイト内リンク先は存在する', () => {
  for (const page of pages.filter(page => page.key !== 'ja')) {
    const html = read(page.file);
    const hrefs = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)]
      .map(match => match[1]);
    for (const href of hrefs) {
      let target = href.replace(/^\//, '');
      if (!target || target.endsWith('/')) target += 'index.html';
      assert.ok(fs.existsSync(path.join(root, target)), `${page.file}: ${href}`);
    }
  }
});
