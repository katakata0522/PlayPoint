const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generatedFiles } = require('../../scripts/build-targets.cjs');

const root = path.resolve(__dirname, '../..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];

if (!modifiedDate || !assetVersion) {
  console.error('Could not extract committed modified date or asset version from index.html.');
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

const diff = spawnSync('git', ['diff', '--exit-code', '--', ...generatedFiles], {
  cwd: root,
  stdio: 'inherit'
});

if (diff.status !== 0) {
  const changed = spawnSync('git', ['--no-pager', 'diff', '--name-only', '--', ...generatedFiles], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PAGER: 'cat', GIT_PAGER: 'cat' }
  });
  const names = String(changed.stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  console.error('生成物が HEAD と一致しません。日付とアセット版を固定して再生成し、差分をコミットしてください。');
  console.error('  node scripts/prepare-pr.cjs');
  console.error(`固定値: PLAYPOINT_MODIFIED_DATE=${modifiedDate} PLAYPOINT_ASSET_VERSION=${assetVersion}`);
  console.error('env なしで node scripts/build-html.js を回すとアセット版が時刻で変わり、差分が増えます。');
  if (names.length > 0) {
    console.error('変更ファイル:');
    for (const name of names) console.error('- ' + name);
  }
  process.exit(diff.status || 1);
}

console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}).`);
