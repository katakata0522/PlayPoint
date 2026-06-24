const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const ignoredDirs = new Set(['.git', 'tests', 'docs']);
const ignoredPaths = new Set(['.github/workflows']);
const ignoredFiles = new Set([]);
const jsFiles = [];
const requiredFiles = [
  '.github/scripts/verify-js-syntax.cjs',
  '.github/scripts/smoke-test.cjs',
  '.github/scripts/verify-build-output.cjs'
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      if (ignoredPaths.has(relativePath)) continue;
      walk(absolutePath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(?:js|cjs)$/.test(entry.name)) continue;
    if (ignoredFiles.has(relativePath)) continue;
    jsFiles.push(absolutePath);
  }
}

walk(root);

let failed = false;
for (const requiredFile of requiredFiles) {
  if (!jsFiles.some((file) => path.relative(root, file).replace(/\\/g, '/') === requiredFile)) {
    console.error(`Required JS file is not covered by syntax check: ${requiredFile}`);
    failed = true;
  }
}

for (const file of jsFiles.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${path.relative(root, file)}`);
    if (result.stderr) console.error(result.stderr.trim());
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`JS syntax check passed (${jsFiles.length} files).`);
}
