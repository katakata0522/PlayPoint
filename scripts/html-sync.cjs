'use strict';

const fs = require('fs');
const path = require('path');
const { replaceAssetVersion, replaceDateMetadata } = require('./html-replacements.cjs');

const CONTENT_DATE_OVERRIDES = Object.freeze({
  'info.html': '2026-07-26',
  'latest/index.html': '2026-07-26',
  'embed.html': '2026-07-27',
  'en/articles/2026-06-20-discount-gift-cards.html': '2026-07-25',
  'ko/articles/2026-06-20-discount-gift-cards.html': '2026-07-25',
  'tw/articles/2026-06-20-discount-gift-cards.html': '2026-07-25'
});

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
    syncHtmlFile(rootDir, file, assetVersions, CONTENT_DATE_OVERRIDES[file] || todayStr);
  }
}

module.exports = {
  CONTENT_DATE_OVERRIDES,
  syncHtmlFile,
  syncHtmlFiles
};
