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
function createTemplate(root) {
  return { period: { start: null, end: null }, source: 'GA4: same-period, distinct users per article; fill only verified metrics',
    rows: articleEntries(root).map(entry => ({ path: '/' + entry.path, ...Object.fromEntries(METRICS.map(key => [key, null])) })) };
}
function evaluate(input, root) {
  if (!input || !Array.isArray(input.rows)) throw Error('rows must be an array');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(input.period?.start) || !validDate(input.period?.end) || input.period.start > input.period.end) throw Error('Provide a valid, shared reporting period');
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
    '\n\n同期間・同じ記事閲覧者群の重複を除いたユーザー数で計算します。クリックは解決完了を意味しません。未計測を0に置き換えません。30人未満は少数標本の目安であり、30人以上でも効果を証明するものではありません。\n\n' +
    '| 記事 | 役割 / 主指標 | 成果ユーザー / 閲覧ユーザー | 率 | 状態 |\n|---|---|---:|---:|---|\n' +
    rows.map(r => '| ' + r.path + ' | ' + r.role + ' / ' + r.primaryKpi + ' | ' + show(r.numerator) + ' / ' + show(r.denominator) + ' | ' + (r.rate == null ? '未計測' : (r.rate * 100).toFixed(1) + '%') + ' | ' + r.status + ' |').join('\n') +
    '\n\n役割をまたいで率の順位を付けず、同じ記事・同じ定義の前期間と比較します。国別・流入元・季節性・同意取得状況の変化も確認してください。日記への移動は補助指標であり、保存や再訪の代用にはしません。\n';
}
module.exports = { createTemplate, evaluate, markdown, NUMERATOR, METRICS };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  if (process.argv.includes('--template')) process.stdout.write(JSON.stringify(createTemplate(root), null, 2) + '\n');
  else {
    const inputPath = process.argv[2];
    if (!inputPath) throw Error('Usage: node scripts/article-outcome-report.cjs --template | INPUT.json');
    const input = JSON.parse(fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
    process.stdout.write(markdown(input, evaluate(input, root)));
  }
}
