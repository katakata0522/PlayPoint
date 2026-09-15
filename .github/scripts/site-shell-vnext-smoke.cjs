'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts', 'site-shell-vnext');
const CHROME_PATH = process.env.CHROME_PATH;
const VIEWPORTS = [320, 360, 390, 412, 1024];
const VIEWPORT_HEIGHT = 844;
const EXPECTED_STYLESHEET = '/site-shell-vnext.css';
const TARGETS = Object.freeze([
  { id: 'author', path: '/author/katakata.html' },
  { id: 'privacy', path: '/privacy.html' },
  { id: 'terms', path: '/terms.html' },
  { id: 'sitemap', path: '/sitemap.html' },
  { id: 'info', path: '/info.html' },
  { id: 'blog', path: '/blog/' }
]);

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
        baseUrl: `http://127.0.0.1:${address.port}`,
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
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* external script blocked in Site Shell smoke */' });
      return;
    }
    if (type === 'stylesheet') {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '/* external stylesheet blocked in Site Shell smoke */' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

async function inspectLayout(page) {
  return page.evaluate(expectedStylesheet => {
    const root = document.documentElement;
    const body = document.body;
    const h1 = document.querySelector('h1');
    const footerCount = document.querySelectorAll('footer').length;
    const shellLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(link => {
      try {
        return new URL(link.href, location.href).pathname === expectedStylesheet;
      } catch {
        return false;
      }
    });
    const h1Rect = h1?.getBoundingClientRect() || null;
    const bodyStyle = getComputedStyle(body);
    return {
      title: document.title,
      viewportWidth: root.clientWidth,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      footerCount,
      shellLinked: Boolean(shellLink),
      bodyBackground: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
      h1: h1Rect ? {
        left: h1Rect.left,
        right: h1Rect.right,
        width: h1Rect.width,
        text: h1.textContent?.trim() || ''
      } : null
    };
  }, EXPECTED_STYLESHEET);
}

async function inspectKeyboardFocus(page) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement !== document.body && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body || element === document.documentElement) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      return {
        visible,
        tag: element.tagName,
        text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || '',
        outlineStyle: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth) || 0,
        boxShadow: style.boxShadow
      };
    });
    if (!focus?.visible) continue;
    const hasOutline = focus.outlineStyle !== 'none' && focus.outlineWidth >= 2;
    const hasShadow = focus.boxShadow && focus.boxShadow !== 'none';
    return { ...focus, hasIndicator: hasOutline || hasShadow };
  }
  return null;
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
    for (const target of TARGETS) {
      for (const width of VIEWPORTS) {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        const response = await page.goto(`${server.baseUrl}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        assert(response && response.ok(), `${target.id} ${width}px: HTTP ${response?.status() || 'no response'}`);
        await page.waitForTimeout(80);

        const layout = await inspectLayout(page);
        assert(layout.shellLinked, `${target.id} ${width}px: Site Shell vNext stylesheet is not linked`);
        assert(layout.h1, `${target.id} ${width}px: h1 is missing`);
        assert(layout.footerCount === 1, `${target.id} ${width}px: expected exactly one footer, got ${layout.footerCount}`);
        assert(layout.scrollWidth <= layout.viewportWidth + 1, `${target.id} ${width}px: horizontal overflow ${layout.scrollWidth} > ${layout.viewportWidth}`);
        assert(layout.h1.left >= -1, `${target.id} ${width}px: h1 clips left (${layout.h1.left})`);
        assert(layout.h1.right <= layout.viewportWidth + 1, `${target.id} ${width}px: h1 clips right (${layout.h1.right} > ${layout.viewportWidth})`);
        assert(layout.bodyBackground !== 'rgb(13, 17, 23)', `${target.id} ${width}px: legacy dark author background remains`);

        const focus = await inspectKeyboardFocus(page);
        assert(focus, `${target.id} ${width}px: no visible keyboard-focus target found`);
        assert(focus.hasIndicator, `${target.id} ${width}px: ${focus.tag} focus has no visible indicator`);

        if (width === 390 || width === 1024) {
          await page.screenshot({
            path: path.join(ARTIFACT_DIR, `${target.id}-${width}.png`),
            fullPage: false
          });
        }

        results.push({ target: target.id, width, layout, focus });
        console.log(`ok - ${target.id} at ${width}px: overflow=${layout.scrollWidth - layout.viewportWidth}, footer=1, focus=${focus.tag}`);
      }
    }

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'report.json'),
      JSON.stringify({ checkedAt: new Date().toISOString(), viewports: VIEWPORTS, targets: TARGETS, results }, null, 2)
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
