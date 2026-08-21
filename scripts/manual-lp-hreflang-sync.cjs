'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const MANUAL_LP_SLUGS = Object.freeze([
  'status/silver',
  'status/gold',
  'status/platinum',
  'status/diamond',
  'campaign/2x',
  'campaign/3x',
  'campaign/wait'
]);

const HREFLANG_ORDER = Object.freeze(['ja', 'en', 'ko', 'zh-TW', 'x-default']);
const ALTERNATE_LINK_PATTERN = /\n?\s*<link\s+rel=["']alternate["']\s+hreflang=["'](?:ja|en|ko|zh-TW|x-default)["']\s+href=["'][^"']+["']\s*\/?>/gi;

function pageUrl(locale, slug) {
  if (locale === 'ja') return `${SITE_ORIGIN}/${slug}/`;
  const directory = locale === 'zh-TW' ? 'tw' : locale;
  return `${SITE_ORIGIN}/${directory}/${slug}/`;
}

function expectedAlternates(slug) {
  return [
    ['ja', pageUrl('ja', slug)],
    ['en', pageUrl('en', slug)],
    ['ko', pageUrl('ko', slug)],
    ['zh-TW', pageUrl('zh-TW', slug)],
    ['x-default', pageUrl('en', slug)]
  ];
}

function renderAlternateLinks(slug, indent = '    ') {
  return expectedAlternates(slug)
    .map(([hreflang, href]) => `${indent}<link rel="alternate" hreflang="${hreflang}" href="${href}">`)
    .join('\n');
}

function extractAlternateLinks(html) {
  return [...String(html).matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => [match[1], match[2]]);
}

function synchronizeManualLpHreflang(html, slug) {
  const source = String(html);
  const canonicalMatch = source.match(/(^[ \t]*)<link\s+rel=["']canonical["']\s+href=["'][^"']+["'][^>]*>/im);
  if (!canonicalMatch) throw new Error(`Canonical link is missing for ${slug}`);

  const expected = expectedAlternates(slug);
  const current = extractAlternateLinks(source).filter(([hreflang]) => HREFLANG_ORDER.includes(hreflang));
  const alreadySynchronized = current.length === expected.length
    && current.every((entry, index) => entry[0] === expected[index][0] && entry[1] === expected[index][1]);
  if (alreadySynchronized) return { html: source, changed: false };

  const withoutManagedAlternates = source.replace(ALTERNATE_LINK_PATTERN, '');
  const canonicalAfterCleanup = withoutManagedAlternates.match(/(^[ \t]*)<link\s+rel=["']canonical["']\s+href=["'][^"']+["'][^>]*>/im);
  if (!canonicalAfterCleanup) throw new Error(`Canonical link disappeared while synchronizing ${slug}`);

  const indent = canonicalAfterCleanup[1] || '    ';
  const replacement = `${canonicalAfterCleanup[0]}\n${renderAlternateLinks(slug, indent)}`;
  const updated = withoutManagedAlternates.replace(canonicalAfterCleanup[0], replacement);
  return { html: updated, changed: updated !== source };
}

function syncManualLpHreflangFiles(rootDir, { checkOnly = false } = {}) {
  const summary = { scanned: 0, changed: 0, changedFiles: [] };

  for (const slug of MANUAL_LP_SLUGS) {
    const relativePath = `${slug}/index.html`;
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`Manual LP is missing: ${relativePath}`);

    summary.scanned += 1;
    const original = fs.readFileSync(absolutePath, 'utf8');
    const result = synchronizeManualLpHreflang(original, slug);
    if (!result.changed) continue;

    summary.changed += 1;
    summary.changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, result.html, 'utf8');
  }

  return summary;
}

function main() {
  const rootArg = process.argv.find(argument => argument.startsWith('--root='));
  const rootDir = rootArg ? path.resolve(rootArg.slice('--root='.length)) : path.resolve(__dirname, '..');
  const checkOnly = process.argv.includes('--check');
  const summary = syncManualLpHreflangFiles(rootDir, { checkOnly });

  console.log(`手動LP hreflang同期: ${summary.scanned}件確認、${summary.changed}件更新対象`);
  if (checkOnly && summary.changed > 0) {
    summary.changedFiles.forEach(file => console.error(`hreflang同期が必要です: ${file}`));
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  HREFLANG_ORDER,
  MANUAL_LP_SLUGS,
  expectedAlternates,
  extractAlternateLinks,
  synchronizeManualLpHreflang,
  syncManualLpHreflangFiles
};
