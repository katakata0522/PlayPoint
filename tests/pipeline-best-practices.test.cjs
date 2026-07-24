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

test('事前検証は多言語の公開必須ファイル欠損を検出する', () => {
  const preflight = read('.github', 'scripts', 'preflight.cjs');

  assert.ok(preflight.includes("const requiredPublicFiles = ['en/index.html', 'ko/index.html', 'tw/index.html']"));
  assert.ok(preflight.includes('verifyRequiredPublicFiles()'));
  assert.ok(preflight.includes('公開必須ファイルがありません'));
});

test('Service Workerの全先読み対象をデプロイ前に検証する', () => {
  const preflight = read('.github', 'scripts', 'preflight.cjs');

  assert.ok(preflight.includes('verifyServiceWorkerPrecacheAssets()'));
  assert.ok(preflight.includes('Service Worker先読み対象がありません'));
  assert.ok(preflight.includes("pathWithoutQuery.endsWith('/')"));
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
  assert.ok(serviceWorker.includes('await fetch(request)'));
  assert.ok(serviceWorker.includes('return networkResponse'));
  assert.ok(serviceWorker.includes('return cachedResponse || cache.match'));
});

test('ルートキャッシュ世代は全共有アセット版から自動生成する', () => {
  const assetSync = read('scripts', 'asset-sync.cjs');

  assert.ok(assetSync.includes("require('crypto')"));
  assert.ok(assetSync.includes('createRootServiceWorkerCacheRevision'));
  assert.ok(assetSync.includes("createHash('sha256')"));
  assert.ok(!assetSync.includes('ROOT_SERVICE_WORKER_CACHE_REVISION'));
});

test('本番確認は配信されたコミットSHAを完全一致で検証する', () => {
  const workflow = read('.github', 'workflows', 'deploy.yml');
  const smokeTest = read('.github', 'scripts', 'smoke-test.cjs');

  assert.ok(workflow.includes("printf '%s\\n' \"$GITHUB_SHA\" > status/deploy-revision.txt"));
  assert.ok(workflow.includes('EXPECTED_DEPLOY_REVISION: ${{ github.sha }}'));
  assert.ok(smokeTest.includes('status/deploy-revision.txt'));
  assert.ok(smokeTest.includes("text.trim() !== target.equals"));
});

test('本番デプロイは実行中ジョブを中断せず待機中の最新版だけを残す', () => {
  const workflow = read('.github', 'workflows', 'deploy.yml');
  const concurrencyBlock = workflow.match(/concurrency:\s*\n[\s\S]*?\n\njobs:/)?.[0] || '';

  assert.ok(concurrencyBlock.includes('group: deploy-playpoint-main'));
  assert.doesNotMatch(concurrencyBlock, /cancel-in-progress:/);
});

test('HTTP検査は同時接続数を制限し失敗対象だけを再試行する', () => {
  const smokeTest = read('.github', 'scripts', 'smoke-test.cjs');
  const seoCheck = read('.github', 'scripts', 'seo-health-check.cjs');

  for (const source of [smokeTest, seoCheck]) {
    assert.ok(source.includes('mapWithConcurrency'));
    assert.ok(source.includes('HTTP_CONCURRENCY = 4'));
    assert.ok(source.includes('retry('));
  }
  assert.ok(smokeTest.includes("results.filter(result => result.status === 'rejected')"));
});

test('外部Actionは固定SHAで実行しDependabotで月次更新する', () => {
  const workflowPaths = [
    ['.github', 'workflows', 'deploy.yml'],
    ['.github', 'workflows', 'quality-check.yml'],
    ['.github', 'workflows', 'seo-healthcheck.yml']
  ];

  for (const parts of workflowPaths) {
    const workflow = read(...parts);
    assert.match(workflow, /uses: actions\/checkout@[0-9a-f]{40} # v\d+\.\d+\.\d+/);
  }

  const dependabot = read('.github', 'dependabot.yml');
  assert.ok(dependabot.includes('package-ecosystem: "github-actions"'));
  assert.ok(dependabot.includes('interval: "monthly"'));
});
