const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { generatedFiles } = require('../../scripts/build-targets.cjs');

const root = path.resolve(__dirname, '../..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
const assetVersion = indexHtml.match(/style\.css\?v=([a-zA-Z0-9_-]+)a/)?.[1];

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
  console.error('Generated files are out of sync. Run `node scripts/build-html.js`, review the diff, and commit the generated output.');
  process.exit(diff.status || 1);
}

console.log(`Committed build output is reproducible (date=${modifiedDate}, version=${assetVersion}).`);
