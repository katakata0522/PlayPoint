'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/html-sync.cjs');
const { validateLatestHub } = require('../scripts/latest-hub-audit.cjs');

const root = path.resolve(__dirname, '..');
const latestPath = path.join(root, 'latest', 'index.html');

test('最新情報ハブは確認範囲・公式参照・確認日を明示する', () => {
  const html = fs.readFileSync(latestPath, 'utf8');
  const result = validateLatestHub(html);

  assert.equal(result.verificationDate, '2026-07-26');
  assert.ok(html.includes('<meta name="last-modified" content="2026-07-26">'));
  assert.ok(html.includes('"dateModified": "2026-07-26"'));
  assert.ok(html.includes('ページ更新: <time datetime="2026-07-26">2026-07-26</time>'));
  assert.ok(html.includes('次回確認目安: 2026-08-02頃'));
});

test('生成処理は確認していない日に最新情報ハブの日付を進めない', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['latest/index.html'], '2026-07-26');
});

test('鮮度検査は14日を超えた確認日を検出する', () => {
  const html = fs.readFileSync(latestPath, 'utf8');

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      maxAgeDays: 14,
      now: new Date('2026-08-11T00:00:00Z')
    }),
    /公式確認から16日経過/
  );
});

test('運用手順は日付だけの更新と個別オファーの一般化を禁止する', () => {
  const guide = fs.readFileSync(path.join(root, 'docs', 'LATEST_HUB_MAINTENANCE.md'), 'utf8');

  assert.ok(guide.includes('確認せずに日付だけを更新しない'));
  assert.ok(guide.includes('個別オファーを全利用者向けの情報として掲載しない'));
  assert.ok(guide.includes('latest/index.html'));
  assert.ok(guide.includes('CONTENT_DATE_OVERRIDES'));
});
