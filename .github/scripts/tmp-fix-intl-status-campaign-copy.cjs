'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(content, oldText, newText, label) {
  const first = content.indexOf(oldText);
  if (first < 0) throw new Error(`Missing expected source text: ${label}`);
  if (content.indexOf(oldText, first + oldText.length) >= 0) {
    throw new Error(`Expected exactly one source occurrence: ${label}`);
  }
  return content.slice(0, first) + newText + content.slice(first + oldText.length);
}

function migrateIntlContent() {
  const file = 'scripts/intl-seo-content.cjs';
  let content = read(file);
  const replacements = [
    [
      "['기다릴지 판단', '평소 결제액보다 필요한 금액이 크다면 1배와 캠페인 특별 적립률을 비교하고, 불필요한 지출은 피하는 것이 좋습니다.']",
      "['기다릴지 판단', '평소 결제액보다 필요한 금액이 크다면 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교하고, 불필요한 지출은 피하는 것이 좋습니다.']",
      'Diamond ko section'
    ],
    [
      "['캠페인 특별 적립률을 넣어도 되나요?', '대상 결제가 맞을 때만 넣어 비교하세요. 먼저 1배로 기준을 보는 것이 안전합니다.']",
      "['캠페인 특별 적립률을 넣어도 되나요?', '대상 결제가 맞을 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요. 먼저 현재 등급의 기본 적립률을 기준으로 보는 것이 안전합니다.']",
      'Diamond ko FAQ'
    ],
    [
      "['Compare normal earning with campaigns', 'Run the estimate at 1x first, then compare 2x or 3x only when the purchase is actually eligible. A promotion that does not apply should not change the decision.']",
      "['Compare normal earning with campaigns', 'Start with your normal tier earn rate, then compare the final special earn rate shown in Google Play only when the purchase is actually eligible. A promotion that does not apply should not change the decision.']",
      'Platinum en section'
    ],
    [
      "['Should I wait for a promotion before trying for Platinum?', 'If the purchase can wait and the promotion clearly applies, comparing 1x and 2x or 3x can show whether waiting changes the result.']",
      "['Should I wait for a promotion before trying for Platinum?', 'If the purchase can wait and the promotion clearly applies, compare your normal tier earn rate with the final special earn rate shown in Google Play to see whether waiting changes the result.']",
      'Platinum en FAQ'
    ],
    [
      "summary: ['초기 조건: 골드에서 플래티넘', '추천: 다음 등급을 계획하는 사용자', '확인: 남은 포인트, 배율, 지역 조건']",
      "summary: ['초기 조건: 골드에서 플래티넘', '추천: 다음 등급을 계획하는 사용자', '확인: 남은 포인트, 특별 적립률, 지역 조건']",
      'Platinum ko summary'
    ],
    [
      "['캠페인 특별 적립률 비교', '먼저 1배 기준으로 보고, 실제 대상 결제일 때만 2배 또는 3배를 넣어 비교하는 편이 안전합니다.']",
      "['캠페인 특별 적립률 비교', '먼저 현재 등급의 기본 적립률을 기준으로 보고, 실제 대상 결제일 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하는 편이 안전합니다.']",
      'Platinum ko section'
    ],
    [
      "['캠페인을 기다리는 것이 좋나요?', '예정된 결제가 있고 캠페인 대상이 확실하다면 1배와 2배 또는 3배를 비교해 볼 가치가 있습니다.']",
      "['캠페인을 기다리는 것이 좋나요?', '예정된 결제가 있고 캠페인 대상이 확실하다면 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교해 볼 가치가 있습니다.']",
      'Platinum ko FAQ'
    ],
    [
      "summary: ['預設: 金級到白金', '適合: 規劃下一個等級', '確認: 剩餘點數、倍率、地區條件']",
      "summary: ['預設: 金級到白金', '適合: 規劃下一個等級', '確認: 剩餘點數、特別獲點率、地區條件']",
      'Platinum tw summary'
    ],
    [
      "['比較一般與活動特別獲點率', '先以 1 倍建立基準，只有在該筆消費確定符合活動時，才用 2 倍或 3 倍估算。']",
      "['比較一般與活動特別獲點率', '先以目前等級基本獲點率建立基準，只有在該筆消費確定符合活動時，才輸入 Google Play 顯示的最終特別獲點率進行估算。']",
      'Platinum tw section'
    ],
    [
      "['應該等活動再衝白金嗎？', '如果原本就有計畫消費，且活動資格明確，比較 1 倍與 2 倍或 3 倍會更好判斷。']",
      "['應該等活動再衝白金嗎？', '如果原本就有計畫消費，且活動資格明確，比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率會更好判斷。']",
      'Platinum tw FAQ'
    ],
    [
      "['Compare before waiting for a campaign', 'Run a 1x estimate first, then compare 2x or 3x only when the purchase is eligible and useful.']",
      "['Compare before waiting for a campaign', 'Start with your normal tier earn rate, then compare the final special earn rate shown in Google Play only when the purchase is eligible and useful.']",
      'Gold en section'
    ],
    [
      "['캠페인 전후 비교', '먼저 1배 기준을 보고, 실제 대상 결제일 때만 2배 또는 3배를 넣어 비교하세요.']",
      "['캠페인 전후 비교', '먼저 현재 등급의 기본 적립률을 기준으로 보고, 실제 대상 결제일 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요.']",
      'Gold ko section'
    ],
    [
      "['比較活動前後', '先以 1 倍建立基準，只有在消費確定符合活動時，才用 2 倍或 3 倍估算。']",
      "['比較活動前後', '先以目前等級基本獲點率建立基準，只有在消費確定符合活動時，才輸入 Google Play 顯示的最終特別獲點率估算。']",
      'Gold tw section'
    ],
    [
      "description: 'Compare regular, 2x, and 3x Google Play Points earning to decide whether waiting for a promotion is worth it.'",
      "description: 'Compare your normal tier earn rate with the final special earn rate shown by an eligible Google Play promotion to decide whether waiting is worth it.'",
      'Wait en description'
    ],
    [
      "['Start with the 1x baseline', 'If the target is already reasonable at 1x, a promotion is a timing bonus rather than a requirement.']",
      "['Start with your normal tier earn rate', 'If the target is already reasonable at your normal tier earn rate, a promotion is a timing bonus rather than a requirement.']",
      'Wait en baseline'
    ],
    [
      "['Use 2x or 3x only for eligible purchases', 'A multiplier should be entered only when the offer clearly applies to the planned purchase.']",
      "['Use a special earn rate only for eligible purchases', 'Enter only the final special earn rate shown in Google Play when the offer clearly applies to the planned purchase.']",
      'Wait en input'
    ],
    [
      "['What should I compare first?', 'Compare 1x, then 2x, then 3x with the same missing-point target.']",
      "['What should I compare first?', 'Use the same missing-point target and compare your normal tier earn rate with the final special earn rate shown in Google Play.']",
      'Wait en FAQ'
    ],
    [
      "description: 'Google Play Points 캠페인을 기다릴지 지금 결제할지, 1배·2배·3배 예상치와 남은 포인트 기준으로 한국어로 비교합니다.'",
      "description: 'Google Play Points 캠페인을 기다릴지 지금 결제할지, 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률, 남은 포인트를 기준으로 한국어로 비교합니다.'",
      'Wait ko description'
    ],
    [
      "summary: ['초기 조건: 캠페인 대기 비교', '추천: 예정된 결제', '확인: 1배, 2배, 3배와 대상 조건']",
      "summary: ['초기 조건: 캠페인 대기 비교', '추천: 예정된 결제', '확인: 기본 적립률, 최종 특별 적립률, 대상 조건']",
      'Wait ko summary'
    ],
    [
      "['1배 기준부터 보기', '1배에서도 목표가 현실적이라면 캠페인은 필수가 아니라 시점 조정입니다.']",
      "['현재 등급 기본 적립률부터 보기', '현재 등급의 기본 적립률에서도 목표가 현실적이라면 캠페인은 필수가 아니라 시점 조정입니다.']",
      'Wait ko baseline'
    ],
    [
      "['대상 결제일 때만 배율 사용', '캠페인 조건이 명확한 예정 결제에만 2배나 3배를 넣어 비교하세요.']",
      "['대상 결제일 때만 특별 적립률 사용', '캠페인 조건이 명확한 예정 결제에만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요.']",
      'Wait ko input'
    ],
    [
      "['무엇부터 비교하나요?', '같은 부족 포인트로 1배, 2배, 3배를 차례로 비교하세요.']",
      "['무엇부터 비교하나요?', '같은 부족 포인트로 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교하세요.']",
      'Wait ko FAQ'
    ],
    [
      "description: '比較 Google Play Points 活動前後是否應該等待，用 1 倍、2 倍、3 倍估算判斷升級所需金額。'",
      "description: '比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率，判斷等待 Google Play Points 活動是否值得。'",
      'Wait tw description'
    ],
    [
      "['先看 1 倍基準', '如果 1 倍時目標已經合理，活動只是時機優化，不是必要條件。']",
      "['先看目前等級基本獲點率', '如果以目前等級基本獲點率估算時目標已經合理，活動只是時機優化，不是必要條件。']",
      'Wait tw baseline'
    ],
    [
      "['只有符合資格才輸入倍率', '只有在該筆計畫消費明確符合活動時，才用 2 倍或 3 倍比較。']",
      "['只有符合資格才輸入特別獲點率', '只有在該筆計畫消費明確符合活動時，才輸入 Google Play 顯示的最終特別獲點率比較。']",
      'Wait tw input'
    ],
    [
      "['先比較什麼？', '用同一個剩餘點數目標，依序比較 1 倍、2 倍、3 倍。']",
      "['先比較什麼？', '用同一個剩餘點數目標，比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率。']",
      'Wait tw FAQ'
    ]
  ];

  for (const [oldText, newText, label] of replacements) {
    content = replaceOnce(content, oldText, newText, label);
  }
  write(file, content);
}

