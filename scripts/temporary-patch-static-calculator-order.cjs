'use strict';

const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'static-calculator-layout.cjs');
let source = fs.readFileSync(file, 'utf8');
const before = `  const positions = [\n    'id="currentStatus"',\n    'id="targetStatus"',\n    'id="neededPoints"',\n    \`id="\${ADVANCED_SETTINGS_ID}"\`,\n    'id="baseRate"',\n    'id="multiplier"',\n    'id="calculateButton"'\n  ].map(token => content.indexOf(token));`;
const after = `  // DOM順はスマホの主要Jobを優先する。デスクトップではCSS orderで\n  // 詳細設定を計算ボタンより先に見せるため、静的HTMLは\n  // 必要ポイント → 計算 → 任意設定 の順を正本とする。\n  const positions = [\n    'id="currentStatus"',\n    'id="targetStatus"',\n    'id="neededPoints"',\n    'id="calculateButton"',\n    \`id="\${ADVANCED_SETTINGS_ID}"\`,\n    'id="baseRate"',\n    'id="multiplier"'\n  ].map(token => content.indexOf(token));`;

if (!source.includes(before)) throw new Error('static calculator order contract target not found');
source = source.replace(before, after);
fs.writeFileSync(file, source, 'utf8');
console.log('Updated static calculator DOM-order contract for mobile-first primary action.');
