'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertArticleConversionPath(relativePath, calculatorHref) {
  const html = read(relativePath);
  assert.match(html, /<link\s+rel=["']canonical["']/i, relativePath + ': canonical is required');
  assert.match(html, /<meta\s+name=["']description["'][^>]+content=["'][^"']{40,}["']/i, relativePath + ': meaningful meta description is required');
  assert.match(html, /article-calculator-prompt/, relativePath + ': article-to-calculator prompt is required');
  assert.ok(html.includes(`href="${calculatorHref}"`) || html.includes(`href='${calculatorHref}'`), relativePath + ': calculator destination must stay localised');
  assert.match(html, /\/js\/analytics-core\.js/, relativePath + ': analytics core must be present');
  assert.match(html, /\/js\/intent-tracking\.js/, relativePath + ': intent tracking must be present');
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
  assert.match(bestUse, /<title>[^<]*(?:交換先|使い道)[^<]*おすすめ[^<]*<\/title>/, 'best-use: recommendation intent must remain explicit');
  assert.match(bestUse, /<meta\s+name=["']description["'][^>]+content=["'][^"']*(?:交換先|使い道)[^"']*["']/i, 'best-use: snippet must explain the use/redemption intent');

  const koreanCash = read('ko/articles/google-play-points-cash-conversion.html');
  assert.match(koreanCash, /<title>[^<]*현금화[^<]*<\/title>/, 'KO cash conversion: cash-out intent must remain explicit');
  assert.match(koreanCash, /<meta\s+name=["']description["'][^>]+content=["'][^"']*현금화[^"']*["']/i, 'KO cash conversion: snippet must answer cash-out intent');

  const englishCash = read('en/articles/google-play-points-cash-conversion.html');
  assert.match(englishCash, /<title>[^<]*(?:cash|money)[^<]*<\/title>/i, 'EN cash conversion: cash intent must remain explicit');

  const twCredit = read('tw/articles/google-play-points-play-credit-not-working.html');
  assert.match(twCredit, /<title>[^<]*(?:無法|不能)[^<]*(?:抵用金|Play)[^<]*<\/title>/i, 'TW Play credit: cannot-use intent must remain explicit');
});

test('latest hub keeps the campaign-intent answer visible to search engines', () => {
  const html = read('latest/index.html');
  assert.match(html, /<title>[^<]*(?:キャンペーン|ポイント増量)[^<]*<\/title>/, 'latest: campaign intent must remain in title');
  assert.match(html, /<meta\s+name=["']description["'][^>]+content=["'][^"']*(?:キャンペーン|ポイント増量)[^"']*["']/i, 'latest: campaign intent must remain in description');
  assert.match(html, /2026/, 'latest: current-year intent must remain represented in published content');
});
