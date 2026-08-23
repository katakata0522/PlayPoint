'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/html-sync.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'attention.html'), 'utf8');

test('注意ページは現在の6地域専用モードを正確に案内する', () => {
  assert.match(html, /Japan, the United States, South Korea, Taiwan, Hong Kong, and India/);

  for (const [label, href] of [
    ['Japan', './'],
    ['United States', './en/'],
    ['South Korea', './ko/'],
    ['Taiwan', './tw/'],
    ['Hong Kong', './hk/'],
    ['India', './in/']
  ]) {
    assert.ok(html.includes(label), `Country Guideに${label}がありません`);
    assert.ok(html.includes(`href="${href}"`), `Country Guideに${href}への導線がありません`);
  }
});

test('香港とインドを他地域の代替ルールとして案内しない', () => {
  assert.match(html, /Hong Kong/);
  assert.match(html, /HKD \/ HK\$7/);
  assert.match(html, /India/);
  assert.match(html, /INR \/ ₹5/);
  assert.match(html, /Platinum is the highest level in the current India profile/);
  assert.match(html, /Translation does not change calculation rules/);
});

test('国をブラウザ言語だけで推測せず6地域の公式確認導線を残す', () => {
  assert.doesNotMatch(html, /browserLang|navigator\.language|navigator\.userLanguage/);
  for (const countryCode of ['JP', 'US', 'KR', 'TW', 'HK', 'IN']) {
    assert.ok(
      html.includes(`support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3D${countryCode}&amp;hl=`),
      `公式確認リンクがありません: ${countryCode}`
    );
  }
});

test('注意ページの意味のある更新日を生成処理でも維持する', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['attention.html'], '2026-08-23');
  assert.match(html, /<meta name="last-modified" content="2026-08-23">/);
  assert.match(html, /"dateModified": "2026-08-23"/);
});
