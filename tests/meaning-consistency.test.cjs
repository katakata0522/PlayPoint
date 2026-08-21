'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('international top-page source explains special earn rates without multiplier math', () => {
  const source = read('scripts/locale-config.cjs');

  for (const legacy of [
    'campaign multipliers',
    'campaign multiplier effects',
    'active multiplier campaigns',
    '이벤트 배율',
    '보너스 이벤트 배율',
    '加倍活動倍率',
    '活動加倍倍率'
  ]) {
    assert.ok(!source.includes(legacy), `legacy multiplier wording remains: ${legacy}`);
  }

  assert.match(source, /special earn rate shown in Google Play and uses the higher rate/);
  assert.match(source, /Google Play에 표시된 특별 적립률을 비교해 높은 값을 사용/);
  assert.match(source, /Google Play 顯示的活動特別獲點率，採用較高者/);
});

test('generated international top pages carry the corrected earn-rate meaning', () => {
  const checks = [
    ['en/index.html', 'special earn rate shown in Google Play', 'campaign multipliers'],
    ['ko/index.html', 'Google Play에 표시된 특별 적립률', '이벤트 배율'],
    ['tw/index.html', 'Google Play 顯示的活動特別獲點率', '加倍活動倍率']
  ];

  for (const [relativePath, expected, legacy] of checks) {
    const html = read(relativePath);
    assert.ok(html.includes(expected), `${relativePath}: corrected earn-rate wording is missing`);
    assert.ok(!html.includes(legacy), `${relativePath}: legacy multiplier wording remains`);
  }
});

test('game comparison tables label point earning rates, not cashback or 1x multipliers', () => {
  const source = read('scripts/generate-game-simulators.cjs');
  assert.ok(source.includes("tableThNormal: '基本獲得率（100円あたり1pt）'"));
  assert.ok(source.includes("tableThNormal: 'Base earn rate (1 pt / $1)'"));
  assert.ok(!source.includes("tableThNormal: '通常時還元 (1%)'"));
  assert.ok(!source.includes("tableThNormal: 'Standard (1x)'"));

  const samples = [
    ['games/genshin/index.html', '基本獲得率（100円あたり1pt）', '通常時還元 (1%)'],
    ['en/games/genshin/index.html', 'Base earn rate (1 pt / $1)', 'Standard (1x)'],
    ['ko/games/genshin/index.html', '기본 적립률 (1,000원당 1pt)', null],
    ['tw/games/genshin/index.html', '基本獲點率（每 NT$30 1點）', null]
  ];

  for (const [relativePath, expected, legacy] of samples) {
    const html = read(relativePath);
    assert.ok(html.includes(expected), `${relativePath}: expected base earn-rate label is missing`);
    if (legacy) assert.ok(!html.includes(legacy), `${relativePath}: legacy table label remains`);
  }
});
