'use strict';

const fs = require('node:fs');
const { detectDeployImpact, normalizeRepositoryPath } = require('./detect-deploy-impact.cjs');

const BROWSER_GATE_INPUTS = Object.freeze([
  '.github/workflows/quality-check.yml',
  '.github/scripts/setup-browser-runtime.sh',
  '.github/scripts/browser-smoke.cjs',
  '.github/scripts/article-css-smoke.cjs',
  '.github/scripts/article-design-smoke.cjs',
  '.github/scripts/mobile-region-layout-smoke.cjs',
  '.github/scripts/mobile-first-view-smoke.cjs',
  '.github/scripts/site-shell-vnext-smoke.cjs',
  '.github/scripts/browser-revenue-smoke.cjs',
  '.github/scripts/embed-widget-smoke.cjs',
  '.github/scripts/browser-navigation-retry.cjs',
  '.github/scripts/bind-browser-evidence.cjs',
  '.github/scripts/refactor-runtime-compatibility.cjs',
  '.github/scripts/refactor-visual-smoke.cjs',
]);

const APACHE_GATE_INPUTS = Object.freeze([
  '.htaccess',
  'tests/helpers/apache-cache-contract.cjs',
  '.github/scripts/http-cache-contract.cjs',
  'tests/http-cache-contract.test.cjs',
]);

function classifyPrGateImpact(changedPaths) {
  if (!Array.isArray(changedPaths)) throw new TypeError('変更パスは配列で指定してください');
  const normalized = changedPaths.map(normalizeRepositoryPath).filter(Boolean);
  const deployImpact = detectDeployImpact(normalized);
  const browserPaths = normalized.filter(file =>
    deployImpact.deploymentPaths.some(item => item.path === file)
    || BROWSER_GATE_INPUTS.includes(file)
    || file.startsWith('.github/ci-runtime/')
  );
  const apachePaths = normalized.filter(file => APACHE_GATE_INPUTS.includes(file));

  return {
    browserRequired: browserPaths.length > 0,
    apacheRequired: apachePaths.length > 0,
    browserPaths: [...new Set(browserPaths)],
    apachePaths: [...new Set(apachePaths)],
  };
}

if (require.main === module) {
  try {
    const changedPaths = fs.readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean);
    process.stdout.write(JSON.stringify(classifyPrGateImpact(changedPaths)) + '\n');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  APACHE_GATE_INPUTS,
  BROWSER_GATE_INPUTS,
  classifyPrGateImpact,
};
