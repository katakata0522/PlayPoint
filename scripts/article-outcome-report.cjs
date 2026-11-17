'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { articleEntries } = require('./article-discovery-sync.cjs');
const { getArticleRoleContract } = require('./article-role-registry.cjs');
const NUMERATOR = Object.freeze({
  calculator_bridge: 'calculationUsers', game_decision: 'calculationUsers',
  decision_support: 'nextActionUsers', troubleshooting: 'resolutionActionUsers',
  retention: 'returningUsers', reference: 'assistedNavigationUsers'
});
const METRICS = ['articleUsers', ...new Set(Object.values(NUMERATOR)), 'diaryOpenedUsers', 'diarySavedUsers'];
const ACTION_METRICS = Object.freeze({
  article_decision_action: 'nextActionUsers',
  article_resolution_action: 'resolutionActionUsers',
  article_reference_action: 'assistedNavigationUsers'
});
function validatePeriod(period) {
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(period?.start) || !validDate(period?.end) || period.start > period.end) throw Error('Provide a valid, shared reporting period');
}
// 既存の読取権限で取得できる標準dimensionだけを使う。認証・GA4設定は変更しない。
function ga4Template(period, collectedFrom = null) {
  validatePeriod(period);
  if (collectedFrom !== null) validatePeriod({ start: collectedFrom, end: collectedFrom });
  return { period, collectedFrom, request: {
    dateRanges: [{ startDate: period.start, endDate: period.end }],
    dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: {
      values: ['page_view', ...Object.keys(ACTION_METRICS)], caseSensitive: true
    } } },
    limit: '10000', returnPropertyQuota: true
  }, response: null };
}
function fromGa4Report(input, root) {
  const expected = ga4Template(input?.period, input?.collectedFrom ?? null);
  if (JSON.stringify(input.request) !== JSON.stringify(expected.request)) throw Error('Use the unchanged GA4 request template for this reporting period');
  const report = input.response;
  const rows = report?.rows || [];
  if (!report || !Number.isSafeInteger(report.rowCount) || report.rowCount !== rows.length) throw Error('Incomplete GA4 response; do not fill missing outcomes with zero');
  const metadata = report.metadata || {};
  if (metadata.subjectToThresholding || metadata.dataLossFromOtherRow || metadata.samplingMetadatas?.length) throw Error('Restricted GA4 response; leave outcomes unmeasured');
  const dimensions = (report.dimensionHeaders || []).map(h => h.name);
  const metrics = (report.metricHeaders || []).map(h => h.name);
  if (dimensions.length !== 2 || !dimensions.includes('pagePath') || !dimensions.includes('eventName') || metrics.length !== 1 || metrics[0] !== 'totalUsers') throw Error('Unexpected GA4 dimensions or metrics');
  const output = createTemplate(root), inventory = new Map(output.rows.map(row => [row.path, row]));
  const observed = new Map(), seen = new Set();
  for (const row of rows) {
    const articlePath = row.dimensionValues?.[dimensions.indexOf('pagePath')]?.value;
    const eventName = row.dimensionValues?.[dimensions.indexOf('eventName')]?.value;
    const count = row.metricValues?.[0]?.value;
    if (typeof articlePath !== 'string' || !['page_view', ...Object.keys(ACTION_METRICS)].includes(eventName) || !/^\d+$/.test(count || '') || !Number.isSafeInteger(Number(count))) throw Error('Invalid GA4 row');
    const key = JSON.stringify([articlePath, eventName]);
    if (seen.has(key)) throw Error('Duplicate GA4 row; do not sum distinct users across segments');
    seen.add(key);
    if (!inventory.has(articlePath)) continue;
    if (!observed.has(articlePath)) observed.set(articlePath, new Map());
    observed.get(articlePath).set(eventName, Number(count));
  }
  const fullCoverage = expected.collectedFrom !== null && input.period.start >= expected.collectedFrom;
  for (const [articlePath, events] of observed) {
    const row = inventory.get(articlePath);
    row.articleUsers = events.get('page_view') ?? null;
    const metric = NUMERATOR[getArticleRoleContract(articlePath).role];
    const action = Object.keys(ACTION_METRICS).find(event => ACTION_METRICS[event] === metric);
    // 開始前を含む期間や、閲覧母数がない行は0にしない。再訪・計算成功も推定しない。
    if (fullCoverage && action && row.articleUsers !== null) row[metric] = events.get(action) ?? 0;
  }
  return { ...output, period: input.period,
    source: 'GA4 standard pagePath × eventName / totalUsers; complete, unrestricted response',
    collectedFrom: expected.collectedFrom, fullCoverage };
}
function createTemplate(root) {
  return { period: { start: null, end: null }, source: 'GA4: same-period, distinct users per article; fill only verified metrics',
    rows: articleEntries(root).map(entry => ({ path: '/' + entry.path, ...Object.fromEntries(METRICS.map(key => [key, null])) })) };
}
function evaluate(input, root) {
  if (!input || !Array.isArray(input.rows)) throw Error('rows must be an array');
  validatePeriod(input.period);
  const inventory = new Map(articleEntries(root).map(e => ['/' + e.path, e]));
  const rows = new Map();
  for (const row of input.rows) {
    if (!inventory.has(row.path) || rows.has(row.path)) throw Error('Unknown or duplicate article: ' + row.path);
    for (const key of METRICS) if (row[key] != null && (!Number.isSafeInteger(row[key]) || row[key] < 0)) throw Error('Invalid count: ' + row.path + ' ' + key);
    for (const key of METRICS.filter(k => k !== 'articleUsers')) {
      if (row[key] != null && row.articleUsers != null && row[key] > row.articleUsers) throw Error('Outcome users exceed article users; check period and distinct-user cohort: ' + row.path);
    }
    rows.set(row.path, row);
  }
  return [...inventory.keys()].map(articlePath => {
    const contract = getArticleRoleContract(articlePath), row = rows.get(articlePath) || {};
    const numerator = row[NUMERATOR[contract.role]] ?? null, denominator = row.articleUsers ?? null;
    const rate = numerator != null && denominator > 0 ? numerator / denominator : null;
    return { path: articlePath, role: contract.role, primaryKpi: contract.primaryKpi, numeratorMetric: NUMERATOR[contract.role],
      numerator, denominator, rate, status: rate === null ? 'unmeasured' : denominator < 30 ? 'small_sample' : 'observed',
      diaryOpenedUsers: row.diaryOpenedUsers ?? null, diarySavedUsers: row.diarySavedUsers ?? null };
  });
}
function markdown(input, rows) {
  const show = value => value == null ? '未計測' : String(value);
  return '# 記事の役割別成果\n\n対象期間: ' + input.period.start + '〜' + input.period.end +
    (Object.hasOwn(input, 'fullCoverage') ? '\n\n行動計測の利用開始日: ' + (input.collectedFrom || '未確認') + '。対象期間全体の計測: ' + (input.fullCoverage ? '確認済み' : '未確認・主指標は未計測') + '。再訪・解決完了はこの集計から推定しません。' : '') +
    '\n\n同期間・同じ記事閲覧者群の重複を除いたユーザー数で計算します。クリックは解決完了を意味しません。未計測を0に置き換えません。30人未満は少数標本の目安であり、30人以上でも効果を証明するものではありません。\n\n' +
    '| 記事 | 役割 / 主指標 | 成果ユーザー / 閲覧ユーザー | 率 | 状態 |\n|---|---|---:|---:|---|\n' +
    rows.map(r => '| ' + r.path + ' | ' + r.role + ' / ' + r.primaryKpi + ' | ' + show(r.numerator) + ' / ' + show(r.denominator) + ' | ' + (r.rate == null ? '未計測' : (r.rate * 100).toFixed(1) + '%') + ' | ' + r.status + ' |').join('\n') +
    '\n\n役割をまたいで率の順位を付けず、同じ記事・同じ定義の前期間と比較します。国別・流入元・季節性・同意取得状況の変化も確認してください。日記への移動は補助指標であり、保存や再訪の代用にはしません。\n';
}
module.exports = { createTemplate, evaluate, markdown, ga4Template, fromGa4Report, NUMERATOR, METRICS, ACTION_METRICS };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  if (process.argv.includes('--template')) process.stdout.write(JSON.stringify(createTemplate(root), null, 2) + '\n');
  else if (process.argv[2] === '--ga4-template') process.stdout.write(JSON.stringify(ga4Template({ start: process.argv[3], end: process.argv[4] }, process.argv[5] || null), null, 2) + '\n');
  else {
    const inputPath = process.argv[2] === '--ga4' ? process.argv[3] : process.argv[2];
    if (!inputPath) throw Error('Usage: node scripts/article-outcome-report.cjs --template | INPUT.json');
    const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
    const input = process.argv[2] === '--ga4' ? fromGa4Report(raw, root) : raw;
    process.stdout.write(markdown(input, evaluate(input, root)));
  }
}
