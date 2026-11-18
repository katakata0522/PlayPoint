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

function loadShare({ search = '', href = 'https://playpoint-sim.com/?utm_source=test#result', pathname = new URL(href).pathname, dom = {}, sessionStorage, document } = {}) {
  const calls = [];
  const STATE = { dom, currentRegion: 'JP' };
  const CALC = {
    getValidNumberInput(element, min, max = Infinity) {
      if (!element) return null;
      const value = Number(element.value);
      return Number.isFinite(value) && value >= min && value <= max ? value : null;
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
    location: { search, href, pathname },
    __TEST_ENV__: true,
    PP_APP: {}
  };
  if (sessionStorage !== undefined) window.sessionStorage = sessionStorage;

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
  if (document !== undefined) context.document = document;
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

test('手入力した通常獲得率と達成済みの0ptを共有先でも復元する', () => {
  const dom = {
    currentStatus: createSelect([1]), targetStatus: createSelect([250], 250, { 250: 'Silver' }),
    neededPoints: { value: '0', max: '250' }, baseRate: { value: '2.5' }, multiplier: { value: '1' }
  };
  const { SHARE } = loadShare({ dom });
  const url = new URL(SHARE.buildMainShareUrl());
  dom.baseRate.value = '1';
  dom.neededPoints.value = '';
  loadShare({ search: url.search, dom }).SHARE.applyFromUrl();
  assert.equal(dom.baseRate.value, '2.5');
  assert.equal(dom.neededPoints.value, '0');
  dom.baseRate.value = '1';
  dom.neededPoints.value = '125';
  loadShare({ search: '?mode=main&points=&baseRate=999', dom }).SHARE.applyFromUrl();
  assert.equal(dom.baseRate.value, '1');
  assert.equal(dom.neededPoints.value, '125');
});

test('逆算の共有でも変更した獲得率と税抜対象額を一緒に復元する', () => {
  const dom = {
    reverseStatus: createSelect([1]), amountYen: { value: '5000' }, reverseEligibleAmount: { value: '4000' },
    reverseBaseRate: { value: '2.5' }, reverseMultiplier: { value: '1' }
  };
  const url = new URL(loadShare({ dom }).SHARE.buildReverseShareUrl());
  dom.reverseBaseRate.value = '1';
  dom.reverseEligibleAmount.value = '';
  loadShare({ search: url.search, dom }).SHARE.applyFromUrl();
  assert.equal(dom.reverseBaseRate.value, '2.5');
  assert.equal(dom.reverseEligibleAmount.value, '4000');
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

test('対象額を共有URLへ保存し、復元・省略・不正値の扱いを確認する', () => {
  const dom = {
    reverseStatus: createSelect([1, 1.25], 1),
    amountYen: { value: '1000' }, reverseMultiplier: { value: '1' },
    reverseEligibleAmount: { value: '909' }
  };
  const { SHARE } = loadShare({ dom });
  assert.equal(new URL(SHARE.buildReverseShareUrl()).searchParams.get('eligible'), '909');
  dom.reverseEligibleAmount.value = '';
  assert.equal(new URL(SHARE.buildReverseShareUrl()).searchParams.has('eligible'), false);
  dom.reverseEligibleAmount.value = '1001';
  assert.equal(SHARE.buildReverseShareUrl(), '');
  for (const [param, expected] of [['909', '909'], ['0', '0'], ['1000', '1000'], ['', ''], ['-1', ''], ['1001', ''], ['NaN', '']]) {
    dom.reverseEligibleAmount.value = '123';
    const settings = { open: false };
    dom.reverseEligibleAmount.closest = () => settings;
    const ctx = loadShare({ search: '?mode=reverse&amount=1000&status=1&multiplier=1&eligible=' + param, dom });
    ctx.SHARE.applyFromUrl();
    assert.equal(dom.reverseEligibleAmount.value, expected);
    assert.equal(settings.open, expected !== '');
  }
  dom.reverseEligibleAmount.value = '909';
  loadShare({ search: '?mode=reverse&amount=1000&status=1&multiplier=1', dom }).SHARE.applyFromUrl();
  assert.equal(dom.reverseEligibleAmount.value, '', '従来URLは対象額を持ち越さない');
});

test('クリーンURL遷移時はsessionStorageの一時プリセットから計算を復元して即時削除する', () => {
  const store = new Map();
  const sessionStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); }
  };
  const createDom = () => ({
    currentStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1),
    targetStatus: createSelect([1000, 4000], 1000, { 1000: 'Gold', 4000: 'Platinum' }),
    neededPoints: { value: '', max: '1000000' },
    multiplier: { value: '1' },
    baseRate: { value: '1' },
    reverseStatus: createSelect([1, 1.25, 1.5, 1.75, 2], 1),
    amountYen: { value: '' },
    reverseMultiplier: { value: '1' }
  });
  const createDoc = () => {
    const attrs = new Map();
    const wrapperClasses = new Set();
    const toggleAttrs = new Map();
    const toggle = { setAttribute(k, v) { toggleAttrs.set(k, String(v)); } };
    const wrapper = {
      classList: { add(name) { wrapperClasses.add(name); } },
      querySelector(sel) { return sel === '.calculator-advanced-settings__toggle' ? toggle : null; }
    };
    return {
      attrs,
      wrapperClasses,
      toggleAttrs,
      documentElement: { setAttribute(k, v) { attrs.set(k, String(v)); } },
      getElementById(id) { return id === 'calculator-advanced-settings' ? wrapper : null; }
    };
  };

  store.set('playpointPendingCalculatorPreset', JSON.stringify({
    pathname: '/',
    search: '?mode=main&status=1.75&target=platinum&points=1728&multiplier=3',
    recorded_at: Date.now()
  }));
  const domMain = createDom();
  const docMain = createDoc();
  const mainCtx = loadShare({
    search: '',
    href: 'https://playpoint-sim.com/',
    pathname: '/',
    dom: domMain,
    sessionStorage,
    document: docMain
  });
  mainCtx.SHARE.applyFromUrl();

  assert.equal(domMain.currentStatus.value, '1.75');
  assert.equal(domMain.targetStatus.selectedIndex, 1);
  assert.equal(domMain.neededPoints.value, '1728');
  assert.equal(domMain.multiplier.value, '3');
  assert.equal(store.has('playpointPendingCalculatorPreset'), false);
  assert.equal(docMain.attrs.get('data-playpoint-advanced-settings'), 'open');
  assert.equal(docMain.wrapperClasses.has('is-open'), true);
  assert.equal(docMain.toggleAttrs.get('aria-expanded'), 'true');
  assert.deepEqual(mainCtx.calls.slice(-2), [['switchMode', 'main'], 'calculate']);

  store.set('playpointPendingCalculatorPreset', JSON.stringify({
    pathname: '/',
    search: '?mode=main&status=1.5&target=gold&points=1000',
    recorded_at: Date.now() - 3 * 60 * 1000
  }));
  const domExpired = createDom();
  const expiredCtx = loadShare({ search: '', href: 'https://playpoint-sim.com/', pathname: '/', dom: domExpired, sessionStorage });
  expiredCtx.SHARE.applyFromUrl();
  assert.equal(store.has('playpointPendingCalculatorPreset'), false);
  assert.deepEqual(expiredCtx.calls, []);

  store.set('playpointPendingCalculatorPreset', JSON.stringify({
    pathname: '/en/',
    search: '?mode=main&status=1.5&target=gold&points=1000',
    recorded_at: Date.now()
  }));
  const mismatchCtx = loadShare({ search: '', href: 'https://playpoint-sim.com/', pathname: '/', dom: createDom(), sessionStorage });
  mismatchCtx.SHARE.applyFromUrl();
  assert.equal(store.has('playpointPendingCalculatorPreset'), false);
  assert.deepEqual(mismatchCtx.calls, []);

  store.set('playpointPendingCalculatorPreset', JSON.stringify({
    pathname: '/',
    search: '?mode=main&status=1.75&target=platinum&points=1728',
    recorded_at: Date.now()
  }));
  const diaryCtx = loadShare({ search: '?mode=diary', href: 'https://playpoint-sim.com/?mode=diary', pathname: '/', dom: createDom(), sessionStorage });
  diaryCtx.SHARE.applyFromUrl();
  assert.deepEqual(diaryCtx.calls, []);

  store.clear();
  store.set('playpointPendingCalculatorPreset', JSON.stringify({
    pathname: '/en/',
    search: '?mode=reverse&status=1.5&amount=5000&multiplier=2',
    recorded_at: Date.now()
  }));
  const domReverse = createDom();
  const reverseCtx = loadShare({ search: '', href: 'https://playpoint-sim.com/en/', pathname: '/en/', dom: domReverse, sessionStorage });
  reverseCtx.SHARE.applyFromUrl();
  assert.equal(domReverse.reverseStatus.value, '1.5');
  assert.equal(domReverse.amountYen.value, '5000');
  assert.equal(domReverse.reverseMultiplier.value, '2');
  assert.equal(store.has('playpointPendingCalculatorPreset'), false);
  assert.deepEqual(reverseCtx.calls, ['updateReverseBaseRate', ['switchMode', 'reverse'], 'reverseCalculate']);
});
