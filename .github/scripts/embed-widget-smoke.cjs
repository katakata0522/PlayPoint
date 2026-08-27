'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

function widgetHarnessHtml(scriptUrl = '') {
  const script = scriptUrl ? `<script src="${scriptUrl}"></script>` : '';
  return `<!doctype html><html lang="zh-TW"><body><div data-playpoint-widget data-lang="zh"></div>${script}</body></html>`;
}

async function loadWidget(page) {
  const baseUrl = String(process.env.SMOKE_BASE_URL || '').trim();
  if (baseUrl) {
    const url = new URL('embed/playpoint-widget.js', baseUrl);
    url.searchParams.set('browser_smoke', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await page.setContent(widgetHarnessHtml(url.toString()), { waitUntil: 'load' });
    return `production:${url.origin}`;
  }

  const widgetSource = fs.readFileSync(path.resolve(__dirname, '../../embed/playpoint-widget.js'), 'utf8');
  await page.setContent(widgetHarnessHtml());
  await page.addScriptTag({ content: widgetSource });
  return 'local';
}

async function main() {
  const executablePath = process.env.CHROME_PATH;
  if (!executablePath) throw new Error('CHROME_PATH is required.');

  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    const target = await loadWidget(page);
    await page.waitForFunction(() => document.querySelector('playpoint-widget')?.shadowRoot?.getElementById('current-status'));

    const initial = await page.evaluate(() => {
      const widget = document.querySelector('playpoint-widget');
      const root = widget.shadowRoot;
      const current = root.getElementById('current-status');
      const targetDisplay = root.getElementById('target-status-display');
      current.value = '1.25';
      current.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        options: Array.from(current.options, option => option.textContent.trim()),
        target: targetDisplay.textContent.trim()
      };
    });

    if (!initial.options.includes('黃金級')) throw new Error(`Taiwan widget is missing 黃金級: ${initial.options.join(', ')}`);
    if (initial.options.includes('金級')) throw new Error(`Taiwan widget still exposes bare 金級: ${initial.options.join(', ')}`);
    if (!initial.target.includes('黃金級') || !initial.target.includes('1,000')) {
      throw new Error(`Taiwan widget target did not resolve to 黃金級 (1,000pt): ${initial.target}`);
    }

    const reverseResult = await page.evaluate(() => {
      const widget = document.querySelector('playpoint-widget');
      const root = widget.shadowRoot;
      root.getElementById('tab-reverse-btn').click();
      root.getElementById('amount').value = '3000';
      root.getElementById('reverse-status').value = '1.5';
      root.getElementById('multiplier').value = '1';
      root.getElementById('calculate').click();
      return root.getElementById('result').textContent.trim();
    });

    if (!reverseResult.includes('150')) {
      throw new Error(`Taiwan widget reverse calculation changed unexpectedly: ${reverseResult}`);
    }

    console.log(`[embed-widget-smoke] Taiwan labels and calculation passed (${target}).`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
