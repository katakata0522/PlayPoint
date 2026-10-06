'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { INTERNATIONAL_LOCALES } = require('../../scripts/locale-ids.cjs');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const REPRESENTATIVE_CASES = [
  ...['monst-in-app-packs-guide', 'pokemon-sleep-play-points-coupon', 'gakumas-webshop-google-play', 'bluearchive-monthly-packs-guide', 'nikke-monthly-card-midasbuy'].map(slug => ({ key: slug, path: 'articles/' + (slug.startsWith('monst') ? '2026-09-19-' : '2026-09-26-') + slug + '.html', allArticle: true, related: true })),
  { key: 'decision-normalized', path: 'articles/2025-12-25-best-use.html', noIntro: true, summary: true, related: true },
  { key: 'troubleshooting-modern', path: 'articles/2026-03-10-play-points-reflection-timing.html', related: true },
  { key: 'retention-super-ticket', path: 'articles/2026-09-19-google-play-super-ticket.html', related: true },
  { key: 'retention-quests', path: 'articles/2026-07-31-google-play-quests.html', related: true },
  { key: 'game-decision-deep', path: 'games/fgo/pity-cost/index.html', allArticle: true, intro: true, related: true },
  { key: 'international-decision', path: 'en/articles/google-play-points-earn-free.html', related: true },
  { key: 'international-quest-reading', path: 'en/articles/google-play-quests.html', intro: true, related: true },
  { key: 'korean-cash-reading', path: 'ko/articles/google-play-points-cash-conversion.html', answerSelector: ':scope > .intro', intro: true, related: true },
  { key: 'traditional-chinese-use', path: 'tw/articles/google-play-points-use-coupons.html', related: true }
];
// 全件確認は明示指定時だけ実行し、通常CIの代表ケースは維持する。
const CASES = process.env.ARTICLE_REVIEW_ALL === '1'
  ? [
      ...JSON.parse(fs.readFileSync(path.join(ROOT, 'blog/articles.json'), 'utf8'))
        .filter(article => article.listed !== false)
        .map(article => article.file.replace(/^\.\.\//, '')),
      ...INTERNATIONAL_LOCALES.flatMap(locale => fs.readdirSync(path.join(ROOT, locale, 'articles'))
        .filter(file => file.endsWith('.html') && file !== 'index.html')
        .map(file => locale + '/articles/' + file))
    ].map(file => ({ key: file.replace(/[/.]/g, '-'), path: file, allArticle: true }))
  : REPRESENTATIVE_CASES;
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
    const result = await page.evaluate(answerSelector => {
      const content = document.querySelector('.content');
      const answer = content?.querySelector(answerSelector || ':scope > .answer-box, :scope > .editorial-answer');
      const intro = content?.querySelector(':scope > .intro');
      const summary = content?.querySelector(':scope > .summary-box');
      const heading = content?.querySelector(':scope > .section > h2');
      const marker = content?.querySelector(':scope > .intro > strong:first-child');
      const related = content?.querySelector('.related-links-section > ul, .contextual-guide-links > ul, .article-related-guides > ul');
      const shared = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href.includes('article-shared.css'));
      const style = element => element ? getComputedStyle(element) : null;
      const rendered = element => Boolean(element && element.getClientRects().length && style(element).visibility !== 'hidden');
      const answerStyle = style(answer);
      return {
        popularCopyWidth: document.querySelector('.sidebar-popular-feature-copy')?.getBoundingClientRect().width || 0,
        sharedLoaded: Boolean(shared?.sheet),
        contentBackgroundColor: (() => {
          for (let element=content; element; element=element.parentElement) {
            const color=style(element).backgroundColor;
            if (!['transparent','rgba(0, 0, 0, 0)'].includes(color)) return color;
          }
          return 'rgb(255, 255, 255)';
        })(),
        fallbackTheme: document.documentElement.dataset.readingTheme,
        answerPresent: Boolean(answer),
        headingPresent: Boolean(heading),
        answer: rendered(answer) ? { borderLeftWidth: answerStyle.borderLeftWidth, borderLeftStyle:answerStyle.borderLeftStyle, borderLeftColor:answerStyle.borderLeftColor, backgroundImage:answerStyle.backgroundImage, backgroundColor:answerStyle.backgroundColor } : null,
        intro: rendered(intro),
        summary: rendered(summary),
        heading: rendered(heading),
        marker: rendered(marker),
        related: rendered(related),
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      };
    }, article.answerSelector);

    if (viewport.width > 860 && result.popularCopyWidth) assert(result.popularCopyWidth >= 80, article.key + ': 人気記事の本文幅が狭すぎる');
    assert(result.sharedLoaded, article.key + '/' + viewport.key + ': article-shared.css not attached');
    assert(result.fallbackTheme === 'light', article.key + '/' + viewport.key + ': readable static theme missing without JavaScript');
    if (!article.allArticle || result.answerPresent) {
      assert(result.answer, article.key + '/' + viewport.key + ': answer surface missing');
      const hasFill = result.answer.backgroundColor !== 'rgba(0, 0, 0, 0)' && result.answer.backgroundColor !== 'transparent' && result.answer.backgroundColor !== result.contentBackgroundColor;
      const hasBorder = parseFloat(result.answer.borderLeftWidth) > 0 && !['none','hidden'].includes(result.answer.borderLeftStyle) && !['transparent','rgba(0, 0, 0, 0)',result.contentBackgroundColor].includes(result.answer.borderLeftColor);
      assert(hasFill || hasBorder || result.answer.backgroundImage !== 'none', article.key + '/' + viewport.key + ': conclusion must remain distinct from the reading surface');
    }
    if (!article.allArticle || result.headingPresent) {
      assert(result.heading, article.key + '/' + viewport.key + ': section heading missing');
    }
    if (article.intro) {
      assert(result.intro, article.key + '/' + viewport.key + ': intro missing');
    }
    if (article.noIntro) assert(!result.intro, article.key + '/' + viewport.key + ': legacy intro must not return');
    if (article.summary) {
      assert(result.summary, article.key + '/' + viewport.key + ': summary missing');
    }
    if (article.marker) assert(result.marker, article.key + '/' + viewport.key + ': important emphasis missing');
    if (article.related) {
      assert(result.related, article.key + '/' + viewport.key + ': related navigation missing');
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
    if (article.path.startsWith('articles/') || article.path.startsWith('games/')) {
      const sidebar = page.locator('.ja-article-sidebar');
      assert(await sidebar.count() === 1, article.key + ': 日本語サイドバーがありません');
      assert(await sidebar.locator('.sidebar-next-link').count() === 1, article.key + ': 次行動は1件');
      assert(await sidebar.locator('.sidebar-related-link').count() === 0, article.key + ': 本文の関連記事をサイドバーに重複させない');
      assert(await relatedTarget.count() > 0, article.key + ': 本文の関連記事を残す');
      const next = sidebar.locator('.sidebar-next-link');
      await next.focus();
      const outline = await next.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), visible: el.matches(':focus-visible') }));
      assert(outline.visible && outline.width >= 2, article.key + ': サイドバーのフォーカス表示');
      await next.click({ trial: true });
      const bounds = await sidebar.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, article.key + ': サイドバーの横はみ出し');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const evidenceName = 'article-design-' + article.key + '-' + viewport.key;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, evidenceName + '.png'), fullPage: true });
    fs.writeFileSync(path.join(ARTIFACT_DIR, evidenceName + '.json'), JSON.stringify({ article, viewport, result, focus }, null, 2));
    if (article.key === 'retention-super-ticket') {
      // 遅延描画される追記部分も、画面内へ移動して証跡に残す。
      for (const id of ['article-section-3', 'save-use-deadlines', 'article-section-5']) {
        const section = page.locator('.section').filter({ has: page.locator('#' + id) });
        await section.scrollIntoViewIfNeeded();
        await section.screenshot({ path: path.join(ARTIFACT_DIR, evidenceName + '-' + id + '.png') });
      }
    }
    console.log('[article-design-smoke] ' + article.key + '/' + viewport.key + ': OK');
  } catch (error) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    try { await page.screenshot({ path: path.join(ARTIFACT_DIR, 'article-design-' + article.key + '-' + viewport.key + '.png'), fullPage: true }); } catch {}
    throw error;
  } finally {
    await context.close();
  }
}

