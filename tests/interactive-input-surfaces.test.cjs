'use strict';

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
  const tags = html.match(/<input\b[^>]*type=["']number["'][^>]*>/gi) || [];
  return tags.map(tag => {
    const match = tag.match(/\bid=["']([^"']+)["']/i);
    return match ? match[1] : tag.slice(0, 80);
  });
}

function jaGameDirs() {
  return fs.readdirSync(path.join(root, 'games'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

test('日本語ゲーム計算機は課金予定額を自分で打てる', () => {
  const games = jaGameDirs();
  assert.ok(games.length >= 21, 'game dirs: ' + games.length);
  for (const game of games) {
    const html = read(path.join('games', game, 'index.html'));
    assert.match(html, /id="sim-custom-amount"/, game + ' に課金予定合計額がない');
    assert.match(html, /id="sim-pack-count"/, game + ' にパック個数がない');
  }
});

test('海外ゲーム計算機も課金予定額入力を残している', () => {
  const games = jaGameDirs();
  for (const locale of ['en', 'ko', 'tw']) {
    for (const game of games) {
      const relativePath = path.join(locale, 'games', game, 'index.html');
      const html = read(relativePath);
      assert.match(html, /id="sim-custom-amount"/, relativePath);
      assert.match(html, /id="sim-pack-count"/, relativePath);
    }
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

test('points-cost は目標ポイントを数値入力できる', () => {
  for (const page of ['points-cost/index.html', 'en/points-cost/index.html', 'ko/points-cost/index.html', 'tw/points-cost/index.html']) {
    const html = read(page);
    assert.match(html, /id="points-target"/, page);
    assert.match(html, /type="number"/, page);
  }
});

test('海外の維持計算ページは進捗を数値入力できる', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    for (const rank of ['platinum', 'diamond']) {
      const page = locale + '/maintenance/' + rank + '/index.html';
      const html = read(page);
      assert.match(html, /data-progress-input/, page);
      assert.ok(numberInputIds(html).includes('level-progress'), page);
    }
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

test('日本語と英語で数値入力の有無が食い違うのは維持LPだけ', () => {
  const files = listHtmlFiles();
  const byRel = new Map(files.map(file => [
    path.relative(root, file).replace(/\\/g, '/'),
    numberInputIds(fs.readFileSync(file, 'utf8')).length
  ]));
  const gaps = [];
  for (const [relativePath, count] of byRel) {
    if (relativePath.startsWith('en/')) continue;
    const enPath = 'en/' + relativePath;
    if (!byRel.has(enPath)) continue;
    const enCount = byRel.get(enPath);
    if (count === 0 && enCount > 0) gaps.push(relativePath + ' JA=0 EN=' + enCount);
  }
  assert.deepEqual(gaps.sort(), [
    'maintenance/diamond/index.html JA=0 EN=1',
    'maintenance/platinum/index.html JA=0 EN=1'
  ]);
});
