'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { writeJson } = require('./ci-evidence.cjs');
const ROOT = path.resolve(__dirname, '../..');
// 期待値は実装の辞書・計算関数から生成しない。ウィジェットの対応4言語を確認する。
const CASES = [
  { lang: 'ja', total: 12000, amount: 10000, rate: '1.5', points: 150, currency: '円' },
  { lang: 'en', total: 120, amount: 125, rate: '1.2', points: 150, currency: 'USD' },
  { lang: 'ko', total: 120000, amount: 100000, rate: '1.3', points: 130, currency: '₩' },
  { lang: 'zh', total: 3600, amount: 3000, rate: '1.5', points: 150, currency: 'NT$' }
];
function widgetHarnessHtml(scriptUrl = '') {
  return `<!doctype html><html lang="ja"><body>${CASES.map(c => `<div data-playpoint-widget data-lang="${c.lang}"></div>`).join('')}${scriptUrl ? `<script src="${scriptUrl}"></script>` : ''}</body></html>`;
}
function numbers(text) { return (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => Number(n.replaceAll(',', ''))); }

async function verifyWidgets(page, { baseUrl = '', source = fs.readFileSync(path.join(ROOT, 'embed/playpoint-widget.js'), 'utf8') } = {}) {
  const blocked = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = baseUrl ? new URL('embed/playpoint-widget.js', baseUrl) : null;
  if (url) url.searchParams.set('browser_smoke', String(Date.now()));
  await page.route('**/*', route => {
    if (url && route.request().url() === url.href) return route.continue();
    blocked.push(route.request().url());
    return route.abort();
  });
  await page.setContent(widgetHarnessHtml(url?.href), { waitUntil: 'load' });
  if (!url) await page.addScriptTag({ content: source });
  const results = [];
  for (const fixture of CASES) {
    const widget = page.locator(`div[data-lang="${fixture.lang}"] playpoint-widget`);
    await widget.locator('#current-status').waitFor({ state: 'visible', timeout: 10000 });
    await widget.locator('#current-status').selectOption('1.0');
    await widget.locator('#needed-points').fill('120');
    await widget.locator('#calculate').click();
    const main = await widget.locator('#result').innerText();
    assert.equal(numbers(main)[0], fixture.total, `${fixture.lang}: 通常計算`);
    assert.ok(main.includes(fixture.currency), `${fixture.lang}: 通貨`);
    for (const input of ['', '0', '100000001']) {
      await widget.locator('#needed-points').fill(input);
      await widget.locator('#calculate').click();
      assert.ok(await widget.locator('#result').evaluate(el => el.classList.contains('error')), `${fixture.lang}: 不正な必要ポイント ${input}`);
    }
    if (fixture.lang === 'zh') {
      const options = await widget.locator('#current-status option').allTextContents();
      assert.ok(options.includes('黃金級') && !options.includes('金級'));
      await widget.locator('#current-status').selectOption('1.25');
      const target = await widget.locator('#target-status-display').innerText();
      assert.ok(target.includes('黃金級') && numbers(target).includes(1000), '台湾の次ランク表示');
    }
    await widget.locator('#tab-reverse-btn').click();
    await widget.locator('#amount').fill(String(fixture.amount));
    await widget.locator('#reverse-status').selectOption(fixture.rate);
    await widget.locator('#multiplier').selectOption('1');
    await widget.locator('#calculate').click();
    const reverse = await widget.locator('#result').innerText();
    assert.deepEqual(numbers(reverse), [fixture.points], `${fixture.lang}: 150と1500を区別する逆算`);
    await widget.locator('#amount').fill('0');
    await widget.locator('#calculate').click();
    assert.deepEqual(numbers(await widget.locator('#result').innerText()), [0], `${fixture.lang}: ゼロ額`);
    for (const input of ['', '-1', '100000001']) {
      await widget.locator('#amount').fill(input);
      await widget.locator('#calculate').click();
      assert.ok(await widget.locator('#result').evaluate(el => el.classList.contains('error')), `${fixture.lang}: 不正な課金額 ${input}`);
    }
    results.push({ lang: fixture.lang, main, reverse, invalidInputsChecked: 6, zeroChecked: true, passed: true });
  }
  assert.deepEqual(blocked, [], 'ウィジェットが未承認の外部依存を要求した');
  assert.deepEqual(errors, [], 'ウィジェットの実行エラー');
  return { passed: true, mode: baseUrl ? 'production' : 'local', results, blocked, errors };
}
async function main() {
  if (!process.env.CHROME_PATH) throw new Error('CHROME_PATH is required.');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  const reportPath = path.join(ROOT, 'browser-smoke-artifacts/embed-widget-report.json');
  try {
    const report = await verifyWidgets(await browser.newPage(), { baseUrl: String(process.env.SMOKE_BASE_URL || '').trim() });
    writeJson(reportPath, report);
    console.log('[embed-widget-smoke] 4言語の通常計算・逆算・入力境界・独立読込が成功');
  } catch (error) {
    writeJson(reportPath, { passed: false, error: error.message });
    throw error;
  } finally { await browser.close(); }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { verifyWidgets, widgetHarnessHtml };
