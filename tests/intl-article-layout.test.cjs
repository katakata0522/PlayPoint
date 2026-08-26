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
  assert.match(first, /<!-- INTL_ARTICLE_CHROME_START -->[\s\S]*class="site-header intl-article-site-header"/);
  assert.match(first, /class="breadcrumbs-wrapper intl-article-breadcrumbs"/);
  assert.ok(first.indexOf('INTL_ARTICLE_CHROME_START') < first.indexOf('<main class="main-card">'));
  assert.doesNotMatch(first, /class="sidebar-column"/);
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
test('all published international articles use the shared localized article chrome', () => {
  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    assert.ok(files.length > 0, locale + ': article pages are missing');

    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      assert.equal((html.match(/<!-- INTL_ARTICLE_CHROME_START -->/g) || []).length, 1, locale + '/' + file + ': chrome start marker');
      assert.equal((html.match(/class="site-header intl-article-site-header"/g) || []).length, 1, locale + '/' + file + ': localized header');
      assert.equal((html.match(/class="breadcrumbs-wrapper intl-article-breadcrumbs"/g) || []).length, 1, locale + '/' + file + ': breadcrumbs');
      assert.ok(html.indexOf('INTL_ARTICLE_CHROME_START') < html.indexOf('<main class="main-card">'), locale + '/' + file + ': chrome precedes article');
      assert.doesNotMatch(html, /class="sidebar-column"/, locale + '/' + file + ': Japan-specific sidebar must not be copied');
    }
  }
});

test('international article CSS follows the current Japanese article visual contract', () => {
  const css = fs.readFileSync(path.join(root, 'en', 'articles', 'intl-article.css'), 'utf8');
  assert.doesNotMatch(css, /#667eea|#764ba2/i, 'legacy purple theme must not remain');
  assert.match(css, /--brand:\s*#124ea4/i);
  assert.match(css, /\.main-card\s*\{[^}]*max-width:\s*860px/is);
  assert.match(css, /\.hero\s*\{[^}]*text-align:\s*left/is);
  assert.match(css, /\.cta-btn\s*\{[^}]*border-radius:\s*8px/is);
  assert.match(css, /\.intl-article-breadcrumbs \.intl-breadcrumb-current\s*\{[^}]*color:\s*#475569/is);
});
