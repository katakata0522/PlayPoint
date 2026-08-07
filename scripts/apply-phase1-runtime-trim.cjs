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

function patchMain() {
  let source = read('js/main.js');
  source = replaceOnce(source, "import { DIARY } from './diary.js';\n", '', 'main diary static import');

  const anchor = "import { registerServiceWorker } from './service-worker-registration.js';\n\n";
  const lazyLoader = `import { registerServiceWorker } from './service-worker-registration.js';\n\nlet diaryModulePromise = null;\n\nfunction loadDiaryModule() {\n    if (!diaryModulePromise) {\n        diaryModulePromise = import('./diary.js').catch((error) => {\n            diaryModulePromise = null;\n            throw error;\n        });\n    }\n    return diaryModulePromise;\n}\n\nfunction reportDiaryLoadError(error) {\n    console.error('日記機能の読み込みに失敗しました:', error);\n    const message = CONFIGS[STATE.currentRegion]?.uiText?.toastDiaryLoadError || '日記機能の読み込みに失敗しました。';\n    UI.showToast(message, 'error');\n}\n\nfunction queueDiaryAction(action) {\n    void loadDiaryModule()\n        .then(({ DIARY }) => action(DIARY))\n        .catch(reportDiaryLoadError);\n}\n\n`;
  source = replaceOnce(source, anchor, lazyLoader, 'lazy diary loader');

  source = replaceOnce(
    source,
    "    if (STATE.dom.diaryMode && !STATE.dom.diaryMode.classList.contains(CONSTANTS.CLASS_HIDDEN)) DIARY.renderDiary();\n",
    "    if (STATE.dom.diaryMode && !STATE.dom.diaryMode.classList.contains(CONSTANTS.CLASS_HIDDEN)) {\n        queueDiaryAction((DIARY) => DIARY.renderDiary());\n    }\n",
    'region diary render'
  );

  source = replaceOnce(source, "    bindEvent(STATE.dom.exportDiaryBtn, 'click', () => DIARY.exportDiary());\n", "    bindEvent(STATE.dom.exportDiaryBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.exportDiary()));\n", 'export diary');
  source = replaceOnce(source, "    bindEvent(STATE.dom.importDiaryBtn, 'click', () => DIARY.toggleImportArea());\n", "    bindEvent(STATE.dom.importDiaryBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.toggleImportArea()));\n", 'import diary');
  source = replaceOnce(source, "    bindEvent(STATE.dom.confirmImportBtn, 'click', () => DIARY.executeImport());\n", "    bindEvent(STATE.dom.confirmImportBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.executeImport()));\n", 'confirm diary import');

  source = replaceOnce(
    source,
    "            if (mode === CONSTANTS.MODE_DIARY) {\n                DIARY.renderDiary();\n            }\n",
    "            if (mode === CONSTANTS.MODE_DIARY) {\n                queueDiaryAction((DIARY) => DIARY.renderDiary());\n            }\n",
    'diary tab render'
  );

  source = replaceOnce(
    source,
    "    if (STATE.dom.prevYearBtn) STATE.dom.prevYearBtn.addEventListener('click', () => { if (STATE.diaryState.currentYear > 2023) { STATE.diaryState.currentYear--; DIARY.renderDiary(); } });\n",
    "    if (STATE.dom.prevYearBtn) STATE.dom.prevYearBtn.addEventListener('click', () => {\n        if (STATE.diaryState.currentYear > 2023) {\n            STATE.diaryState.currentYear--;\n            queueDiaryAction((DIARY) => DIARY.renderDiary());\n        }\n    });\n",
    'diary previous year'
  );
  source = replaceOnce(
    source,
    "    if (STATE.dom.nextYearBtn) STATE.dom.nextYearBtn.addEventListener('click', () => { STATE.diaryState.currentYear++; DIARY.renderDiary(); });\n",
    "    if (STATE.dom.nextYearBtn) STATE.dom.nextYearBtn.addEventListener('click', () => {\n        STATE.diaryState.currentYear++;\n        queueDiaryAction((DIARY) => DIARY.renderDiary());\n    });\n",
    'diary next year'
  );
  source = replaceOnce(
    source,
    "    if (STATE.dom.weekInputs) STATE.dom.weekInputs.addEventListener('click', (e) => DIARY.handleDiarySave(e));\n",
    "    if (STATE.dom.weekInputs) STATE.dom.weekInputs.addEventListener('click', (e) => queueDiaryAction((DIARY) => DIARY.handleDiarySave(e)));\n",
    'diary week save'
  );

  if (/import\s+\{\s*DIARY\s*\}/.test(source)) throw new Error('DIARYの静的importが残っています');
  if (!source.includes("import('./diary.js')")) throw new Error('DIARYの動的importがありません');
  write('js/main.js', source);
}

