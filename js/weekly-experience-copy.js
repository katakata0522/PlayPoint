'use strict';

export const WEEKLY_EXPERIENCE_COPY = Object.freeze({
    JP: Object.freeze({
        hint: '数字と景品を確認して「結果を記録」を押すと記録されます',
        largeValueHint: '本当に…？（このままの値でも記録に残せます）',
        weekGain: '今週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '月別ポイント',
        shareAria: 'この週の結果をXで共有',
        shareText: 'Xで共有',
        saved: '記録済み ✓',
        edit: '編集',
        unsaved: '未保存の変更',
        saveChanges: '変更を保存',
        yearBest: '今年いちばん✨',
        nextReward: '次のウィークリー',
        calendarCta: 'Googleカレンダーに登録'
    }),
    US: Object.freeze({
        hint: 'Enter the result, then press Record result to add it to your record',
        largeValueHint: 'Really…? (You can still record this value as entered.)',
        weekGain: 'This week',
        yearTotal: (year) => `${year} total`,
        chartLabel: 'Monthly points',
        shareAria: 'Share this week’s result on X',
        shareText: 'Share on X',
        saved: 'Recorded ✓',
        edit: 'Edit',
        unsaved: 'Unsaved changes',
        saveChanges: 'Save changes',
        yearBest: 'Year best ✨',
        nextReward: 'Next weekly reward',
        calendarCta: 'Add to Google Calendar'
    }),
    IN: Object.freeze({
        hint: 'Enter the result, then press Record result to add it to your record',
        largeValueHint: 'Really…? (You can still record this value as entered.)',
        weekGain: 'This week',
        yearTotal: (year) => `${year} total`,
        chartLabel: 'Monthly points',
        shareAria: 'Share this week’s result on X',
        shareText: 'Share on X',
        saved: 'Recorded ✓',
        edit: 'Edit',
        unsaved: 'Unsaved changes',
        saveChanges: 'Save changes',
        yearBest: 'Year best ✨',
        nextReward: 'Next weekly reward',
        calendarCta: 'Add to Google Calendar'
    }),
    KR: Object.freeze({
        hint: '숫자와 리워드를 확인한 뒤 ‘결과 기록’을 누르면 기록됩니다',
        largeValueHint: '정말…? (이 값 그대로도 기록할 수 있습니다.)',
        weekGain: '이번 주',
        yearTotal: (year) => `${year}년 누적`,
        chartLabel: '월별 포인트',
        shareAria: '이번 주 결과를 X에 공유',
        shareText: 'X에 공유',
        saved: '기록 완료 ✓',
        edit: '수정',
        unsaved: '저장되지 않은 변경',
        saveChanges: '변경 저장',
        yearBest: '올해 최고✨',
        nextReward: '다음 주간 리워드',
        calendarCta: 'Google 캘린더에 등록'
    }),
    TW: Object.freeze({
        hint: '確認點數與獎品後，按「記錄結果」才會寫入記錄',
        largeValueHint: '真的…？（這個數值也可以直接保留並記錄。）',
        weekGain: '本週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '每月點數',
        shareAria: '在 X 分享本週結果',
        shareText: '分享到 X',
        saved: '已記錄 ✓',
        edit: '編輯',
        unsaved: '尚未儲存的變更',
        saveChanges: '儲存變更',
        yearBest: '今年最高✨',
        nextReward: '下次每週獎勵',
        calendarCta: '新增至 Google 日曆'
    }),
    HK: Object.freeze({
        hint: '確認點數與獎品後，按「記錄結果」才會寫入記錄',
        largeValueHint: '真的…？（這個數值也可以直接保留並記錄。）',
        weekGain: '本週',
        yearTotal: (year) => `${year}年累計`,
        chartLabel: '每月點數',
        shareAria: '在 X 分享本週結果',
        shareText: '分享到 X',
        saved: '已記錄 ✓',
        edit: '編輯',
        unsaved: '尚未儲存的變更',
        saveChanges: '儲存變更',
        yearBest: '今年最高✨',
        nextReward: '下次每週獎勵',
        calendarCta: '新增至 Google 日曆'
    })
});

export function getWeeklyExperienceCopy(region) {
    return WEEKLY_EXPERIENCE_COPY[region] || WEEKLY_EXPERIENCE_COPY.JP;
}
