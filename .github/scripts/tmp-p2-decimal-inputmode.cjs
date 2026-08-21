'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.status !== 0) process.exit(result.status || 1);
}

function replaceExact(path, oldText, newText) {
  let source = fs.readFileSync(path, 'utf8');
  const count = source.split(oldText).length - 1;
  if (count === 1) {
    source = source.replace(oldText, newText);
    fs.writeFileSync(path, source);
    console.log(`${path}: updated decimal keyboard hint`);
    return;
  }
  if (count === 0 && source.includes(newText)) {
    console.log(`${path}: update already present`);
    return;
  }
  throw new Error(`${path}: expected exactly one amountYen input, found ${count}`);
}

replaceExact(
  'index.html',
  '<input type="number" id="amountYen" min="0.01" step="0.01" placeholder="例：5000" inputmode="numeric" data-lang-placeholder="amountYenPlaceholder">',
  '<input type="number" id="amountYen" min="0.01" step="0.01" placeholder="例：5000" inputmode="decimal" data-lang-placeholder="amountYenPlaceholder">'
);

run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--test', 'tests/decimal-inputmode.test.cjs']);

const diff = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
if (diff.status !== 0) process.exit(diff.status || 1);
const changed = String(diff.stdout || '').trim().split(/\r?\n/).filter(Boolean);
const allowed = new Set(['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']);
for (const file of changed) {
  if (!allowed.has(file)) throw new Error(`Unexpected generated change: ${file}`);
}

if (changed.length === 0) {
  console.log('No generated changes to commit.');
  process.exit(0);
}

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', ...changed]);
run('git', ['commit', '-m', 'fix: use decimal keyboard for fractional spending']);
run('git', ['push', 'origin', 'HEAD:fix/p2-decimal-inputmode']);
