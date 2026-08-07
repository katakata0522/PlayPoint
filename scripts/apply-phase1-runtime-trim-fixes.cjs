'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`置換対象が見つかりません: ${label}`);
  const updated = content.replace(from, to);
  if (updated === content) throw new Error(`置換に失敗しました: ${label}`);
  return updated;
}

function patchServiceWorkerVersioning() {
  let source = read('scripts/asset-sync.cjs');
  source = replaceOnce(
    source,
    `const ROOT_SERVICE_WORKER_ASSETS = [\n  { versionKey: 'cssVersion', assetPath: './style.css' },\n  { versionKey: 'consentVersion', assetPath: './js/consent.js' },\n  { versionKey: 'thirdPartyVersion', assetPath: './js/third-party.js' },\n  { versionKey: 'intentTrackingVersion', assetPath: './js/intent-tracking.js' },\n  { versionKey: 'blogCssVersion', assetPath: './blog/style.css' },\n  { versionKey: 'blogScriptVersion', assetPath: './blog/script.js' },\n  { versionKey: 'blogComponentsVersion', assetPath: './blog/components.js' },\n  { versionKey: 'articleScriptVersion', assetPath: './blog/article.js' },\n  { versionKey: 'articleSharedCssVersion', assetPath: './articles/article-shared.css' },\n  { versionKey: 'mainCalculatorUiVersion', assetPath: './js/main-calculator-ui.js' },\n  { versionKey: 'mainVersion', assetPath: './js/main.js' },\n  { versionKey: 'appModuleRevision', assetPath: './js/app-modules' }\n];`,
    `const ROOT_SERVICE_WORKER_ASSETS = [\n  { versionKey: 'cssVersion', assetPath: './style.css' },\n  { versionKey: 'mainCalculatorUiVersion', assetPath: './js/main-calculator-ui.js' },\n  { versionKey: 'mainVersion', assetPath: './js/main.js' },\n  { versionKey: 'appModuleRevision', assetPath: './js/app-modules' }\n];`,
    'Service Worker cache revision inputs'
  );
  source = replaceOnce(
    source,
    '    content = replaceAssetVersion(content, assetPath, versions[versionKey]);\n',
    '    content = replaceOptionalAssetVersion(content, assetPath, versions[versionKey]);\n',
    'Service Worker optional asset versioning'
  );
  write('scripts/asset-sync.cjs', source);
}

function patchPreloadRegression() {
  let source = read('tests/playpoint-audit-fixes.test.cjs');
  source = replaceOnce(
    source,
    "  const dependencyModules = ['config.js', 'ui.js', 'diary.js', 'share.js', 'calculator.js'];\n",
    "  const dependencyModules = ['config.js', 'ui.js', 'share.js', 'calculator.js'];\n",
    'initial dependency module list'
  );
  source = replaceOnce(
    source,
    "    const preloadMain = html.match(new RegExp(`<link rel=\"modulepreload\" href=\"${prefix}js/main\\\\.js\\\\?v=([a-f0-9]{10})\">`));\n",
    "    assert.doesNotMatch(html, new RegExp(`<link rel=\"modulepreload\" href=\"${prefix}js/diary\\\\.js(?:\\\\?v=[^\"]+)?\">`), `${file}: diary.jsを初期先読みしています`);\n    const preloadMain = html.match(new RegExp(`<link rel=\"modulepreload\" href=\"${prefix}js/main\\\\.js\\\\?v=([a-f0-9]{10})\">`));\n",
    'explicit diary preload exclusion'
  );
  write('tests/playpoint-audit-fixes.test.cjs', source);
}

