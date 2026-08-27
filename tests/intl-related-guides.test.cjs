'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const { selectRelatedArticles } = require('../scripts/intl-related-guides.cjs');

const locales = ['en', 'ko', 'tw'];

function sidebarRelatedHrefs(html) {
  const list = html.match(/<ul class="sidebar-article-list">([\s\S]*?)<\/ul>/i);
  if (!list) return [];
  return [...list[1].matchAll(/<a href="([^"]+)">/g)].map(match => match[1]);
}

test('related guide ranking prefers concrete slug overlap, then the same topic', () => {
  const catalog = [
    { path: 'en/articles/google-play-points-levels.html', href: '/en/articles/google-play-points-levels.html', label: 'Levels' },
    { path: 'en/articles/2026-06-20-discount-gift-cards.html', href: '/en/articles/2026-06-20-discount-gift-cards.html', label: 'Discount gift cards' },
    { path: 'en/articles/google-play-points-payment-methods.html', href: '/en/articles/google-play-points-payment-methods.html', label: 'Payment methods' },
    { path: 'en/articles/google-play-points-country-change.html', href: '/en/articles/google-play-points-country-change.html', label: 'Country change' },
    { path: 'en/articles/google-play-points-gift-cards.html', href: '/en/articles/google-play-points-gift-cards.html', label: 'Gift cards' }
  ];

  const related = selectRelatedArticles(catalog, 'en/articles/google-play-points-gift-cards.html', 3);
  assert.deepEqual(related.map(([href]) => href), [
    '/en/articles/2026-06-20-discount-gift-cards.html',
    '/en/articles/google-play-points-payment-methods.html',
    '/en/articles/google-play-points-levels.html'
  ]);
  assert.doesNotMatch(related.flat().join('\n'), /google-play-points-gift-cards\.html/);
});

test('published international sidebars contain four existing links, never the current article', () => {
  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    const signatures = new Set();

    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      const hrefs = sidebarRelatedHrefs(html);
      assert.equal(hrefs.length, 4, `${locale}/${file}: related guide count`);
      assert.equal(new Set(hrefs).size, 4, `${locale}/${file}: related guides must be unique`);
      assert.ok(!hrefs.includes(`/${locale}/articles/${file}`), `${locale}/${file}: sidebar must not link to itself`);
      for (const href of hrefs) {
        const prefix = `/${locale}/articles/`;
        assert.ok(href.startsWith(prefix), `${locale}/${file}: related guide must stay in the same locale`);
        assert.ok(fs.existsSync(path.join(articleDir, href.slice(prefix.length))), `${locale}/${file}: missing related target ${href}`);
      }
      signatures.add(hrefs.join('|'));
    }

    assert.ok(signatures.size >= 6, `${locale}: sidebars should vary by article context, got only ${signatures.size} patterns`);
  }
});

test('high-signal published guides point to genuinely adjacent topics', () => {
  const enDir = path.join(root, 'en', 'articles');
  const giftCards = sidebarRelatedHrefs(fs.readFileSync(path.join(enDir, 'google-play-points-gift-cards.html'), 'utf8'));
  assert.ok(giftCards.includes('/en/articles/2026-06-20-discount-gift-cards.html'), 'gift-card guide should surface the discount gift-card guide');

  const countryChange = sidebarRelatedHrefs(fs.readFileSync(path.join(enDir, 'google-play-points-country-change.html'), 'utf8'));
  assert.ok(countryChange.includes('/en/articles/google-play-points-country-differences.html'), 'country-change guide should surface country differences');

  const coupon = sidebarRelatedHrefs(fs.readFileSync(path.join(enDir, 'google-play-points-coupon-not-applied.html'), 'utf8'));
  assert.ok(coupon.some(href => /promotion-not-applied|discounts-promo-codes/.test(href)), 'coupon troubleshooting should surface a promotion or promo-code guide');
});
