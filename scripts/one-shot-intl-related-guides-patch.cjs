'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.join(__dirname, 'intl-article-layout.cjs');
let source = fs.readFileSync(target, 'utf8');

function replaceExact(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: target text not found`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target text is not unique`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceExact(
  "const { LOCALES } = require('./intl-seo-content.cjs');",
  "const { LOCALES } = require('./intl-seo-content.cjs');\nconst { selectRelatedArticles } = require('./intl-related-guides.cjs');",
  'helper import'
);

replaceExact(
  'function renderSidebar(localeKey, newline) {',
  'function renderSidebar(localeKey, newline, relatedArticles = null) {',
  'renderSidebar signature'
);

replaceExact(
  "  const articles = Array.isArray(locale.articles) ? locale.articles.slice(0, 4) : [];",
  "  const articles = Array.isArray(relatedArticles)\n    ? relatedArticles\n    : (Array.isArray(locale.articles) ? locale.articles.slice(0, 4) : []);",
  'sidebar article source'
);

replaceExact(
  'function renderArticleLayout(localeKey, mainHtml, newline) {',
  'function renderArticleLayout(localeKey, mainHtml, newline, relatedArticles = null) {',
  'renderArticleLayout signature'
);

replaceExact(
  '    renderSidebar(localeKey, newline),',
  '    renderSidebar(localeKey, newline, relatedArticles),',
  'renderSidebar call'
);

replaceExact(
  'function synchronizeArticle(html, localeKey, relativePath) {',
  'function synchronizeArticle(html, localeKey, relativePath, relatedArticles = null) {',
  'synchronizeArticle signature'
);

replaceExact(
  '  const layout = renderArticleLayout(localeKey, mainHtml, newline);',
  '  const layout = renderArticleLayout(localeKey, mainHtml, newline, relatedArticles);',
  'renderArticleLayout call'
);

replaceExact(
  "    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');\n    for (const file of files) {\n      const absolutePath = path.join(articleDir, file);\n      const relativePath = path.posix.join(localeKey, 'articles', file);\n      const before = fs.readFileSync(absolutePath, 'utf8');\n      const after = synchronizeArticle(before, localeKey, relativePath);",
  "    const files = fs.readdirSync(articleDir)\n      .filter(file => file.endsWith('.html') && file !== 'index.html')\n      .sort();\n    const catalog = files.map(file => {\n      const absolutePath = path.join(articleDir, file);\n      const relativePath = path.posix.join(localeKey, 'articles', file);\n      const html = fs.readFileSync(absolutePath, 'utf8');\n      return {\n        path: relativePath,\n        href: '/' + relativePath,\n        label: extractArticleTitle(html, relativePath)\n      };\n    });\n    for (const file of files) {\n      const absolutePath = path.join(articleDir, file);\n      const relativePath = path.posix.join(localeKey, 'articles', file);\n      const before = fs.readFileSync(absolutePath, 'utf8');\n      const relatedArticles = selectRelatedArticles(catalog, relativePath, 4);\n      const after = synchronizeArticle(before, localeKey, relativePath, relatedArticles);",
  'article catalog loop'
);

fs.writeFileSync(target, source, 'utf8');
console.log('[one-shot-intl-related-guides-patch] patched scripts/intl-article-layout.cjs');
