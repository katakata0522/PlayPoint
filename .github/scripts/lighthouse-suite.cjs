'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { getProfile, readReport, needsAdditionalSamples } = require('./mobile-performance-budget.cjs');
const { writeJson, cleanError, fingerprint } = require('./ci-evidence.cjs');
const PAGES = Object.freeze([
  ['calculator-home', '/'],
  ['article-hub', '/blog/'],
  ['representative-article', '/articles/2026-03-10-play-points-reflection-timing.html'],
  ['international-article-en', '/en/articles/google-play-points-join-eligibility.html'],
  ['international-article-ko', '/ko/articles/google-play-points-join-eligibility.html'],
  ['international-article-tw', '/tw/articles/google-play-points-join-eligibility.html']
]);
const BLOCKED = Object.freeze([
  'https://www.googletagmanager.com/*', 'https://www.google-analytics.com/*', 'https://analytics.google.com/*',
  'https://stats.g.doubleclick.net/*', 'https://pagead2.googlesyndication.com/*', 'https://googleads.g.doubleclick.net/*'
]);
function main({ outputDir = 'performance-artifacts', env = process.env, execute = spawnSync } = {}) {
  const root = path.resolve(__dirname, '../..');
  const target = env.AUDIT_TARGET;
  if (!['local', 'production'].includes(target)) throw new Error('AUDIT_TARGET must be local or production');
  const base = target === 'local' ? 'https://127.0.0.1:4173' : 'https://playpoint-sim.com';
  if (env.AUDIT_BASE_URL && env.AUDIT_BASE_URL !== base) throw new Error('Unexpected audit origin');
  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = { schemaVersion: 1, target, base, environment: fingerprint(env),
    policy: 'home/hub=3; other pages=1, timing-only breach adds 2; all samples retained; bytes use maximum',
    thirdPartyBlocked: target === 'local', reports: [], attempts: [], passed: false };
  const save = () => writeJson(path.join(outputDir, 'audit-manifest.json'), manifest);
  function audit(name, route, number, isHome) {
    const file = path.join(outputDir, `${name}${isHome || number > 1 ? '-' + number : ''}.json`);
    manifest.reports.push(file);
    // 途中失敗しても、予定したsampleが欠損した事実を残す。
    fs.rmSync(file, { force: true });
    save();
    const args = [path.join(root, '.github/ci-runtime/lighthouse/node_modules/lighthouse/cli/index.js'), base + route,
      '--only-categories=performance', '--form-factor=mobile', '--throttling.cpuSlowdownMultiplier=6',
      '--output=json', '--output-path=' + file,
      '--chrome-flags=--headless --no-sandbox --disable-gpu' + (target === 'local' ? ' --ignore-certificate-errors' : ''),
      '--max-wait-for-load=45000',
      ...(target === 'local' ? BLOCKED.map(pattern => '--blocked-url-patterns=' + pattern) : []), '--quiet'];
    const started = Date.now();
    const result = execute(process.execPath, args, { cwd: root, env, stdio: 'inherit', timeout: 120000 });
    const attempt = { name, number, file, durationMs: Date.now() - started, exitCode: result.status ?? null, signal: result.signal || null };
    if (result.error) attempt.error = cleanError(result.error);
    manifest.attempts.push(attempt); save();
    if (result.error || result.status !== 0) return null;
    try { return readReport(file); } catch (error) { attempt.error = cleanError(error); save(); return null; }
  }
  for (const [name, route] of PAGES) {
    const home = name === 'calculator-home' || name === 'article-hub';
    const first = audit(name, route, 1, home);
    let additional = home;
    if (!home && first) {
      try { additional = needsAdditionalSamples(first, getProfile(name)); }
      catch (error) { manifest.attempts.at(-1).error = cleanError(error); }
    }
    if (additional) { audit(name, route, 2, home); audit(name, route, 3, home); }
  }
  manifest.passed = manifest.attempts.every(attempt => attempt.exitCode === 0 && !attempt.error);
  save();
  return manifest.passed ? 0 : 1;
}
if (require.main === module) {
  try { process.exitCode = main(); } catch (error) { console.error(error); process.exitCode = 1; }
}
module.exports = { PAGES, BLOCKED, main };
