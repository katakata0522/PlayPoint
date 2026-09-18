'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n?/g, '\n');
const helperPath = '.github/scripts/setup-browser-runtime.sh';
const helper = read(helperPath);

const workflowExpectations = new Map([
  ['.github/workflows/quality-check.yml', 1],
  ['.github/workflows/mobile-performance.yml', 1],
  ['.github/workflows/deploy.yml', 1],
  ['.github/workflows/rollback.yml', 1],
  ['.github/workflows/deploy-recovery-watchdog.yml', 1],
]);

test('Playwright対応Chromium・固定依存・日本語fontは単一helperが所有する', () => {
  const manifest = JSON.parse(read('.github/ci-runtime/package.json'));
  const lock = JSON.parse(read('.github/ci-runtime/package-lock.json'));
  assert.equal(manifest.private, true);
  assert.match(manifest.dependencies['playwright-core'], /^\d+\.\d+\.\d+$/, 'playwright-core must stay exactly pinned');
  assert.equal(Object.keys(manifest.dependencies).length, 1);
  const performance = JSON.parse(read('.github/ci-runtime/lighthouse/package.json'));
  const performanceLock = JSON.parse(read('.github/ci-runtime/lighthouse/package-lock.json'));
  assert.match(performance.dependencies.lighthouse, /^\d+\.\d+\.\d+$/, 'lighthouse must stay exactly pinned');
  assert.equal(performanceLock.packages['node_modules/lighthouse'].version, performance.dependencies.lighthouse);
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    assert.equal(lock.packages[''].dependencies[name], version);
    assert.equal(lock.packages['node_modules/' + name].version, version);
    assert.ok(lock.packages['node_modules/' + name].integrity);
  }
  assert.match(read('.github/ci-runtime/node-version').trim(), /^\d+\.\d+\.\d+$/);
  assert.match(helper, /npm ci --prefix/);
  assert.match(helper, /--ignore-scripts/);
  assert.match(helper, /install --with-deps --no-shell chromium/);
  assert.match(helper, /chromium\.executablePath\(\)/);
  assert.doesNotMatch(helper, /command -v (?:google-chrome|chromium)|npm install|--no-package-lock/);
  assert.match(helper, /fonts-noto-cjk/);
  assert.match(helper, /fc-match sans-serif:lang=ja/);
  assert.match(helper, /printf 'CHROME_PATH=%s\\n'/);
  assert.match(helper, /printf 'NODE_PATH=%s\\n'/);
  assert.match(helper, /GITHUB_ENV is required/);
});

test('browser検証を所有するworkflowは共通helperだけを呼ぶ', () => {
  for (const [workflowPath, expectedCalls] of workflowExpectations) {
    const workflow = read(workflowPath);
    const calls = workflow.match(/bash \.github\/scripts\/setup-browser-runtime\.sh/g) || [];
    assert.equal(calls.length, expectedCalls, `${workflowPath} must call browser runtime helper ${expectedCalls} time(s)`);
    assert.doesNotMatch(workflow, /playwright-core@1\.55\.0/);
    assert.doesNotMatch(workflow, /npm install --no-save --no-package-lock --ignore-scripts playwright-core/);
    assert.doesNotMatch(workflow, /sudo apt-get install -y --no-install-recommends fonts-noto-cjk/);
  }
});

test('退避したmanual Browser Smokeも共通helper参照だけを保持する', () => {
  const recipe = read('.github/manual-workflows/browser-smoke.yml');
  const calls = recipe.match(/bash \.github\/scripts\/setup-browser-runtime\.sh/g) || [];
  assert.equal(calls.length, 2);
  assert.doesNotMatch(recipe, /playwright-core@1\.55\.0/);
  assert.doesNotMatch(recipe, /npm install --no-save --no-package-lock --ignore-scripts playwright-core/);
  assert.doesNotMatch(recipe, /sudo apt-get install -y --no-install-recommends fonts-noto-cjk/);
});

test('browser runtime helper変更は本番Deploy入力として扱う', () => {
  const impact = read('.github/scripts/detect-deploy-impact.cjs');
  assert.match(impact, /'\.github\/scripts\/setup-browser-runtime\.sh'/);
});

test('Deployは同一runnerのauto-rollbackでruntimeを再installしない', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const installIndex = workflow.indexOf('- name: Install production browser verifier');
  const mirrorIndex = workflow.indexOf('- name: Deploy strict public mirror via rsync');
  const rollbackBrowser = workflow.slice(workflow.indexOf('- name: Verify auto-rollback production in Chromium'));
  assert.ok(installIndex >= 0 && installIndex < mirrorIndex);
  assert.equal((workflow.match(/setup-browser-runtime\.sh/g) || []).length, 1);
  assert.doesNotMatch(rollbackBrowser, /setup-browser-runtime\.sh/);
  assert.match(rollbackBrowser, /require\.resolve\('playwright-core'\)/);
});

test('共通browser runtime helperのBash構文が有効である', (t) => {
  const absolute = path.join(root, helperPath);
  const bashPath = process.platform === 'win32'
    ? `/${absolute.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => drive.toLowerCase())}`
    : absolute;
  const result = spawnSync('bash', ['-n', bashPath], { encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    t.skip('bashがない環境ではGitHub Actions上の検査に委ねます');
    return;
  }
  if (result.status !== 0 && process.platform === 'win32') {
    const detail = `${result.stderr || ''}${result.stdout || ''}`;
    if (/No such file or directory|cannot open/i.test(detail)) {
      t.skip(`Windows 上の bash がスクリプトパスを解決できないためスキップ: ${detail.trim()}`);
      return;
    }
  }
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
