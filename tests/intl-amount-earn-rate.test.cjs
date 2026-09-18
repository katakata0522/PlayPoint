'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PAGE_TYPES } = require('../scripts/intl-seo-content.cjs');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function amountSourceCopy(locale) {
  const copy = PAGE_TYPES.amount10000?.[locale];
  assert.ok(copy, `amount10000.${locale}: canonical content is missing`);
  return {
    summary: (copy.summary || []).join('\n'),
    sections: (copy.sections || []).flat().join('\n')
  };
}

test('dormant international Amount fallback copy uses special earn-rate terminology', () => {
  assert.equal(PAGE_TYPES.amount10000.slug, 'amount/10000');
  assert.equal(PAGE_TYPES.amount10000.mode, 'reverse');

  const expectations = {
    en: { required: /special earn rate/i, stale: /\bmultiplier\b/i },
    ko: { required: /특별 적립률/, stale: /배율/ },
    tw: { required: /特別獲點率/, stale: /倍率/ }
  };

  for (const [locale, { required, stale }] of Object.entries(expectations)) {
    const copy = amountSourceCopy(locale);
    assert.match(copy.summary, required, `${locale}: summary must use earn-rate semantics`);
    assert.match(copy.sections, required, `${locale}: section copy must use earn-rate semantics`);
    assert.doesNotMatch(copy.summary, stale, `${locale}: stale multiplier terminology in summary`);
    assert.doesNotMatch(copy.sections, stale, `${locale}: stale multiplier terminology in sections`);
  }
});

test('published Japanese Amount copy uses special earn-rate terminology', () => {
  const ja = read('amount/10000/index.html');

  assert.match(ja, /特別獲得率/);
  assert.doesNotMatch(ja, /ステータスや倍率ごとに/);
  assert.doesNotMatch(ja, /キャンペーン倍率との違い/);
  assert.doesNotMatch(ja, /逆算・1万円・通常倍率/);
  assert.match(ja, /multiplier=1/);
});

test('published international Amount overrides keep earn-rate wording and legacy query compatibility', () => {
  const en = read('en/amount/10000/index.html');
  const ko = read('ko/amount/10000/index.html');
  const tw = read('tw/amount/10000/index.html');

  assert.match(en, /Check: level, promotion rate, eligible pre-tax amount/);
  assert.match(en, /Change the amount, level, or special earn rate to match the purchase you are planning/);
  assert.match(ko, /확인: 등급, 특별 적립률, 대상 금액/);
  assert.match(tw, /確認: 等級、特別獲點率、適用金額/);

  for (const html of [en, ko, tw]) {
    assert.match(html, /multiplier=1/);
    assert.match(html, /<meta name="last-modified" content="\d{4}-\d{2}-\d{2}">/);
  }
});
