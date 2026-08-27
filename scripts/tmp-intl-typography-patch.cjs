'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function replaceOnce(filePath, before, after, label) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes(before)) throw new Error(label + ': insertion point not found');
  if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(label + ': insertion point is not unique');
  fs.writeFileSync(filePath, source.replace(before, after), 'utf8');
}

const layoutPath = path.join(root, 'scripts', 'intl-article-layout.cjs');
replaceOnce(
  layoutPath,
  `.intl-layout-container .hero h1 {\nmax-width: none;\n}\n\n.intl-layout-container .content {\npadding: 0;\n}\n`,
  `.intl-layout-container .hero h1 {\nmax-width: none;\n}\n\n.intl-layout-container .hero h1,\n.intl-layout-container .content h2,\n.intl-layout-container .content h3,\n.intl-layout-container .sidebar-widget-title {\ntext-wrap: balance;\n}\n\n.intl-layout-container .sidebar-article-list li,\n.intl-layout-container .content .cta-box .cta-btn,\n.intl-article-breadcrumbs nav {\ntext-wrap: pretty;\n}\n\n.intl-layout-container .content {\npadding: 0;\n}\n`,
  'international typography CSS'
);

const testPath = path.join(root, 'tests', 'intl-article-layout.test.cjs');
const marker = "test('international article CSS has one canonical writer', () => {";
const testBlock = `test('international article typography keeps translated headings readable without hard-coded breaks', () => {\n  const css = fs.readFileSync(path.join(root, 'en', 'articles', 'intl-article.css'), 'utf8');\n  assert.match(css, /\\.intl-layout-container \\.hero h1,[\\s\\S]*?\\.intl-layout-container \\.sidebar-widget-title\\s*\\{[^}]*text-wrap:\\s*balance/is);\n  assert.match(css, /\\.intl-layout-container \\.sidebar-article-list li,[\\s\\S]*?\\.intl-article-breadcrumbs nav\\s*\\{[^}]*text-wrap:\\s*pretty/is);\n  assert.doesNotMatch(css, /word-break:\\s*break-all/i, 'international article text must not be split arbitrarily inside words');\n\n  const articleDir = path.join(root, 'en', 'articles');\n  const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');\n  for (const file of files) {\n    const html = fs.readFileSync(path.join(articleDir, file), 'utf8');\n    for (const heading of html.matchAll(/<(h[1-3])\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi)) {\n      assert.doesNotMatch(heading[2], /<br\\b/i, 'en/' + file + ': headings must wrap responsively instead of using forced line breaks');\n    }\n  }\n});\n\n`;
replaceOnce(testPath, marker, testBlock + marker, 'international typography regression test');

console.log('Patched international article typography source and regression tests.');