function migrateContentDates() {
  const file = 'scripts/content-dates.cjs';
  let content = read(file);
  const anchor = "const GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-18';\n";
  const addition = `${anchor}const GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES = Object.freeze({\n  'diamond:ko': '2026-08-21',\n  'platinum:en': '2026-08-21',\n  'platinum:ko': '2026-08-21',\n  'platinum:tw': '2026-08-21',\n  'gold:en': '2026-08-21',\n  'gold:ko': '2026-08-21',\n  'gold:tw': '2026-08-21',\n  'campaignWait:en': '2026-08-21',\n  'campaignWait:ko': '2026-08-21',\n  'campaignWait:tw': '2026-08-21'\n});\n\nfunction getGeneratedIntlPageContentDate(pageKey, localeKey) {\n  return GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES[\`${pageKey}:${localeKey}\`] || GENERATED_INTL_PAGE_CONTENT_DATE;\n}\n`;
  content = replaceOnce(content, anchor, addition, 'international content-date map');
  content = replaceOnce(
    content,
    "  GENERATED_INTL_PAGE_CONTENT_DATE,\n",
    "  GENERATED_INTL_PAGE_CONTENT_DATE,\n  GENERATED_INTL_PAGE_CONTENT_DATE_OVERRIDES,\n",
    'content-date map export'
  );
  content = replaceOnce(
    content,
    "  getContentDateForFile,\n",
    "  getContentDateForFile,\n  getGeneratedIntlPageContentDate,\n",
    'content-date getter export'
  );
  write(file, content);
}

