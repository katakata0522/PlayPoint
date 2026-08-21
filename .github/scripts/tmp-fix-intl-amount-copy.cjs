'use strict';

const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(__dirname, '../../scripts/intl-seo-content.cjs');
let content = fs.readFileSync(file, 'utf8');

function replaceOnce(oldText, newText, label) {
  const first = content.indexOf(oldText);
  if (first < 0) throw new Error(`Missing expected source text: ${label}`);
  if (content.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`Expected exactly one source occurrence: ${label}`);
  }
  content = content.slice(0, first) + newText + content.slice(first + oldText.length);
}

replaceOnce(
  "summary: ['Preset: reverse mode', 'Best for: spend-to-points planning', 'Check: status, multiplier, eligible amount']",
  "summary: ['Preset: reverse mode', 'Best for: spend-to-points planning', 'Check: status, special earn rate, eligible amount']",
  'Amount en summary'
);
replaceOnce(
  "['Use reverse mode', 'This page opens the calculator with amount-based input. Change the status and multiplier to match your account.']",
  "['Use reverse mode', 'This page opens the calculator with amount-based input. Change the status and special earn rate to match your account.']",
  'Amount en section'
);
replaceOnce(
  "summary: ['초기 조건: 역산 모드', '추천: 금액에서 포인트를 보고 싶은 경우', '확인: 등급, 배율, 대상 금액']",
  "summary: ['초기 조건: 역산 모드', '추천: 금액에서 포인트를 보고 싶은 경우', '확인: 등급, 특별 적립률, 대상 금액']",
  'Amount ko summary'
);
replaceOnce(
  "['역산 모드 사용', '금액을 기준으로 예상 포인트를 계산합니다. 실제 등급과 배율에 맞게 바꾸세요.']",
  "['역산 모드 사용', '금액을 기준으로 예상 포인트를 계산합니다. 실제 등급과 특별 적립률에 맞게 바꾸세요.']",
  'Amount ko section'
);
replaceOnce(
  "summary: ['預設: 反推模式', '適合: 從金額估點數', '確認: 等級、倍率、適用金額']",
  "summary: ['預設: 反推模式', '適合: 從金額估點數', '確認: 等級、特別獲點率、適用金額']",
  'Amount tw summary'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Applied one-shot international Amount earn-rate source migration.');
