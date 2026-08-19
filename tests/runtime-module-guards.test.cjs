'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createAppModuleRevision } = require('../scripts/asset-sync.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const runtimeModules = [
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js'
];

const sharedRuntimeAssets = [
  'js/analytics-core.js',
  'blog/common-components.css'
];

test('分離した実行時モジュールは圧縮・キャッシュ改訂・Service Worker先読みに含まれる', () => {
  const minify = read('.github/scripts/minify.cjs');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');
  const main = read('js/main.js');

  for (const file of runtimeModules) {
    const importPath = `./${path.basename(file)}`;
    assert.ok(main.includes(importPath), `main.js import missing: ${importPath}`);
    assert.ok(minify.includes(`'${file}'`), `minify missing: ${file}`);
    assert.ok(assetSync.includes(`'${file}'`), `asset-sync missing: ${file}`);
    assert.ok(
      serviceWorker.includes(`'./${file}'`) || serviceWorker.includes(`"./${file}"`),
      `sw missing: ${file}`
    );
  }
});

test('共通計測とブログ共通CSSは圧縮・版管理・必要画面への読込に含まれる', () => {
  const minify = read('.github/scripts/minify.cjs');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');
  const components = read('blog/components.js');

  for (const file of sharedRuntimeAssets) {
    assert.ok(minify.includes(`'${file}'`), `minify missing: ${file}`);
    assert.ok(assetSync.includes(`'${file}'`), `asset-sync missing: ${file}`);
  }
  assert.match(serviceWorker, /'\.\/js\/analytics-core\.js\?v=[a-f0-9]{10}'/);
  assert.ok(assetSync.includes("versionKey: 'analyticsCoreVersion'"));
  assert.match(read('js/config.js'), /import '\.\/analytics-core\.js\?v=[a-f0-9]{10}'/);
  assert.ok(components.includes('blog/common-components.css'));
});

test('アプリモジュールのキャッシュ世代は改行コードが違っても一致する', (t) => {
  const lfRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-lf-'));
  const crlfRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-crlf-'));
  const moduleFiles = ['config.js', 'ui.js', 'diary.js', 'calculator.js', 'share.js'];

  t.after(() => {
    fs.rmSync(lfRoot, { recursive: true, force: true });
    fs.rmSync(crlfRoot, { recursive: true, force: true });
  });

  for (const targetRoot of [lfRoot, crlfRoot]) {
    fs.mkdirSync(path.join(targetRoot, 'js'), { recursive: true });
  }

  for (const [index, file] of moduleFiles.entries()) {
    const source = `'use strict';\nconst value = ${index};\n`;
    fs.writeFileSync(path.join(lfRoot, 'js', file), source);
    fs.writeFileSync(path.join(crlfRoot, 'js', file), source.replace(/\n/g, '\r\n'));
  }

  assert.equal(createAppModuleRevision(lfRoot), createAppModuleRevision(crlfRoot));
});

test('公開HTMLは外部Google Fontsへ接続しない', () => {
  const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute, out);
      else if (entry.name.endsWith('.html')) out.push(absolute);
    }
    return out;
  };

  for (const file of walk(root)) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, path.relative(root, file));
  }
});

test('埋め込みウィジェットは外部依存なしで計算できる', () => {
  const embed = read('embed.html');
  const widget = read('embed/playpoint-widget.js');
  assert.match(embed, /playpoint-widget\.js/);
  assert.ok(widget.length > 500, 'widget script too thin');
  assert.doesNotMatch(widget, /from ['"]\.\.\/js\//);
});

test('許可された主要計測イベント名が設定に残る', () => {
  const analyticsCore = read('js/analytics-core.js');
  for (const eventName of [
    'calendar_reminder_added',
    'pwa_install_accepted',
    'widget_code_copied',
    'widget_referral_landed'
  ]) {
    assert.ok(analyticsCore.includes(eventName), eventName);
  }
});

// --- 回帰ダイエットで落ちた重要ガードの復元 ---

test('日記保存イベントと計測はストレージ保存成功時だけ送る', () => {
  const script = read('js/diary.js');
  // 保存失敗時は return し、成功後だけ track / CustomEvent を発火する
  assert.ok(script.includes('if (!this.saveDiaryData(data)) return;'));
  const saveHandler = script.slice(script.indexOf('handleDiarySave'));
  const guardIndex = saveHandler.indexOf('if (!this.saveDiaryData(data)) return;');
  const trackIndex = saveHandler.indexOf("ANALYTICS.track('diary_entry_saved'");
  const eventIndex = saveHandler.indexOf("playpoint:diary-saved");
  assert.ok(guardIndex >= 0, '保存失敗時の早期 return がありません');
  assert.ok(trackIndex > guardIndex, '計測が保存成功前にあります');
  assert.ok(eventIndex > guardIndex, 'diary-saved が保存成功前にあります');
});

test('言語トップはURLと異なる保存済み地域設定で表示を上書きしない', () => {
  // ルート/言語パスの表示地域は URL を正とし、localStorage の旧設定で上書きしない
  const regionNav = read('js/region-navigation.js');
  const applyBody = regionNav.slice(
    regionNav.indexOf('export function applyRegionFromPath'),
    regionNav.indexOf('export function switchRegion')
  );
  assert.ok(applyBody.includes("STATE.currentRegion = 'JP'"), 'ルートを日本語固定する処理がありません');
  assert.ok(
    !applyBody.includes('localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY)'),
    'applyRegionFromPath が保存済み地域で表示を上書きしています'
  );
  // main も古い「保存地域を読んで優先」パターンを持たない
  const main = read('js/main.js');
  assert.ok(!main.includes('const savedRegion = localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY);'));
});
