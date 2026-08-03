'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANUAL_INTL_ARTICLE_FILES = Object.freeze([
  'en/articles/google-play-points-100-value.html',
  'en/articles/google-play-points-country-differences.html',
  'en/articles/google-play-points-gift-cards.html',
  'en/articles/google-play-points-levels.html',
  'en/articles/google-play-points-not-showing.html',
  'en/articles/google-play-points-promotion-not-applied.html',
  'en/articles/google-play-points-subscriptions.html',
  'ko/articles/google-play-points-gift-cards.html',
  'ko/articles/google-play-points-levels.html',
  'ko/articles/google-play-points-super-weekly-reward.html',
  'tw/articles/google-play-points-gift-cards.html',
  'tw/articles/google-play-points-levels.html',
  'tw/articles/google-play-points-super-weekly-reward.html'
]);

function snapshotManualIntlArticles(rootDir) {
  const snapshots = new Map();
  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Manual international article is missing: ${relativePath}`);
    }
    snapshots.set(relativePath, fs.readFileSync(absolutePath));
  }
  return snapshots;
}

function restoreManualIntlArticles(rootDir, snapshots) {
  if (!(snapshots instanceof Map)) {
    throw new TypeError('Manual international article snapshots must be a Map.');
  }

  for (const relativePath of MANUAL_INTL_ARTICLE_FILES) {
    const content = snapshots.get(relativePath);
    if (!Buffer.isBuffer(content)) {
      throw new Error(`Manual international article snapshot is missing: ${relativePath}`);
    }
    fs.writeFileSync(path.join(rootDir, relativePath), content);
  }

  console.log(`[manual-intl] restored canonical article content: ${MANUAL_INTL_ARTICLE_FILES.length}`);
}

module.exports = {
  MANUAL_INTL_ARTICLE_FILES,
  restoreManualIntlArticles,
  snapshotManualIntlArticles
};
