const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('international article hubs use the shared article shell and grouped cards', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/index.html`);
    assert.match(html, /intl-article-site-header/);
    assert.match(html, /layout-container intl-layout-container/);
    assert.match(html, /main-card intl-article-hub/);
    assert.match(html, /section related-links-section/);
    assert.match(html, /sidebar-column intl-article-sidebar/);
  }
});

test('legacy gift-card stylesheet cannot override international article layout', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/2026-06-20-discount-gift-cards.html`);
    assert.doesNotMatch(html, /article-gift-card\.css/);
    assert.match(html, /\/articles\/intl-article\.css/);
    assert.doesNotMatch(html, /\/en\/articles\/intl-article\.css/);
    assert.match(html, /layout-container intl-layout-container/);
  }
});

test('Japanese articles remain the source layout and do not load international overrides', () => {
  const articleDir = path.join(ROOT, 'articles');
  const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html'));
  for (const file of files) {
    const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
    assert.doesNotMatch(
      html,
      /href=["']\/(?:en\/)?articles\/intl-article\.css/,
      `${file}: Japanese source-layout articles must not depend on international CSS overrides`
    );
  }
});

test('international font stacks include local Korean and Traditional Chinese fallbacks', () => {
  const cssSource = read('scripts/intl-article-layout.cjs');
  assert.match(cssSource, /Apple SD Gothic Neo/);
  assert.match(cssSource, /Malgun Gothic/);
  assert.match(cssSource, /PingFang TC/);
  assert.match(cssSource, /Microsoft JhengHei/);
});

test('audited English answer headings stay compact', () => {
  const expectations = new Map([
    ['en/articles/google-play-games-vs-play-points.html', 'Answer: Play Games XP and Play Points are separate systems'],
    ['en/articles/google-play-points-apps-books-purchases.html', 'Answer: eligible Google Play purchases can earn Play Points'],
    ['en/articles/google-play-points-earn-free.html', 'Answer: check account benefits before adding a purchase']
  ]);
  for (const [file, heading] of expectations) {
    const html = read(file);
    assert.match(html, new RegExp(`<h2>${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}</h2>`));
  }
});
