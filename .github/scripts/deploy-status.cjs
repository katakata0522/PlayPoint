'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VALID_STATUSES = new Set(['deploying', 'verified']);
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;

function requireValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function requireIsoTimestamp(value, name) {
  const normalized = requireValue(value, name);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${name} must be an ISO-8601 timestamp.`);
  }
  return normalized;
}

function requireCommit(value) {
  const commit = requireValue(value, 'commit');
  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error('commit must be a 40-character Git SHA.');
  }
  return commit.toLowerCase();
}

function buildDeployStatus({
  status,
  commit,
  branch,
  deployedAt,
  verifiedAt = null,
  repository,
  runId,
  runNumber
}) {
  const normalizedStatus = requireValue(status, 'status');
  if (!VALID_STATUSES.has(normalizedStatus)) {
    throw new Error(`Unsupported deploy status: ${normalizedStatus}`);
  }

  const normalizedVerifiedAt = normalizedStatus === 'verified'
    ? requireIsoTimestamp(verifiedAt, 'verifiedAt')
    : null;

  const checks = normalizedStatus === 'verified'
    ? { preflight: 'passed', smokeTest: 'passed', seoHealth: 'passed' }
    : { preflight: 'passed', smokeTest: 'pending', seoHealth: 'pending' };

  return {
    schemaVersion: 1,
    status: normalizedStatus,
    environment: 'production',
    commit: requireCommit(commit),
    branch: requireValue(branch, 'branch'),
    deployedAt: requireIsoTimestamp(deployedAt, 'deployedAt'),
    verifiedAt: normalizedVerifiedAt,
    checks,
    workflow: {
      repository: requireValue(repository, 'repository'),
      runId: requireValue(String(runId), 'runId'),
      runNumber: requireValue(String(runNumber), 'runNumber')
    }
  };
}

function validateDeployStatus(payload, { expectedCommit, expectedStatus }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Deployment status payload must be an object.');
  }
  if (payload.schemaVersion !== 1) {
    throw new Error(`Unsupported schemaVersion: ${payload.schemaVersion}`);
  }

  const commit = requireCommit(payload.commit);
  const status = requireValue(payload.status, 'status');
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Unsupported deploy status: ${status}`);
  }
  if (expectedCommit && commit !== requireCommit(expectedCommit)) {
    throw new Error(`Deployment commit mismatch: expected ${expectedCommit}, got ${commit}`);
  }
  if (expectedStatus && status !== expectedStatus) {
    throw new Error(`Deployment status mismatch: expected ${expectedStatus}, got ${status}`);
  }

  requireIsoTimestamp(payload.deployedAt, 'deployedAt');
  if (status === 'verified') {
    requireIsoTimestamp(payload.verifiedAt, 'verifiedAt');
    for (const key of ['preflight', 'smokeTest', 'seoHealth']) {
      if (payload.checks?.[key] !== 'passed') {
        throw new Error(`Verified deployment has incomplete check: ${key}`);
      }
    }
  }

  return payload;
}

function writeDeployStatusFromEnvironment(env = process.env, root = path.resolve(__dirname, '../..')) {
  const payload = buildDeployStatus({
    status: env.DEPLOY_PUBLIC_STATUS,
    commit: env.GITHUB_SHA,
    branch: env.GITHUB_REF_NAME,
    deployedAt: env.DEPLOY_STARTED_AT,
    verifiedAt: env.DEPLOY_VERIFIED_AT || null,
    repository: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID,
    runNumber: env.GITHUB_RUN_NUMBER
  });

  const statusDirectory = path.join(root, 'status');
  fs.mkdirSync(statusDirectory, { recursive: true });
  fs.writeFileSync(path.join(statusDirectory, 'deploy-revision.txt'), `${payload.commit}\n`, 'utf8');
  fs.writeFileSync(path.join(statusDirectory, 'deploy-status.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

if (require.main === module) {
  const payload = writeDeployStatusFromEnvironment();
  console.log(`Wrote production deployment status: ${payload.status} (${payload.commit})`);
}

module.exports = {
  buildDeployStatus,
  validateDeployStatus,
  writeDeployStatusFromEnvironment
};
