'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const cssPath = path.join(root, 'articles', 'styles', '2026-07-24-play-points-1-value.css');

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

if (/<style(?:\s|>)/i.test(html)) throw new Error('記事にinline styleが残っています。');
if (!html.includes('./styles/2026-07-24-play-points-1-value.css')) {
  throw new Error('記事別CSSへの参照を追加できませんでした。');
}

fs.writeFileSync(articlePath, html.replace(/\r\n/g, '\n'), 'utf8');
fs.writeFileSync(cssPath, css.replace(/\r\n/g, '\n'), 'utf8');

console.log('丸めガイドのCSS外部化とOGP同期が完了しました。');
