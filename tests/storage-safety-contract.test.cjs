'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

async function loadGuard() {
  const source = fs.readFileSync(path.join(root, 'js/language-suggestion.js'), 'utf8')
    .replace(/\nexport \{[\s\S]*?\} from '\.\/first-view\.js';\s*$/, '\n');
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(dataUrl + `#${Date.now()}-${Math.random()}`);
}

function targetWith(entries = {}) {
  class FakeStorage {
    constructor(initialEntries = {}) {
      this.values = new Map(Object.entries(initialEntries).map(([key, value]) => [key, String(value)]));
    }
    getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
    setItem(key, value) { this.values.set(String(key), String(value)); }
    removeItem(key) { this.values.delete(String(key)); }
  }
  return {
    Storage: FakeStorage,
    localStorage: new FakeStorage(entries),
    sessionStorage: new FakeStorage(),
    console: { warn() {} }
  };
}

const validDiary = JSON.stringify({
  2026: { 9: { 1: { points: '10', prize: 'マウス' } } }
});

const validLastCalculation = JSON.stringify({
  version: 1,
  mainByRegion: {
    JP: {
      region: 'JP',
      currentStatus: 'ブロンズ',
      targetStatus: 'シルバー',
      neededPoints: '250'
    }
  }
});

test('valid diary and last-calculation schemas are accepted', async () => {
  const api = await loadGuard();
  assert.equal(api.validateDiaryStore(JSON.parse(validDiary)), true);
  assert.equal(api.validateDiaryStore({ 2026: [] }), false);
  assert.equal(api.validateDiaryStore({ 2026: { 13: {} } }), false);
  assert.equal(api.validateLastMainCalculationStore(JSON.parse(validLastCalculation)), true);
  assert.equal(api.validateLastMainCalculationStore({ version: 2, mainByRegion: {} }), false);
});

test('malformed diary JSON is preserved before the first valid replacement', async () => {
  const api = await loadGuard();
  const target = targetWith({ hokuhokuDiaryData: '{broken' });
  assert.equal(api.installOwnedStorageSafety(target, () => '2026-09-17T00:00:00.000Z'), true);

  target.localStorage.setItem('hokuhokuDiaryData', validDiary);

  assert.equal(target.localStorage.getItem('hokuhokuDiaryData'), validDiary);
  const recovery = JSON.parse(target.localStorage.getItem('hokuhokuDiaryDataRecoveryV1'));
  assert.deepEqual(recovery, {
    version: 1,
    sourceKey: 'hokuhokuDiaryData',
    reason: 'malformed-json',
    capturedAt: '2026-09-17T00:00:00.000Z',
    raw: '{broken'
  });
});

test('future last-calculation data is retained in a recovery envelope before downgrade', async () => {
  const api = await loadGuard();
  const futureRaw = JSON.stringify({ version: 2, mainByRegion: { JP: { extra: true } } });
  const target = targetWith({ playpointLastMainCalculationV1: futureRaw });
  api.installOwnedStorageSafety(target, () => '2026-09-17T00:00:00.000Z');

  target.localStorage.setItem('playpointLastMainCalculationV1', validLastCalculation);

  assert.equal(target.localStorage.getItem('playpointLastMainCalculationV1'), validLastCalculation);
  const recovery = JSON.parse(target.localStorage.getItem('playpointLastMainCalculationRecoveryV1'));
  assert.equal(recovery.raw, futureRaw);
  assert.equal(recovery.reason, 'future-version');
});

test('invalid replacement is blocked without modifying existing data', async () => {
  const api = await loadGuard();
  const target = targetWith({ hokuhokuDiaryData: validDiary });
  api.installOwnedStorageSafety(target);

  assert.throws(
    () => target.localStorage.setItem('hokuhokuDiaryData', JSON.stringify({ 2026: [] })),
    /refused to write invalid data/
  );
  assert.equal(target.localStorage.getItem('hokuhokuDiaryData'), validDiary);
  assert.equal(target.localStorage.getItem('hokuhokuDiaryDataRecoveryV1'), null);
});

test('a different pre-existing recovery copy blocks an unbacked overwrite', async () => {
  const api = await loadGuard();
  const target = targetWith({
    hokuhokuDiaryData: '{broken-new',
    hokuhokuDiaryDataRecoveryV1: JSON.stringify({
      version: 1,
      sourceKey: 'hokuhokuDiaryData',
      raw: '{broken-old'
    })
  });
  api.installOwnedStorageSafety(target);

  assert.throws(
    () => target.localStorage.setItem('hokuhokuDiaryData', validDiary),
    /different recovery copy already exists/
  );
  assert.equal(target.localStorage.getItem('hokuhokuDiaryData'), '{broken-new');
});

test('sessionStorage and unrelated localStorage keys are unchanged', async () => {
  const api = await loadGuard();
  const target = targetWith();
  api.installOwnedStorageSafety(target);

  target.sessionStorage.setItem('hokuhokuDiaryData', '{not-json');
  target.localStorage.setItem('unrelated', '{not-json');

  assert.equal(target.sessionStorage.getItem('hokuhokuDiaryData'), '{not-json');
  assert.equal(target.localStorage.getItem('unrelated'), '{not-json');
});

test('installation is idempotent', async () => {
  const api = await loadGuard();
  const target = targetWith({ hokuhokuDiaryData: '{broken' });
  assert.equal(api.installOwnedStorageSafety(target), true);
  assert.equal(api.installOwnedStorageSafety(target), true);
  target.localStorage.setItem('hokuhokuDiaryData', validDiary);
  assert.ok(target.localStorage.getItem('hokuhokuDiaryDataRecoveryV1'));
});

test('installation fails closed when localStorage cannot be accessed', async () => {
  const api = await loadGuard();
  class FakeStorage {
    getItem() { return null; }
    setItem() {}
  }
  const target = { Storage: FakeStorage };
  Object.defineProperty(target, 'localStorage', {
    get() { throw new Error('blocked'); }
  });
  assert.equal(api.installOwnedStorageSafety(target), false);
});

test('storage contract inventories owned persistent and temporary stores', () => {
  const contract = fs.readFileSync(path.join(root, 'docs/STORAGE_CONTRACT.md'), 'utf8');
  for (const key of [
    'hokuhokuDiaryData',
    'hokuhokuDiaryDataRecoveryV1',
    'playpointLastMainCalculationV1',
    'playpointLastMainCalculationRecoveryV1',
    'playpointPreferredRegion',
    'playpoint_reading_library_v1',
    'katakata_blog_settings',
    'playpointCalculatorEntryContext'
  ]) assert.match(contract, new RegExp(key));
});
