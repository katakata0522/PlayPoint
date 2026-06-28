'use strict';

const fs = require('fs');
const path = require('path');
const { replaceAssetVersion, replaceDateMetadata } = require('./html-replacements.cjs');

function syncHtmlFile(rootDir, file, assetVersions, todayStr) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf8');

  content = replaceAssetVersion(content, 'style.css', assetVersions.cssVersion);
  content = replaceAssetVersion(content, 'third-party.js', assetVersions.thirdPartyVersion);
  content = replaceAssetVersion(content, 'intent-tracking.js', assetVersions.intentTrackingVersion);
  content = replaceAssetVersion(content, 'article-shared.css', assetVersions.articleSharedCssVersion);
  content = replaceAssetVersion(content, 'article.js', assetVersions.articleScriptVersion);
  content = replaceDateMetadata(content, todayStr, {
    includeEnglish: true,
    includeTraditionalChinese: true
  });

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
