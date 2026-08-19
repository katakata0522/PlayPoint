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

function createRuntime(pathname, savedRegion = null) {
  const storage = new Map();
  if (savedRegion !== null) storage.set(STORAGE_KEY, savedRegion);

  const context = {
    console: { log() {}, warn() {}, error() {} },
    CONFIGS: { JP: {}, US: {}, KR: {}, TW: {} },
    STATE: { currentRegion: null },
    CONSTANTS: { STORAGE_REGION_KEY: STORAGE_KEY },
    location: { pathname, href: `https://playpoint-sim.com${pathname}` },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    }
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__region = { applyRegionFromPath, getRegionPath, isEnglishPath, isKoreanPath, isTaiwanPath };`, context, {
    filename: 'region-navigation.js'
  });

  return {
    api: context.__region,
    state: context.STATE,
    storedRegion: () => storage.get(STORAGE_KEY) ?? null
  };
}

test('ルートは保存済み地域が違っても日本表示を選び、保存設定そのものは上書きしない', () => {
  for (const staleRegion of ['US', 'KR', 'TW']) {
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
    { pathname: '/tw/', expected: 'TW', stale: 'US' }
  ];

  for (const { pathname, expected, stale } of cases) {
    const runtime = createRuntime(pathname, stale);
    runtime.api.applyRegionFromPath();

    assert.equal(runtime.state.currentRegion, expected, pathname);
    assert.equal(runtime.storedRegion(), expected, `${pathname}: URLの地域が保存設定へ反映されていません`);
  }
});

test('言語判定は完全な先頭segmentだけを対象にし、似たパスを誤判定しない', () => {
  const english = createRuntime('/en/articles/guide.html');
  assert.equal(english.api.isEnglishPath(), true);
  assert.equal(english.api.isKoreanPath(), false);
  assert.equal(english.api.isTaiwanPath(), false);

  for (const pathname of ['/english/', '/koala/', '/twin/', '/enough/']) {
    const runtime = createRuntime(pathname);
    assert.equal(runtime.api.isEnglishPath(), false, pathname);
    assert.equal(runtime.api.isKoreanPath(), false, pathname);
    assert.equal(runtime.api.isTaiwanPath(), false, pathname);
  }
});

test('地域切替先はJPだけルート、海外3地域は各言語ルートへ正規化する', () => {
  const runtime = createRuntime('/');
  assert.equal(runtime.api.getRegionPath('JP'), '/');
  assert.equal(runtime.api.getRegionPath('US'), '/en/');
  assert.equal(runtime.api.getRegionPath('KR'), '/ko/');
  assert.equal(runtime.api.getRegionPath('TW'), '/tw/');
  assert.equal(runtime.api.getRegionPath('UNKNOWN'), '/');
});
