'use strict';

const { retry } = require('./http-check-utils.cjs');
const { validateDeployStatus } = require('./deploy-status.cjs');

const DEFAULT_STATUS_URL = 'https://playpoint-sim.com/status/deploy-status.json';
const DEFAULT_REVISION_URL = 'https://playpoint-sim.com/status/deploy-revision.txt';
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function normalizeRevision(value) {
  const revision = String(value || '').trim().toLowerCase();
  if (!SHA_PATTERN.test(revision)) {
    throw new Error('Production revision must be a lowercase 40-character Git SHA.');
  }
  return revision;
}

function validateLiveVerifiedRevision(statusPayload, revisionText) {
  const revision = normalizeRevision(revisionText);
  const validated = validateDeployStatus(statusPayload, {
    expectedCommit: revision,
    expectedStatus: 'verified'
  });
  return validated.commit;
}

async function fetchLiveVerifiedRevisionOnce({
  fetchImpl = globalThis.fetch,
  statusUrl = DEFAULT_STATUS_URL,
  revisionUrl = DEFAULT_REVISION_URL,
  timeoutMs = 10000,
  cacheBust = `deploy-impact-${Date.now()}`
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  const requestOptions = {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(timeoutMs)
  };
  const separator = url => url.includes('?') ? '&' : '?';

  const [statusResponse, revisionResponse] = await Promise.all([
    fetchImpl(`${statusUrl}${separator(statusUrl)}check=${encodeURIComponent(cacheBust)}`, requestOptions),
    fetchImpl(`${revisionUrl}${separator(revisionUrl)}check=${encodeURIComponent(cacheBust)}`, requestOptions)
  ]);

  if (!statusResponse.ok || !revisionResponse.ok) {
    throw new Error(`Production deployment metadata HTTP ${statusResponse.status}/${revisionResponse.status}`);
  }

  const [statusPayload, revisionText] = await Promise.all([
    statusResponse.json(),
    revisionResponse.text()
  ]);
  return validateLiveVerifiedRevision(statusPayload, revisionText);
}

async function resolveLiveVerifiedRevision(options = {}) {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 1000;
  return retry(
    () => fetchLiveVerifiedRevisionOnce(options),
    {
      attempts,
      delayMs,
      onRetry: (error, attempt, total) => {
        console.error(`Verified production revision check failed (${attempt}/${total}): ${error.message}`);
      }
    }
  );
}

async function main() {
  const revision = await resolveLiveVerifiedRevision();
  process.stdout.write(`${revision}\n`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_REVISION_URL,
  DEFAULT_STATUS_URL,
  fetchLiveVerifiedRevisionOnce,
  normalizeRevision,
  resolveLiveVerifiedRevision,
  validateLiveVerifiedRevision
};
