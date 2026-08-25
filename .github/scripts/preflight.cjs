'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { generatedFiles } = require('../../scripts/build-targets.cjs');
const { assetSyncMutableJsTargets, cssTargets } = require('./minify.cjs');

const root = path.resolve(__dirname, '../..');
const prepareDeploy = process.argv.includes('--prepare-deploy');
const testFiles = fs.readdirSync(path.join(root, 'tests'))
  .filter(file => file.endsWith('.test.cjs'))
  .sort()
  .map(file => path.join('tests', file));
// 全回帰は圧縮前に一度実行済み。圧縮後はCSS圧縮・asset version同期によって
// 実際に変わる配信境界（公開HTML/モジュール参照/Service Worker）だけ再検査する。
const postMinifyTestFiles = [
  'tests/static-calculator-delivery.test.cjs',
  'tests/runtime-module-guards.test.cjs'
].filter(relativePath => fs.existsSync(path.join(root, relativePath)));
// 通常検証では、CSS圧縮とasset version同期が触り得る公開資産を元へ戻す。
// --prepare-deploy は配信用の生成・圧縮差分だけを保持し、記事正規化は常にcheck-onlyで扱う。
const mutableFiles = [...new Set([...generatedFiles, ...cssTargets, ...assetSyncMutableJsTargets])];
const requiredPublicFiles = [
  'index.html',
  'en/index.html',
  'ko/index.html',
  'tw/index.html',
  'hk/index.html',
  'in/index.html',
  'pwa-launch.html'
];
const snapshots = new Map();
const failures = [];

function snapshotMutableFiles() {
  for (const relativePath of mutableFiles) {
    const absolutePath = path.join(root, relativePath);
    snapshots.set(relativePath, fs.existsSync(absolutePath)
      ? fs.readFileSync(absolutePath)
      : null);
  }
}

function restoreMutableFiles() {
  for (const [relativePath, content] of snapshots) {
    const absolutePath = path.join(root, relativePath);
    if (content === null) {
      fs.rmSync(absolutePath, { force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }
}

function runPhase(name, command, args) {
  console.log('\n=== ' + name + ' ===');
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });

  if (result.error || result.status !== 0) {
    failures.push(name);
    if (result.error) console.error(result.error.message);
  }
}

function verifyRequiredPublicFiles() {
  console.log('\n=== 公開必須ファイル検証 ===');
  const missingFiles = requiredPublicFiles.filter(relativePath => !fs.existsSync(path.join(root, relativePath)));

  if (missingFiles.length > 0) {
    missingFiles.forEach(relativePath => console.error('公開必須ファイルがありません: ' + relativePath));
    failures.push('公開必須ファイル検証');
    return;
  }

  console.log('公開必須ファイルが揃っています。');
}

function serviceWorkerAssetToLocalPath(assetUrl) {
  const pathWithoutQuery = assetUrl.split(/[?#]/, 1)[0].replace(/^\.\//, '');
  return pathWithoutQuery === '' || pathWithoutQuery.endsWith('/')
    ? path.join(pathWithoutQuery, 'index.html')
    : pathWithoutQuery;
}

function verifyServiceWorkerPrecacheAssets() {
  console.log('\n=== Service Worker先読み対象検証 ===');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const assetsBlock = serviceWorker.match(/const ASSETS = \[([\s\S]*?)\];/);

  if (!assetsBlock) {
    console.error('sw.jsのASSETS定義を解析できません。');
    failures.push('Service Worker先読み対象検証');
    return;
  }

  const assetUrls = [...assetsBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  const missingAssets = assetUrls
    .map(assetUrl => ({ assetUrl, localPath: serviceWorkerAssetToLocalPath(assetUrl) }))
    .filter(({ localPath }) => !fs.existsSync(path.join(root, localPath)));

  if (missingAssets.length > 0) {
    missingAssets.forEach(({ assetUrl, localPath }) => {
      console.error(`Service Worker先読み対象がありません: ${assetUrl} -> ${localPath}`);
    });
    failures.push('Service Worker先読み対象検証');
    return;
  }

  console.log(`Service Worker先読み対象が揃っています（${assetUrls.length}件）。`);
}

snapshotMutableFiles();

try {
  runPhase('JavaScript構文検証', process.execPath, ['.github/scripts/verify-js-syntax.cjs']);
  verifyRequiredPublicFiles();
  runPhase('生成物の再現性検証', process.execPath, ['.github/scripts/verify-build-output.cjs']);
  verifyServiceWorkerPrecacheAssets();
  runPhase('最新情報ハブ鮮度検証', process.execPath, ['scripts/latest-hub-audit.cjs', '--fresh']);
  runPhase('公開記事の検索意図・内部リンク検証', process.execPath, ['scripts/article-content-navigation-normalize.cjs', '--check']);
  runPhase('公開記事SEO検証', process.execPath, ['scripts/article-seo-normalize.cjs', '--check']);
  runPhase('公開記事の3クリック以内検証', process.execPath, ['scripts/site-click-depth.cjs']);
  runPhase('全回帰テスト', process.execPath, ['--test', ...testFiles]);
  runPhase('ads.txt検証', process.execPath, ['.github/scripts/check-ads-txt.cjs']);
  runPhase('公開アセット圧縮', process.execPath, ['.github/scripts/minify.cjs']);
  runPhase('圧縮後JavaScript構文検証', process.execPath, ['.github/scripts/verify-js-syntax.cjs']);
  runPhase('圧縮後の配信境界回帰テスト', process.execPath, ['--test', ...postMinifyTestFiles]);
} finally {
  if (!prepareDeploy) restoreMutableFiles();
}

if (failures.length > 0) {
  console.error('\n事前検証で失敗した工程:');
  failures.forEach(name => console.error('- ' + name));
  console.error('\n記事追加や生成物のずれなら、先に node scripts/prepare-pr.cjs を実行して差分をコミットしてください。');
  console.error('検査条件自体は変わりません。生成物・静的導線・公式リンクの手順漏れを先に揃えます。');
  process.exitCode = 1;
} else {
  console.log(
    '\n全事前検証に成功しました（全回帰: ' + testFiles.length
    + '件 / 圧縮後配信境界: ' + postMinifyTestFiles.length + '件）。'
  );
}
