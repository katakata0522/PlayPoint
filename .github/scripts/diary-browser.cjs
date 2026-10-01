'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 既存のbrowser-smokeから実行し、日時・遅延読み込み・実際の保存操作をまとめて検証する。
async function verifyDiaryBoundaries(browser, baseUrl, locales, blockExternalRequests, artifactDir) {
  const scenarios = [
    ...locales.map(locale => ({ locale, date: '2026-10-01T12:00:00+09:00', year: 2026, month: 9, week: 4, width: 390 })),
    { locale: locales[0], date: '2026-01-01T12:00:00+09:00', year: 2025, month: 12, week: 4, width: 320 },
    { locale: locales[0], date: '2026-10-02T12:00:00+09:00', year: 2026, month: 10, week: 1, width: 390 },
    { locale: locales[0], date: '2026-10-01T12:00:00+09:00', year: 2026, month: 9, week: 4, width: 1440 }
  ];
  const results = [];
  for (const scenario of scenarios) {
    const { locale, date, year, month, week, width } = scenario;
    const context = await browser.newContext({
      locale: locale.locale, timezoneId: 'Asia/Tokyo',
      viewport: { width, height: 900 }, serviceWorkers: 'block'
    });
    try {
      await blockExternalRequests(context, new URL(baseUrl).origin);
      // 装飾が先に起動しても、日記の初回レンダリングで正しい年月を選ぶ。
      await context.route('**/js/diary.js*', async route => {
        await new Promise(resolve => setTimeout(resolve, 250));
        await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.setFixedTime(new Date(date));
      await page.goto(new URL(locale.path, baseUrl).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length >= 2);
      await page.waitForFunction(() => Boolean(document.querySelector('style[data-weekly-reward-ui]')));
      await page.locator('#tab-diary').click();
      await page.waitForFunction(() => Boolean(document.querySelector('#weekInputs .is-weekly-current')));
      assert.match(await page.locator('#currentYear').textContent(), new RegExp(String(year)));
      assert.equal(await page.locator('#monthSelector button.active').getAttribute('data-month'), String(month));
      const current = page.locator('#weekInputs .is-weekly-current');
      assert.equal(await current.locator('.diary-save-btn').getAttribute('data-week'), String(week));
      assert.equal(await current.locator('.diary-save-btn').isVisible(), true);
      await current.locator('input[type="number"]').fill('15');
      await current.locator('.diary-save-btn').click();
      await page.waitForFunction(({ year, month, week }) =>
        JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '15',
      { year, month, week });
      assert.equal(await current.locator('input[type="number"]').isDisabled(), true);
      await current.locator('.weekly-record-edit').click();
      await current.locator('input[type="number"]').fill('20');
      await current.locator('.diary-save-btn').click();
      await page.waitForFunction(({ year, month, week }) =>
        JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '20',
      { year, month, week });

      // 現在週を含まない月でも、展開した行に保存ボタンが見える。
      const otherMonth = month === 11 ? 10 : 11;
      await page.locator('.weekly-month-picker > summary').click();
      await page.locator('#monthSelector button[data-month="' + otherMonth + '"]').click();
      const other = page.locator('#weekInputs .week-row').first();
      await other.locator('.weekly-edit-toggle').waitFor({ state: 'visible' });
      assert.equal(await other.locator('input[type="number"]').isVisible(), false);
      await other.locator('.weekly-edit-toggle').click();
      assert.equal(await other.locator('.diary-save-btn').isVisible(), true);
      await other.locator('input[type="number"]').fill('10');
      await other.locator('.diary-save-btn').click();
      await page.waitForFunction(({ year, otherMonth }) =>
        JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[otherMonth]?.[1]?.points === '10',
      { year, otherMonth });
      const saved = await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData'));
      // 負の入力を拒否しても保存済みデータを失わない。
      await other.locator('input[type="number"]').fill('-1');
      await other.locator('.diary-save-btn').click();
      assert.equal(await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData')), saved);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#currentStatus')?.options.length >= 2);
      await page.locator('#tab-diary').click();
      await page.waitForFunction(() => Boolean(document.querySelector('#weekInputs .is-weekly-current')));
      assert.equal(await page.locator('#weekInputs .is-weekly-current input[type="number"]').inputValue(), '20');
      assert.equal(await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData')), saved);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      if (artifactDir && locale.key === 'JP') {
        fs.mkdirSync(artifactDir, { recursive: true });
        await page.screenshot({ path: path.join(artifactDir, 'diary-' + date.slice(0, 10) + '-' + width + '.png'), fullPage: true });
      }
      results.push({ locale: locale.key, date, width, currentWeek: { year, month, week }, saveEditReload: true, otherMonthSave: true, invalidInputPreserved: true });
    } catch (error) {
      error.message = locale.key + '/' + date + '/' + width + ': ' + error.message;
      if (artifactDir) {
        fs.mkdirSync(artifactDir, { recursive: true });
        const failed = context.pages()[0];
        if (failed) await failed.screenshot({ path: path.join(artifactDir, 'diary-failed-' + locale.key + '-' + width + '.png'), fullPage: true }).catch(() => {});
        fs.writeFileSync(path.join(artifactDir, 'diary-failure.json'), JSON.stringify({ scenario, message: error.message, stack: error.stack }, null, 2));
      }
      throw error;
    } finally {
      await context.close();
    }
  }
  return { passed: true, scenarios: results };
}

module.exports = { verifyDiaryBoundaries };
