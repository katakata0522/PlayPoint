'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { openingTags } = require('./helpers/markup-contract.cjs');
const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('PWA起動は保存済み地域を復元する専用ランチャーを経由する', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const launcher = read('pwa-launch.html');
  const serviceWorker = read('sw.js');

  assert.equal(manifest.start_url, '/pwa-launch.html');
  const inline = launcher.replace(/<!--[\s\S]*?-->/g, '').match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(inline, 'PWA launcher script missing');
  for (const [region, expected] of [['JP', '/'], ['US', '/en/'], ['KR', '/ko/'], ['TW', '/tw/'], ['HK', '/hk/'], ['IN', '/in/'], ['UNKNOWN', '/'], [null, '/'], ['throw', '/']]) {
    const actual = [];
    vm.runInNewContext(inline, { localStorage: { getItem(key) {
      assert.equal(key, 'playpointPreferredRegion');
      if (region === 'throw') throw new Error('storage denied');
      return region;
    } }, window: { location: { replace(value) { actual.push(value); } } } }, { timeout: 100 });
    assert.deepEqual(actual, [expected], String(region));
  }
  assert.ok(serviceWorker.includes("'./pwa-launch.html'"), 'PWAランチャーがオフライン先読み対象にありません');
});

test('Country Guideは現在の6地域専用モードを案内する', () => {
  const guide = read('attention.html');
  const links = openingTags(guide).filter(node => node.tag === 'a');

  for (const [label, href] of [
    ['Japan', './'],
    ['United States', './en/'],
    ['South Korea', './ko/'],
    ['Taiwan', './tw/'],
    ['Hong Kong', './hk/'],
    ['India', './in/']
  ]) {
    assert.ok(guide.includes(label), `Country Guideに${label}がありません`);
    assert.ok(links.some(node => node.attrs.href === href), `Country Guideに${href}への導線がありません`);
  }

});

test('HKとINのゲーム導線は別地域ルールであることを明示する', () => {
  const configs = loadConfigs(true);

  assert.match(configs.HK.uiText.linkGames.text, /台灣規則.*非香港/);
  assert.equal(configs.HK.uiText.linkGames.href, '../tw/games/');
  assert.match(configs.IN.uiText.linkGames.text, /U\.S\. rules, not India/);
  assert.equal(configs.IN.uiText.linkGames.href, '../en/games/');
});
