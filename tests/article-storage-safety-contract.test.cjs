'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  KEY,
  RECOVERY_KEY,
  BLOG_KEY,
  BLOG_RECOVERY_KEY,
  makeStore,
  validateReadingStore,
  validateBlogSettings,
  installArticleStorageSafety
} = require('../js/reading-library.js');

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

const articleA = { path: '/articles/a.html', title: 'A' };
const validReading = JSON.stringify({ saved: [articleA], recent: [], historyEnabled: true });
const validBlog = JSON.stringify({ theme: 'dark', sortNewestFirst: true });

test('記事保存とブログ設定は現行schemaだけを正常値として受け入れる', () => {
  assert.equal(validateReadingStore(JSON.parse(validReading)), true);
  assert.equal(validateReadingStore({ saved: [articleA, articleA], recent: [], historyEnabled: true }), false);
  assert.equal(validateReadingStore({ saved: [{ ...articleA, path: '/games/fgo/pity-cost/index.html' }] }), false);
  assert.equal(validateReadingStore({ saved: [], recent: [], historyEnabled: 'yes' }), false);
  assert.equal(validateBlogSettings({ theme: 'light', sortNewestFirst: false }), true);
  assert.equal(validateBlogSettings({ theme: 'dark', sortNewestFirst: true, legacyPreference: 'keep' }), true);
  assert.equal(validateBlogSettings({ theme: 'blue' }), false);
  assert.equal(validateBlogSettings([]), false);
});

test('壊れた記事保存JSONは最初の正常置換前にrawのまま退避する', () => {
  const target = targetWith({ [KEY]: '{broken' });
  assert.equal(installArticleStorageSafety(target, () => '2026-09-17T00:00:00.000Z'), true);

  target.localStorage.setItem(KEY, validReading);

  assert.equal(target.localStorage.getItem(KEY), validReading);
  assert.deepEqual(JSON.parse(target.localStorage.getItem(RECOVERY_KEY)), {
    version: 1,
    sourceKey: KEY,
    reason: 'malformed-json',
    capturedAt: '2026-09-17T00:00:00.000Z',
    raw: '{broken'
  });
});

test('読み取れるが不正な記事保存schemaは表示時に正規化でき、書き換え前に元rawを退避する', () => {
  const invalidRaw = JSON.stringify({
    saved: [articleA, articleA],
    recent: [{ path: '/games/fgo/pity-cost/index.html', title: 'FGO' }],
    historyEnabled: true
  });
  const target = targetWith({ [KEY]: invalidRaw });
  installArticleStorageSafety(target, () => '2026-09-17T00:00:00.000Z');
  const store = makeStore(target.localStorage);

  assert.deepEqual(store.read().saved, [articleA]);
  assert.deepEqual(store.read().recent, [{ path: '/games/fgo/pity-cost/', title: 'FGO' }]);
  store.remove('saved', articleA.path);

  assert.equal(JSON.parse(target.localStorage.getItem(RECOVERY_KEY)).raw, invalidRaw);
  assert.deepEqual(store.read().saved, []);
});

test('壊れたブログ設定は既定値扱いで読ませつつ、最初の正常保存前に退避する', () => {
  const target = targetWith({ [BLOG_KEY]: '{broken' });
  installArticleStorageSafety(target, () => '2026-09-17T00:00:00.000Z');

  assert.equal(target.localStorage.getItem(BLOG_KEY), null);
  target.localStorage.setItem(BLOG_KEY, validBlog);

  assert.equal(target.localStorage.getItem(BLOG_KEY), validBlog);
  const recovery = JSON.parse(target.localStorage.getItem(BLOG_RECOVERY_KEY));
  assert.equal(recovery.raw, '{broken');
  assert.equal(recovery.reason, 'malformed-json');
});

