'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  LEGAL_NAV_LINKS,
  LEGAL_NAV_TARGETS,
  locateLegalPageNav,
  renderLegalPageNav,
  synchronizeLegalPageNav,
  syncLegalPageLanguageNavs
} = require('../scripts/legal-page-lang-nav-sync.cjs');

const rootDir = path.join(__dirname, '..');

test('法務ページは日本語文書として、誤解のないPlayPoint内ナビだけを共有する', () => {
  assert.deepEqual([...LEGAL_NAV_TARGETS], ['privacy.html', 'terms.html']);
  assert.equal(Object.isFrozen(LEGAL_NAV_TARGETS), true);
  assert.equal(Object.isFrozen(LEGAL_NAV_LINKS), true);
  assert.deepEqual(LEGAL_NAV_LINKS.map(link => [link.href, link.label]), [
    ['./', '← Playポイント計算機'],
    ['attention.html', '国・地域ガイド']
  ]);
  for (const link of LEGAL_NAV_LINKS) assert.equal(Object.isFrozen(link), true);
});

test('privacyとtermsの公開HTMLは共通rendererと既にバイト一致し、偽の言語切替を出さない', () => {
  for (const relativePath of LEGAL_NAV_TARGETS) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const located = locateLegalPageNav(source, relativePath);
    assert.equal(located.html, renderLegalPageNav(located.indent), relativePath);
    assert.match(located.html, /aria-label="PlayPoint内ナビゲーション"/);
    assert.match(located.html, />← Playポイント計算機<\/a>/);
    assert.match(located.html, />国・地域ガイド<\/a>/);
    assert.doesNotMatch(located.html, />English<\/a>|>한국어<\/a>|>繁體中文<\/a>/);
  }
});

test('旧lang-navを新しい法務ナビへ移行し、2回目はbyte-idempotentになる', () => {
  const source = fs.readFileSync(path.join(rootDir, 'privacy.html'), 'utf8');
  const located = locateLegalPageNav(source, 'privacy.html');
  const legacy = '<div class="lang-nav" style="text-align:right"><a href="./en/">English</a></div>';
  const drifted = `${source.slice(0, located.start)}${located.indent}${legacy}${source.slice(located.end)}`;
  const repaired = synchronizeLegalPageNav(drifted, 'privacy.html');
  assert.equal(repaired.changed, true);
  assert.equal(repaired.html, source);
  const clean = synchronizeLegalPageNav(repaired.html, 'privacy.html');
  assert.equal(clean.changed, false);
  assert.equal(clean.html, source);
});

test('ファイル同期は対象2ページ以外へ触れず、check後も冪等である', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-legal-nav-'));
  try {
    for (const relativePath of LEGAL_NAV_TARGETS) {
      fs.copyFileSync(path.join(rootDir, relativePath), path.join(tempRoot, relativePath));
    }
    let summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: LEGAL_NAV_TARGETS.length, changed: 0, changedFiles: [] });

    const termsPath = path.join(tempRoot, 'terms.html');
    fs.writeFileSync(termsPath, fs.readFileSync(termsPath, 'utf8').replace('>国・地域ガイド</a>', '>地域ガイド drift</a>'));
    summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: LEGAL_NAV_TARGETS.length, changed: 1, changedFiles: ['terms.html'] });
    summary = syncLegalPageLanguageNavs(tempRoot);
    assert.deepEqual(summary, { checked: LEGAL_NAV_TARGETS.length, changed: 0, changedFiles: [] });
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
