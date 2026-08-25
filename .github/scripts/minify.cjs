const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // コメント削除
    .replace(/\r?\n\s*/g, '\n') // 改行とインデントを詰める
    .replace(/\n+/g, '\n') // 連続する改行を1つに
    .trim();
}

const cssTargets = [
  'style.css',
  'visitor-thanks.css',
  'articles/article-gift-card.css',
  'articles/article-legacy.css',
  'articles/article-modern.css',
  'articles/article-shared.css',
  'articles/source-notice.css',
  'blog/style.css',
  'blog/common-components.css',
  'en/articles/intl-article.css',
  ...fs.existsSync(path.join(root, 'articles', 'styles'))
    ? fs.readdirSync(path.join(root, 'articles', 'styles'))
      .filter(file => file.endsWith('.css'))
      .sort()
      .map(file => path.join('articles', 'styles', file))
    : []
];

// JSは圧縮しない。下記はasset version同期によって実際に内容が変わり得るJSだけ。
// preflightの通常実行時に作業ツリーを復元するため、変更可能範囲を明示する。
const assetSyncMutableJsTargets = [
  'sw.js',
  'js/third-party.js',
  'js/config.js',
  'js/points-cost.js',
  'blog/article.js',
  'blog/components.js'
];

function resolveTargets(targets) {
  return targets.map((target) => path.join(root, target));
}

function main() {
  const {
    collectAssetVersions,
    syncRootServiceWorker,
    syncSharedRuntimeAssetVersions
  } = require('../../scripts/asset-sync.cjs');
  const {
    syncDynamicArticleStylesheetVersion,
    syncPublicAssetVersions
  } = require('../../scripts/article-asset-versioning.cjs');

  for (const file of resolveTargets(cssTargets)) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const min = minifyCSS(raw);
      if (min !== raw) fs.writeFileSync(file, min, 'utf8');
      console.log(`Minified CSS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
    }
  }

  syncDynamicArticleStylesheetVersion(root);
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  let versions = collectAssetVersions(root, indexHtml);
  syncSharedRuntimeAssetVersions(root, versions);
  versions = collectAssetVersions(root, indexHtml);

  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
  if (!assetVersion) throw new Error('Service Workerのビルド識別子を取得できません。');
  syncRootServiceWorker(root, assetVersion, versions);
  syncPublicAssetVersions(root);
}

if (require.main === module) {
  main();
}

module.exports = { assetSyncMutableJsTargets, cssTargets, minifyCSS, main };
