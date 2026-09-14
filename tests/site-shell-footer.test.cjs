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

const root = path.resolve(__dirname, '..');

const expectedPrimaryLinks = Object.freeze({
  ja: ['/', '/games/', '/blog/', '/author/katakata.html', '/privacy.html', '/terms.html'],
  en: ['/en/', '/en/games/', '/en/articles/', '/author/katakata.html', '/privacy.html', '/terms.html'],
  ko: ['/ko/', '/ko/games/', '/ko/articles/', '/author/katakata.html', '/privacy.html', '/terms.html'],
  tw: ['/tw/', '/tw/games/', '/tw/articles/', '/author/katakata.html', '/privacy.html', '/terms.html']
});

test('Stage 12A footer profiles are immutable and keep the current six-link structure', () => {
  assert.ok(Object.isFrozen(LP_FOOTER_PROFILES));
  for (const [locale, expectedHrefs] of Object.entries(expectedPrimaryLinks)) {
    const profile = getLpFooterProfile(locale);
    assert.ok(Object.isFrozen(profile));
    assert.ok(Object.isFrozen(profile.links));
    assert.deepEqual(profile.links.map(link => link.href), expectedHrefs);
    assert.match(profile.disclaimer, /Google/);
    assert.match(profile.copyright, /^© 2026 /);
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

test('unknown LP locale falls back to the Japanese footer instead of producing an empty shell', () => {
  assert.equal(getLpFooterProfile('unknown'), getLpFooterProfile('ja'));
});
