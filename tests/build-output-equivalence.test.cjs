'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const {
  normalizeTextBoundary,
  isBoundaryOnlyChange,
  saveGeneratedDriftEvidence
} = require('../.github/scripts/verify-build-output.cjs');

test('generated text comparison ignores only line-ending and final-newline differences', () => {
  assert.equal(isBoundaryOnlyChange('alpha\nbeta\n', 'alpha\r\nbeta'), true);
  assert.equal(isBoundaryOnlyChange('alpha\n', 'alpha\n\n'), true);
  assert.equal(normalizeTextBoundary('alpha\r\nbeta'), 'alpha\nbeta\n');
});

test('generated text comparison still rejects semantic or internal whitespace drift', () => {
  assert.equal(
    isBoundaryOnlyChange(
      '<lastmod>2026-09-03</lastmod>\n',
      '<lastmod>2026-09-08</lastmod>\n'
    ),
    false
  );
  assert.equal(isBoundaryOnlyChange('alpha beta\n', 'alpha  beta\n'), false);
  assert.equal(isBoundaryOnlyChange(null, 'alpha\n'), false);
});

test('生成差分の証跡は基点tree・新規/削除/変更ファイルを記録し、同一treeへ適用できる', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-drift-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  const clone = path.join(root, 'clone');
  const out = path.join(root, 'evidence');
  fs.mkdirSync(repo);
  const git = (cwd, args) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr || r.error?.message);
    return r.stdout.trim();
  };
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.name', 'Test']);
  git(repo, ['config', 'user.email', 'test@example.invalid']);
  git(repo, ['config', 'core.autocrlf', 'false']);
  fs.writeFileSync(path.join(repo, 'updated.html'), 'old\n');
  fs.writeFileSync(path.join(repo, 'deleted.html'), 'remove\n');
  fs.writeFileSync(path.join(repo, 'excluded.html'), 'unchanged\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'fixture']);
  const head = git(repo, ['rev-parse', 'HEAD']);
  const tree = git(repo, ['rev-parse', 'HEAD^{tree}']);
  fs.writeFileSync(path.join(repo, 'updated.html'), 'new\n');
  fs.unlinkSync(path.join(repo, 'deleted.html'));
  fs.writeFileSync(path.join(repo, 'added page.html'), 'added\n');
  fs.writeFileSync(path.join(repo, 'excluded.html'), 'not part of generation\n');
  const before = git(repo, ['status', '--porcelain']);
  const pins = { modifiedDate: '2026-11-26', assetVersion: '20261126_0000' };
  const manifest = saveGeneratedDriftEvidence({ rootDir: repo, outputDir: out,
    trackedFiles: ['updated.html', 'deleted.html'], untrackedFiles: ['added page.html'], pins });
  const patchFile = path.join(out, 'generated-drift.patch');
  assert.equal(manifest.head, head);
  assert.equal(manifest.tree, tree);
  assert.deepEqual(manifest.pins, pins);
  assert.deepEqual(manifest.files, ['added page.html', 'deleted.html', 'updated.html']);
  assert.equal(manifest.patchSha256, createHash('sha256').update(fs.readFileSync(patchFile)).digest('hex'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'generated-drift.json'), 'utf8')), manifest);
  assert.equal(git(repo, ['status', '--porcelain']), before, '証跡作成でindexや作業ツリーを変更しない');
  git(root, ['clone', '-q', '--no-hardlinks', repo, clone]);
  git(clone, ['config', 'core.autocrlf', 'false']);
  assert.equal(git(clone, ['rev-parse', 'HEAD^{tree}']), tree);
  git(clone, ['apply', '--check', patchFile]);
  git(clone, ['apply', patchFile]);
  assert.equal(fs.readFileSync(path.join(clone, 'updated.html'), 'utf8'), 'new\n');
  assert.equal(fs.readFileSync(path.join(clone, 'added page.html'), 'utf8'), 'added\n');
  assert.equal(fs.existsSync(path.join(clone, 'deleted.html')), false);
  assert.equal(fs.readFileSync(path.join(clone, 'excluded.html'), 'utf8'), 'unchanged\n');
});
