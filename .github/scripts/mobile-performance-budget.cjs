'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeJson } = require('./ci-evidence.cjs');

const KB = 1024;

const ARTICLE_HARD_BUDGET = Object.freeze({
  performanceScore: 0.70,
  largestContentfulPaintMs: 3000,
  totalBlockingTimeMs: 800,
  cumulativeLayoutShift: 0.15,
  totalByteWeight: 350 * KB
});

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
  representativeArticle: ARTICLE_HARD_BUDGET,
  internationalArticleEn: ARTICLE_HARD_BUDGET,
  internationalArticleKo: ARTICLE_HARD_BUDGET,
  internationalArticleTw: ARTICLE_HARD_BUDGET
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
  internationalArticleEn: 1,
  internationalArticleKo: 1,
  internationalArticleTw: 1,
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
  if (report.runtimeError || !report.categories?.performance || !report.audits) {
    throw new Error(`Lighthouseレポート形式が不正です: ${reportPath}`);
  }
  return report;
}

function auditValue(report, auditId) {
  const value = report.audits[auditId]?.numericValue;
  if (!Number.isFinite(value) || value < 0) throw new Error(`監査値を取得できません: ${auditId}`);
  return value;
}

function getProfile(reportPath) {
  const name = path.basename(reportPath).toLowerCase();
  if (name.includes('calculator-home')) return 'calculatorHome';
  if (name.includes('article-hub')) return 'articleHub';
  if (name.includes('representative-article')) return 'representativeArticle';
  if (name.includes('international-article-en')) return 'internationalArticleEn';
  if (name.includes('international-article-ko')) return 'internationalArticleKo';
  if (name.includes('international-article-tw')) return 'internationalArticleTw';
  return 'default';
}

function extractMetrics(report) {
  const score = report.categories.performance.score;
  if (!Number.isFinite(score) || score < 0 || score > 1) throw new Error('performanceScore is missing or invalid');
  return {
    performanceScore: score,
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
    key === 'totalByteWeight'
      ? Math.max(...metricSets.map(metrics => metrics[key]))
      : median(metricSets.map(metrics => metrics[key]))
  ]));
}

function spreadMetrics(samples) {
  return Object.fromEntries(METRIC_KEYS.map(key => {
    const values = samples.map(sample => sample[key]);
    const middle = median(values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return [key, { count: values.length, min: Math.min(...values), max: Math.max(...values), median: middle, mean,
      range: Math.max(...values) - Math.min(...values),
      standardDeviation: Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length),
      medianAbsoluteDeviation: median(values.map(value => Math.abs(value - middle))) }];
  }));
}
function needsAdditionalSamples(report, profile) {
  const metrics = extractMetrics(report);
  // byte超過や計測欠損は、再測定で通す対象ではない。初回sampleは必ず残す。
  const limits = HARD_BUDGETS[profile] || HARD_BUDGETS.default;
  return metrics.totalByteWeight <= limits.totalByteWeight &&
    METRIC_KEYS.some(key => key !== 'totalByteWeight' && compareMetric(key, metrics[key], limits[key]));
}
function reportPathsFromArgs(argv, { requireComplete = true } = {}) {
  if (argv[0] !== '--manifest') return argv;
  if (argv.length !== 2) throw new Error('--manifest requires exactly one path');
  const manifest = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.reports) || !manifest.reports.length) throw new Error('invalid audit manifest');
  const profiles = new Set(manifest.reports.map(getProfile));
  const required = Object.keys(MINIMUM_SAMPLES).filter(profile => profile !== 'default');
  if (requireComplete && required.some(profile => !profiles.has(profile))) throw new Error('audit manifest is missing a required page profile');
  if (requireComplete && manifest.passed !== true) throw new Error('audit collection did not complete successfully');
  return manifest.reports;
}

function compareMetric(key, value, limit) {
  return key === 'performanceScore' ? value < limit : value > limit;
}

function formatComparison(key, value, limit) {
  const direction = key === 'performanceScore' ? '以上' : '以下';
  return `${key}: ${value}（基準: ${limit}${direction}）`;
}

function evaluateMetrics(profile, metrics) {
  if (METRIC_KEYS.some(key => !Number.isFinite(metrics[key]) || metrics[key] < 0) || metrics.performanceScore > 1) throw new Error('missing or invalid performance metric');
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
  if (new Set(reportPaths.map(file => path.resolve(file))).size !== reportPaths.length) throw new Error('duplicate Lighthouse sample path');
  const requiredSamples = MINIMUM_SAMPLES[profile] || MINIMUM_SAMPLES.default;
  const sampleFailures = reportPaths.length < requiredSamples
    ? [`sampleCount: ${reportPaths.length}（基準: ${requiredSamples}以上）`]
    : [];
  const reports = reportPaths.map(readReport);
  const urls = new Set(reports.map(report => report.finalDisplayedUrl || report.finalUrl).filter(Boolean));
  if (urls.size > 1) throw new Error('different URLs cannot share a performance sample group');
  const environments = new Set(reports.filter(report => report.configSettings).map(report => JSON.stringify({ version: report.lighthouseVersion, agent: report.environment?.hostUserAgent, settings: report.configSettings })));
  if (environments.size > 1) throw new Error('different measurement environments cannot share a sample group');
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
    spread: spreadMetrics(sampleMetrics),
    aggregationByMetric: Object.fromEntries(METRIC_KEYS.map(key => [key, key === 'totalByteWeight' ? 'maximum' : 'median'])),
    individualBreaches: sampleMetrics.flatMap((sample, index) => evaluateMetrics(profile, sample).failures.map(failure => ({ sample: index + 1, file: reportPaths[index], failure }))),
    metrics,
    hardBudgets: evaluation.budgets,
    nextTargets: TARGETS,
    failures: [...sampleFailures, ...evaluation.failures],
    targetWarnings: evaluation.targetWarnings
  };
  result.classification = result.failures.length ? 'BUDGET_FAIL' : result.individualBreaches.length ? 'PASS_WITH_OUTLIERS' : 'PASS';
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function main(argv = process.argv.slice(2)) {
  const reportPaths = reportPathsFromArgs(argv);
  if (reportPaths.length === 0) {
    console.error('検証するLighthouse JSONを指定してください。');
    return 1;
  }

  const evaluations = [...groupReportPaths(reportPaths)]
    .map(([profile, paths]) => {
      try { return evaluateProfileGroup(profile, paths); }
      catch (error) { return { profile, files: paths, sampleCount: paths.length, classification: 'INVALID_MEASUREMENT', failures: [error.message], targetWarnings: [] }; }
    });
  if (argv[0] === '--manifest') writeJson(path.join(path.dirname(argv[1]), 'budget-summary.json'), { schemaVersion: 1, evaluations });
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
  try { process.exitCode = main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = {
  ARTICLE_HARD_BUDGET,
  BUDGETS: HARD_BUDGETS.default,
  HARD_BUDGETS,
  METRIC_KEYS,
  MINIMUM_SAMPLES,
  TARGETS,
  spreadMetrics,
  needsAdditionalSamples,
  reportPathsFromArgs,
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
