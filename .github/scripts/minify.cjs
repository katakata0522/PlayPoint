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
  // JSは正規表現でコメントを削ると文字列や正規表現リテラルを壊すため、保守的に空白だけ整える。
  return content
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const cssTargets = [
  'style.css',
  'articles/article-gift-card.css',
  'articles/article-legacy.css',
  'articles/article-modern.css',
  'articles/article-shared.css',
  'articles/source-notice.css',
  'blog/style.css',
  'en/articles/intl-article.css',
  ...fs.existsSync(path.join(root, 'articles', 'styles'))
    ? fs.readdirSync(path.join(root, 'articles', 'styles'))
      .filter(file => file.endsWith('.css'))
      .sort()
      .map(file => path.join('articles', 'styles', file))
    : []
];

const jsTargets = [
  'sw.js',
  'js/main.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
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
    syncThirdPartyConsentVersion
  } = require('../../scripts/asset-sync.cjs');
  const {
    syncDynamicArticleStylesheetVersion,
    syncPublicAssetVersions
  } = require('../../scripts/article-asset-versioning.cjs');

  for (const file of resolveTargets(cssTargets)) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const min = minifyCSS(raw);
      fs.writeFileSync(file, min, 'utf8');
      console.log(`Minified CSS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
    }
  }

  for (const file of resolveTargets(jsTargets)) {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const min = minifyJS(raw);
      fs.writeFileSync(file, min, 'utf8');
      console.log(`Minified JS: ${path.basename(file)} (${raw.length} -> ${min.length} bytes)`);
    }
  }

  syncDynamicArticleStylesheetVersion(root);
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  let versions = collectAssetVersions(root, indexHtml);
  syncThirdPartyConsentVersion(root, versions.consentVersion);
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
