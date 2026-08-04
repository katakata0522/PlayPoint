'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
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
const missing = articles.filter(file => !officialSourcePattern.test(read(file)));

if (missing.length === 0) {
  console.log('All published articles include a static Google official source link.');
} else {
  for (const file of missing) {
    console.log(`::error file=${file},title=Google official source missing::Add a visible Google official source link to ${file}`);
  }
  console.log(`Missing official sources: ${missing.length}`);
}
