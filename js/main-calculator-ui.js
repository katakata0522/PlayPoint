'use strict';

const SIMPLIFIED_CALCULATOR_COPY = Object.freeze({
    JP: {
        baseRateLabel: '通常獲得率（自動入力・編集可）',
        multiplierLabel: 'キャンペーン特別獲得率（例：3pt/100円）'
    },
    US: {
        baseRateLabel: 'Base earn rate per $1 (auto-filled, editable)',
        multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / $1)'
    },
    KR: {
        baseRateLabel: '기본 적립률 (자동 입력·수정 가능)',
        multiplierLabel: '캠페인 특별 적립률 (예: 1,000원당 3pt)'
    },
    TW: {
        baseRateLabel: '基本獲點率（自動帶入，可修改）',
        multiplierLabel: '活動特別獲點率（例：每 NT$30 3 點）'
    }
});

export function updateSimplifiedCalculatorCopy(region) {
    const copy = SIMPLIFIED_CALCULATOR_COPY[region] || SIMPLIFIED_CALCULATOR_COPY.JP;
    const baseRateLabel = document.querySelector('[data-simplified-calculator-copy="baseRateLabel"]');
    const multiplierLabel = document.querySelector('[data-simplified-calculator-copy="multiplierLabel"]');

    if (baseRateLabel) baseRateLabel.textContent = copy.baseRateLabel;
    if (multiplierLabel) multiplierLabel.textContent = copy.multiplierLabel;
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