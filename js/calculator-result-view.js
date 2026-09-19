'use strict';

// 表示用HTMLだけを生成する。計算・DOM更新・共有データ保存・計測は行わない。
export function renderCurrencyAmount(value, config) {
    const amountMarkup = `<span class="count-target" data-value="${value}">0</span>`;
    return config.currencyPosition === 'prefix'
        ? `${config.currencySymbol}${amountMarkup}`
        : `${amountMarkup} ${config.currencySymbol}`;
}

export function renderMainResult({ config, neededPoints, totalAmountNeeded, remainingMonths,
    remainingDays, finalRate, rateSourceLabel, comparison, guidanceContent = '', purchaseCheckContent = '', progressCheer = '' }) {
    const texts = config.uiText;
        const calculationNoteText = texts.calculationNote.replace('{months}', remainingMonths);
        let resultContent = '';
        let resultDetailsContent = '';

        if (neededPoints === 0) {
            resultContent = `
                <div style="padding:1em; background:rgba(40, 167, 69, 0.1); border: 2px solid #28a745; border-radius: 8px; text-align:center; font-weight:bold; color:#218838; margin-bottom:1em;">
                    🎉 ${texts.resultLabelFreeClear || '課金不要'}
                </div>
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="0">0</span> pt</b></dd>
                    <dt>${texts.resultLabelTotalYen}</dt>
                    <dd><b>${texts.approxLabel} ${renderCurrencyAmount(0, config)}</b></dd>
                </dl>
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

            resultContent = `
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                    <dt>${texts.resultLabelTotalYen}</dt>
                    <dd><b>${texts.approxLabel} ${renderCurrencyAmount(totalAmountNeeded, config)}</b></dd>
                </dl>
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
            <dl>
                <dt>${texts.resultLabelEarnedPoints}</dt>
                <dd><b>${texts.approxLabel} <span class="count-target" data-value="${earnedPoints}">0</span> pt</b></dd>
            </dl>
            <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
            <p class="rounding-assumption-note" style="font-size:0.82em; color:var(--link-color); margin:0.8em 0 0; line-height:1.5;">${texts.roundingNoteReverse}</p>
            ${purchaseCheckContent}
        `;

}
