'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const ARTICLE_CASES = [
  { key: 'legacy-best-use', path: 'articles/2025-12-25-best-use.html', compatibility: 'article-legacy.css' },
  { key: 'modern-fastest-gold', path: 'articles/2026-08-16-fastest-gold.html', compatibility: 'article-modern.css' }
];
const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900 },
  { key: 'mobile', width: 390, height: 844 }
];
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
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
        'content-type': MIME_TYPES[path.extname(absolutePath).toLowerCase()] || 'application/octet-stream'
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
    if (type === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* external stylesheet blocked */' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

async function saveScreenshot(page, filename) {
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, filename), fullPage: true });
  } catch {}
}

async function inspectArticle(browser, baseUrl, article, viewport) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    javaScriptEnabled: false,
    locale: 'ja-JP',
    viewport: { width: viewport.width, height: viewport.height }
  });
  await blockExternalRequests(context, origin);
  const page = await context.newPage();

  try {
    const response = await page.goto(new URL(article.path, baseUrl).href, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000
    });
    assert(response && response.ok(), `${article.key}/${viewport.key}: HTTP ${response?.status() || 'no response'}`);
    await page.locator('.main-content-column > .hero').waitFor({ state: 'attached', timeout: 15_000 });

    const result = await page.evaluate(({ compatibility }) => {
      const hero = document.querySelector('.main-content-column > .hero');
      const title = hero?.querySelector('h1');
      const main = document.querySelector('.main-content-column');
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const titleStyle = title ? getComputedStyle(title) : null;
      const mainStyle = main ? getComputedStyle(main) : null;
      const stylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.href);
      return {
        hero: heroStyle ? {
          backgroundColor: heroStyle.backgroundColor,
          backgroundImage: heroStyle.backgroundImage,
          paddingTop: heroStyle.paddingTop,
          paddingRight: heroStyle.paddingRight,
          paddingBottom: heroStyle.paddingBottom,
          paddingLeft: heroStyle.paddingLeft,
          textAlign: heroStyle.textAlign
        } : null,
        title: titleStyle ? {
          color: titleStyle.color,
          textShadow: titleStyle.textShadow,
          maxWidth: titleStyle.maxWidth
        } : null,
        mainBackground: mainStyle?.backgroundColor || '',
        headingToken: getComputedStyle(document.documentElement).getPropertyValue('--cocoon-heading').trim(),
        hasCompatibility: stylesheets.some(href => href.includes(compatibility)),
        hasShared: stylesheets.some(href => href.includes('article-shared.css')),
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      };
    }, { compatibility: article.compatibility });

    assert(result.hero, `${article.key}/${viewport.key}: hero not found`);
    assert(result.title, `${article.key}/${viewport.key}: title not found`);
    assert(result.hasCompatibility, `${article.key}/${viewport.key}: ${article.compatibility} not loaded`);
    assert(result.hasShared, `${article.key}/${viewport.key}: article-shared.css not loaded`);
    assert(['rgba(0, 0, 0, 0)', 'transparent'].includes(result.hero.backgroundColor), `${article.key}/${viewport.key}: hero background ${result.hero.backgroundColor}`);
    assert(result.hero.backgroundImage === 'none', `${article.key}/${viewport.key}: hero background image ${result.hero.backgroundImage}`);
    assert([
      result.hero.paddingTop,
      result.hero.paddingRight,
      result.hero.paddingBottom,
      result.hero.paddingLeft
    ].every(value => value === '0px'), `${article.key}/${viewport.key}: hero padding ${JSON.stringify(result.hero)}`);
    assert(result.hero.textAlign === 'left' || result.hero.textAlign === 'start', `${article.key}/${viewport.key}: hero text-align ${result.hero.textAlign}`);
    assert(result.headingToken.toLowerCase() === '#1a202c', `${article.key}/${viewport.key}: heading token ${result.headingToken || '(empty)'}`);
    assert(result.title.color === 'rgb(26, 32, 44)', `${article.key}/${viewport.key}: title color ${result.title.color}`);
    assert(result.title.textShadow === 'none', `${article.key}/${viewport.key}: title shadow ${result.title.textShadow}`);
    assert(result.title.maxWidth === 'none', `${article.key}/${viewport.key}: title max-width ${result.title.maxWidth}`);
    assert(result.mainBackground === 'rgb(255, 255, 255)', `${article.key}/${viewport.key}: main background ${result.mainBackground}`);
    if (viewport.key === 'mobile') {
      assert(result.horizontalOverflow <= 1, `${article.key}/${viewport.key}: horizontal overflow ${result.horizontalOverflow}px`);
    }

    console.log(`[article-css-smoke] ${article.key}/${viewport.key}: OK`);
  } catch (error) {
    await saveScreenshot(page, `article-css-${article.key}-${viewport.key}.png`);
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const local = REQUESTED_BASE_URL ? null : await startLocalServer();
  const baseUrl = REQUESTED_BASE_URL ? normalizeBaseUrl(REQUESTED_BASE_URL) : local.baseUrl;
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

  try {
    for (const article of ARTICLE_CASES) {
      for (const viewport of VIEWPORTS) {
        await inspectArticle(browser, baseUrl, article, viewport);
      }
    }
  } finally {
    await browser.close();
    if (local) await local.close();
  }

  console.log(`[article-css-smoke] verified ${ARTICLE_CASES.length} article generations across ${VIEWPORTS.length} viewports`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
