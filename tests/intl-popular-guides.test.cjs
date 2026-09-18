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
const { INTERNATIONAL_LOCALES } = require('../scripts/locale-ids.cjs');

const locales = INTERNATIONAL_LOCALES;

test('popular guide SSOT uses a dated recent-readership snapshot', () => {
  assert.match(POPULAR_GUIDES_SNAPSHOT, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(`${POPULAR_GUIDES_SNAPSHOT}T00:00:00Z`)), 'snapshot date must be parseable');
  for (const locale of locales) {
    const entries = INTL_POPULAR_GUIDES[locale];
    assert.ok(entries.length > 0, locale + ': popular guide list must not be empty');
    assert.equal(new Set(entries.map(([href]) => href)).size, entries.length, locale + ': popular guides must be unique');
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
  const items = getPopularGuides('en', currentHref, INTL_POPULAR_GUIDES.en.length);
  assert.deepEqual(items.map(item => item.rank), items.map((_, index) => index + 1));
  assert.equal(items[0].isCurrent, true);
  assert.equal(items.filter(item => item.isCurrent).length, 1);
});

test('rendered popular sidebars match the helper output and never self-link the current page', () => {
  for (const locale of locales) {
    const currentHref = INTL_POPULAR_GUIDES[locale][0][0];
    const expected = getPopularGuides(locale, currentHref);
    const html = fs.readFileSync(path.join(root, currentHref.slice(1)), 'utf8');
    const block = html.match(/<section class="sidebar-widget sidebar-widget--popular"[\s\S]*?<\/section>/i)?.[0] || '';
    assert.ok(block, locale + ': popular widget missing');
    assert.equal((block.match(/sidebar-popular-item/g) || []).length, expected.length, locale + ': rendered ranking count');
    assert.match(block, /sidebar-popular-item is-current/, locale + ': current popular guide must be marked');
    assert.doesNotMatch(block, new RegExp(`<a[^>]*href="${currentHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), locale + ': current popular guide must not self-link');
  }
});