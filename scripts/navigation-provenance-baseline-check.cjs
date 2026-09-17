'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildBaseline,
  compactSnapshot
} = require('./navigation-provenance-baseline.cjs');

const BASELINE_FILE = 'docs/NAVIGATION_PROVENANCE_BASELINE_2026-09-17.json';

function countBy(values, keyFn) {
  const counts = new Map();
  for (const value of values) {
    const key = keyFn(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function summarize(report) {
  const compact = compactSnapshot(report);
  const candidates = report.sourceCoverage.candidates;
  return {
    schemaVersion: 1,
    reportDate: report.reportDate,
    generatedBy: 'scripts/navigation-provenance-baseline-check.cjs',
    coverage: compact.coverage,
    reviewCandidates: {
      byIssue: countBy(report.issues, item => item.issue || 'none'),
      byRole: countBy(report.issues, item => item.role || 'none')
    },
    sourceCoverage: {
      allCandidateFiles: candidates.map(item => item.file).sort(),
      knownRegistryFiles: candidates.filter(item => item.catalogOrigin === 'known-registry').map(item => item.file).sort(),
      autoDiscoveredFiles: candidates.filter(item => item.catalogOrigin === 'auto-discovered').map(item => item.file).sort()
    },
    runtimeDestinationContracts: compact.runtimeDestinationContracts,
    platformNavigation: compact.platformNavigation,
    fingerprints: compact.fingerprints
  };
}

function stable(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function firstDifference(expected, actual, prefix = '') {
  if (Object.is(expected, actual)) return null;
  if (typeof expected !== typeof actual || expected === null || actual === null) {
    return `${prefix || '<root>'}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`;
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return `${prefix}: type mismatch`;
    if (expected.length !== actual.length) return `${prefix}: length ${expected.length} -> ${actual.length}`;
    for (let index = 0; index < expected.length; index += 1) {
      const diff = firstDifference(expected[index], actual[index], `${prefix}[${index}]`);
      if (diff) return diff;
    }
    return null;
  }
  if (typeof expected === 'object') {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!(key in expected)) return `${prefix ? `${prefix}.` : ''}${key}: added`;
      if (!(key in actual)) return `${prefix ? `${prefix}.` : ''}${key}: removed`;
      const diff = firstDifference(expected[key], actual[key], prefix ? `${prefix}.${key}` : key);
      if (diff) return diff;
    }
    return null;
  }
  return `${prefix || '<root>'}: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`;
}

function run() {
  const rootDir = path.resolve(__dirname, '..');
  const baselinePath = path.join(rootDir, BASELINE_FILE);
  if (!fs.existsSync(baselinePath)) {
    console.error(`[navigation-baseline-check] baseline is missing: ${BASELINE_FILE}`);
    process.exitCode = 1;
    return;
  }

  let expected;
  try {
    expected = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch (error) {
    console.error(`[navigation-baseline-check] baseline JSON is invalid: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const report = buildBaseline(rootDir);
  const actual = summarize(report);
  if (stable(expected) !== stable(actual)) {
    console.error('[navigation-baseline-check] navigation/provenance baseline changed.');
    console.error(`[navigation-baseline-check] first difference: ${firstDifference(expected, actual) || 'unknown'}`);
    console.error('[navigation-baseline-check] Do not update the baseline mechanically. Review the full CI inventory and commit a new baseline only when the navigation/provenance change is intentional.');
    process.exitCode = 1;
    return;
  }

  console.log(`[navigation-baseline-check] PASS: ${report.coverage.classifiedHtmlFiles}/${report.coverage.publicHtmlFiles} public HTML classified; ${report.coverage.staticNavigationReferences} static refs; ${report.sourceCoverage.candidates.length} source candidates.`);
}

if (require.main === module) run();

module.exports = { BASELINE_FILE, countBy, firstDifference, summarize };
