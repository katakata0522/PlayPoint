'use strict';

const fs = require('fs');
const path = require('path');

function syncHtmlFile(rootDir, file, assetVersions, todayStr) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf8');

  if (assetVersions.cssVersion) {
    content = content.replace(/style\.css\?v=[a-zA-Z0-9_-]+/g, `style.css?v=${assetVersions.cssVersion}`);
  }
  if (assetVersions.thirdPartyVersion) {
    content = content.replace(/third-party\.js\?v=[a-zA-Z0-9_-]+/g, `third-party.js?v=${assetVersions.thirdPartyVersion}`);
  }
  if (assetVersions.intentTrackingVersion) {
    content = content.replace(/intent-tracking\.js\?v=[a-zA-Z0-9_-]+/g, `intent-tracking.js?v=${assetVersions.intentTrackingVersion}`);
  }
  if (assetVersions.articleSharedCssVersion) {
    content = content.replace(/article-shared\.css\?v=[a-zA-Z0-9_-]+/g, `article-shared.css?v=${assetVersions.articleSharedCssVersion}`);
  }

  content = content.replace(/<meta name="last-modified" content="[^"]+">/g, `<meta name="last-modified" content="${todayStr}">`);
  content = content.replace(/<meta property="article:modified_time" content="[^"]+">/g, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
  content = content.replace(/"dateModified": "[^"]+"/g, `"dateModified": "${todayStr}"`);
  content = content.replace(/最終更新: \d{4}-\d{2}-\d{2}/g, `最終更新: ${todayStr}`);
  content = content.replace(/Last Modified: \d{4}-\d{2}-\d{2}/g, `Last Modified: ${todayStr}`);
  content = content.replace(/最後更新: \d{4}-\d{2}-\d{2}/g, `最後更新: ${todayStr}`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully synchronized asset versions and dates in ${file}`);
  return true;
}

function syncHtmlFiles(rootDir, files, assetVersions, todayStr) {
  for (const file of files) {
    syncHtmlFile(rootDir, file, assetVersions, todayStr);
  }
}

module.exports = {
  syncHtmlFile,
  syncHtmlFiles
};
