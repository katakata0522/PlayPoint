const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('PRでは秘密情報を使わず一つのジョブで全事前検証を実行する', () => {
  const workflow = read('.github', 'workflows', 'quality-check.yml');

  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*-\s*main/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.ok(workflow.includes('node .github/scripts/preflight.cjs'));
  assert.ok(workflow.includes('cancel-in-progress: true'));
  assert.doesNotMatch(workflow, /secrets\./);
  assert.strictEqual((workflow.match(/\n  [a-z][a-z0-9_-]*:\n    runs-on:/g) || []).length, 1, '品質検証が複数runnerへ分割されています');
});

test('事前検証は全テストを自動収集し失敗工程を最後にまとめる', () => {
  const preflight = read('.github', 'scripts', 'preflight.cjs');

  assert.ok(preflight.includes(".filter(file => file.endsWith('.test.cjs'))"));
  assert.ok(preflight.includes("['--test', ...testFiles]"));
  assert.ok(preflight.includes('failures.push(name)'));
  assert.ok(preflight.includes('事前検証で失敗した工程'));
});

test('通常の事前検証は生成・圧縮対象を元に戻しデプロイ時だけ保持する', () => {
  const preflight = read('.github', 'scripts', 'preflight.cjs');

  assert.ok(preflight.includes("process.argv.includes('--prepare-deploy')"));
  assert.ok(preflight.includes('snapshotMutableFiles()'));
  assert.ok(preflight.includes('restoreMutableFiles()'));
  assert.match(preflight, /finally\s*\{\s*if \(!prepareDeploy\) restoreMutableFiles\(\);/s);
});

test('ルートService Workerは画面遷移をネットワーク優先で更新する', () => {
  const serviceWorker = read('sw.js');

  assert.ok(serviceWorker.includes("event.request.mode === 'navigate'"));
  assert.ok(serviceWorker.includes('handleNavigationRequest'));
  assert.ok(serviceWorker.includes('return fetch(request)'));
  assert.ok(serviceWorker.includes('return cachedResponse || cache.match'));
});

test('ルートキャッシュ世代は全共有アセット版から自動生成する', () => {
  const assetSync = read('scripts', 'asset-sync.cjs');

  assert.ok(assetSync.includes("require('crypto')"));
  assert.ok(assetSync.includes('createRootServiceWorkerCacheRevision'));
  assert.ok(assetSync.includes("createHash('sha256')"));
  assert.ok(!assetSync.includes('ROOT_SERVICE_WORKER_CACHE_REVISION'));
});
