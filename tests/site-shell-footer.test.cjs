'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  LP_FOOTER_PROFILES,
  getLpFooterProfile,
  renderPageFooter
} = require('../scripts/site-shell.cjs');
const {
  normalizeLpFooter,
  stripLegacyFamilyFooters
} = require('../scripts/insert-lp-footers.cjs');

const root = path.resolve(__dirname, '..');

const canonicalFooterPages = Object.freeze([
  'points-cost/index.html',
  'en/points-cost/index.html',
  'ko/points-cost/index.html',
  'tw/points-cost/index.html',
  'en/maintenance/platinum/index.html',
  'en/maintenance/diamond/index.html',
  'ko/maintenance/platinum/index.html',
  'ko/maintenance/diamond/index.html',
  'tw/maintenance/platinum/index.html',
  'tw/maintenance/diamond/index.html'
]);

test('footer profiles are immutable and preserve locale, author and legal navigation', () => {
  assert.ok(Object.isFrozen(LP_FOOTER_PROFILES));
  for (const [locale, profile] of Object.entries(LP_FOOTER_PROFILES)) {
    assert.equal(getLpFooterProfile(locale), profile);
    assert.ok(Object.isFrozen(profile));
    assert.ok(Object.isFrozen(profile.links));
    assert.ok(profile.links.length > 0, locale + ': footer links must not be empty');

    const hrefs = profile.links.map(link => link.href);
    assert.equal(new Set(hrefs).size, hrefs.length, locale + ': footer hrefs must stay unique');
    assert.ok(hrefs.includes(locale === 'ja' ? '/' : '/' + locale + '/'), locale + ': locale home is missing');
    assert.ok(hrefs.includes(locale === 'ja' ? '/author/katakata.html' : '/' + locale + '/author/katakata.html'), locale + ': author/verification link is missing');
    assert.ok(hrefs.includes('/privacy.html'), locale + ': privacy link is missing');
    assert.ok(hrefs.includes('/terms.html'), locale + ': terms link is missing');
    assert.match(profile.disclaimer, /Google/);
    assert.match(profile.copyright, /^©\s+\d{4}\s+/);
  }
});

test('shared footer renderer preserves semantic footer structure and escapes unsafe copy', () => {
  const html = renderPageFooter({
    links: [{ href: '/?a=1&b=2', label: '<Home>' }],
    disclaimer: 'A & B',
    copyright: '© 2026 Test'
  });

  assert.match(html, /<footer class="page-footer">/);
  assert.match(html, /<p class="footer-nav-links">/);
  assert.match(html, /href="\/\?a=1&amp;b=2"/);
  assert.match(html, /&lt;Home&gt;/);
  assert.match(html, /<p class="site-footer-trademark">A &amp; B<\/p>/);
  assert.match(html, /<p class="copyright">© 2026 Test<\/p>/);
});

test('LP footer updater delegates markup ownership to the shared Site Shell renderer', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'insert-lp-footers.cjs'), 'utf8');
  assert.match(source, /require\('\.\/site-shell\.cjs'\)/);
  assert.match(source, /renderPageFooter\(getLpFooterProfile\(locKey\)\)/);
  assert.doesNotMatch(source, /const footerData\s*=/);
  assert.doesNotMatch(source, /footer-nav-links/);
  assert.doesNotMatch(source, /site-footer-trademark/);
  assert.doesNotMatch(source, /<p class="copyright">/);
});

test('legacy family footers are removed before the canonical Site Shell footer is synchronized', () => {
  const legacy = [
    '<main><p>body</p></main>',
    '<footer class="page-footer"><p>old canonical</p></footer>',
    '<footer class="points-cost-footer"><p>legacy points cost</p></footer>',
    '<footer class="maintenance-footer"><p>legacy maintenance</p></footer>'
  ].join('\n');

  const stripped = stripLegacyFamilyFooters(legacy);
  assert.doesNotMatch(stripped, /points-cost-footer|maintenance-footer/);

  const normalized = normalizeLpFooter(legacy, 'en');
  assert.equal((normalized.match(/<footer\b/g) || []).length, 1);
  assert.equal((normalized.match(/class="page-footer"/g) || []).length, 1);
  assert.doesNotMatch(normalized, /points-cost-footer|maintenance-footer/);
});

test('points-cost and international maintenance pages expose exactly one canonical footer', () => {
  for (const relativePath of canonicalFooterPages) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.equal((html.match(/<footer\b/g) || []).length, 1, `${relativePath}: footer must appear exactly once`);
    assert.equal((html.match(/class="page-footer"/g) || []).length, 1, `${relativePath}: canonical page-footer must appear exactly once`);
    assert.doesNotMatch(html, /class="(?:points-cost-footer|maintenance-footer)"/, `${relativePath}: legacy footer must not remain`);
  }
});

test('unknown LP locale falls back to the Japanese footer instead of producing an empty shell', () => {
  assert.equal(getLpFooterProfile('unknown'), getLpFooterProfile('ja'));
});
