'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const EXPECTED = new Map([
  ['articles/2025-12-25-weekly-reward.html', './2026-08-16-play-pass-worth-it.html'],
  ['articles/2026-08-16-play-pass-worth-it.html', './2026-08-03-play-points-device-change.html'],
  ['articles/2026-08-03-play-points-device-change.html', './2026-08-05-play-country-change-points.html'],
  ['articles/2026-08-16-points-disappeared.html', './2025-12-25-expiration.html'],
  ['articles/2025-12-25-diamond-vip.html', './2026-09-19-google-play-super-ticket.html'],
  ['articles/2025-12-25-playpoints-rank-maintenance.html', './2025-12-25-refund.html'],
  ['articles/2026-07-24-play-points-1-value.html', './2025-12-25-best-use.html'],
  ['articles/2026-08-16-payment-methods-points.html', './2025-12-25-gift-card.html'],
  ['articles/2026-07-25-play-credit-not-working.html', './2025-12-25-expiration.html'],
  ['articles/2025-12-25-getting-started.html', './2025-12-25-best-use.html'],
  ['articles/2026-08-19-redeemed-item-not-received.html', './2025-12-25-check-balance.html'],
  ['articles/2026-08-16-gold-platinum-worth-it.html', './2026-08-16-play-pass-worth-it.html']
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('selected Japanese guides use one restrained contextual related-guide card', () => {
  for (const [file, href] of EXPECTED) {
    const html = read(file);
    const cards = html.match(/class=["'][^"']*\\barticle-context-link\\b[^"']*["']/g) || [];
    assert.equal(cards.length, 1, file + ': contextual card count');
    assert.match(html, new RegExp('href=["\\']' + escapeRegExp(href) + '["\\']'), file + ': expected contextual target');

    const match = html.match(/<aside\\b[^>]*class=["'][^"']*\\barticle-context-link\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/aside>/i);
    const card = match ? match[1] : '';
    assert.match(card, /関連ガイド/);
    assert.doesNotMatch(card, />\\s*(?:こちら|詳細|詳しくはこちら)\\s*(?:→)?\\s*<\\/a>/);
  }
});

test('contextual related-guide card stays visually quieter than primary CTA', () => {
  const css = read('articles/article-shared.css');
  assert.match(css, /\\.article-context-link\\s*\\{/);
  assert.match(css, /border-left:\\s*3px solid var\\(--article-accent\\)/);
  assert.match(css, /font-size:\\s*14px/);
  const block = (css.match(/\\.article-context-link\\s*\\{[\\s\\S]*?\\}/) || [''])[0];
  assert.doesNotMatch(block, /linear-gradient|box-shadow/);
});
