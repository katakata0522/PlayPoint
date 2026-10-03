'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { createRuntime, basicResponse, request, ORIGIN } = require('./helpers/service-worker-runtime.cjs');

test('precache成功時だけ最新版をreload取得してskipWaitingする', async () => {
  const success = createRuntime();
  await success.fireInstall();

  assert.equal(success.addAllCalls.length, 1);
  assert.ok(success.addAllCalls[0].length > 0);
  assert.ok(success.addAllCalls[0].every(item => typeof item.url === 'string' && item.cache === 'reload'));
  assert.equal(success.skipWaitingCalls, 1);
  assert.equal(success.openedCaches.length, 1, 'install should open exactly one active cache');
  assert.ok(success.openedCaches[0], 'active cache name should be observable through caches.open');

  const failure = createRuntime({ installFailure: true });
  await assert.rejects(failure.fireInstall(), /precache failed/);
  assert.equal(failure.skipWaitingCalls, 0, 'precache失敗を握りつぶして有効化しています');
});

test('activateはPlayPointの古い世代だけを削除し現行cacheと他アプリcacheを残す', async () => {
  const probe = createRuntime();
  await probe.fireInstall();
  const currentCacheName = probe.openedCaches[0];

  const runtime = createRuntime({
    cacheNames: [
      'playpoint-calc-vold',
      currentCacheName,
      'other-app-cache'
    ]
  });

  await runtime.fireActivate();

  assert.deepEqual(runtime.deletedCaches, ['playpoint-calc-vold']);
  assert.equal(runtime.claimCalls, 1);
});

test('GETかつ同一originの許可destinationだけをfetch処理する', async () => {
  const runtime = createRuntime();

  for (const unsafe of [
    request(`${ORIGIN}/api`, { method: 'POST', destination: 'document' }),
    request('https://example.com/app.js', { destination: 'script' }),
    request(`${ORIGIN}/sw.js`, { destination: 'script' }),
    request(`${ORIGIN}/nested/service-worker.js`, { destination: 'script' }),
    request(`${ORIGIN}/api`, { method: 'HEAD' }),
    ...['', 'audio', 'video', 'worker', 'object'].map(destination => request(`${ORIGIN}/api`, { destination }))
  ]) {
    const result = await runtime.fireFetch(unsafe);
    assert.equal(result.responded, false, unsafe.url);
  }

  assert.equal(runtime.fetchCalls.length, 0);
  for (const destination of ['document', 'style', 'script', 'image', 'font', 'manifest']) {
    assert.equal((await runtime.fireFetch(request(`${ORIGIN}/allowed-${destination}`, { destination }))).responded, true, destination);
  }
  await runtime.settleBackground();
});

test('画面遷移はcacheがあってもnetwork-firstで更新し追跡queryをcache keyから外す', async () => {
  const pageKey = `${ORIGIN}/articles/guide.html`;
  const cached = basicResponse('cached');
  const network = basicResponse('fresh');
  const runtime = createRuntime({
    cacheEntries: new Map([[pageKey, cached]]),
    networkHandler: async () => network
  });

  const result = await runtime.fireFetch(
    request(`${pageKey}?utm_source=x&v=ignored#section`, { destination: 'document', mode: 'navigate' })
  );

  assert.equal(result.responded, true);
  assert.equal(result.response, network);
  assert.equal(runtime.fetchCalls.length, 1, 'cacheがある時もnetwork取得を先に試す必要があります');
  assert.equal(runtime.putCalls.length, 1);
  assert.equal(runtime.putCalls[0].key, pageKey);
});

test('画面遷移のnetwork失敗時は同一ページcache、なければトップへfallbackする', async () => {
  const cachedKey = `${ORIGIN}/cached/`;
  const fallbackKey = `${ORIGIN}/`;
  const cached = basicResponse('cached-page');
  const fallback = basicResponse('fallback');
  const runtime = createRuntime({
    cacheEntries: new Map([[cachedKey, cached], [fallbackKey, fallback]]),
    networkHandler: async () => { throw new Error('offline'); }
  });

  const cachedResult = await runtime.fireFetch(request(`${cachedKey}?utm_source=x`));
  assert.equal(cachedResult.response, cached);

  const fallbackResult = await runtime.fireFetch(request(`${ORIGIN}/missing/?utm_source=x`));
  assert.equal(fallbackResult.response, fallback);
  assert.ok(runtime.matchCalls.includes(fallbackKey));
});

test('静的assetのcache keyは版番号vだけを残し追跡queryを捨てる', async () => {
  const runtime = createRuntime();
  const result = await runtime.fireFetch(
    request(`${ORIGIN}/js/main.js?v=abc123&utm_source=x&ref=share`, { destination: 'script', mode: 'cors' })
  );

  assert.equal(result.responded, true);
  assert.ok(runtime.matchCalls.includes(`${ORIGIN}/js/main.js?v=abc123`));
  assert.equal(runtime.putCalls[0].key, `${ORIGIN}/js/main.js?v=abc123`);
});

