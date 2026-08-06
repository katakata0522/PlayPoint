'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const EXPECTED_REVISION = (process.env.SMOKE_EXPECT_REVISION || '').trim();
const MAIN_CONTROLS = '#mainMode select, #mainMode input[type="number"]';
const LOCALES = [
  { key: 'JP', path: '', locale: 'ja-JP', title: 'Google Play Points 計算機', button: '課金額を計算' },
  { key: 'US', path: 'en/', locale: 'en-US', title: 'Google Play Points Calculator', button: 'Calculate amount' },
  { key: 'KR', path: 'ko/', locale: 'ko-KR', title: 'Google Play Points 계산기', button: '결제 금액 계산' },
  { key: 'TW', path: 'tw/', locale: 'zh-TW', title: 'Google Play Points 計算器', button: '計算消費金額' }
];
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8'
};

function assert(value, message) {
  if (!value) throw new Error(message);
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function sameCopy(actual, expected) {
  return normalizeText(actual).toLocaleLowerCase('en-US') === normalizeText(expected).toLocaleLowerCase('en-US');
}

function sameNumber(actual, expected) {
  const left = Number(actual);
  const right = Number(expected);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-9;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  url.search = '';
  url.hash = '';
  return url.href;
}

function startLocalServer() {
  const server = http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }

    if (pathname.endsWith('/')) pathname += 'index.html';
    const absolutePath = path.resolve(ROOT, `.${pathname}`);
    if (!absolutePath.startsWith(`${ROOT}${path.sep}`) || absolutePath.includes(`${path.sep}.git${path.sep}`)) {
      response.writeHead(403).end();
      return;
    }

    fs.stat(absolutePath, (error, stats) => {
      if (error || !stats.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': MIME_TYPES[path.extname(absolutePath).toLowerCase()] || 'application/octet-stream',
        ...(path.basename(absolutePath) === 'sw.js' ? { 'service-worker-allowed': '/' } : {})
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(absolutePath).pipe(response);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}/`,
        close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done()))
      });
    });
  });
}

async function blockExternalRequests(context, origin) {
  await context.route('**/*', async route => {
    const request = route.request();
    let url;
    try {
      url = new URL(request.url());
    } catch {
      await route.continue();
      return;
    }
    if (url.origin === origin) {
      await route.continue();
      return;
    }
    if (request.resourceType() === 'script') {
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* external script blocked by smoke test */' });
      return;
    }
    if (request.resourceType() === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* external stylesheet blocked by smoke test */' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

function observeBrowser(page, origin) {
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    try {
      const url = new URL(response.url());
      if (url.origin === origin && response.status() >= 400) errors.push(`response: ${response.status()} ${url.pathname}`);
    } catch {}
  });
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (!failure) return;
    const reason = failure.errorText.toLowerCase();
    if (reason.includes('err_aborted') || reason === 'csp') return;
    try {
      const url = new URL(request.url());
      if (url.origin === origin) errors.push(`request: ${failure.errorText} ${url.pathname}`);
    } catch {}
  });
  return {
    values: errors,
    verify(label) {
      assert(errors.length === 0, `${label}: ${errors.join(' | ')}`);
    }
  };
}

async function openPage(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'commit', timeout: 45_000 });
      if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await page.waitForTimeout(attempt * 1_000);
    }
  }
  throw lastError;
}

async function waitForStage(page, label, callback, argument) {
  try {
    await page.waitForFunction(callback, argument, { timeout: 30_000 });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function saveScreenshot(page, filename) {
  try {
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename), fullPage: true });
  } catch {}
}

async function verifyStaticPage(browser, baseUrl, locale) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    javaScriptEnabled: false,
    locale: locale.locale,
    viewport: { width: 390, height: 844 }
  });
  await blockExternalRequests(context, origin);
  const page = await context.newPage();
  const browserState = observeBrowser(page, origin);

  try {
    await openPage(page, new URL(locale.path, baseUrl).href);
    const values = await page.evaluate(selector => ({
      title: document.querySelector('#main-title')?.textContent || '',
      button: document.querySelector('#calculateButton')?.textContent || '',
      controls: document.querySelectorAll(selector).length,
      packFields: document.querySelectorAll('#pack-amount').length,
      baseRate: document.querySelector('#baseRate')?.value || '',
      multiplier: document.querySelector('#multiplier')?.value || ''
    }), MAIN_CONTROLS);

    assert(normalizeText(values.title) === locale.title, `${locale.key} static title: ${normalizeText(values.title)}`);
    assert(sameCopy(values.button, locale.button), `${locale.key} static button: ${normalizeText(values.button)}`);
    assert(values.controls === 5, `${locale.key} static controls: ${values.controls}`);
    assert(values.packFields === 0, `${locale.key} static average-pack field returned`);
    assert(sameNumber(values.baseRate, 1) && sameNumber(values.multiplier, 1), `${locale.key} static default values changed`);
    browserState.verify(`${locale.key} static browser errors`);
    return { ...values, errors: browserState.values };
  } catch (error) {
    await saveScreenshot(page, `${locale.key.toLowerCase()}-static.png`);
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyHydratedPage(browser, baseUrl, locale) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    locale: locale.locale,
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 390, height: 844 }
  });
  await blockExternalRequests(context, origin);
  const page = await context.newPage();
  const browserState = observeBrowser(page, origin);

  try {
    await openPage(page, new URL(locale.path, baseUrl).href);
    await waitForStage(page, `${locale.key} app initialization`, () => (
      document.querySelector('#currentStatus')?.options.length >= 2 &&
      document.querySelector('#targetStatus')?.options.length >= 1 &&
      document.querySelector('#reverseStatus')?.options.length >= 2
    ));

    const header = await page.evaluate(selector => ({
      title: document.querySelector('#main-title')?.textContent || '',
      button: document.querySelector('#calculateButton')?.textContent || '',
      visibleControls: [...document.querySelectorAll(selector)].filter(element => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      }).length,
      packFields: document.querySelectorAll('#pack-amount').length
    }), MAIN_CONTROLS);

    assert(normalizeText(header.title) === locale.title, `${locale.key} hydrated title: ${normalizeText(header.title)}`);
    assert(sameCopy(header.button, locale.button), `${locale.key} hydrated button: ${normalizeText(header.button)}`);
    assert(header.visibleControls === 5, `${locale.key} hydrated controls: ${header.visibleControls}`);
    assert(header.packFields === 0, `${locale.key} hydrated average-pack field returned`);

    await page.locator('#currentStatus').selectOption({ index: 1 });
    const selectedRate = await page.locator('#currentStatus').inputValue();
    await waitForStage(page, `${locale.key} automatic earn-rate update`, rate => (
      Math.abs(Number(document.querySelector('#baseRate')?.value) - Number(rate)) < 1e-9
    ), selectedRate);
    assert(sameNumber(await page.locator('#baseRate').inputValue(), selectedRate), `${locale.key} automatic earn-rate mismatch`);

    const minimumPoints = Number(await page.locator('#neededPoints').getAttribute('min')) || 1;
    await page.locator('#neededPoints').fill(String(Math.max(125, minimumPoints)));
    await page.locator('#calculateButton').click();
    await waitForStage(page, `${locale.key} main calculation`, () => Boolean(document.querySelector('#result')?.dataset.requiredYen));
    const mainResult = await page.evaluate(() => {
      const result = document.querySelector('#result');
      return {
        requiredAmount: Number(result?.dataset.requiredYen),
        targetStatus: result?.dataset.targetStatusLabel || '',
        valueRows: result?.querySelectorAll('dl dt').length || 0,
        relatedLinks: result?.querySelectorAll('[data-result-related-link]').length || 0
      };
    });
    assert(Number.isFinite(mainResult.requiredAmount) && mainResult.requiredAmount > 0, `${locale.key} main amount is invalid`);
    assert(mainResult.targetStatus && mainResult.valueRows >= 2, `${locale.key} main result is incomplete`);
    assert(mainResult.relatedLinks <= 4, `${locale.key} too many related links: ${mainResult.relatedLinks}`);

    await page.locator('#tab-reverse').click();
    await page.locator('#amountYen').fill('1000');
    await page.locator('#reverseCalculateButton').click();
    await waitForStage(page, `${locale.key} reverse calculation`, () => Boolean(document.querySelector('#reverseResult')?.dataset.earnedPoints));
    const reverseResult = await page.evaluate(() => {
      const result = document.querySelector('#reverseResult');
      return {
        earnedPoints: Number(result?.dataset.earnedPoints),
        amount: Number(result?.dataset.amountYen)
      };
    });
    assert(Number.isFinite(reverseResult.earnedPoints) && reverseResult.earnedPoints > 0, `${locale.key} reverse points are invalid`);
    assert(reverseResult.amount === 1000, `${locale.key} reverse amount changed`);

    let serviceWorker = { checked: false };
    if (locale.key === 'JP') {
      const ready = await page.evaluate(() => Promise.race([
        navigator.serviceWorker?.ready.then(() => true).catch(() => false),
        new Promise(resolve => setTimeout(() => resolve(false), 12_000))
      ]));
      assert(ready, 'Service Worker did not become ready');
      await page.reload({ waitUntil: 'commit', timeout: 45_000 });
      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });
      await waitForStage(page, 'JP app initialization after Service Worker reload', () => (
        document.querySelector('#currentStatus')?.options.length >= 2
      ));
      const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
      assert(controlled, 'Service Worker did not control the reloaded page');
      serviceWorker = { checked: true, ready, controlled };
    }

    await page.waitForTimeout(locale.key === 'JP' ? 3_500 : 700);
    browserState.verify(`${locale.key} hydrated browser errors`);
    return { ...header, selectedRate, mainResult, reverseResult, serviceWorker, errors: browserState.values };
  } catch (error) {
    await saveScreenshot(page, `${locale.key.toLowerCase()}-hydrated.png`);
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyRevision(baseUrl) {
  if (!EXPECTED_REVISION) return { checked: false };
  const url = new URL('status/deploy-revision.txt', baseUrl);
  let actual = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`${url.href}?browser_smoke=${Date.now()}`, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15_000)
    });
    if (response.ok) actual = (await response.text()).trim();
    if (actual === EXPECTED_REVISION) return { checked: true, expected: EXPECTED_REVISION, actual };
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, attempt * 1_500));
  }
  throw new Error(`deployed revision mismatch: expected ${EXPECTED_REVISION}, got ${actual}`);
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  let localServer;
  const baseUrl = REQUESTED_BASE_URL
    ? normalizeBaseUrl(REQUESTED_BASE_URL)
    : (localServer = await startLocalServer()).baseUrl;
  const report = {
    checkedAt: new Date().toISOString(),
    mode: REQUESTED_BASE_URL ? 'production' : 'local',
    baseUrl,
    revision: null,
    locales: [],
    passed: false
  };
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    report.revision = await verifyRevision(baseUrl);
    for (const locale of LOCALES) {
      const result = { locale: locale.key, passed: false };
      try {
        result.static = await verifyStaticPage(browser, baseUrl, locale);
        result.hydrated = await verifyHydratedPage(browser, baseUrl, locale);
        result.passed = true;
        console.log(`ok - ${locale.key} static, main, reverse, Service Worker and browser errors`);
      } catch (error) {
        result.error = error.message;
        console.error(`not ok - ${locale.key}: ${error.message}`);
      }
      report.locales.push(result);
    }
    report.passed = report.locales.every(result => result.passed);
  } finally {
    await browser.close();
    if (localServer) await localServer.close();
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  assert(report.passed, 'Browser smoke test failed. See browser-smoke-artifacts/report.json.');
  console.log(`Browser smoke test passed (${report.mode}, ${LOCALES.length} locales).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
