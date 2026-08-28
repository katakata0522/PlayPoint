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
  const trailingScript = '<script src="/test.js"></script>';
  fs.writeFileSync(articlePath, '<!doctype html><html lang="en"><body><main class="main-card">' + originalArticle + '</main>\n' + trailingScript + '</body></html>');

  synchronizeIntlArticleLayouts(fixtureRoot);
  const first = fs.readFileSync(articlePath, 'utf8');
  synchronizeIntlArticleLayouts(fixtureRoot);
  const second = fs.readFileSync(articlePath, 'utf8');

  assert.equal(second, first, 'layout synchronization must be idempotent');
  assert.match(first, /<!-- INTL_ARTICLE_LAYOUT_END -->\n<script src="\/test\.js"><\/script>/, 'layout boundary must keep exactly one newline before trailing scripts');
  assert.ok(first.includes('<h1>Sample guide</h1>'), 'article heading must remain intact');
  assert.ok(first.includes('<p>Keep this sentence exactly.</p>'), 'article copy must remain intact');
  assert.equal((first.match(/data-generated-intl-article-prompt=\"true\"/g) || []).length, 1, 'localized reading prompt must be generated exactly once');
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
      assert.match(html, /<!-- INTL_ARTICLE_LAYOUT_END -->\r?\n/, locale + '/' + file + ': layout end must be followed by a newline');
      assert.doesNotMatch(html, /<!-- INTL_ARTICLE_LAYOUT_END --><\S/, locale + '/' + file + ': trailing markup must never be glued to layout end');
    }
  }
});

test('international article CSS inherits the Japanese visual contract instead of replacing it', () => {
  const css = fs.readFileSync(path.join(root, 'articles', 'intl-article.css'), 'utf8');
  assert.doesNotMatch(css, /--brand:|--hero:|--interaction:/i, 'international CSS must not replace Japanese shared theme tokens');
  assert.match(css, /\.intl-layout-container \.main-card\s*\{[^}]*border-radius:\s*6px/is);
  assert.match(css, /\.intl-layout-container \.main-card\s*\{[^}]*padding:\s*36px 40px/is);
  assert.match(css, /\.intl-layout-container \.hero\s*\{[^}]*background:\s*transparent/is);
  assert.match(css, /\.intl-layout-container \.content\s*\{[^}]*padding:\s*0/is);
});

test('international article typography keeps translated headings readable without hard-coded breaks', () => {
  const css = fs.readFileSync(path.join(root, 'articles', 'intl-article.css'), 'utf8');
  assert.match(css, /\.intl-layout-container \.hero h1,[\s\S]*?\.intl-layout-container \.sidebar-widget-title\s*\{[^}]*text-wrap:\s*balance/is);
  assert.match(css, /\.intl-layout-container \.sidebar-article-list li,[\s\S]*?\.intl-article-breadcrumbs nav\s*\{[^}]*text-wrap:\s*pretty/is);
  assert.doesNotMatch(css, /word-break:\s*break-all/i, 'international article text must not be split arbitrarily inside words');

  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      for (const heading of html.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
        assert.doesNotMatch(heading[2], /<br\b/i, locale + '/' + file + ': headings must wrap responsively instead of using forced line breaks');
      }
    }
  }
});

test('international article shell follows the Japanese navigation and sidebar rhythm in each language', () => {
  for (const locale of locales) {
    const html = fs.readFileSync(path.join(root, locale, 'articles', 'google-play-points-country-change.html'), 'utf8');
    assert.match(html, /class="global-nav-inner"[\s\S]*?nav-item[\s\S]*?nav-item[\s\S]*?nav-item[\s\S]*?nav-item[\s\S]*?nav-item[\s\S]*?nav-item/, locale + ': six-part Japanese-style navigation');
    assert.match(html, /sidebar-rank-grid/, locale + ': localized level and reward quick links');
    assert.match(html, /sidebar-event-item/, locale + ': localized pre-purchase checks');
    assert.match(html, /sidebar-tip-box/, locale + ': localized regional rule tip');
    assert.match(html, /sidebar-category-list/, locale + ': category navigation');
    assert.ok(html.includes(`href="/${locale}/author/katakata.html"`), locale + ': localized editorial policy link');
    assert.match(html, /href="\/articles\/intl-article\.css(?:\?[^"']*)?"/, locale + ': neutral shared international stylesheet');
    assert.doesNotMatch(html, /href="\/en\/articles\/intl-article\.css/, locale + ': must not depend on English directory for shared CSS');
  }
});

test('localized author pages share the international Japanese-style shell', () => {
  for (const locale of locales) {
    const file = path.join(root, locale, 'author', 'katakata.html');
    assert.ok(fs.existsSync(file), locale + ': localized author page missing');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /class="layout-container intl-layout-container"/);
    assert.match(html, /class="sidebar-column intl-article-sidebar"/);
    assert.match(html, /hreflang="ja"/);
    assert.ok(html.includes(`canonical" href="https://playpoint-sim.com/${locale}/author/katakata.html"`), locale + ': localized canonical URL');
  }
});

test('international article CSS has one canonical writer', () => {
  const pagesSource = fs.readFileSync(path.join(root, 'scripts', 'intl-seo-pages.cjs'), 'utf8');
  const layoutSource = fs.readFileSync(modulePath, 'utf8');
  assert.match(pagesSource, /minifyCSS\(INTL_LAYOUT_CSS\)/);
  assert.doesNotMatch(pagesSource, /minifyCSS\(INTL_ARTICLE_CSS\)/);
  assert.doesNotMatch(layoutSource, /function synchronizeIntlArticleStylesheet/);
});
