'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const VIEWPORTS = [320, 360, 390, 412, 1024];
const VIEWPORT_HEIGHT = 844;
const EXPECTED_INTRO = '目標ランクまであといくら必要か、現在のステータスと必要ポイントから計算できます。';

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
    let url;
    try {
      url = new URL(route.request().url());
    } catch {
      await route.continue();
      return;
    }
    if (url.origin === origin) {
      await route.continue();
      return;
    }
    const type = route.request().resourceType();
    if (type === 'script') {
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* blocked in smoke */' });
      return;
    }
    if (type === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* blocked in smoke */' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

async function inspect(page) {
  return page.evaluate(() => {
    const description = document.getElementById('site-description');
    const title = document.getElementById('main-title');
    const tabs = document.querySelector('.tab-switch');
    const currentStatus = document.getElementById('currentStatus');
    if (!description || !title || !tabs || !currentStatus) return null;

    const descriptionStyle = getComputedStyle(description);
    const descriptionRect = description.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const currentStatusRect = currentStatus.getBoundingClientRect();
    const lineHeight = parseFloat(descriptionStyle.lineHeight) || 0;
    const lineCount = lineHeight > 0 ? Math.ceil((descriptionRect.height - 0.5) / lineHeight) : null;

    return {
      text: description.textContent.trim(),
      html: description.innerHTML,
      lineHeight,
      lineCount,
      height: descriptionRect.height,
      fontWeight: Number.parseInt(descriptionStyle.fontWeight, 10) || 400,
      titleBottom: titleRect.bottom,
      descriptionTop: descriptionRect.top,
      descriptionBottom: descriptionRect.bottom,
      tabsTop: tabsRect.top,
      tabsBottom: tabsRect.bottom,
      currentStatusTop: currentStatusRect.top,
      currentStatusBottom: currentStatusRect.bottom,
      viewportHeight: window.innerHeight,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    };
  });
}

async function main() {
  if (!CHROME_PATH) throw new Error('CHROME_PATH is required');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const server = await startLocalServer();
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: VIEWPORT_HEIGHT } });
  await blockExternalRequests(context, new URL(server.baseUrl).origin);
  const page = await context.newPage();
  const results = [];

  try {
    const response = await page.goto(server.baseUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
    await page.locator('#currentStatus').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(expected => document.getElementById('site-description')?.textContent?.trim() === expected, EXPECTED_INTRO, { timeout: 30_000 });

    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
      await page.waitForTimeout(50);
      const layout = await inspect(page);
      assert(layout, `${width}px: required first-view elements are missing`);
      assert(layout.text === EXPECTED_INTRO, `${width}px: unexpected intro text: ${layout.text}`);
      assert(!/<br\b/i.test(layout.html), `${width}px: forced <br> remains in hydrated intro`);
      assert(layout.scrollWidth <= layout.viewportWidth + 1, `${width}px: horizontal overflow ${layout.scrollWidth} > ${layout.viewportWidth}`);
      assert(layout.descriptionTop >= layout.titleBottom - 1, `${width}px: intro overlaps the H1`);
      assert(layout.tabsTop >= layout.descriptionBottom - 1, `${width}px: tabs overlap the intro`);
      assert(layout.currentStatusTop >= layout.tabsBottom - 1, `${width}px: first input appears above/inside tabs`);

      if (width <= 412) {
        assert(layout.lineCount !== null && layout.lineCount <= 3, `${width}px: intro uses ${layout.lineCount} lines; expected at most 3`);
        assert(layout.currentStatusTop < 620, `${width}px: first input is still too far down (${Math.round(layout.currentStatusTop)}px)`);
      } else {
        assert(layout.lineCount !== null && layout.lineCount <= 2, `${width}px: desktop intro uses ${layout.lineCount} lines`);
      }

      const screenshotPath = path.join(ARTIFACT_DIR, `mobile-first-view-jp-${width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      results.push({ width, ...layout });
      console.log(`ok - JP first view at ${width}px: ${layout.lineCount} line(s), first input y=${Math.round(layout.currentStatusTop)}`);
    }

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'mobile-first-view-report.json'),
      JSON.stringify({ checkedAt: new Date().toISOString(), expectedIntro: EXPECTED_INTRO, results }, null, 2)
    );
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});