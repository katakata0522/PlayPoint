'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createSelect(values, current = values[0], labels = {}) {
  const options = values.map(value => ({
    value: String(value),
    dataset: labels[value] ? { statusLabel: labels[value] } : {}
  }));
  const selectedIndex = Math.max(0, values.findIndex(value => String(value) === String(current)));
  return {
    value: String(current),
    options,
    selectedIndex
  };
}

function loadShare({ search = '', href = 'https://playpoint-sim.com/?utm_source=test#result', dom = {} } = {}) {
  const calls = [];
  const STATE = { dom, currentRegion: 'JP' };
  const CALC = {
    getValidNumberInput(element, min) {
      if (!element) return null;
      const value = Number(element.value);
      return Number.isFinite(value) && value >= min ? value : null;
    },
    updateReverseBaseRate() { calls.push('updateReverseBaseRate'); },
    reverseCalculate() { calls.push('reverseCalculate'); },
    updateBaseRateAndTarget() { calls.push('updateBaseRateAndTarget'); },
    updateNeededPointsConstraint() { calls.push('updateNeededPointsConstraint'); },
    calculate() { calls.push('calculate'); }
  };
  const UI = {
    switchMode(mode) { calls.push(['switchMode', mode]); }
  };
  const CONSTANTS = { MODE_MAIN: 'main', MODE_REVERSE: 'reverse' };
  const window = {
    location: { search, href },
    __TEST_ENV__: true,
    PP_APP: {}
  };

  const source = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8')
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+/gm, '')
    .concat('\n;globalThis.__testShare = SHARE;');
  const context = {
    STATE,
    CONSTANTS,
    CALC,
    UI,
    window,
    URL,
    URLSearchParams,
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'share.js' });

  return { SHARE: context.__testShare, STATE, CALC, UI, calls, window };
}

test('main share URL serializes the current calculator state and removes unrelated query/hash state', () => {
  const dom = {
    neededPoints: { value: '1728' },
    multiplier: { value: '3' },
    currentStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1.5),
    targetStatus: createSelect([1000, 4000], 4000, { 1000: 'Gold', 4000: 'Platinum' })
  };
  dom.targetStatus.selectedIndex = 1;
  const { SHARE } = loadShare({ dom });

  const url = new URL(SHARE.buildMainShareUrl());

  assert.equal(url.origin + url.pathname, 'https://playpoint-sim.com/');
  assert.equal(url.hash, '');
  assert.deepEqual(
    Object.fromEntries(url.searchParams.entries()),
    {
      mode: 'main',
      status: '1.5',
      target: 'platinum',
      points: '1728',
      multiplier: '3'
    }
  );
});

test('main share URL hydration restores only validated values and runs the normal calculator flow', () => {
  const dom = {
    currentStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1),
    targetStatus: createSelect([1000, 4000], 1000, { 1000: 'Gold', 4000: 'Platinum' }),
    neededPoints: { value: '1', max: '4000' },
    multiplier: { value: '1' }
  };
  const { SHARE, calls } = loadShare({
    search: '?mode=main&status=1.5&target=platinum&points=1728&multiplier=3',
    dom
  });

  SHARE.applyFromUrl();

  assert.equal(dom.currentStatus.value, '1.5');
  assert.equal(dom.targetStatus.selectedIndex, 1);
  assert.equal(dom.neededPoints.value, '1728');
  assert.equal(dom.multiplier.value, '3');
  assert.deepEqual(calls, [
    'updateBaseRateAndTarget',
    'updateNeededPointsConstraint',
    ['switchMode', 'main'],
    'calculate'
  ]);
});

test('share URL hydration rejects unsupported status and out-of-range numeric values', () => {
  const dom = {
    currentStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1.25),
    targetStatus: createSelect([1000, 4000], 1000, { 1000: 'Gold', 4000: 'Platinum' }),
    neededPoints: { value: '250', max: '4000' },
    multiplier: { value: '2' }
  };
  const { SHARE, calls } = loadShare({
    search: '?mode=main&status=9&target=unknown&points=999999&multiplier=99',
    dom
  });

  SHARE.applyFromUrl();

  assert.equal(dom.currentStatus.value, '1.25');
  assert.equal(dom.targetStatus.selectedIndex, 0);
  assert.equal(dom.neededPoints.value, '250');
  assert.equal(dom.multiplier.value, '2');
  assert.deepEqual(calls, [
    'updateBaseRateAndTarget',
    'updateNeededPointsConstraint',
    ['switchMode', 'main'],
    'calculate'
  ]);
});

test('reverse share URL hydration validates status, amount and multiplier before calculating', () => {
  const dom = {
    reverseStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1),
    amountYen: { value: '0' },
    reverseMultiplier: { value: '1' }
  };
  const { SHARE, calls } = loadShare({
    search: '?mode=reverse&status=1.75&amount=12000&multiplier=4',
    dom
  });

  SHARE.applyFromUrl();

  assert.equal(dom.reverseStatus.value, '1.75');
  assert.equal(dom.amountYen.value, '12000');
  assert.equal(dom.reverseMultiplier.value, '4');
  assert.deepEqual(calls, [
    'updateReverseBaseRate',
    ['switchMode', 'reverse'],
    'reverseCalculate'
  ]);
});
