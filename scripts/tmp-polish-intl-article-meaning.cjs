'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = [
  'scripts/intl-seo-content.cjs',
  'ko/articles/google-play-points-not-showing.html',
  'tw/articles/google-play-points-promotion-not-applied.html'
];

const replacements = [
  ['대상 결제에 Google Play에 표시된 최종 특별 적립률', 'Google Play에서 대상 결제에 표시된 최종 특별 적립률'],
  ['活動名稱、活動名稱、一般獲點率估算', '活動名稱、一般獲點率估算']
];

let count = 0;
for (const relativePath of files) {
  const absolutePath = path.join(root, relativePath);
  let text = fs.readFileSync(absolutePath, 'utf8');
  const before = text;
  for (const [from, to] of replacements) {
    const matches = text.split(from).length - 1;
    if (matches) {
      text = text.split(from).join(to);
      count += matches;
    }
  }
  if (text !== before) fs.writeFileSync(absolutePath, text);
}

if (count !== 4) {
  throw new Error(`Expected exactly 4 copy-polish replacements, got ${count}`);
}
console.log(`[intl-article-copy-polish] replacements=${count}`);