function patchRuntimeAssetRegression() {
  let source = read('tests/playpoint-regression.test.cjs');
  source = replaceOnce(
    source,
    "  const { createFileRevision } = require(path.join(root, 'scripts', 'asset-sync.cjs'));\n  const componentsVersion = createFileRevision(root, 'blog/components.js');\n  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');\n  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');\n",
    "  const { createFileRevision } = require(path.join(root, 'scripts', 'asset-sync.cjs'));\n  const componentsVersion = createFileRevision(root, 'blog/components.js');\n  const articleSharedVersion = createFileRevision(root, 'articles/article-shared.css');\n  const articleScriptVersion = createFileRevision(root, 'blog/article.js');\n  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');\n  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');\n",
    'runtime asset direct content versions'
  );
  source = replaceOnce(
    source,
    "  const articleSharedVersion = sw.match(/\\.\\/articles\\/article-shared\\.css\\?v=([0-9_a-z-]+)/)?.[1];\n  assert.ok(articleSharedVersion, 'sw.js does not version article-shared.css');\n  assert.match(sw, /\\.\\/blog\\/article\\.js\\?v=[0-9_a-z-]+/);\n",
    "  assert.ok(articleSharedVersion, 'article-shared.css content hash is missing');\n  assert.ok(articleScriptVersion, 'article.js content hash is missing');\n  assert.doesNotMatch(sw, /\\.\\/articles\\/article-shared\\.css/, 'article-shared.css should be runtime-cached, not precached');\n  assert.doesNotMatch(sw, /\\.\\/blog\\/article\\.js/, 'article.js should be runtime-cached, not precached');\n",
    'runtime assets are versioned outside Service Worker precache'
  );
  source = replaceOnce(
    source,
    "    assert.match(html, /\\.\\.\\/blog\\/article\\.js\\?v=[0-9_a-z-]+/, `${file} does not version article.js`);\n",
    "    assert.ok(html.includes(`../blog/article.js?v=${articleScriptVersion}`), `${file} does not match article.js content hash`);\n",
    'article script content hash assertion'
  );
  write('tests/playpoint-regression.test.cjs', source);
}

function strengthenLazyDiaryRegression() {
  let source = read('tests/mobile-performance-phase1.test.cjs');
  source = replaceOnce(
    source,
    "  const index = read('index.html');\n  assert.doesNotMatch(main, /import\\s+\\{\\s*DIARY\\s*\\}\\s+from\\s+['\"]\\.\\/diary\\.js['\"]/);\n  assert.match(main, /import\\(['\"]\\.\\/diary\\.js['\"]\\)/);\n  assert.doesNotMatch(index, /modulepreload[^>]+diary\\.js/);\n",
    "  assert.doesNotMatch(main, /import\\s+\\{\\s*DIARY\\s*\\}\\s+from\\s+['\"]\\.\\/diary\\.js['\"]/);\n  assert.match(main, /import\\(['\"]\\.\\/diary\\.js['\"]\\)/);\n  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {\n    assert.doesNotMatch(read(file), /modulepreload[^>]+diary\\.js/, `${file}: diary.jsを初期先読みしています`);\n  }\n",
    'all locale diary preload regression'
  );
  write('tests/mobile-performance-phase1.test.cjs', source);
}

function strengthenBrowserCacheCheck() {
  let source = read('.github/scripts/browser-smoke.cjs');
  source = replaceOnce(
    source,
    "      assert(!firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Service Worker precached diary.js before diary use');\n\n      await page.locator('#tab-diary').click();\n",
    "      const diaryPrecached = await page.evaluate(async () => {\n        const cacheNames = await caches.keys();\n        for (const cacheName of cacheNames) {\n          const cache = await caches.open(cacheName);\n          const requests = await cache.keys();\n          if (requests.some(request => new URL(request.url).pathname.endsWith('/js/diary.js'))) return true;\n        }\n        return false;\n      });\n      assert(!diaryPrecached, 'Service Worker precached diary.js before diary use');\n\n      await page.locator('#tab-diary').click();\n",
    'CacheStorage diary precache assertion'
  );
  write('.github/scripts/browser-smoke.cjs', source);
}

patchServiceWorkerVersioning();
patchPreloadRegression();
patchRuntimeAssetRegression();
strengthenLazyDiaryRegression();
strengthenBrowserCacheCheck();
console.log('Aligned lazy diary regressions, runtime asset versioning, and Service Worker cache revision inputs.');
