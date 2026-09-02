'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const VIEWPORT_WIDTHS = [360, 390];
const VIEWPORT_HEIGHT = 844;
const LOCALES = [
  { key: 'JP', path: '' },
  { key: 'US', path: 'en/' },
  { key: 'KR', path: 'ko/' },
  { key: 'TW', path: 'tw/' },
  { key: 'HK', path: 'hk/' },
  { key: 'IN', path: 'in/' }
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

async function saveScreenshot(page, localeKey, width) {
  try {
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `mobile-region-${localeKey.toLowerCase()}-${width}.png`),
      fullPage: true
    });
  } catch {}
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const switcher = document.querySelector('.region-switch');
    const more = switcher?.querySelector('.region-more');
    const toggle = switcher?.querySelector('.region-more-toggle');
    if (!switcher || !more || !toggle) return null;

    const switchStyle = getComputedStyle(switcher);
    const switchRect = switcher.getBoundingClientRect();
    const moreRect = more.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const overflowers = [...document.body.querySelectorAll('*')]
      .filter(element => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.getClientRects().length === 0) return false;
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 8)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || '',
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10
        };
      });

    return {
      display: switchStyle.display,
      columnCount: switchStyle.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length,
      viewportWidth,
      documentScrollWidth: root.scrollWidth,
      switchRect: {
        left: switchRect.left,
        right: switchRect.right,
        width: switchRect.width
      },
      moreWidth: moreRect.width,
      toggleWidth: toggleRect.width,
      overflowers
    };
  });
}

async function verifyLocale(browser, baseUrl, locale) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    locale: locale.key === 'JP' ? 'ja-JP' : 'en-US',
    viewport: { width: 390, height: VIEWPORT_HEIGHT }
  });
  await blockExternalRequests(context, origin);
  const page = await context.newPage();
  const results = [];

  try {
    const response = await page.goto(new URL(locale.path, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
    await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });
    await page.waitForFunction(() => {
      const link = document.querySelector('link[data-region-selector-style]');
      return Boolean(link?.sheet && document.querySelector('.region-switch .region-more-toggle'));
    }, null, { timeout: 30_000 });

    for (const width of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.region-switch')).display === 'grid', null, { timeout: 10_000 });
      const layout = await inspectLayout(page);
      assert(layout, `${locale.key} ${width}px: region selector was not fully initialized`);

      const overflowDetails = layout.overflowers
        .map(item => `${item.tag}${item.id ? `#${item.id}` : ''}${item.className ? `.${item.className.split(/\s+/).filter(Boolean).join('.')}` : ''} [${item.left}, ${item.right}]`)
        .join(' | ');

      assert(layout.display === 'grid', `${locale.key} ${width}px: expected grid, got ${layout.display}`);
      assert(layout.columnCount === 2, `${locale.key} ${width}px: expected 2 columns, got ${layout.columnCount}`);
      assert(layout.switchRect.left >= -1 && layout.switchRect.right <= layout.viewportWidth + 1,
        `${locale.key} ${width}px: region selector escapes viewport (${layout.switchRect.left}..${layout.switchRect.right}/${layout.viewportWidth})`);
      assert(layout.documentScrollWidth <= layout.viewportWidth + 1,
        `${locale.key} ${width}px: page horizontally overflows (${layout.documentScrollWidth} > ${layout.viewportWidth})${overflowDetails ? `; offenders: ${overflowDetails}` : ''}`);
      assert(Math.abs(layout.moreWidth - layout.switchRect.width) <= 1.5,
        `${locale.key} ${width}px: more row does not span selector (${layout.moreWidth} vs ${layout.switchRect.width})`);
      assert(Math.abs(layout.toggleWidth - layout.moreWidth) <= 1.5,
        `${locale.key} ${width}px: more toggle does not fill its row (${layout.toggleWidth} vs ${layout.moreWidth})`);

      results.push({ width, ...layout });
      console.log(`ok - ${locale.key} mobile region layout at ${width}px`);
    }

    return results;
  } catch (error) {
    const width = page.viewportSize()?.width || 390;
    await saveScreenshot(page, locale.key, width);
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  let localServer;
  const baseUrl = REQUESTED_BASE_URL
    ? normalizeBaseUrl(REQUESTED_BASE_URL)
    : (localServer = await startLocalServer()).baseUrl;
  const report = {
    checkedAt: new Date().toISOString(),
    mode: REQUESTED_BASE_URL ? 'production' : 'local',
    baseUrl,
    locales: [],
    passed: false
  };
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    for (const locale of LOCALES) {
      const result = { locale: locale.key, passed: false };
      try {
        result.layouts = await verifyLocale(browser, baseUrl, locale);
        result.passed = true;
      } catch (error) {
        result.error = error.message;
        console.error(`not ok - ${locale.key} mobile region layout: ${error.message}`);
      }
      report.locales.push(result);
    }
    report.passed = report.locales.every(result => result.passed);
  } finally {
    await browser.close();
    if (localServer) await localServer.close();
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'mobile-region-layout-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8'
    );
  }

  assert(report.passed, 'Mobile region layout smoke test failed. See browser-smoke-artifacts/mobile-region-layout-report.json.');
  console.log(`Mobile region layout smoke test passed (${report.mode}, ${LOCALES.length} locales × ${VIEWPORT_WIDTHS.join('/')}px).`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
