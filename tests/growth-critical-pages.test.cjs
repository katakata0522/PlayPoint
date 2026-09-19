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

function assertArticleRuntime(relativePath) {
  const html = read(relativePath);
  assert.ok(hasCanonical(html), relativePath + ': canonical is required');
  const description = metaContent(html, 'description', relativePath);
  assert.ok(description.length > 0, relativePath + ': meta description is required');
  assert.doesNotMatch(description, /placeholder|lorem ipsum|\bTBD\b|\bTODO\b/i, relativePath + ': placeholder meta description is not allowed');
  assert.match(html, /\/js\/analytics-core\.js/, relativePath + ': analytics core must be present');
  // Article conversion/navigation events are owned by blog/article.js. intent-tracking.js is the LP runtime
  // and is intentionally not a requirement for every article shell.
  assert.match(html, /\/blog\/article\.js/, relativePath + ': article runtime must be present');
  return html;
}

test('growth-critical landing articles keep canonical analytics and article runtime', () => {
  for (const relativePath of [
    'ko/articles/google-play-points-cash-conversion.html',
    'tw/articles/google-play-points-coupon-not-applied.html',
    'tw/articles/google-play-points-platinum-diamond-cost.html',
    'articles/2026-07-31-google-play-quests.html'
  ]) {
    assertArticleRuntime(relativePath);
  }
});

test('priority search landing pages retain their query intent in title and description', () => {
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
  const twCreditDescription = metaContent(twCredit, 'description', 'TW Play credit');
  assert.match(twCreditTitle, /Google Play/i, 'TW Play credit: Google Play intent must remain explicit');
  assert.match(twCreditTitle, /抵用金/, 'TW Play credit: Play credit intent must remain explicit');
  assert.match(twCreditTitle, /(?:無法使用|不能使用)/, 'TW Play credit: cannot-use intent must remain explicit');
  assert.match(twCreditDescription, /抵用金.*無法使用/, 'TW Play credit: snippet must answer the cannot-use query directly');
});

test('Taiwan Play credit troubleshooting answers first and keeps troubleshooting next actions', () => {
  const html = assertArticleRuntime('tw/articles/google-play-points-play-credit-not-working.html');
  const introIndex = html.indexOf('<div class="intro">');
  const quickCheckIndex = html.indexOf('id="quick-check"');
  const finalDiagnosisIndex = html.indexOf('id="section-5"');
  const sourceIndex = html.indexOf('official-source-note');
  const relatedIndex = html.indexOf('related-links-section');

  assert.ok(introIndex >= 0, 'TW Play credit: direct-answer intro is required');
  assert.ok(quickCheckIndex > introIndex, 'TW Play credit: quick diagnosis should follow the direct answer');
  assert.ok(finalDiagnosisIndex > quickCheckIndex, 'TW Play credit: full diagnosis should follow the quick check');
  assert.ok(sourceIndex > finalDiagnosisIndex, 'TW Play credit: official evidence should follow the diagnosis');
  assert.ok(relatedIndex > sourceIndex, 'TW Play credit: related troubleshooting should be the follow-up path');
  assert.doesNotMatch(html, /data-generated-intl-article-prompt=["']true["']/, 'TW Play credit troubleshooting must not get a generic calculator prompt');
});

test('latest hub keeps the campaign-intent answer visible in indexable metadata', () => {
  const html = read('latest/index.html');
  assert.match(titleOf(html, 'latest'), /(?:キャンペーン|ポイント増量)/, 'latest: campaign intent must remain in title');
  assert.match(metaContent(html, 'description', 'latest'), /(?:キャンペーン|ポイント増量)/, 'latest: campaign intent must remain in description');
  assert.match(html, /ポイントアップ/, 'latest: colloquial point-up wording should bridge to the campaign owner without title stuffing');
});

test('ambiguous search intents hand off to the dedicated owner pages', () => {
  const platinum = read('status/platinum/index.html');
  assert.match(titleOf(platinum, 'platinum cost'), /プラチナ.*いくら/, 'platinum cost owner must keep the direct cost intent');

  const ordinaryWeekly = read('articles/2025-12-25-weekly-reward.html');
  assert.match(titleOf(ordinaryWeekly, 'ordinary weekly'), /ウィークリーリワードとは/, 'ordinary weekly owner must keep the generic definition intent');

  const superWeekly = read('articles/2026-07-31-super-weekly-reward.html');
  const quickAnswerIndex = superWeekly.indexOf('id="quick-answer"');
  const ordinaryOwnerLinkIndex = superWeekly.indexOf('href="./2025-12-25-weekly-reward.html"', quickAnswerIndex);
  assert.ok(quickAnswerIndex >= 0, 'super weekly: quick answer is required');
  assert.ok(
    ordinaryOwnerLinkIndex > quickAnswerIndex && ordinaryOwnerLinkIndex < quickAnswerIndex + 2200,
    'super weekly: generic weekly intent should be handed to the ordinary-weekly owner near the first answer'
  );

  const superTicket = assertArticleRuntime('articles/2026-09-19-google-play-super-ticket.html');
  assert.match(titleOf(superTicket, 'Super Ticket'), /Super Ticket/);
  assert.match(superTicket, /href="\.\/2026-07-31-super-weekly-reward\.html"/);
  assert.match(superWeekly, /href="\.\/2026-09-19-google-play-super-ticket\.html"/);

  const koreanUse = read('ko/articles/google-play-points-use-coupons.html');
  assert.match(
    koreanUse,
    /href="\/ko\/articles\/google-play-points-balance-history-progress\.html"/,
    'KO use-coupons: balance/check intent must route to the dedicated balance owner'
  );

  const koreanBalance = read('ko/articles/google-play-points-balance-history-progress.html');
  assert.match(
    titleOf(koreanBalance, 'KO balance'),
    /잔액.*확인/,
    'KO balance owner must keep balance/check intent explicit'
  );
});

