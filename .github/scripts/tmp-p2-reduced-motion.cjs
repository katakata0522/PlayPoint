'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.status !== 0) process.exit(result.status || 1);
}

function appendReducedMotion(path) {
  let source = fs.readFileSync(path, 'utf8');
  if (source.includes('@media (prefers-reduced-motion: reduce)')) {
    console.log(`${path}: reduced-motion block already present`);
    return;
  }
  const block = `\n\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    animation-duration: 0.01ms !important;\n    animation-iteration-count: 1 !important;\n    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}\n`;
  fs.writeFileSync(path, source.replace(/\s*$/, '') + block, 'utf8');
  console.log(`${path}: appended reduced-motion block`);
}

function replaceExact(path, oldText, newText) {
  let source = fs.readFileSync(path, 'utf8');
  const count = source.split(oldText).length - 1;
  if (count === 1) {
    source = source.replace(oldText, newText);
    fs.writeFileSync(path, source, 'utf8');
    console.log(`${path}: updated reduced-motion behavior`);
    return;
  }
  if (count === 0 && source.includes(newText)) {
    console.log(`${path}: update already present`);
    return;
  }
  throw new Error(`${path}: expected exactly one target block, found ${count}`);
}

appendReducedMotion('style.css');
appendReducedMotion('games/games.css');
appendReducedMotion('articles/styles/2026-06-20-discount-gift-cards.css');

replaceExact(
  'js/ui.js',
`    animateValue(obj, start, end, duration, formatLang = 'ja') {\n        let startTimestamp = null;`,
`    animateValue(obj, start, end, duration, formatLang = 'ja') {\n        const prefersReducedMotion = typeof window.matchMedia === 'function'\n            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n        if (prefersReducedMotion || duration <= 0) {\n            obj.textContent = end.toLocaleString(formatLang);\n            return;\n        }\n\n        let startTimestamp = null;`
);

run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--test', 'tests/reduced-motion.test.cjs']);

const diff = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
if (diff.status !== 0) process.exit(diff.status || 1);
const changed = String(diff.stdout || '').trim().split(/\r?\n/).filter(Boolean);
const allowedExact = new Set([
  'style.css',
  'games/games.css',
  'articles/styles/2026-06-20-discount-gift-cards.css',
  'js/ui.js',
  'sw.js'
]);
for (const file of changed) {
  if (!allowedExact.has(file) && !file.endsWith('.html')) {
    throw new Error(`Unexpected generated change: ${file}`);
  }
}

if (changed.length === 0) {
  console.log('No generated changes to commit.');
  process.exit(0);
}

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', ...changed]);
run('git', ['commit', '-m', 'fix: respect reduced motion preference']);
run('git', ['push', 'origin', 'HEAD:fix/p2-reduced-motion']);
