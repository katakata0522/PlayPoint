const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { runDeployTransport } = require('./helpers/deploy-transport-fixture.cjs');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'deploy.yml');
const scriptPath = path.join(root, '.github', 'scripts', 'deploy-rsync.sh');
const htaccessPath = path.join(root, '.htaccess');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const script = fs.readFileSync(scriptPath, 'utf8');
const htaccess = fs.readFileSync(htaccessPath, 'utf8');

test('実際のrsync引数で秘密・旧公開物を除外し、公開サブ階層と別管理領域を保護する', t => {
  assert.match(workflow, /^\s*run:\s*['"]?bash \.github\/scripts\/deploy-rsync\.sh['"]?\s*$/m, '公開workflowから専用転送処理を起動する');
  const result = runDeployTransport(t);
  if (!result) return;
  assert.equal(result.status, 0, result.stderr);
  const transfer = result.calls.find(call => call.command === 'rsync');
  assert.ok(transfer, '転送処理が呼ばれていない');
  const source = path.join(result.dir, 'staged');
  const destination = path.join(result.dir, 'destination');
  const put = (base, file) => {
    fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true });
    fs.writeFileSync(path.join(base, file), file);
  };
  const privateFiles = ['.git/config', '.github/workflows/private.yml', '.gitignore', '.gitattributes',
    '.env', '.env.local', 'credential.pem', 'credential.key', 'query.sql', 'debug.log', 'data.bak',
    'README.md', 'AGENTS.md', 'tests/spec.cjs', 'docs/private.md', 'scripts/build.js', 'tools/private.cjs', 'みんな用URL.txt', 'CNAME'];
  const publicFiles = ['index.html', 'articles/docs/readme.html', 'articles/scripts/example.js'];
  for (const file of [...privateFiles, ...publicFiles]) put(source, file);
  for (const file of [...privateFiles, 'stale.html', 'manner/keep.html', 'kanji-slicer/keep.html']) put(destination, file);
  // 捕捉したフィルター・削除オプションだけを、二つの一時ローカルディレクトリに適用。
  // -eとリモートの送受信先は引き継がない。
  const options = [];
  for (let i = 0; i < transfer.args.length; i++) {
    const arg = transfer.args[i];
    if (arg === '-e') { i++; continue; }
    if (arg === '--exclude' || arg === '--filter') { options.push(arg, transfer.args[++i]); continue; }
    if (arg.startsWith('-')) options.push(arg);
  }
  const copied = spawnSync('rsync', [...options, source + '/', destination + '/'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(copied.status, 0, copied.stderr || copied.error?.message);
  for (const file of privateFiles) assert.equal(fs.existsSync(path.join(destination, file)), false, `非公開ファイル漏出: ${file}`);
  assert.equal(fs.existsSync(path.join(destination, 'stale.html')), false, '旧公開物が残った');
  for (const file of [...publicFiles, 'manner/keep.html', 'kanji-slicer/keep.html']) assert.ok(fs.existsSync(path.join(destination, file)), `過剰な除外・削除: ${file}`);
});

test('デプロイ前snapshotはverified本番だけを公開領域外へ1世代退避する', () => {
  assert.match(script, /REMOTE_SNAPSHOT_ROOT="\/home\/hajikkoroom\/playpoint-sim\.com\/\.deploy-snapshots"/);
  assert.match(script, /SNAPSHOT_NAME="previous-verified"/);
  assert.match(script, /Refusing to snapshot unexpected deployment root/);
  assert.match(script, /Refusing unexpected snapshot root/);
  assert.match(script, /if \[ "\$status" != "verified" \]; then/);
  assert.match(script, /preserving any existing rollback snapshot/);
  assert.match(script, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(script, /if \[ "\$commit" != "\$revision" \]; then/);
  assert.match(script, /--exclude '\/manner\/\*\*\*'/);
  assert.match(script, /--exclude '\/kanji-slicer\/\*\*\*'/);
  assert.match(script, /find "\$tmp\/site" -type l -print -quit/);
  assert.match(script, /mv "\$final" "\$old"/);
  assert.match(script, /Failed to publish rollback snapshot; previous snapshot restored when available/);
  assert.match(script, /Stored rollback snapshot for verified production/);
  assert.match(script, /--snapshot-verified\)/);

  const sshIndex = workflow.indexOf('- name: Setup SSH');
  const snapshotIndex = workflow.indexOf('- name: Snapshot current verified production');
  const deployIndex = workflow.indexOf('- name: Deploy strict public mirror via rsync');
  assert.ok(sshIndex >= 0, 'SSH setup step missing');
  assert.ok(snapshotIndex > sshIndex, 'snapshot must run only after hardened SSH setup');
  assert.ok(deployIndex > snapshotIndex, 'snapshot must finish before production mirror starts');
  assert.match(workflow, /bash \.github\/scripts\/deploy-rsync\.sh --snapshot-verified/);
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
  assert.match(script, /Sensitive or non-public server artifacts are absent\./);
});

test('通信障害だけ有限回再試行し、非通信エラーを即時に返す', t => {
  for (const code of [10, 12, 30, 35, 255]) {
    const result = runDeployTransport(t, { exits: [code, 0] });
    if (!result) return;
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.calls.filter(c => c.command === 'rsync').length, 2, String(code));
    assert.equal(result.calls.filter(c => c.command === 'sleep').length, 1);
  }
  const fatal = runDeployTransport(t, { exits: [23] });
  assert.equal(fatal.status, 23);
  assert.equal(fatal.calls.filter(c => c.command === 'rsync').length, 1);
  assert.ok(!fatal.calls.some(c => ['sleep', 'ssh'].includes(c.command)), '失敗後に待機やremote cleanupを実行しない');
  const exhausted = runDeployTransport(t, { exits: [255] });
  assert.equal(exhausted.status, 255);
  assert.equal(exhausted.calls.filter(c => c.command === 'rsync').length, 7, '現行の再試行上限');
  const sleeps = exhausted.calls.filter(c => c.command === 'sleep');
  assert.equal(sleeps.length, 6);
  assert.ok(sleeps.every(c => Number(c.args[0]) >= 1 && Number(c.args[0]) <= 60), '待機時間を有限に保つ');
  for (const [mode, command] of [['--snapshot-verified', 'ssh'], ['--publish-status', 'rsync'], ['deploy', 'ssh']]) {
    const stopped = runDeployTransport(t, { mode, exits: command === 'rsync' ? [255] : [0], sshExits: command === 'ssh' ? [255] : [0] });
    assert.equal(stopped.status, 255, mode);
    assert.equal(stopped.calls.filter(c => c.command === command).length, 5, `${mode}: 補助処理の上限`);
  }
  // workflow→共有再試行処理の結線は別契約。内部メッセージの固定はしない。
  assert.match(workflow, /bash \.github\/scripts\/deploy-rsync\.sh --publish-status/);
  assert.doesNotMatch(workflow, /rsync -avz --delay-updates[\s\S]*status\/deploy-revision\.txt status\/deploy-status\.json/);

});

test('接続後にXserver応答が止まってもSSHとrsyncが無期限に待たない', () => {
  assert.match(script, /-o ServerAliveInterval=15/);
  assert.match(script, /-o ServerAliveCountMax=2/);
  assert.match(script, /RSYNC_IO_TIMEOUT_SECONDS=60/);
  const rsyncTimeoutUses = script.match(/--timeout="\$RSYNC_IO_TIMEOUT_SECONDS"/g) || [];
  assert.equal(rsyncTimeoutUses.length, 2, 'deploy and verified-status rsync paths must both have an I/O timeout');
});

test('本番SSHは公開鍵だけを使い、転送・TTY・鍵残存を許さない', () => {
  for (const option of [
    '-o BatchMode=yes',
    '-o IdentitiesOnly=yes',
    '-o PubkeyAuthentication=yes',
    '-o PreferredAuthentications=publickey',
    '-o PasswordAuthentication=no',
    '-o KbdInteractiveAuthentication=no',
    '-o ForwardAgent=no',
    '-o ClearAllForwardings=yes',
    '-o RequestTTY=no',
    '-o StrictHostKeyChecking=yes',
  ]) {
    assert.ok(script.includes(option), `SSH hardening option is missing: ${option}`);
  }

  assert.ok(workflow.includes('SSH_PRIVATE_KEY_B64: ${{ secrets.SSH_PRIVATE_KEY }}'));
  assert.ok(workflow.includes('umask 077'));
  assert.ok(workflow.includes('chmod 700 ~/.ssh'));
  assert.ok(workflow.includes("printf '%s' \"$SSH_PRIVATE_KEY_B64\" | base64 -d > ~/.ssh/id_ed25519"));
  assert.ok(workflow.includes("ssh-keygen -y -P '' -f ~/.ssh/id_ed25519 >/dev/null"));
  assert.ok(workflow.includes('chmod 600 ~/.ssh/known_hosts'));
  assert.ok(workflow.includes('- name: Remove SSH material'));
  assert.ok(workflow.includes('if: always()'));
  assert.ok(workflow.includes('rm -f ~/.ssh/id_ed25519 ~/.ssh/known_hosts'));
  assert.ok(!workflow.includes('echo "${{ secrets.SSH_PRIVATE_KEY }}"'));
});

test('GitHub Actionsのjob timeoutは失敗時の自動復元・再検証まで途中で打ち切らない', () => {
  const match = workflow.match(/timeout-minutes:\s*(\d+)/);
  assert.ok(match, 'deploy workflow timeout is missing');
  assert.ok(Number(match[1]) >= 50, `deploy timeout is too short for bounded deploy plus rollback verification: ${match[1]} minutes`);
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