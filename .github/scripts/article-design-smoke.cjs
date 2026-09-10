'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const CASES = [
  { key: 'decision-legacy', path: 'articles/2025-12-25-best-use.html', intro: true, summary: true, marker: true, related: true },
  { key: 'troubleshooting-modern', path: 'articles/2026-03-10-play-points-reflection-timing.html', related: true },
  { key: 'retention-quests', path: 'articles/2026-07-31-google-play-quests.html', related: true },
  { key: 'international-decision', path: 'en/articles/google-play-points-earn-free.html', related: true }
];
const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900 },
  { key: 'mobile', width: 390, height: 844 },
  { key: 'narrow', width: 320, height: 800 }
];
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function assert(value, message) { if (!value) throw new Error(message); }
function normalizeBaseUrl(value) { const url = new URL(value); if (!url.pathname.endsWith('/')) url.pathname += '/'; url.search = ''; url.hash = ''; return url.href; }

function startLocalServer() {
  const server = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const absolute = path.resolve(ROOT, '.' + pathname);
    if (!absolute.startsWith(ROOT + path.sep) || absolute.includes(path.sep + '.git' + path.sep)) return response.writeHead(403).end();
    fs.stat(absolute, (error, stat) => {
      if (error || !stat.isFile()) return response.writeHead(404).end();
      response.writeHead(200, { 'cache-control': 'no-store', 'content-type': MIME[path.extname(absolute).toLowerCase()] || 'application/octet-stream' });
      if (request.method === 'HEAD') response.end(); else fs.createReadStream(absolute).pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ baseUrl: 'http://127.0.0.1:' + server.address().port + '/', close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done())) }));
  });
}

