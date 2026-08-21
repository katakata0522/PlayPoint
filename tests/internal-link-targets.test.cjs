'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  isInternalHref,
  normalizeInternalAnchorTarget,
  normalizeInternalTargetsInHtml,
} = require('../scripts/internal-link-attribution.cjs');

const root = path.resolve(__dirname, '..');
const excludedDirectories = new Set(['.git', '.github', 'docs', 'node_modules', 'public-build', 'scripts', 'tests']);

function walkHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtmlFiles(absolute));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

test('internal URL detection separates PlayPoint navigation from external destinations', () => {
  for (const href of [
    '../attention.html',
    './blog/',
    '/status/gold/',
    '?category=ランク',
    '#faq',
    'https://playpoint-sim.com/articles/',
    'https://www.playpoint-sim.com/articles/',
  ]) {
    assert.equal(isInternalHref(href), true, `expected internal href: ${href}`);
  }

  for (const href of [
    'https://support.google.com/googleplay/',
    'https://katakatalab.com/',
    'https://example.com/',
    'mailto:hello@example.com',
    'tel:+810000000000',
  ]) {
    assert.equal(isInternalHref(href), false, `expected external href: ${href}`);
  }
});

test('internal blank targets become same-tab links without discarding unrelated rel tokens', () => {
  assert.equal(
    normalizeInternalAnchorTarget('<a href="../attention.html" target="_blank" rel="noopener noreferrer">'),
    '<a href="../attention.html">'
  );
  assert.equal(
    normalizeInternalAnchorTarget('<a target="_blank" rel="nofollow noopener sponsored noreferrer" href="/offers/">'),
    '<a rel="nofollow sponsored" href="/offers/">'
  );
  assert.equal(
    normalizeInternalAnchorTarget('<a href="https://playpoint-sim.com/blog/" target="_blank">'),
    '<a href="https://playpoint-sim.com/blog/">'
  );
});

test('external and runtime-external blank targets stay untouched', () => {
  const external = '<a href="https://support.google.com/googleplay/" target="_blank" rel="noopener noreferrer">';
  assert.equal(normalizeInternalAnchorTarget(external), external);

  const runtimeExternal = '<a id="register-google-cal-btn" class="calendar-btn google" href="#" target="_blank" rel="noopener noreferrer">';
  assert.equal(normalizeInternalAnchorTarget(runtimeExternal), runtimeExternal);

  const html = `<p>${external}Google Play Help</a></p>`;
  assert.equal(normalizeInternalTargetsInHtml(html), html);
});

test('committed public HTML contains no normal internal target=_blank links', () => {
  const offenders = [];
  for (const filePath of walkHtmlFiles(root)) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (normalizeInternalTargetsInHtml(html) !== html) {
      offenders.push(path.relative(root, filePath).replace(/\\/g, '/'));
    }
  }
  assert.deepEqual(offenders, [], `internal blank targets remain in: ${offenders.join(', ')}`);
});
