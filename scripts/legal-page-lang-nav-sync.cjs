'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { escapeHtml } = require('./site-shell.cjs');

const LEGAL_LANGUAGE_NAV_TARGETS = Object.freeze([
  'privacy.html',
  'terms.html'
]);

const LEGAL_LANGUAGE_NAV_LINKS = Object.freeze([
  Object.freeze({ href: './', label: '日本語' }),
  Object.freeze({ href: './en/', label: 'English' }),
  Object.freeze({ href: './ko/', label: '한국어' }),
  Object.freeze({ href: './tw/', label: '繁體中文' })
]);

const NAV_STYLE = 'text-align: right; margin-bottom: 15px; font-size: 0.9em; border-bottom: 1px solid #eee; padding-bottom: 8px;';
const LINK_STYLE = 'margin-left: 12px; color: #007bff; text-decoration: none;';

function renderLegalLanguageNav(indent = '') {
  const links = LEGAL_LANGUAGE_NAV_LINKS.map(link =>
    `${indent}  <a href="${escapeHtml(link.href)}" style="${LINK_STYLE}">${escapeHtml(link.label)}</a>`
  ).join('\n');

  return `${indent}<div class="lang-nav" style="${NAV_STYLE}">\n${links}\n${indent}</div>`;
}

function locateLegalLanguageNav(html, relativePath = 'HTML') {
  const matches = [...html.matchAll(/(^[ \t]*)<div class="lang-nav"\s+style="[^"]*">[\s\S]*?<\/div>/gm)];
  if (matches.length !== 1) {
    throw new Error(`${relativePath}: expected exactly one legal language nav, found ${matches.length}.`);
  }
  const match = matches[0];
  return {
    start: match.index,
    end: match.index + match[0].length,
    indent: match[1],
    html: match[0]
  };
}

function synchronizeLegalLanguageNav(html, relativePath) {
  const located = locateLegalLanguageNav(html, relativePath);
  const canonical = renderLegalLanguageNav(located.indent);
  if (located.html === canonical) {
    return { html, changed: false };
  }
  return {
    html: `${html.slice(0, located.start)}${canonical}${html.slice(located.end)}`,
    changed: true
  };
}

function syncLegalPageLanguageNavs(rootDir, { checkOnly = false } = {}) {
  const changedFiles = [];
  for (const relativePath of LEGAL_LANGUAGE_NAV_TARGETS) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${relativePath}: legal page target does not exist.`);
    }
    const source = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeLegalLanguageNav(source, relativePath);
    if (!result.changed) continue;
    changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  }
  return Object.freeze({
    checked: LEGAL_LANGUAGE_NAV_TARGETS.length,
    changed: changedFiles.length,
    changedFiles: Object.freeze(changedFiles)
  });
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const summary = syncLegalPageLanguageNavs(rootDir);
  console.log(`[site-shell] synchronized legal language navs: ${summary.changed}/${summary.checked} updated`);
}

module.exports = {
  LEGAL_LANGUAGE_NAV_LINKS,
  LEGAL_LANGUAGE_NAV_TARGETS,
  locateLegalLanguageNav,
  renderLegalLanguageNav,
  synchronizeLegalLanguageNav,
  syncLegalPageLanguageNavs
};
