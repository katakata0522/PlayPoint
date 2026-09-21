'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

async function loadResultView() {
  const source = read('js/calculator-result-view.js');
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(dataUrl);
}

function jpConfig(overrides = {}) {
  return {
    currencyPosition: 'suffix',
    currencySymbol: '円',
    rateUnit: '100円',
    uiText: {
      calculationNote: '残り{months}か月の目安です。',
      resultLabelNeededPoints: '目標までの必要ポイント',
      resultLabelTotalYen: '合計の必要課金額目安',
      resultLabelMonthlyYen: '月平均目安',
      resultLabelDailyYen: '1日あたり目安',
      resultLabelMonths: 'か月',
      resultLabelRate: '適用獲得率',
      resultLabelEarnedPoints: '獲得ポイント目安',
      resultDetailsSummary: '計算の詳細を見る',
      roundingNoteWithoutPack: '購入ごとの丸めを含まない概算です。',
      roundingNoteReverse: '逆算の概算です。',
      approxLabel: '約',
      perMonth: '/月',
      perDay: '/日',
      ...overrides
    }
  };
}

test('必要課金額は主役の数字として出し、単位の円は数字と別要素にする', async () => {
  const { renderCurrencyAmount, renderMainResult } = await loadResultView();
  const amount = renderCurrencyAmount(75000, jpConfig());
  assert.match(amount, /class="[^"]*result-amount__value[^"]*"/);
  assert.match(amount, /class="[^"]*result-amount__unit[^"]*"/);
  assert.match(amount, />円</);
  assert.doesNotMatch(amount, /75000<\/span> 円/);

  const { resultContent } = renderMainResult({
    config: jpConfig(),
    neededPoints: 750,
    totalAmountNeeded: 75000,
    remainingMonths: 4,
    remainingDays: 120,
    finalRate: 1,
    rateSourceLabel: '',
    comparison: null
  });

  assert.match(resultContent, /class="result-hero"/);
  assert.match(resultContent, /class="result-hero__amount"/);
  assert.match(resultContent, /data-value="75000"/);
  assert.match(resultContent, /data-value="750"/);
  assert.match(resultContent, /class="result-hero__pace"/);
  assert.match(resultContent, /data-value="18750"/);
  assert.match(resultContent, /data-value="625"/);
});

test('逆算の獲得ポイントも同じ金額コンポーネントで主役にする', async () => {
  const { renderReverseResult } = await loadResultView();
  const html = renderReverseResult({
    config: jpConfig(),
    earnedPoints: 125,
    finalRate: 1.25,
    rateSourceLabel: ''
  });
  assert.match(html, /class="result-hero"/);
  assert.match(html, /data-value="125"/);
  assert.match(html, /result-amount__value/);
  assert.match(html, /result-amount__unit/);
});

test('計算前の空結果カードと閉じた詳細の空洞をCSSで潰す', () => {
  const css = read('style.css');
  assert.match(css, /#mainMode>\.section:has\(>#result\):not\(:has\(\.has-result\)\)/);
  assert.match(css, /\.result:not\(\.has-result\)\s*\{[^}]*display:\s*none/);
  assert.match(css, /--result-amount-color:/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /\.result-hero__amount[\s\S]*?\.result-amount__value\s*\{[^}]*font-size:/);
  assert.match(css, /\.result-amount__unit\s*\{[^}]*color:/);
  assert.doesNotMatch(css, /\.result b \{[\r\n]+color: var\(--link-hover-color\);[\r\n]+\}/);
});

test('日本語見出しは単語の途中で折らず、説明文の途中改行を置かない', () => {
  const css = read('style.css');
  const html = read('index.html');
  const description = html.match(/<!-- DESCRIPTION_SECTION_START -->([\s\S]*?)<!-- DESCRIPTION_SECTION_END -->/)?.[1] || '';
  const articles = html.match(/<!-- ARTICLE_DRAWER_START -->([\s\S]*?)<!-- ARTICLE_DRAWER_END -->/)?.[1] || '';

  assert.match(css, /h1,[\r\n]+\.lp-hero h1,[\r\n]+\.article-link-title,[\r\n]+\.home-rank-hint \{[\r\n]+word-break: keep-all;[\r\n]+overflow-wrap: break-word;[\r\n]+line-break: strict;[\r\n]+\}/);
  assert.doesNotMatch(css, /h1 \{[\r\n]+font-size: 1\.38em;[\r\n]+line-height: 1\.35;[\r\n]+overflow-wrap: anywhere;[\r\n]+\}/);
  assert.doesNotMatch(description, /何ポイント？」\s*<br>/);
  assert.match(description, /何ポイント？」といった逆算/);
  assert.match(articles, /シルバーは<wbr>いくら必要？/);
  assert.match(articles, /ゴールドは<wbr>いくら必要？/);
  assert.match(articles, /プラチナは<wbr>いくら必要？/);
  assert.match(articles, /ダイヤモンドは<wbr>いくら必要？/);
});

test('早見表は数字と円を分けず、狭い画面では表の中だけ横スクロールする', () => {
  const css = read('style.css');
  assert.doesNotMatch(css, /\.lp-comparison-table th,[\r\n]+\.lp-comparison-table td \{[^{}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.lp-comparison-table th,[\r\n]+\.lp-comparison-table td \{[^{}]*white-space: nowrap;/);
  assert.doesNotMatch(css, /\.lp-comparison-table \{[\r\n]+min-width: 0 !important;/);
  assert.match(css, /\.lp-table-wrap \{[^{}]*overflow-x: auto;/);
});
