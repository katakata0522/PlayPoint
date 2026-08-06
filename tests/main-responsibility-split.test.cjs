'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const moduleFiles = [
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js'
];

test('main.jsは初期化と画面調停に集中し独立責務を各モジュールへ委譲する', () => {
  const main = read('js/main.js');

  for (const file of moduleFiles) {
    const importPath = './' + path.basename(file);
    assert.ok(main.includes(importPath), `main.jsに${importPath}のimportがありません`);
  }

  for (const extractedMarker of [
    'beforeinstallprompt',
    'BEGIN:VCALENDAR',
    'widget_referral_landed',
    'navigator.serviceWorker.register',
    '한국어 버전이 있습니다!'
  ]) {
    assert.ok(!main.includes(extractedMarker), `main.jsに分離済み責務が残っています: ${extractedMarker}`);
  }
});

test('分離した責務の実装と既存イベント名は専用モジュールに保持する', () => {
  assert.ok(read('js/pwa-install.js').includes('beforeinstallprompt'));
  assert.ok(read('js/pwa-install.js').includes("track('pwa_install_accepted'"));
  assert.ok(read('js/calendar-reminder.js').includes('BEGIN:VCALENDAR'));
  assert.ok(read('js/calendar-reminder.js').includes("track('calendar_reminder_added'"));
  assert.ok(read('js/widget-referral.js').includes("track('widget_referral_landed'"));
  assert.ok(read('js/service-worker-registration.js').includes('navigator.serviceWorker.register'));
  assert.ok(read('js/language-suggestion.js').includes('한국어 버전이 있습니다!'));
});

test('新しい実行時モジュールは圧縮・キャッシュ更新・オフライン先読みに含める', () => {
  const minify = read('.github/scripts/minify.cjs');
  const assetSync = read('scripts/asset-sync.cjs');
  const serviceWorker = read('sw.js');

  for (const file of moduleFiles) {
    assert.ok(minify.includes(`'${file}'`), `圧縮対象にありません: ${file}`);
    assert.ok(assetSync.includes(`'${file}'`), `キャッシュ改訂対象にありません: ${file}`);
    assert.ok(serviceWorker.includes(`'./${file}'`), `Service Worker先読みにありません: ${file}`);
  }
});
