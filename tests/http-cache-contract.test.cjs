'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cacheCases, assertCacheResponse, verifyHttpCache } = require('../.github/scripts/http-cache-contract.cjs');

const immutable = 'public, max-age=31536000, immutable';
const short = 'public, max-age=300, must-revalidate';
const noStore = 'no-store, no-cache, must-revalidate, max-age=0';
const response = (value, status = 200, body = '') => ({ status, headers: new Headers({ 'Cache-Control': value }), body });
const spec = (policy, status = 200) => ({ path: '/fixture', policy, status });
const revision = 'a'.repeat(40);
const expectedHeaders = {
  immutable, script: short, worker: short, articles: short, style: 'max-age=604800', html: 'max-age=300',
  revision: noStore, manifest: 'public, max-age=86400', feed: 'public, max-age=1800', other: '', error: '', redirect: ''
};
function fakeRequest({ fixture = true, mutate } = {}) {
  const cases = cacheCases({ fixture });
  return async url => {
    const lookup = new URL(url); lookup.searchParams.delete('cache_check');
    const item = cases.find(entry => entry.path === lookup.pathname + lookup.search);
    assert.ok(item, 'unexpected fixture URL: ' + lookup);
    const body = fixture ? `fixture:${lookup.pathname.endsWith('/') ? lookup.pathname + 'index.html' : lookup.pathname}\n` :
      lookup.pathname === '/status/deploy-revision.txt' ? revision + '\n' : 'public content';
    const result = response(expectedHeaders[item.policy], item.status, body);
    if (mutate) mutate(result, item, lookup);
    return result;
  };
}

test('HTTPキャッシュは指示順・大文字小文字・空白・quoted max-ageが変わっても同じ結果を受理する', () => {
  for (const value of [immutable, 'IMMUTABLE, MAX-AGE = "31536000", PUBLIC', ' max-age=31536000 , public, immutable ']) {
    assertCacheResponse(spec('immutable'), response(value));
  }
  assertCacheResponse(spec('html'), response('max-age=60'));
  assertCacheResponse(spec('worker'), response('public,must-revalidate,max-age=0'));
});

test('版付きCSS/JSの長期保存が短期設定に上書きされた実回帰を拒否する', () => {
  assert.throws(() => assertCacheResponse(spec('immutable'), response(short)), /missing immutable/);
  assert.throws(() => assertCacheResponse(spec('immutable'), response('public, immutable')), /max-age/);
});

test('HTML・SW・JSON・公開revisionを版クエリでimmutable化する応答を拒否する', () => {
  for (const policy of ['html', 'worker', 'articles', 'other', 'revision', 'manifest', 'feed']) {
    assert.throws(() => assertCacheResponse(spec(policy), response(immutable)), /unexpected immutable/);
  }
});

test('複数のCache-Controlヘッダーが矛盾しても先勝ち・後勝ちで成功扱いにしない', () => {
  const result = response(noStore); result.headers.append('cache-control', immutable);
  assert.throws(() => assertCacheResponse(spec('revision'), result), /duplicate max-age/);
  assert.throws(() => assertCacheResponse(spec('immutable'), response(immutable + ', max-age=31536000')), /duplicate/);
  assert.throws(() => assertCacheResponse(spec('immutable'), response(immutable + ', private')), /conflict/);
});

test('保存禁止・負の期間・数値でない期間・値付きimmutableを誤って有効と解釈しない', () => {
  for (const value of [immutable + ', no-store', immutable + ', no-cache', 'public, max-age=31536000, immutable=1']) {
    assert.throws(() => assertCacheResponse(spec('immutable'), response(value)));
  }
  for (const value of ['max-age=-1', 'max-age=Infinity', 'max-age=301', 'max-age=1e2', '']) {
    assert.throws(() => assertCacheResponse(spec('html'), response(value)), /max-age/);
  }
});