async function inspectGameReading(browser, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.fulfill({ status: 204, body: '' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const articlePath = '/games/fgo/pity-cost/';
    let response = await page.goto(new URL(articlePath, baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), 'ゲーム記事の正規URLを開けません');
    const button = page.locator('[data-reading-tools] button');
    await button.waitFor({ state: 'visible' });
    assert(await button.isEnabled(), 'ゲーム記事の保存ボタンが無効です');
    await button.click();
    assert(await button.getAttribute('aria-pressed') === 'true', 'ゲーム記事を保存できません');
    response = await page.goto(new URL(articlePath + 'index.html', baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), 'ゲーム記事の別名URLを開けません');
    assert(await button.getAttribute('aria-pressed') === 'true', '別名URLで保存状態が失われました');
    const state = await page.evaluate(() => window.PlayPointReading.makeStore(localStorage).read());
    assert(state.saved.length === 1 && state.saved[0].path === articlePath, '保存先が正規URLに統一されていません');
    assert(state.recent.length === 1 && state.recent[0].path === articlePath, '閲覧履歴が重複しました');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'article-game-reading-mobile.png'), fullPage: true });
    response = await page.goto(new URL('/blog/#reading-library', baseUrl).href, { waitUntil: 'load' });
    assert(response?.ok(), '記事一覧を開けません');
    const links = page.locator('#reading-library a').filter({ hasText: 'FGO' });
    assert(await links.count() >= 1, '保存一覧からゲーム記事へ戻れません');
    assert(errors.length === 0, 'ゲーム記事の実行時エラー: ' + errors.join('; '));
    console.log('[article-design-smoke] game reading save/alias/history/hub: OK');
  } finally { await context.close(); }
}

