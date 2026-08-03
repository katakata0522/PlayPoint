'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const cssPath = path.join(root, 'articles', 'styles', '2026-07-24-play-points-1-value.css');
const regressionTestPath = path.join(root, 'tests', 'playpoint-regression.test.cjs');

let html = fs.readFileSync(articlePath, 'utf8');
const styleMatch = html.match(/\n  <style>\n([\s\S]*?)\n  <\/style>/);
if (!styleMatch) throw new Error('外部化する丸めシミュレーターCSSが見つかりません。');

const css = styleMatch[1]
  .split('\n')
  .map(line => line.replace(/^    /, ''))
  .join('\n')
  .trim() + '\n';

html = html.replace(styleMatch[0], '\n  <link rel="stylesheet" href="./styles/2026-07-24-play-points-1-value.css" />');
html = html.replace(
  '<meta property="og:title" content="Google Play Points 1ポイントはいくら？税抜価格・丸め方を解説" />',
  '<meta property="og:title" content="Google Play Points 1ポイントはいくら？100円で何ポイント貯まるか" />'
);
html = html.replace(
  '税金を除くアイテム価格に獲得率を掛け、商品ごとに整数へ丸める',
  '税金を除くアイテム価格に獲得率を掛け、商品ごとに最も近い整数へ丸める'
);

if (/<style(?:\s|>)/i.test(html)) throw new Error('記事にinline styleが残っています。');
if (!html.includes('./styles/2026-07-24-play-points-1-value.css')) {
  throw new Error('記事別CSSへの参照を追加できませんでした。');
}
if (!html.includes('商品ごとに最も近い整数へ丸め')) {
  throw new Error('既存の丸め方検証に必要な説明がありません。');
}

let regressionTest = fs.readFileSync(regressionTestPath, 'utf8');
const oldModifiedExpectation = "    const expectedModified = file.endsWith('earn-play-points-free.html') ? '2026-07-31' : '2026-07-30';";
const newModifiedExpectation = [
  "    const expectedModified = file.endsWith('play-points-1-value.html')",
  "      ? '2026-08-03'",
  "      : file.endsWith('earn-play-points-free.html')",
  "        ? '2026-07-31'",
  "        : '2026-07-30';"
].join('\n');
if (!regressionTest.includes(oldModifiedExpectation)) {
  throw new Error('更新日の旧回帰テスト契約が見つかりません。');
}
regressionTest = regressionTest.replace(oldModifiedExpectation, newModifiedExpectation);

fs.writeFileSync(articlePath, html.replace(/\r\n/g, '\n'), 'utf8');
fs.writeFileSync(cssPath, css.replace(/\r\n/g, '\n'), 'utf8');
fs.writeFileSync(regressionTestPath, regressionTest.replace(/\r\n/g, '\n'), 'utf8');

console.log('丸めガイドのCSS外部化、OGP同期、更新日回帰テストの整合が完了しました。');
