'use strict';

const fs = require('node:fs');
const path = require('node:path');

const KB = 1024;

const HARD_BUDGETS = Object.freeze({
  default: Object.freeze({
    performanceScore: 0.65,
    largestContentfulPaintMs: 3500,
    totalBlockingTimeMs: 1200,
    cumulativeLayoutShift: 0.15,
    totalByteWeight: 350 * KB
  }),
  calculatorHome: Object.freeze({
    performanceScore: 0.65,
    // 6倍CPU低速化の合成測定に対する第一段階の移行上限。
    // 継続目標はTARGETSの2.5秒で、次段階でさらに縮める。
    largestContentfulPaintMs: 3600,
    // 初期化・同意管理を含むトップページだけは段階的に縮める移行上限。
    totalBlockingTimeMs: 1800,
    cumulativeLayoutShift: 0.15,
    totalByteWeight: 350 * KB
  }),
  articleHub: Object.freeze({
    performanceScore: 0.65,
    largestContentfulPaintMs: 3500,
    totalBlockingTimeMs: 1200,
    cumulativeLayoutShift: 0.15,
    totalByteWeight: 350 * KB
  }),
  representativeArticle: Object.freeze({
    performanceScore: 0.70,
    largestContentfulPaintMs: 3000,
    totalBlockingTimeMs: 800,
    cumulativeLayoutShift: 0.15,
    totalByteWeight: 350 * KB
  })
});

const TARGETS = Object.freeze({
  performanceScore: 0.80,
  largestContentfulPaintMs: 2500,
  totalBlockingTimeMs: 600,
  cumulativeLayoutShift: 0.10,
  totalByteWeight: 300 * KB
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

function getProfile(reportPath) {
  const name = path.basename(reportPath).toLowerCase();
  if (name.includes('calculator-home')) return 'calculatorHome';
  if (name.includes('article-hub')) return 'articleHub';
  if (name.includes('representative-article')) return 'representativeArticle';
  return 'default';
}

function compareMetric(key, value, limit) {
  return key === 'performanceScore' ? value < limit : value > limit;
}

function formatComparison(key, value, limit) {
  const direction = key === 'performanceScore' ? '以上' : '以下';
  return `${key}: ${value}（基準: ${limit}${direction}）`;
}

function evaluateReport(reportPath) {
  const report = readReport(reportPath);
  const profile = getProfile(reportPath);
  const budgets = HARD_BUDGETS[profile] || HARD_BUDGETS.default;
  const metrics = {
    performanceScore: report.categories.performance.score,
    largestContentfulPaintMs: auditValue(report, 'largest-contentful-paint'),
    totalBlockingTimeMs: auditValue(report, 'total-blocking-time'),
    cumulativeLayoutShift: auditValue(report, 'cumulative-layout-shift'),
    totalByteWeight: auditValue(report, 'total-byte-weight')
  };
  const failures = Object.entries(budgets)
    .filter(([key, budget]) => compareMetric(key, metrics[key], budget))
    .map(([key, budget]) => formatComparison(key, metrics[key], budget));
  const targetWarnings = Object.entries(TARGETS)
    .filter(([key, target]) => compareMetric(key, metrics[key], target))
    .map(([key, target]) => formatComparison(key, metrics[key], target));

  console.log(JSON.stringify({
    file: reportPath,
    url: report.finalDisplayedUrl || report.finalUrl,
    profile,
    metrics,
    hardBudgets: budgets,
    nextTargets: TARGETS,
    targetWarnings
  }, null, 2));
  return { failures, targetWarnings };
}

function main(reportPaths = process.argv.slice(2)) {
  if (reportPaths.length === 0) {
    console.error('検証するLighthouse JSONを指定してください。');
    return 1;
  }

  const evaluations = reportPaths.map(reportPath => ({
    reportPath,
    ...evaluateReport(reportPath)
  }));
  const failures = evaluations.flatMap(({ reportPath, failures: reportFailures }) =>
    reportFailures.map(failure => `${reportPath}: ${failure}`)
  );
  const warnings = evaluations.flatMap(({ reportPath, targetWarnings }) =>
    targetWarnings.map(warning => `${reportPath}: ${warning}`)
  );

  if (warnings.length > 0) {
    console.warn('次段階の快適性目標には未到達の項目があります。');
    warnings.forEach(warning => console.warn(`- ${warning}`));
  }

  if (failures.length > 0) {
    console.error('低性能Android相当の性能予算を超過しました。');
    failures.forEach(failure => console.error(`- ${failure}`));
    return 1;
  }

  console.log(`低性能Android相当の強化済み性能予算内です（${reportPaths.length}ページ）。`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  BUDGETS: HARD_BUDGETS.default,
  HARD_BUDGETS,
  TARGETS,
  evaluateReport,
  getProfile,
  main,
  readReport
};
