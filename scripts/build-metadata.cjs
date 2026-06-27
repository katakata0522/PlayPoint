'use strict';

const fs = require('fs');
const path = require('path');

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
  let content = indexHtml;

  content = content.replace(/<meta name="last-modified" content="[^"]+">/, `<meta name="last-modified" content="${todayStr}">`);
  content = content.replace(/<meta property="article:modified_time" content="[^"]+">/, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
  content = content.replace(/"dateModified": "[^"]+"/, `"dateModified": "${todayStr}"`);
  content = content.replace(/最終更新: \d{4}-\d{2}-\d{2}/, `最終更新: ${todayStr}`);
  content = content.replace(/style\.css\?v=[a-zA-Z0-9_-]+/g, `style.css?v=${assetVersion}a`);
  content = content.replace(/js\/main\.js\?v=[a-zA-Z0-9_-]+/g, `js/main.js?v=${assetVersion}a`);
  content = content.replace(/js\/third-party\.js\?v=[a-zA-Z0-9_-]+/g, `js/third-party.js?v=${assetVersion}a`);
  content = content.replace(/blog\/components\.js\?v=[a-zA-Z0-9_-]+/g, `blog/components.js?v=${assetVersion}a`);

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
