'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { replaceAssetVersion, replaceDateMetadata } = require('./html-replacements.cjs');


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
  { versionKey: 'mainVersion', assetPath: './js/main.js' },
  { versionKey: 'appModuleRevision', assetPath: './js/app-modules' }
];

const APP_MODULE_FILES = [
  'js/config.js',
  'js/ui.js',
  'js/diary.js',
  'js/calculator.js',
  'js/share.js'
];

function createRootServiceWorkerCacheRevision(versions, assets = ROOT_SERVICE_WORKER_ASSETS) {
  const fingerprint = assets
    .map(({ versionKey, assetPath }) => assetPath + ':' + (versions[versionKey] || 'unversioned'))
    .join('|');

  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 8);
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function createAppModuleRevision(rootDir, files = APP_MODULE_FILES) {
  const fingerprint = files
    .map(relativePath => relativePath + ':' + readTextIfExists(path.join(rootDir, relativePath)).replace(/\r\n/g, '\n'))
    .join('|');
  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 8);
}

function createFileRevision(rootDir, relativePath) {
  const content = readTextIfExists(path.join(rootDir, relativePath)).replace(/\r\n/g, '\n');
  return content
    ? crypto.createHash('sha256').update(content).digest('hex').slice(0, 10)
    : '';
}

function extractVersion(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : '';
}

function collectAssetVersions(rootDir, indexHtml) {
  const cssVersion = createFileRevision(rootDir, 'style.css');

  const consentVersion = createFileRevision(rootDir, 'js/consent.js');

  const mainVersion = createFileRevision(rootDir, 'js/main.js');
  const thirdPartyVersion = createFileRevision(rootDir, 'js/third-party.js');
  const intentTrackingVersion = createFileRevision(rootDir, 'js/intent-tracking.js');

  const blogCssVersion = createFileRevision(rootDir, 'blog/style.css');
  const blogScriptVersion = createFileRevision(rootDir, 'blog/script.js');
  const blogComponentsVersion = createFileRevision(rootDir, 'blog/components.js');

  const articleSharedCssVersion = createFileRevision(rootDir, 'articles/article-shared.css');
  const articleScriptVersion = createFileRevision(rootDir, 'blog/article.js');

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
    thirdPartyVersion,
    appModuleRevision: createAppModuleRevision(rootDir)
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
  const cacheRevision = createRootServiceWorkerCacheRevision(versions);
  const newCacheName = `playpoint-calc-v${assetVersion}-${cacheRevision}`;
  swContent = swContent.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = '${newCacheName}';`);
  swContent = syncServiceWorkerAssetVersions(swContent, versions);

  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`Successfully synchronized sw.js cache. CACHE_NAME=${newCacheName}`);
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
  syncThirdPartyConsentVersion(rootDir, versions.consentVersion);
  return versions;
}

module.exports = {
  ROOT_SERVICE_WORKER_ASSETS,
  createAppModuleRevision,
  createFileRevision,
  createRootServiceWorkerCacheRevision,
  collectAssetVersions,
  extractVersion,
  syncRootServiceWorker,
  syncServiceWorkerAssetVersions,
  syncServiceWorkerAssets,
  syncThirdPartyConsentVersion
};
