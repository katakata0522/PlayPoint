'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  FIXED_PAGE_HEADER_PROFILES,
  getFixedPageHeaderProfile,
  renderFixedPageHeader
} = require('../scripts/site-shell.cjs');
const {
  locateTopBar,
  syncFixedPageHeaders
} = require('../scripts/fixed-page-header-sync.cjs');

const root = path.resolve(__dirname, '..');
const targetPaths = Object.keys(FIXED_PAGE_HEADER_PROFILES);

test('fixed-page headers are owned by one immutable Site Shell registry', () => {
  assert.ok(Object.isFrozen(FIXED_PAGE_HEADER_PROFILES));
  assert.ok(targetPaths.length > 0, 'fixed-page header target registry must not be empty');

  for (const relativePath of targetPaths) {
    const profile = getFixedPageHeaderProfile(relativePath);
    assert.ok(Object.isFrozen(profile), relativePath);
    assert.ok(Object.isFrozen(profile.navLinks), relativePath + ': navLinks');
    assert.ok(Object.isFrozen(profile.policyLinks), relativePath + ': policyLinks');
    assert.ok(profile.navLinks.length > 0 || profile.brandLink, relativePath + ': navigation is empty');
  }

  const attention = getFixedPageHeaderProfile('attention.html');
  assert.equal(attention.brandLink.href, './');
  assert.match(attention.brandLink.label, /PlayPoint Calculator/);
  assert.equal(attention.navAriaLabel, 'Calculator country or region');
  assert.ok(attention.navLinks.some(link => link.href === './hk/'));
  assert.ok(attention.navLinks.some(link => link.href === './in/'));
  assert.deepEqual(attention.policyLinks, []);
  assert.throws(() => getFixedPageHeaderProfile('unknown.html'), /No fixed-page header profile/);
});

test('Country & Region Guide keeps legal links out of the primary header and in the footer', () => {
  const html = fs.readFileSync(path.join(root, 'attention.html'), 'utf8');
  const located = locateTopBar(html, 'attention.html');
  assert.match(located.html, /PlayPoint Calculator/);
  assert.match(located.html, /Calculator country or region/);
  assert.doesNotMatch(located.html, /privacy\.html|terms\.html/i);

  const footer = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)?.[0] || '';
  assert.match(footer, /privacy\.html/);
  assert.match(footer, /terms\.html/);
});

test('committed fixed pages are already byte-canonical for the shared Header renderer', () => {
  for (const relativePath of targetPaths) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const located = locateTopBar(html, relativePath);
    const expected = renderFixedPageHeader(getFixedPageHeaderProfile(relativePath), located.indent);
    assert.equal(located.html, expected, `${relativePath} header drifted from Site Shell`);
  }
});

test('fixed-page Header synchronization repairs drift and becomes idempotent', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-site-shell-'));
  try {
    for (const relativePath of targetPaths) {
      fs.copyFileSync(path.join(root, relativePath), path.join(tempRoot, relativePath));
    }

    const clean = syncFixedPageHeaders(tempRoot);
    assert.equal(clean.changed, 0);
    assert.equal(clean.checked, targetPaths.length);

    const aboutPath = path.join(tempRoot, 'about-playpoints.html');
    fs.writeFileSync(
      aboutPath,
      fs.readFileSync(aboutPath, 'utf8').replace('>English</a>', '>English drift</a>'),
      'utf8'
    );

    const repaired = syncFixedPageHeaders(tempRoot);
    assert.deepEqual(repaired.changedFiles, ['about-playpoints.html']);
    assert.doesNotMatch(fs.readFileSync(aboutPath, 'utf8'), /English drift/);
    assert.equal(syncFixedPageHeaders(tempRoot).changed, 0);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('canonical build applies fixed-page Header synchronization before public asset finalization', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'build-html.js'), 'utf8');
  assert.match(source, /require\('\.\/fixed-page-header-sync\.cjs'\)/);
  const htmlSyncIndex = source.indexOf('syncHtmlFiles(rootDir');
  const headerSyncIndex = source.indexOf('syncFixedPageHeaders(rootDir)');
  const publicAssetsIndex = source.indexOf('syncPublicAssetVersions(rootDir)');
  assert.ok(htmlSyncIndex >= 0);
  assert.ok(headerSyncIndex > htmlSyncIndex);
  assert.ok(publicAssetsIndex > headerSyncIndex);
});
