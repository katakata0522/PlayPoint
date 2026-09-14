'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  FIXED_PAGE_HEADER_PROFILES,
  getFixedPageHeaderProfile,
  renderFixedPageHeader
} = require('./site-shell.cjs');

function locateTopBar(html, relativePath = 'HTML') {
  const startMatch = /(^[ \t]*)<div class="top-bar"(?:\s+style="[^"]*")?>/m.exec(html);
  if (!startMatch) {
    throw new Error(`${relativePath}: top-bar header was not found.`);
  }

  const occurrences = html.match(/<div class="top-bar"/g) || [];
  if (occurrences.length !== 1) {
    throw new Error(`${relativePath}: expected exactly one top-bar header, found ${occurrences.length}.`);
  }

  const indent = startMatch[1];
  const start = startMatch.index;
  const tagPattern = /<div\b[^>]*>|<\/div>/g;
  tagPattern.lastIndex = start + indent.length;
  let depth = 0;
  let tagMatch;

  while ((tagMatch = tagPattern.exec(html)) !== null) {
    if (tagMatch[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) {
        return {
          start,
          end: tagPattern.lastIndex,
          indent,
          html: html.slice(start, tagPattern.lastIndex)
        };
      }
    } else {
      depth += 1;
    }
  }

  throw new Error(`${relativePath}: top-bar header is not balanced.`);
}

function synchronizeFixedPageHeader(html, relativePath) {
  const located = locateTopBar(html, relativePath);
  const profile = getFixedPageHeaderProfile(relativePath);
  const canonical = renderFixedPageHeader(profile, located.indent);
  if (located.html === canonical) {
    return { html, changed: false };
  }
  return {
    html: `${html.slice(0, located.start)}${canonical}${html.slice(located.end)}`,
    changed: true
  };
}

function syncFixedPageHeaders(rootDir, { checkOnly = false } = {}) {
  const changedFiles = [];
  const relativePaths = Object.keys(FIXED_PAGE_HEADER_PROFILES);

  for (const relativePath of relativePaths) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${relativePath}: fixed-page header target does not exist.`);
    }

    const source = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeFixedPageHeader(source, relativePath);
    if (!result.changed) continue;

    changedFiles.push(relativePath);
    if (!checkOnly) {
      fs.writeFileSync(absolutePath, result.html, 'utf8');
    }
  }

  return Object.freeze({
    checked: relativePaths.length,
    changed: changedFiles.length,
    changedFiles: Object.freeze(changedFiles)
  });
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const summary = syncFixedPageHeaders(rootDir);
  console.log(`[site-shell] synchronized fixed-page headers: ${summary.changed}/${summary.checked} updated`);
}

module.exports = {
  locateTopBar,
  synchronizeFixedPageHeader,
  syncFixedPageHeaders
};
