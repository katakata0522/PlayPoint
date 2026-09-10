'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { inspectPage } = require('../scripts/seo-head-audit.cjs');

const URL = 'https://playpoint-sim.com/seo-audit-fixture.html';

function pageHtml({ title = 'Fixture', description = 'Fixture description', scriptClose = '</script>' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${URL}">
  <meta property="og:title" content="Fixture">
  <meta property="og:description" content="Fixture description">
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
  <meta property="og:url" content="${URL}">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}${scriptClose}
</head>
<body><h1>Fixture</h1></body>
</html>`;
}

test('Head監査はHTMLエンティティを一度だけデコードし二重アンエスケープしない', () => {
  const page = inspectPage(
    URL,
    'seo-audit-fixture.html',
    pageHtml({ title: 'Play &amp;quot;Points&amp;quot;', description: 'Fish &amp;lt; chips' })
  );

  assert.equal(page.title, 'Play &quot;Points&quot;');
  assert.equal(page.description, 'Fish &lt; chips');
});

test('JSON-LD抽出はscript終了タグの閉じ山括弧前の空白を許容する', () => {
  const page = inspectPage(URL, 'seo-audit-fixture.html', pageHtml({ scriptClose: '</script >' }));

  assert.deepEqual(page.schemaTypes, ['WebPage']);
  assert.equal(page.errors.some(issue => issue.code === 'jsonld-invalid'), false);
  assert.equal(page.warnings.some(issue => issue.code === 'jsonld-missing'), false);
});
