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
      assert.equal(await page.locator('#selectedMonth').isVisible(), false, '選択月の重複見出しを出さない');
      assert.equal(await page.locator('.weekly-month-section-title').isVisible(), false, '週記録の重複見出しを出さない');
      const current = page.locator('#weekInputs .is-weekly-current');
      const field = current.locator('input[type="number"]');
      assert.equal(await current.locator('.weekly-points-unit').isVisible(), true);
      assert.equal(await current.locator('.weekly-result-share').count(), 0, '記録前に結果共有を出さない');
      const initialStorage = await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData'));
      await field.fill('9999');
      assert.equal(await current.locator('.weekly-large-value-hint').isVisible(), false);
      await field.fill('10000');
      assert.equal(await current.locator('.weekly-large-value-hint').isVisible(), true);
      await field.blur();
      assert.equal(await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData')), initialStorage, 'input/blurで勝手に保存しない');
      assert.equal(await current.locator('.diary-save-btn').getAttribute('data-week'), String(week));
      assert.equal(await current.locator('.diary-save-btn').isVisible(), true);
      await current.locator('input[type="number"]').fill('15');
      await current.locator('.diary-save-btn').click();
      await page.waitForFunction(({ year, month, week }) =>
        JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '15',
      { year, month, week });
      assert.equal(await current.locator('input[type="number"]').isDisabled(), true);
      assert.equal(await current.locator('select').isDisabled(), true);
      assert.equal(await current.locator('.weekly-record-status').isVisible(), true);
      assert.equal(await current.locator('.diary-save-btn').isVisible(), false);
      const share = current.locator('.weekly-result-share');
      assert.equal(await share.isVisible(), true);
      assert.ok(await share.getAttribute('aria-label'), '共有のaccessible name');
      if (locale.key !== 'JP') assert.doesNotMatch(await share.getAttribute('aria-label'), /この週|共有/);
      assert.equal(await current.locator('.weekly-next-reward a').getAttribute('href'), await page.locator('#register-google-cal-btn').getAttribute('href'));
      assert.equal(await current.locator('.weekly-mini-item').count(), 12);
      assert.equal(await current.locator('.weekly-mini-chart .is-current-week-segment').count(), 1);
      const chart = await current.locator('.weekly-mini-chart').getAttribute('aria-label');
      assert.ok(chart && chart.includes('15'), 'グラフの値と読み上げ');
      const saveBeforeEditing = await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData'));
      await current.locator('.weekly-record-edit').click();
      await current.locator('input[type="number"]').fill('20');
      assert.equal(await current.locator('.weekly-record-state').evaluate(el => el.classList.contains('is-dirty')), true);
      assert.equal(await page.evaluate(() => localStorage.getItem('hokuhokuDiaryData')), saveBeforeEditing);
      await current.locator('.diary-save-btn').click();
      await page.waitForFunction(({ year, month, week }) =>
        JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '20',
      { year, month, week });
      assert.equal(await current.locator('.weekly-record-state').evaluate(el => el.classList.contains('is-dirty')), false);
      assert.equal(await current.locator('.weekly-achievement-milestone').isVisible(), true, '自己最高更新を表示');
      await current.locator('.weekly-record-edit').click();
      await field.fill('18');
      await field.press('Enter');
      await page.waitForFunction(({year,month,week}) => JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '18', {year,month,week});
      assert.equal(await current.locator('.weekly-achievement-milestone').count(), 0, '最高値未更新で祝わない');
      await current.locator('.weekly-record-edit').click();
      await field.fill('20');
      await current.locator('.diary-save-btn').click();
      await page.waitForFunction(({year,month,week}) => JSON.parse(localStorage.getItem('hokuhokuDiaryData'))?.[year]?.[month]?.[week]?.points === '20', {year,month,week});

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
  // 5週ある月で既存記録を実描画し、二つのグラフの積み上げと色を確認する。
  const chartContext = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo', viewport: { width: 320, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  try {
    await blockExternalRequests(chartContext, new URL(baseUrl).origin);
    await chartContext.addInitScript(() => localStorage.setItem('hokuhokuDiaryData', JSON.stringify({2026:{10:{1:{points:'1',prize:''},2:{points:'2',prize:''},3:{points:'3',prize:''},4:{points:'4',prize:''}}}})));
    const page = await chartContext.newPage();
    await page.clock.setFixedTime(new Date('2026-10-30T12:00:00+09:00'));
    await page.goto(new URL('',baseUrl).href,{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#currentStatus')?.options.length>1);
    await page.locator('#tab-diary').click();
    const row=page.locator('#weekInputs .is-weekly-current');
    await row.locator('input[type="number"]').fill('50');
    await row.locator('.diary-save-btn').click();
    await row.locator('.weekly-achievement-panel').waitFor({state:'visible'});
    const colors=['rgb(66, 133, 244)','rgb(234, 67, 53)','rgb(251, 188, 4)','rgb(52, 168, 83)','rgb(138, 180, 248)'];
    const mini=await row.locator('.weekly-mini-item.is-current-month .weekly-week-segment').evaluateAll(nodes=>nodes.map(el=>({color:getComputedStyle(el).backgroundColor,grow:Number(getComputedStyle(el).flexGrow),animation:getComputedStyle(el).animationName,visible:el.getBoundingClientRect().height>0})));
    assert.deepEqual(mini.map(s=>s.color),colors);
    assert.deepEqual(mini.map(s=>s.grow),[1,2,3,4,50]);
    assert.ok(mini.every(s=>s.animation==='none'&&s.visible),'reduced-motion下のグラフ');
    await page.locator('.diary-year-chart-section').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
    const annual=await page.locator('.diary-chart-stack .diary-week-segment').evaluateAll(nodes=>nodes.map(el=>({color:getComputedStyle(el).backgroundColor,grow:Number(getComputedStyle(el).flexGrow)})));
    assert.deepEqual(annual.map(s=>s.color),colors);
    assert.deepEqual(annual.map(s=>s.grow),[1,2,3,4,50]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    results.push({locale:'JP',date:'2026-10-30',width:320,miniAnnualFiveWeekStack:true,reducedMotion:true});
  } finally {await chartContext.close();}
  return { passed: true, scenarios: results };
}

module.exports = { verifyDiaryBoundaries };
