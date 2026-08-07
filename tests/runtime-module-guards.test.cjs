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

test('ルートService Workerは画面遷移をネットワーク優先で更新する', () => {
  const serviceWorker = read('sw.js');
  assert.ok(serviceWorker.includes("event.request.mode === 'navigate'"));
  assert.ok(serviceWorker.includes('handleNavigationRequest'));
});

test('埋め込みウィジェットは外部依存なしで計算できる', () => {
  const embed = read('embed.html');
  const widget = read('embed/playpoint-widget.js');
  assert.match(embed, /playpoint-widget\.js/);
  assert.ok(widget.length > 500, 'widget script too thin');
  assert.doesNotMatch(widget, /from ['"]\.\.\/js\//);
});

test('許可された主要計測イベント名が設定に残る', () => {
  const config = read('js/config.js');
  for (const eventName of [
    'calendar_reminder_added',
    'pwa_install_accepted',
    'widget_code_copied',
    'widget_referral_landed'
  ]) {
    assert.ok(config.includes(eventName), eventName);
  }
});
