'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDir = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

test('日本語トップは目的別の既存記事へ静的導線を持つ', () => {
  const html = read('index.html');
  const match = html.match(/<!-- ARTICLE_DRAWER_START -->([\s\S]*?)<!-- ARTICLE_DRAWER_END -->/);
  assert.ok(match, '日本語トップにARTICLE_DRAWERが必要です');

  const drawer = match[1];
  const routes = [
    ['2025-12-25-diamond-worth-it', 'ダイヤモンド'],
    ['2026-07-31-google-play-quests', 'クエスト'],
    ['2025-12-25-best-use', 'ポイント'],
    ['2026-06-20-discount-gift-cards', 'ギフトコード']
  ];

  for (const [slug, label] of routes) {
    assert.match(drawer, new RegExp(`href="articles/${slug}\\.html"`), `${label}の既存記事への静的リンクが必要です`);
    assert.match(drawer, new RegExp(label), `${label}であることが利用者に分かるリンク文言が必要です`);
  }
});
