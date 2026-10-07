'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { sitemapFilesFromRobots, sitemapUrls, urlToLocalHtml } = require('../../scripts/seo-head-audit.cjs');
const ROOT = path.resolve(__dirname, '../..');
const WIDTHS = [320, 360, 390, 430, 600, 768, 1024, 1440];

async function verifyGameCalculators(browser, baseUrl, blockExternalRequests, artifactDir) {
  const urls = [...new Set(sitemapFilesFromRobots(ROOT).flatMap(file => sitemapUrls(fs.readFileSync(path.join(ROOT, file), 'utf8'))))];
  const pages = urls.map(url => ({ url, pathname: new URL(url).pathname, file: urlToLocalHtml(url) }))
    .filter(({ pathname }) => /^\/(?:en\/|ko\/|tw\/)?games\/(?:[^/]+\/)?$/.test(pathname));
  assert.ok(pages.length > 0, 'ゲーム描画の検査対象が0件です');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await blockExternalRequests(context, new URL(baseUrl).origin);
  const page = await context.newPage();
  const report = { checkedAt: new Date().toISOString(), scenario: 'external-ad-and-analytics-requests-blocked', widths: WIDTHS, pages: [], passed: false };
  try {
    for (const target of pages) {
      const row = { path: target.pathname, widths: [], passed: false };
      report.pages.push(row);
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        const response = await page.goto(new URL(target.pathname, baseUrl).href, { waitUntil: 'load', timeout: 30000 });
        assert.ok(response?.ok(), `HTTP ${response?.status()}`);
        const isCalculator = await page.locator('#game-sim-form').count() > 0;
        if (isCalculator) await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
        await page.evaluate(() => document.fonts.ready);
        if (isCalculator) {
          await page.locator('#sim-status').selectOption({ index: 0 });
          await page.locator('#sim-multiplier').selectOption('3');
          await page.locator('#sim-custom-amount').fill('1000');
          const expected = target.pathname.startsWith('/en/') ? 3000 : target.pathname.startsWith('/ko/') ? 3 : target.pathname.startsWith('/tw/') ? 100 : 30;
          const points = await page.locator('#res-earned-points').innerText();
          assert.equal(Number(points.replace(/[^0-9]/g, '')), expected, '1000 × 特別獲得率3の地域別ポイント');
          await page.locator('#sim-custom-amount').fill('-1');
          assert.equal(await page.locator('#sim-custom-amount').getAttribute('aria-invalid'), 'true');
          assert.equal(await page.locator('.game-result-container').isVisible(), false, '不正入力で直前の結果を表示しない');
          assert.ok((await page.locator('#sim-custom-amount-error').innerText()).length > 0);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '不正入力の案内もスマホ幅に収まる');
          await page.locator('#sim-custom-amount').fill('1000');
          assert.equal(await page.locator('.game-result-container').isVisible(), true, '訂正で計算を再開できる');
          const accessible = await page.locator('#res-rank-bar').evaluate(el => ({
            name: (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim(),
            value: Number(el.getAttribute('aria-valuenow')), text: el.getAttribute('aria-valuetext')
          }));
          assert.ok(accessible.name && accessible.text && accessible.value >= 0 && accessible.value <= 100, '進捗の名前・値・説明');
          row.progress = accessible;
        }
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 844 });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const geometry = await page.evaluate(() => {
            const selectors = '.game-main-content, .game-portal-card, .game-sim-card, .game-result-container, .input-field input, .input-field select, .result-stat-box, .game-giftcard-cta-btn';
            const out = [...document.querySelectorAll(selectors)].filter(el => el.getClientRects().length).map(el => {
              const r = el.getBoundingClientRect();
              return { element: el.id || el.className, left: r.left, right: r.right };
            }).filter(r => r.left < -1 || r.right > innerWidth + 1);
            return { viewport: innerWidth, document: document.documentElement.scrollWidth, out };
          });
          row.widths.push(geometry);
          assert.ok(geometry.document <= width + 1 && !geometry.out.length, `横はみ出し ${JSON.stringify(geometry)}`);
          if (['/games/nikke/', '/games/'].includes(target.pathname) && [320, 390, 768, 1440].includes(width)) {
            await page.screenshot({ path: path.join(artifactDir, `game-${target.pathname.includes('nikke') ? 'nikke' : 'portal'}-${width}.png`), fullPage: true });
          }
        }
        // 実際にパックを提供するFGOで回数を検証する。NIKKE日本語版へ架空のパックを作らない。
        if (/\/games\/fgo\/$/.test(target.pathname)) {
          const firstPack = await page.locator('#sim-pack-select').evaluate(el => [...el.options].find(o => o.value !== 'custom')?.value);
          assert.ok(firstPack, 'FGOの既存パックが必要です');
          await page.locator('#sim-pack-select').selectOption(firstPack);
          for (const count of ['0', '1.5', '1000']) {
            await page.locator('#sim-pack-count').fill(count);
            assert.equal(await page.locator('#sim-pack-count').getAttribute('aria-invalid'), 'true');
            assert.equal(await page.locator('.game-result-container').isVisible(), false);
          }
          await page.locator('#sim-pack-count').fill('2');
          assert.equal(await page.locator('.game-result-container').isVisible(), true);
          await page.evaluate(() => {
            window.__copiedGameUrl = '';
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copiedGameUrl = value; } } });
          });
          await page.locator('#btn-copy-link').click();
          const packUrl = await page.evaluate(() => window.__copiedGameUrl);
          assert.ok(packUrl.includes('pack=') && packUrl.includes('count=2'));
          await page.goto(packUrl, { waitUntil: 'load' });
          await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
          assert.equal(await page.locator('#sim-pack-count').inputValue(), '2');
          assert.equal(await page.locator('.game-result-container').isVisible(), true);
          row.packCountAndShareRestoration = true;
        }
        // 共通エンジンの境界を4言語の実フォーム・共有URLでも検証する。
        if (/\/games\/nikke\/$/.test(target.pathname)) {
          await page.setViewportSize({ width: 390, height: 844 });
          for (const bad of ['', '1e308']) {
            await page.locator('#sim-custom-amount').fill(bad);
            assert.equal(await page.locator('.game-result-container').isVisible(), false);
          }
          const cap = await page.locator('#sim-custom-amount').getAttribute('max');
          await page.locator('#sim-custom-amount').fill(cap);
          assert.equal(await page.locator('.game-result-container').isVisible(), true);
          await page.locator('#sim-custom-amount').fill(String(Number(cap) + 1));
          assert.equal(await page.locator('.game-result-container').isVisible(), false);
          await page.locator('#sim-custom-amount').fill('1000');
          for (const value of ['-1', '1001']) {
            await page.locator('#sim-eligible-amount').fill(value);
            assert.equal(await page.locator('#sim-eligible-amount').getAttribute('aria-invalid'), 'true');
          }
          await page.locator('#sim-eligible-amount').fill('0');
          assert.equal(Number((await page.locator('#res-earned-points').innerText()).replace(/[^0-9]/g, '')), 0);
          await page.locator('#sim-eligible-amount').fill('');
          await page.locator('#sim-custom-amount').fill('1000');
          await page.locator('#sim-eligible-amount').fill('900');
          await page.evaluate(() => {
            window.__copiedGameUrl = '';
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.__copiedGameUrl = value; } } });
          });
          await page.locator('#btn-copy-link').click();
          const copied = await page.evaluate(() => window.__copiedGameUrl);
          assert.ok(copied.includes('eligible=900') && copied.includes('amount=1000'));
          await page.goto(copied, { waitUntil: 'load' });
          await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
          assert.equal(await page.locator('#sim-eligible-amount').inputValue(), '900');
          assert.equal(await page.locator('.game-result-container').isVisible(), true);
          await page.goto(new URL(target.pathname + '?amount=1e308', baseUrl).href, { waitUntil: 'load' });
          await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
          assert.equal(await page.locator('#sim-custom-amount').getAttribute('aria-invalid'), 'true');
          await page.locator('#sim-custom-amount').fill('1000');
          assert.equal(await page.locator('.game-result-container').isVisible(), true);
          await page.goto(new URL(target.pathname + '?amount=1000&eligible=&count=invalid', baseUrl).href, { waitUntil: 'load' });
          await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
          assert.equal(await page.locator('.game-result-container').isVisible(), true, '任意対象額の空欄と自由金額モードの未使用回数は計算を妨げない');
          if (target.pathname === '/games/nikke/') {
            await page.goto(new URL(target.pathname + '?amount=1000&pack=invalid', baseUrl).href, { waitUntil: 'load' });
            await page.locator('#sim-eligible-amount').waitFor({ state: 'attached' });
            assert.equal(await page.locator('.game-result-container').isVisible(), false, '使えない商品指定を含む共有URLは計算しない');
            assert.equal(await page.locator('#sim-custom-amount').getAttribute('aria-invalid'), 'true');
            await page.locator('#sim-custom-amount').fill('1200');
            assert.equal(await page.locator('.game-result-container').isVisible(), true, '商品欄がなくても金額訂正で再開できる');
          }
        }
        row.passed = true;
      } catch (error) {
        row.error = error.message;
        await page.screenshot({ path: path.join(artifactDir, `game-failure-${report.pages.length}.png`), fullPage: true }).catch(() => {});
      }
    }
    report.passed = report.pages.every(row => row.passed);
  } finally {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, 'game-calculators.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
  const failures = report.pages.filter(row => !row.passed);
  assert.equal(failures.length, 0, JSON.stringify(failures.map(({ path, error }) => ({ path, error }))));
  return { pages: report.pages.length, calculators: report.pages.filter(row => row.progress).length, widths: WIDTHS, passed: report.passed };
}
module.exports = { verifyGameCalculators };
