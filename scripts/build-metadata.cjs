'use strict';

const fs = require('fs');
const path = require('path');
const { replaceAssetVersion, replaceDateMetadata } = require('./html-replacements.cjs');

function createBuildMetadata(env = process.env, now = new Date()) {
  const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const forcedModifiedDate = env.PLAYPOINT_MODIFIED_DATE || '';
  const forcedAssetVersion = env.PLAYPOINT_ASSET_VERSION || '';
  const yyyy = forcedModifiedDate ? Number(forcedModifiedDate.slice(0, 4)) : jstDate.getUTCFullYear();
  const mm = forcedModifiedDate ? forcedModifiedDate.slice(5, 7) : String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = forcedModifiedDate ? forcedModifiedDate.slice(8, 10) : String(jstDate.getUTCDate()).padStart(2, '0');
  const hh = String(jstDate.getUTCHours()).padStart(2, '0');
  const min = String(jstDate.getUTCMinutes()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const assetVersion = forcedAssetVersion || `${yyyy}${mm}${dd}_${hh}${min}`;

  return {
    assetVersion,
    todayStr
  };
}

function syncIndexMetadataContent(indexHtml, todayStr, assetVersion) {
  let content = replaceDateMetadata(indexHtml, todayStr);
  const version = `${assetVersion}a`;

  content = replaceAssetVersion(content, 'style.css', version);
  content = replaceAssetVersion(content, 'js/main.js', version);
  content = replaceAssetVersion(content, 'js/third-party.js', version);
  content = replaceAssetVersion(content, 'blog/components.js', version);

  return content;
}

function syncIndexMetadata(rootDir, metadata = createBuildMetadata()) {
  const sourcePath = path.join(rootDir, 'index.html');
  const indexHtml = syncIndexMetadataContent(fs.readFileSync(sourcePath, 'utf8'), metadata.todayStr, metadata.assetVersion);

  fs.writeFileSync(sourcePath, indexHtml, 'utf8');
  console.log(`Synchronized dates and asset versions (v=${metadata.assetVersion}a) in index.html`);

  return {
    ...metadata,
    indexHtml
  };
}

module.exports = {
  createBuildMetadata,
  syncIndexMetadata,
  syncIndexMetadataContent
};
