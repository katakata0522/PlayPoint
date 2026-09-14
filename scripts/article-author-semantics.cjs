'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getJapaneseArticleRepoPaths } = require('./game-guide-article-catalog.cjs');

const AUTHOR_HEADING_PATTERN = /<h4(?:\s[^>]*)?>\s*(この記事の著者：[\s\S]*?)<\/h4>/gi;

function normalizeAuthorSemantics(html) {
  return String(html).replace(AUTHOR_HEADING_PATTERN, '<p class="author-profile-title">$1</p>');
}

function syncArticleAuthorSemantics(rootDir, { checkOnly = false } = {}) {
  const files = getJapaneseArticleRepoPaths(rootDir);
  const summary = { checked: files.length, changed: 0, changedFiles: [] };
  for (const relativePath of files) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const current = fs.readFileSync(absolutePath, 'utf8');
    const next = normalizeAuthorSemantics(current);
    if (next === current) continue;
    summary.changed += 1;
    summary.changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');
  }
  return summary;
}

module.exports = { AUTHOR_HEADING_PATTERN, normalizeAuthorSemantics, syncArticleAuthorSemantics };
