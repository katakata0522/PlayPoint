'use strict';

const path = require('node:path');

const GENERIC_TOKENS = new Set([
  'google', 'play', 'points', 'point', 'guide', 'guides', 'explained', 'how', 'to', 'the', 'a', 'an', 'and', 'or', 'vs'
]);

const TOPIC_RULES = Object.freeze({
  status: /(?:^|-)(?:level|levels|rank|status|silver|gold|platinum|diamond)(?:-|$)/,
  spending: /(?:^|-)(?:cost|value|price|spend|spending|amount|100|500|1000)(?:-|$)/,
  earning: /(?:^|-)(?:earn|earning|multiplier|promotion|campaign|quest|quests|weekly|reward|rewards|free|booster)(?:-|$)/,
  payment: /(?:^|-)(?:gift|card|cards|payment|payments|purchase|purchases|subscription|billing|discount|discounts|promo|code)(?:-|$)/,
  redemption: /(?:^|-)(?:cash|conversion|coupon|credit|redeem|redeemed|exchange|item|items|store)(?:-|$)/,
  account: /(?:^|-)(?:account|accounts|device|country|family|join|eligibility|link)(?:-|$)/,
  troubleshooting: /(?:^|-)(?:not|showing|applied|received|missing|locked|cannot|problem|problems|refund|disappeared|expiration|expired)(?:-|$)/,
  balance: /(?:^|-)(?:balance|history|progress|expiration|expired)(?:-|$)/,
  games: /(?:^|-)(?:game|games|pc)(?:-|$)/
});

function slugFromPath(value) {
  return path.posix.basename(String(value).replace(/\\/g, '/'), '.html')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .toLowerCase();
}

function meaningfulTokens(slug) {
  return new Set(slug.split('-').filter(token => token && !GENERIC_TOKENS.has(token)));
}

function topicTags(slug) {
  return new Set(Object.entries(TOPIC_RULES)
    .filter(([, pattern]) => pattern.test(slug))
    .map(([topic]) => topic));
}

function intersectionSize(left, right) {
  let count = 0;
  for (const value of left) if (right.has(value)) count++;
  return count;
}

function scoreRelatedArticle(currentPath, candidate) {
  const currentSlug = slugFromPath(currentPath);
  const candidateSlug = slugFromPath(candidate.path || candidate.href || '');
  if (!candidateSlug || currentSlug === candidateSlug) return Number.NEGATIVE_INFINITY;

  const sharedTokens = intersectionSize(meaningfulTokens(currentSlug), meaningfulTokens(candidateSlug));
  const sharedTopics = intersectionSize(topicTags(currentSlug), topicTags(candidateSlug));

  // 具体語の一致を最優先し、同じ問題領域・利用目的の一致を次点にする。
  return (sharedTokens * 12) + (sharedTopics * 5);
}

function selectRelatedArticles(catalog, currentPath, limit = 4) {
  if (!Array.isArray(catalog) || limit <= 0) return [];

  return catalog
    .map((candidate, index) => ({
      ...candidate,
      index,
      score: scoreRelatedArticle(currentPath, candidate)
    }))
    .filter(candidate => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score
      || left.index - right.index
      || String(left.href).localeCompare(String(right.href)))
    .slice(0, limit)
    .map(candidate => [candidate.href, candidate.label]);
}

module.exports = {
  GENERIC_TOKENS,
  TOPIC_RULES,
  scoreRelatedArticle,
  selectRelatedArticles,
  slugFromPath
};
