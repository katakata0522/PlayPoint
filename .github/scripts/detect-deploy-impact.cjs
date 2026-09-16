'use strict';

const fs = require('node:fs');
const {
  KNOWN_NON_PUBLIC_ROOT_ENTRIES,
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES,
  classifyRootEntry,
  isPublicRepositoryPath,
  normalizeRepositoryPath,
} = require('./public-paths.cjs');

// These files live outside the public tree but can change what is generated,
// staged, transported, or published during a production deploy.
const DEPLOYMENT_INPUTS = new Set([
  '.github/workflows/deploy.yml',
  '.github/scripts/preflight.cjs',
  '.github/scripts/minify.cjs',
  '.github/scripts/deploy-rsync.sh',
  '.github/scripts/deploy-status.cjs',
  '.github/scripts/public-paths.cjs',
  '.github/scripts/prepare-public-tree.cjs',
  '.github/scripts/setup-browser-runtime.sh',
  '.github/scripts/ci-evidence.cjs',
  '.github/scripts/ci-phase-runner.cjs',
  '.github/scripts/browser-navigation-retry.cjs',
  '.github/ci-runtime/package.json',
  '.github/ci-runtime/package-lock.json',
  '.github/ci-runtime/node-version',
  'scripts/asset-sync.cjs',
  'scripts/article-asset-versioning.cjs',
  'scripts/html-replacements.cjs',
]);

function isDirectPublicMirrorPath(filePath) {
  return isPublicRepositoryPath(filePath);
}

function classifyDeployImpact(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized) return { path: normalized, deploy: false, reason: 'empty' };
  if (DEPLOYMENT_INPUTS.has(normalized)) {
    return { path: normalized, deploy: true, reason: 'deployment-input' };
  }
  if (isDirectPublicMirrorPath(normalized)) {
    return { path: normalized, deploy: true, reason: 'public-mirror' };
  }

  const topLevel = normalized.split('/', 1)[0];
  if (classifyRootEntry(topLevel) === 'unknown') {
    // Unknown repository roots are deliberately fail-closed. Trigger Deploy so
    // prepare-public-tree can reject the unreviewed root instead of silently
    // publishing or silently ignoring it.
    return { path: normalized, deploy: true, reason: 'unclassified-root' };
  }
  return { path: normalized, deploy: false, reason: 'non-public' };
}

function detectDeployImpact(changedPaths) {
  if (!Array.isArray(changedPaths)) {
    throw new TypeError('変更パスは配列で指定してください');
  }

  const classifications = changedPaths
    .map(classifyDeployImpact)
    .filter(({ path }) => Boolean(path));
  const deploymentPaths = classifications.filter(({ deploy }) => deploy);

  return {
    deployNeeded: deploymentPaths.length > 0,
    deploymentPaths,
    ignoredPaths: classifications.filter(({ deploy }) => !deploy),
  };
}

if (require.main === module) {
  try {
    const changedPaths = fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
    process.stdout.write(`${JSON.stringify(detectDeployImpact(changedPaths))}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  DEPLOYMENT_INPUTS,
  KNOWN_NON_PUBLIC_ROOT_ENTRIES,
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES,
  classifyDeployImpact,
  detectDeployImpact,
  isDirectPublicMirrorPath,
  normalizeRepositoryPath,
};
