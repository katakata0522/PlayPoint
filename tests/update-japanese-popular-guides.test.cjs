'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSnapshot, updateFromFile } = require('../scripts/update-japanese-popular-guides.cjs');
const registry = ['a','b','c','d','e','f'].map(id => ({ file: `../articles/${id}.html`, title: id }));
const previous = { snapshot: '2026-09-19', guides: registry.slice(0,5).map(a => ['/' + a.file.slice(3), a.title]) };
const fixture = () => ({ source: 'PlayPoint Analytics / 📄ページ別分析', status: 'COMPLETE', complete: true,
  start: '2026-08-22', end: '2026-09-20', fetchedAt: '2026-09-21',
  rows: registry.map((a,i) => ({ path: '/' + a.file.slice(3), pv: i + 1 })) });
const today = '2026-09-21';

test('日本語公開記事だけを順位化し、非公開・海外・トップを除外してPVを出力しない', () => {
  const input = fixture();
  input.rows.push({ path: '/', pv: 999 }, { path: '/en/articles/a.html', pv: 999 }, { path: '/articles/hidden.html', pv: 999 });
  const next = buildSnapshot(input, [...registry, { file: '../articles/hidden.html', title: 'hidden', listed: false }], previous, today);
  assert.deepEqual(next.guides.map(x => x[1]), ['f','e','d','c','b']);
  assert.doesNotMatch(JSON.stringify(next), /pv|999/);
});

test('欠損・暫定・期間不一致・古いデータ・重複は前回順位を書き換えない', () => {
  for (const alter of [x => x.status = 'PARTIAL', x => x.complete = false, x => x.end = '2026-09-19',
    x => x.fetchedAt = '2026-09-18', x => {x.start = '2026-08-01'; x.end = '2026-08-30';},
    x => x.rows.push(x.rows[0]), x => x.rows[0].pv = NaN, x => x.rows = x.rows.slice(0,4)]) {
    const input = fixture(); alter(input);
    assert.throws(() => buildSnapshot(input, registry, previous, today));
  }
});

test('同じ順位では更新せず、同数PVの順位はURL順で安定する', () => {
  const input = fixture(); input.rows.forEach(row => row.pv = 1);
  assert.equal(buildSnapshot(input, registry, previous, today), null);
  input.rows.reverse();
  assert.equal(buildSnapshot(input, registry, previous, today), null);
});

test('dry-run・不正入力はファイルを保持し、明示的書込みだけで更新する', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-popular-'));
  try {
    fs.mkdirSync(path.join(root,'scripts')); fs.mkdirSync(path.join(root,'blog'));
    const destination = path.join(root,'scripts/japanese-popular-guides.snapshot.json');
    const inputFile = path.join(root,'input.json');
    const original = JSON.stringify(previous);
    fs.writeFileSync(destination, original); fs.writeFileSync(path.join(root,'blog/articles.json'), JSON.stringify(registry));
    fs.writeFileSync(inputFile, JSON.stringify(fixture()));
    assert.equal(updateFromFile(inputFile,root,today), 'CHANGE_AVAILABLE');
    assert.equal(fs.readFileSync(destination,'utf8'), original);
    fs.writeFileSync(inputFile, JSON.stringify({...fixture(),status:'PARTIAL'}));
    assert.throws(() => updateFromFile(inputFile,root,today,true));
    assert.equal(fs.readFileSync(destination,'utf8'), original);
    fs.writeFileSync(inputFile, JSON.stringify(fixture()));
    assert.equal(updateFromFile(inputFile,root,today,true), 'UPDATED');
    assert.equal(updateFromFile(inputFile,root,today,true), 'UNCHANGED');
    assert.doesNotMatch(fs.readFileSync(destination,'utf8'), /"pv"/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
