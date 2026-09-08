const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generatedFiles } = require('../../scripts/build-targets.cjs');

const root = path.resolve(__dirname, '../..');

function normalizeTextBoundary(value) {
  const text = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
  return text.replace(/\r\n?/g, '\n').replace(/\n*$/, '\n');
}

function isBoundaryOnlyChange(committed, generated) {
  if (committed == null || generated == null) return false;
  return normalizeTextBoundary(committed) === normalizeTextBoundary(generated);
}

function readCommittedFile(file) {
  const result = spawnSync('git', ['show', `HEAD:${file}`], {
    cwd: root,
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.status !== 0) return null;
  return result.stdout;
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

function getUntrackedGeneratedFiles() {
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...generatedFiles], {
    cwd: root,
    encoding: 'utf8'
  });

  if (untracked.status !== 0) {
    console.error(untracked.stderr || 'Could not inspect untracked generated files.');
    process.exit(untracked.status || 1);
  }

  return String(untracked.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function main() {
  const committedIndex = readCommittedFile('index.html');
  const committedServiceWorker = readCommittedFile('sw.js');
  const indexHtml = committedIndex?.toString('utf8') || '';
  const serviceWorker = committedServiceWorker?.toString('utf8') || '';
  const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
  const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];

  if (!modifiedDate || !assetVersion) {
    console.error('Could not extract committed modified date or asset version from HEAD.');
    process.exit(1);
  }

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

  // Keep the strict byte-level diff as the primary integrity gate. Only when it
  // finds drift do we classify whether that drift is transport-only text-boundary
  // normalization or an actual generated-content change.
  const diff = spawnSync('git', ['diff', '--exit-code', '--', ...generatedFiles], {
    cwd: root,
    stdio: 'ignore'
  });
  const untrackedGeneratedFiles = getUntrackedGeneratedFiles();

  if (diff.status === 0 && untrackedGeneratedFiles.length === 0) {
    console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}).`);
    return;
  }

  const changedFiles = [
    ...new Set([
      ...getChangedGeneratedFiles(),
      ...untrackedGeneratedFiles
    ])
  ];
  const boundaryOnlyFiles = [];
  const meaningfulFiles = [];

  for (const file of changedFiles) {
    const absolute = path.join(root, file);
    const committed = readCommittedFile(file);
    const generated = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    if (isBoundaryOnlyChange(committed, generated)) {
      boundaryOnlyFiles.push(file);
    } else {
      meaningfulFiles.push(file);
    }
  }

  // Line-ending and trailing-newline normalization are transport/editor details,
  // not generated-content changes. Restore the exact committed bytes so local runs
  // do not leave a dirty worktree. The comparison baseline is HEAD, never the
  // pre-build workspace, so pre-existing semantic drift cannot be hidden here.
  for (const file of boundaryOnlyFiles) {
    const committed = readCommittedFile(file);
    if (committed != null) fs.writeFileSync(path.join(root, file), committed);
  }

  if (meaningfulFiles.length === 0) {
    console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}); ignored boundary-only text normalization in ${boundaryOnlyFiles.length} file(s).`);
    return;
  }

  const trackedMeaningfulFiles = meaningfulFiles.filter(file => readCommittedFile(file) != null);
  if (trackedMeaningfulFiles.length > 0) {
    spawnSync('git', ['--no-pager', 'diff', '--exit-code', '--', ...trackedMeaningfulFiles], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' }
    });
  }

  console.error('生成物が HEAD と一致しません。日付とアセット版を固定して再生成し、差分をコミットしてください。');
  console.error('  node scripts/prepare-pr.cjs');
  console.error(`固定値: PLAYPOINT_MODIFIED_DATE=${modifiedDate} PLAYPOINT_ASSET_VERSION=${assetVersion}`);
  console.error('env なしで node scripts/build-html.js を回すとアセット版が時刻で変わり、差分が増えます。');
  console.error('変更ファイル:');
  for (const name of meaningfulFiles) console.error('- ' + name);
  if (untrackedGeneratedFiles.length > 0) {
    console.error(`注: ${untrackedGeneratedFiles.length}件の未追跡生成物を検出しました。生成対象を追加した場合は成果物もコミットしてください。`);
  }
  if (boundaryOnlyFiles.length > 0) {
    console.error(`注: ${boundaryOnlyFiles.length}件の改行境界だけの差分はHEADのバイト列へ復元しました。`);
  }
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  normalizeTextBoundary,
  isBoundaryOnlyChange
};
