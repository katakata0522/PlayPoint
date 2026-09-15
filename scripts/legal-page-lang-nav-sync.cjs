'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { escapeHtml } = require('./site-shell.cjs');

const LEGAL_NAV_TARGETS = Object.freeze([
  'privacy.html',
  'terms.html'
]);

const LEGAL_NAV_LINKS = Object.freeze([
  Object.freeze({ href: './', label: '← Playポイント計算機' }),
  Object.freeze({ href: 'attention.html', label: '国・地域ガイド' })
]);

const NAV_STYLE = 'display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px;font-size:0.9em;border-bottom:1px solid #eee;padding-bottom:8px;';
const LINK_STYLE = 'color:#005fcc;text-decoration:none;font-weight:700;';

function renderLegalPageNav(indent = '') {
  const links = LEGAL_NAV_LINKS.map(link =>
    `${indent}  <a href="${escapeHtml(link.href)}" style="${LINK_STYLE}">${escapeHtml(link.label)}</a>`
  ).join('\n');

  return `${indent}<nav class="legal-page-nav" aria-label="PlayPoint内ナビゲーション" style="${NAV_STYLE}">\n${links}\n${indent}</nav>`;
}

function locateLegalPageNav(html, relativePath = 'HTML') {
  const canonicalMatches = [...html.matchAll(/(^[ \t]*)<nav class="legal-page-nav"[^>]*>[\s\S]*?<\/nav>/gm)];
  const legacyMatches = [...html.matchAll(/(^[ \t]*)<div class="lang-nav"\s+style="[^"]*">[\s\S]*?<\/div>/gm)];
  const matches = [...canonicalMatches, ...legacyMatches].sort((a, b) => a.index - b.index);
  if (matches.length !== 1) {
    throw new Error(`${relativePath}: expected exactly one legal page navigation, found ${matches.length}.`);
  }
  const match = matches[0];
  return {
    start: match.index,
    end: match.index + match[0].length,
    indent: match[1],
    html: match[0]
  };
}

function synchronizeLegalPageNav(html, relativePath) {
  const located = locateLegalPageNav(html, relativePath);
  const canonical = renderLegalPageNav(located.indent);
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
  for (const relativePath of LEGAL_NAV_TARGETS) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${relativePath}: legal page target does not exist.`);
    }
    const source = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeLegalPageNav(source, relativePath);
    if (!result.changed) continue;
    changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  }
  return Object.freeze({
    checked: LEGAL_NAV_TARGETS.length,
    changed: changedFiles.length,
    changedFiles: Object.freeze(changedFiles)
  });
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const summary = syncLegalPageLanguageNavs(rootDir);
  console.log(`[site-shell] synchronized legal page navigation: ${summary.changed}/${summary.checked} updated`);
}

module.exports = {
  LEGAL_LANGUAGE_NAV_LINKS: LEGAL_NAV_LINKS,
  LEGAL_LANGUAGE_NAV_TARGETS: LEGAL_NAV_TARGETS,
  LEGAL_NAV_LINKS,
  LEGAL_NAV_TARGETS,
  locateLegalLanguageNav: locateLegalPageNav,
  locateLegalPageNav,
  renderLegalLanguageNav: renderLegalPageNav,
  renderLegalPageNav,
  synchronizeLegalLanguageNav: synchronizeLegalPageNav,
  synchronizeLegalPageNav,
  syncLegalPageLanguageNavs
};
