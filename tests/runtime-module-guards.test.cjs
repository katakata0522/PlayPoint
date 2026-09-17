'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createAppModuleRevision, createFileRevision, ROOT_SERVICE_WORKER_ASSETS } = require('../scripts/asset-sync.cjs');
const { cssTargets } = require('../.github/scripts/minify.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const runtimeModules = [
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
  'js/calculator-funnel-analytics.js'
];

const sharedRuntimeAssets = [
  'js/analytics-core.js',
  'blog/common-components.css'
];

test('分離した実行時モジュールはキャッシュ改訂・Service Worker先読みに含まれる', () => {
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');
  const main = read('js/main.js');

  for (const file of runtimeModules) {
    const importPath = `./${path.basename(file)}`;
    assert.ok(main.includes(importPath), `main.js import missing: ${importPath}`);
    assert.ok(assetSync.includes(`'${file}'`) || assetSync.includes(`"${file}"`), `asset-sync missing: ${file}`);
    assert.ok(
      serviceWorker.includes(`'./${file}'`) || serviceWorker.includes(`"./${file}"`),
      `sw missing: ${file}`
    );
  }
});

test('共通計測とブログ共通CSSは版管理され、CSSだけ圧縮対象に含まれる', () => {

  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');
  const components = read('blog/components.js');

  for (const file of sharedRuntimeAssets) {
    assert.ok(assetSync.includes(`'${file}'`) || assetSync.includes(`"${file}"`), `asset-sync missing: ${file}`);
  }
  assert.ok(cssTargets.includes('blog/common-components.css'), 'ブログ共通CSSが圧縮対象から欠落');
  const revision = createFileRevision(root, 'js/analytics-core.js');
  assert.ok(serviceWorker.includes(`./js/analytics-core.js?v=${revision}`), 'precacheの版が実資産と異なる');
  assert.ok(ROOT_SERVICE_WORKER_ASSETS.some(asset => asset.assetPath === './js/analytics-core.js'), '共通計測資産が版管理対象にない');
  assert.match(read('js/config.js'), new RegExp(`import\\s*[\"']\\./analytics-core\\.js\\?v=${revision}[\"']`));
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
  fs.appendFileSync(path.join(crlfRoot, 'js/config.js'), '\nconst changed = true;\n');
  assert.notEqual(createAppModuleRevision(lfRoot), createAppModuleRevision(crlfRoot), '内容変更を固定hashで見逃さない');
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

// R05: コード長の代用検査は廃止。必須embed-widget-smokeで独立読込と4言語の実計算を検証する。

test('埋め込みジェネレーターの計測と地域導線は共通境界・6地域へ揃える', () => {
  const embed = read('embed.html');
  assert.match(embed, /PlayPointAnalytics\?\.track\('widget_code_copied'/);
  assert.doesNotMatch(embed, /window\.gtag\('event', 'widget_code_copied'/);
  assert.match(embed, /HK: 'hk\/'/);
  assert.match(embed, /IN: 'in\/'/);
  assert.match(embed, /browserLang\.startsWith\('zh-hk'\)/);
  assert.match(embed, /browserLang\.startsWith\('en-in'\)/);
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

test('地域表示の決定と保存責務はregion-navigationへ集約する', () => {
  const main = read('js/main.js');

  assert.match(main, /applyRegionFromPath/, 'mainがURL由来の地域初期化を委譲していません');
  assert.doesNotMatch(main, /STORAGE_REGION_KEY/, 'mainが地域保存キーを直接扱っています');
  assert.doesNotMatch(main, /playpointPreferredRegion/, 'mainが地域保存の実装詳細を直接所有しています');
});