test('将来versionは現行runtimeから隠し、downgrade前に退避する', () => {
  for (const [key, recoveryKey, futureValue, replacement] of [
    [KEY, RECOVERY_KEY, { version: 2, saved: [articleA] }, JSON.parse(validReading)],
    [BLOG_KEY, BLOG_RECOVERY_KEY, { version: 2, theme: 'light' }, JSON.parse(validBlog)]
  ]) {
    const futureRaw = JSON.stringify(futureValue);
    const target = targetWith({ [key]: futureRaw });
    installArticleStorageSafety(target);
    assert.equal(target.localStorage.getItem(key), null);
    target.localStorage.setItem(key, JSON.stringify(replacement));
    const recovery = JSON.parse(target.localStorage.getItem(recoveryKey));
    assert.equal(recovery.raw, futureRaw);
    assert.equal(recovery.reason, 'future-version');
  }
});

test('不正な置換と異なる既存recoveryは元データを変更せず拒否する', () => {
  const target = targetWith({
    [BLOG_KEY]: validBlog,
    [RECOVERY_KEY]: JSON.stringify({ version: 1, sourceKey: KEY, raw: '{older' }),
    [KEY]: '{newer'
  });
  installArticleStorageSafety(target);

  assert.throws(() => target.localStorage.setItem(BLOG_KEY, JSON.stringify({ theme: 'blue' })), /refused to write invalid data/);
  assert.equal(target.localStorage.getItem(BLOG_KEY), validBlog);
  assert.throws(() => target.localStorage.setItem(KEY, validReading), /different recovery copy already exists/);
  assert.equal(target.localStorage.getItem(KEY), '{newer');
});

test('guardは反復導入可能で、sessionStorageと無関係なlocalStorageを変更しない', () => {
  const target = targetWith();
  assert.equal(installArticleStorageSafety(target), true);
  assert.equal(installArticleStorageSafety(target), true);

  target.sessionStorage.setItem(KEY, '{not-json');
  target.localStorage.setItem('unrelated', '{not-json');

  assert.equal(target.sessionStorage.getItem(KEY), '{not-json');
  assert.equal(target.localStorage.getItem('unrelated'), '{not-json');
});

test('explicit recovery backs up corrupt data, preserves other keys, and rejects conflicting or future backups', () => {
  const {recoverStore} = require('../js/reading-library.js');
  const target = targetWith({[KEY]:'{broken', diary:'untouched'});
  installArticleStorageSafety(target);
  assert.equal(recoverStore(target.localStorage,()=> '2026-09-19T00:00:00Z'),true);
  assert.equal(JSON.parse(target.localStorage.getItem(RECOVERY_KEY)).raw,'{broken');
  assert.deepEqual(makeStore(target.localStorage).read(),{saved:[],recent:[],historyEnabled:true});
  assert.equal(target.localStorage.getItem('diary'),'untouched');
  assert.equal(recoverStore(target.localStorage),false);
  const conflict = targetWith({[KEY]:'{new', [RECOVERY_KEY]:JSON.stringify({sourceKey:KEY,raw:'{old'})});
  installArticleStorageSafety(conflict);
  assert.throws(()=>recoverStore(conflict.localStorage),e=>e.code==='recovery_conflict');
  assert.equal(conflict.localStorage.getItem(KEY),'{new');
  const raw = JSON.stringify({version:2,saved:[articleA]});
  const future = targetWith({[KEY]:raw}); installArticleStorageSafety(future);
  assert.throws(()=>makeStore(future.localStorage).visit(articleA),e=>e.code==='future_version');
  assert.throws(()=>recoverStore(future.localStorage),e=>e.code==='future_version');
  assert.equal(future.localStorage.values.get(KEY),raw);
  assert.equal(future.localStorage.getItem(RECOVERY_KEY),null);
});

test('failed backup writes leave the original unreadable value unchanged', () => {
  const {recoverStore} = require('../js/reading-library.js');
  let raw = '{broken';
  const storage = {getItem:key=>key===KEY?raw:null,setItem(){throw Error('quota');}};
  assert.throws(()=>recoverStore(storage),/quota/);
  assert.equal(raw,'{broken');
});
