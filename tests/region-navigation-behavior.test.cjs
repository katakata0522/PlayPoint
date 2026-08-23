'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../js/region-navigation.js'), 'utf8')
  .replace(/^import[^\n]+\n/gm, '')
  .replace(/^export\s+/gm, '');

const STORAGE_KEY = 'playpointPreferredRegion';
const ORIGIN = 'https://playpoint-sim.com';

function createRuntime(pathname, savedRegion = null, currentRegion = null) {
  const storage = new Map();
  if (savedRegion !== null) storage.set(STORAGE_KEY, savedRegion);

  let currentHref = new URL(pathname, ORIGIN).href;
  const location = { pathname: new URL(currentHref).pathname };
  Object.defineProperty(location, 'href', {
    get() { return currentHref; },
    set(value) {
      currentHref = new URL(value, currentHref).href;
      location.pathname = new URL(currentHref).pathname;
    }
  });

  const context = {
    console: { log() {}, warn() {}, error() {} },
    CONFIGS: { JP: {}, US: {}, KR: {}, TW: {} },
    createExpansionConfigs() { return { HK: {}, IN: {} }; },
    STATE: { currentRegion },
    CONSTANTS: { STORAGE_REGION_KEY: STORAGE_KEY, CLASS_ACTIVE: 'active' },
    UI: { showToast() {} },
    location,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    document: {
      readyState: 'loading',
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {}
    }
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(
    `${source}\nglobalThis.__region = { applyRegionFromPath, isEnglishPath, isKoreanPath, isTaiwanPath, switchRegion };`,
    context,
    { filename: 'region-navigation.js' }
  );

  return {
    api: context.__region,
    location,
    state: context.STATE,
    storedRegion: () => storage.get(STORAGE_KEY) ?? null
  };
}

test('ルートは保存済み地域が違っても日本表示を選び、保存設定そのものは上書きしない', () => {
  for (const staleRegion of ['US', 'KR', 'TW', 'HK', 'IN']) {
    const runtime = createRuntime('/', staleRegion);
    runtime.api.applyRegionFromPath();

    assert.equal(runtime.state.currentRegion, 'JP', `saved=${staleRegion}`);
    assert.equal(runtime.storedRegion(), staleRegion, 'ルート表示だけでユーザーの保存済み地域を破壊しています');
  }
});

test('言語URLは古い保存設定より優先され、現在URLの地域を保存し直す', () => {
  const cases = [
    { pathname: '/en/', expected: 'US', stale: 'KR' },
    { pathname: '/ko/', expected: 'KR', stale: 'TW' },
    { pathname: '/tw/', expected: 'TW', stale: 'US' },
    { pathname: '/hk/', expected: 'HK', stale: 'TW' },
    { pathname: '/in/', expected: 'IN', stale: 'US' }
  ];

  for (const { pathname, expected, stale } of cases) {
    const runtime = createRuntime(pathname, stale);
    runtime.api.applyRegionFromPath();

    assert.equal(runtime.state.currentRegion, expected, pathname);
    assert.equal(runtime.storedRegion(), expected, `${pathname}: URLの地域が保存設定へ反映されていません`);
  }
});

test('言語判定は言語segmentだけに一致し、似た文字列のパスを誤判定しない', () => {
  const english = createRuntime('/en/articles/guide.html');
  assert.equal(english.api.isEnglishPath(), true);
  assert.equal(english.api.isKoreanPath(), false);
  assert.equal(english.api.isTaiwanPath(), false);

  const india = createRuntime('/in/');
  assert.equal(india.api.isEnglishPath(), true);
  assert.equal(india.api.isTaiwanPath(), false);

  const hongKong = createRuntime('/hk/');
  assert.equal(hongKong.api.isEnglishPath(), false);
  assert.equal(hongKong.api.isTaiwanPath(), true);

  for (const pathname of ['/english/', '/koala/', '/twin/', '/enough/', '/inside/', '/hksar-guide/']) {
    const runtime = createRuntime(pathname);
    assert.equal(runtime.api.isEnglishPath(), false, pathname);
    assert.equal(runtime.api.isKoreanPath(), false, pathname);
    assert.equal(runtime.api.isTaiwanPath(), false, pathname);
  }
});

test('地域切替は保存値を更新し、対応する言語URLへ実際に遷移する', () => {
  const cases = [
    { pathname: '/', current: 'JP', next: 'US', expectedPath: '/en/' },
    { pathname: '/en/', current: 'US', next: 'JP', expectedPath: '/' },
    { pathname: '/ko/', current: 'KR', next: 'TW', expectedPath: '/tw/' },
    { pathname: '/tw/', current: 'TW', next: 'KR', expectedPath: '/ko/' },
    { pathname: '/', current: 'JP', next: 'HK', expectedPath: '/hk/' },
    { pathname: '/hk/', current: 'HK', next: 'IN', expectedPath: '/in/' },
    { pathname: '/in/', current: 'IN', next: 'JP', expectedPath: '/' }
  ];

  for (const { pathname, current, next, expectedPath } of cases) {
    const runtime = createRuntime(pathname, current, current);
    runtime.api.switchRegion(next);

    assert.equal(runtime.state.currentRegion, next, `${pathname} -> ${next}`);
    assert.equal(runtime.storedRegion(), next, `${pathname}: 切替先が保存されていません`);
    assert.equal(runtime.location.pathname, expectedPath, `${pathname}: 切替先URLが不正です`);
  }
});
