'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { withNavigationRetry } = require('./browser-navigation-retry.cjs');
const { writeJson } = require('./ci-evidence.cjs');
const navigationAttempts = [];
const { hasExplicitTargetMarker } = require('../../scripts/navigation-source-map.cjs');
const { createRevisionSession } = require('./browser-revision-evidence.cjs');
const { verifyReadingUi } = require('./browser-reading-ui.cjs');
const { verifyStaticPresentation, verifyResultPresentation } = require('./calculator-presentation-contract.cjs');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const EXPECTED_REVISION = (process.env.SMOKE_EXPECT_REVISION || '').trim();
const MAIN_CONTROLS = '#mainMode select, #mainMode input[type="number"]';
const LOCALES = [
  { key: 'JP', path: '', locale: 'ja-JP', title: 'Google Play Points 計算機', button: '必要額を計算する', rewardPath: '/', rewardText: 'ウィークリーリワード' },
  { key: 'US', path: 'en/', locale: 'en-US', title: 'Google Play Points Calculator', button: 'Calculate amount', rewardPath: '/en/', rewardText: 'Weekly Prize' },
  { key: 'KR', path: 'ko/', locale: 'ko-KR', title: 'Google Play Points 계산기', button: '결제 금액 계산', rewardPath: '/ko/', rewardText: '주간 혜택' },
  { key: 'TW', path: 'tw/', locale: 'zh-TW', title: 'Google Play Points 計算器', button: '計算消費金額', rewardPath: '/tw/', rewardText: '每週獎勵', shareRestore: { status: '1.25', target: 'gold', expected: '黃金級' } },
  { key: 'HK', path: 'hk/', locale: 'zh-HK', title: 'Google Play Points 計算器（香港）', button: '計算消費金額', rewardPath: '/hk/', rewardText: '每週獎勵', statusCount: 5, staticReverseLabel: '每 HK$7 獲得點數（自動帶入，可修改）', gamePath: '/tw/games/', tooltipContains: 'HK$7', tooltipExcludes: 'NT$30', currencyPrefix: 'HK$', calendarPath: '/hk/', shareRestore: { status: '1.25', target: 'gold', expected: '金級' } },
  { key: 'IN', path: 'in/', locale: 'en-IN', title: 'Google Play Points Calculator — India', button: 'Calculate Amount', rewardPath: '/in/', rewardText: 'Weekly Prize', statusCount: 4, staticReverseLabel: 'Points per ₹5 (auto-filled, editable)', gamePath: '/en/games/', tooltipContains: '₹5', tooltipExcludes: '$1', currencyPrefix: '₹', calendarPath: '/in/', shareRestore: { status: '1.1', target: 'gold', expected: 'Gold' } }
];
const AUTHOR_LOCALES = { JP: '', US: 'en/', KR: 'ko/', TW: 'tw/', HK: 'tw/', IN: 'en/' };
function expectedAuthorPath(locale) { return `/${AUTHOR_LOCALES[locale.key]}author/katakata.html`; }

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
  return withNavigationRetry({
    url,
    operation: async () => {
      const response = await page.goto(url, { waitUntil: 'commit', timeout: 45_000 });
      if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });
    },
    delay: ms => page.waitForTimeout(ms),
    onAttempt: attempt => {
      navigationAttempts.push(attempt);
      writeJson(path.join(ARTIFACT_DIR, 'navigation-attempts.json'), navigationAttempts);
      if (attempt.classification === 'FLAKY_RECOVERED') console.warn(`FLAKY_RECOVERED: ${attempt.url}, attempt ${attempt.attempt}`);
    }
  });
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
      multiplier: document.querySelector('#multiplier')?.value || '',
      reverseBaseLabel: document.querySelector('label[for="reverseBaseRate"] [data-lang-key="labelBaseRate"]')?.textContent || '',
      widgetPath: document.querySelector('[data-lang-key="linkWidget"]')?.pathname || '',
      widgetLabel: document.querySelector('[data-lang-key="linkWidget"]')?.textContent || '',
      authorPath: document.querySelector('[data-lang-key="linkAuthor"]')?.pathname || '',
      authorLabel: document.querySelector('[data-lang-key="linkAuthor"]')?.textContent || '',
      gamePath: document.querySelector('[data-lang-key="linkGames"]')?.pathname || ''
    }), MAIN_CONTROLS);

    assert(normalizeText(values.title) === locale.title, `${locale.key} static title: ${normalizeText(values.title)}`);
    assert(sameCopy(values.button, locale.button), `${locale.key} static button: ${normalizeText(values.button)}`);
    assert(values.controls === 5, `${locale.key} static controls: ${values.controls}`);
    assert(values.packFields === 0, `${locale.key} static average-pack field returned`);
    assert(sameNumber(values.baseRate, 1) && sameNumber(values.multiplier, 1), `${locale.key} static default values changed`);
    if (locale.staticReverseLabel) assert(sameCopy(values.reverseBaseLabel, locale.staticReverseLabel), `${locale.key} static reverse-rate label: ${values.reverseBaseLabel}`);
    if (locale.gamePath) assert(values.gamePath === locale.gamePath, `${locale.key} static game path: ${values.gamePath}`);
    assert(values.authorPath === expectedAuthorPath(locale), `${locale.key} static author path: ${values.authorPath}`);
    assert(values.widgetPath === '/embed.html', `${locale.key} static widget path`);
    if (locale.key !== 'JP') assert(hasExplicitTargetMarker(values.widgetLabel, 'ja'), `${locale.key} static widget language notice`);
    const presentation = await verifyStaticPresentation(page, locale.key);
    browserState.verify(`${locale.key} static browser errors`);
    return { ...values, presentation, errors: browserState.values };
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
  const firstPartyRequests = [];
  page.on('request', request => {
    try {
      const url = new URL(request.url());
      if (url.origin === origin) firstPartyRequests.push(url.pathname);
    } catch {}
  });

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
      packFields: document.querySelectorAll('#pack-amount').length,
      statusCount: document.querySelector('#currentStatus')?.options.length || 0,
      reverseTooltip: document.querySelector('#tooltip-reverse-status')?.textContent || '',
      widgetPath: document.querySelector('[data-lang-key="linkWidget"]')?.pathname || '',
      widgetLabel: document.querySelector('[data-lang-key="linkWidget"]')?.textContent || '',
      authorPath: document.querySelector('[data-lang-key="linkAuthor"]')?.pathname || '',
      authorLabel: document.querySelector('[data-lang-key="linkAuthor"]')?.textContent || '',
      gamePath: document.querySelector('[data-lang-key="linkGames"]')?.pathname || '',
      calendarHref: document.querySelector('#register-google-cal-btn')?.href || ''
    }), MAIN_CONTROLS);

    assert(normalizeText(header.title) === locale.title, `${locale.key} hydrated title: ${normalizeText(header.title)}`);
    assert(sameCopy(header.button, locale.button), `${locale.key} hydrated button: ${normalizeText(header.button)}`);
    assert(header.visibleControls === 5, `${locale.key} hydrated controls: ${header.visibleControls}`);
    assert(header.packFields === 0, `${locale.key} hydrated average-pack field returned`);
    if (locale.statusCount) assert(header.statusCount === locale.statusCount, `${locale.key} status count: ${header.statusCount}`);
    if (locale.tooltipContains) assert(header.reverseTooltip.includes(locale.tooltipContains), `${locale.key} reverse tooltip missing ${locale.tooltipContains}`);
    if (locale.tooltipExcludes) assert(!header.reverseTooltip.includes(locale.tooltipExcludes), `${locale.key} reverse tooltip contains stale ${locale.tooltipExcludes}`);
    if (locale.gamePath) assert(header.gamePath === locale.gamePath, `${locale.key} hydrated game path: ${header.gamePath}`);
    if (locale.calendarPath) assert(decodeURIComponent(header.calendarHref).includes(locale.calendarPath), `${locale.key} calendar link does not point back to ${locale.calendarPath}`);

    assert(header.widgetPath === '/embed.html', `${locale.key} runtime widget path`);
    if (locale.key !== 'JP') assert(hasExplicitTargetMarker(header.widgetLabel, 'ja'), `${locale.key} runtime widget language notice`);
    assert(header.authorPath === expectedAuthorPath(locale), `${locale.key} runtime author path: ${header.authorPath}`);
    if (locale.key === 'HK') assert(header.authorLabel.includes('繁體中文'), 'HK author fallback language must be visible');
    if (locale.key === 'IN') assert(header.authorLabel.includes('English'), 'IN author fallback language must be visible');

    const rewardShare = await page.evaluate(async () => {
      const { SHARE } = await import('/js/share.js');
      return SHARE.buildRewardShareUrl(123, '');
    });
    const rewardIntent = new URL(rewardShare);
    const rewardSiteUrl = new URL(rewardIntent.searchParams.get('url'));
    assert(rewardSiteUrl.pathname === locale.rewardPath, `${locale.key} reward share path: ${rewardSiteUrl.pathname}`);
    assert((rewardIntent.searchParams.get('text') || '').includes(locale.rewardText), `${locale.key} reward share text language mismatch`);

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
        hasHero: Boolean(result?.querySelector('.result-hero')),
        countTargets: result?.querySelectorAll('.count-target').length || 0,
        relatedLinks: result?.querySelectorAll('[data-result-related-link]').length || 0,
        html: result?.innerHTML || ''
      };
    });
    assert(Number.isFinite(mainResult.requiredAmount) && mainResult.requiredAmount > 0, `${locale.key} main amount is invalid`);
    assert(mainResult.targetStatus && mainResult.hasHero && mainResult.countTargets >= 2, `${locale.key} main result is incomplete`);
    assert(mainResult.relatedLinks <= 4, `${locale.key} too many related links: ${mainResult.relatedLinks}`);
    if (locale.currencyPrefix) {
      assert(
        mainResult.html.includes(`>${locale.currencyPrefix}</span><span class="count-target`),
        `${locale.key} currency is not prefix-formatted`
      );
    }

    mainResult.presentation = await verifyResultPresentation(page, locale.key);

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

    if (locale.shareRestore) {
      const shared = new URL(locale.path, baseUrl);
      shared.searchParams.set('mode', 'main');
      shared.searchParams.set('status', locale.shareRestore.status);
      shared.searchParams.set('target', locale.shareRestore.target);
      shared.searchParams.set('points', '125');
      shared.searchParams.set('multiplier', '1');
      await openPage(page, shared.href);
      await waitForStage(page, `${locale.key} share URL restore`, expected => (
        document.querySelector('#targetStatus option:checked')?.dataset.statusLabel === expected
      ), locale.shareRestore.expected);
    }

    let serviceWorker = { checked: false };
    let lazyDiary = { checked: false };
    if (locale.key === 'JP') {
      assert(!firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Diary module loaded before diary tab was used');
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
      const diaryPrecached = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          if (requests.some(request => new URL(request.url).pathname.endsWith('/js/diary.js'))) return true;
        }
        return false;
      });
      assert(!diaryPrecached, 'Service Worker precached diary.js before diary use');

      await page.locator('#tab-diary').click();
      await waitForStage(page, 'JP lazy diary render', () => Boolean(document.querySelector('#weekInputs .week-row')));
      assert(firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Diary module was not fetched on first diary use');

      await context.setOffline(true);
      await page.reload({ waitUntil: 'commit', timeout: 45_000 });
      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });
      await waitForStage(page, 'JP offline core initialization', () => document.querySelector('#currentStatus')?.options.length >= 2);
      await page.locator('#tab-diary').click();
      await waitForStage(page, 'JP offline diary after first use', () => Boolean(document.querySelector('#weekInputs .week-row')));
      await context.setOffline(false);

      serviceWorker = { checked: true, ready, controlled, offlineCore: true };
      lazyDiary = { checked: true, deferredUntilUse: true, offlineAfterUse: true };
    }

    await page.waitForTimeout(locale.key === 'JP' ? 700 : 700);
    // 計算・オフライン検証後に実際のリンクを押し、著者ページ到達まで確認する。
    const authorPath = expectedAuthorPath(locale);
    await Promise.all([
      page.waitForURL(url => url.pathname === authorPath, { waitUntil: 'domcontentloaded', timeout: 30_000 }),
      page.locator('[data-lang-key="linkAuthor"]').click()
    ]);
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30_000 });
    const authorLang = await page.locator('html').getAttribute('lang');
    const expectedLang = { JP: 'ja', US: 'en', KR: 'ko', TW: 'zh-TW', HK: 'zh-TW', IN: 'en' }[locale.key];
    assert(authorLang === expectedLang, `${locale.key} author destination language: ${authorLang}`);
    await saveScreenshot(page, `${locale.key.toLowerCase()}-author.png`);
    await openPage(page, new URL(locale.path, baseUrl).href);
    await page.locator('[data-lang-key="linkWidget"]').click();
    await page.waitForURL(url => url.pathname === '/embed.html', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('h1').first().waitFor({ state: 'visible' });
    const widgetLang = await page.locator('html').getAttribute('lang');
    assert(widgetLang === 'ja', `${locale.key} widget destination language`);
    let diamondReference = null;
    if (locale.key === 'US') {
      const response = await page.goto(new URL('en/status/diamond/', baseUrl).href, { waitUntil: 'domcontentloaded' });
      assert(response?.ok(), 'English Diamond page is reachable');
      const link = page.locator('a[href="/articles/2025-12-25-diamond-worth-it.html"]');
      assert(await link.count() === 1, 'Keep exactly one Diamond value reference');
      const label = await link.textContent();
      assert(/Japan, Japanese/.test(label), 'Diamond reference must show both region and language');
      await link.click();
      await page.waitForURL(url => url.pathname === '/articles/2025-12-25-diamond-worth-it.html', { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor({ state: 'visible' });
      const lang = await page.locator('html').getAttribute('lang');
      assert(lang === 'ja', 'Diamond reference destination must be Japanese');
      diamondReference = { path: new URL(page.url()).pathname, lang, label };
    }
    browserState.verify(`${locale.key} hydrated browser errors`);
    return { ...header, selectedRate, mainResult, reverseResult, serviceWorker, lazyDiary,
      authorVisit: { path: authorPath, lang: authorLang }, widgetVisit: { path: '/embed.html', lang: widgetLang },
      diamondReference, errors: browserState.values };
  } catch (error) {
    await saveScreenshot(page, `${locale.key.toLowerCase()}-hydrated.png`);
    throw error;
  } finally {
    await context.close();
  }
}

async function verifyBlogPage(browser, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 390, height: 844 }
  });
  await blockExternalRequests(context, origin);
  const page = await context.newPage();
  const browserState = observeBrowser(page, origin);

  try {
    const response = await page.goto(new URL('blog/', baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
    await page.locator('.article-card').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(() => /\d+件/.test(document.querySelector('#article-result-status')?.textContent || ''));

    const initial = await page.evaluate(() => ({
      cards: document.querySelectorAll('.article-card').length,
      resultStatus: document.querySelector('#article-result-status')?.textContent || '',
      pagination: document.querySelector('.pagination-status')?.textContent || '',
      activeTopic: document.querySelector('#category-filter button.active')?.dataset.topic ?? null,
      navigationLinks: document.querySelectorAll('.ja-global-nav .nav-item').length,
      thumbnailImages: document.querySelectorAll('.article-card .card-thumb img').length,
      appIconThumbnails: document.querySelectorAll('.article-card .card-thumb--app-icon img').length,
      eventVisualThumbnails: document.querySelectorAll('.article-card .card-thumb--event-visual img').length,
      genericThumbnailImages: document.querySelectorAll('.article-card .card-thumb--generic img').length,
      oversizedAppIcons: [...document.querySelectorAll('.article-card .card-thumb--app-icon img')]
        .filter(image => image.naturalWidth > 128 || image.naturalHeight > 128).length,
      textOnlyThumbnails: document.querySelectorAll('.article-card .card-thumb--text-only').length
    }));
    assert(initial.cards > 0, 'Blog initial article cards were not rendered');
    assert(/件/.test(initial.resultStatus), `Blog result status missing: ${initial.resultStatus}`);
    assert(initial.activeTopic === '', `Blog initial topic mismatch: ${initial.activeTopic}`);
    assert(initial.navigationLinks === 6, 'Blog keeps all six primary destinations');
    assert(initial.genericThumbnailImages === 0, `Blog mobile cards loaded ${initial.genericThumbnailImages} generic OGP thumbnails`);
    assert(initial.thumbnailImages === initial.appIconThumbnails + initial.eventVisualThumbnails,
      `Blog mobile cards loaded an unclassified thumbnail: ${initial.thumbnailImages}`);
    assert(initial.oversizedAppIcons === 0, `Blog mobile app icons exceed the 128px list-image budget: ${initial.oversizedAppIcons}`);
    assert(initial.textOnlyThumbnails + initial.thumbnailImages === initial.cards,
      `Blog compact thumbnails mismatch: text=${initial.textOnlyThumbnails}, images=${initial.thumbnailImages}, cards=${initial.cards}`);

    const nextButton = page.getByRole('button', { name: '次へ →' });
    if (await nextButton.count()) {
      await nextButton.click();
      await page.waitForFunction(() => new URL(location.href).searchParams.get('page') === '2');
      assert((await page.locator('.pagination-status').textContent())?.trim().startsWith('2 /'), 'Blog pagination did not advance');
      const jumpState = await page.evaluate(() => {
        const wrap = document.querySelector('.pagination-input-wrap');
        const input = wrap?.querySelector('.pagination-page-input');
        const total = wrap?.querySelector('.pagination-page-total');
        return {
          wrapPresent: Boolean(wrap),
          value: input?.value || '',
          total: total?.textContent || ''
        };
      });
      assert(jumpState.wrapPresent, 'Blog page jump box (.pagination-input-wrap) is missing');
      assert(jumpState.value === '2', `Blog page input did not show 2: ${jumpState.value}`);
      assert(/^\d+$/.test(jumpState.total) && Number(jumpState.total) >= 2, `Blog page total missing: ${jumpState.total}`);
    }

    await page.locator('#search-input').fill('__playpoint_no_result__');
    await page.waitForFunction(() => (document.querySelector('#article-result-status')?.textContent || '').includes('0件'));
    await page.getByRole('button', { name: '検索とカテゴリーをリセット' }).click();
    await page.locator('.article-card').first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(() => {
      const url = new URL(location.href);
      return !url.searchParams.has('q') && !url.searchParams.has('category') && !url.searchParams.has('topic') && !url.searchParams.has('page');
    });
    const resetState = await page.evaluate(() => ({
      activeTopic: document.querySelector('#category-filter button.active')?.dataset.topic ?? null,
      query: document.querySelector('#search-input')?.value || ''
    }));
    assert(resetState.activeTopic === '' && resetState.query === '', 'Blog reset state is inconsistent');

    const filterPanel = page.locator('#article-filter-panel');
    if (!(await filterPanel.evaluate(element => element.open))) {
      await filterPanel.locator('summary').click();
    }
    const topicButton = page.locator('#category-filter button[data-topic]:not([data-topic=""])').first();
    await topicButton.waitFor({ state: 'visible', timeout: 10_000 });
    const topic = await topicButton.getAttribute('data-topic');
    await topicButton.click();
    await page.waitForFunction(expected => new URL(location.href).searchParams.get('topic') === expected, topic);
    assert(await topicButton.evaluate(element => element.classList.contains('active')), 'Blog topic active state did not update');
    assert(await filterPanel.evaluate(element => element.open), 'Blog optional filters should stay open while a topic filter is active');

    // スマホはメニューから、PCは常時表示ナビから同じ行き先へ移動できる。
    if (await page.locator('[aria-controls="guide-menu"]:visible').count()) await page.locator('[aria-controls="guide-menu"]').click();
    const latestLink = page.locator('.ja-global-nav a[href="/latest/"]');
    await latestLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/latest/');
    assert(await page.locator('.ja-global-nav a[aria-current="page"]').getAttribute('href') === '/latest/', 'Latest navigation current-page state mismatch');
    if (await page.locator('[aria-controls="guide-menu"]:visible').count()) await page.locator('[aria-controls="guide-menu"]').click();
    await page.locator('.ja-global-nav a[href="/blog/"]').click();
    await page.locator('.article-card').first().waitFor();
    // PCでサムネイルの旧固定幅が本文に重ならないことも確認する。
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const boxes = await page.locator('.article-card').first().evaluate(card => {
        const image = card.querySelector('.card-thumb').getBoundingClientRect();
        const content = card.querySelector('.card-content').getBoundingClientRect();
        return { right: image.right, left: content.left, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert(boxes.right <= boxes.left + 1 && boxes.overflow <= 1, 'Blog card image overlaps its text or viewport at ' + width);
    }

    await page.waitForTimeout(500);
    browserState.verify('Blog browser errors');
    const readingUi = await verifyReadingUi(browser, baseUrl, blockExternalRequests, ARTIFACT_DIR);
    return { initial, resetState, topic, readingUi, errors: browserState.values };
  } catch (error) {
    await saveScreenshot(page, 'blog.png');
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  navigationAttempts.length = 0;
  let localServer;
  let browser;
  let stage = 'environment';
  const revisionSession = createRevisionSession({ expectedRevision: EXPECTED_REVISION, required: Boolean(REQUESTED_BASE_URL) });
  const report = {
    checkedAt: new Date().toISOString(),
    mode: REQUESTED_BASE_URL ? 'production' : 'local',
    baseUrl: null,
    revision: revisionSession.evidence,
    locales: [],
    blog: { passed: false },
    passed: false
  };
  try {
    assert(CHROME_PATH, 'CHROME_PATH is required');
    const baseUrl = REQUESTED_BASE_URL
      ? normalizeBaseUrl(REQUESTED_BASE_URL)
      : (localServer = await startLocalServer()).baseUrl;
    report.baseUrl = baseUrl;
    stage = 'revision-before';
    await revisionSession.check(baseUrl, 'before-browser');
    stage = 'environment';
    browser = await chromium.launch({
      headless: true,
      executablePath: CHROME_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    stage = 'verification';
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
    try {
      report.blog = { passed: true, details: await verifyBlogPage(browser, baseUrl) };
      console.log('ok - Blog initial render, search, reset, pagination, category and sidebar');
    } catch (error) {
      report.blog = { passed: false, error: error.message };
      console.error(`not ok - Blog: ${error.message}`);
    }
    stage = 'revision-after';
    await revisionSession.check(baseUrl, 'after-browser');
    report.passed = report.locales.every(result => result.passed) && report.blog.passed;
  } catch (error) {
    report.error = error.message;
    report.failedStage = stage;
    report.passed = false;
  } finally {
    // 起動やclose自体が失敗しても、失敗証跡と他方のcleanupを失わない。
    report.cleanupErrors = [];
    try { if (browser) await browser.close(); } catch (error) { report.cleanupErrors.push(error.message); }
    try { if (localServer) await localServer.close(); } catch (error) { report.cleanupErrors.push(error.message); }
    if (report.cleanupErrors.length) report.passed = false;
    report.navigationAttempts = navigationAttempts;
    report.classification = report.passed ? (navigationAttempts.some(item => item.classification === 'FLAKY_RECOVERED') ? 'FLAKY_RECOVERED' : 'PASS') : report.failedStage === 'environment' ? 'ENVIRONMENT_FAIL' : 'CHECK_FAIL';
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  assert(report.passed, 'Browser smoke test failed. See browser-smoke-artifacts/report.json.');
  console.log(`Browser smoke test passed (${report.mode}, ${LOCALES.length} locales + blog).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
