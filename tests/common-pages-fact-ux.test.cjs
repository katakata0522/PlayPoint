'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('地域別の公式レート・年間しきい値・通貨単位を固定する', () => {
  const configs = loadConfigs(true);
  const expected = {
    JP: { rates: [1, 1.25, 1.5, 1.75, 2], thresholds: [250, 1000, 4000, 15000], spendUnit: 100, rateUnit: '100円' },
    US: { rates: [1, 1.1, 1.2, 1.4, 1.6], thresholds: [150, 600, 3000, 10000], spendUnit: 1, rateUnit: '$1' },
    KR: { rates: [1, 1.1, 1.3, 1.6, 2], thresholds: [150, 600, 2400, 15000], spendUnit: 1000, rateUnit: '1,000₩' },
    TW: { rates: [1, 1.25, 1.5, 1.75, 2], thresholds: [250, 1000, 4000, 15000], spendUnit: 30, rateUnit: '30元' },
    HK: { rates: [1, 1.25, 1.5, 1.75, 2], thresholds: [250, 1000, 4000, 15000], spendUnit: 7, rateUnit: 'HK$7' },
    IN: { rates: [1, 1.1, 1.2, 1.4], thresholds: [250, 1000, 4000], spendUnit: 5, rateUnit: '₹5' }
  };
  for (const [region, values] of Object.entries(expected)) {
    assert.deepEqual(Object.values(configs[region].statusRates).sort((a, b) => a - b), values.rates, region + ' rates');
    assert.deepEqual(Object.values(configs[region].thresholds), values.thresholds, region + ' thresholds');
    assert.equal(configs[region].spendUnit, values.spendUnit, region + ' spendUnit');
    assert.equal(configs[region].rateUnit, values.rateUnit, region + ' rateUnit');
  }
});

test('あとがきページは感謝→開発秘話→アップデートの順で、重複Q&Aと不要な上部ナビを持たない', () => {
  const html = read('info.html');
  assert.match(html, /<h1>あとがき・アップデート情報<\/h1>/);
  const thanks = html.indexOf('id="thanks-section"');
  const about = html.indexOf('id="about-section"');
  const update = html.indexOf('id="update-section"');
  assert.ok(thanks >= 0 && thanks < about && about < update);
  assert.match(html, /<h2>あとがき・開発秘話<\/h2>/);
  assert.doesNotMatch(html, /id="qa-section"/);
  assert.doesNotMatch(html, /"@type": "FAQPage"/);
  assert.doesNotMatch(html, /class="lang-nav"/);
  assert.doesNotMatch(html, /<div class="top-bar">/);
});

test('トップは通常率と特別獲得率の意味を公開HTMLで示す', () => {
  const html = read('index.html');
  assert.match(html, /通常獲得率（ステータスから自動入力）/);
  assert.match(html, /キャンペーン特別獲得率/);
  assert.match(html, /高い方を試算に使います/);
  assert.match(html, /対象・上限・有効化/);
  assert.match(html, /id="neededPoints" min="1" step="1"/);
  assert.match(html, /id="amountYen" min="0\.01" step="0\.01"/);
  assert.doesNotMatch(html, /id="pack-amount"/);
});

test('4言語トップは対象条件・保存範囲・aria-labelを初期表示から翻訳する', () => {
  const pages = {
    'index.html': ['このブラウザのローカルストレージ', 'aria-label="前の年へ"'],
    'en/index.html': ["this browser's local storage", 'aria-label="Previous year"'],
    'ko/index.html': ['이 브라우저의 로컬 저장소', 'aria-label="이전 연도"'],
    'tw/index.html': ['此瀏覽器的本機儲存空間', 'aria-label="上一年"']
  };
  for (const [relativePath, required] of Object.entries(pages)) {
    const html = read(relativePath);
    for (const phrase of required) assert.ok(html.includes(phrase), relativePath + ': ' + phrase);
    assert.ok(!html.includes('diary-hint-card'), relativePath + ': 重複した日記ヒントが残っています');
    assert.ok(!html.includes('friday-reminder'), relativePath + ': 重複した金曜日通知が残っています');
    assert.match(html, /data-lang-aria="showHelpAria"/);
  }
  for (const relativePath of ['en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(relativePath);
    for (const fallback of ['aria-label="説明を表示"', 'aria-label="計算結果の共有"', 'aria-label="前の年へ"', 'aria-label="次の年へ"']) {
      assert.ok(!html.includes(fallback), relativePath + ' に日本語aria-labelが残っています: ' + fallback);
    }
  }
  assert.match(read('js/ui.js'), /querySelectorAll\('\[data-lang-aria\]'\)/);
  assert.match(read('scripts/language-page-builder.cjs'), /data-lang-aria/);
});

test('海外の既存ギフトカード割引記事を各言語の記事ハブから発見でき、人向けサイト案内は言語ハブへ導く', () => {
  const paths = {
    'en/articles/index.html': '/en/articles/2026-06-20-discount-gift-cards.html',
    'ko/articles/index.html': '/ko/articles/2026-06-20-discount-gift-cards.html',
    'tw/articles/index.html': '/tw/articles/2026-06-20-discount-gift-cards.html'
  };
  const humanSitemap = read('sitemap.html');
  for (const [hub, url] of Object.entries(paths)) {
    assert.ok(read(hub).includes('href="' + url + '"'), hub + ' に記事がありません');
    const locale = hub.split('/')[0];
    assert.ok(humanSitemap.includes('href="' + locale + '/articles/"'), 'sitemap.html に ' + locale + ' 記事ハブがありません');
  }
});

