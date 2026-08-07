'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'blog/script.js');
let content = fs.readFileSync(scriptPath, 'utf8');

const skeletonStart = content.indexOf('    function showSkeletonLoading() {');
const skeletonEnd = content.indexOf('\n    // Intersection Observer for Scroll Fade-In', skeletonStart);
if (skeletonStart < 0 || skeletonEnd < 0) {
  throw new Error('showSkeletonLoading()の範囲を特定できませんでした。');
}

const skeletonBody = content.slice(skeletonStart, skeletonEnd);
const unsafePattern = /^\s*if \(dom\.resultStatus\) \{[^\n]*filtered\.length[^\n]*\}\r?\n/m;
if (!unsafePattern.test(skeletonBody)) {
  throw new Error('初期表示内の誤った件数更新を特定できませんでした。');
}
const cleanedSkeletonBody = skeletonBody.replace(unsafePattern, '');
content = content.slice(0, skeletonStart) + cleanedSkeletonBody + content.slice(skeletonEnd);

const renderTarget = "        } else {\n            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));\n        }\n\n        // 3. Paginate";
const renderReplacement = "        } else {\n            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));\n        }\n\n        if (dom.resultStatus) {\n            const label = currentCategory === 'all' ? 'すべて' : currentCategory;\n            dom.resultStatus.textContent = (currentSearch ? '「' + currentSearch + '」の検索結果：' : label + 'の記事：') + filtered.length + '件';\n        }\n\n        // 3. Paginate";

if (!content.includes(renderTarget)) {
  throw new Error('render()内の件数更新挿入位置を特定できませんでした。');
}
content = content.replace(renderTarget, renderReplacement);

const verifiedSkeleton = content.slice(
  content.indexOf('    function showSkeletonLoading() {'),
  content.indexOf('\n    // Intersection Observer for Scroll Fade-In')
);
if (verifiedSkeleton.includes('filtered')) {
  throw new Error('showSkeletonLoading()にfiltered参照が残っています。');
}

const renderStart = content.indexOf('    function render() {');
const renderEnd = content.indexOf('\n    function renderPagination(', renderStart);
const renderBody = content.slice(renderStart, renderEnd);
if (!renderBody.includes("dom.resultStatus.textContent = (currentSearch ? '「' + currentSearch + '」の検索結果：' : label + 'の記事：') + filtered.length + '件'")) {
  throw new Error('render()内へ件数更新を移動できませんでした。');
}

fs.writeFileSync(scriptPath, content, 'utf8');
console.log('Moved article result count update into render().');
