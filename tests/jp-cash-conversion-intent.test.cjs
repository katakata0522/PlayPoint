'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'articles', '2026-07-24-play-points-cash-conversion.html'), 'utf8');

test('JP cash-conversion owns cash/PayPay intent instead of generic recommendation intent', () => {
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '';
  for (const text of [title, h1]) {
    assert.match(text, /現金化/);
    assert.match(text, /PayPay/);
  }
  assert.match(html, /現金化[\s\S]{0,120}(?:できない|不可)/);
  assert.ok(html.includes('./2025-12-25-best-use.html'), 'generic recommendation intent should route to best-use');
});

test('editorial update and official verification remain separate metadata fields', () => {
  assert.match(html, /<meta name="last-modified" content="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /data-article-date="modified" datetime="\d{4}-\d{2}-\d{2}"/);
  assert.match(html, /data-article-date="official-verified" datetime="\d{4}-\d{2}-\d{2}"/);
});
