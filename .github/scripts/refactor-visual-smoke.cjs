'use strict';

// Run old and new source in the same Chromium/font environment. This does not
// mask calculator content or loosen the existing functional browser gate.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const candidate = path.resolve(__dirname, '../..');
const evidence = process.env.REFACTOR_EVIDENCE_DIR || path.join(candidate, 'browser-smoke-artifacts/refactor');
const locales = [ ['JP', '', 'ja-JP'], ['US', 'en/', 'en-US'], ['KR', 'ko/', 'ko-KR'], ['TW', 'tw/', 'zh-TW'], ['HK', 'hk/', 'zh-HK'], ['IN', 'in/', 'en-IN'] ];
const articles = [
  'articles/2025-12-25-best-use.html',
  'games/fgo/pity-cost/',
  'en/articles/google-play-points-cash-conversion.html',
  'ko/articles/google-play-quests.html',
  'tw/articles/google-play-points-coupon-not-applied.html'
];
const diaryData = JSON.stringify({ 2026: { 8: { 1: { points: '0', prize: '' }, 2: { points: '55', prize: 'Test record' } } } });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

async function serve(directory) {
  let root = fs.realpathSync(directory);
  const server = http.createServer((request, response) => {
    let requested;
    try { requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    if (requested.endsWith('/')) requested += 'index.html';
    const file = path.resolve(root, '.' + requested);
    if (!file.startsWith(root + path.sep) || requested.includes('/.git/')) { response.writeHead(403).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      const stream = fs.createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}/`, setRoot: next => { root = fs.realpathSync(next); }, close: () => new Promise(resolve => server.close(resolve)) };
}

async function pageFor(browser, base, locale, width, serviceWorkers = 'block') {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce', serviceWorkers });
  await context.route('**/*', async route => {
    if (new URL(route.request().url()).origin === new URL(base).origin) return route.continue();
    const type = route.request().resourceType();
    return route.fulfill({ status: type === 'script' || type === 'stylesheet' ? 200 : 204,
      contentType: type === 'stylesheet' ? 'text/css' : 'text/javascript', body: '' });
  });
  await context.addInitScript(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : ['2026-09-14T00:00:00Z'])); }
      static now() { return new NativeDate('2026-09-14T00:00:00Z').getTime(); }
    };
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return { page, context, errors };
}

async function capture(pair, name, report) {
  const images = [];
  for (const [index, entry] of pair.entries()) {
    await entry.page.evaluate(() => document.fonts.ready);
    await entry.page.mouse.move(0, 0);
    await entry.page.evaluate(() => window.scrollTo(0, 0));
    // Chromium can skip offscreen content-visibility:auto subtrees in a full-page
    // capture. Compare rendered content, never random intrinsic-size placeholders.
    // Only auto is expanded; hidden/display/visibility and pixel equality stay intact.
    const rendering = await entry.page.evaluateHandle(() => [...document.querySelectorAll('*')]
      .filter(element => getComputedStyle(element).contentVisibility === 'auto')
      .map(element => {
        const previous = { element, value: element.style.getPropertyValue('content-visibility'), priority: element.style.getPropertyPriority('content-visibility') };
        element.style.setProperty('content-visibility', 'visible', 'important');
        return previous;
      }));
    try {
      await entry.page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      images.push(await entry.page.screenshot({ path: path.join(evidence, `${name}-${index === 0 ? 'before' : 'after'}.png`), fullPage: true, animations: 'disabled', caret: 'hide' }));
    } finally {
      await rendering.evaluate(items => items.forEach(({ element, value, priority }) => {
        if (value) element.style.setProperty('content-visibility', value, priority);
        else element.style.removeProperty('content-visibility');
      }));
      await rendering.dispose();
    }
    assert.deepEqual(entry.errors, [], `${name}: browser errors`);
  }
  const equal = images[0].equals(images[1]);
  report.push({ name, equal, sha256: images.map(bytes => crypto.createHash('sha256').update(bytes).digest('hex')) });
  console.log(`${equal ? 'ok' : 'not ok'} - exact screenshot ${name}`);
}

async function verifyPair(browser, servers, locale, width, report) {
  const [key, relative, language] = locale;
  const pair = await Promise.all(servers.map(server => pageFor(browser, server.url, language, width)));
  try {
    for (let index = 0; index < pair.length; index++) {
      const page = pair[index].page;
      await page.goto(new URL(relative, servers[index].url).href, { waitUntil: 'load' });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length >= 4);
      // Seed once, not in addInitScript: navigation must never restore lost data.
      await page.evaluate(data => localStorage.setItem('hokuhokuDiaryData', data), diaryData);
      await page.locator('#currentStatus').selectOption({ index: 1 });
      await page.locator('#neededPoints').fill('125');
      await page.locator('#calculateButton').click();
      await page.waitForFunction(() => Number(document.querySelector('#result')?.dataset.requiredYen) > 0);
      await page.locator('#result-details summary').click();
    }
    await capture(pair, `${key}-${width}-main-details`, report);
    for (const { page } of pair) {
      await page.locator('#tab-reverse').click();
      await page.locator('#amountYen').fill('1000');
      await page.locator('#reverseCalculateButton').click();
      await page.waitForFunction(() => Number(document.querySelector('#reverseResult')?.dataset.earnedPoints) > 0);
    }
    await capture(pair, `${key}-${width}-reverse`, report);
    for (const { page } of pair) {
      await page.locator('#tab-diary').click();
      await page.locator('.diary-save-btn').first().waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData')), diaryData, 'Existing diary records must not be rewritten');
    }
    await capture(pair, `${key}-${width}-diary`, report);
  } finally { await Promise.all(pair.map(entry => entry.context.close())); }
}

async function verifyPwaUpgrade(browser, server) {
  const entry = await pageFor(browser, server.url, 'ja-JP', 390, 'allow');
  try {
    await entry.page.goto(server.url, { waitUntil: 'load' });
    await entry.page.evaluate(data => localStorage.setItem('hokuhokuDiaryData', data), diaryData);
    await entry.page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(registration?.active && navigator.serviceWorker.controller);
    });
    const before = await entry.page.evaluate(async () => (await caches.keys()).filter(key => key.startsWith('playpoint-calc-')));
    assert.equal(before.length, 1, 'Expected one old PlayPoint cache');
    server.setRoot(candidate);
    await entry.page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await entry.page.waitForFunction(async oldKeys => {
      const keys = (await caches.keys()).filter(key => key.startsWith('playpoint-calc-'));
      if (keys.length !== 1 || oldKeys.includes(keys[0])) return false;
      const cache = await caches.open(keys[0]);
      const paths = (await cache.keys()).map(request => new URL(request.url).pathname);
      return ['calculator-core.js', 'calculator-result-view.js', 'region-rules.js'].every(file => paths.includes('/js/' + file));
    }, before);
    await entry.page.reload({ waitUntil: 'load' });
    await entry.page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length >= 4);
    // Exercise the public UI after the upgrade; do not depend on test-only globals.
    await entry.page.locator('#tab-reverse').click();
    await entry.page.locator('#reverseStatus').selectOption('1.25');
    await entry.page.locator('#amountYen').fill('500');
    await entry.page.locator('#reverseCalculateButton').click();
    await entry.page.waitForFunction(() => Number(document.querySelector('#reverseResult')?.dataset.earnedPoints) === 6);
    const result = await entry.page.evaluate(async () => ({
      stored: localStorage.getItem('hokuhokuDiaryData'),
      caches: (await caches.keys()).filter(key => key.startsWith('playpoint-calc-')),
      points: Number(document.querySelector('#reverseResult').dataset.earnedPoints)
    }));
    assert.equal(result.stored, diaryData, 'PWA update must preserve existing diary records');
    assert.equal(result.points, 6);
    assert.deepEqual(entry.errors, []);
    console.log('ok - old PWA cache upgrades with all new modules and preserves existing diary data');
    return { passed: true, before, after: result.caches };
  } finally { await entry.context.close(); }
}

async function main() {
  assert.ok(process.argv[2], 'Pass the extracted baseline source directory explicitly.');
  assert.ok(process.env.CHROME_PATH, 'CHROME_PATH is required.');
  fs.mkdirSync(evidence, { recursive: true });
  const servers = [], report = [];
  let browser, pwaUpgrade = { passed: false };
  try {
    servers.push(await serve(process.argv[2]));
    servers.push(await serve(candidate));
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    for (const width of [390, 1280]) {
      for (const locale of locales) await verifyPair(browser, servers, locale, width, report);
      for (const [number, relative] of articles.entries()) {
        const pair = await Promise.all(servers.map(server => pageFor(browser, server.url, 'ja-JP', width)));
        try {
          await Promise.all(pair.map((entry, index) => entry.page.goto(new URL(relative, servers[index].url).href, { waitUntil: 'load' })));
          await capture(pair, `article-${number + 1}-${width}`, report);
        } finally { await Promise.all(pair.map(entry => entry.context.close())); }
      }
    }
    pwaUpgrade = await verifyPwaUpgrade(browser, servers[0]);
    assert.equal(report.length, 46);
    assert.ok(report.every(item => item.equal), 'Unexpected visual differences; inspect the before/after screenshots.');
  } finally {
    fs.writeFileSync(path.join(evidence, 'visual-comparison.json'), JSON.stringify({ baselineCommit: process.env.REFACTOR_BASE_SHA || null, comparisons: report, pwaUpgrade }, null, 2) + '\n');
    if (browser) await browser.close();
    await Promise.all(servers.map(server => server.close()));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
