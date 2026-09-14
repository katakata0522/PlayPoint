'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  LEGAL_LANGUAGE_NAV_LINKS,
  LEGAL_LANGUAGE_NAV_TARGETS,
  locateLegalLanguageNav,
  renderLegalLanguageNav,
  synchronizeLegalLanguageNav,
  syncLegalPageLanguageNavs
} = require('../scripts/legal-page-lang-nav-sync.cjs');

const rootDir = path.join(__dirname, '..');

test('法務ページの言語ナビは2ページだけを同一の不変SSOTで所有する', () => {
  assert.deepEqual([...LEGAL_LANGUAGE_NAV_TARGETS], ['privacy.html', 'terms.html']);
  assert.equal(Object.isFrozen(LEGAL_LANGUAGE_NAV_TARGETS), true);
  assert.equal(Object.isFrozen(LEGAL_LANGUAGE_NAV_LINKS), true);
  assert.equal(LEGAL_LANGUAGE_NAV_LINKS.length, 4);
  for (const link of LEGAL_LANGUAGE_NAV_LINKS) assert.equal(Object.isFrozen(link), true);
});

test('privacyとtermsの公開HTMLは共通rendererと既にバイト一致する', () => {
  for (const relativePath of LEGAL_LANGUAGE_NAV_TARGETS) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const located = locateLegalLanguageNav(source, relativePath);
    assert.equal(located.html, renderLegalLanguageNav(located.indent), relativePath);
  }
});

test('法務ナビのdriftを修復し、2回目はbyte-idempotentになる', () => {
  const source = fs.readFileSync(path.join(rootDir, 'privacy.html'), 'utf8');
  const drifted = source.replace('>English</a>', '>English (drift)</a>');
  const repaired = synchronizeLegalLanguageNav(drifted, 'privacy.html');
  assert.equal(repaired.changed, true);
  assert.equal(repaired.html, source);
  const clean = synchronizeLegalLanguageNav(repaired.html, 'privacy.html');
  assert.equal(clean.changed, false);
  assert.equal(clean.html, source);
});

test('ファイル同期は対象2ページ以外へ触れず、check後も冪等である', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-legal-nav-'));
  try {
    for (const relativePath of LEGAL_LANGUAGE_NAV_TARGETS) {
      fs.copyFileSync(path.join(rootDir, relativePath), path.join(tempRoot, relativePath));
    }
    let summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: 2, changed: 0, changedFiles: [] });

    const termsPath = path.join(tempRoot, 'terms.html');
    fs.writeFileSync(termsPath, fs.readFileSync(termsPath, 'utf8').replace('>한국어</a>', '>한국어 drift</a>'));
    summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: 2, changed: 1, changedFiles: ['terms.html'] });
    summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: 2, changed: 0, changedFiles: [] });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('canonical buildはHTML同期後・公開asset確定前に法務ナビを同期する', () => {
  const build = fs.readFileSync(path.join(rootDir, 'scripts', 'build-html.js'), 'utf8');
  const htmlSync = build.indexOf('syncHtmlFiles(rootDir');
  const fixedHeaderSync = build.indexOf('syncFixedPageHeaders(rootDir)');
  const legalNavSync = build.indexOf('syncLegalPageLanguageNavs(rootDir)');
  const publicAssets = build.indexOf('syncPublicAssetVersions(rootDir)');
  assert.ok(htmlSync >= 0 && fixedHeaderSync > htmlSync);
  assert.ok(legalNavSync > fixedHeaderSync);
  assert.ok(publicAssets > legalNavSync);
});
