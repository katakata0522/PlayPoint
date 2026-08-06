'use strict';

const SIMPLIFIED_CALCULATOR_COPY = Object.freeze({
    JP: {
        baseRateLabel: '100円あたりの獲得率（自動入力・編集可）',
        multiplierLabel: 'キャンペーン倍率（通常は1倍）',
        advancedSummary: '購入単位まで細かく計算する'
    },
    US: {
        baseRateLabel: 'Points per $1 (auto-filled, editable)',
        multiplierLabel: 'Campaign multiplier (normally 1×)',
        advancedSummary: 'Use purchase-by-purchase calculation'
    },
    KR: {
        baseRateLabel: '₩1,000당 적립률 (자동 입력·수정 가능)',
        multiplierLabel: '캠페인 배율 (보통 1배)',
        advancedSummary: '구매 단위까지 자세히 계산하기'
    },
    TW: {
        baseRateLabel: '每 NT$30 獲得點數（自動帶入，可修改）',
        multiplierLabel: '活動倍率（通常為 1 倍）',
        advancedSummary: '依每次購買金額精細計算'
    }
});

function injectSimplifiedCalculatorStyles() {
    if (document.getElementById('simplified-calculator-styles')) return;

    const style = document.createElement('style');
    style.id = 'simplified-calculator-styles';
    style.textContent = `
        #advanced-calculation-settings {
            margin-top: 14px;
            padding-top: 12px;
            border-top: 1px solid rgba(127, 127, 127, 0.35);
            text-align: left;
        }

        #advanced-calculation-settings summary {
            cursor: pointer;
            font-weight: 600;
            line-height: 1.5;
        }

        #advanced-calculation-settings summary:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 4px;
            border-radius: 4px;
        }

        .advanced-calculation-content {
            margin-top: 14px;
        }

        .advanced-calculation-content .option-settings {
            margin-top: 0;
        }
    `;
    document.head.appendChild(style);
}

export function updateSimplifiedCalculatorCopy(region) {
    const copy = SIMPLIFIED_CALCULATOR_COPY[region] || SIMPLIFIED_CALCULATOR_COPY.JP;
    const baseRateLabel = document.querySelector('[data-simplified-calculator-copy="baseRateLabel"]');
    const multiplierLabel = document.querySelector('[data-simplified-calculator-copy="multiplierLabel"]');
    const advancedSummary = document.querySelector('[data-simplified-calculator-copy="advancedSummary"]');

    if (baseRateLabel) baseRateLabel.textContent = copy.baseRateLabel;
    if (multiplierLabel) multiplierLabel.textContent = copy.multiplierLabel;
    if (advancedSummary) advancedSummary.textContent = copy.advancedSummary;
}

export function simplifyMainCalculatorLayout(region = 'JP') {
    const mainMode = document.getElementById('mainMode');
    if (!mainMode) return;

    const existingAdvancedSettings = document.getElementById('advanced-calculation-settings');
    if (existingAdvancedSettings) {
        updateSimplifiedCalculatorCopy(region);
        return;
    }

    const sections = Array.from(mainMode.children)
        .filter(element => element.classList && element.classList.contains('section'));
    const [statusSection, rateSection, actionSection] = sections;

    const baseRate = document.getElementById('baseRate');
    const multiplier = document.getElementById('multiplier');
    const baseRateLabel = mainMode.querySelector('label[for="baseRate"]');
    const multiplierLabel = mainMode.querySelector('label[for="multiplier"]');
    const rateWarning = rateSection && rateSection.querySelector('.warning');
    const packSettings = statusSection && statusSection.querySelector('.option-settings');

    if (!statusSection || !rateSection || !actionSection || !baseRate || !multiplier || !baseRateLabel || !multiplierLabel) {
        return;
    }

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

    if (packSettings) {
        const details = document.createElement('details');
        details.id = 'advanced-calculation-settings';
        details.className = 'advanced-calculation-settings';

        const summary = document.createElement('summary');
        summary.dataset.simplifiedCalculatorCopy = 'advancedSummary';

        const content = document.createElement('div');
        content.className = 'advanced-calculation-content';
        content.appendChild(packSettings);

        details.append(summary, content);
        actionSection.appendChild(details);
    }

    rateSection.remove();

    injectSimplifiedCalculatorStyles();
    updateSimplifiedCalculatorCopy(region);
}
