'use strict';

const fs = require('node:fs');
const { validateDeployStatus } = require('./deploy-status.cjs');

const MIRROR_STEP_NAME = 'Deploy strict public mirror via rsync';
const STATUS_URL = 'https://playpoint-sim.com/status/deploy-status.json';
const REVISION_URL = 'https://playpoint-sim.com/status/deploy-revision.txt';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function requireSha(value, name) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!SHA_PATTERN.test(normalized)) throw new Error(`${name} must be a lowercase 40-character SHA.`);
  return normalized;
}

function wasProductionMirrorAttempted(payload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  for (const job of jobs) {
    if (job?.name !== 'deploy' || !Array.isArray(job.steps)) continue;
    const step = job.steps.find(candidate => candidate?.name === MIRROR_STEP_NAME);
    if (!step) continue;
    return step.status === 'completed' && Boolean(step.conclusion) && step.conclusion !== 'skipped';
  }
  return false;
}

function decideRecovery({ sourceConclusion, sourceHeadSha, mirrorAttempted, live }) {
  const head = requireSha(sourceHeadSha, 'sourceHeadSha');
  if (sourceConclusion === 'success') return { needed: false, reason: 'source_success' };
  if (!mirrorAttempted) return { needed: false, reason: 'mirror_not_attempted' };
  if (live?.kind === 'verified') return { needed: false, reason: 'live_verified' };
  if (live?.kind === 'deploying' && live.commit !== head) {
    return { needed: false, reason: 'different_deploy_in_progress' };
  }
  return { needed: true, reason: `recover_${live?.kind || 'unknown'}` };
}

async function fetchLiveOnce() {
  const suffix = `watch=${Date.now()}`;
  const options = {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
    signal: AbortSignal.timeout(10000)
  };
  const [statusResponse, revisionResponse] = await Promise.all([
    fetch(`${STATUS_URL}?${suffix}`, options),
    fetch(`${REVISION_URL}?${suffix}`, options)
  ]);
  if (!statusResponse.ok || !revisionResponse.ok) {
    throw new Error(`live status HTTP ${statusResponse.status}/${revisionResponse.status}`);
  }
  const payload = await statusResponse.json();
  const revision = (await revisionResponse.text()).trim().toLowerCase();
  if (!SHA_PATTERN.test(revision)) return { kind: 'unverified', commit: null };

  for (const status of ['verified', 'deploying']) {
    try {
      const validated = validateDeployStatus(payload, { expectedStatus: status });
      if (validated.commit !== revision) return { kind: 'unverified', commit: validated.commit };
      return { kind: status, commit: validated.commit };
    } catch {
      // Try the other valid status; malformed/rolling_back payloads become unverified below.
    }
  }
  return { kind: 'unverified', commit: SHA_PATTERN.test(String(payload?.commit || '').toLowerCase()) ? String(payload.commit).toLowerCase() : null };
}

async function inspectLiveDeployment(attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchLiveOnce();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1500);
    }
  }
  console.warn(`Live deployment metadata remained unreachable: ${lastError?.message || 'unknown error'}`);
  return { kind: 'unreachable', commit: null };
}

async function fetchSourceJobs({ repository, runId, token }) {
  if (!/^\d+$/.test(String(runId || ''))) throw new Error('SOURCE_RUN_ID must be numeric.');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('GITHUB_REPOSITORY is invalid.');
  if (!token) throw new Error('GITHUB_TOKEN is required to inspect the source run.');
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?filter=latest&per_page=100`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2026-03-10'
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Unable to inspect source workflow jobs: HTTP ${response.status}`);
  return response.json();
}

function writeOutputs(file, outputs) {
  if (!file) throw new Error('GITHUB_OUTPUT is required.');
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${String(value)}\n`).join('');
  fs.appendFileSync(file, lines, 'utf8');
}

async function main(env = process.env) {
  const sourceHeadSha = requireSha(env.SOURCE_HEAD_SHA, 'SOURCE_HEAD_SHA');
  const sourceConclusion = String(env.SOURCE_CONCLUSION || '').trim();
  const jobs = await fetchSourceJobs({
    repository: env.GITHUB_REPOSITORY,
    runId: env.SOURCE_RUN_ID,
    token: env.GITHUB_TOKEN
  });
  const mirrorAttempted = wasProductionMirrorAttempted(jobs);
  const live = await inspectLiveDeployment();
  const decision = decideRecovery({ sourceConclusion, sourceHeadSha, mirrorAttempted, live });

  console.log(`Recovery watchdog: mirrorAttempted=${mirrorAttempted}, live=${live.kind}, decision=${decision.reason}`);
  writeOutputs(env.GITHUB_OUTPUT, {
    recovery_needed: decision.needed ? 'true' : 'false',
    reason: decision.reason,
    source_head_sha: sourceHeadSha,
    live_kind: live.kind
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  MIRROR_STEP_NAME,
  decideRecovery,
  inspectLiveDeployment,
  wasProductionMirrorAttempted
};
