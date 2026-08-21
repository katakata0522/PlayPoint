'use strict';

const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--test', 'tests/internal-link-targets.test.cjs']);

const diff = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
if (diff.status !== 0) process.exit(diff.status || 1);
const changed = String(diff.stdout || '').trim().split(/\r?\n/).filter(Boolean);
for (const file of changed) {
  if (!file.endsWith('.html')) throw new Error(`Unexpected generated change: ${file}`);
}

if (changed.length === 0) {
  console.log('No generated HTML changes to commit.');
  process.exit(0);
}

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', ...changed]);
run('git', ['commit', '-m', 'fix: keep internal navigation in the same tab']);
run('git', ['push', 'origin', 'HEAD:fix/p2-internal-link-targets']);
