'use strict';

const { chromium } = require('playwright-core');

const CHROME_PATH = process.env.CHROME_PATH;
const ARTICLE_URL = 'https://playpoint-sim.com/articles/2025-12-25-best-use.html';

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function blockThirdPartyRequests(context, origin) {
  await context.route('**/*', async route => {
    let requestUrl;
    try {
      requestUrl = new URL(route.request().url());
    } catch {
      await route.continue();
      return;
    }

    if (requestUrl.origin === origin) {
      await route.continue();
      return;
    }

    if (route.request().resourceType() === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* third-party stylesheet blocked */' });
      return;
    }

    await route.fulfill({ status: 204, body: '' });
  });
}

async function snapshot(page, label) {
  return page.evaluate(label => {
    const title = document.querySelector('.main-content-column > .hero h1');
    const rootStyle = getComputedStyle(document.documentElement);
    const titleStyle = title ? getComputedStyle(title) : null;
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];

    return {
      label,
      readyState: document.readyState,
      rootToken: rootStyle.getPropertyValue('--cocoon-heading').trim(),
      titleColor: titleStyle?.color || '',
      stylesheetLinks: links.map(link => ({ href: link.href, sheetAttached: Boolean(link.sheet) })),
      sheetCount: document.styleSheets.length,
      sheetInfo: [...document.styleSheets].map(sheet => {
        let ruleCount = null;
        let hasHeadingToken = false;
        try {
          ruleCount = sheet.cssRules.length;
          hasHeadingToken = [...sheet.cssRules].some(rule => rule.cssText.includes('--cocoon-heading'));
        } catch (error) {
          ruleCount = `ERR:${error.name}`;
        }
        return { href: sheet.href || '(inline)', ruleCount, hasHeadingToken };
      })
    };
  }, label);
}

async function runCase(browser, key, blockThirdParty) {
  const origin = new URL(ARTICLE_URL).origin;
  const context = await browser.newContext({
    javaScriptEnabled: false,
    locale: 'ja-JP',
    viewport: { width: 1280, height: 900 }
  });

  if (blockThirdParty) await blockThirdPartyRequests(context, origin);

  const cssResponses = [];
  context.on('response', response => {
    if (response.request().resourceType() === 'stylesheet') {
      cssResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'] || ''
      });
    }
  });

  const page = await context.newPage();
  try {
    const response = await page.goto(ARTICLE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    assert(response?.ok(), `${key}: article HTTP ${response?.status() || 'no response'}`);

    console.log(`${key}_DOM`, JSON.stringify(await snapshot(page, 'domcontentloaded')));

    await page.waitForLoadState('load', { timeout: 45_000 });
    console.log(`${key}_LOAD`, JSON.stringify(await snapshot(page, 'load')));

    try {
      await page.waitForFunction(
        () => getComputedStyle(document.documentElement).getPropertyValue('--cocoon-heading').trim() === '#1a202c',
        null,
        { timeout: 10_000 }
      );
    } catch {}

    console.log(`${key}_TOKEN_WAIT`, JSON.stringify(await snapshot(page, 'token-wait')));
    console.log(`${key}_CSS_RESPONSES`, JSON.stringify(cssResponses));
  } finally {
    await context.close();
  }
}

(async () => {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  try {
    await runCase(browser, 'UNBLOCKED', false);
    await runCase(browser, 'BLOCKED', true);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
