'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { replaceAssetVersion } = require('./html-replacements.cjs');

const ROOT_SERVICE_WORKER_ASSETS = [
  { versionKey: 'cssVersion', assetPath: './style.css' },
  { versionKey: 'mainCalculatorUiVersion', assetPath: './js/main-calculator-ui.js' },
  { versionKey: 'mainVersion', assetPath: './js/main.js' },
  { versionKey: 'appModuleRevision', assetPath: './js/app-modules' }
];

const APP_MODULE_FILES = [
  'js/config.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
  'js/ui.js',
  'js/diary.js',
  'js/calculator.js',
  'js/share.js',
  'js/main-calculator-ui.js'
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

function replaceOptionalAssetVersion(content, assetPath, version) {
  if (!version) return content;
  const escapedAssetPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.replace(
    new RegExp(`${escapedAssetPath}(?:\\?v=[a-zA-Z0-9_-]+)?`, 'g'),
    `${assetPath}?v=${version}`
  );
}

function syncMainCalculatorUiImportVersion(rootDir, version) {
  const mainJsPath = path.join(rootDir, 'js/main.js');
  if (!fs.existsSync(mainJsPath) || !version) return;

  const currentContent = fs.readFileSync(mainJsPath, 'utf8');
  const updatedContent = replaceOptionalAssetVersion(currentContent, './main-calculator-ui.js', version);
  if (updatedContent === currentContent) return;

  fs.writeFileSync(mainJsPath, updatedContent, 'utf8');
  console.log(`Synchronized main calculator UI import to v=${version}`);
}

function syncServiceWorkerRegistration(rootDir) {
  const candidatePaths = [
    'js/service-worker-registration.js',
    'js/main.js'
  ];
  const targetRelativePath = candidatePaths.find((candidate) => {
    const candidatePath = path.join(rootDir, candidate);
    return fs.existsSync(candidatePath)
      && fs.readFileSync(candidatePath, 'utf8').includes('navigator.serviceWorker.register');
  });
  if (!targetRelativePath) return;

  const targetPath = path.join(rootDir, targetRelativePath);
  const currentContent = fs.readFileSync(targetPath, 'utf8');
  if (currentContent.includes("updateViaCache: 'none'")) return;

  const oldRegistration = `navigator.serviceWorker.register(swPath)\n                    .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))`;
  const newRegistration = `navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })\n                    .then((reg) => {\n                        console.log('ServiceWorker registered successfully:', reg.scope);\n                        void reg.update().catch(err => console.warn('ServiceWorker update check failed:', err));\n                    })`;
  const updatedContent = currentContent.replace(oldRegistration, newRegistration);

  if (updatedContent === currentContent) {
    throw new Error(`Service Worker登録処理を更新できませんでした: ${targetRelativePath}`);
  }

  fs.writeFileSync(targetPath, updatedContent, 'utf8');
  console.log(`Enabled immediate Service Worker update checks in ${targetRelativePath}.`);
}

function collectAssetVersions(rootDir) {
  const cssVersion = createFileRevision(rootDir, 'style.css');
  const consentVersion = createFileRevision(rootDir, 'js/consent.js');
  const mainCalculatorUiVersion = createFileRevision(rootDir, 'js/main-calculator-ui.js');
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
    mainCalculatorUiVersion,
    mainVersion,
    thirdPartyVersion,
    appModuleRevision: createAppModuleRevision(rootDir)
  };
}

function syncServiceWorkerAssetVersions(swContent, versions, assets = ROOT_SERVICE_WORKER_ASSETS) {
  let content = swContent;

  for (const { versionKey, assetPath } of assets) {
    content = replaceOptionalAssetVersion(content, assetPath, versions[versionKey]);
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
  swContent = replaceOptionalAssetVersion(
    swContent,
    './js/main-calculator-ui.js',
    versions.mainCalculatorUiVersion
  );
  swContent = syncServiceWorkerAssetVersions(swContent, versions);

  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`Successfully synchronized sw.js cache. CACHE_NAME=${newCacheName}`);
}

function syncThirdPartyConsentVersion(rootDir, consentVersion) {
  if (!consentVersion) return;

  const targetRelativePaths = [
    'js/third-party.js',
    'blog/components.js'
  ];

  for (const relativePath of targetRelativePaths) {
    const targetPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(targetPath)) continue;

    const currentContent = fs.readFileSync(targetPath, 'utf8');
    const updatedContent = currentContent.replace(
      /js\/consent\.js\?v=[a-zA-Z0-9_-]+/g,
      `js/consent.js?v=${consentVersion}`
    );
    if (updatedContent === currentContent) continue;

    fs.writeFileSync(targetPath, updatedContent, 'utf8');
    console.log(`Successfully synchronized consent.js version in ${relativePath} to v=${consentVersion}`);
  }
}

function syncServiceWorkerAssets(rootDir, assetVersion) {
  const mainCalculatorUiVersion = createFileRevision(rootDir, 'js/main-calculator-ui.js');
  syncMainCalculatorUiImportVersion(rootDir, mainCalculatorUiVersion);
  syncServiceWorkerRegistration(rootDir);

  const versions = collectAssetVersions(rootDir);
  syncRootServiceWorker(rootDir, assetVersion, versions);
  syncThirdPartyConsentVersion(rootDir, versions.consentVersion);
  return versions;
}

module.exports = {
  APP_MODULE_FILES,
  ROOT_SERVICE_WORKER_ASSETS,
  collectAssetVersions,
  createAppModuleRevision,
  createFileRevision,
  createRootServiceWorkerCacheRevision,
  extractVersion,
  replaceOptionalAssetVersion,
  syncMainCalculatorUiImportVersion,
  syncRootServiceWorker,
  syncServiceWorkerAssetVersions,
  syncServiceWorkerAssets,
  syncServiceWorkerRegistration,
  syncThirdPartyConsentVersion
};