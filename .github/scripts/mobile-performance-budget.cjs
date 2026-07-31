'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BUDGETS = Object.freeze({
  performanceScore: 0.30,
  largestContentfulPaintMs: 7000,
  totalBlockingTimeMs: 3000,
  cumulativeLayoutShift: 0.40,
  totalByteWeight: 600 * 1024
});

function readReport(reportPath) {
  const absolutePath = path.resolve(reportPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Lighthouseレポートがありません: ${reportPath}`);
  }
  const report = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  if (!report.categories?.performance || !report.audits) {
    throw new Error(`Lighthouseレポート形式が不正です: ${reportPath}`);
  }
  return report;
}

function auditValue(report, auditId) {
  const value = report.audits[auditId]?.numericValue;
  if (!Number.isFinite(value)) throw new Error(`監査値を取得できません: ${auditId}`);
  return value;
}

function evaluateReport(reportPath) {
  const report = readReport(reportPath);
  const metrics = {
    performanceScore: report.categories.performance.score,
    largestContentfulPaintMs: auditValue(report, 'largest-contentful-paint'),
    totalBlockingTimeMs: auditValue(report, 'total-blocking-time'),
    cumulativeLayoutShift: auditValue(report, 'cumulative-layout-shift'),
    totalByteWeight: auditValue(report, 'total-byte-weight')
  };
  const failures = Object.entries(BUDGETS)
    .filter(([key, budget]) => key === 'performanceScore'
      ? metrics[key] < budget
      : metrics[key] > budget)
    .map(([key, budget]) => `${key}: ${metrics[key]}（基準: ${budget}）`);

  console.log(JSON.stringify({
    file: reportPath,
    url: report.finalDisplayedUrl || report.finalUrl,
    metrics
  }, null, 2));
  return failures;
}

const reportPaths = process.argv.slice(2);
if (reportPaths.length === 0) {
  console.error('検証するLighthouse JSONを指定してください。');
  process.exit(1);
}

const failures = reportPaths.flatMap(reportPath =>
  evaluateReport(reportPath).map(failure => `${reportPath}: ${failure}`)
);

if (failures.length > 0) {
  console.error('低性能Android相当の性能予算を超過しました。');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`低性能Android相当の性能予算内です（${reportPaths.length}ページ）。`);

module.exports = {
  BUDGETS,
  evaluateReport,
  readReport
};
