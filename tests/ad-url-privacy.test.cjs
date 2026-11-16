'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/ad-url-privacy.js'), 'utf8');

function runtime({ href = 'https://playpoint-sim.com/', referrer = '', sdk, noUrl = false, noHistory = false } = {}) {
  const listeners = new Map(), calls = [];
  const location = new URL(href);
  const listen = (name, fn) => { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); };
  const context = { URL: noUrl ? undefined : URL, location, addEventListener: listen,
    document: { referrer, addEventListener: listen } };
  context.window = context;
  if (sdk !== undefined) context.adsbygoogle = sdk;
  if (!noHistory) context.history = Object.fromEntries(['pushState', 'replaceState'].map(name => [name, function (state, title, url) {
    calls.push({ name, state, title, url, pauseBeforeNative: context.adsbygoogle?.pauseAdRequests });
    if (url != null) location.href = new URL(url, location.href).href;
    return undefined;
  }]));
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, calls, api: context.PlayPointAdPrivacy,
    fire(name) { for (const fn of listeners.get(name) || []) fn(); } };
}

test('クエリなしの通常URLは広告を止めず、既存のCMP停止値も上書きしない', () => {
  const clean = runtime();
  assert.equal(clean.api.protect(), true);
  assert.equal(clean.api.getState().paused, false);
  assert.equal(clean.context.adsbygoogle, undefined);
  const sdk = []; sdk.pauseAdRequests = 1;
  const existing = runtime({ sdk });
  assert.equal(existing.api.protect(), true);
  assert.equal(existing.context.adsbygoogle, sdk);
  assert.equal(sdk.pauseAdRequests, 1);
});

test('共有・検索・未知キー・符号化・重複・空値・断片はURLを変えず広告だけ保留する', () => {
  for (const part of ['?mode=main&points=137', '?mode=reverse&amount=23456&eligible=22000',
    '?%70oints=137&points=999', '?pp_q=fictional', '?q=', '?unexpected=private', '#amount=23456', '#private-note']) {
    const href = 'https://playpoint-sim.com/en/' + part;
    const r = runtime({ href });
    assert.equal(r.api.protect(), true, part);
    assert.equal(r.context.location.href, href, part);
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1, part);
    assert.equal(r.api.getState().paused, true, part);
  }
});

test('現在URLがcleanでも入力を含む参照元・不正URL・userinfoを保留する', () => {
  for (const referrer of ['https://playpoint-sim.com/?points=137', 'https://example.test/?q=fictional',
    'https://playpoint-sim.com/#private-note', 'invalid url', 'https://fixture:fixture@example.test/']) {
    const r = runtime({ referrer });
    assert.equal(r.api.protect(), true);
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1, referrer);
    assert.equal(r.context.document.referrer, referrer);
  }
});

test('履歴の更新前に保留し、引数・戻り値・共有条件を維持する', () => {
  for (const name of ['pushState', 'replaceState']) {
    const r = runtime(), state = { page: 2 };
    assert.equal(r.context.history[name](state, 'title', '?pp_q=fictional'), undefined);
    assert.equal(r.calls[0].pauseBeforeNative, 1);
    assert.equal(r.calls[0].state, state);
    assert.equal(r.calls[0].title, 'title');
    assert.equal(r.calls[0].url, '?pp_q=fictional');
    assert.equal(r.context.location.search, '?pp_q=fictional');
    r.context.history.replaceState(state, '', '/');
    assert.equal(r.context.location.search, '');
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1, '古いURLのコピーを持つSDKを同document中に再開しない');
    assert.equal(runtime().api.getState().paused, false, '次のclean documentへ保留を保存しない');
  }
});

test('URLオブジェクトを二重に文字列化せずnative historyへ渡す', () => {
  const r = runtime(); let conversions = 0;
  const url = { toString() { conversions++; return '?points=137'; } };
  r.context.history.pushState(null, '', url);
  assert.equal(conversions, 1);
  assert.equal(r.calls[0].url, url);
  assert.equal(r.calls[0].pauseBeforeNative, 1);
});

test('戻る・BFCache・hash・遅延同意後も保護を再適用する', () => {
  for (const name of ['popstate', 'pageshow', 'hashchange', 'playpoint:consent-ready', 'playpoint:consent-updated']) {
    const r = runtime();
    r.context.location.href = 'https://playpoint-sim.com/?amount=23456';
    r.fire(name);
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1, name);
    r.context.adsbygoogle.pauseAdRequests = 0;
    r.fire(name);
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1, name);
  }
});

test('パーサー・履歴監視が使えなければ広告を保留しCMP用取得は許可できる', () => {
  for (const options of [{ noUrl: true }, { noHistory: true }]) {
    const r = runtime(options);
    assert.equal(r.api.protect(), true);
    assert.equal(r.context.adsbygoogle.pauseAdRequests, 1);
  }
});

test('SDKが停止値を受け付けなければ履歴更新を止め、生URLを露出させない', () => {
  const r = runtime({ sdk: Object.freeze([]) });
  assert.throws(() => r.context.history.pushState(null, '', '?points=137'), /広告URL/);
  assert.equal(r.calls.length, 0);
  assert.equal(r.context.location.href, 'https://playpoint-sim.com/');
  assert.equal(r.api.protect(), false);
});

test('実SDKのsetter専用APIをgetterの値で誤判定しない', () => {
  const seen = [], sdk = { set pauseAdRequests(value) { seen.push(value); } };
  const r = runtime({ sdk, href: 'https://playpoint-sim.com/?points=137' });
  assert.equal(r.api.protect(), true);
  assert.ok(seen.every(value => value === 1));
  assert.equal(sdk.pauseAdRequests, undefined);
});

test('実ゲーム一覧の初期履歴は広告を止めず、検索・クリア後は入力を保護する', () => {
  const r = runtime({ href: 'https://playpoint-sim.com/games/' });
  const actions = {};
  const input = { value: '', addEventListener(name, fn) { actions[name] = fn; }, focus() {} };
  const clear = { addEventListener(name, fn) { actions.clear = fn; } };
  const count = {};
  r.context.URLSearchParams = URLSearchParams;
  r.context.matchMedia = () => ({ matches: false, addEventListener() {} });
  Object.assign(r.context.document, {
    documentElement: { lang: 'ja' },
    querySelectorAll: () => [],
    getElementById: () => null,
    querySelector: () => ({ querySelector: selector => selector === 'input' ? input : selector === '[aria-live]' ? count : clear })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/site-reader-tools.js'), 'utf8'), r.context);
  assert.equal(r.context.location.href, 'https://playpoint-sim.com/games/');
  assert.equal(r.api.getState().paused, false);
  input.value = 'qa_ad_url_810'; actions.input();
  assert.equal(r.context.location.search, '?pp_q=qa_ad_url_810');
  assert.equal(r.context.adsbygoogle.pauseAdRequests, 1);
  actions.clear();
  assert.equal(r.context.location.search, '');
  assert.equal(r.api.getState().paused, true);
});
