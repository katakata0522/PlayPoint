'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = 'scripts/intl-seo-content.cjs';
const contentDate = '2026-08-21';

const replacements = [
  // English: calculator instructions must use normal earn rate vs final special earn rate.
  ["Use the calculator at 1x first, then run the same amount with the campaign multiplier that you believe applied.", "Use the calculator with your current tier's normal earn rate first, then run the same amount with the final special earn rate shown for that eligible purchase in Google Play."],
  ["Use the calculator at 1x first, then run the same amount with the campaign special earn rate that you believe applied.", "Use the calculator with your current tier's normal earn rate first, then run the same amount with the final special earn rate shown for that eligible purchase in Google Play."],
  ["A 1x estimate gives you a calm baseline.", "An estimate using your current tier's normal earn rate gives you a calm baseline."],
  ["Enter the points you still need, then compare the amount under your current status and multiplier.", "Enter the points you still need, then compare the amount using your current tier's normal earn rate and, when applicable, the final special earn rate shown in Google Play."],
  ["Weekly and monthly views are helpful because they turn one large number into a habit-sized number.", "The monthly amount and overall remaining-time pace are helpful because they turn one large number into a more practical plan."],
  ["Always compare the 1x estimate first.", "Always start with your current tier's normal earn rate."],
  ["If the target makes no sense at 1x and only barely works under a narrow campaign", "If the target makes no sense at the normal earn rate and only barely works under a narrow campaign"],
  ["depends on current status, missing points, multiplier, and whether purchases are eligible.", "depends on current status, missing points, the applicable earn rate, and whether purchases are eligible."],
  ["normal earning rate, and the multiplier you can honestly use.", "normal earning rate, and any final special earn rate shown for an eligible purchase in Google Play."],
  ["Estimate at 1x before checking campaigns", "Start with the normal earn rate before checking campaigns"],
  ["A 1x estimate gives you the baseline cost.", "An estimate using your current tier's normal earn rate gives you the baseline cost."],
  ["After that, test 2x or 3x only if a real campaign applies to the purchase you already planned.", "After that, use the final special earn rate shown in Google Play only if a real 2x or 3x campaign applies to the purchase you already planned."],
  ["Translate the result into weekly or monthly pace", "Translate the result into a monthly or remaining-time pace"],
  ["Break it into the remaining weeks or months of the status period", "Compare it with the remaining months or days in the status period"],
  ["compare the result at 1x.", "compare the result using your current tier's normal earn rate."],
  ["Run the same amount at 1x, then run it with the campaign special earn rate.", "Run the same amount at your current tier's normal earn rate, then run it with the final special earn rate shown for the eligible purchase in Google Play."],
  ["calculate the subscription at 1x first.", "calculate the subscription using your current tier's normal earn rate first."],
  ["Run the calculator at 1x first.", "Start with your current tier's normal earn rate."],
  ["Compare the normal 1x path first.", "Compare the current tier's normal earn-rate path first."],
  ["same thresholds and multipliers.", "same thresholds and earning-rate structure."],
  ["multiplier events can significantly reduce the required spending.", "eligible special earn-rate promotions can significantly reduce the required spending."],
  ["missing points, status rate, and multiplier.", "missing points, your current tier's normal earn rate, and any final special earn rate shown in Google Play."],
  ["adjust status, missing points, and multiplier yourself.", "adjust status and missing points, then enter the final special earn rate shown for an eligible purchase when applicable."],
  ["same reward, multiplier, or redemption option", "same reward, special earn rate, or redemption option"],
  ["A multiplier can improve the timing of a planned purchase, but it does not create a guaranteed return.", "An eligible special earn rate can improve the timing of a planned purchase, but it does not create a guaranteed return."],

  // Korean.
  ["먼저 1배 기준으로 예상치를 보고, 실제로 적용된다고 생각한 배율을 따로 비교하세요.", "먼저 현재 등급의 일반 적립률로 예상치를 보고, 대상 결제에 Google Play에 표시된 최종 특별 적립률이 있다면 그 값을 따로 비교하세요."],
  ["현재 등급, 목표까지 부족한 포인트, 적용할 배율을 차례로 넣고 비교하세요.", "현재 등급과 목표까지 부족한 포인트를 입력하고, 대상 결제에 Google Play에 표시된 최종 특별 적립률이 있다면 그 값을 비교하세요."],
  ["남은 기간을 주 단위나 월 단위로 나누면 실제 생활에서 감당 가능한 금액인지 더 잘 보입니다.", "남은 기간의 월별 금액과 전체 페이스를 함께 보면 실제 생활에서 감당 가능한지 더 잘 보입니다."],
  ["먼저 1배 기준을 보고, 캠페인 조건이 분명할 때만 배율을 바꿔 비교하세요.", "먼저 현재 등급의 일반 적립률을 보고, 캠페인 조건이 분명할 때만 Google Play에 표시된 최종 특별 적립률을 비교하세요."],
  ["먼저 1배 기준으로 필요한 포인트와 금액을 계산하고, 실제 캠페인 조건을 확인한 뒤에만 배율을 넣어 비교하세요.", "먼저 현재 등급의 일반 적립률로 필요한 포인트와 금액을 계산하고, 실제 캠페인 조건을 확인한 뒤 Google Play에 표시된 최종 특별 적립률만 비교하세요."],
  ["계산기에서는 같은 금액을 1배와 캠페인 특별 적립률로 나누어 비교하세요.", "계산기에서는 같은 금액을 현재 등급의 일반 적립률과 Google Play에 표시된 최종 특별 적립률로 나누어 비교하세요."],
  ["1배 예상치, 캠페인 특별 적립률 예상치", "일반 적립률 예상치, 최종 특별 적립률 예상치"],
  ["계산기에서는 먼저 1배 기준을 보고, 공식 화면에 명확한 배율이 있을 때만 캠페인 값을 비교하세요.", "계산기에서는 먼저 현재 등급의 일반 적립률을 보고, 공식 화면에 최종 특별 적립률이 명확히 표시된 경우에만 그 값을 비교하세요."],
  ["먼저 1배 기준을 계산하고 내 계정에 표시된 적립률을 비교하세요.", "먼저 현재 등급의 일반 적립률로 계산하고, 내 계정에 표시된 최종 특별 적립률이 있다면 그 값을 비교하세요."],
  ["부족 포인트, 현재 적립률, 표시된 배율로 계산하는 방법", "부족 포인트, 현재 등급의 일반 적립률, Google Play에 표시된 최종 특별 적립률로 계산하는 방법"],
  ["배율은 예정 구매의 시점을 개선할 뿐, 확정 수익을 만들지는 않습니다.", "대상 구매에 적용되는 최종 특별 적립률은 예정 구매의 시점을 개선할 수 있지만, 확정 수익을 만들지는 않습니다."],

  // Traditional Chinese.
  ["可以先用 1 倍估算基準，再用你認為適用的倍率比較。", "可以先用目前等級的一般獲點率估算，再用 Google Play 對符合資格購買顯示的最終活動特別獲點率比較。"],
  ["先看 1 倍基準，再看活動特別獲點率。", "先看目前等級的一般獲點率，再看 Google Play 顯示的最終活動特別獲點率。"],
  ["請先用 1 倍估算基準，再確認活動是否明確適用該筆購買。", "請先用目前等級的一般獲點率估算，再確認活動是否明確適用該筆購買。"],
  ["用計算機先估 1 倍結果，再估 2 倍或 3 倍結果。", "用計算機先依目前等級的一般獲點率估算，再依 Google Play 顯示的最終活動特別獲點率估算。"],
  ["預期倍率、1 倍估算、活動特別獲點率估算", "活動名稱、一般獲點率估算、最終活動特別獲點率估算"],
  ["計算時先看 1 倍基準，只有官方畫面明確顯示倍率時才加入活動比較。", "計算時先看目前等級的一般獲點率，只有官方畫面明確顯示最終活動特別獲點率時才加入比較。"],
  ["不足點數、目前積點率與帳號顯示倍率來計算的方法", "不足點數、目前等級的一般獲點率與 Google Play 顯示的最終活動特別獲點率來計算的方法"],
  ["把總金額拆成每週或每月節奏", "把總金額換成每月或剩餘期間的節奏"],
  ["把它除以剩餘週數或月份後，就能看出是否符合平常的 App、遊戲、訂閱或書籍消費。", "把它和剩餘月份或天數對照後，就能看出是否符合平常的 App、遊戲、訂閱或書籍消費。"],
  ["倍率只改善原定消費的時機，不代表固定回收。", "符合資格購買的最終活動特別獲點率可以改善原定消費的時機，但不代表固定回收。"]
];

