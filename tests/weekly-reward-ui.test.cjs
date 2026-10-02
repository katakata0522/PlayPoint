'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const { collectAssetVersions } = require('../scripts/asset-sync.cjs');

test("ウィークリーリワードUIは既存の日記保存契約を変更せず表示層だけを担当する", () => {
  const ui=read('js/weekly-reward-ui.js');
  assert.doesNotMatch(ui,/localStorage|DIARY_DATA_KEY|saveDiaryData|handleDiarySave/);
  // 月選択・現在週・編集・保存・共有の実DOMはdiary-browserが所有する。
});


test('新UIのJSは既存のasset version同期に含まれる', () => {
  const versions = collectAssetVersions(root);
  assert.ok(versions.weeklyRewardUiVersion, 'weekly-reward-ui.js のrevisionがありません');
});
