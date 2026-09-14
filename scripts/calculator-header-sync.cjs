'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CALCULATOR_HEADER_PROFILES,
  getCalculatorHeaderProfile,
  renderCalculatorHeader
} = require('./site-shell.cjs');
const { locateTopBar } = require('./fixed-page-header-sync.cjs');

function synchronizeCalculatorHeader(html, relativePath) {
  const located = locateTopBar(html, relativePath);
  const profile = getCalculatorHeaderProfile(relativePath);
  const canonical = renderCalculatorHeader(profile, located.indent);
  if (located.html === canonical) {
    return { html, changed: false };
  }
  return {
    html: `${html.slice(0, located.start)}${canonical}${html.slice(located.end)}`,
    changed: true
  };
}

function syncCalculatorHeaders(rootDir, { checkOnly = false } = {}) {
  const changedFiles = [];
  const relativePaths = Object.keys(CALCULATOR_HEADER_PROFILES);

  for (const relativePath of relativePaths) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${relativePath}: calculator header target does not exist.`);
    }

    const source = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeCalculatorHeader(source, relativePath);
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
  const summary = syncCalculatorHeaders(rootDir);
  console.log(`[site-shell] synchronized calculator headers: ${summary.changed}/${summary.checked} updated`);
}

module.exports = {
  syncCalculatorHeaders,
  synchronizeCalculatorHeader
};
