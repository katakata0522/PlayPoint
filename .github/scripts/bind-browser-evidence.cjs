'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRevisionSession, EXACT_SHA } = require('./browser-revision-evidence.cjs');
const { writeJson, evidenceDir, cleanError } = require('./ci-evidence.cjs');
const MANIFEST = 'deployment-evidence.json';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function revisionAt(directory) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8', timeout: 10000 });
  if (result.status !== 0 || !EXACT_SHA.test(result.stdout.trim())) throw new Error('Cannot resolve verifier checkout revision');
  return result.stdout.trim();
}
function checkReport(report, { expected, checkoutRevision, baseUrl }) {
  if (!EXACT_SHA.test(expected || '') || checkoutRevision !== expected) throw new Error('Browser checkout and expected production SHA must match exactly');
  if (report.mode !== 'production' || report.passed !== true) throw new Error('Browser report is not a successful production verification');
  if (new URL(report.baseUrl).href !== new URL(baseUrl).href) throw new Error('Browser evidence target URL mismatch');
  // 既存snapshotのchecked/expected/actual形式も検証する。古い証跡を成功へ書き換えない。
  const revision = report.revision;
  if (revision?.checked !== true || revision.expected !== expected || revision.actual !== expected || revision.match === false) {
    throw new Error('Browser report does not prove the expected production revision');
  }
}
function listEvidence(directory, prefix = '') {
  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
    const relative = path.posix.join(prefix, entry.name);
    if (relative === MANIFEST) return [];
    if (entry.isSymbolicLink()) throw new Error('Evidence must not contain symbolic links');
    if (entry.isDirectory()) return listEvidence(directory, relative);
    if (!entry.isFile()) throw new Error('Evidence must contain regular files only');
    return [{ path: relative, sha256: sha256(path.join(directory, relative)) }];
  });
}
function verifyManifest(directory, manifest, expected) {
  if (manifest.passed !== true || manifest.expectedRevision !== expected || !EXACT_SHA.test(expected || '')) throw new Error('Manifest revision or status mismatch');
  if (manifest.checkoutRevision !== expected || manifest.observedRevision !== expected) throw new Error('Manifest source/production mismatch');
  if (manifest.revision?.checked !== true || manifest.revision.match !== true || manifest.revision.expected !== expected || manifest.revision.actual !== expected) throw new Error('Manifest live revision evidence mismatch');
  const files = listEvidence(directory);
  if (!files.some(item => item.path === 'report.json') || JSON.stringify(files) !== JSON.stringify(manifest.files)) throw new Error('Browser evidence files have changed or are missing');
  checkReport(JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8')), { expected, checkoutRevision: manifest.checkoutRevision, baseUrl: manifest.baseUrl });
  return true;
}
async function bindEvidence({ directory, expected, checkoutRevision, verifierRevision, baseUrl, run = {}, readiness = {} }) {
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
  checkReport(report, { expected, checkoutRevision, baseUrl });
  const session = createRevisionSession({ expectedRevision: expected, required: true });
  await session.check(baseUrl, 'after-complete-browser-suite', readiness);
  const manifest = { schemaVersion: 1, checkedAt: new Date().toISOString(), passed: true,
    expectedRevision: expected, observedRevision: session.evidence.actual, checkoutRevision,
    verifierRevision, baseUrl, run, revision: session.evidence, files: listEvidence(directory) };
  verifyManifest(directory, manifest, expected);
  return manifest;
}
async function main() {
  const directory = path.join(process.cwd(), 'browser-smoke-artifacts');
  const expected = (process.env.SMOKE_EXPECT_REVISION || '').trim();
  const copy = manifest => {
    writeJson(path.join(directory, MANIFEST), manifest);
    writeJson(path.join(evidenceDir(), 'browser-deployment-evidence.json'), manifest);
  };
  if (process.argv[2] === 'verify') {
    verifyManifest(directory, JSON.parse(fs.readFileSync(path.join(directory, MANIFEST), 'utf8')), expected);
    console.log('Browser evidence SHA and file digests match.');
    return;
  }
  try {
    const manifest = await bindEvidence({ directory, expected, checkoutRevision: revisionAt(process.cwd()),
      verifierRevision: revisionAt(path.resolve(__dirname, '../..')), baseUrl: process.env.SMOKE_BASE_URL,
      run: { id: process.env.GITHUB_RUN_ID || null, attempt: process.env.GITHUB_RUN_ATTEMPT || null,
        job: process.env.GITHUB_JOB || null, eventSha: process.env.GITHUB_SHA || null } });
    copy(manifest);
    console.log(`Browser and deploy evidence bound to ${expected} (${manifest.files.length} files).`);
  } catch (error) {
    copy({ schemaVersion: 1, checkedAt: new Date().toISOString(), passed: false, expectedRevision: expected || null, observedRevision: error.revision?.actual || null, checked: error.revision?.checked || false, match: false, error: cleanError(error) });
    throw error;
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { bindEvidence, verifyManifest, checkReport, listEvidence };
