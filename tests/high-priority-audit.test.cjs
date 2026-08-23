'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('PWA起動は保存済み地域を復元する専用ランチャーを経由する', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const launcher = read('pwa-launch.html');
  const serviceWorker = read('sw.js');

  assert.equal(manifest.start_url, '/pwa-launch.html');
  assert.match(launcher, /playpointPreferredRegion/);
  for (const target of ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']) {
    assert.ok(launcher.includes(`'${target}'`), `PWAランチャーに地域パスがありません: ${target}`);
  }
  assert.ok(serviceWorker.includes("'./pwa-launch.html'"), 'PWAランチャーがオフライン先読み対象にありません');
});

test('Country Guideは現在の6地域専用モードを案内する', () => {
  const guide = read('attention.html');

  for (const [label, href] of [
    ['Japan', './'],
    ['United States', './en/'],
    ['South Korea', './ko/'],
    ['Taiwan', './tw/'],
    ['Hong Kong', './hk/'],
    ['India', './in/']
  ]) {
    assert.ok(guide.includes(label), `Country Guideに${label}がありません`);
    assert.ok(guide.includes(`href="${href}"`), `Country Guideに${href}への導線がありません`);
  }

  assert.ok(guide.includes('Japan, the United States, South Korea, Taiwan, Hong Kong, and India'));
  assert.ok(!guide.includes('This calculator currently has dedicated modes for <strong>Japan, the United States, South Korea, and Taiwan</strong>'));
});

test('HKとINのゲーム導線は別地域ルールであることを明示する', () => {
  const config = read('js/region-expansion-config.js');

  assert.ok(config.includes("🎮 遊戲計算（台灣規則・非香港）"));
  assert.ok(config.includes("🎮 Game calculators (U.S. rules, not India)"));
  assert.ok(config.includes("href: '../tw/games/'"));
  assert.ok(config.includes("href: '../en/games/'"));
});
