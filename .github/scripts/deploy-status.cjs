'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VALID_STATUSES = new Set(['deploying', 'verified']);
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;
const INTEGER_PATTERN = /^\d+$/;

function requireValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function requireIdentifier(value, name) {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required.`);
  }
  const normalized = String(value).trim();
  if (!INTEGER_PATTERN.test(normalized)) {
    throw new Error(`${name} must be a positive integer identifier.`);
  }
  return normalized;
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

function expectedChecksForStatus(status) {
  return status === 'verified'
    ? { preflight: 'passed', smokeTest: 'passed', seoHealth: 'passed' }
    : { preflight: 'passed', smokeTest: 'pending', seoHealth: 'pending' };
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

  const normalizedDeployedAt = requireIsoTimestamp(deployedAt, 'deployedAt');
  const normalizedVerifiedAt = normalizedStatus === 'verified'
    ? requireIsoTimestamp(verifiedAt, 'verifiedAt')
    : null;
  if (normalizedVerifiedAt && Date.parse(normalizedVerifiedAt) < Date.parse(normalizedDeployedAt)) {
    throw new Error('verifiedAt must not be earlier than deployedAt.');
  }

  return {
    schemaVersion: 1,
    status: normalizedStatus,
    environment: 'production',
    commit: requireCommit(commit),
    branch: requireValue(branch, 'branch'),
    deployedAt: normalizedDeployedAt,
    verifiedAt: normalizedVerifiedAt,
    checks: expectedChecksForStatus(normalizedStatus),
    workflow: {
      repository: requireValue(repository, 'repository'),
      runId: requireIdentifier(runId, 'runId'),
      runNumber: requireIdentifier(runNumber, 'runNumber')
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
  if (payload.environment !== 'production') {
    throw new Error(`Unexpected deployment environment: ${payload.environment}`);
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

  requireValue(payload.branch, 'branch');
  const deployedAt = requireIsoTimestamp(payload.deployedAt, 'deployedAt');
  requireValue(payload.workflow?.repository, 'workflow.repository');
  requireIdentifier(payload.workflow?.runId, 'workflow.runId');
  requireIdentifier(payload.workflow?.runNumber, 'workflow.runNumber');

  const expectedChecks = expectedChecksForStatus(status);
  for (const [key, expectedValue] of Object.entries(expectedChecks)) {
    if (payload.checks?.[key] !== expectedValue) {
      throw new Error(`${status} deployment has unexpected check state: ${key}`);
    }
  }

  if (status === 'verified') {
    const verifiedAt = requireIsoTimestamp(payload.verifiedAt, 'verifiedAt');
    if (Date.parse(verifiedAt) < Date.parse(deployedAt)) {
      throw new Error('verifiedAt must not be earlier than deployedAt.');
    }
  } else if (payload.verifiedAt !== null) {
    throw new Error('deploying status must not include verifiedAt.');
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
