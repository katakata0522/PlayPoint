'use strict';

function replaceAssetVersion(content, assetPath, version) {
  if (!version) return content;
  const escapedAssetPath = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.replace(new RegExp(`${escapedAssetPath}\\?v=[a-zA-Z0-9_-]+`, 'g'), `${assetPath}?v=${version}`);
}

function replaceDateMetadata(content, todayStr, options = {}) {
  const includeEnglish = options.includeEnglish === true;
  const includeTraditionalChinese = options.includeTraditionalChinese === true;
  let output = content;

  output = output.replace(/<meta name="last-modified" content="[^"]+">/g, `<meta name="last-modified" content="${todayStr}">`);
  output = output.replace(/<meta property="article:modified_time" content="[^"]+">/g, `<meta property="article:modified_time" content="${todayStr}T00:00:00+09:00">`);
  output = output.replace(/"dateModified": "[^"]+"/g, `"dateModified": "${todayStr}"`);
  output = output.replace(/最終更新: \d{4}-\d{2}-\d{2}/g, `最終更新: ${todayStr}`);

  if (includeEnglish) {
    output = output.replace(/Last Modified: \d{4}-\d{2}-\d{2}/g, `Last Modified: ${todayStr}`);
  }
  if (includeTraditionalChinese) {
    output = output.replace(/最後更新: \d{4}-\d{2}-\d{2}/g, `最後更新: ${todayStr}`);
  }

  return output;
}

module.exports = {
  replaceAssetVersion,
  replaceDateMetadata
};
