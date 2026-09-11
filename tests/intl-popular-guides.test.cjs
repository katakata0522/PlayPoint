'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  INTL_POPULAR_GUIDES,
  POPULAR_GUIDES_SNAPSHOT,
  getPopularGuides
} = require('../scripts/intl-popular-guides.cjs');

const locales = ['en', 'ko', 'tw'];

test('popular guide SSOT uses the stable recent-readership snapshot', () => {
  assert.equal(POPULAR_GUIDES_SNAPSHOT, '2026-09-02');
  for (const locale of locales) {
    const entries = INTL_POPULAR_GUIDES[locale];
    assert.equal(entries.length, 5, locale + ': exactly five popular guides');
    assert.equal(new Set(entries.map(([href]) => href)).size, 5, locale + ': popular guides must be unique');
    for (const [href, label] of entries) {
      const prefix = `/${locale}/articles/`;
      assert.ok(href.startsWith(prefix), locale + ': popular guide must stay in locale');
      assert.ok(label.trim().length > 0, locale + ': popular label required');
      assert.ok(fs.existsSync(path.join(root, href.slice(1))), locale + ': popular target must exist: ' + href);
    }
  }
});

test('popular guide helper preserves ranking while marking the current page', () => {
  const currentHref = INTL_POPULAR_GUIDES.en[0][0];
  const items = getPopularGuides('en', currentHref, 5);
  assert.deepEqual(items.map(item => item.rank), [1, 2, 3, 4, 5]);
  assert.equal(items[0].isCurrent, true);
  assert.equal(items.filter(item => item.isCurrent).length, 1);
});

test('rendered popular sidebars show five positions and never link the current popular page to itself', () => {
  for (const locale of locales) {
    const currentHref = INTL_POPULAR_GUIDES[locale][0][0];
    const html = fs.readFileSync(path.join(root, currentHref.slice(1)), 'utf8');
    const block = html.match(/<section class="sidebar-widget sidebar-widget--popular"[\s\S]*?<\/section>/i)?.[0] || '';
    assert.ok(block, locale + ': popular widget missing');
    assert.equal((block.match(/sidebar-popular-item/g) || []).length, 5, locale + ': five visible ranking positions');
    assert.match(block, /sidebar-popular-item is-current/, locale + ': current popular guide must be marked');
    assert.doesNotMatch(block, new RegExp(`<a[^>]*href="${currentHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), locale + ': current popular guide must not self-link');
  }
});
