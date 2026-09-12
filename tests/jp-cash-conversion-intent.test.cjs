'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'articles', '2026-07-24-play-points-cash-conversion.html'), 'utf8');

test('JP cash-conversion owns cash/PayPay intent instead of generic recommendation intent', () => {
  assert.ok(html.includes('<title>Google Play Pointsは現金化・PayPay交換できる？できない理由と使い道</title>'));
  assert.equal(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1], 'Google Play Pointsは現金化・PayPay交換できる？できない理由と使い道');
  assert.ok(html.includes('結論：現金化・PayPay交換はできない。代わりに公式の使い道を選ぶ'));
  assert.ok(html.includes('./2025-12-25-best-use.html'), 'generic recommendation intent should route to best-use');
  assert.ok(!html.includes('Google Play Pointsは現金化できる？交換先・使い道を比較'));
});

test('editorial update and official verification remain separate metadata fields', () => {
  assert.match(html, /<meta name="last-modified" content="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /data-article-date="modified" datetime="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /data-article-date="official-verified" datetime="\d{4}-\d{2}-\d{2}"/);
});
