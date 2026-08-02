const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
const scriptPath = path.join(root, '.github', 'scripts', 'deploy-rsync.sh');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');

test('デプロイは公開物だけを厳密にミラーし、除外物も本番から削除する', () => {
  assert.match(workflow, /run:\s+bash \.github\/scripts\/deploy-rsync\.sh/);
  assert.match(script, /--delete-after\s+--delete-excluded\s+--delay-updates/);

  for (const pattern of [
    '/.git/***',
    '/.github/***',
    '/.gitignore',
    '/.gitattributes',
    '/README.md',
    '/AGENTS.md',
    '/tests/***',
    '/docs/***',
    '/scripts/***',
    '/みんな用URL.txt',
    '/CNAME',
  ]) {
    assert.ok(script.includes(`--exclude '${pattern}'`), `ルート限定の除外がありません: ${pattern}`);
  }

  for (const unsafePattern of [
    "--exclude '.git*'",
    "--exclude '.github*'",
    "--exclude 'tests*'",
    "--exclude 'docs*'",
    "--exclude 'scripts*'",
  ]) {
    assert.ok(!script.includes(unsafePattern), `全階層へ広がる除外が残っています: ${unsafePattern}`);
  }
});

test('移設済み・非公開の旧パスをXserver上の実体で検査する', () => {
  assert.match(script, /Refusing to inspect unexpected deployment root/);
  assert.match(script, /\/home\/hajikkoroom\/playpoint-sim\.com\/public_html/);

  for (const stalePath of [
    '.git',
    '.github',
    'README.md',
    'tests',
    'docs',
    'scripts',
    'tools',
    'kindle-tracker',
    'kids-smile-land',
    'doujin-shi-calculator',
    'articles/2026-06-29-savings-game-fire.html',
    'articles/2025-12-25-playpoints-not-reflected.html',
    'en/articles/google-play-points-reflection-timing.html',
  ]) {
    assert.ok(script.includes(`"${stalePath}"`), `旧パスの実体検査がありません: ${stalePath}`);
  }

  assert.match(script, /\[ -e "\$target" \] \|\| \[ -L "\$target" \]/);
  assert.match(script, /Legacy and non-public server artifacts are absent\./);
});

test('デプロイスクリプトのBash構文が有効である', (t) => {
  const result = spawnSync('bash', ['-n', scriptPath], { encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    t.skip('bashがない環境ではGitHub Actions上の検査に委ねます');
    return;
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
