'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function extractObject(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `object markers missing: ${startMarker}`);
  const literal = source.slice(start + startMarker.length, end).trim();
  return vm.runInNewContext('(' + literal + ')', { console });
}

function canonicalRanks(config) {
  return Object.entries(config.statuses).map(([label, rate]) => ({
    label,
    rate: Number(rate),
    points: Number(config.thresholds[label] ?? 0),
  }));
}

const regionByLocale = Object.freeze({
  ja: 'JP',
  en: 'US',
  ko: 'KR',
  'zh-TW': 'TW',
});

test('ゲーム計算機の独立runtimeはcanonical地域ルールと数値を同期する', () => {
  const configs = loadConfigs(false);
  const source = read('games/game-sim.js');
  const locales = extractObject(source, 'const LOCALE_CONFIGS =', '\n    };\n\n    function getLocaleConfig');

  for (const [locale, region] of Object.entries(regionByLocale)) {
    const expected = canonicalRanks(configs[region]);
    const actual = locales[locale];
    assert.ok(actual, `${locale}: game locale config missing`);
    assert.equal(Number(actual.unitSpend), Number(configs[region].spendUnit), `${locale}: spend unit drift`);
    assert.deepEqual(
      actual.ranks.map(rank => ({ label: rank.name, rate: Number(rank.rate), points: Number(rank.points) })),
      expected,
      `${locale}: game rank/rate/threshold drift`
    );
  }
});

test('埋め込みwidgetの独立runtimeはcanonical地域ルールと数値を同期する', () => {
  const configs = loadConfigs(false);
  const source = read('embed/playpoint-widget.js');
  const i18n = extractObject(source, 'const I18N =', '\n    };\n\n    class PlayPointWidget');
  const widgetLocales = { ja: 'JP', en: 'US', ko: 'KR', zh: 'TW' };

  for (const [locale, region] of Object.entries(widgetLocales)) {
    const expected = canonicalRanks(configs[region]);
    const actual = i18n[locale];
    assert.ok(actual, `${locale}: widget locale config missing`);
    assert.equal(Number(actual.unit), Number(configs[region].spendUnit), `${locale}: widget spend unit drift`);

    const statusEntries = Object.entries(actual.statuses).map(([rate, label]) => ({ label, rate: Number(rate) }));
    assert.deepEqual(
      statusEntries,
      expected.map(({ label, rate }) => ({ label, rate })),
      `${locale}: widget rank/rate drift`
    );

    for (let index = 0; index < expected.length - 1; index += 1) {
      const current = expected[index];
      const next = expected[index + 1];
      const target = actual.targets[Object.keys(actual.targets).find(key => Number(key) === current.rate)];
      assert.ok(target, `${locale}: target missing for rate ${current.rate}`);
      assert.equal(Number(target.val), next.points, `${locale}: next threshold drift for rate ${current.rate}`);
      assert.equal(target.label, next.label, `${locale}: next label drift for rate ${current.rate}`);
    }
  }
});
