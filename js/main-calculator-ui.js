'use strict';

const SIMPLIFIED_CALCULATOR_COPY = Object.freeze({
    JP: {
        neededPointsHint: 'Google Playの「あと○ポイント」を入力。交換用の残高とは別です。達成済みは0を入力できます。',
        baseRateLabel: '通常獲得率（自動入力・編集可）',
        multiplierLabel: 'キャンペーン特別獲得率（例：3pt/100円）'
    },
    US: {
        neededPointsHint: 'Enter the points to your next level shown in Google Play, not your redeemable points balance. Enter 0 if already reached.',
        baseRateLabel: 'Base earn rate per $1 (auto-filled, editable)',
        multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / $1)'
    },
    KR: {
        neededPointsHint: 'Google Play에 표시된 다음 등급까지 남은 포인트를 입력하세요. 교환 가능한 잔액과는 다릅니다. 이미 달성했다면 0을 입력할 수 있습니다.',
        baseRateLabel: '기본 적립률 (자동 입력·수정 가능)',
        multiplierLabel: '캠페인 특별 적립률 (예: 1,000원당 3pt)'
    },
    TW: {
        neededPointsHint: '輸入 Google Play 顯示的距離目標等級尚需點數，不是可兌換的點數餘額。已達標時可輸入 0。',
        baseRateLabel: '基本獲點率（自動帶入，可修改）',
        multiplierLabel: '活動特別獲點率（例：每 NT$30 3 點）'
    },
    HK: {
        neededPointsHint: '輸入 Google Play 顯示的距離目標等級尚需點數，不是可兌換的點數餘額。已達標時可輸入 0。',
        baseRateLabel: '每 HK$7 獲得點數（自動帶入，可修改）',
        multiplierLabel: '活動特別獲點率（例：每 HK$7 3 點）'
    },
    IN: {
        neededPointsHint: 'Enter the points to your next level shown in Google Play, not your redeemable points balance. Enter 0 if already reached.',
        baseRateLabel: 'Points per ₹5 (auto-filled, editable)',
        multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / ₹5)'
    }
});

const FIRST_VIEW_INTRO_COPY = Object.freeze({
    JP: '目標ランクまであといくら必要か、現在のステータスと必要ポイントから計算できます。'
});

export function updateSimplifiedCalculatorCopy(region) {
    const copy = SIMPLIFIED_CALCULATOR_COPY[region] || SIMPLIFIED_CALCULATOR_COPY.JP;
    const baseRateLabel = document.querySelector('[data-simplified-calculator-copy="baseRateLabel"]');
    const multiplierLabel = document.querySelector('[data-simplified-calculator-copy="multiplierLabel"]');
    const siteDescription = document.getElementById('site-description');
    const neededPoints = document.getElementById('neededPoints');
    if (neededPoints) {
        let hint = document.getElementById('needed-points-hint');
        if (!hint) {
            hint = document.createElement('p');
            hint.id = 'needed-points-hint';
            hint.className = 'rounding-assumption-note';
            neededPoints.after(hint);
        }
        hint.textContent = copy.neededPointsHint;
        const describedBy = new Set((neededPoints.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        describedBy.add(hint.id);
        neededPoints.setAttribute('aria-describedby', [...describedBy].join(' '));
    }

    if (baseRateLabel) baseRateLabel.textContent = copy.baseRateLabel;
    if (multiplierLabel) multiplierLabel.textContent = copy.multiplierLabel;
    if (siteDescription && FIRST_VIEW_INTRO_COPY[region]) {
        siteDescription.textContent = FIRST_VIEW_INTRO_COPY[region];
    }
}

export function simplifyMainCalculatorLayout(region = 'JP') {
    const mainMode = document.getElementById('mainMode');
    if (!mainMode) return;

    if (mainMode.dataset.visibleBaseRateLayout === 'true') {
        updateSimplifiedCalculatorCopy(region);
        return;
    }

    const sections = Array.from(mainMode.children)
        .filter(element => element.classList && element.classList.contains('section'));
    const [statusSection, rateSection] = sections;

    const baseRate = document.getElementById('baseRate');
    const multiplier = document.getElementById('multiplier');
    const baseRateLabel = mainMode.querySelector('label[for="baseRate"]');
    const multiplierLabel = mainMode.querySelector('label[for="multiplier"]');
    const rateWarning = rateSection && rateSection.querySelector('.warning');
    const packSettings = statusSection && statusSection.querySelector('.option-settings');

    if (!statusSection || !rateSection || !baseRate || !multiplier || !baseRateLabel || !multiplierLabel) return;

    const baseRateText = baseRateLabel.querySelector('[data-lang-key="labelBaseRate"]');
    if (baseRateText) {
        baseRateText.removeAttribute('data-lang-key');
        baseRateText.dataset.simplifiedCalculatorCopy = 'baseRateLabel';
    }

    const multiplierText = multiplierLabel.querySelector('[data-lang-key="labelMultiplier"]');
    if (multiplierText) {
        multiplierText.removeAttribute('data-lang-key');
        multiplierText.dataset.simplifiedCalculatorCopy = 'multiplierLabel';
    }

    statusSection.append(baseRateLabel, baseRate, multiplierLabel, multiplier);
    if (rateWarning) statusSection.appendChild(rateWarning);
    if (packSettings) packSettings.remove();

    rateSection.remove();
    mainMode.dataset.visibleBaseRateLayout = 'true';
    updateSimplifiedCalculatorCopy(region);
}
