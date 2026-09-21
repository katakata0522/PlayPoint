'use strict';

// 表示用HTMLだけを生成する。計算・DOM更新・共有データ保存・計測は行わない。
export function renderCurrencyAmount(value, config) {
    const amountMarkup = `<span class="count-target result-amount__value" data-value="${value}">0</span>`;
    const unitMarkup = `<span class="result-amount__unit">${config.currencySymbol}</span>`;
    const inner = config.currencyPosition === 'prefix'
        ? `${unitMarkup}${amountMarkup}`
        : `${amountMarkup}${unitMarkup}`;
    return `<span class="result-amount">${inner}</span>`;
}

function renderPointsAmount(value, unit = 'pt') {
    return `<span class="result-amount"><span class="count-target result-amount__value" data-value="${value}">0</span><span class="result-amount__unit">${unit}</span></span>`;
}

function renderResultHero({ label, approxLabel = '', amountHtml, metaHtml = '', paceHtml = '' }) {
    return `
                <div class="result-hero">
                    <p class="result-hero__label">${label}</p>
                    <p class="result-hero__amount">${approxLabel ? `<span class="result-hero__approx">${approxLabel}</span>` : ''}${amountHtml}</p>
                    ${metaHtml}
                    ${paceHtml}
                </div>
            `;
}

export function renderMainResult({ config, neededPoints, totalAmountNeeded, remainingMonths,
    remainingDays, finalRate, rateSourceLabel, comparison, guidanceContent = '', purchaseCheckContent = '', progressCheer = '' }) {
    const texts = config.uiText;
        const calculationNoteText = texts.calculationNote.replace('{months}', remainingMonths);
        let resultContent = '';
        let resultDetailsContent = '';

        if (neededPoints === 0) {
            resultContent = `
                <div class="result-free-clear">
                    🎉 ${texts.resultLabelFreeClear || '課金不要'}
                </div>
                ${renderResultHero({
                    label: texts.resultLabelTotalYen,
                    approxLabel: texts.approxLabel,
                    amountHtml: renderCurrencyAmount(0, config),
                    metaHtml: `<p class="result-hero__meta">${texts.resultLabelNeededPoints} ${renderPointsAmount(0)}</p>`
                })}
            `;
            // 追加支出が不要な状態では、購入導線や追加の支出判断リンクを出さない。
            resultDetailsContent = '';
        } else {
            const monthlyResultContent = remainingMonths > 0
                ? `
                    <dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt>
                    <dd><b>${texts.approxLabel} ${renderCurrencyAmount(Math.ceil(totalAmountNeeded / remainingMonths), config)}${texts.perMonth}</b></dd>
                `
                : '';
            const dailyResultContent = remainingDays > 0
                ? `
                    <dt>${texts.resultLabelDailyYen || '1日あたり目安'}</dt>
                    <dd><b>${texts.approxLabel} ${renderCurrencyAmount(Math.ceil(totalAmountNeeded / remainingDays), config)}${texts.perDay || '/日'}</b></dd>
                `
                : '';
            const comparisonContent = comparison
                ? `
                    <aside class="result-rate-comparison" aria-label="${texts.resultComparisonTitle || '通常時との比較'}">
                        <strong>${texts.resultComparisonTitle || '通常時との比較'}</strong>
                        <dl>
                            <dt>${texts.resultComparisonBase || '通常還元の場合'}</dt>
                            <dd>${texts.approxLabel} ${renderCurrencyAmount(comparison.baseAmount, config)}</dd>
                            <dt>${texts.resultComparisonSelected || '現在の還元条件'}</dt>
                            <dd>${texts.approxLabel} ${renderCurrencyAmount(comparison.selectedAmount, config)}</dd>
                            <dt>${texts.resultComparisonSaved || '差額'}</dt>
                            <dd><b>${renderCurrencyAmount(comparison.savedAmount, config)}</b></dd>
                        </dl>
                        ${comparison.savedAmount === 0 ? `<p>${texts.resultComparisonSame || 'この条件では必要額の概算が同じため、差額はありません。'}</p>` : ''}
                    </aside>
                `
                : '';
            const premiseContent = `
                <p class="rounding-assumption-note">
                    <strong>${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}</strong>${rateSourceLabel ? ` · ${rateSourceLabel}` : ''}<br>
                    ${texts.roundingNoteWithoutPack}
                </p>
            `;

            const monthlyPace = remainingMonths > 0
                ? `<span>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths}) ${texts.approxLabel} ${renderCurrencyAmount(Math.ceil(totalAmountNeeded / remainingMonths), config)}${texts.perMonth || ''}</span>`
                : '';
            const dailyPace = remainingDays > 0
                ? `<span>${texts.resultLabelDailyYen || '1日あたり目安'} ${texts.approxLabel} ${renderCurrencyAmount(Math.ceil(totalAmountNeeded / remainingDays), config)}${texts.perDay || ''}</span>`
                : '';
            const paceHtml = (monthlyPace || dailyPace)
                ? `<p class="result-hero__pace">${monthlyPace}${dailyPace}</p>`
                : '';
            resultContent = `
                ${renderResultHero({
                    label: texts.resultLabelTotalYen,
                    approxLabel: texts.approxLabel,
                    amountHtml: renderCurrencyAmount(totalAmountNeeded, config),
                    metaHtml: `<p class="result-hero__meta">${texts.resultLabelNeededPoints} ${renderPointsAmount(neededPoints)}</p>`,
                    paceHtml
                })}
                ${progressCheer ? `<p class="result-progress-cheer">${progressCheer}</p>` : ''}
                ${premiseContent}
            `;
            resultDetailsContent = `
                <details>
                    <summary>${texts.resultDetailsSummary || '計算の詳細を見る'}</summary>
                    <div class="result-details-content">
                        <dl class="result-detail-grid">
                            ${monthlyResultContent}
                            ${dailyResultContent}
                        </dl>
                        ${comparisonContent}
                        <div class="calculation-note">${calculationNoteText}</div>
                    </div>
                </details>
                ${purchaseCheckContent}
                ${guidanceContent}
            `;
        }

    return { resultContent, resultDetailsContent };
}

export function renderReverseResult({ config, earnedPoints, finalRate, rateSourceLabel, purchaseCheckContent = '' }) {
    const texts = config.uiText;
    return `
            ${renderResultHero({
                label: texts.resultLabelEarnedPoints,
                approxLabel: texts.approxLabel,
                amountHtml: renderPointsAmount(earnedPoints)
            })}
            <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
            <p class="rounding-assumption-note">${texts.roundingNoteReverse}</p>
            ${purchaseCheckContent}
        `;

}
