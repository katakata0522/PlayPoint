'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { INTERNATIONAL_LOCALES } = require('./locale-ids.cjs');

const root = path.resolve(__dirname, '..');
const OFFICIAL_SOURCE_PATTERN = /support\.google\.com\/googleplay|play\.google\.com\/store\/apps\/editorial/;

function run(name, args, extraEnv = {}) {
  console.log('\n=== ' + name + ' ===');
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function committedBuildPins() {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
  const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
  if (!modifiedDate || !assetVersion) {
    console.error('index.html の last-modified または sw.js のアセット版を読めません。');
    process.exit(1);
  }
  return { modifiedDate, assetVersion };
}

function scanOfficialSources() {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
  const japanese = registry.map(article => String(article.file || '').replace(/^\.\.\//, ''));
  const international = INTERNATIONAL_LOCALES.flatMap(locale => {
    const directory = path.join(root, locale, 'articles');
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory)
      .filter(file => file.endsWith('.html') && file !== 'index.html')
      .map(file => `${locale}/articles/${file}`);
  });
  const files = [...new Set([...japanese, ...international])].filter(Boolean);
  return files.filter(file => {
    const absolutePath = path.join(root, file);
    if (!fs.existsSync(absolutePath)) return true;
    return !OFFICIAL_SOURCE_PATTERN.test(fs.readFileSync(absolutePath, 'utf8'));
  });
}

const pins = committedBuildPins();
run('生成物の同期（日付・アセット版はコミット済み値で固定）', ['scripts/build-html.js'], {
  PLAYPOINT_MODIFIED_DATE: pins.modifiedDate,
  PLAYPOINT_ASSET_VERSION: pins.assetVersion
});
run('記事内関連リンクの正規化', ['scripts/article-content-navigation-normalize.cjs']);
run('公開記事の3クリック以内検証', ['scripts/site-click-depth.cjs']);

const missingOfficial = scanOfficialSources();
if (missingOfficial.length > 0) {
  console.error('\n公式ヘルプリンクがありません。support.google.com/googleplay または play.google.com/store/apps/editorial を本文HTMLへ入れてください:');
  for (const file of missingOfficial) console.error('- ' + file);
  process.exit(1);
}

const status = spawnSync('git', ['--no-pager', 'status', '--short'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' }
});
console.log('\n作業ツリー:');
console.log((status.stdout || '').trim() || '(clean)');
console.log('\n生成物を確認してコミットしてください。日付とアセット版は固定済みです:');
console.log(`  PLAYPOINT_MODIFIED_DATE=${pins.modifiedDate}`);
console.log(`  PLAYPOINT_ASSET_VERSION=${pins.assetVersion}`);
console.log('\n全事前検証は node .github/scripts/preflight.cjs --prepare-deploy です。');
