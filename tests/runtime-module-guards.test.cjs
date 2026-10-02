'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createAppModuleRevision, collectAssetVersions, APP_MODULE_FILES, ROOT_SERVICE_WORKER_ASSETS } = require('../scripts/asset-sync.cjs');
const { cssTargets } = require('../.github/scripts/minify.cjs');
const { createHash } = require('node:crypto');
const { parseAttributes } = require('./helpers/markup-contract.cjs');
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

// raw textのscript/styleとコメントは1トークンで読み、本文の偽タグを参照にしない。
function publicAssetReferences(html) {
  const references=[];
  const tokens=/<!--[\s\S]*?(?:-->|$)|<(script|style)\b((?:"[^"]*"|'[^']*'|[^'">])*)>[\s\S]*?(?:<\/\1(?=[\s/>])[^>]*>|$)|<([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  for (const token of html.matchAll(tokens)) {
    const tag=(token[1]||token[3]||'').toLowerCase();
    if (!tag || tag==='style') continue;
    const attrs=parseAttributes(tag==='script'?'<script'+token[2]+'>':token[0]);
    if (tag==='link' && (attrs.rel||'').toLowerCase().split(/\s+/).includes('stylesheet')) references.push({href:attrs.href,extensions:['.css']});
    if (tag==='script' && attrs.src) references.push({href:attrs.src,extensions:['.js','.mjs']});
  }
  return references;
}
function assertPublicAssetReferences(html,file,base=root) {
  const { createRevision, resolveLocalAsset } = require('../scripts/article-asset-versioning.cjs');
  for (const reference of publicAssetReferences(html)) {
    const href = (reference.href || '').replaceAll('&amp;','&');
    if (/^(?:https?:)?\/\//i.test(href)) continue;
    const label = path.relative(base,file)+': '+href;
    const extension = reference.extensions.find(ext=>href.split(/[?#]/,1)[0].endsWith(ext));
    assert.ok(extension,label+': CSS/JS参照の拡張子が不正');
    const asset = resolveLocalAsset(base,file,href,extension);
    assert.ok(asset,label+': ローカル資産がありません');
    const versions = new URL(href,ORIGIN+'/').searchParams.getAll('v');
    assert.equal(versions.length,1,label+': 内容版は1つ必要');
    assert.match(versions[0],/^[a-f0-9]{10}$/i,label+': 内容版が不正');
    assert.equal(versions[0],createRevision(asset),label+': 実内容と参照版が異なります');
  }
}
test('公開HTMLのローカルCSS・JavaScriptは実在し、実内容と一致する版を参照する', t => {
  const { listPublicHtmlFiles,createRevision } = require('../scripts/article-asset-versioning.cjs');
  const files = listPublicHtmlFiles(root);
  assert.ok(files.length > 0);
  for (const file of files) assertPublicAssetReferences(fs.readFileSync(file,'utf8'),file);
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'playpoint-asset-markup-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  for (const asset of ['a.css','a.js','a.mjs']) fs.writeFileSync(path.join(base,asset),'fixture');
  const version=createRevision(path.join(base,'a.css'));
  const page=path.join(base,'index.html');
  const valid="<link href='/a.css?v="+version+"' rel='stylesheet'><script src='/a.mjs?v="+version+"'></script>";
  assertPublicAssetReferences(valid,page,base);
  assertPublicAssetReferences(`<!-- <link rel="stylesheet" href="missing.css"> --><script>const fake = '<link rel="stylesheet" href="fake.css">';</script>`+valid,page,base);
  assertPublicAssetReferences(`<script>const fake = '<link rel="stylesheet" href="fake.css">';</script\t\n bar>`+valid,page,base);
  for (const bad of [
    "<link href='/missing.css?v="+version+"' rel='stylesheet'>",
    "<link href='/a.css?v=0000000000' rel='stylesheet'>",
    "<link href='/a.css' rel='stylesheet'>",
    "<link href='/a.css?v="+version+"&v="+version+"' rel='stylesheet'>",
    "<script src='/missing.mjs?v="+version+"'></script>"
  ]) assert.throws(()=>assertPublicAssetReferences(bad,page,base));
});

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

test('主要計測イベントは実coreが受理し、未許可パラメータを送らない', () => {
  const { createAnalyticsRuntime, eventCalls } = require('./helpers/analytics-runtime.cjs');
  const { context } = createAnalyticsRuntime({consentStatus:'granted',ready:true});
  for (const eventName of [
    'calendar_reminder_added',
    'pwa_install_accepted',
    'widget_code_copied',
    'widget_referral_landed'
  ]) {
    assert.equal(context.PlayPointAnalytics.track(eventName,{private_raw_input:'secret'}),true,eventName);
    assert.deepEqual(Array.from(eventCalls(context,eventName)),[{}],eventName);
  }
});

test('地域表示の決定と保存責務はregion-navigationへ集約する', () => {
  const main = read('js/main.js');

  assert.match(main, /applyRegionFromPath/, 'mainがURL由来の地域初期化を委譲していません');
  assert.doesNotMatch(main, /STORAGE_REGION_KEY/, 'mainが地域保存キーを直接扱っています');
  assert.doesNotMatch(main, /playpointPreferredRegion/, 'mainが地域保存の実装詳細を直接所有しています');
});
