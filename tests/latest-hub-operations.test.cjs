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

  assert.equal(result.verificationDate, '2026-07-31');
  assert.ok(html.includes('<meta name="last-modified" content="2026-07-31">'));
  assert.match(html, /"dateModified"\s*:\s*"2026-07-31"/);
  assert.ok(html.includes('最終更新: <time datetime="2026-07-31">2026-07-31</time>'));
  assert.ok(html.includes('次回確認目安: 2026-08-07頃'));
});

test('最新情報ハブは週次3制度とクエストを別項目として扱う', () => {
  const html = fs.readFileSync(latestPath, 'utf8');

  assert.ok(html.includes('通常週次｜公開公式情報で確認'));
  assert.ok(html.includes('スーパー週次｜公開公式情報で確認'));
  assert.ok(html.includes('Play Pass週次｜公開公式情報で確認'));
  assert.ok(html.includes('クエスト｜対象者はアカウント内で確認'));
  assert.ok(html.includes('../articles/2026-07-31-super-weekly-reward.html'));
  assert.ok(html.includes('../articles/2026-07-31-google-play-quests.html'));
});

test('生成処理は確認していない日に最新情報ハブの日付を進めない', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['latest/index.html'], '2026-07-31');
});

test('鮮度検査は14日を超えた確認日を検出する', () => {
  const html = fs.readFileSync(latestPath, 'utf8');

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      maxAgeDays: 14,
      now: new Date('2026-08-16T00:00:00Z')
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
