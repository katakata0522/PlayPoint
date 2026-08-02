'use strict';

const { retry } = require('./http-check-utils.cjs');
const { validateDeployStatus } = require('./deploy-status.cjs');

const DEFAULT_STATUS_URL = 'https://playpoint-sim.com/status/deploy-status.json';

async function fetchDeployStatus({
  url = DEFAULT_STATUS_URL,
  expectedCommit,
  expectedStatus,
  timeoutMs = 10000
}) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}verify=${Date.now()}`, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${url}: unexpected content-type ${contentType}`);
  }

  const payload = await response.json();
  return validateDeployStatus(payload, { expectedCommit, expectedStatus });
}

async function verifyDeployStatusWithRetry(options) {
  return retry(() => fetchDeployStatus(options), {
    attempts: 5,
    delayMs: 1500,
    onRetry: (error, attempt, attempts) => {
      console.warn(`Retry ${attempt + 1}/${attempts} - ${error.message}`);
    }
  });
}

async function main() {
  const expectedCommit = process.env.EXPECTED_DEPLOY_REVISION;
  const expectedStatus = process.env.EXPECTED_DEPLOY_STATUS;
  if (!expectedCommit || !expectedStatus) {
    throw new Error('EXPECTED_DEPLOY_REVISION and EXPECTED_DEPLOY_STATUS are required.');
  }

  const payload = await verifyDeployStatusWithRetry({
    url: process.env.DEPLOY_STATUS_URL || DEFAULT_STATUS_URL,
    expectedCommit,
    expectedStatus
  });
  console.log(`Production deployment status verified: ${payload.status} (${payload.commit})`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_STATUS_URL,
  fetchDeployStatus,
  verifyDeployStatusWithRetry
};
