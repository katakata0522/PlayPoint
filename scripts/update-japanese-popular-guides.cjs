'use strict';

const fs = require('node:fs');
const path = require('node:path');
const DAY = 86400000;

function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日付形式が不正です');
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('日付が不正です');
  return time;
}

// 集計値は非公開の入力でだけ扱い、公開スナップショットには順位と記事情報だけ残す。
function buildSnapshot(input, registry, previous, today) {
  const now = day(today);
  if (input.source !== 'PlayPoint Analytics / 📄ページ別分析' || input.status !== 'COMPLETE' || input.complete !== true) {
    throw new Error('正常・全件取得済みのページ別分析が必要です。前回順位を保持します');
  }
  const start = day(input.start), end = day(input.end), fetched = day(input.fetchedAt);
  if ((end - start) / DAY !== 29 || end >= now || now - end > 7 * DAY || fetched < end || fetched > now || now - fetched > DAY) {
    throw new Error('直近30日の期間または取得日時が不正・古いため、前回順位を保持します');
  }
  if (!Array.isArray(input.rows) || input.rows.length === 0) throw new Error('集計行がありません');
  const labels = new Map(registry.filter(a => a.listed !== false).map(a => ['/' + a.file.replace(/^\.\.\//, ''), a.listTitle || a.title]));
  const oldLabels = new Map(previous.guides);
  const seen = new Set();
  for (const row of input.rows) {
    if (typeof row.path !== 'string' || !row.path.startsWith('/') || row.path.startsWith('//') || /[?#]/.test(row.path) || seen.has(row.path) || !Number.isSafeInteger(row.pv) || row.pv < 0) {
      throw new Error('重複・不正なURLまたはPVを検出しました');
    }
    seen.add(row.path);
  }
  const selected = input.rows.filter(row => /^\/articles\/[^/]+\.html$/.test(row.path) && labels.has(row.path) && row.pv > 0)
    .sort((a, b) => b.pv - a.pv || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).slice(0, 5);
  if (selected.length !== 5) throw new Error('公開日本語記事5件分のデータがありません');
  if (JSON.stringify(selected.map(row => row.path)) === JSON.stringify(previous.guides.map(([href]) => href))) return null;
  return { snapshot: today, start: input.start, end: input.end,
    guides: selected.map(row => [row.path, oldLabels.get(row.path) || labels.get(row.path)]) };
}

function updateFromFile(inputFile, root, today, write = false) {
  const destination = path.join(root, 'scripts/japanese-popular-guides.snapshot.json');
  const previous = JSON.parse(fs.readFileSync(destination, 'utf8'));
  const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  const next = buildSnapshot(input, registry, previous, today);
  if (next && write) {
    const temporary = destination + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2) + '\n');
    fs.renameSync(temporary, destination);
  }
  return next ? (write ? 'UPDATED' : 'CHANGE_AVAILABLE') : 'UNCHANGED';
}

if (require.main === module) {
  try {
    const [inputFile, flag] = process.argv.slice(2);
    if (!inputFile || (flag && flag !== '--write')) throw new Error('使い方: node scripts/update-japanese-popular-guides.cjs <非公開JSON> [--write]');
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    console.log(updateFromFile(inputFile, path.resolve(__dirname, '..'), today, flag === '--write'));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildSnapshot, updateFromFile };
