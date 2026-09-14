'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Public root files are intentionally explicit. Adding a new root-level artifact
// must be classified before it can enter the production deployment tree.
const PUBLIC_ROOT_FILES = new Set([
  '.htaccess',
  'about-playpoints.html',
  'ads.txt',
  'atom.xml',
  'attention.html',
  'changelog.html',
  'embed.html',
  'favicon.svg',
  'feed.xml',
  'icon-192.png',
  'icon-512.png',
  'index.html',
  'info.html',
  'manifest.json',
  'ogp.png',
  'ogp.svg',
  'points-cost.css',
  'privacy.html',
  'pwa-launch.html',
  'region-selector.css',
  'robots.txt',
  'sitemap-intl-content-expansion.xml',
  'sitemap-intl-coupon-credit.xml',
  'sitemap-intl-game-guides.xml',
  'sitemap-intl-guides.xml',
  'sitemap-intl-maintenance-calculators.xml',
  'sitemap-intl-platinum-diamond.xml',
  'sitemap-intl-rank-maintenance.xml',
  'sitemap-intl-use-eligibility.xml',
  'sitemap.html',
  'sitemap.xml',
  'style.css',
  'sw.js',
  'terms.html',
  'visitor-thanks.css',
]);

// These directories are production namespaces: everything tracked beneath them
// is public website content. Operational/build material must never live here.
const PUBLIC_TOP_LEVEL_DIRECTORIES = new Set([
  'amount',
  'articles',
  'author',
  'blog',
  'campaign',
  'compare',
  'embed',
  'en',
  'games',
  'hk',
  'images',
  'in',
  'js',
  'ko',
  'latest',
  'maintenance',
  'points-cost',
  'status',
  'tw',
]);

const KNOWN_NON_PUBLIC_ROOT_ENTRIES = new Set([
  '.git',
  '.github',
  '.gitattributes',
  '.gitignore',
  'AGENTS.md',
  'CNAME',
  'README.md',
  'browser-smoke-artifacts',
  'coverage',
  'docs',
  'node_modules',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'scripts',
  'test-results',
  'tests',
  'toc_scan_report.txt',
  'tools',
  'yarn.lock',
  'みんな用URL.txt',
]);

function normalizeRepositoryPath(value) {
  if (typeof value !== 'string') throw new TypeError('repository path must be a string');
  return value
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '');
}

function isSensitiveRootName(name) {
  return name === '.env'
    || name.startsWith('.env.')
    || /\.(?:pem|key|log|sql|bak)$/i.test(name);
}

function classifyRootEntry(name) {
  const normalized = normalizeRepositoryPath(name);
  if (!normalized || normalized.includes('/')) return 'unknown';
  if (PUBLIC_ROOT_FILES.has(normalized)) return 'public-file';
  if (PUBLIC_TOP_LEVEL_DIRECTORIES.has(normalized)) return 'public-directory';
  if (KNOWN_NON_PUBLIC_ROOT_ENTRIES.has(normalized) || isSensitiveRootName(normalized)) return 'non-public';
  return 'unknown';
}

function isPublicRepositoryPath(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized) return false;
  const [topLevel, ...rest] = normalized.split('/');
  if (rest.length === 0) return PUBLIC_ROOT_FILES.has(topLevel) || PUBLIC_TOP_LEVEL_DIRECTORIES.has(topLevel);
  return PUBLIC_TOP_LEVEL_DIRECTORIES.has(topLevel);
}

function auditRootEntries(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const unknown = [];
  const publicEntries = [];
  const nonPublicEntries = [];

  for (const entry of entries) {
    const classification = classifyRootEntry(entry.name);
    if (classification === 'unknown') unknown.push(entry.name);
    else if (classification.startsWith('public-')) publicEntries.push(entry.name);
    else nonPublicEntries.push(entry.name);
  }

  return {
    unknown: unknown.sort(),
    publicEntries: publicEntries.sort(),
    nonPublicEntries: nonPublicEntries.sort(),
  };
}

function assertPublicRootContract(rootDir) {
  const audit = auditRootEntries(rootDir);
  if (audit.unknown.length > 0) {
    throw new Error(`Unclassified repository root entries must be explicitly reviewed before deploy: ${audit.unknown.join(', ')}`);
  }

  for (const name of [...PUBLIC_ROOT_FILES, ...PUBLIC_TOP_LEVEL_DIRECTORIES]) {
    const absolute = path.join(rootDir, name);
    if (!fs.existsSync(absolute)) throw new Error(`Allowlisted public entry is missing: ${name}`);
  }

  return audit;
}

module.exports = {
  KNOWN_NON_PUBLIC_ROOT_ENTRIES,
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES,
  assertPublicRootContract,
  auditRootEntries,
  classifyRootEntry,
  isPublicRepositoryPath,
  isSensitiveRootName,
  normalizeRepositoryPath,
};
