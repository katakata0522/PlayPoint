'use strict';

const fs = require('fs');
const path = require('path');
const { replaceAssetVersion, replaceDateMetadata } = require('./html-replacements.cjs');

const ROOT_SERVICE_WORKER_CACHE_REVISION = 'r3';

const ROOT_SERVICE_WORKER_ASSETS = [
  { versionKey: 'cssVersion', assetPath: './style.css' },
  { versionKey: 'consentVersion', assetPath: './js/consent.js' },
  { versionKey: 'thirdPartyVersion', assetPath: './js/third-party.js' },
  { versionKey: 'intentTrackingVersion', assetPath: './js/intent-tracking.js' },
  { versionKey: 'blogCssVersion', assetPath: './blog/style.css' },
  { versionKey: 'blogScriptVersion', assetPath: './blog/script.js' },
  { versionKey: 'blogComponentsVersion', assetPath: './blog/components.js' },
  { versionKey: 'articleScriptVersion', assetPath: './blog/article.js' },
  { versionKey: 'articleSharedCssVersion', assetPath: './articles/article-shared.css' },
  { versionKey: 'mainVersion', assetPath: './js/main.js' }
];

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function extractVersion(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : '';
}

function collectAssetVersions(rootDir, indexHtml) {
  const cssVersion = extractVersion(indexHtml, /style\.css\?v=([a-zA-Z0-9_-]+)/);

  const swContent = readTextIfExists(path.join(rootDir, 'sw.js'));
  const swConsentVersion = extractVersion(swContent, /\.\/js\/consent\.js\?v=([a-zA-Z0-9_-]+)/);
  const indexConsentVersion = extractVersion(indexHtml, /js\/consent\.js\?v=([a-zA-Z0-9_-]+)/);
  const consentVersion = swConsentVersion || indexConsentVersion;

  const mainVersion = extractVersion(indexHtml, /js\/main\.js\?v=([a-zA-Z0-9_-]+)/);
  const thirdPartyVersion = extractVersion(indexHtml, /js\/third-party\.js\?v=([a-zA-Z0-9_-]+)/);
  const intentTrackingVersion = thirdPartyVersion || mainVersion || cssVersion;

  const blogHtml = readTextIfExists(path.join(rootDir, 'blog/index.html'));
  const blogCssVersion = extractVersion(blogHtml, /style\.css\?v=([a-zA-Z0-9_-]+)/);
  const blogScriptVersion = extractVersion(blogHtml, /script\.js\?v=([a-zA-Z0-9_-]+)/);
  const blogComponentsVersion = extractVersion(blogHtml, /components\.js\?v=([a-zA-Z0-9_-]+)/);

  const articleHtml = readTextIfExists(path.join(rootDir, 'articles/2026-06-20-discount-gift-cards.html'));
  const articleSharedCssVersion = extractVersion(articleHtml, /article-shared\.css\?v=([a-zA-Z0-9_-]+)/);
  const articleScriptVersion = extractVersion(articleHtml, /article\.js\?v=([a-zA-Z0-9_-]+)/);

  return {
    articleScriptVersion,
    articleSharedCssVersion,
    blogComponentsVersion,
    blogCssVersion,
    blogScriptVersion,
    consentVersion,
    cssVersion,
    intentTrackingVersion,
    mainVersion,
    thirdPartyVersion
  };
}

function syncServiceWorkerAssetVersions(swContent, versions, assets = ROOT_SERVICE_WORKER_ASSETS) {
  let content = swContent;

  for (const { versionKey, assetPath } of assets) {
    content = replaceAssetVersion(content, assetPath, versions[versionKey]);
  }

  return content;
}

function syncRootServiceWorker(rootDir, assetVersion, versions) {
  const swPath = path.join(rootDir, 'sw.js');
  if (!fs.existsSync(swPath)) return;

  let swContent = fs.readFileSync(swPath, 'utf8');
  const newCacheName = `playpoint-calc-v${assetVersion}-${ROOT_SERVICE_WORKER_CACHE_REVISION}`;
  swContent = swContent.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${newCacheName}';`);
  swContent = syncServiceWorkerAssetVersions(swContent, versions);

  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`Successfully synchronized sw.js cache. CACHE_NAME=${newCacheName}`);
}

function syncKindleServiceWorker(rootDir, assetVersion) {
  const kindleSwPath = path.join(rootDir, 'kindle-tracker/sw.js');
  if (!fs.existsSync(kindleSwPath)) return;

  let swContent = fs.readFileSync(kindleSwPath, 'utf8');
  const newKindleCacheName = `kindle-tracker-v${assetVersion}`;
  swContent = swContent.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${newKindleCacheName}';`);

  fs.writeFileSync(kindleSwPath, swContent, 'utf8');
  console.log(`Successfully synchronized kindle-tracker/sw.js cache. CACHE_NAME=${newKindleCacheName}`);
}

function syncKindleIndex(rootDir, assetVersion, todayStr) {
  const kindleIndexPath = path.join(rootDir, 'kindle-tracker/index.html');
  if (!fs.existsSync(kindleIndexPath)) return;

  let content = fs.readFileSync(kindleIndexPath, 'utf8');
  content = replaceAssetVersion(content, 'style.css', `${assetVersion}a`);
  content = replaceAssetVersion(content, 'app.js', `${assetVersion}a`);
  content = replaceDateMetadata(content, todayStr);

  fs.writeFileSync(kindleIndexPath, content, 'utf8');
  console.log('Successfully synchronized asset versions and dates in kindle-tracker/index.html');
}

function syncThirdPartyConsentVersion(rootDir, consentVersion) {
  const thirdPartyJsPath = path.join(rootDir, 'js/third-party.js');
  if (!fs.existsSync(thirdPartyJsPath) || !consentVersion) return;

  let content = fs.readFileSync(thirdPartyJsPath, 'utf8');
  content = content.replace(/js\/consent\.js\?v=[a-zA-Z0-9_-]+/g, `js/consent.js?v=${consentVersion}`);

  fs.writeFileSync(thirdPartyJsPath, content, 'utf8');
  console.log(`Successfully synchronized consent.js version in third-party.js to v=${consentVersion}`);
}

function syncServiceWorkerAssets(rootDir, assetVersion, todayStr, indexHtml) {
  const versions = collectAssetVersions(rootDir, indexHtml);
  syncRootServiceWorker(rootDir, assetVersion, versions);
  syncKindleServiceWorker(rootDir, assetVersion);
  syncKindleIndex(rootDir, assetVersion, todayStr);
  syncThirdPartyConsentVersion(rootDir, versions.consentVersion);
  return versions;
}

module.exports = {
  ROOT_SERVICE_WORKER_ASSETS,
  collectAssetVersions,
  extractVersion,
  syncKindleIndex,
  syncKindleServiceWorker,
  syncRootServiceWorker,
  syncServiceWorkerAssetVersions,
  syncServiceWorkerAssets,
  syncThirdPartyConsentVersion
};
