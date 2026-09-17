'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

function runDeployTransport(t, { exits = [0], sshExits = [0], mode = 'deploy', source } = {}) {
  if (process.platform === 'win32') { t.skip('bash/rsync契約はLinux CIで実行'); return null; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pp-transport-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const part of ['bin', 'staged', 'destination', 'home', 'status']) fs.mkdirSync(path.join(dir, part));
  fs.writeFileSync(path.join(dir, 'status/deploy-revision.txt'), 'a'.repeat(40));
  fs.writeFileSync(path.join(dir, 'status/deploy-status.json'), JSON.stringify({ status: 'verified', commit: 'a'.repeat(40) }));
  const log = path.join(dir, 'calls.jsonl');
  fs.writeFileSync(log, '');
  const shim = `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const file = process.env.PP_TRANSPORT_LOG;
const previous = fs.readFileSync(file, 'utf8').trim().split('\\n').filter(Boolean).map(JSON.parse);
const command = path.basename(process.argv[1]);
fs.appendFileSync(file, JSON.stringify({command, args: process.argv.slice(2)}) + '\\n');
if (command === 'ssh') fs.readFileSync(0); // heredocは一切実行しない
const sequence = JSON.parse(command === 'ssh' ? process.env.PP_SSH_EXITS : process.env.PP_TRANSPORT_EXITS);
const index = previous.filter(row => row.command === command).length;
process.exit(command === 'sleep' ? 0 : sequence[Math.min(index, sequence.length - 1)]);
`;
  for (const name of ['ssh', 'rsync', 'sleep']) fs.writeFileSync(path.join(dir, 'bin', name), shim, { mode: 0o700 });
  const script = path.join(dir, 'deploy.sh');
  fs.writeFileSync(script, source ?? fs.readFileSync(path.join(root, '.github/scripts/deploy-rsync.sh'), 'utf8'));
  const result = spawnSync('/bin/bash', [script, mode], { cwd: dir, encoding: 'utf8', timeout: 10000,
    // PATHをスタブだけへ限定。新しい外部コマンドが増えても実ネットワークへ逃がさない。
    env: { PATH: path.join(dir, 'bin'), HOME: path.join(dir, 'home'), DEPLOY_SOURCE_ROOT: path.join(dir, 'staged'),
      PP_TRANSPORT_LOG: log, PP_TRANSPORT_EXITS: JSON.stringify(exits), PP_SSH_EXITS: JSON.stringify(sshExits) } });
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  return { ...result, calls, dir };
}
module.exports = { runDeployTransport };
