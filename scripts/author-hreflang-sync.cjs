'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const AUTHOR_FILE = 'author/katakata.html';
const HREFLANG_ORDER = Object.freeze(['ja', 'en', 'ko', 'zh-TW', 'x-default']);
const AUTHOR_ALTERNATES = Object.freeze([
  ['ja', `${SITE_ORIGIN}/author/katakata.html`],
  ['en', `${SITE_ORIGIN}/en/author/katakata.html`],
  ['ko', `${SITE_ORIGIN}/ko/author/katakata.html`],
  ['zh-TW', `${SITE_ORIGIN}/tw/author/katakata.html`],
  ['x-default', `${SITE_ORIGIN}/en/author/katakata.html`]
]);
const MANAGED_ALTERNATE_PATTERN = /\n?\s*<link\s+rel=["']alternate["']\s+hreflang=["'](?:ja|en|ko|zh-TW|x-default)["']\s+href=["'][^"']+["']\s*\/?>/gi;

function extractAuthorAlternates(html) {
  return [...String(html).matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => [match[1], match[2]])
    .filter(([hreflang]) => HREFLANG_ORDER.includes(hreflang));
}

function renderAuthorAlternates(indent = '  ') {
  return AUTHOR_ALTERNATES
    .map(([hreflang, href]) => `${indent}<link rel="alternate" hreflang="${hreflang}" href="${href}">`)
    .join('\n');
}

function synchronizeJapaneseAuthorHreflang(html) {
  const source = String(html);
  const canonicalMatch = source.match(/(^[ \t]*)<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/im);
  if (!canonicalMatch) throw new Error(`${AUTHOR_FILE}: canonical link is missing`);
  if (canonicalMatch[2] !== AUTHOR_ALTERNATES[0][1]) {
    throw new Error(`${AUTHOR_FILE}: unexpected canonical ${canonicalMatch[2]}`);
  }

  const current = extractAuthorAlternates(source);
  const stable = current.length === AUTHOR_ALTERNATES.length
    && current.every((entry, index) => entry[0] === AUTHOR_ALTERNATES[index][0] && entry[1] === AUTHOR_ALTERNATES[index][1]);
  if (stable) return { html: source, changed: false };

  const withoutManagedAlternates = source.replace(MANAGED_ALTERNATE_PATTERN, '');
  const canonicalAfterCleanup = withoutManagedAlternates.match(/(^[ \t]*)<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/im);
  if (!canonicalAfterCleanup) throw new Error(`${AUTHOR_FILE}: canonical disappeared during hreflang synchronization`);

  const indent = canonicalAfterCleanup[1] || '  ';
  const replacement = `${canonicalAfterCleanup[0]}\n${renderAuthorAlternates(indent)}`;
  const updated = withoutManagedAlternates.replace(canonicalAfterCleanup[0], replacement);
  return { html: updated, changed: updated !== source };
}

function syncJapaneseAuthorHreflang(rootDir, { checkOnly = false } = {}) {
  const absolutePath = path.join(rootDir, AUTHOR_FILE);
  if (!fs.existsSync(absolutePath)) throw new Error(`${AUTHOR_FILE}: file is missing`);

  const original = fs.readFileSync(absolutePath, 'utf8');
  const result = synchronizeJapaneseAuthorHreflang(original);
  if (result.changed && !checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  return { checked: 1, changed: result.changed ? 1 : 0, changedFiles: result.changed ? [AUTHOR_FILE] : [] };
}

function main() {
  const rootArg = process.argv.find(argument => argument.startsWith('--root='));
  const rootDir = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
  const checkOnly = process.argv.includes('--check');
  const summary = syncJapaneseAuthorHreflang(rootDir, { checkOnly });
  console.log(`日本語運営者 hreflang同期: ${summary.checked}件確認、${summary.changed}件更新対象`);
  if (checkOnly && summary.changed > 0) {
    summary.changedFiles.forEach(file => console.error(`hreflang同期が必要です: ${file}`));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  AUTHOR_ALTERNATES,
  AUTHOR_FILE,
  HREFLANG_ORDER,
  extractAuthorAlternates,
  synchronizeJapaneseAuthorHreflang,
  syncJapaneseAuthorHreflang
};
