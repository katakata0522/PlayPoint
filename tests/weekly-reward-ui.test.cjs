'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const { collectAssetVersions } = require('../scripts/asset-sync.cjs');

test('ウィークリーリワードUIは既存の日記保存契約を変更せず表示層だけを担当する', () => {
  const ui = read('js/weekly-reward-ui.js');

  assert.doesNotMatch(ui, /localStorage|DIARY_DATA_KEY|saveDiaryData|handleDiarySave/);
  assert.match(ui, /MutationObserver/);
  assert.match(ui, /weekly-month-picker/);
  assert.match(ui, /weekly-secondary-details/);
  assert.match(ui, /is-weekly-current/);
  assert.match(ui, /is-weekly-compact/);
  assert.match(ui, /aria-expanded/);
});

test('日記タブがある実ページだけ新UIを動的importする', () => {
  const thirdParty = read('js/third-party.js');

  assert.match(thirdParty, /typeof document\.getElementById !== 'function'/);
  assert.match(thirdParty, /document\.getElementById\('tab-diary'\)/);
  assert.match(thirdParty, /import\('\/js\/weekly-reward-ui\.js(?:\?v=[^']+)?'\)/);
  assert.match(thirdParty, /Weekly reward UI load failed/);
});

test('新UIのJSは既存のasset version同期に含まれる', () => {
  const versions = collectAssetVersions(root);
  assert.ok(versions.weeklyRewardUiVersion, 'weekly-reward-ui.js のrevisionがありません');
});

test('UIスタイルはモジュール内包で今週優先・過去週コンパクト・狭幅1列の契約を持つ', () => {
  const ui = read('js/weekly-reward-ui.js');

  assert.match(ui, /#tab-diary::before/);
  assert.match(ui, /content:\s*"🎁"/);
  assert.match(ui, /\.is-weekly-current/);
  assert.match(ui, /\.is-weekly-compact/);
  assert.match(ui, /\.diary-save-btn[^`]*display:none/);
  assert.match(ui, /@media\(max-width:360px\)/);
  assert.match(ui, /style\.textContent = STYLE_TEXT/);
});
