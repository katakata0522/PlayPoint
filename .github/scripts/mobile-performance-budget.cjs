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

const MINIMUM_SAMPLES = Object.freeze({
  calculatorHome: 3,
  articleHub: 1,
  representativeArticle: 1,
  default: 1
});

const METRIC_KEYS = Object.freeze([
  'performanceScore',
  'largestContentfulPaintMs',
  'totalBlockingTimeMs',
  'cumulativeLayoutShift',
  'totalByteWeight'
]);

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

function extractMetrics(report) {
  return {
    performanceScore: report.categories.performance.score,
    largestContentfulPaintMs: auditValue(report, 'largest-contentful-paint'),
    totalBlockingTimeMs: auditValue(report, 'total-blocking-time'),
    cumulativeLayoutShift: auditValue(report, 'cumulative-layout-shift'),
    totalByteWeight: auditValue(report, 'total-byte-weight')
  };
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('中央値を計算する値がありません。');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregateMetrics(metricSets) {
  if (!Array.isArray(metricSets) || metricSets.length === 0) {
    throw new Error('集約する性能指標がありません。');
  }
  return Object.fromEntries(METRIC_KEYS.map(key => [
    key,
    median(metricSets.map(metrics => metrics[key]))
  ]));
}

function compareMetric(key, value, limit) {
  return key === 'performanceScore' ? value < limit : value > limit;
}

function formatComparison(key, value, limit) {
  const direction = key === 'performanceScore' ? '以上' : '以下';
  return `${key}: ${value}（基準: ${limit}${direction}）`;
}

function evaluateMetrics(profile, metrics) {
  const budgets = HARD_BUDGETS[profile] || HARD_BUDGETS.default;
  const failures = Object.entries(budgets)
    .filter(([key, budget]) => compareMetric(key, metrics[key], budget))
    .map(([key, budget]) => formatComparison(key, metrics[key], budget));
  const targetWarnings = Object.entries(TARGETS)
    .filter(([key, target]) => compareMetric(key, metrics[key], target))
    .map(([key, target]) => formatComparison(key, metrics[key], target));
  return { budgets, failures, targetWarnings };
}

function evaluateReport(reportPath) {
  const report = readReport(reportPath);
  const profile = getProfile(reportPath);
  const metrics = extractMetrics(report);
  const evaluation = evaluateMetrics(profile, metrics);
  console.log(JSON.stringify({
    files: [reportPath],
    urls: [report.finalDisplayedUrl || report.finalUrl],
    profile,
    aggregation: 'single',
    sampleCount: 1,
    metrics,
    hardBudgets: evaluation.budgets,
    nextTargets: TARGETS,
    targetWarnings: evaluation.targetWarnings
  }, null, 2));
  return { metrics, ...evaluation };
}

function groupReportPaths(reportPaths) {
  return reportPaths.reduce((groups, reportPath) => {
    const profile = getProfile(reportPath);
    if (!groups.has(profile)) groups.set(profile, []);
    groups.get(profile).push(reportPath);
    return groups;
  }, new Map());
}

function evaluateProfileGroup(profile, reportPaths) {
  const requiredSamples = MINIMUM_SAMPLES[profile] || MINIMUM_SAMPLES.default;
  const sampleFailures = reportPaths.length < requiredSamples
    ? [`sampleCount: ${reportPaths.length}（基準: ${requiredSamples}以上）`]
    : [];
  const reports = reportPaths.map(readReport);
  const sampleMetrics = reports.map(extractMetrics);
  const metrics = aggregateMetrics(sampleMetrics);
  const evaluation = evaluateMetrics(profile, metrics);
  const result = {
    profile,
    files: reportPaths,
    urls: reports.map(report => report.finalDisplayedUrl || report.finalUrl),
    aggregation: reportPaths.length > 1 ? 'median' : 'single',
    sampleCount: reportPaths.length,
    requiredSamples,
    sampleMetrics,
    metrics,
    hardBudgets: evaluation.budgets,
    nextTargets: TARGETS,
    failures: [...sampleFailures, ...evaluation.failures],
    targetWarnings: evaluation.targetWarnings
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function main(reportPaths = process.argv.slice(2)) {
  if (reportPaths.length === 0) {
    console.error('検証するLighthouse JSONを指定してください。');
    return 1;
  }

  const evaluations = [...groupReportPaths(reportPaths)]
    .map(([profile, paths]) => evaluateProfileGroup(profile, paths));
  const failures = evaluations.flatMap(evaluation =>
    evaluation.failures.map(failure => `${evaluation.profile}: ${failure}`)
  );
  const warnings = evaluations.flatMap(evaluation =>
    evaluation.targetWarnings.map(warning => `${evaluation.profile}: ${warning}`)
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

  const sampleCount = evaluations.reduce((sum, evaluation) => sum + evaluation.sampleCount, 0);
  console.log(`低性能Android相当の強化済み性能予算内です（${evaluations.length}ページ種別・${sampleCount}測定）。`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  BUDGETS: HARD_BUDGETS.default,
  HARD_BUDGETS,
  METRIC_KEYS,
  MINIMUM_SAMPLES,
  TARGETS,
  aggregateMetrics,
  evaluateMetrics,
  evaluateProfileGroup,
  evaluateReport,
  extractMetrics,
  getProfile,
  groupReportPaths,
  main,
  median,
  readReport
};
