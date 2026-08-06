'use strict';

const SIMPLIFIED_CALCULATOR_COPY = Object.freeze({
    JP: {
        multiplierLabel: 'キャンペーン倍率（通常は1倍）',
        advancedSummary: '詳細な条件で計算する'
    },
    US: {
        multiplierLabel: 'Campaign multiplier (normally 1×)',
        advancedSummary: 'Use advanced calculation settings'
    },
    KR: {
        multiplierLabel: '캠페인 배율 (보통 1배)',
        advancedSummary: '상세 조건으로 계산하기'
    },
    TW: {
        multiplierLabel: '活動倍率（通常為 1 倍）',
        advancedSummary: '使用進階條件計算'
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
            margin-top: 12px;
        }
    `;
    document.head.appendChild(style);
}

export function updateSimplifiedCalculatorCopy(region) {
    const copy = SIMPLIFIED_CALCULATOR_COPY[region] || SIMPLIFIED_CALCULATOR_COPY.JP;
    const multiplierLabel = document.querySelector('[data-simplified-calculator-copy="multiplierLabel"]');
    const advancedSummary = document.querySelector('[data-simplified-calculator-copy="advancedSummary"]');

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
    const packSettings = statusSection && statusSection.querySelector('.option-settings');

    if (!statusSection || !rateSection || !actionSection || !baseRate || !multiplier || !baseRateLabel || !multiplierLabel) {
        return;
    }

    const multiplierText = multiplierLabel.querySelector('[data-lang-key="labelMultiplier"]');
    if (multiplierText) {
        multiplierText.removeAttribute('data-lang-key');
        multiplierText.dataset.simplifiedCalculatorCopy = 'multiplierLabel';
    }

    statusSection.append(multiplierLabel, multiplier);

    const details = document.createElement('details');
    details.id = 'advanced-calculation-settings';
    details.className = 'advanced-calculation-settings';

    const summary = document.createElement('summary');
    summary.dataset.simplifiedCalculatorCopy = 'advancedSummary';

    const content = document.createElement('div');
    content.className = 'advanced-calculation-content';
    content.append(baseRateLabel, baseRate);
    if (packSettings) content.appendChild(packSettings);

    details.append(summary, content);
    actionSection.appendChild(details);
    rateSection.remove();

    injectSimplifiedCalculatorStyles();
    updateSimplifiedCalculatorCopy(region);
}
