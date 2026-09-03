'use strict';
const { chromium } = require('playwright-core');

const CHROME_PATH = process.env.CHROME_PATH;
const url = 'https://playpoint-sim.com/articles/2025-12-25-best-use.html';

function snapshot(page, label) {
  return page.evaluate(label => {
    const title = document.querySelector('.main-content-column > .hero h1');
    const root = getComputedStyle(document.documentElement);
    const titleStyle = title ? getComputedStyle(title) : null;
    return {
      label,
      readyState: document.readyState,
      rootToken: root.getPropertyValue('--cocoon-heading').trim(),
      titleColor: titleStyle?.color || '',
      sharedLinks: [...document.querySelectorAll('link[rel="stylesheet"]')].map(x => x.href),
      sheetCount: document.styleSheets.length,
      sheetInfo: [...document.styleSheets].map(sheet => {
        let rules = null;
        let hasToken = false;
        try {
          rules = sheet.cssRules.length;
          hasToken = [...sheet.cssRules].some(rule => rule.cssText.includes('--cocoon-heading'));
        } catch (error) {
          rules = `ERR:${error.name}`;
        }
        return { href: sheet.href, rules, hasToken };
      })
    };
  }, label);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
  const cssResponses = [];
  context.on('response', response => {
    if (response.request().resourceType() === 'stylesheet') {
      cssResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('SNAPSHOT_DOM', JSON.stringify(await snapshot(page, 'domcontentloaded')));
    await page.waitForLoadState('load', { timeout: 45000 });
    console.log('SNAPSHOT_LOAD', JSON.stringify(await snapshot(page, 'load')));
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--cocoon-heading').trim() !== '', null, { timeout: 10000 }).catch(() => {});
    console.log('SNAPSHOT_TOKEN_WAIT', JSON.stringify(await snapshot(page, 'token-wait')));
    console.log('CSS_RESPONSES', JSON.stringify(cssResponses));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
