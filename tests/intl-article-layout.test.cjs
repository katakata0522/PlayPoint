'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'scripts', 'intl-article-layout.cjs');
const locales = ['en', 'ko', 'tw'];

test('international article shell synchronization is idempotent and preserves article content', () => {
  assert.ok(fs.existsSync(modulePath), 'international article layout synchronizer is missing');
  const { synchronizeIntlArticleLayouts } = require(modulePath);
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-layout-'));
  const articleDir = path.join(fixtureRoot, 'en', 'articles');
  fs.mkdirSync(articleDir, { recursive: true });
  const articlePath = path.join(articleDir, 'sample.html');
  const originalArticle = '<article class="content"><h1>Sample guide</h1><p>Keep this sentence exactly.</p></article>';
  fs.writeFileSync(articlePath, '<!doctype html><html lang="en"><body><main class="main-card">' + originalArticle + '</main></body></html>');

  synchronizeIntlArticleLayouts(fixtureRoot);
  const first = fs.readFileSync(articlePath, 'utf8');
  synchronizeIntlArticleLayouts(fixtureRoot);
  const second = fs.readFileSync(articlePath, 'utf8');

  assert.equal(second, first, 'layout synchronization must be idempotent');
  assert.ok(first.includes(originalArticle), 'article content must remain byte-for-byte intact');
  assert.match(first, /<!-- INTL_ARTICLE_CHROME_START -->[\s\S]*class="global-nav intl-global-nav"/);
  assert.match(first, /<!-- INTL_ARTICLE_LAYOUT_START -->[\s\S]*class="layout-container intl-layout-container"/);
  assert.match(first, /class="sidebar-column intl-article-sidebar"/);
  assert.ok(first.indexOf('INTL_ARTICLE_CHROME_START') < first.indexOf('INTL_ARTICLE_LAYOUT_START'));
});

test('international article synchronization rejects markup inside h1', () => {
  const { synchronizeIntlArticleLayouts } = require(modulePath);
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-title-'));
  const articleDir = path.join(fixtureRoot, 'en', 'articles');
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(
    path.join(articleDir, 'unsafe.html'),
    '<!doctype html><html lang="en"><body><main class="main-card"><h1>Guide <span>unsafe</span></h1></main></body></html>'
  );

  assert.throws(
    () => synchronizeIntlArticleLayouts(fixtureRoot),
    /article h1 must contain plain text/
  );
});

test('all published international articles use the Japanese article layout structure', () => {
  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    assert.ok(files.length > 0, locale + ': article pages are missing');

    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      assert.equal((html.match(/<!-- INTL_ARTICLE_CHROME_START -->/g) || []).length, 1, locale + '/' + file + ': chrome start marker');
      assert.equal((html.match(/class="global-nav intl-global-nav"/g) || []).length, 1, locale + '/' + file + ': Japanese-style global navigation');
      assert.equal((html.match(/class="layout-container intl-layout-container"/g) || []).length, 1, locale + '/' + file + ': two-column wrapper');
      assert.equal((html.match(/class="sidebar-column intl-article-sidebar"/g) || []).length, 1, locale + '/' + file + ': sidebar');
      assert.equal((html.match(/<main\b[^>]*class=["'][^"']*\bmain-card\b[^"']*["']/g) || []).length, 1, locale + '/' + file + ': main article');
    }
  }
});

test('international article CSS inherits the Japanese visual contract instead of replacing it', () => {
  const css = fs.readFileSync(path.join(root, 'en', 'articles', 'intl-article.css'), 'utf8');
  assert.doesNotMatch(css, /--brand:|--hero:|--interaction:/i, 'international CSS must not replace Japanese shared theme tokens');
  assert.match(css, /\.intl-layout-container \.main-card\s*\{[^}]*border-radius:\s*6px/is);
  assert.match(css, /\.intl-layout-container \.main-card\s*\{[^}]*padding:\s*36px 40px/is);
  assert.match(css, /\.intl-layout-container \.hero\s*\{[^}]*background:\s*transparent/is);
  assert.match(css, /\.intl-layout-container \.content\s*\{[^}]*padding:\s*0/is);
});
