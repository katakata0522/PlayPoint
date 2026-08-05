const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const partPaths = Array.from({ length: 6 }, (_, index) =>
  path.join(__dirname, `pr59-patch.part${String(index).padStart(2, '0')}`)
);
for (const partPath of partPaths) {
  if (!fs.existsSync(partPath)) throw new Error(`Missing patch payload: ${partPath}`);
}

const encoded = Buffer.concat(partPaths.map(partPath => fs.readFileSync(partPath)));
const encodedHash = sha256(encoded);
if (encodedHash !== '17f50ce572dcf3140a8e59b9cc2d5fd53c3b681ea70de0ff8e4d13ee879c102d') {
  throw new Error(`Encoded patch hash mismatch: ${encodedHash}`);
}

const patch = zlib.gunzipSync(Buffer.from(encoded.toString('ascii'), 'base64'));
const patchHash = sha256(patch);
if (patchHash !== '53c3b2328569dbe541bd5f36a0aa42311af06091c5fe2e1c4d700e4d9393b291') {
  throw new Error(`Decoded patch hash mismatch: ${patchHash}`);
}

const patchPath = '/tmp/pr59-final-fixes.patch';
fs.writeFileSync(patchPath, patch);
run('git', ['apply', '--check', '--whitespace=error-all', patchPath]);
run('git', ['apply', '--whitespace=error-all', patchPath]);

const workflow = [
  'name: Pull request quality check',
  '',
  'on:',
  '  workflow_dispatch:',
  '  pull_request:',
  '    branches:',
  '      - main',
  '    paths-ignore:',
  "      - '**.md'",
  "      - '.gitignore'",
  "      - '.gitattributes'",
  '',
  'permissions:',
  '  contents: read',
  '',
  'concurrency:',
  '  group: quality-${{ github.workflow }}-${{ github.head_ref || github.ref }}',
  '  cancel-in-progress: true',
  '',
  'jobs:',
  '  quality:',
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 7',
  '    steps:',
  '      - name: Checkout code',
  '        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  '        with:',
  '          persist-credentials: false',
  '',
  '      - name: Run complete preflight',
  '        run: node .github/scripts/preflight.cjs',
  ''
].join('\n');
fs.writeFileSync(path.join(root, '.github', 'workflows', 'quality-check.yml'), workflow);

for (const partPath of partPaths) fs.unlinkSync(partPath);
fs.unlinkSync(__filename);
if (fs.existsSync(path.join(root, 'preflight.log'))) fs.unlinkSync(path.join(root, 'preflight.log'));

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '-A']);
run('git', ['commit', '-m', 'fix: resolve article audit quality regressions']);

run('node', ['.github/scripts/preflight.cjs']);
run('git', ['status', '--porcelain']);
run('git', ['push', 'origin', 'HEAD:content/quality-audit-wave1-20260805']);