test('200の代わりのredirect/404を拒否し、実際のredirect/404にはimmutableを許可しない', () => {
  for (const status of [301, 404, 500]) assert.throws(() => assertCacheResponse(spec('immutable'), response(immutable, status)), /HTTP status/);
  assertCacheResponse(spec('error', 404), response('', 404));
  assertCacheResponse(spec('redirect', 301), response('max-age=300', 301));
  assert.throws(() => assertCacheResponse(spec('error', 404), response(immutable, 404)), /immutable/);
});

test('比較対象はJS/MJS/CSSの有効版と空・別名・不正版を区別し、SWとHTMLを長期保存しない', () => {
  const cases = cacheCases({ fixture: true });
  const find = pathname => cases.find(item => item.path === pathname);
  assert.equal(find('/nested/app.mjs?v=abc123').policy, 'immutable');
  assert.equal(find('/style.css?x=1&v=abc_12-Z&y=2').policy, 'immutable');
  for (const query of ['?preview=abc123', '?v=', '?v=abc%2Fdef']) assert.equal(find('/js/main.js' + query).policy, 'script');
  assert.equal(find('/sw.js?v=abc123').policy, 'worker');
  assert.equal(find('/blog/articles.json?v=abc123').policy, 'articles');
  assert.equal(find('/?v=abc123').policy, 'html');
});

test('fixture runnerは全応答を取得して本文・HTTP status・cache契約を検証する', async () => {
  const report = await verifyHttpCache({ baseUrl: 'https://localhost', fixture: true, request: fakeRequest(), attempts: 1 });
  assert.equal(report.passed, true);
  assert.equal(report.observations.length, cacheCases({ fixture: true }).length);
  assert.ok(report.observations.every(item => item.passed));
});

test('fixtureが別ファイルを200で返した場合も検査成功としない', async () => {
  await assert.rejects(verifyHttpCache({ baseUrl: 'https://localhost', fixture: true, attempts: 1,
    request: fakeRequest({ mutate(result, item) { if (item.path === '/js/main.js') result.body = 'wrong file'; } }) }), /fixture body mismatch/);
});

test('本番検査は期待revisionなし・HTTP接続を開始前に拒否し、異なるrevisionも拒否する', async () => {
  let calls = 0;
  const request = async () => { calls++; return response(noStore, 200, 'b'.repeat(40)); };
  await assert.rejects(verifyHttpCache({ baseUrl: 'https://example.test', request }), /exact revision/);
  await assert.rejects(verifyHttpCache({ baseUrl: 'http://example.test', request, expectedRevision: revision }), /HTTPS/);
  assert.equal(calls, 0);
  await assert.rejects(verifyHttpCache({ baseUrl: 'https://example.test', request, expectedRevision: revision }), /revision changed/);
  assert.equal(calls, 1);
});

test('本番検査は前後の同じrevisionを確認し、途中の切替を失敗reportへ残す', async t => {
  const valid = await verifyHttpCache({ baseUrl: 'https://example.test', expectedRevision: revision, request: fakeRequest({ fixture: false }) });
  assert.equal(valid.beforeRevision, revision); assert.equal(valid.afterRevision, revision); assert.equal(valid.passed, true);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-report-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const outputFile = path.join(directory, 'failure.json');
  let revisionReads = 0;
  const request = fakeRequest({ fixture: false, mutate(result, item, url) {
    if (url.pathname === '/status/deploy-revision.txt' && !url.searchParams.has('v') && !url.searchParams.has('preview')) {
      revisionReads++;
      if (revisionReads > 2) result.body = 'b'.repeat(40);
    }
  } });
  await assert.rejects(verifyHttpCache({ baseUrl: 'https://example.test', expectedRevision: revision, request, outputFile }), /revision changed/);
  const report = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  assert.equal(report.passed, false); assert.equal(report.beforeRevision, revision); assert.match(report.error, /revision/);
});

test('通信失敗は上限回数で停止し、欠損応答を成功やskipに置き換えない', async () => {
  let calls = 0;
  await assert.rejects(verifyHttpCache({ baseUrl: 'https://example.test', expectedRevision: revision, attempts: 2,
    request: async () => { calls++; throw new Error('fixture network error'); } }), /fixture network error/);
  assert.equal(calls, 2);
});
