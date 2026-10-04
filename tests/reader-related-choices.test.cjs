'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { RELATED_CHOICES, GUIDE_RETURNS, improveReaderLinks } = require('../scripts/reader-related-choices.cjs');
const articles = require('../blog/articles.json');
const byId = new Map(articles.map(article => [article.id, article]));
test('次の疑問に選んだ3記事が公開先へつながり、再生成しても増殖しない', () => {
  for (const [id, targets] of Object.entries(RELATED_CHOICES)) {
    assert.equal(new Set(targets).size, 3, id);
    const article = byId.get(id);
    const html = fs.readFileSync(path.join(__dirname, '..', article.file.slice(3)), 'utf8');
    const once = improveReaderLinks(html, article, byId);
    assert.equal(improveReaderLinks(once, article, byId), once, id);
    for (const target of targets) assert.ok(byId.get(target)?.listed !== false, target);
  }
});
test('言語切替を残し、aside形式にも対応する', () => {
  const article = byId.get('best-use');
  for (const tag of ['section', 'aside']) {
    const html = '<article><' + tag + ' class="related-links-section"><h2>他の言語で読む</h2><a href="/en/">English</a></' + tag + '></article>';
    const next = improveReaderLinks(html, article, byId);
    assert.match(next, /href="\/en\/"/);
    assert.equal((next.match(/あわせて読みたい/g) || []).length, 1);
    assert.equal(improveReaderLinks(next, article, byId), next);
  }
  assert.equal(Object.values(GUIDE_RETURNS).flat().length, 24);
});
