const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
const scriptPath = path.join(root, '.github', 'scripts', 'deploy-rsync.sh');
const htaccessPath = path.join(root, '.htaccess');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');
const htaccess = fs.readFileSync(htaccessPath, 'utf8');

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

test('移設済み・非公開・統合済みの旧パスをXserver上の実体で検査する', () => {
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
    'calculator.html',
    'articles/2026-06-29-savings-game-fire.html',
    'articles/2025-12-25-playpoints-not-reflected.html',
    'articles/ogp/playpoints-not-reflected.png',
    'articles/styles/2025-12-25-movies-books.css',
    'articles/styles/2025-12-25-play-games.css',
    'articles/styles/2025-12-25-subscription.css',
    'articles/styles/2025-12-25-weekly-reward.css',
    'en/articles/google-play-points-reflection-timing.html',
  ]) {
    assert.ok(script.includes(`"${stalePath}"`), `旧パスの実体検査がありません: ${stalePath}`);
  }

  assert.match(script, /\[ -e "\$target" \] \|\| \[ -L "\$target" \]/);
  assert.match(script, /Legacy and non-public server artifacts are absent\./);
});

test('Xserverの一時的なSSH障害は本体ミラーだけ長めに、後続処理は短めに再試行する', () => {
  assert.match(script, /DEFAULT_MAX_ATTEMPTS=5/);
  assert.match(script, /DEPLOY_MAX_ATTEMPTS=7/);
  assert.match(script, /local max_attempts="\$2"/);
  assert.match(script, /10\|12\|30\|35\|255/);
  assert.match(script, /10 \* \(1 << \(retry_number - 1\)\)/);
  assert.match(script, /max_delay" -gt 60/);
  assert.match(script, /RANDOM % \(max_delay - min_delay \+ 1\)/);
  assert.match(script, /non-transient exit code \$exit_code; failing fast/);
  assert.match(script, /run_with_transient_retry "Deploying via rsync" "\$DEPLOY_MAX_ATTEMPTS" deploy_once/);
  assert.match(script, /run_with_transient_retry "Verifying remote cleanup" "\$DEFAULT_MAX_ATTEMPTS" verify_remote_cleanup_once/);
  assert.match(script, /run_with_transient_retry "Publishing verified deployment status" "\$DEFAULT_MAX_ATTEMPTS" publish_verified_status_once/);
  assert.match(workflow, /本体ミラーだけ7回、cleanup\/status公開は5回まで/);
  assert.match(workflow, /bash \.github\/scripts\/deploy-rsync\.sh --publish-status/);
  assert.doesNotMatch(
    workflow,
    /rsync -avz --delay-updates[\s\S]*status\/deploy-revision\.txt status\/deploy-status\.json/,
    'verified status publish must not bypass the shared Xserver retry helper'
  );
  assert.doesNotMatch(script, /MAX_RETRIES=3/);
  assert.doesNotMatch(script, /Waiting 10 seconds before retrying/);
});

test('接続後にXserver応答が止まってもSSHとrsyncが無期限に待たない', () => {
  assert.match(script, /-o ServerAliveInterval=15/);
  assert.match(script, /-o ServerAliveCountMax=2/);
  assert.match(script, /RSYNC_IO_TIMEOUT_SECONDS=60/);
  const rsyncTimeoutUses = script.match(/--timeout="\$RSYNC_IO_TIMEOUT_SECONDS"/g) || [];
  assert.equal(rsyncTimeoutUses.length, 2, 'deploy and verified-status rsync paths must both have an I/O timeout');
});

test('GitHub Actionsのjob timeoutはXserver retry予算を途中で打ち切らない', () => {
  const match = workflow.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(match, 'deploy workflow timeout is missing');
  assert.ok(Number(match[1]) >= 30, `deploy timeout is too short for bounded retry/backoff: ${match[1]} minutes`);
});

test('旧calculatorファイルを持たず301転送だけを維持する', () => {
  assert.equal(fs.existsSync(path.join(root, 'calculator.html')), false);
  assert.match(htaccess, /RewriteRule \^calculator\\\.html\$ \/ \[R=301,L,NE\]/);
});

test('全階層のindex.htmlを階層を保った正規URLへ301転送する', () => {
  assert.match(htaccess, /RewriteCond %\{THE_REQUEST\} \\s\/\+\(\.\*\/\)\?index\\\.html\[\\s\?\] \[NC\]/);
  assert.match(htaccess, /RewriteRule \^\(\.\*\/\)\?index\\\.html\$ \/\$1 \[R=301,L,NE\]/);
  assert.match(htaccess, /RewriteRule \^blog\/index\\\.html\$ \/blog\/ \[R=301,L,NE\]/);
});

test('デプロイスクリプトのBash構文が有効である', (t) => {
  // Git Bash 等は Windows パスのバックスラッシュを壊すため、POSIX 風パスへ変換する
  const bashScriptPath = process.platform === 'win32'
    ? `/${scriptPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase())}`
    : scriptPath;
  const result = spawnSync('bash', ['-n', bashScriptPath], { encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    t.skip('bashがない環境ではGitHub Actions上の検査に委ねます');
    return;
  }
  // パス変換後も bash が解釈できない場合（MSYS無しの bash 等）は CI に委ねる
  if (result.status !== 0 && process.platform === 'win32') {
    const detail = `${result.stderr || ''}${result.stdout || ''}`;
    if (/No such file or directory|cannot open/i.test(detail)) {
      t.skip(`Windows 上の bash がスクリプトパスを解決できないためスキップ: ${detail.trim()}`);
      return;
    }
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