function patchIndex() {
  let html = read('index.html');
  html = replaceOnce(html, '    <link rel="modulepreload" href="js/diary.js">\n', '', 'diary modulepreload');
  write('index.html', html);
}

function patchServiceWorker() {
  let source = read('sw.js');
  const assets = `const ASSETS = [\n  './',\n  './style.css',\n  './favicon.svg',\n  './manifest.json',\n  './icon-192.png',\n  './icon-512.png',\n  './js/config.js',\n  './js/ui.js',\n  './js/calculator.js',\n  './js/share.js',\n  './js/main-calculator-ui.js',\n  './js/main.js',\n  './js/web-vitals.js',\n  './js/region-navigation.js',\n  './js/language-suggestion.js',\n  './js/calendar-reminder.js',\n  './js/pwa-install.js',\n  './js/widget-referral.js',\n  './js/service-worker-registration.js',\n  './en/',\n  './ko/',\n  './tw/'\n];`;
  const pattern = /const ASSETS = \[[\s\S]*?\n\];/;
  if (!pattern.test(source)) throw new Error('Service WorkerのASSETS配列が見つかりません');
  source = source.replace(pattern, assets);
  write('sw.js', source);
}

function patchBrowserSmoke() {
  let source = read('.github/scripts/browser-smoke.cjs');

  source = replaceOnce(
    source,
    "  const page = await context.newPage();\n  const browserState = observeBrowser(page, origin);\n\n  try {\n    await openPage(page, new URL(locale.path, baseUrl).href);\n",
    "  const page = await context.newPage();\n  const browserState = observeBrowser(page, origin);\n  const firstPartyRequests = [];\n  page.on('request', request => {\n    try {\n      const url = new URL(request.url());\n      if (url.origin === origin) firstPartyRequests.push(url.pathname);\n    } catch {}\n  });\n\n  try {\n    await openPage(page, new URL(locale.path, baseUrl).href);\n",
    'browser request tracking'
  );

  const oldServiceWorker = `    let serviceWorker = { checked: false };\n    if (locale.key === 'JP') {\n      const ready = await page.evaluate(() => Promise.race([\n        navigator.serviceWorker?.ready.then(() => true).catch(() => false),\n        new Promise(resolve => setTimeout(() => resolve(false), 12_000))\n      ]));\n      assert(ready, 'Service Worker did not become ready');\n      await page.reload({ waitUntil: 'commit', timeout: 45_000 });\n      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });\n      await waitForStage(page, 'JP app initialization after Service Worker reload', () => (\n        document.querySelector('#currentStatus')?.options.length >= 2\n      ));\n      const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));\n      assert(controlled, 'Service Worker did not control the reloaded page');\n      serviceWorker = { checked: true, ready, controlled };\n    }\n\n    await page.waitForTimeout(locale.key === 'JP' ? 3_500 : 700);\n    browserState.verify(\`${'${locale.key}'} hydrated browser errors\`);\n    return { ...header, selectedRate, mainResult, reverseResult, serviceWorker, errors: browserState.values };`;

  const newServiceWorker = `    let serviceWorker = { checked: false };\n    let lazyDiary = { checked: false };\n    if (locale.key === 'JP') {\n      assert(!firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Diary module loaded before diary tab was used');\n      const ready = await page.evaluate(() => Promise.race([\n        navigator.serviceWorker?.ready.then(() => true).catch(() => false),\n        new Promise(resolve => setTimeout(() => resolve(false), 12_000))\n      ]));\n      assert(ready, 'Service Worker did not become ready');\n      await page.reload({ waitUntil: 'commit', timeout: 45_000 });\n      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });\n      await waitForStage(page, 'JP app initialization after Service Worker reload', () => (\n        document.querySelector('#currentStatus')?.options.length >= 2\n      ));\n      const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));\n      assert(controlled, 'Service Worker did not control the reloaded page');\n      assert(!firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Service Worker precached diary.js before diary use');\n\n      await page.locator('#tab-diary').click();\n      await waitForStage(page, 'JP lazy diary render', () => Boolean(document.querySelector('#weekInputs .week-row')));\n      assert(firstPartyRequests.some(pathname => pathname.endsWith('/js/diary.js')), 'Diary module was not fetched on first diary use');\n\n      await context.setOffline(true);\n      await page.reload({ waitUntil: 'commit', timeout: 45_000 });\n      await page.locator('#calculateButton').waitFor({ state: 'attached', timeout: 30_000 });\n      await waitForStage(page, 'JP offline core initialization', () => document.querySelector('#currentStatus')?.options.length >= 2);\n      await page.locator('#tab-diary').click();\n      await waitForStage(page, 'JP offline diary after first use', () => Boolean(document.querySelector('#weekInputs .week-row')));\n      await context.setOffline(false);\n\n      serviceWorker = { checked: true, ready, controlled, offlineCore: true };\n      lazyDiary = { checked: true, deferredUntilUse: true, offlineAfterUse: true };\n    }\n\n    await page.waitForTimeout(locale.key === 'JP' ? 700 : 700);\n    browserState.verify(\`${'${locale.key}'} hydrated browser errors\`);\n    return { ...header, selectedRate, mainResult, reverseResult, serviceWorker, lazyDiary, errors: browserState.values };`;

  source = replaceOnce(source, oldServiceWorker, newServiceWorker, 'browser lazy diary and offline smoke');
  write('.github/scripts/browser-smoke.cjs', source);
}

