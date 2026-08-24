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

function minifyJS(content) {
  // JSは正規表現で安全にminifyできないため、圧縮候補量の計測だけに使う。
  // 本番用JSはコミット済みソースをそのまま配信し、この処理では書き換えない。
  return content
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
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

// 以前はこの一覧へ擬似minifyを適用していたが、実測で削減がほぼ0〜1 byte/ファイルだった。
// 現在は書き換えず、削減候補量だけを計測して本番JSをコミット内容と一致させる。
const jsTargets = [
  'sw.js',
  'js/main.js',
  'js/points-cost.js',
  'js/analytics-core.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
  'js/calculator-funnel-analytics.js',
  'js/main-calculator-ui.js',
  'js/calculator.js',
  'js/ui.js',
  'js/diary.js',
  'js/share.js',
  'js/config.js',
  'js/consent.js',
  'js/intent-tracking.js',
  'js/third-party.js',
  'blog/article.js',
  'blog/components.js',
  'blog/script.js',
  'blog/utils.js',
  'embed/playpoint-widget.js'
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

  let jsFiles = 0;
  let potentialJsSavings = 0;
  for (const file of resolveTargets(jsTargets)) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const compacted = minifyJS(raw);
    jsFiles += 1;
    potentialJsSavings += raw.length - compacted.length;
  }
  console.log(
    `Skipped JS whitespace rewrite: ${jsFiles} files, ${potentialJsSavings} bytes potential savings; committed JS stays unchanged.`
  );

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

module.exports = { cssTargets, jsTargets, minifyCSS, minifyJS };
