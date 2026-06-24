const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const ignoredDirs = new Set(['.git', '.github', 'tests', 'docs']);
const ignoredFiles = new Set([]);
const jsFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!/\.(?:js|cjs)$/.test(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (ignoredFiles.has(path.relative(root, file).replace(/\\/g, '/'))) continue;
    jsFiles.push(file);
  }
}

walk(root);

let failed = false;
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