async function inspect(browser, baseUrl, article, viewport) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: viewport.width, height: viewport.height } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (route.request().resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(new URL(article.path, baseUrl).href, { waitUntil: 'load', timeout: 45000 });
    assert(response && response.ok(), article.key + '/' + viewport.key + ': HTTP failure');
    await page.locator('.content').waitFor({ state: 'attached', timeout: 15000 });
    const result = await page.evaluate(() => {
      const content = document.querySelector('.content');
      const answer = content?.querySelector(':scope > .answer-box, :scope > .editorial-answer');
      const intro = content?.querySelector(':scope > .intro');
      const summary = content?.querySelector(':scope > .summary-box');
      const heading = content?.querySelector(':scope > .section > h2');
      const marker = content?.querySelector(':scope > .intro > strong:first-child');
      const related = content?.querySelector('.related-links-section > ul, .contextual-guide-links > ul, .article-related-guides > ul');
      const shared = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href.includes('article-shared.css'));
      const style = element => element ? getComputedStyle(element) : null;
      const answerStyle = style(answer);
      const introStyle = style(intro);
      const summaryStyle = style(summary);
      const headingStyle = style(heading);
      const markerStyle = style(marker);
      const relatedStyle = style(related);
      return {
        sharedLoaded: Boolean(shared?.sheet),
        answer: answerStyle ? { borderLeftWidth: answerStyle.borderLeftWidth, borderRadius: answerStyle.borderRadius, backgroundImage: answerStyle.backgroundImage } : null,
        intro: introStyle ? { textAlign: introStyle.textAlign, borderLeftWidth: introStyle.borderLeftWidth } : null,
        summary: summaryStyle ? { borderRadius: summaryStyle.borderRadius, borderTopWidth: summaryStyle.borderTopWidth } : null,
        heading: headingStyle ? { backgroundImage: headingStyle.backgroundImage, borderLeftWidth: headingStyle.borderLeftWidth, boxShadow: headingStyle.boxShadow } : null,
        marker: markerStyle ? { backgroundImage: markerStyle.backgroundImage } : null,
        related: relatedStyle ? { display: relatedStyle.display, columns: relatedStyle.gridTemplateColumns } : null,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      };
    });

    assert(result.sharedLoaded, article.key + '/' + viewport.key + ': article-shared.css not attached');
    assert(result.answer, article.key + '/' + viewport.key + ': answer surface missing');
    assert(parseFloat(result.answer.borderLeftWidth) >= 4, article.key + '/' + viewport.key + ': answer accent missing');
    assert(parseFloat(result.answer.borderRadius) >= 8, article.key + '/' + viewport.key + ': answer radius ' + result.answer.borderRadius);
    assert(result.answer.backgroundImage !== 'none', article.key + '/' + viewport.key + ': answer hierarchy missing');
    assert(result.heading, article.key + '/' + viewport.key + ': section heading missing');
    assert(parseFloat(result.heading.borderLeftWidth) >= 4, article.key + '/' + viewport.key + ': H2 accent missing');
    assert(result.heading.backgroundImage !== 'none', article.key + '/' + viewport.key + ': H2 soft band missing');
    assert(result.heading.boxShadow === 'none', article.key + '/' + viewport.key + ': H2 still has heavy shadow');
    if (article.intro) {
      assert(result.intro, article.key + '/' + viewport.key + ': intro missing');
      assert(result.intro.textAlign === 'left' || result.intro.textAlign === 'start', article.key + '/' + viewport.key + ': intro alignment ' + result.intro.textAlign);
      assert(parseFloat(result.intro.borderLeftWidth) >= 3, article.key + '/' + viewport.key + ': intro accent missing');
    }
    if (article.summary) {
      assert(result.summary, article.key + '/' + viewport.key + ': summary missing');
      assert(parseFloat(result.summary.borderRadius) >= 8, article.key + '/' + viewport.key + ': summary radius ' + result.summary.borderRadius);
      assert(parseFloat(result.summary.borderTopWidth) >= 1, article.key + '/' + viewport.key + ': summary border missing');
    }
    if (article.marker) assert(result.marker && result.marker.backgroundImage.includes('linear-gradient'), article.key + '/' + viewport.key + ': fluorescent emphasis missing');
    if (article.related) {
      assert(result.related && result.related.display === 'grid', article.key + '/' + viewport.key + ': related navigation is not a grid');
      if (viewport.width <= 860) assert(!result.related.columns.includes(' '), article.key + '/mobile: related navigation should be one column: ' + result.related.columns);
    }
    if (viewport.width <= 860) assert(result.horizontalOverflow <= 1, article.key + '/mobile: horizontal overflow ' + result.horizontalOverflow + 'px');
    const focusTarget = page.locator('.content a').first();
    await page.keyboard.press('Tab');
    await focusTarget.focus();
    const focus = await focusTarget.evaluate(element => ({ visible: element.matches(':focus-visible'), width: parseFloat(getComputedStyle(element).outlineWidth), style: getComputedStyle(element).outlineStyle }));
    assert(focus.visible && focus.width >= 2 && focus.style !== 'none', article.key + '/' + viewport.key + ': keyboard focus indicator missing');
    const relatedTarget = page.locator('.content .related-links-section > ul > li > a, .content .contextual-guide-links > ul > li > a, .content .article-related-guides > ul > li > a').first();
    if (await relatedTarget.count()) {
      const visibility = await relatedTarget.evaluate(element => getComputedStyle(element.closest('.related-links-section, .contextual-guide-links, .article-related-guides')).contentVisibility);
      assert(visibility === 'visible', article.key + '/' + viewport.key + ': related navigation must have stable rendered geometry');
      await relatedTarget.hover();
      await relatedTarget.click({ trial: true });
      const motion = await relatedTarget.evaluate(element => ({ transform: getComputedStyle(element).transform, transition: getComputedStyle(element).transitionDuration }));
      assert(motion.transform === 'none' && motion.transition.split(',').every(value => parseFloat(value) === 0), article.key + '/' + viewport.key + ': reduced motion not respected');
    }
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const evidenceName = 'article-design-' + article.key + '-' + viewport.key;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, evidenceName + '.png'), fullPage: true });
    fs.writeFileSync(path.join(ARTIFACT_DIR, evidenceName + '.json'), JSON.stringify({ article, viewport, result, focus }, null, 2));
    console.log('[article-design-smoke] ' + article.key + '/' + viewport.key + ': OK');
  } catch (error) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    try { await page.screenshot({ path: path.join(ARTIFACT_DIR, 'article-design-' + article.key + '-' + viewport.key + '.png'), fullPage: true }); } catch {}
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  const local = REQUESTED_BASE_URL ? null : await startLocalServer();
  const baseUrl = REQUESTED_BASE_URL ? normalizeBaseUrl(REQUESTED_BASE_URL) : local.baseUrl;
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  try {
    for (const article of CASES) for (const viewport of VIEWPORTS) await inspect(browser, baseUrl, article, viewport);
  } finally {
    await browser.close();
    if (local) await local.close();
  }
  console.log('[article-design-smoke] verified ' + CASES.length + ' representative articles across ' + VIEWPORTS.length + ' viewports');
}
main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
