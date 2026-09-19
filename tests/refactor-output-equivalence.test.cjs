'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { publicManifest, compareManifests, fixedBuildEnvironment, verify } = require('../scripts/verify-refactor-output.cjs');

function directory(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-equivalence-test-'));
  // 隔離Gitの終了直後にファイルが現れる一時競合だけ再試行し、上限後は後片付けも失敗させる。
  t.after(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }));
  return root;
}
function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}
function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('公開ファイルの追加・削除・変更を区別し、同一出力は通す', () => {
  assert.deepEqual(compareManifests({ a: '1', b: '2' }, { a: '1', b: '2' }), []);
  assert.deepEqual(compareManifests({ a: '1', b: '2' }, { a: '3', c: '4' }), [
    { file: 'a', kind: 'changed' }, { file: 'b', kind: 'removed' }, { file: 'c', kind: 'added' }
  ]);
});
test('本文・URL・JS・CSS・画像をバイト単位で比較し、運用ファイルは対象外', t => {
  const root = directory(t);
  write(root, 'en/articles/example.html', 'first\n');
  write(root, 'js/example.js', 'one');
  write(root, '.htaccess', 'rules');
  write(root, 'image.png', Buffer.from([0, 255]));
  write(root, 'scripts/private.cjs', 'internal');
  write(root, 'docs/internal.md', 'internal');
  const first = publicManifest(root);
  assert.deepEqual(Object.keys(first), ['.htaccess', 'en/articles/example.html', 'image.png', 'js/example.js']);
  write(root, 'scripts/private.cjs', 'changed');
  assert.deepEqual(compareManifests(first, publicManifest(root)), []);
  write(root, 'en/articles/example.html', 'first\r\n');
  assert.deepEqual(compareManifests(first, publicManifest(root)), [{ file: 'en/articles/example.html', kind: 'changed' }]);
});
test('公開symlinkは追跡せずエラーにする', { skip: process.platform === 'win32' }, t => {
  const root = directory(t);
  fs.symlinkSync(os.tmpdir(), path.join(root, 'escape'));
  assert.throws(() => publicManifest(root), /symlink/);
});
test('日時・キャッシュ版は比較基準から読み、不明なら停止する', t => {
  const root = directory(t);
  write(root, 'index.html', '<meta name="last-modified" content="2026-09-13">');
  write(root, 'sw.js', "const CACHE = 'playpoint-calc-v20260913_1-abcd';");
  assert.deepEqual(fixedBuildEnvironment(root), { PLAYPOINT_MODIFIED_DATE: '2026-09-13', PLAYPOINT_ASSET_VERSION: '20260913_1' });
  write(root, 'sw.js', 'unknown');
  assert.throws(() => fixedBuildEnvironment(root), /取得できません/);
});
test('実際のGit入力を隔離buildし、元の未コミット作業を変更しない', t => {
  const root = directory(t);
  const evidenceDir = directory(t);
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  write(root, 'index.html', '<meta name="last-modified" content="2026-09-13">');
  write(root, 'sw.js', "const CACHE = 'playpoint-calc-v20260913_1-abcd';");
  write(root, 'scripts/build-html.js', "require('node:fs').writeFileSync('generated.html', process.env.PLAYPOINT_MODIFIED_DATE);\n");
  git(root, 'add', '.'); git(root, 'commit', '--quiet', '-m', 'baseline');
  const base = git(root, 'rev-parse', 'HEAD');
  write(root, 'docs/change.md', 'internal refactor');
  git(root, 'add', '.'); git(root, 'commit', '--quiet', '-m', 'candidate');
  write(root, 'index.html', 'uncommitted user work');
  const status = git(root, 'status', '--porcelain');
  const report = verify({ root, base, evidenceDir });
  assert.equal(report.status, 'passed');
  assert.equal(report.publicFiles, 3);
  assert.deepEqual(report.differences, []);
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'uncommitted user work');
  assert.equal(git(root, 'status', '--porcelain'), status);
  assert.ok(fs.existsSync(path.join(evidenceDir, 'candidate-source.tar')));
  assert.throws(() => verify({ root, base: '--help' }), /40桁/);
  assert.throws(() => verify({ root, base, evidenceDir: path.join(root, 'public-evidence') }), /リポジトリ外/);
});
test('実buildの差分と再buildで増える出力を検出し、失敗証跡を残す', t => {
  const root = directory(t); const evidenceDir = directory(t);
  git(root, 'init', '--quiet'); git(root, 'config', 'user.name', 'Fixture'); git(root, 'config', 'user.email', 'fixture@example.invalid');
  write(root, 'index.html', '<meta name="last-modified" content="2026-09-13">');
  write(root, 'sw.js', "const CACHE = 'playpoint-calc-v20260913_1-abcd';");
  write(root, 'scripts/build-html.js', "require('node:fs').writeFileSync('generated.html', 'baseline');");
  git(root, 'add', '.'); git(root, 'commit', '--quiet', '-m', 'baseline');
  const base = git(root, 'rev-parse', 'HEAD');
  write(root, 'scripts/build-html.js', "require('node:fs').appendFileSync('generated.html', 'changed');");
  git(root, 'add', '.'); git(root, 'commit', '--quiet', '-m', 'candidate');
  assert.throws(() => verify({ root, base, evidenceDir }), /公開出力差分/);
  const report = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'report.json'), 'utf8'));
  assert.equal(report.status, 'failed');
  assert.equal(report.differences[0].file, 'generated.html');
  assert.equal(report.repeatDifferences[0].file, 'generated.html');
});
