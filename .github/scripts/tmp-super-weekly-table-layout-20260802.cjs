'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const articlePath = path.join(root, 'articles/2026-07-31-super-weekly-reward.html');
const cssPath = path.join(root, 'articles/article-modern.css');

let html = fs.readFileSync(articlePath, 'utf8');
html = html.replace('<div class="table-card">\n        <table>', '<div class="table-card reward-comparison" aria-label="週次特典3制度の比較">\n        <table>');

const replacements = [
  ['<tr><td>通常のウィークリーリワード</td><td>シルバー以上</td><td>金曜日</td><td>Play Pointsの「特典」から受け取る通常の週次特典</td></tr>', '<tr><td data-label="種類">通常のウィークリーリワード</td><td data-label="主な対象">シルバー以上</td><td data-label="日本での更新">金曜日</td><td data-label="特徴">Play Pointsの「特典」から受け取る通常の週次特典</td></tr>'],
  ['<tr><td>スーパーウィークリーリワード</td><td>ゴールド以上</td><td>金曜日 午前0時以降</td><td>在庫数がある賞品企画。ステータスや追加条件で内容が異なる場合がある</td></tr>', '<tr><td data-label="種類">スーパーウィークリーリワード</td><td data-label="主な対象">ゴールド以上</td><td data-label="日本での更新">金曜日 午前0時以降</td><td data-label="特徴">在庫数がある賞品企画。ステータスや追加条件で内容が異なる場合がある</td></tr>'],
  ['<tr><td>Play Passの週次ボーナス・ブースター</td><td>対象のPlay Pass加入者など</td><td>木曜日</td><td>Play Pass画面で確認する別制度</td></tr>', '<tr><td data-label="種類">Play Passの週次ボーナス・ブースター</td><td data-label="主な対象">対象のPlay Pass加入者など</td><td data-label="日本での更新">木曜日</td><td data-label="特徴">Play Pass画面で確認する別制度</td></tr>']
];

for (const [before, after] of replacements) {
  if (!html.includes(after)) {
    if (!html.includes(before)) throw new Error(`Could not find expected comparison row: ${before}`);
    html = html.replace(before, after);
  }
}

fs.writeFileSync(articlePath, html, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Mobile card layout for the weekly-benefit comparison. */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n@media (max-width: 600px) {\n    .reward-comparison {\n        overflow: visible;\n        margin: 1rem 0 1.25rem;\n    }\n\n    .reward-comparison table {\n        display: block;\n        width: 100%;\n        max-width: 100%;\n        min-width: 0;\n        table-layout: fixed;\n        border: 0;\n    }\n\n    .reward-comparison thead {\n        position: absolute;\n        width: 1px;\n        height: 1px;\n        padding: 0;\n        margin: -1px;\n        overflow: hidden;\n        clip: rect(0, 0, 0, 0);\n        white-space: nowrap;\n        border: 0;\n    }\n\n    .reward-comparison tbody,\n    .reward-comparison tr,\n    .reward-comparison td {\n        display: block;\n        width: 100%;\n        max-width: 100%;\n        box-sizing: border-box;\n    }\n\n    .reward-comparison tr {\n        margin-bottom: 1rem;\n        overflow: hidden;\n        border: 1px solid var(--border);\n        border-radius: 12px;\n        background: #fff;\n        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);\n    }\n\n    .reward-comparison td {\n        display: grid;\n        grid-template-columns: minmax(6.8rem, 38%) minmax(0, 1fr);\n        gap: 0.75rem;\n        align-items: start;\n        padding: 0.75rem 0.85rem;\n        border: 0;\n        border-bottom: 1px solid var(--border);\n        overflow-wrap: anywhere;\n    }\n\n    .reward-comparison td::before {\n        content: attr(data-label);\n        color: var(--muted);\n        font-size: 0.78rem;\n        font-weight: 800;\n        line-height: 1.5;\n    }\n\n    .reward-comparison td:first-child {\n        display: block;\n        background: var(--brand-soft);\n        color: var(--brand-dark);\n        font-weight: 800;\n    }\n\n    .reward-comparison td:first-child::before {\n        display: none;\n    }\n\n    .reward-comparison td:last-child {\n        border-bottom: 0;\n    }\n}\n`;
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Applied a readable mobile card layout to the weekly-benefit comparison.');
