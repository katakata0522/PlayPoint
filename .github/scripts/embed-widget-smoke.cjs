'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

async function main() {
  const executablePath = process.env.CHROME_PATH;
  if (!executablePath) throw new Error('CHROME_PATH is required.');

  const widgetSource = fs.readFileSync(path.resolve(__dirname, '../../embed/playpoint-widget.js'), 'utf8');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html lang="zh-TW"><body><div data-playpoint-widget data-lang="zh"></div></body></html>');
    await page.addScriptTag({ content: widgetSource });
    await page.waitForFunction(() => document.querySelector('playpoint-widget')?.shadowRoot?.getElementById('current-status'));

    const initial = await page.evaluate(() => {
      const widget = document.querySelector('playpoint-widget');
      const root = widget.shadowRoot;
      const current = root.getElementById('current-status');
      const target = root.getElementById('target-status-display');
      current.value = '1.25';
      current.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        options: Array.from(current.options, option => option.textContent.trim()),
        target: target.textContent.trim()
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

    console.log('[embed-widget-smoke] Taiwan labels and calculation passed.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
