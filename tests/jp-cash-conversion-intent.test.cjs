'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'articles', '2026-07-24-play-points-cash-conversion.html'), 'utf8');

test('JP cash-conversion owns cash/PayPay intent instead of generic recommendation intent', () => {
  assert.ok(html.includes('<title>Google Play Pointsは現金化・PayPay交換できる？できない理由と使い道</title>'));
  assert.ok(html.includes('<h1 class="article-title">Google Play Pointsは現金化・PayPay交換できる？できない理由と使い道</h1>'));
  assert.ok(html.includes('結論：現金化・PayPay交換はできない。代わりに公式の使い道を選ぶ'));
  assert.ok(html.includes('./2025-12-25-best-use.html'), 'generic recommendation intent should route to best-use');
  assert.ok(!html.includes('Google Play Pointsは現金化できる？交換先・使い道を比較'));
});

test('metadata reflects editorial change without claiming a new official verification', () => {
  assert.ok(html.includes('<meta name="last-modified" content="2026-09-03"'));
  assert.ok(html.includes('data-article-date="modified" datetime="2026-09-03"'));
  assert.ok(html.includes('data-article-date="official-verified" datetime="2026-08-04"'));
});
