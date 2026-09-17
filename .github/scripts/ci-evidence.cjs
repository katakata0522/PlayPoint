'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');

function evidenceDir(env = process.env) {
  return env.CI_EVIDENCE_DIR || path.join(env.RUNNER_TEMP || os.tmpdir(), 'playpoint-ci-evidence', env.GITHUB_JOB || 'local');
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}
function command(name, args, cwd = ROOT) {
  const result = spawnSync(name, args, { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
  return result.status === 0 ? result.stdout.trim() : null;
}
function sha256(file) {
  return fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
}
function cleanError(error) {
  // URLのquery・認証情報や複数行のtraceを証跡へ持ち込まない。
  return String(error?.message || error).split('\n', 1)[0].replace(/https?:\/\/[^\s)]+/g, value => {
    try { const url = new URL(value); return url.origin + url.pathname; } catch { return '[URL]'; }
  }).slice(0, 1000);
}
function fingerprint(env = process.env) {
  const runtime = path.join(ROOT, '.github/ci-runtime');
  const versions = {};
  for (const name of ['playwright-core', 'lighthouse']) {
    try { versions[name] = JSON.parse(fs.readFileSync(path.join(runtime, ...(name === 'lighthouse' ? ['lighthouse'] : []), 'node_modules', name, 'package.json'), 'utf8')).version; }
    catch { versions[name] = null; }
  }
  let event = {};
  try { if (env.GITHUB_EVENT_PATH) event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8')); } catch {}
  const validSha = value => /^[a-f0-9]{40}$/i.test(value || '') ? value : null;
  const fontFiles = command('fc-match', ['-f', '%{file}\n', 'sans-serif:lang=ja']);
  const environment = {
    os: { platform: process.platform, arch: process.arch, release: os.release(), imageOS: env.ImageOS || null, imageVersion: env.ImageVersion || null,
      distribution: fs.existsSync('/etc/os-release') ? fs.readFileSync('/etc/os-release', 'utf8') : null },
    node: process.version, npm: command(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--version']),
    python: command('python3', ['--version']), git: command('git', ['--version']),
    chrome: env.CHROME_PATH ? command(env.CHROME_PATH, ['--version']) : null,
    dependencies: versions, lockSha256: sha256(path.join(runtime, 'package-lock.json')),
    performanceLockSha256: sha256(path.join(runtime, 'lighthouse/package-lock.json')),
    fonts: { packageVersion: command('dpkg-query', ['-W', '-f=${Version}', 'fonts-noto-cjk']),
      selected: command('fc-match', ['sans-serif:lang=ja']),
      fileHashes: (fontFiles || '').split('\n').filter(Boolean).map(file => ({ name: path.basename(file), sha256: sha256(file) })) },
    cpu: { model: os.cpus()[0]?.model || null, count: os.cpus().length }, memoryBytes: os.totalmem()
  };
  return { schemaVersion: 1, checkedAt: new Date().toISOString(),
    source: { eventSha: validSha(env.GITHUB_SHA), checkoutSha: command('git', ['rev-parse', 'HEAD']), treeSha: command('git', ['rev-parse', 'HEAD^{tree}']),
      prHeadSha: validSha(event.pull_request?.head?.sha), prBaseSha: validSha(event.pull_request?.base?.sha),
      trackedChanges: (command('git', ['diff', '--name-only', 'HEAD']) || '').split('\n').filter(Boolean) },
    run: { id: env.GITHUB_RUN_ID || null, attempt: env.GITHUB_RUN_ATTEMPT || null, job: env.GITHUB_JOB || null,
      workflow: env.GITHUB_WORKFLOW || null, event: env.GITHUB_EVENT_NAME || 'local' },
    environment, fingerprint: crypto.createHash('sha256').update(JSON.stringify(environment)).digest('hex') };
}
function classifyPhase(result, deterministic = false) {
  if (result.error) return ['ENOENT', 'EACCES', 'ENOMEM', 'ENOSPC', 'ETIMEDOUT'].includes(result.error.code) ? 'ENVIRONMENT_FAIL' : 'CHECK_FAIL';
  if (result.signal === 'SIGINT' || result.signal === 'SIGTERM') return 'CANCELLED';
  if (result.signal) return 'ENVIRONMENT_FAIL';
  if (result.status === 0) return 'PASS';
  return deterministic ? 'DETERMINISTIC_FAIL' : 'CHECK_FAIL';
}
// 保管先へのアップロード失敗と検証失敗を区別する。workflowの成否・rollback条件は変更しない。
const OBSERVABILITY_STEPS = new Set([
  'upload_production_browser_evidence', 'upload_external_recovery_browser_evidence',
  'upload_auto_rollback_browser_evidence', 'upload_rollback_browser_evidence',
  'upload_browser_verification_evidence', 'preserve_required_gate_verification_evidence',
  'preserve_ci_environment_and_phase_evidence'
]);
function classifyJob(status, steps, superseded = false) {
  if (status === 'cancelled') return superseded ? 'CANCELLED_BY_NEW_COMMIT' : 'CANCELLED';
  const failed = Object.entries(steps).filter(([, step]) => step.outcome === 'failure');
  if (failed.some(([id]) => ['ci_node', 'ci_browser'].includes(id))) return 'ENVIRONMENT_FAIL';
  if (failed.length && failed.every(([id]) => OBSERVABILITY_STEPS.has(id))) return 'OBSERVABILITY_FAIL';
  if (failed.length || status === 'failure') return 'CHECK_FAIL';
  return status === 'success' ? 'PASS' : 'NOT_RUN';
}
function finalize(env = process.env) {
  let raw = {};
  try { raw = JSON.parse(env.CI_STEPS_JSON || '{}'); } catch { raw = { invalidSteps: { outcome: 'failure', conclusion: 'failure' } }; }
  // steps.outputsや環境変数全体は保存しない（deployにも共通利用する）。
  const steps = Object.fromEntries(Object.entries(raw).map(([id, step]) => [id, { outcome: step.outcome || null, conclusion: step.conclusion || null }]));
  let recoveredNavigation = false;
  try {
    const browser = JSON.parse(fs.readFileSync(path.join(ROOT, 'browser-smoke-artifacts/report.json'), 'utf8'));
    recoveredNavigation = browser.passed === true && browser.classification === 'FLAKY_RECOVERED';
  } catch {}
  const outcome = classifyJob(env.CI_JOB_STATUS, steps);
  const result = { schemaVersion: 1, ...fingerprint(env), classification: outcome === 'PASS' && recoveredNavigation ? 'FLAKY_RECOVERED' : outcome, steps,
    note: 'CHECK_FAILは原因未確定。cancelledだけでは新commitによる中断と断定しない。再試行は個別のattempt証跡を参照。' };
  const file = path.join(evidenceDir(env), 'job-result.json');
  writeJson(file, result);
  if (env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `\n### CI evidence: ${result.classification}\n\nCheckout: \`${result.source.checkoutSha}\` · run ${result.run.id} / attempt ${result.run.attempt}\n\n| Step | Outcome |\n|---|---|\n` +
      Object.entries(steps).map(([id, step]) => `| ${id} | ${step.outcome} |`).join('\n') + '\n');
  }
  return result;
}
if (require.main === module) {
  if (process.argv[2] === 'finalize') finalize();
  else writeJson(path.join(evidenceDir(), `environment-${process.argv[2] === 'browser' ? 'browser' : 'start'}.json`), fingerprint());
}
module.exports = { evidenceDir, writeJson, cleanError, fingerprint, classifyPhase, classifyJob, finalize };
