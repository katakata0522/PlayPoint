const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generatedFiles } = require('../../scripts/build-targets.cjs');

const root = path.resolve(__dirname, '../..');

function normalizeTextBoundary(value) {
  const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  return text.replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
}

function isBoundaryOnlyChange(before, after) {
  if (before == null || after == null) return false;
  return normalizeTextBoundary(before) === normalizeTextBoundary(after);
}

function snapshotGeneratedFiles() {
  const snapshot = new Map();
  for (const file of generatedFiles) {
    const absolute = path.join(root, file);
    snapshot.set(file, fs.existsSync(absolute) ? fs.readFileSync(absolute) : null);
  }
  return snapshot;
}

function getChangedGeneratedFiles() {
  const changed = spawnSync('git', ['--no-pager', 'diff', '--name-only', '--', ...generatedFiles], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' }
  });

  if (changed.status !== 0) {
    console.error(changed.stderr || 'Could not inspect generated-file drift.');
    process.exit(changed.status || 1);
  }

  return String(changed.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function main() {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
  const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];

  if (!modifiedDate || !assetVersion) {
    console.error('Could not extract committed modified date or asset version from index.html.');
    process.exit(1);
  }

  const beforeBuild = snapshotGeneratedFiles();
  const build = spawnSync(process.execPath, ['scripts/build-html.js'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYPOINT_MODIFIED_DATE: modifiedDate,
      PLAYPOINT_ASSET_VERSION: assetVersion
    }
  });

  if (build.status !== 0) {
    process.exit(build.status || 1);
  }

  const changedFiles = getChangedGeneratedFiles();
  if (changedFiles.length === 0) {
    console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}).`);
    return;
  }

  const boundaryOnlyFiles = [];
  const meaningfulFiles = [];

  for (const file of changedFiles) {
    const absolute = path.join(root, file);
    const before = beforeBuild.get(file);
    const after = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    if (isBoundaryOnlyChange(before, after)) {
      boundaryOnlyFiles.push(file);
    } else {
      meaningfulFiles.push(file);
    }
  }

  // Line-ending and final-newline normalization are transport/editor details, not
  // generated-content changes. Restore the exact committed bytes so local runs do
  // not leave a dirty worktree while still failing on every semantic difference.
  for (const file of boundaryOnlyFiles) {
    const original = beforeBuild.get(file);
    if (original != null) fs.writeFileSync(path.join(root, file), original);
  }

  if (meaningfulFiles.length === 0) {
    console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}); ignored boundary-only text normalization in ${boundaryOnlyFiles.length} file(s).`);
    return;
  }

  spawnSync('git', ['--no-pager', 'diff', '--exit-code', '--', ...meaningfulFiles], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' }
  });

  console.error('生成物が HEAD と一致しません。日付とアセット版を固定して再生成し、差分をコミットしてください。');
  console.error('  node scripts/prepare-pr.cjs');
  console.error(`固定値: PLAYPOINT_MODIFIED_DATE=${modifiedDate} PLAYPOINT_ASSET_VERSION=${assetVersion}`);
  console.error('env なしで node scripts/build-html.js を回すとアセット版が時刻で変わり、差分が増えます。');
  console.error('変更ファイル:');
  for (const name of meaningfulFiles) console.error('- ' + name);
  if (boundaryOnlyFiles.length > 0) {
    console.error(`注: ${boundaryOnlyFiles.length}件の改行境界だけの差分は元のバイト列へ復元しました。`);
  }
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  normalizeTextBoundary,
  isBoundaryOnlyChange
};
