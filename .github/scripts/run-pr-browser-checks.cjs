'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const evidenceDirectory = path.resolve(__dirname, '../../browser-smoke-artifacts');

// 並列実行しやすいよう重み別に3レーンへ分割し、単一スクリプト内の上限も調整する。
const FULL_PR_LANES = Object.freeze([
  Object.freeze([
    { script: 'browser-smoke.cjs', args: ['--keep-artifacts'], env: { PLAYPOINT_BROWSER_CONCURRENCY: '2' } },
  ]),
  Object.freeze([
    { script: 'article-design-smoke.cjs', args: [], env: { PLAYPOINT_BROWSER_CONCURRENCY: '2' } },
    { script: 'article-css-smoke.cjs', args: [], env: {} },
    { script: 'embed-widget-smoke.cjs', args: [], env: {} },
  ]),
  Object.freeze([
    { script: 'browser-revenue-smoke.cjs', args: [], env: { PLAYPOINT_BROWSER_CONCURRENCY: '2' } },
    { script: 'mobile-region-layout-smoke.cjs', args: [], env: {} },
    { script: 'mobile-first-view-smoke.cjs', args: [], env: {} },
    { script: 'site-shell-vnext-smoke.cjs', args: [], env: {} },
  ]),
]);

const ARTICLE_PR_LANES = Object.freeze([
  Object.freeze([
    { script: 'article-design-smoke.cjs', args: [], env: { PLAYPOINT_BROWSER_CONCURRENCY: '2' } },
    { script: 'article-css-smoke.cjs', args: [], env: {} },
  ]),
  Object.freeze([
    { script: 'browser-revenue-smoke.cjs', args: [], env: { PLAYPOINT_BROWSER_CONCURRENCY: '2' } },
  ]),
]);

const PR_BROWSER_CHECKS = Object.freeze(
  FULL_PR_LANES.flat().map(item => item.script)
);

const ARTICLE_BROWSER_CHECKS = Object.freeze(
  ARTICLE_PR_LANES.flat().map(item => item.script)
);

function parseScope(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--scope');
  if (index === -1) return 'full';
  const value = String(argv[index + 1] || '').trim();
  if (['full', 'articles', 'pages'].includes(value)) return value;
  throw new Error(`Unknown browser check scope: ${value || '(empty)'}`);
}

function resolveLanes(scope = 'full') {
  if (scope === 'pages') return [[{ script: 'changed-page-smoke.cjs', args: [], env: {} }]];
  if (scope === 'articles') return ARTICLE_PR_LANES;
  if (scope === 'full') return FULL_PR_LANES;
  throw new Error(`Unsupported browser check scope: ${scope}`);
}

function resolveChecks(scope = 'full') {
  return resolveLanes(scope).flat().map(item => item.script);
}

function runScript(script, args = [], extraEnv = {}) {
  const started = Date.now();
  console.log(`[pr-browser] start ${script}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script), ...args], {
      stdio: 'inherit',
      env: { ...extraEnv, ...process.env },
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[pr-browser] ${script} ${seconds}s (${signal || code})`);
      if (code === 0) resolve();
      else reject(new Error(`${script} failed (${signal || code})`));
    });
  });
}

async function runPrChecks({ scope = 'full', directory = evidenceDirectory, run = runScript } = {}) {
  const lanes = [...resolveLanes(scope)];
  if (scope === 'articles' && JSON.parse(process.env.PLAYPOINT_CHANGED_PAGES || '[]').length) {
    lanes.push(...resolveLanes('pages'));
  }
  // 並列実行前に一度だけ前回の証跡ディレクトリを初期化する。
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  console.log(`[pr-browser] scope=${scope}, lanes=${lanes.length}`);

  const results = await Promise.allSettled(
    lanes.map(async lane => {
      for (const task of lane) {
        await run(task.script, task.args, task.env);
      }
    })
  );
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, `PR browser checks (${scope}) failed`);
}

if (require.main === module) {
  Promise.resolve()
    .then(() => runPrChecks({ scope: parseScope() }))
    .catch(error => {
      console.error(error);
      process.exitCode = error.message?.startsWith('Unknown browser check scope') ? 2 : 1;
    });
}

module.exports = {
  ARTICLE_BROWSER_CHECKS,
  ARTICLE_PR_LANES,
  FULL_PR_LANES,
  PR_BROWSER_CHECKS,
  parseScope,
  resolveChecks,
  resolveLanes,
  runPrChecks,
};
