'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createAppModuleRevision, collectAssetVersions, APP_MODULE_FILES, ROOT_SERVICE_WORKER_ASSETS } = require('../scripts/asset-sync.cjs');
const { cssTargets } = require('../.github/scripts/minify.cjs');
const { createHash } = require('node:crypto');
const { runEsmProbe, ORIGIN } = require('./helpers/runtime-esm.cjs');
const { createRuntime } = require('./helpers/service-worker-runtime.cjs');
const { observeComponentStyles } = require('./helpers/component-styles.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const runtimeModules = [
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
  'js/calculator-funnel-analytics.js'
];

// URL比較は引用符・コメントではなくESMの能動的な依存とinstall時の要求が対象。
const graph = runEsmProbe({ kind: 'graph' });
const revision = file => createHash('sha256').update(read(file).replace(/\r\n/g, '\n')).digest('hex').slice(0, 10);

test('分離した実行時モジュールは実import・cache改訂・実先読み要求へ結線される', async (t) => {
  const worker = createRuntime();
  await worker.fireInstall();
  const precache = new Set(worker.addAllCalls.flat().map(item => new URL(item.url, `${ORIGIN}/`).href));
  const modulePaths = new Set(graph.map(item => new URL(item.url).pathname.slice(1)));
  for (const file of runtimeModules) {
    assert.ok(modulePaths.has(file), `起動グラフから欠落: ${file}`);
    assert.ok(APP_MODULE_FILES.includes(file), `cache改訂対象から欠落: ${file}`);
  }
  for (const module of graph) {
    assert.ok(precache.has(module.url), `静的依存の実URLが先読みにない: ${module.url}`);
  }
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-runtime-revision-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, 'js'));
  for (const file of runtimeModules) fs.writeFileSync(path.join(fixture, file), read(file));
  const before = createAppModuleRevision(fixture);
  for (const file of runtimeModules) {
    fs.appendFileSync(path.join(fixture, file), '\n// 改訂検知の独立入力\n');
    assert.notEqual(createAppModuleRevision(fixture), before, `内容変更がcache世代へ反映されない: ${file}`);
    fs.writeFileSync(path.join(fixture, file), read(file));
  }
});

test('共通計測とブログCSSの実参照は内容hashと一致し、CSSだけが圧縮対象になる', async () => {
  const analytics = 'js/analytics-core.js';
  const stylesheet = 'blog/common-components.css';
  const versions = collectAssetVersions(root);
  assert.equal(versions.analyticsCoreVersion, revision(analytics));
  assert.equal(versions.blogCommonComponentsCssVersion, revision(stylesheet));
  assert.ok(cssTargets.includes(stylesheet), 'ブログ共通CSSが圧縮対象から欠落');
  assert.ok(!cssTargets.includes(analytics), 'JSをCSS圧縮対象へ混入しない');
  assert.ok(ROOT_SERVICE_WORKER_ASSETS.some(asset => asset.assetPath === './' + analytics));
  const expectedAnalytics = `${ORIGIN}/${analytics}?v=${revision(analytics)}`;
  const config = graph.find(item => new URL(item.url).pathname === '/js/config.js');
  assert.ok(config?.imports.includes(expectedAnalytics), 'configの能動的なimportと実資産のhashが異なる');
  const worker = createRuntime();
  await worker.fireInstall();
  assert.ok(worker.addAllCalls.flat().some(item => new URL(item.url, `${ORIGIN}/`).href === expectedAnalytics));
  for (const pathname of ['/blog/', '/articles/guide.html', '/latest/']) {
    const links = observeComponentStyles(pathname);
    assert.equal(links.length, 1, `${pathname}: 二重起動でも共通CSSは一つ`);
    assert.equal(links[0].rel, 'stylesheet');
    assert.equal(links[0].href, `${ORIGIN}/${stylesheet}?v=${revision(stylesheet)}`);
  }
});

test('アプリモジュールのキャッシュ世代は改行コードが違っても一致する', (t) => {
  const lfRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-lf-'));
  const crlfRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-crlf-'));
  const moduleFiles = ['config.js', 'ui.js', 'diary.js', 'calculator.js', 'share.js'];

  t.after(() => {
    fs.rmSync(lfRoot, { recursive: true, force: true });
    fs.rmSync(crlfRoot, { recursive: true, force: true });
  });

  for (const targetRoot of [lfRoot, crlfRoot]) {
    fs.mkdirSync(path.join(targetRoot, 'js'), { recursive: true });
  }

  for (const [index, file] of moduleFiles.entries()) {
    const source = `'use strict';\nconst value = ${index};\n`;
    fs.writeFileSync(path.join(lfRoot, 'js', file), source);
    fs.writeFileSync(path.join(crlfRoot, 'js', file), source.replace(/\n/g, '\r\n'));
  }

  assert.equal(createAppModuleRevision(lfRoot), createAppModuleRevision(crlfRoot));
  fs.appendFileSync(path.join(crlfRoot, 'js/config.js'), '\nconst changed = true;\n');
  assert.notEqual(createAppModuleRevision(lfRoot), createAppModuleRevision(crlfRoot), '内容変更を固定hashで見逃さない');
});

test('公開HTMLは外部Google Fontsへ接続しない', () => {
  const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'tests') continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute, out);
      else if (entry.name.endsWith('.html')) out.push(absolute);
    }
    return out;
  };

  for (const file of walk(root)) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, path.relative(root, file));
  }
});

// R05: コード長の代用検査は廃止。必須embed-widget-smokeで独立読込と4言語の実計算を検証する。

test('埋め込みジェネレーターの計測と地域導線は共通境界・6地域へ揃える', () => {
  const embed = read('embed.html');
  assert.match(embed, /PlayPointAnalytics\?\.track\('widget_code_copied'/);
  assert.doesNotMatch(embed, /window\.gtag\('event', 'widget_code_copied'/);
  assert.match(embed, /HK: 'hk\/'/);
  assert.match(embed, /IN: 'in\/'/);
  assert.match(embed, /browserLang\.startsWith\('zh-hk'\)/);
  assert.match(embed, /browserLang\.startsWith\('en-in'\)/);
});

test('許可された主要計測イベント名が設定に残る', () => {
  const analyticsCore = read('js/analytics-core.js');
  for (const eventName of [
    'calendar_reminder_added',
    'pwa_install_accepted',
    'widget_code_copied',
    'widget_referral_landed'
  ]) {
    assert.ok(analyticsCore.includes(eventName), eventName);
  }
});

test('地域表示の決定と保存責務はregion-navigationへ集約する', () => {
  const main = read('js/main.js');

  assert.match(main, /applyRegionFromPath/, 'mainがURL由来の地域初期化を委譲していません');
  assert.doesNotMatch(main, /STORAGE_REGION_KEY/, 'mainが地域保存キーを直接扱っています');
  assert.doesNotMatch(main, /playpointPreferredRegion/, 'mainが地域保存の実装詳細を直接所有しています');
});
