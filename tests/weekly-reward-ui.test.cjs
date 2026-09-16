'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const {
  collectAssetVersions,
  syncSharedRuntimeAssetVersions
} = require('../scripts/asset-sync.cjs');
const {
  assetSyncMutableJsTargets,
  cssTargets
} = require('../.github/scripts/minify.cjs');

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

test('日記タブがあるページだけ新UIを遅延読み込みする', () => {
  const thirdParty = read('js/third-party.js');

  assert.match(thirdParty, /document\.getElementById\('tab-diary'\)/);
  assert.match(thirdParty, /js\/weekly-reward-ui\.js\?v=/);
  assert.match(thirdParty, /Weekly reward UI load failed/);
});

test('新UIのJS/CSSは既存のasset version同期とpreflight復元対象に含まれる', () => {
  const versions = collectAssetVersions(root);

  assert.ok(versions.weeklyRewardUiVersion, 'weekly-reward-ui.js のrevisionがありません');
  assert.ok(versions.weeklyRewardUiCssVersion, 'weekly-reward-ui.css のrevisionがありません');
  assert.ok(cssTargets.includes('weekly-reward-ui.css'));
  assert.ok(assetSyncMutableJsTargets.includes('js/weekly-reward-ui.js'));
});

test('asset version同期は日記UIのJSとCSS参照を内容ハッシュへ更新する', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-weekly-ui-'));
  fs.mkdirSync(path.join(tempRoot, 'js'), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, 'blog'), { recursive: true });

  fs.writeFileSync(path.join(tempRoot, 'js/third-party.js'), "load('js/weekly-reward-ui.js?v=old');\n", 'utf8');
  fs.writeFileSync(path.join(tempRoot, 'js/weekly-reward-ui.js'), "load('weekly-reward-ui.css?v=old');\n", 'utf8');
  fs.writeFileSync(path.join(tempRoot, 'js/config.js'), '', 'utf8');
  fs.writeFileSync(path.join(tempRoot, 'js/points-cost.js'), '', 'utf8');
  fs.writeFileSync(path.join(tempRoot, 'blog/components.js'), '', 'utf8');

  try {
    syncSharedRuntimeAssetVersions(tempRoot, {
      consentVersion: 'consent123',
      analyticsCoreVersion: 'analytics123',
      blogCommonComponentsCssVersion: 'blog123',
      weeklyRewardUiVersion: 'weeklyjs123',
      weeklyRewardUiCssVersion: 'weeklycss123'
    });

    assert.match(
      fs.readFileSync(path.join(tempRoot, 'js/third-party.js'), 'utf8'),
      /js\/weekly-reward-ui\.js\?v=weeklyjs123/
    );
    assert.match(
      fs.readFileSync(path.join(tempRoot, 'js/weekly-reward-ui.js'), 'utf8'),
      /weekly-reward-ui\.css\?v=weeklycss123/
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('専用CSSは今週優先・過去週コンパクト・狭幅1列の表示契約を持つ', () => {
  const css = read('weekly-reward-ui.css');

  assert.match(css, /#tab-diary::before/);
  assert.match(css, /content:\s*"🎁"/);
  assert.match(css, /\.is-weekly-current/);
  assert.match(css, /\.is-weekly-compact/);
  assert.match(css, /\.diary-save-btn[\s\S]*display:\s*none/);
  assert.match(css, /@media \(max-width: 360px\)/);
});
