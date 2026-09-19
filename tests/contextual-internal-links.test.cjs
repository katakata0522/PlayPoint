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
    const cards = html.match(/data-contextual-nav=["']editorial["']/g) || [];
    assert.equal(cards.length, 1, file + ': contextual card count');
    assert.match(html, new RegExp("href=[\\\"']" + escapeRegExp(href) + "[\\\"']"), file + ': expected contextual target');

    const match = html.match(/<nav\\b[^>]*data-contextual-nav=["']editorial["'][^>]*>([\\s\\S]*?)<\\/nav>/i);
    const card = match ? match[1] : '';
    assert.match(card, /関連ガイド/);
    assert.doesNotMatch(card, />\\s*(?:こちら|詳細|詳しくはこちら)\\s*(?:→)?\\s*<\\/a>/);

    const navIndex = html.indexOf('data-contextual-nav="editorial"');
    const sectionStart = html.lastIndexOf('<section', navIndex);
    const sectionOpenEnd = sectionStart >= 0 ? html.indexOf('>', sectionStart) : -1;
    const sectionOpen = sectionStart >= 0 && sectionOpenEnd >= 0 ? html.slice(sectionStart, sectionOpenEnd + 1) : '';
    assert.doesNotMatch(sectionOpen, /answer-box|editorial-answer/, file + ': card must stay outside the primary answer box');

    const lastCalloutStart = html.lastIndexOf('<div class="callout', navIndex);
    const lastDivClose = html.lastIndexOf('</div>', navIndex);
    assert.ok(lastCalloutStart < 0 || lastDivClose > lastCalloutStart, file + ': card must stay outside callout boxes');
  }
});