// SW07: Cache APIが使えなくても、取得できた応答を古いページ／空応答へ差し替えない。
test('閲覧時のcache open・match・put失敗は正常なnetwork応答を失わせない', async () => {
  for (const destination of ['document', 'script']) {
    for (const failure of ['open', 'match', 'put']) {
      const fresh = basicResponse(`fresh-${destination}-${failure}`);
      const runtime = createRuntime({
        openFailure: failure === 'open', matchFailure: failure === 'match',
        putHandler: async () => { if (failure === 'put') throw new Error('quota unavailable'); },
        networkHandler: async () => fresh
      });
      const result = await runtime.fireFetch(request(`${ORIGIN}/resource`, { destination }));
      assert.equal(result.response, fresh, `${destination}/${failure}: 正常なnetwork応答を保持`);
      await runtime.settleBackground();
    }
  }
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('サーバー障害は同じ地域の保存画面へ戻り、保存がなければ元のエラーを保つ', async () => {
  for (const status of [500, 502, 503, 504]) {
    for (const region of ['', 'en/', 'ko/', 'tw/', 'hk/', 'in/']) {
      const key = `${ORIGIN}/${region}`;
      const cached = basicResponse('same-region');
      const root = basicResponse('root-fallback');
      const failure = { ...basicResponse('server-error'), ok: false, status };
      const runtime = createRuntime({
        cacheEntries: new Map([[`${ORIGIN}/`, root], [key, cached]]),
        networkHandler: async () => failure
      });
      assert.equal((await runtime.fireFetch(request(key))).response, cached);
      await runtime.settleBackground();
      assert.equal(runtime.putCalls.length, 0);
    }
    const failure = { ...basicResponse('server-error'), ok: false, status };
    const empty = createRuntime({ networkHandler: async () => failure });
    assert.equal((await empty.fireFetch(request(`${ORIGIN}/`))).response, failure);
    await empty.settleBackground();
  }
});

test('記事・画像の保存件数を制限し、必須起動資産と地域別入口は残す', async () => {
  const runtime = createRuntime();
  await runtime.fireInstall();
  const coreUrls = runtime.addAllCalls[0].map(item => new URL(item.url, `${ORIGIN}/`).href);
  for (const url of coreUrls) runtime.cacheEntries.set(url, basicResponse('core'));
  for (let index = 0; index < 135; index++) {
    const url = `${ORIGIN}/articles/ogp/extra-${index}.jpg`;
    await runtime.fireFetch(request(url, { destination: 'image' }));
    await runtime.settleBackground();
  }
  assert.ok(coreUrls.every(url => runtime.cacheEntries.has(url)), '必須資産を削除しない');
  const extra = [...runtime.cacheEntries.keys()].filter(url => !coreUrls.includes(url));
  assert.equal(extra.length, 100);
  assert.equal(runtime.cacheEntries.has(`${ORIGIN}/articles/ogp/extra-0.jpg`), false);
  assert.equal(runtime.cacheEntries.has(`${ORIGIN}/articles/ogp/extra-134.jpg`), true);
});

test('旧版で増えた保存内容は有効化時と容量不足時にも必須資産を残して整理する', async () => {
  for (const stage of ['activate', 'quota']) {
    const runtime = createRuntime({ putHandler: async () => { throw new Error('quota'); } });
    await runtime.fireInstall();
    const core = runtime.addAllCalls[0].map(item => new URL(item.url, `${ORIGIN}/`).href);
    for (const url of core) runtime.cacheEntries.set(url, basicResponse('core'));
    for (let index = 0; index < 135; index++) runtime.cacheEntries.set(`${ORIGIN}/old-${index}.jpg`, basicResponse('old'));
    if (stage === 'activate') await runtime.fireActivate();
    else {
      const fresh = await runtime.fireFetch(request(`${ORIGIN}/new.jpg`, { destination: 'image' }));
      assert.equal(fresh.response.label, 'network', '容量不足でも正常応答を返す');
      await runtime.settleBackground();
    }
    assert.ok(core.every(url => runtime.cacheEntries.has(url)));
    assert.equal(runtime.cacheEntries.size, core.length + 100);
  }
});

test('静的cache hitは即応答し、再取得と保存の完了までfetch eventを延長する', async () => {
  const key = `${ORIGIN}/js/main.js?v=current`;
  const cached = basicResponse('cached');
  const fresh = basicResponse('fresh');
  const network = deferred();
  const stored = deferred();
  const runtime = createRuntime({
    cacheEntries: new Map([[key, cached]]),
    networkHandler: () => network.promise,
    putHandler: () => stored.promise
  });
  const response = runtime.fireFetch(request(key, { destination: 'script' }));
  try {
    const pending = Symbol('networkを待っている');
    const result = await Promise.race([response, new Promise(resolve => setImmediate(() => resolve(pending)))]);
    assert.notEqual(result, pending, 'cache hitがnetwork完了を待っている');
    assert.equal(result.response, cached, 'network完了を待たず既存資産を返す');
    assert.ok(runtime.background.length > 0, '再取得をevent.waitUntilへ渡していない');
    let finished = false;
    const background = runtime.settleBackground().then(() => { finished = true; });
    network.resolve(fresh);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(finished, false, '保存が終わる前にイベント延長が完了している');
    stored.resolve();
    await background;
    assert.equal(runtime.cacheEntries.get(key).label, 'fresh:clone');
  } finally {
    network.resolve(fresh); stored.resolve();
    await Promise.allSettled([response, ...runtime.background]);
  }
});

test('静的資産の再取得失敗は既存cacheを保ち、cache missでは明示的にrejectする', async () => {
  const key = `${ORIGIN}/style.css?v=current`;
  const cached = basicResponse('cached');
  const offline = async () => { throw new Error('offline'); };
  const hit = createRuntime({ cacheEntries: new Map([[key, cached]]), networkHandler: offline });
  assert.equal((await hit.fireFetch(request(key, { destination: 'style' }))).response, cached);
  await hit.settleBackground();
  assert.equal(hit.putCalls.length, 0);
  for (const destination of ['style', 'document']) {
    const miss = createRuntime({ networkHandler: offline });
    await assert.rejects(miss.fireFetch(request(`${ORIGIN}/missing`, { destination })), /offline/);
    await miss.settleBackground();
  }
});

test('HTTPエラー・非basic応答は返してもcacheへ保存せず正常cacheを上書きしない', async () => {
  for (const destination of ['document', 'script']) {
    for (const response of [
      { ...basicResponse('not-found'), ok: false, status: 404 },
      { ...basicResponse('server-error'), ok: false, status: 503 },
      { ...basicResponse('opaque'), type: 'opaque' },
      { ...basicResponse('cors'), type: 'cors' }
    ]) {
      const key = `${ORIGIN}/resource`;
      const previous = basicResponse('previous');
      const entries = destination === 'document' ? new Map([[key, previous]]) : new Map();
      const runtime = createRuntime({ cacheEntries: entries, networkHandler: async () => response });
      const expected = destination === 'document' && response.status >= 500 ? previous : response;
      assert.equal((await runtime.fireFetch(request(key, { destination }))).response, expected);
      if (destination === 'document') assert.equal(entries.get(key), previous);
      await runtime.settleBackground();
      assert.equal(runtime.putCalls.length, 0, `${destination}/${response.label}`);
    }
  }
});

test('初回installのcache open失敗を握りつぶさずskipWaitingもclaimもしない', async () => {
  const runtime = createRuntime({ openFailure: true });
  await assert.rejects(runtime.fireInstall(), /cache open unavailable/);
  assert.equal(runtime.skipWaitingCalls, 0);
  assert.equal(runtime.claimCalls, 0);
});

test('異なる資産版は追跡queryが違っても混線せず、network失敗で別版を返さない', async () => {
  const oldKey = `${ORIGIN}/js/main.js?v=old`;
  const old = basicResponse('old');
  const runtime = createRuntime({
    cacheEntries: new Map([[oldKey, old]]),
    networkHandler: async () => { throw new Error('offline'); }
  });
  assert.equal((await runtime.fireFetch(request(`${oldKey}&utm_source=a`, { destination: 'script' }))).response, old);
  await assert.rejects(runtime.fireFetch(request(`${ORIGIN}/js/main.js?v=new&utm_source=a`, { destination: 'script' })), /offline/);
  await runtime.settleBackground();
});

test('応答しない通信や本文は待機上限で同一ページcacheへ戻る', async () => {
  const cached = basicResponse('cached-page');
  for (const bodyStall of [false, true]) {
    const runtime = createRuntime({
      cacheEntries: new Map([[ORIGIN + '/', cached]]),
      networkHandler: bodyStall ? async () => ({
        ...basicResponse('headers-only'),
        clone() { return { arrayBuffer: () => new Promise(() => {}) }; }
      }) : () => new Promise(() => {}),
      timers: { setTimeout: callback => setImmediate(callback), clearTimeout: clearImmediate }
    });
    assert.equal((await runtime.fireFetch(request(ORIGIN + '/'))).response, cached);
    await runtime.settleBackground();
  }
});

test('未保存の静的資産の通信停滞は上限で失敗し、HTMLを返さない', async () => {
  const runtime = createRuntime({
    networkHandler: () => new Promise(() => {}),
    timers: { setTimeout: callback => setImmediate(callback), clearTimeout: clearImmediate }
  });
  await assert.rejects(runtime.fireFetch(request(ORIGIN + '/js/missing.js', { destination: 'script' })), /上限/);
  await runtime.settleBackground();
});

test('取得できた画面・未保存資産はcache保存の完了を待たず返る', async () => {
  for (const destination of ['document', 'script']) {
    const stored = deferred();
    const fresh = basicResponse('fresh');
    const runtime = createRuntime({ putHandler: () => stored.promise, networkHandler: async () => fresh });
    const response = runtime.fireFetch(request(ORIGIN + '/resource', { destination }));
    try {
      const pending = Symbol('保存待ち');
      const result = await Promise.race([response, new Promise(resolve => setImmediate(() => resolve(pending)))]);
      assert.notEqual(result, pending);
      assert.equal(result.response, fresh);
    } finally { stored.resolve(); await runtime.settleBackground(); }
  }
});
