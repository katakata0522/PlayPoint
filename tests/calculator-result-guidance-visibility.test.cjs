'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

async function loadResultView() {
  const source = fs.readFileSync(path.join(root, 'js', 'calculator-result-view.js'), 'utf8');
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(dataUrl);
}

test('計算後の次アクションは詳細折りたたみの外で、購入確認より後に表示する', async () => {
  const { renderMainResult } = await loadResultView();
  const guidanceContent = '<div class="result-guidance-links"><a href="articles/example.html">次に読む</a></div>';
  const purchaseCheckContent = '<p class="result-purchase-check"><a href="articles/gift.html">購入前確認</a></p>';
  const config = {
    currencyPosition: 'prefix',
    currencySymbol: '¥',
    rateUnit: '¥100',
    uiText: {
      calculationNote: '残り{months}か月の目安です。',
      resultLabelNeededPoints: '必要ポイント',
      resultLabelTotalYen: '必要課金額',
      resultLabelRate: '適用獲得率',
      resultDetailsSummary: '計算の詳細を見る',
      roundingNoteWithoutPack: '購入ごとの丸めを含まない概算です。',
      approxLabel: '約'
    }
  };

  const { resultDetailsContent } = renderMainResult({
    config,
    neededPoints: 100,
    totalAmountNeeded: 10000,
    remainingMonths: 0,
    remainingDays: 0,
    finalRate: 1,
    rateSourceLabel: '',
    comparison: null,
    guidanceContent,
    purchaseCheckContent
  });

  const detailsEnd = resultDetailsContent.indexOf('</details>');
  const purchaseIndex = resultDetailsContent.indexOf('result-purchase-check');
  const guidanceIndex = resultDetailsContent.indexOf('result-guidance-links');

  assert.ok(detailsEnd >= 0, 'details block must exist');
  assert.ok(purchaseIndex > detailsEnd, 'purchase check must remain outside details');
  assert.ok(guidanceIndex > purchaseIndex, 'guidance must appear after purchase check');
  assert.doesNotMatch(resultDetailsContent.slice(0, detailsEnd), /result-guidance-links/);
});
