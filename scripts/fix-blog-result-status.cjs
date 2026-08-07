'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'blog/script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

const unsafeLine = "  if (resultStatus) resultStatus.textContent = String(filtered.length) + '件の記事';\n";
const renderTarget = "  filtered.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());\n\n  grid.innerHTML = '';";
const renderReplacement = "  filtered.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());\n\n  if (resultStatus) resultStatus.textContent = String(filtered.length) + '件の記事';\n\n  grid.innerHTML = '';";

const unsafeCount = content.split(unsafeLine).length - 1;
if (unsafeCount !== 1) {
  throw new Error(`初期表示内の誤った件数更新が1件ではありません: ${unsafeCount}`);
}
content = content.replace(unsafeLine, '');

if (!content.includes(renderTarget)) {
  throw new Error('render()内の件数更新挿入位置を特定できませんでした。');
}
content = content.replace(renderTarget, renderReplacement);

const showSkeletonStart = content.indexOf('function showSkeletonLoading()');
const showSkeletonEnd = content.indexOf('\n}\n\nfunction showErrorMessage', showSkeletonStart);
const showSkeletonBody = content.slice(showSkeletonStart, showSkeletonEnd);
if (showSkeletonBody.includes('filtered')) {
  throw new Error('showSkeletonLoading()にfiltered参照が残っています。');
}

const renderStart = content.indexOf('function render()');
const renderEnd = content.indexOf('\n}\n\nfunction renderCategoryButtons', renderStart);
const renderBody = content.slice(renderStart, renderEnd);
if (!renderBody.includes("resultStatus.textContent = String(filtered.length) + '件の記事'")) {
  throw new Error('render()内へ件数更新を移動できませんでした。');
}

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Moved article result count update into render().');
