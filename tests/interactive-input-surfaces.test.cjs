'use strict';
const { openingTags } = require('./helpers/markup-contract.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function listHtmlFiles(currentDir = root, acc = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'docs', 'tests', 'scripts', '.github'].includes(entry.name)) continue;
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) listHtmlFiles(absolutePath, acc);
    else if (entry.isFile() && entry.name.endsWith('.html')) acc.push(absolutePath);
  }
  return acc;
}

function numberInputIds(html) {
  return openingTags(html).filter(tag=>tag.tag==='input'&&tag.attrs.type==='number').map(tag=>tag.attrs.id);
}

function jaGameDirs() {
  return fs.readdirSync(path.join(root, 'games'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

test("日本語ゲーム計算機は課金予定額を自分で打てる", () => {
  const games=jaGameDirs();assert.ok(games.length>0);
  for(const locale of [''])for(const game of games){
    const file=path.join(locale,'games',game,'index.html');const tags=openingTags(read(file));
    const amountOnly = tags.some(tag => tag.tag === 'form' && tag.attrs['data-input-mode'] === 'amount');
    for(const id of ['sim-custom-amount', ...(amountOnly ? [] : ['sim-pack-count'])]){const matches=tags.filter(tag=>tag.tag==='input'&&tag.attrs.id===id);assert.equal(matches.length,1,file);assert.equal(matches[0].attrs.type,'number',file);}
    if (amountOnly) assert.equal(tags.some(tag => tag.attrs.id === 'sim-pack-count' || tag.attrs.id === 'sim-pack-select'), false, file);
  }
});

test("海外ゲーム計算機も課金予定額入力を残している", () => {
  const games=jaGameDirs();assert.ok(games.length>0);
  for(const locale of ['en','ko','tw'])for(const game of games){
    const file=path.join(locale,'games',game,'index.html');const tags=openingTags(read(file));
    for(const id of ['sim-custom-amount','sim-pack-count']){const matches=tags.filter(tag=>tag.tag==='input'&&tag.attrs.id===id);assert.equal(matches.length,1,file);assert.equal(matches[0].attrs.type,'number',file);}
  }
});

test('各言語トップは必要ポイントと金額を数値入力できる', () => {
  const pages = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];
  for (const page of pages) {
    const html = read(page);
    const ids = numberInputIds(html);
    assert.ok(ids.includes('neededPoints'), page + ' neededPoints');
    assert.ok(ids.includes('amountYen'), page + ' amountYen');
  }
});

test("points-cost は目標ポイントを数値入力できる", () => {
  for(const file of ['points-cost/index.html','en/points-cost/index.html','ko/points-cost/index.html','tw/points-cost/index.html']){
    const inputs=openingTags(read(file)).filter(tag=>tag.tag==='input'&&tag.attrs.id==='points-target');assert.equal(inputs.length,1,file);assert.equal(inputs[0].attrs.type,'number',file);
  }
});

test("海外の維持計算ページは進捗を数値入力できる", () => {
  for(const locale of ['en','ko','tw'])for(const rank of ['platinum','diamond']){
    const file=locale+'/maintenance/'+rank+'/index.html';assert.ok(numberInputIds(read(file)).includes('level-progress'),file);
  }
});

test('日本語の維持ページは計算機本体へ渡す入口であり、英語だけ入力が消えた状態ではない', () => {
  for (const rank of ['platinum', 'diamond']) {
    const ja = read('maintenance/' + rank + '/index.html');
    const en = read('en/maintenance/' + rank + '/index.html');
    assert.equal(numberInputIds(ja).length, 0, 'JA ' + rank + ' はLP');
    assert.match(ja, /[?&]mode=main/, 'JA ' + rank + ' は本体計算機へリンクする');
    assert.ok(numberInputIds(en).includes('level-progress'), 'EN ' + rank);
  }
});

test('日本語と英語の数値入力差分は計算機本体へ渡す維持LPに限る', () => {
  const files = listHtmlFiles();
  const byRel = new Map(files.map(file => [
    path.relative(root, file).replace(/\\/g, '/'),
    numberInputIds(fs.readFileSync(file, 'utf8')).length
  ]));

  for (const [relativePath, count] of byRel) {
    if (relativePath.startsWith('en/')) continue;
    const enPath = 'en/' + relativePath;
    if (!byRel.has(enPath)) continue;

    const enCount = byRel.get(enPath);
    if (count !== 0 || enCount <= 0) continue;

    assert.match(relativePath, /^maintenance\/[^/]+\/index\.html$/, relativePath);
    assert.match(read(relativePath), /[?&]mode=main/, relativePath + ' は本体計算機へリンクする');
  }
});
