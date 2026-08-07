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
strengthenLazyDiaryRegression();
strengthenBrowserCacheCheck();
console.log('Aligned lazy diary regressions and Service Worker content versioning.');
