'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

// Protect search-intent and publication contracts for international pages with measurable demand.
function indexOfOrFail(html, needle, label) {
  const index = html.indexOf(needle);
  assert.notEqual(index, -1, `${label} is missing: ${needle}`);
  return index;
}

test('English redemption guide answers the decision question before the calculator CTA', () => {
  const html = read('en/articles/google-play-points-use-coupons.html');

  assert.match(html, /Best ways to use Google Play Points/i);
  assert.match(html, /There is no single best Play Points reward for everyone/);
  assert.match(html, /value you would actually use ÷ points required/);
  assert.match(html, /Coupon vs Google Play credit/);
  assert.match(html, /When you should not redeem yet/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);

  const answerIndex = indexOfOrFail(html, 'id="quick-answer"', 'English quick answer');
  const calculatorIndex = indexOfOrFail(html, 'data-generated-intl-article-prompt="true"', 'English calculator prompt');
  assert.ok(answerIndex < calculatorIndex, 'The search answer must appear before the calculator CTA.');
});

test('Taiwan weekly reward guide directly covers the missing-reward search intent', () => {
  const html = read('tw/articles/google-play-points-weekly-reward.html');

  assert.match(html, /每週獎勵不見/);
  assert.match(html, /星期五重設/);
  assert.match(html, /星期四更新/);
  assert.match(html, /點數記錄/);
  assert.match(html, /9077192/);
  assert.match(html, /9080348/);
  assert.match(html, /16507543/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);

  const answerIndex = indexOfOrFail(html, 'id="quick-check"', 'Taiwan weekly-reward quick check');
  const calculatorIndex = indexOfOrFail(html, 'data-generated-intl-article-prompt="true"', 'Taiwan calculator prompt');
  assert.ok(answerIndex < calculatorIndex, 'Troubleshooting must appear before the calculator CTA.');
});
