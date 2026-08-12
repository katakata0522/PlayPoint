'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createAppModuleRevision } = require('../scripts/asset-sync.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadConfigs() {
  const context = { console, __TEST_ENV__: true };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('js/analytics-core.js'), context, { filename: 'analytics-core.js' });
  vm.runInContext(read('js/config.js').replace(/^import[^\n]+\n/gm, '').replace(/^export\s+/gm, ''), context, { filename: 'config.js' });
  return JSON.parse(JSON.stringify(context.PP_APP.CONFIGS));
}

test('地域別の公式レート・年間しきい値・通貨単位を固定する', () => {
  const configs = loadConfigs();
  const expected = {
    JP: { rates: [1, 1.25, 1.5, 1.75, 2], thresholds: [250, 1000, 4000, 15000], spendUnit: 100, rateUnit: '100円' },
    US: { rates: [1, 1.1, 1.2, 1.4, 1.6], thresholds: [150, 600, 3000, 10000], spendUnit: 1, rateUnit: '$1' },
    KR: { rates: [1, 1.1, 1.3, 1.6, 2], thresholds: [150, 600, 2400, 15000], spendUnit: 1000, rateUnit: '1,000₩' },
    TW: { rates: [1, 1.25, 1.5, 1.75, 2], thresholds: [250, 1000, 4000, 15000], spendUnit: 30, rateUnit: '30元' }
  };
  for (const [region, values] of Object.entries(expected)) {
    assert.deepEqual(Object.values(configs[region].statusRates).sort((a, b) => a - b), values.rates, region + ' rates');
    assert.deepEqual(Object.values(configs[region].thresholds), values.thresholds, region + ' thresholds');
    assert.equal(configs[region].spendUnit, values.spendUnit, region + ' spendUnit');
    assert.equal(configs[region].rateUnit, values.rateUnit, region + ' rateUnit');
  }
});

test('共通説明は年初再判定・残高と年間進捗の違いを公式URL付きで示す', () => {
  const html = read('info.html');
  assert.match(html, /到達したステータスは翌年末まで維持/);
  assert.match(html, /毎年初めに前年の獲得ポイントで再判定/);
  assert.match(html, /現在のポイント残高と年間のステータス進捗は同じですか/);
  assert.match(html, /返金・キャンセルでは残高とステータス判定ポイントから差し引かれる場合/);
  assert.match(html, /answer\/9080348\?co=GENIE\.CountryCode%3DJP&amp;hl=ja/);
  assert.match(html, /answer\/9077192\?co=GENIE\.CountryCode%3DJP&amp;hl=ja/);
  for (const obsolete of ['毎年12月31日にステータスが更新', '85,000円', '2,000ポイント', '3,800円']) {
    assert.ok(!html.includes(obsolete), '古い又は根拠を確認できない記述が残っています: ' + obsolete);
  }
});

test('トップは倍率と直接レートを代替入力として説明し、入力境界をHTMLでも制約する', () => {
  const html = read('index.html');
  const calculator = read('js/calculator.js');
  assert.match(html, /100円あたりの獲得率（自動入力・編集可）/);
  assert.match(html, /キャンペーン倍率（通常は1倍）/);
  assert.match(html, /高い方を試算に使います/);
  assert.match(html, /対象・上限・有効化/);
  assert.match(html, /id="neededPoints" min="1" step="1"/);
  assert.doesNotMatch(html, /id="pack-amount"/);
  assert.match(html, /id="amountYen" min="0\.01" step="0\.01"/);
  assert.match(calculator, /finalRate:\s*Math\.max\(directRate, multipliedRate\)/);
  assert.match(calculator, /resultRateSourceDirect/);
  assert.match(calculator, /getValidNumberInput\(STATE\.dom\.amountYen, 0\.01\)/);
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

test('海外の既存ギフトカード割引記事を記事ハブと人向けサイトマップから発見できる', () => {
  const paths = {
    'en/articles/index.html': '/en/articles/2026-06-20-discount-gift-cards.html',
    'ko/articles/index.html': '/ko/articles/2026-06-20-discount-gift-cards.html',
    'tw/articles/index.html': '/tw/articles/2026-06-20-discount-gift-cards.html'
  };
  const humanSitemap = read('sitemap.html');
  for (const [hub, url] of Object.entries(paths)) {
    assert.ok(read(hub).includes('href="' + url + '"'), hub + ' に記事がありません');
    const relativeUrl = url.replace(/^\//, '');
    assert.ok(humanSitemap.includes('href="' + relativeUrl + '"'), 'sitemap.html に ' + relativeUrl + ' がありません');
  }
});

test('アプリモジュール変更がService Worker用の指紋を必ず変える', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-module-revision-'));
  try {
    fs.writeFileSync(path.join(tempRoot, 'module.js'), 'export const value = 1;\n');
    const before = createAppModuleRevision(tempRoot, ['module.js']);
    fs.writeFileSync(path.join(tempRoot, 'module.js'), 'export const value = 2;\n');
    const after = createAppModuleRevision(tempRoot, ['module.js']);

    assert.match(before, /^[0-9a-f]{8}$/);
    assert.match(after, /^[0-9a-f]{8}$/);
    assert.notEqual(after, before);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  assert.match(read('scripts/asset-sync.cjs'), /versionKey: 'appModuleRevision'/);
});
