'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const registry = JSON.parse(read('blog/articles.json'));
const japanese = registry.map(article => article.file.replace(/^\.\.\//, ''));
const international = ['en', 'ko', 'tw'].flatMap(locale =>
  fs.readdirSync(path.join(root, locale, 'articles'))
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .map(file => `${locale}/articles/${file}`)
);
const articles = [...new Set([...japanese, ...international])].sort();
const officialSourcePattern = /support\.google\.com\/googleplay|play\.google\.com\/store\/apps\/editorial/;

test('all published articles expose a static Google official source link', () => {
  const missing = articles.filter(file => !officialSourcePattern.test(read(file)));

  for (const file of missing) {
    console.log(`::error file=${file},title=Google official source missing::Add a visible Google official source link to ${file}`);
  }

  assert.deepEqual(missing, [], `Missing Google official source links:\n${missing.join('\n')}`);
});
