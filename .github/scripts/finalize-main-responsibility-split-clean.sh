#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_BASE_SHA:?EXPECTED_BASE_SHA is required}"
: "${TARGET_BRANCH:?TARGET_BRANCH is required}"

cp .github/scripts/apply-main-responsibility-split.cjs /tmp/apply-main-responsibility-split.cjs
cp .github/scripts/apply-main-split-build-compat.cjs /tmp/apply-main-split-build-compat.cjs
cp .github/scripts/apply-main-split-test-compat.cjs /tmp/apply-main-split-test-compat.cjs

git fetch origin refactor/internal-runtime-cleanup-20260806
resolved_base="$(git rev-parse origin/refactor/internal-runtime-cleanup-20260806)"
if [[ "$resolved_base" != "$EXPECTED_BASE_SHA" ]]; then
  echo "PR #67 head moved: expected=$EXPECTED_BASE_SHA actual=$resolved_base" >&2
  exit 1
fi

git checkout -B "$TARGET_BRANCH" origin/refactor/internal-runtime-cleanup-20260806
git clean -fdx

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const excluded = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excluded.has(entry.name)) return [];
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}
const normalize = content => content
  .replace(/\?v=[a-zA-Z0-9_-]+/g, '?v=ASSET_VERSION')
  .replace(/\r\n/g, '\n');
const snapshot = Object.fromEntries(walk(root).map((file) => [
  path.relative(root, file).replaceAll('\\', '/'),
  normalize(fs.readFileSync(file, 'utf8'))
]));
fs.writeFileSync('/tmp/playpoint-public-html-before.json', JSON.stringify(snapshot));
console.log(`Snapshotted ${Object.keys(snapshot).length} public HTML files.`);
NODE

node /tmp/apply-main-responsibility-split.cjs
node /tmp/apply-main-split-build-compat.cjs
node /tmp/apply-main-split-test-compat.cjs

modified_date="$(node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const value=html.match(/<meta name=\"last-modified\" content=\"(\\d{4}-\\d{2}-\\d{2})\">/)?.[1]; if(!value) process.exit(1); process.stdout.write(value);")"
asset_version="$(node -e "const fs=require('fs'); const sw=fs.readFileSync('sw.js','utf8'); const value=sw.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1]; if(!value) process.exit(1); process.stdout.write(value);")"
PLAYPOINT_MODIFIED_DATE="$modified_date" PLAYPOINT_ASSET_VERSION="$asset_version" node scripts/build-html.js
PLAYPOINT_MODIFIED_DATE="$modified_date" PLAYPOINT_ASSET_VERSION="$asset_version" node scripts/build-html.js

node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const excluded = new Set(['.git', '.github', 'docs', 'node_modules', 'scripts', 'tests']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excluded.has(entry.name)) return [];
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && entry.name.endsWith('.html') ? [absolute] : [];
  });
}
const before = JSON.parse(fs.readFileSync('/tmp/playpoint-public-html-before.json', 'utf8'));
const normalize = content => content
  .replace(/\?v=[a-zA-Z0-9_-]+/g, '?v=ASSET_VERSION')
  .replace(/\r\n/g, '\n');
const after = Object.fromEntries(walk(root).map((file) => [
  path.relative(root, file).replaceAll('\\', '/'),
  normalize(fs.readFileSync(file, 'utf8'))
]));
const beforeNames = Object.keys(before).sort();
const afterNames = Object.keys(after).sort();
const failures = [];
if (JSON.stringify(beforeNames) !== JSON.stringify(afterNames)) failures.push('public HTML file set changed');
for (const [relative, expected] of Object.entries(before)) {
  if (after[relative] !== expected) failures.push(`${relative}: visible/structural content changed`);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Verified ${beforeNames.length} public HTML files are unchanged.`);
NODE

node <<'NODE'
const { execFileSync } = require('node:child_process');
const { generatedFiles } = require('./scripts/build-targets.cjs');
const implementation = [
  '.github/scripts/minify.cjs',
  'scripts/asset-sync.cjs',
  'tests/growth-migration.test.cjs',
  'tests/main-responsibility-split.test.cjs',
  'tests/playpoint-regression.test.cjs',
  'tests/static-calculator-delivery.test.cjs',
  'js/main.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js'
];
const required = [
  'js/main.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js',
  'tests/main-responsibility-split.test.cjs'
];
const allowed = new Set([...generatedFiles, ...implementation]);
const tracked = execFileSync('git', ['diff', '--name-only', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const changed = [...new Set([...tracked, ...untracked])];
const unexpected = changed.filter(file => !allowed.has(file));
if (unexpected.length) throw new Error(`Unexpected changed paths: ${unexpected.join(', ')}`);
for (const file of required) {
  if (!changed.includes(file)) throw new Error(`Required implementation path is missing: ${file}`);
}
for (const file of changed) execFileSync('git', ['add', '--', file], { stdio: 'inherit' });
console.log(`Staged ${changed.length} validated paths.`);
NODE

node .github/scripts/preflight.cjs

node <<'NODE'
const { execFileSync } = require('node:child_process');
const { generatedFiles } = require('./scripts/build-targets.cjs');
const implementation = [
  '.github/scripts/minify.cjs',
  'scripts/asset-sync.cjs',
  'tests/growth-migration.test.cjs',
  'tests/main-responsibility-split.test.cjs',
  'tests/playpoint-regression.test.cjs',
  'tests/static-calculator-delivery.test.cjs',
  'js/main.js',
  'js/region-navigation.js',
  'js/language-suggestion.js',
  'js/calendar-reminder.js',
  'js/pwa-install.js',
  'js/widget-referral.js',
  'js/service-worker-registration.js'
];
const allowed = new Set([...generatedFiles, ...implementation]);
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const unexpected = staged.filter(file => !allowed.has(file));
if (unexpected.length) throw new Error(`Unexpected staged paths: ${unexpected.join(', ')}`);
const unstaged = execFileSync('git', ['diff', '--name-only', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (unstaged.length || untracked.length) throw new Error(`Worktree is not clean: ${[...unstaged, ...untracked].join(', ')}`);
console.log(`Final staged scope contains ${staged.length} paths with a clean worktree.`);
NODE

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "main.jsの責務を専用モジュールへ分離"
git push --force-with-lease origin "HEAD:refs/heads/${TARGET_BRANCH}"
