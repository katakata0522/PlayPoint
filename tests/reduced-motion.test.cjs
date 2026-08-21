'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function collectCssFiles(directory, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(absolute, relative));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(relative.replace(/\\/g, '/'));
    }
  }
  return files;
}

test('custom CSS with keyframe animation respects reduced-motion preference', () => {
  const animatedCssFiles = collectCssFiles(root).filter(relativePath => /\banimation\s*:/.test(read(relativePath)));
  assert.ok(animatedCssFiles.length > 0, 'expected at least one animated CSS file');

  for (const relativePath of animatedCssFiles) {
    const css = read(relativePath);
    assert.match(
      css,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
      `${relativePath}: animated CSS must include reduced-motion handling`
    );
  }
});

test('calculator count-up skips requestAnimationFrame when reduced motion is requested', () => {
  const source = read('js/ui.js');
  assert.match(source, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(source, /if \(prefersReducedMotion \|\| duration <= 0\) \{/);
  assert.match(source, /obj\.textContent = end\.toLocaleString\(formatLang\);\s*return;/);
});