function listHtmlArticles() {
  const files = [];
  for (const locale of ['en', 'ko', 'tw']) {
    const dir = path.join(root, locale, 'articles');
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.html')) files.push(`${locale}/articles/${name}`);
    }
  }
  return files;
}

function bumpHtmlModifiedDate(html) {
  html = html.replace(/(<meta name="last-modified" content=")\d{4}-\d{2}-\d{2}("\s*\/?>)/g, `$1${contentDate}$2`);
  html = html.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(")/g, `$1${contentDate}$2`);
  html = html.replace(/(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}(T[^\"]+">)/g, `$1${contentDate}$2`);
  html = html.replace(/(Updated\s+)\d{4}-\d{2}-\d{2}/g, `$1${contentDate}`);
  html = html.replace(/(업데이트\s+)\d{4}-\d{2}-\d{2}/g, `$1${contentDate}`);
  html = html.replace(/(更新日期[:：]?\s*)\d{4}-\d{2}-\d{2}/g, `$1${contentDate}`);
  html = html.replace(/(更新\s+)\d{4}-\d{2}-\d{2}/g, `$1${contentDate}`);
  return html;
}

function bumpSourceDate(source, relativePath) {
  const escaped = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mapPattern = new RegExp(`('${escaped}': \\{ publishedAt: '[^']+', modifiedAt: ')[^']+(' \\})`);
  source = source.replace(mapPattern, `$1${contentDate}$2`);

  const manualPattern = new RegExp(`(file: '${escaped}',[\\s\\S]{0,260}?modifiedAt: ')[^']+(')`);
  source = source.replace(manualPattern, `$1${contentDate}$2`);
  return source;
}

const files = [sourcePath, ...listHtmlArticles()];
const changedArticles = new Set();
let totalReplacements = 0;

for (const relativePath of files) {
  const absolutePath = path.join(root, relativePath);
  let text = fs.readFileSync(absolutePath, 'utf8');
  const before = text;

  for (const [oldText, newText] of replacements) {
    if (!text.includes(oldText)) continue;
    const count = text.split(oldText).length - 1;
    text = text.split(oldText).join(newText);
    totalReplacements += count;
  }

  if (text !== before) {
    if (relativePath !== sourcePath) {
      text = bumpHtmlModifiedDate(text);
      changedArticles.add(relativePath);
    }
    fs.writeFileSync(absolutePath, text);
  }
}

let source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
for (const relativePath of changedArticles) source = bumpSourceDate(source, relativePath);
fs.writeFileSync(path.join(root, sourcePath), source);

if (totalReplacements < 15) {
  throw new Error(`Expected a broad but targeted article cleanup; only ${totalReplacements} replacements were made.`);
}

console.log(`[intl-article-meaning] replacements=${totalReplacements}`);
console.log(`[intl-article-meaning] changed articles=${[...changedArticles].sort().join(', ')}`);
