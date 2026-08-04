'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/html-sync.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'attention.html'), 'utf8');

test('注意ページは既存モードをそのまま使える国を正確に分類する', () => {
  assert.match(html, /United States, United Kingdom, France, Germany, Italy, Spain/);
  assert.match(html, /Exact match:<\/strong> Japan only/);
  assert.match(html, /Exact match:<\/strong> South Korea only/);
  assert.match(html, /Exact match:<\/strong> Taiwan only/);
  assert.match(html, /Only the displayed currency symbol remains “\$”/);
});

test('似ているだけの国を完全一致として案内しない', () => {
  assert.match(html, /Hong Kong uses the same 250 \/ 1,000 \/ 4,000 \/ 15,000 thresholds/);
  assert.match(html, /earns 1 point per <strong>HK\$7<\/strong>/);
  assert.match(html, /US-like through Platinum, but not a full US-mode match/);
  assert.match(html, /Australia, Austria, Belgium, Brazil, Finland, Greece, Ireland, Netherlands, New Zealand, Portugal, Switzerland/);
  assert.match(html, /Denmark \(6 DKK\), Norway \(6 NOK\), Sweden \(7 SEK\), Israel \(3 ILS\), Saudi Arabia \(4 SAR\), South Africa \(17 ZAR\), United Arab Emirates \(4 AED\)/);
});

test('国をブラウザ言語だけで推測せず公式確認導線を残す', () => {
  assert.doesNotMatch(html, /browserLang|navigator\.language|navigator\.userLanguage/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348\?hl=en/);
  assert.match(html, /Checked against the official country tables on <time datetime="2026-08-04">August 4, 2026<\/time>/);
});

test('注意ページの確認日をサイト全体の更新日で巻き戻さない', () => {
  assert.equal(CONTENT_DATE_OVERRIDES['attention.html'], '2026-08-04');
  assert.match(html, /<meta name="last-modified" content="2026-08-04">/);
  assert.match(html, /"dateModified": "2026-08-04"/);
});
