'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { polishPage } = require('../scripts/site-reader-polish.cjs');

const root = path.resolve(__dirname, '..');
const paths = ['games/index.html', 'en/games/index.html', 'ko/games/index.html', 'tw/games/index.html'];

test('4地域のゲーム一覧はタイトルを主役にして全件の導線を保つ', () => {
  for (const file of paths) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const hrefs = [...html.matchAll(/<a class="game-portal-card" href="([^"]+)"/g)].map(match => match[1]);
    assert.ok(hrefs.length >= 24, file + ': ゲームへのリンクが減っている');
    assert.equal(new Set(hrefs).size, hrefs.length, file + ': 重複リンク');
    assert.match(html, /class="game-page-container game-directory-layout"/);
    assert.match(html, /games\/directory\.css\?v=[a-f0-9]{10}/);
    assert.match(html, /class="game-directory-intro"/);
    assert.doesNotMatch(html, /<div class="game-card-icon">/);
    assert.doesNotMatch(html, /<aside class="sidebar-column">/);
    assert.match(html, /class="game-directory-guides"/);
    assert.match(html, /data-game-directory-search/);
    assert.equal(polishPage(html, file), html, file + ': 再実行で表示が変化している');
  }
});

test('日本語一覧はウマ娘の購入プランを説明し、広告を識別できる', () => {
  const html = fs.readFileSync(path.join(root, 'games/index.html'), 'utf8');
  assert.match(html, /ウマ娘の購入プランで貯まるPlayポイントを計算できます。/);
  assert.match(html, /広告・アフィリエイト/);
  assert.match(html, /rel="sponsored noopener noreferrer"/);
  assert.match(html, /href="\.\/games|href="\.\/genshin\//);
  assert.match(html, /href="\.\/efootball\//);
});

test('一覧のスタイルは個別ゲーム計算機を巻き込まない', () => {
  const css = fs.readFileSync(path.join(root, 'games/directory.css'), 'utf8');
  assert.match(css, /\.game-directory-layout \.games-grid/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 650px\)/);
});
