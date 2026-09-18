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

function splitReducedMotionBlocks(css) {
  const marker = /@media\s*\(prefers-reduced-motion:\s*reduce\)/g;
  const blocks = [];
  let remaining = '';
  let cursor = 0;
  let match;

  while ((match = marker.exec(css))) {
    const open = css.indexOf('{', match.index);
    assert.ok(open >= 0, 'reduced-motion media query is missing its block');
    let depth = 0;
    let close = -1;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          close = index;
          break;
        }
      }
    }
    assert.ok(close > open, 'reduced-motion media query has an unclosed block');
    remaining += css.slice(cursor, match.index);
    blocks.push(css.slice(open + 1, close));
    cursor = close + 1;
    marker.lastIndex = cursor;
  }

  remaining += css.slice(cursor);
  return { blocks, remaining };
}

function hasImportantDurationAtMost(block, property, maxMs) {
  const pattern = new RegExp(property + '\\s*:\\s*([0-9.]+)ms\\s*!important', 'gi');
  return [...block.matchAll(pattern)].some(match => Number(match[1]) <= maxMs);
}

test('custom CSS with keyframe animation respects reduced-motion preference', () => {
  const animatedCssFiles = collectCssFiles(root).filter(relativePath => {
    const css = read(relativePath);
    const { remaining } = splitReducedMotionBlocks(css);
    return /\banimation(?:-[a-z-]+)?\s*:/.test(remaining);
  });
  assert.ok(animatedCssFiles.length > 0, 'expected at least one animated CSS file');

  for (const relativePath of animatedCssFiles) {
    const css = read(relativePath);
    const { blocks } = splitReducedMotionBlocks(css);
    assert.ok(blocks.length > 0, `${relativePath}: animated CSS must include reduced-motion handling`);
    const reducedBlock = blocks.join('\n');

    const animationSuppressed =
      /animation\s*:\s*none\s*!important/i.test(reducedBlock)
      || (
        hasImportantDurationAtMost(reducedBlock, 'animation-duration', 0.01)
        && /animation-iteration-count\s*:\s*1\s*!important/i.test(reducedBlock)
      );
    const transitionSuppressed =
      /transition\s*:\s*none\s*!important/i.test(reducedBlock)
      || hasImportantDurationAtMost(reducedBlock, 'transition-duration', 0.01);

    assert.ok(animationSuppressed, `${relativePath}: reduced-motion must actually suppress animation duration/iterations`);
    assert.ok(transitionSuppressed, `${relativePath}: reduced-motion must actually suppress transitions`);
  }
});
