'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const articleDir = path.join(root, 'articles');
const compatibilitySheets = ['article-legacy.css', 'article-modern.css'];

function japaneseArticleFiles() {
  return fs.readdirSync(articleDir)
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .sort();
}

function assertHeroNormalization(css, filename) {
  assert.match(
    css,
    /body\[data-article-category\]\s+\.main-content-column\s*>\s*\.hero\s*\{[^}]*background:\s*transparent;[^}]*padding:\s*0;[^}]*text-align:\s*left;[^}]*border-radius:\s*0;[^}]*box-shadow:\s*none;/is,
    `${filename}: published hero shell must yield to article-shared.css`
  );
  assert.match(
    css,
    /body\[data-article-category\]\s+\.main-content-column\s*>\s*\.hero\s+h1,[\s\S]*?body\[data-article-category\]\s+\.main-content-column\s*>\s*\.hero\s+\.article-title\s*\{[^}]*max-width:\s*none;[^}]*text-shadow:\s*none;/is,
    `${filename}: historical hero text decoration must be neutralized`
  );
}

test('legacy and modern compatibility CSS yield the published hero shell to shared CSS', () => {
  for (const filename of compatibilitySheets) {
    const css = fs.readFileSync(path.join(articleDir, filename), 'utf8');
    assertHeroNormalization(css, filename);
    assert.match(css, /article-shared\.css owns the published article chrome, layout and typography/i);
  }
});

test('Japanese legacy and modern articles load compatibility CSS before shared CSS', () => {
  let legacyCount = 0;
  let modernCount = 0;

  for (const file of japaneseArticleFiles()) {
    const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
    const sharedIndex = html.indexOf('article-shared.css');

    for (const sheet of compatibilitySheets) {
      const compatibilityIndex = html.indexOf(sheet);
      if (compatibilityIndex < 0) continue;

      if (sheet === 'article-legacy.css') legacyCount += 1;
      if (sheet === 'article-modern.css') modernCount += 1;

      assert.ok(sharedIndex > compatibilityIndex, `${file}: article-shared.css must load after ${sheet}`);
      assert.match(html, /<body\b[^>]*data-article-category=["'][^"']+["']/i, `${file}: missing article category hook`);
      assert.match(html, /class=["'][^"']*\bmain-content-column\b[^"']*["']/i, `${file}: missing shared main column`);
      assert.match(html, /<(?:header|div)\b[^>]*class=["'][^"']*\bhero\b[^"']*["']/i, `${file}: missing published hero`);

      if (sheet === 'article-legacy.css') {
        const localStylesheet = html.match(/href=["']\/articles\/styles\/[^"']+\.css(?:\?v=[^"']+)?["']/i);
        if (localStylesheet) {
          assert.ok(
            html.indexOf(localStylesheet[0]) < compatibilityIndex,
            `${file}: article-specific legacy CSS must load before article-legacy.css`
          );
        }
      }
    }
  }

  assert.ok(legacyCount > 0, 'legacy Japanese article fixture is missing');
  assert.ok(modernCount > 0, 'modern Japanese article fixture is missing');
});

test('shared CSS remains the final Japanese article typography contract', () => {
  const css = fs.readFileSync(path.join(articleDir, 'article-shared.css'), 'utf8');

  assert.match(css, /\.article-title,\s*\.hero h1\s*\{[^}]*color:\s*var\(--cocoon-heading\)/is);
  assert.match(css, /\.article-post-meta,\s*\.hero-meta\s*\{[^}]*color:\s*var\(--cocoon-muted\)/is);
  assert.match(css, /\.main-content-column\s*\{[^}]*background:\s*var\(--cocoon-main-bg\)[^}]*padding:\s*36px 40px/is);
});
