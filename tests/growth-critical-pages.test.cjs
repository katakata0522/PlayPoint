'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function titleOf(html, label) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  assert.ok(match, `${label}: title is required`);
  return match[1].replace(/\s+/g, ' ').trim();
}

function metaContent(html, name, label) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((candidate) => new RegExp(`\\bname=["']${name}["']`, 'i').test(candidate));
  assert.ok(tag, `${label}: meta ${name} is required`);
  const content = tag.match(/\bcontent=["']([^"']*)["']/i);
  assert.ok(content, `${label}: meta ${name} needs content`);
  return content[1].trim();
}

function hasCanonical(html) {
  return (html.match(/<link\b[^>]*>/gi) || []).some((tag) => /\brel=["']canonical["']/i.test(tag));
}

function assertArticleConversionPath(relativePath, calculatorHref) {
  const html = read(relativePath);
  assert.ok(hasCanonical(html), relativePath + ': canonical is required');
  assert.ok(metaContent(html, 'description', relativePath).length >= 30, relativePath + ': meaningful meta description is required');
  assert.match(html, /article-calculator-prompt/, relativePath + ': article-to-calculator prompt is required');
  assert.ok(html.includes(`href="${calculatorHref}"`) || html.includes(`href='${calculatorHref}'`), relativePath + ': calculator destination must stay localised');
  assert.match(html, /\/js\/analytics-core\.js/, relativePath + ': analytics core must be present');
  // Article conversion events are owned by blog/article.js. intent-tracking.js is the LP runtime
  // and is intentionally not a requirement for every article shell.
  assert.match(html, /\/blog\/article\.js/, relativePath + ': article conversion tracking runtime must be present');
}

test('top organic landing articles keep the search-to-calculator conversion path', () => {
  assertArticleConversionPath('ko/articles/google-play-points-cash-conversion.html', '/ko/');
  assertArticleConversionPath('articles/2026-07-31-google-play-quests.html', '../');
  assertArticleConversionPath('tw/articles/google-play-points-coupon-not-applied.html', '/tw/');
  assertArticleConversionPath('tw/articles/google-play-points-platinum-diamond-cost.html', '/tw/');
});

test('high-impression 4-15 position pages retain the query intent in title and description', () => {
  const bestUse = read('articles/2025-12-25-best-use.html');
  const bestUseTitle = titleOf(bestUse, 'best-use');
  const bestUseDescription = metaContent(bestUse, 'description', 'best-use');
  assert.match(bestUseTitle, /(?:交換先|使い道)/, 'best-use: use/redemption intent must remain in title');
  assert.match(bestUseTitle, /おすすめ/, 'best-use: recommendation intent must remain in title');
  assert.match(bestUseDescription, /(?:交換先|使い道)/, 'best-use: snippet must explain the use/redemption intent');

  const koreanCash = read('ko/articles/google-play-points-cash-conversion.html');
  assert.match(titleOf(koreanCash, 'KO cash conversion'), /현금화/, 'KO cash conversion: cash-out intent must remain explicit');
  assert.match(metaContent(koreanCash, 'description', 'KO cash conversion'), /현금화/, 'KO cash conversion: snippet must answer cash-out intent');

  const englishCash = read('en/articles/google-play-points-cash-conversion.html');
  assert.match(titleOf(englishCash, 'EN cash conversion'), /(?:cash|money)/i, 'EN cash conversion: cash intent must remain explicit');

  const twCredit = read('tw/articles/google-play-points-play-credit-not-working.html');
  const twCreditTitle = titleOf(twCredit, 'TW Play credit');
  assert.match(twCreditTitle, /(?:無法|不能)/, 'TW Play credit: cannot-use intent must remain explicit');
  assert.match(twCreditTitle, /(?:抵用金|Play)/i, 'TW Play credit: Play credit intent must remain explicit');
});

test('latest hub keeps the campaign-intent answer visible to search engines', () => {
  const html = read('latest/index.html');
  assert.match(titleOf(html, 'latest'), /(?:キャンペーン|ポイント増量)/, 'latest: campaign intent must remain in title');
  assert.match(metaContent(html, 'description', 'latest'), /(?:キャンペーン|ポイント増量)/, 'latest: campaign intent must remain in description');
  assert.match(html, /2026/, 'latest: current-year intent must remain represented in published content');
});
