'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ARTICLE_TABLE_OVERFLOW_PATHS = Object.freeze([
  'articles/2026-06-20-discount-gift-cards.html',
  'en/articles/google-play-points-join-eligibility.html',
  'ko/articles/google-play-points-join-eligibility.html',
  'tw/articles/google-play-points-join-eligibility.html'
]);
const WRAPPED_TABLE_PREFIX = /<(?:div|figure)\b[^>]*class=["'][^"']*(?:table-wrap|table-card|pack-table-wrap|lp-table-wrap|comparison-reference-table-wrap)[^"']*["'][^>]*>\s*$/i;

function wrapUnwrappedTables(html) {
  return String(html).replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 320), offset);
    if (WRAPPED_TABLE_PREFIX.test(prefix)) return table;
    return '<div class="table-wrap">' + table + '</div>';
  });
}

function syncArticleTableOverflow(rootDir, { checkOnly = false } = {}) {
  const summary = { checked: 0, changed: 0, changedFiles: [] };
  for (const relativePath of ARTICLE_TABLE_OVERFLOW_PATHS) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error('Table overflow target missing: ' + relativePath);
    summary.checked += 1;
    const current = fs.readFileSync(absolutePath, 'utf8');
    const next = wrapUnwrappedTables(current);
    if (next === current) continue;
    summary.changed += 1;
    summary.changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');
  }
  return summary;
}

module.exports = { ARTICLE_TABLE_OVERFLOW_PATHS, WRAPPED_TABLE_PREFIX, wrapUnwrappedTables, syncArticleTableOverflow };