function migrateIntlGenerator() {
  const file = 'scripts/intl-seo-pages.cjs';
  let content = read(file);
  content = replaceOnce(
    content,
    "const { GENERATED_INTL_PAGE_CONTENT_DATE } = require('./content-dates.cjs');",
    "const { getGeneratedIntlPageContentDate } = require('./content-dates.cjs');",
    'generator content-date import'
  );
  content = replaceOnce(
    content,
    'function renderSeoPage(localeKey, pageKey, assetVersions, contentModifiedAt = GENERATED_INTL_PAGE_CONTENT_DATE) {',
    'function renderSeoPage(localeKey, pageKey, assetVersions, contentModifiedAt = getGeneratedIntlPageContentDate(pageKey, localeKey)) {',
    'renderSeoPage content date'
  );
  content = replaceOnce(
    content,
    "      entries.push({ url: pageUrl(localeKey, PAGE_TYPES[pageKey].slug), lastmod: GENERATED_INTL_PAGE_CONTENT_DATE });",
    "      entries.push({ url: pageUrl(localeKey, PAGE_TYPES[pageKey].slug), lastmod: getGeneratedIntlPageContentDate(pageKey, localeKey) });",
    'sitemap per-page content date'
  );
  write(file, content);
}

migrateIntlContent();
migrateContentDates();
migrateIntlGenerator();
console.log('Applied one-shot international Status/Campaign earn-rate source migration.');
