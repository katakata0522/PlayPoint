'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const evidenceDirectory = path.resolve(__dirname, '../../browser-smoke-artifacts');
const appearanceAndRevenue = [
  'article-css-smoke.cjs',
  'article-design-smoke.cjs',
  'mobile-region-layout-smoke.cjs',
  'browser-revenue-smoke.cjs',
  'embed-widget-smoke.cjs',
];

function runScript(script, args = []) {
  const started = Date.now();
  console.log(`[browser] start ${script}`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[browser] ${script} ${seconds}s (${signal || code})`);
      if (code === 0) resolve();
      else reject(new Error(`${script} failed (${signal || code})`));
    });
  });
}

async function runReleaseChecks(directory = evidenceDirectory, run = runScript) {
  // 各検査は固有のファイル名で出力する。並行起動の前に一度だけ前回の証跡を消す。
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  async function runAppearanceAndRevenue() {
    for (const script of appearanceAndRevenue) await run(script);
  }
  const results = await Promise.allSettled([
    run('browser-smoke.cjs', ['--release']),
    runAppearanceAndRevenue(),
  ]);
  // 失敗時も相手のChromiumが終了してから証跡の保管・復旧へ進む。
  const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
  if (errors.length) throw new AggregateError(errors, 'Production browser checks failed');
}

if (require.main === module) {
  runReleaseChecks().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { runReleaseChecks };
