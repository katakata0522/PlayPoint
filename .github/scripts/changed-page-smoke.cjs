'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { startLocalServer, blockExternalRequests } = require('./article-css-smoke.cjs');
const { isFocusedPage } = require('./detect-pr-gate-impact.cjs');

async function main() {
  const files = JSON.parse(process.env.PLAYPOINT_CHANGED_PAGES || '[]');
  assert.ok(Array.isArray(files) && files.length && files.every(isFocusedPage), 'Expected changed standalone pages');
  const local = await startLocalServer();
  const origin = new URL(local.baseUrl).origin;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
    const checkedLinks = new Set();
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await blockExternalRequests(context, origin);
      for (const file of files) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          if (new URL(response.url()).origin === origin && response.status() >= 400) errors.push(response.url());
        });
        assert.equal((await page.goto(new URL(file, local.baseUrl).href)).status(), 200, file);
        assert.ok(await page.locator('h1').first().isVisible(), file + ' heading');
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://playpoint-sim.com/' + file);
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        assert.ok(fits, file + ' overflows at ' + width);
        const links = await page.locator('a[href]').evaluateAll(anchors => [...new Set(anchors.map(a => new URL(a.href))
          .filter(url => [location.origin, 'https://playpoint-sim.com'].includes(url.origin) && url.pathname !== location.pathname
            && (url.pathname.endsWith('/') || url.pathname.endsWith('.html'))).map(url => url.pathname))]);
        assert.ok(links.length, file + ' internal navigation');
        for (const link of links) {
          if (checkedLinks.has(link)) continue;
          const response = await context.request.head(new URL(link, local.baseUrl).href);
          assert.equal(response.status(), 200, file + ' links to ' + link);
          checkedLinks.add(link);
        }
        assert.deepEqual(errors, [], file + ' browser errors');
        await page.close();
      }
      await context.close();
    }
    console.log('Verified ' + files.length + ' changed page(s) at three viewport widths and ' + checkedLinks.size + ' internal destinations');
  } finally {
    try { await browser?.close(); } finally { await local.close(); }
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
