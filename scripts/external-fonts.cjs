'use strict';

const fs = require('fs');
const path = require('path');

function getHtmlFiles(rootDir) {
  const files = [];
  const visit = currentDir => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolutePath);
    }
  };
  visit(rootDir);
  return files;
}

function removeExternalGoogleFonts(html) {
  return html
    .replace(/<link\b[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/gi, '')
    .replace(/<!--[^>]*Google Fonts[^>]*-->\s*/gi, '');
}

function stripExternalGoogleFonts(rootDir) {
  let changedFiles = 0;
  for (const file of getHtmlFiles(rootDir)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = removeExternalGoogleFonts(before);
    if (after === before) continue;
    fs.writeFileSync(file, after, 'utf8');
    changedFiles++;
  }
  return changedFiles;
}

module.exports = {
  removeExternalGoogleFonts,
  stripExternalGoogleFonts
};