// 既存suiteで海外記事の検索・保存・小画面・テーマを一続きに確認する。
async function inspectIntlReading(browser, baseUrl) {
  const cases = [
    { locale: 'en', width: 1280, query: 'quests' },
    { locale: 'ko', width: 390, query: '퀘스트' },
    { locale: 'tw', width: 320, query: '任務' }
  ];
  const origin = new URL(baseUrl).origin;
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width: item.width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin
      ? route.continue() : route.fulfill({ status: 204, body: '' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(new URL('/' + item.locale + '/articles/google-play-quests.html', baseUrl).href, { waitUntil: 'load' });
      const save = page.locator('.reading-tools button');
      await save.waitFor({ state: 'visible' });
      assert(await page.locator('.hero').evaluate(el => {
        const tools = el.querySelector('.reading-tools');
        const metadata = el.querySelector('.reading-metadata');
        return tools && metadata && !!(metadata.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING);
      }), item.locale + ': reading controls must follow article metadata inside the hero');
      const title = await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      const body = await page.locator('.content').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      assert(title >= body * 1.5, item.locale + ': article title must be visually distinct from body copy');
      const headingFrame = await page.locator('.content h2:not(.intl-article-toc h2)').first().evaluate(el => {
        const css = getComputedStyle(el);
        return { border: parseFloat(css.borderLeftWidth), padding: parseFloat(css.paddingLeft), radius: parseFloat(css.borderRadius) };
      });
      assert(headingFrame.border >= 4 && headingFrame.padding >= 10 && headingFrame.radius >= 6, item.locale + ': heading frame must match editorial design');
      await save.click();
      assert(await save.getAttribute('aria-pressed') === 'true', item.locale + ': saving failed');
      await page.locator('.reading-tools a').click();
      const library = page.locator('#reading-library');
      await library.waitFor({ state: 'visible' });
      assert(await library.evaluate(el => {
        const grid = document.querySelector('[data-guide-grid]');
        return !!el.closest('[data-intl-reading-library-slot]') && !!(grid.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
      }), item.locale + ': saved library must follow the guide results');
      const savedArticle = library.locator('a[href="/' + item.locale + '/articles/google-play-quests.html"]');
      // 静的な一覧枠の表示と、遷移後の保存データ描画完了を別に待つ。
      await savedArticle.first().waitFor({ state: 'visible', timeout: 15000 });
      assert(await savedArticle.count() >= 1, item.locale + ': saved article missing from library');
      await page.goto(new URL('/' + item.locale + '/articles/', baseUrl).href, { waitUntil: 'load' });
      const search = page.locator('[data-guide-search]');
      await search.waitFor({ state: 'visible' });
      const bounds = await search.boundingBox();
      assert(bounds && bounds.y + bounds.height < 900, item.locale + ': guide search must be reachable in the first viewport');
      const start = page.locator('[data-guide-start]');
      assert(await start.isVisible(), item.locale + ': curated entrances missing before search');
      await search.fill(item.query);
      await page.waitForFunction(() => document.querySelector('[data-guide-start]')?.hidden && document.querySelectorAll('[data-guide-grid] [data-guide-card]:not([hidden])').length > 0);
      await search.fill('zzzznomatch999999');
      await page.locator('[data-guide-empty]').waitFor({ state: 'visible' });
      assert(await page.locator('.search-recovery button').count() >= 1, item.locale + ': empty search has no recovery');
      await search.fill('');
      await start.waitFor({ state: 'visible' });
      await page.locator('[data-guide-filter="levels"]').click();
      assert(await page.locator('[data-guide-filter="levels"]').getAttribute('aria-pressed') === 'true', item.locale + ': selected category state missing');
      assert(!await start.isVisible(), item.locale + ': curated entrances obscure filtered results');
      const categories = await page.locator('[data-guide-grid] [data-guide-card]:visible').evaluateAll(cards => cards.map(card => card.dataset.category));
      assert(categories.length && categories.every(category => category === 'levels'), item.locale + ': category filter returned unrelated guides');
      await page.locator('[data-guide-filter="all"]').click();
      for (const theme of ['light', 'dark']) {
        if (theme === 'dark') await page.locator('.reading-theme-toggle').click();
        const state = await page.evaluate(() => ({ theme: document.documentElement.dataset.readingTheme, overflow: document.documentElement.scrollWidth - innerWidth }));
        assert(state.theme === theme && state.overflow <= 1, item.locale + '/' + theme + ': theme or reflow failed');
        await search.focus();
        const focus = await search.evaluate(el => ({ visible: el.matches(':focus-visible'), width: parseFloat(getComputedStyle(el).outlineWidth) }));
        assert(focus.visible && focus.width >= 2, item.locale + '/' + theme + ': search keyboard focus missing');
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'intl-guide-' + item.locale + '-' + item.width + '-' + theme + '.png'), fullPage: true });
      }
      assert(errors.length === 0, item.locale + ': runtime errors: ' + errors.join('; '));
      console.log('[article-design-smoke] ' + item.locale + ': save, library, first-view search, results, zero results, categories, light/dark, reflow: OK');
    } catch (error) {
      // 保存欄の初期HTMLと読み込み後を区別できるよう、失敗画面も保管する。
      try {
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'intl-reading-' + item.locale + '-failed.png'), fullPage: true });
        const state = await page.evaluate(() => ({ ready: document.readyState, libraryText: document.querySelector('#reading-library')?.innerText, linkCount: document.querySelectorAll('#reading-library a').length }));
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'intl-reading-' + item.locale + '-failed.json'), JSON.stringify({ error: error.message, url: page.url(), ...state }, null, 2));
      } catch {}
      throw error;
    } finally { await context.close(); }
  }
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  const local = REQUESTED_BASE_URL ? null : await startLocalServer();
  const baseUrl = REQUESTED_BASE_URL ? normalizeBaseUrl(REQUESTED_BASE_URL) : local.baseUrl;
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  try {
    for (const article of CASES) for (const viewport of VIEWPORTS) await inspect(browser, baseUrl, article, viewport);
    await inspectGameReading(browser, baseUrl);
    await inspectIntlReading(browser, baseUrl);
  } finally {
    await browser.close();
    if (local) await local.close();
  }
  console.log('[article-design-smoke] verified ' + CASES.length + ' articles across ' + VIEWPORTS.length + ' viewports');
}
main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
