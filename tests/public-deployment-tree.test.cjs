'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES,
  assertPublicRootContract,
  classifyRootEntry,
  isPublicRepositoryPath,
} = require('../.github/scripts/public-paths.cjs');
const { preparePublicTree } = require('../.github/scripts/prepare-public-tree.cjs');
const { classifyDeployImpact } = require('../.github/scripts/detect-deploy-impact.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('repository root has no unreviewed deployment entries', () => {
  const audit = assertPublicRootContract(root);
  assert.deepEqual(audit.unknown, []);
  assert.ok(audit.publicEntries.includes('index.html'));
  assert.ok(audit.publicEntries.includes('articles'));
  assert.ok(audit.nonPublicEntries.includes('toc_scan_report.txt'));
});

test('public allowlist makes operational artifacts non-public by default', () => {
  for (const entry of [
    'toc_scan_report.txt',
    'README.md',
    'AGENTS.md',
    'みんな用URL.txt',
    'docs',
    'scripts',
    'tests',
    'tools',
    '.github',
  ]) {
    assert.equal(classifyRootEntry(entry), 'non-public', entry);
    assert.equal(isPublicRepositoryPath(entry), false, entry);
  }

  assert.equal(classifyRootEntry('unexpected-internal-report.txt'), 'unknown');
  assert.equal(isPublicRepositoryPath('unexpected-internal-report.txt'), false);
  const impact = classifyDeployImpact('unexpected-internal-report.txt');
  assert.equal(impact.deploy, true, 'unclassified root changes must trigger the fail-closed deploy path');
  assert.equal(impact.reason, 'unclassified-root');
});

test('prepared deployment tree contains only explicit public roots', (t) => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-public-tree-'));
  t.after(() => fs.rmSync(destination, { recursive: true, force: true }));

  preparePublicTree(destination, { sourceRoot: root });
  const actual = new Set(fs.readdirSync(destination));
  const expected = new Set([...PUBLIC_ROOT_FILES, ...PUBLIC_TOP_LEVEL_DIRECTORIES]);
  assert.deepEqual([...actual].sort(), [...expected].sort());

  for (const required of ['index.html', '.htaccess', 'robots.txt', 'articles', 'js', 'status']) {
    assert.equal(fs.existsSync(path.join(destination, required)), true, `missing staged public entry: ${required}`);
  }
  for (const forbidden of ['toc_scan_report.txt', '.github', 'docs', 'scripts', 'tests', 'tools', 'README.md', 'みんな用URL.txt']) {
    assert.equal(fs.existsSync(path.join(destination, forbidden)), false, `non-public entry leaked into stage: ${forbidden}`);
  }
});

test('deploy workflow creates status before staging and stages before SSH/rsync', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const statusIndex = workflow.indexOf('- name: Create deploying status marker');
  const stageIndex = workflow.indexOf('- name: Prepare explicit public deployment tree');
  const sshIndex = workflow.indexOf('- name: Setup SSH');
  const rsyncIndex = workflow.indexOf('- name: Deploy strict public mirror via rsync');

  assert.ok(statusIndex >= 0, 'deploying status marker step missing');
  assert.ok(stageIndex > statusIndex, 'public tree must include the deploying status marker');
  assert.ok(sshIndex > stageIndex, 'staging must finish before SSH is prepared');
  assert.ok(rsyncIndex > sshIndex, 'rsync must follow staging and SSH setup');
  assert.match(workflow, /node \.github\/scripts\/prepare-public-tree\.cjs "\$public_root"/);
  assert.match(workflow, /DEPLOY_SOURCE_ROOT=\$public_root/);
});

test('rsync refuses direct repository-root deployment and uses staged source root', () => {
  const deploy = read('.github/scripts/deploy-rsync.sh');
  assert.match(deploy, /DEPLOY_SOURCE_ROOT="\$\{DEPLOY_SOURCE_ROOT:-\}"/);
  assert.match(deploy, /DEPLOY_SOURCE_ROOT is required\. Refusing to mirror the repository root directly\./);
  assert.match(deploy, /source_root="\$\(resolve_deploy_source_root\)"/);
  assert.match(deploy, /"\$source_root\/" "\$REMOTE_HOST:\$REMOTE_ROOT\/"/);
  assert.doesNotMatch(deploy, /\n\s+\.\/ "\$REMOTE_HOST:\$REMOTE_ROOT\/"/);
  assert.match(deploy, /"toc_scan_report\.txt"/);
});
