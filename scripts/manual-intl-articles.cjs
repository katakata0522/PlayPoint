'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANUAL_INTL_ARTICLE_FILES = Object.freeze([
  'en/articles/google-play-points-100-value.html',
  'en/articles/google-play-points-country-change.html',
  'en/articles/google-play-points-country-differences.html',
  'en/articles/google-play-points-fastest-silver.html',
  'en/articles/google-play-points-gift-cards.html',
  'en/articles/google-play-points-join-eligibility.html',
  'en/articles/google-play-points-levels.html',
  'en/articles/google-play-points-not-showing.html',
  'en/articles/google-play-points-promotion-not-applied.html',
  'en/articles/google-play-points-promotion-stacking.html',
  'en/articles/google-play-points-subscriptions.html',
  'en/articles/google-play-points-weekly-reward.html',
  'ko/articles/google-play-points-country-change.html',
  'ko/articles/google-play-points-fastest-silver.html',
  'ko/articles/google-play-points-gift-cards.html',
  'ko/articles/google-play-points-join-eligibility.html',
  'ko/articles/google-play-points-levels.html',
  'ko/articles/google-play-points-promotion-stacking.html',
  'ko/articles/google-play-points-super-weekly-reward.html',
  'ko/articles/google-play-points-weekly-reward.html',
  'tw/articles/google-play-points-country-change.html',
  'tw/articles/google-play-points-fastest-silver.html',
  'tw/articles/google-play-points-gift-cards.html',
  'tw/articles/google-play-points-join-eligibility.html',
  'tw/articles/google-play-points-levels.html',
  'tw/articles/google-play-points-promotion-stacking.html',
  'tw/articles/google-play-points-super-weekly-reward.html',
  'tw/articles/google-play-points-weekly-reward.html',
]);
const MANUAL_INTL_ARTICLE_FILE_SET = new Set(MANUAL_INTL_ARTICLE_FILES);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function extractUniqueDate(html, pattern, label, relativePath) {
  const dates = [...html.matchAll(pattern)].map(match => match[1]);
  const uniqueDates = [...new Set(dates)];
  if (uniqueDates.length !== 1 || !ISO_DATE_PATTERN.test(uniqueDates[0])) {
    throw new Error(`${relativePath}: expected one valid ${label}, found ${uniqueDates.join(', ') || 'none'}`);
  }
  return uniqueDates[0];
}

function readManualIntlArticleDates(rootDir, relativePath) {
  if (!MANUAL_INTL_ARTICLE_FILE_SET.has(relativePath)) return null;

  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Manual international article is missing: ${relativePath}`);
  }

  const html = fs.readFileSync(absolutePath, 'utf8');
  const publishedAt = extractUniqueDate(
    html,
    /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g,
    'datePublished',
    relativePath
  );
  const modifiedAt = extractUniqueDate(
    html,
    /"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g,
    'dateModified',
    relativePath
  );
  const metaModifiedAt = extractUniqueDate(
    html,
    /<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/g,
    'last-modified metadata',
    relativePath
  );

  if (modifiedAt !== metaModifiedAt) {
    throw new Error(`${relativePath}: dateModified (${modifiedAt}) does not match last-modified (${metaModifiedAt})`);
  }
  if (publishedAt > modifiedAt) {
    throw new Error(`${relativePath}: datePublished (${publishedAt}) is later than dateModified (${modifiedAt})`);
  }

  return { publishedAt, modifiedAt };
}

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
  readManualIntlArticleDates,
  restoreManualIntlArticles,
  snapshotManualIntlArticles
};
