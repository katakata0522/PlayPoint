'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const stylesheet = '<link rel="stylesheet" href="/site-shell-vnext.css?v=20260915a">';
const targets = Object.freeze([
  'author/katakata.html',
  'privacy.html',
  'terms.html',
  'sitemap.html',
  'info.html',
  'blog/index.html'
]);

for (const relativePath of targets) {
  const fullPath = path.join(root, relativePath);
  const before = fs.readFileSync(fullPath, 'utf8');
  const occurrences = before.split(stylesheet).length - 1;
  if (occurrences > 1) {
    throw new Error(`${relativePath}: Site Shell vNext stylesheet is duplicated (${occurrences})`);
  }
  if (occurrences === 1) {
    console.log(`[site-shell-vnext] already linked: ${relativePath}`);
    continue;
  }
  const closingHeadCount = (before.match(/<\/head>/gi) || []).length;
  if (closingHeadCount !== 1) {
    throw new Error(`${relativePath}: expected exactly one </head>, got ${closingHeadCount}`);
  }
  const after = before.replace(/<\/head>/i, `  ${stylesheet}\n</head>`);
  fs.writeFileSync(fullPath, after, 'utf8');
  console.log(`[site-shell-vnext] linked: ${relativePath}`);
}
