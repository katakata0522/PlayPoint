'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function assert(value, message) {
  if (!value) throw new Error(message);
}

function startServer() {
  const server = http.createServer((req, res) => {
    let requestedPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    if (requestedPath.endsWith('/')) requestedPath += 'index.html';
    const absolutePath = path.resolve(ROOT, '.' + requestedPath);
    if (!absolutePath.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(absolutePath, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'content-type': MIME[path.extname(absolutePath)] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      fs.createReadStream(absolutePath).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({
      baseUrl: `http://127.0.0.1:${server.address().port}/`,
      close: () => new Promise(done => server.close(done))
    }));
  });
}

async function configureContext(context, origin) {
  await context.addInitScript(() => {
    const granted = {
      analyticsStoragePurposeConsentStatus: 1,
      adStoragePurposeConsentStatus: 1,
      adUserDataPurposeConsentStatus: 1,
      adPersonalizationPurposeConsentStatus: 1
    };
    window.googlefc = {
      getGoogleConsentModeValues() { return granted; },
      showRevocationMessage() {},
      callbackQueue: {
        push(item) {
          setTimeout(() => {
            if (item && typeof item.CONSENT_MODE_DATA_READY === 'function') item.CONSENT_MODE_DATA_READY();
            if (item && typeof item.CONSENT_API_READY === 'function') item.CONSENT_API_READY();
          }, 0);
          return 1;
        }
      }
    };
  });

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    const resourceType = route.request().resourceType();
    if (resourceType === 'script') {
      const body = url.hostname.includes('googlesyndication.com')
        ? 'window.adsbygoogle = window.adsbygoogle || [];'
        : '/* external script stubbed by revenue smoke */';
      return route.fulfill({ status: 200, contentType: 'text/javascript', body });
    }
    if (resourceType === 'stylesheet') {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '/* external stylesheet stub */' });
    }
    return route.fulfill({ status: 204, body: '' });
  });
}

async function waitForRevenueRuntime(page, selector) {
  await page.waitForFunction((adSelector) => {
    const ad = document.querySelector(adSelector);
    const scripts = [...document.scripts].map(script => script.src || '');
    return Boolean(
      window.PlayPointAnalytics &&
      window.PlayPointConsent &&
      window.PlayPointConsent.getStatus() === 'granted' &&
      window.PlayPointConsent.getAdStatus() === 'granted' &&
      ad && ad.dataset.playpointAdRequested === 'true' &&
      Array.isArray(window.adsbygoogle) && window.adsbygoogle.length >= 1 &&
      scripts.some(src => src.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')) &&
      scripts.some(src => src.includes('googletagmanager.com/gtag/js'))
    );
  }, selector, { timeout: 30000 });
}

function assertExternalRequests(requests, label) {
  assert(
    requests.some(url => url.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')),
    `${label} did not request AdSense runtime`
  );
  assert(
    requests.some(url => url.includes('googletagmanager.com/gtag/js')),
    `${label} did not request GA4 runtime`
  );
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  let localServer;
  const baseUrl = REQUESTED_BASE_URL
    ? (REQUESTED_BASE_URL.endsWith('/') ? REQUESTED_BASE_URL : REQUESTED_BASE_URL + '/')
    : (localServer = await startServer()).baseUrl;
  const origin = new URL(baseUrl).origin;
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const gamePaths = ['games/genshin/', 'en/games/genshin/', 'ko/games/genshin/', 'tw/games/genshin/'];
    for (const gamePath of gamePaths) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await configureContext(context, origin);
      const page = await context.newPage();
      const errors = [];
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

      const response = await page.goto(new URL(gamePath, baseUrl).href, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      assert(response && response.ok(), `${gamePath} HTTP failure`);
      await page.locator('#game-sim-form').waitFor({ state: 'attached', timeout: 30000 });
      await page.locator('#sim-pack-select').selectOption('custom');
      await page.locator('#sim-custom-amount').fill(gamePath.startsWith('en/') ? '10' : '1000');
      await page.locator('#sim-custom-amount').dispatchEvent('input');
      await page.waitForFunction(() => {
        const text = document.querySelector('#res-earned-points')?.textContent || '';
        return /\d/.test(text) && !text.startsWith('-');
      });
      await waitForRevenueRuntime(page, '.game-ad-container ins.adsbygoogle');

      const state = await page.evaluate(() => ({
        source: Boolean(document.querySelector('.game-source-section')),
        slot: document.querySelector('.game-ad-container ins.adsbygoogle')?.dataset.adSlot || '',
        adRequests: window.adsbygoogle?.length || 0,
        consentSource: window.PlayPointConsent?.getSource?.() || ''
      }));
      assert(state.source, `${gamePath} source scope missing`);
      assert(state.slot === '8250492620', `${gamePath} managed ad slot missing`);
      assert(state.adRequests >= 1, `${gamePath} adsbygoogle.push was not observed`);
      assert(state.consentSource === 'googlefc', `${gamePath} did not use GoogleFC consent source`);
      assertExternalRequests(requests, gamePath);
      assert(errors.length === 0, `${gamePath} browser errors: ${errors.join(' | ')}`);
      await context.close();
      console.log(`ok - game revenue smoke ${gamePath}`);
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await configureContext(context, origin);
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    const articleUrl = new URL('articles/2026-08-05-play-points-multiplier-stacking.html', baseUrl).href;
    const response = await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    assert(response && response.ok(), 'article HTTP failure');
    await page.locator('article').waitFor({ state: 'attached', timeout: 30000 });
    await waitForRevenueRuntime(page, '.article-ad-container ins.adsbygoogle');

    const articleState = await page.evaluate(() => ({
      slot: document.querySelector('.article-ad-container ins.adsbygoogle')?.dataset.adSlot || '',
      adRequests: window.adsbygoogle?.length || 0,
      consentSource: window.PlayPointConsent?.getSource?.() || '',
      runtimeLoader: [...document.scripts].some(script => /blog\/(components|article)\.js/.test(script.src) || /third-party\.js/.test(script.src))
    }));
    assert(articleState.slot === '8250492620', 'article ad slot missing');
    assert(articleState.adRequests >= 1, 'article adsbygoogle.push was not observed');
    assert(articleState.consentSource === 'googlefc', 'article did not use GoogleFC consent source');
    assert(articleState.runtimeLoader, 'article runtime loader missing');
    assertExternalRequests(requests, 'article');
    assert(errors.length === 0, `article browser errors: ${errors.join(' | ')}`);
    await context.close();
    console.log('ok - article revenue smoke');
  } finally {
    await browser.close();
    if (localServer) await localServer.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
