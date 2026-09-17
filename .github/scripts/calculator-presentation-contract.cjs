'use strict';
const assert = require('node:assert/strict');

async function verifyStaticPresentation(page, locale) {
  await page.waitForLoadState('load');
  const viewports = [];
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    const observed = await page.evaluate(() => {
      const button = document.getElementById('calculateButton');
      const optional = document.getElementById('calculator-advanced-settings');
      const rect = el => el ? { top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom,
        left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height, visibility: getComputedStyle(el).visibility } : null;
      const description = document.querySelector('[data-lang-key="descriptionSectionTitle"]')?.closest('section');
      const articles = document.querySelector('[data-lang-key="articleDrawerTitle"]')?.closest('section');
      return { width: document.documentElement.clientWidth, button: rect(button),
        optional: rect(optional?.querySelector('button')),
        rateInputs: ['baseRate', 'multiplier'].map(id => rect(document.getElementById(id))),
        follows: Boolean(button && optional && (button.compareDocumentPosition(optional) & Node.DOCUMENT_POSITION_FOLLOWING)),
        explanation: Boolean(description?.textContent.trim()), articles: Boolean(articles?.querySelector('a[href]')),
        articlesFollow: Boolean(description && articles && (description.compareDocumentPosition(articles) & Node.DOCUMENT_POSITION_FOLLOWING)) };
    });
    assert.ok(observed.follows, `${locale}: 計算ボタンの欠損またはDOM順序の逆転`);
    const visibleControls = [['button', observed.button], ...(width <= 640 ? [['optional', observed.optional]] : observed.rateInputs.map((r, i) => ['rate-' + i, r]))];
    for (const [role, r] of visibleControls) {
      assert.ok(r && r.width > 0 && r.height > 0 && r.visibility === 'visible', `${locale}/${width}: ${role} が見えない`);
      assert.ok(r.left >= -1 && r.right <= observed.width + 1, `${locale}/${width}: ${role} が画面外`);
    }
    if (width <= 640) assert.ok(observed.button.bottom <= observed.optional.top + 1, `${locale}/${width}: 主要CTAを任意設定より先に表示する`);
    if (locale === 'JP') assert.ok(observed.explanation && observed.articles && observed.articlesFollow, '説明と記事導線の欠損または逆順');
    viewports.push({ width, ...observed });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  return viewports;
}

async function verifyResultPresentation(page, locale) {
  const details = page.locator('#result-details details').filter({ has: page.locator('.result-detail-grid') });
  // detailsは操作で展開する。CSS方式や内部の更新関数名は契約にしない。
  assert.equal(await details.count(), 1, `${locale}: 計算詳細が欠損または重複`);
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
  const observed = await page.locator('#result-details .result-detail-grid').evaluate(grid => {
    const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    return [...grid.querySelectorAll('dt')].map(term => {
      const value = term.nextElementSibling;
      if (!value || value.tagName !== 'DD') return { missing: true };
      const lines = [];
      const walk = document.createTreeWalker(value, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) if (walk.currentNode.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(walk.currentNode);
        for (const r of range.getClientRects()) if (r.width > 0) lines.push({ top: r.top, bottom: r.bottom });
      }
      return { term: rect(term), value: rect(value), lines, width: document.documentElement.clientWidth };
    });
  });
  assert.ok(observed.length > 0, `${locale}: 計算詳細に項目がない`);
  for (const row of observed) {
    assert.ok(!row.missing && row.term.height > 0 && row.value.height > 0, `${locale}: 項目と値が揃わない`);
    assert.ok(Math.abs(row.term.top - row.value.top) <= 2 && row.term.right <= row.value.left + 1, `${locale}: 項目と値の対応が崩れる`);
    assert.ok(row.value.right <= row.width + 1 && row.term.left >= -1, `${locale}: 計算詳細が画面外`);
    assert.ok(row.lines.length > 0, `${locale}: 値が空`);
    // フォントのベースライン差は許容し、共通の水平帯がない複数行だけを拒否。
    assert.ok(Math.max(...row.lines.map(r => r.top)) < Math.min(...row.lines.map(r => r.bottom)), `${locale}: 値の内部が別行へ分断`);
  }
  await details.locator('summary').click();
  return observed;
}
module.exports = { verifyStaticPresentation, verifyResultPresentation };
