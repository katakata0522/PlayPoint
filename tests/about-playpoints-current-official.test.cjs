'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/content-dates.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'about-playpoints.html'), 'utf8');

test('Play Points基礎ページは現在の日本向け公式獲得対象を案内する', () => {
  assert.match(html, /Google Playでアプリやゲームを購入する/);
  assert.match(html, /アプリ内・ゲーム内で購入または定期購入を行う/);
  assert.match(html, /Google Playで書籍を購入する/);
  assert.match(html, /Play Pointsの「貯める」に表示される対象プロモーション/);
  assert.doesNotMatch(html, /映画・書籍・音楽の購入/);
  assert.doesNotMatch(html, /YouTube Premiumなどの定期購入/);
});

test('日本の5ステータスは公式閾値・通常獲得率・常設特典の境界を守る', () => {
  for (const expected of [
    '0〜249pt',
    '250〜999pt',
    '1,000〜3,999pt',
    '4,000〜14,999pt',
    '15,000pt以上',
    '100円ごとに1pt',
    '100円ごとに1.25pt',
    '100円ごとに1.5pt',
    '100円ごとに1.75pt',
    '100円ごとに2pt',
    'ウィークリーリワード',
    'プレミアムサポート'
  ]) {
    assert.ok(html.includes(expected), `missing current Japan contract: ${expected}`);
  }

  assert.doesNotMatch(html, /超レア特典/);
  assert.doesNotMatch(html, /VIP感たっぷり/);
  assert.doesNotMatch(html, /ポイントアップウィーク/);
  assert.doesNotMatch(html, /ニコニコ超会議/);
});

test('基礎ページは個別オファーと常設制度を分け、一次情報への導線を持つ', () => {
  assert.match(html, /イベント招待、限定グッズ、抽選などは常設のステータス特典として保証されるものではありません/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/15776742/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
  assert.doesNotMatch(html, /Google公式 of 規約/);
});

test('意味のある本文更新日はHTMLと内容日台帳で一致する', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['about-playpoints.html'], '2026-09-14');
  assert.match(html, /<meta name="last-modified" content="2026-09-14">/);
  assert.match(html, /<meta property="article:modified_time" content="2026-09-14T00:00:00\+09:00">/);
  assert.match(html, /"dateModified": "2026-09-14"/);
  assert.match(html, /最終更新: 2026-09-14/);
});
