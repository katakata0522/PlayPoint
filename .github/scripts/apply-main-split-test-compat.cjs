'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function update(relativePath, before, after, label) {
  const absolutePath = path.join(root, relativePath);
  const content = fs.readFileSync(absolutePath, 'utf8');
  const index = content.indexOf(before);
  if (index < 0) throw new Error(`置換対象が見つかりません: ${label}`);
  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`置換対象が複数あります: ${label}`);
  }
  fs.writeFileSync(
    absolutePath,
    content.slice(0, index) + after + content.slice(index + before.length),
    'utf8'
  );
}

update(
  'tests/playpoint-regression.test.cjs',
  `test('トップページはブラウザ言語だけでクライアントサイドリダイレクトしない', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

  assert.ok(!script.includes("window.location.href = './en/'"));
  assert.ok(!script.includes("window.location.href = './ko/'"));
  assert.ok(!script.includes("window.location.href = './tw/'"));
  assert.ok(script.includes("STATE.currentRegion = 'JP';"));
  assert.ok(script.includes('checkLanguageSuggestion'));
});`,
  `test('トップページはブラウザ言語だけでクライアントサイドリダイレクトしない', () => {
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const regionNavigation = fs.readFileSync(path.join(root, 'js', 'region-navigation.js'), 'utf8');
  const languageSuggestion = fs.readFileSync(path.join(root, 'js', 'language-suggestion.js'), 'utf8');
  const sources = [main, regionNavigation, languageSuggestion].join('\\n');

  assert.ok(!sources.includes("window.location.href = './en/'"));
  assert.ok(!sources.includes("window.location.href = './ko/'"));
  assert.ok(!sources.includes("window.location.href = './tw/'"));
  assert.ok(regionNavigation.includes("STATE.currentRegion = 'JP';"));
  assert.ok(main.includes('checkLanguageSuggestion'));
  assert.ok(languageSuggestion.includes('navigator.language'));
  assert.ok(!languageSuggestion.includes('window.location.href'));
});`,
  'ブラウザ言語リダイレクト検査を分離後の責務へ追従'
);

update(
  'tests/static-calculator-delivery.test.cjs',
  `test('UIモジュールは内容ハッシュ付きで読み込み、Service Workerも即時更新確認する', () => {
  const mainSource = read('js/main.js');
  const serviceWorker = read('sw.js');
  const assetSync = read('scripts/asset-sync.cjs');

  assert.match(mainSource, /from '\\.\\/main-calculator-ui\\.js\\?v=[a-f0-9]{10}';/);
  assert.match(mainSource, /register\\(swPath, \\{ updateViaCache: 'none' \\}\\)/);
  assert.match(mainSource, /reg\\.update\\(\\)/);
  assert.match(serviceWorker, /'\\.\\/js\\/main-calculator-ui\\.js\\?v=[a-f0-9]{10}'/);
  assert.match(assetSync, /syncMainCalculatorUiImportVersion/);
  assert.match(assetSync, /syncServiceWorkerRegistration/);
  assert.match(assetSync, /mainCalculatorUiVersion/);
});`,
  `test('UIモジュールは内容ハッシュ付きで読み込み、Service Workerも即時更新確認する', () => {
  const mainSource = read('js/main.js');
  const serviceWorkerRegistration = read('js/service-worker-registration.js');
  const serviceWorker = read('sw.js');
  const assetSync = read('scripts/asset-sync.cjs');

  assert.match(mainSource, /from '\\.\\/main-calculator-ui\\.js\\?v=[a-f0-9]{10}';/);
  assert.match(mainSource, /from '\\.\\/service-worker-registration\\.js';/);
  assert.match(serviceWorkerRegistration, /register\\(swPath, \\{ updateViaCache: 'none' \\}\\)/);
  assert.match(serviceWorkerRegistration, /reg\\.update\\(\\)/);
  assert.match(serviceWorker, /'\\.\\/js\\/main-calculator-ui\\.js\\?v=[a-f0-9]{10}'/);
  assert.match(serviceWorker, /'\\.\\/js\\/service-worker-registration\\.js'/);
  assert.match(assetSync, /syncMainCalculatorUiImportVersion/);
  assert.match(assetSync, /syncServiceWorkerRegistration/);
  assert.match(assetSync, /mainCalculatorUiVersion/);
});`,
  'Service Worker即時更新検査を専用モジュールへ追従'
);

console.log('tests now validate the extracted responsibility modules');
