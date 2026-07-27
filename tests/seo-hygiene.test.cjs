'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const origin = 'https://playpoint-sim.com';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function submittedSitemapFiles() {
  return [...read('robots.txt').matchAll(/^Sitemap:\s+https:\/\/playpoint-sim\.com\/([^\s]+)$/gm)]
    .map(match => match[1]);
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

test('送信するXMLサイトマップ間でURLを重複させない', () => {
  const sources = new Map();

  for (const file of submittedSitemapFiles()) {
    for (const url of sitemapUrls(read(file))) {
      const files = sources.get(url) || [];
      files.push(file);
      sources.set(url, files);
    }
  }

  const duplicates = [...sources.entries()].filter(([, files]) => files.length > 1);
  assert.deepStrictEqual(duplicates, []);
});

test('ルートサイトマップはPlay Pointsの公開導線だけを扱う', () => {
  const sitemap = read('sitemap.xml');
  const excluded = [
    '/tools/gravity-todo/',
    '/kids-smile-land/',
    '/articles/2026-06-29-savings-game-fire.html',
    '/doujin-shi-calculator/'
  ];

  excluded.forEach(relativeUrl => {
    assert.ok(!sitemap.includes(`<loc>${origin}${relativeUrl}</loc>`), relativeUrl);
  });
  assert.ok(!sitemap.includes('<changefreq>'));
  assert.ok(!sitemap.includes('<priority>'));
  assert.ok(!read('blog/sitemap.xml').includes('<changefreq>'));
  assert.ok(!read('blog/sitemap.xml').includes('<priority>'));
  assert.match(sitemap, new RegExp(`<loc>${origin}/latest/</loc>\\r?\\n\\s*<lastmod>2026-07-26</lastmod>`));
  assert.match(sitemap, new RegExp(`<loc>${origin}/ko/</loc>\\r?\\n\\s*<lastmod>2026-07-26</lastmod>`));
});

test('専用XMLサイトマップへ移したURLをルートへ重ねない', () => {
  const sitemap = read('sitemap.xml');
  const dedicatedUrls = submittedSitemapFiles()
    .filter(file => file !== 'sitemap.xml')
    .flatMap(file => sitemapUrls(read(file)));

  dedicatedUrls.forEach(url => {
    assert.ok(!sitemap.includes(`<loc>${url}</loc>`), url);
  });
});

test('Play Pointsブログとフィードに家計記事を混在させない', () => {
  const articles = JSON.parse(read('blog/articles.json'));
  assert.ok(!articles.some(article => article.id === 'savings-game-fire'));

  for (const file of ['blog/index.html', 'feed.xml', 'atom.xml', 'blog/sitemap.xml']) {
    assert.ok(!read(file).includes('2026-06-29-savings-game-fire.html'), file);
  }
  assert.ok(!fs.existsSync(path.join(root, 'articles', '2026-06-29-savings-game-fire.html')));
  assert.ok(read('.htaccess').includes('https://katakatalab.com/lab-tools/savings-game-fire/'));
});

test('人向けサイトマップはPlay Pointsの案内に集中する', () => {
  const sitemap = read('sitemap.html');
  for (const href of [
    'tools/dashboard/index.html',
    'kindle-tracker/index.html',
    'tools/sub-health/index.html',
    'tools/rakuten-sim/index.html',
    'tools/gravity-todo/'
  ]) {
    assert.ok(!sitemap.includes(`href="${href}"`), href);
  }
  assert.ok(sitemap.includes('href="latest/"'));
  assert.ok(sitemap.includes('href="blog/"'));
});

test('韓国語トップは為替計算をうたわず実際の入力条件を説明する', () => {
  const html = read('ko/index.html');
  const description = '구글 플레이 포인트 등급 달성 계산기. 실버, 골드, 플래티넘, 다이아몬드 등급까지 필요한 결제 금액을 등급별 기본 적립률과 이벤트 배율로 계산합니다.';

  assert.ok(html.includes(`<meta name="description" content="${description}">`));
  assert.ok(!html.includes('환율과 보너스 이벤트'));
  assert.ok(html.includes('<meta name="last-modified" content="2026-07-26">'));
});

test('Q&Aは現在のランク判定と計算機の責任範囲を明示する', () => {
  const html = read('info.html');

  assert.ok(html.includes('到達したステータスは翌年末まで維持され'));
  assert.ok(html.includes('毎年初めに前年の獲得ポイントで再判定されます'));
  assert.ok(html.includes('キャンペーンの併用可否や対象判定を保証するものではありません'));
  assert.ok(!html.includes('2000プレイポイント'));
});