function patchTests() {
  let source = read('tests/mobile-performance-phase1.test.cjs');
  const addition = `\n\ntest('日記は初期モジュールグラフと先読みから外し、利用時だけ動的読込する', () => {\n  const main = read('js/main.js');\n  const index = read('index.html');\n  assert.doesNotMatch(main, /import\\s+\\{\\s*DIARY\\s*\\}\\s+from\\s+['\"]\\.\\/diary\\.js['\"]/);\n  assert.match(main, /import\\(['\"]\\.\\/diary\\.js['\"]\\)/);\n  assert.doesNotMatch(index, /modulepreload[^>]+diary\\.js/);\n});\n\ntest('Service Workerの初回キャッシュは必須シェルだけに絞り、重い任意資産は利用時キャッシュへ回す', () => {\n  const sw = read('sw.js');\n  const assets = (sw.match(/const ASSETS = \\[([\\s\\S]*?)\\n\\];/) || [])[1] || '';\n  for (const required of [\n    './', './style.css', './manifest.json', './js/main.js', './js/config.js',\n    './js/ui.js', './js/calculator.js', './js/share.js', './js/web-vitals.js',\n    './en/', './ko/', './tw/'\n  ]) {\n    assert.ok(assets.includes(\`'\${required}'\`) || assets.includes(\`'\${required}?v=\`), \`必須シェルが初回キャッシュから消えています: \${required}\`);\n  }\n  for (const optional of [\n    './ogp.png', './info.html', './changelog.html', './attention.html', './js/diary.js',\n    './js/third-party.js', './blog/script.js', './blog/article.js', './articles/'\n  ]) {\n    assert.ok(!assets.includes(optional), \`任意資産を初回キャッシュしています: \${optional}\`);\n  }\n  assert.match(sw, /handleStaticRequest/);\n  assert.match(sw, /cache\\.put\\(cacheKey, networkResponse\\.clone\\(\\)\\)/);\n});\n`;
  if (source.includes("日記は初期モジュールグラフと先読みから外し")) throw new Error('追加回帰テストが既に存在します');
  source += addition;
  write('tests/mobile-performance-phase1.test.cjs', source);
}

patchMain();
patchIndex();
patchServiceWorker();
patchBrowserSmoke();
patchTests();
console.log('Applied runtime trimming: lazy diary + lean Service Worker precache.');
