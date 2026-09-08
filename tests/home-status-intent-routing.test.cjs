'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDir = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

test('日本語トップはランク別必要額LPへ静的導線を持つ', () => {
  const html = read('index.html');
  const match = html.match(/<!-- ARTICLE_DRAWER_START -->([\s\S]*?)<!-- ARTICLE_DRAWER_END -->/);
  assert.ok(match, '日本語トップにARTICLE_DRAWERが必要です');

  const drawer = match[1];
  const routes = [
    ['silver', 'シルバー'],
    ['gold', 'ゴールド'],
    ['platinum', 'プラチナ'],
    ['diamond', 'ダイヤモンド']
  ];

  for (const [slug, label] of routes) {
    assert.match(drawer, new RegExp(`href="status/${slug}/"`), `${label}の専用LPへの静的リンクが必要です`);
    assert.match(drawer, new RegExp(label), `${label}であることが利用者に分かるリンク文言が必要です`);
  }
});
