'use strict';

const fs = require('node:fs');

const NON_PUBLIC_ROOT_FILES = new Set([
  '.gitignore',
  '.gitattributes',
  'README.md',
  'AGENTS.md',
  'みんな用URL.txt',
  'CNAME',
]);

const NON_PUBLIC_TOP_LEVEL_DIRECTORIES = new Set([
  '.git',
  '.github',
  'tests',
  'docs',
  'scripts',
  'tools',
]);

// These files live outside the public mirror but can change what is actually
// generated, transported, or published during a production deploy.
const DEPLOYMENT_INPUTS = new Set([
  '.github/workflows/deploy.yml',
  '.github/scripts/preflight.cjs',
  '.github/scripts/minify.cjs',
  '.github/scripts/deploy-rsync.sh',
  '.github/scripts/deploy-status.cjs',
  'scripts/asset-sync.cjs',
  'scripts/article-asset-versioning.cjs',
  'scripts/html-replacements.cjs',
]);

function normalizeRepositoryPath(filePath) {
  if (typeof filePath !== 'string') {
    throw new TypeError('変更パスは文字列で指定してください');
  }
  return filePath
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '');
}

function isDirectPublicMirrorPath(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  if (!normalized) return false;
  if (NON_PUBLIC_ROOT_FILES.has(normalized)) return false;

  const topLevel = normalized.split('/', 1)[0];
  if (NON_PUBLIC_TOP_LEVEL_DIRECTORIES.has(topLevel)) return false;
  return true;
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
  NON_PUBLIC_ROOT_FILES,
  NON_PUBLIC_TOP_LEVEL_DIRECTORIES,
  classifyDeployImpact,
  detectDeployImpact,
  isDirectPublicMirrorPath,
  normalizeRepositoryPath,
};
