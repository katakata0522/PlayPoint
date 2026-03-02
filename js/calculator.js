'use strict';

function populateStatusSelects() {
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const statuses = config.statuses;
    [PP_STATE.dom.currentStatus, PP_STATE.dom.reverseStatus].forEach(select => {
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '';
            for (const [name, value] of Object.entries(statuses)) {
                select.add(new Option(name, value));
            }
            const currentKey = Object.keys(statuses).find(k => statuses[k] == currentValue);
            select.value = currentKey ? currentValue : config.statuses[Object.keys(statuses)[2]];
        }
    });
}

function updateBaseRateAndTarget() {
    if (!PP_STATE.dom.currentStatus || !PP_STATE.dom.baseRate || !PP_STATE.dom.targetStatus) return;
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const currentStatusValue = parseFloat(PP_STATE.dom.currentStatus.value);
    PP_STATE.dom.baseRate.value = (config.statusRates[currentStatusValue] || 1.0).toFixed(2);
    PP_STATE.dom.targetStatus.innerHTML = "";
    const availableTargets = config.statusPointsMapping[currentStatusValue] || [];
    availableTargets.forEach(targetLabel => {
        const points = config.thresholds[targetLabel];
        if (points) {
            const option = new Option(`${targetLabel} (${points.toLocaleString(config.lang)}pt)`, points);
            option.dataset.statusLabel = targetLabel;
            PP_STATE.dom.targetStatus.add(option);
        }
    });
    if (availableTargets.length === 0) {
        const option = new Option(config.uiText.nextTargetNone, "");
        option.disabled = true;
        PP_STATE.dom.targetStatus.add(option);
    }
}

function updateReverseBaseRate() {
    if (!PP_STATE.dom.reverseStatus || !PP_STATE.dom.reverseBaseRate) return;
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const selectedStatusValue = parseFloat(PP_STATE.dom.reverseStatus.value);
    PP_STATE.dom.reverseBaseRate.value = (config.statusRates[selectedStatusValue] || 1.0).toFixed(2);
}

const getRemainingMonths = () => 12 - new Date().getMonth();

const getValidNumberInput = (element, min = -Infinity) => {
    if (!element) return null;
    const value = parseFloat(element.value);
    return (isNaN(value) || value < min) ? null : value;
};

const getFinalRate = (baseRateElement, statusSelectElement, multiplierElement) => {
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const editedBaseRate = getValidNumberInput(baseRateElement, 0.01);
    const multiplier = getValidNumberInput(multiplierElement, 1);
    const statusValue = parseFloat(statusSelectElement.value);
    const statusRate = config.statusRates[statusValue];
    if (editedBaseRate === null || multiplier === null || !statusRate) return null;
    return Math.max(editedBaseRate, statusRate * multiplier);
};

function calculate() {
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const texts = config.uiText;
    const neededPoints = getValidNumberInput(PP_STATE.dom.neededPoints, 0.01);
    const finalRate = getFinalRate(PP_STATE.dom.baseRate, PP_STATE.dom.currentStatus, PP_STATE.dom.multiplier);
    const selectedTargetOption = PP_STATE.dom.targetStatus.options[PP_STATE.dom.targetStatus.selectedIndex];
    const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;
    
    if (neededPoints === null || finalRate === null || !targetStatusLabel) return displayResult(PP_STATE.dom.result, texts.errorInput, true);
    if (finalRate <= 0) return displayResult(PP_STATE.dom.result, texts.errorRate, true);
    
    const remainingMonths = getRemainingMonths();
    if (remainingMonths <= 0) return displayResult(PP_STATE.dom.result, texts.errorMonth, true);
    
    const spendUnit = (PP_STATE.currentRegion === 'JP') ? 100 : 1;
    const totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
    const monthlyAmountNeeded = Math.ceil(totalAmountNeeded / remainingMonths);
    
    const resultContent = `<dl><dt>${texts.resultLabelNeededPoints}</dt><dd><b>${neededPoints.toLocaleString(config.lang)} pt</b></dd><dt>${texts.resultLabelTotalYen}</dt><dd><b>${totalAmountNeeded.toLocaleString(config.lang)} ${config.currencySymbol}</b></dd><dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt><dd><b>約 ${monthlyAmountNeeded.toLocaleString(config.lang)} ${config.currencySymbol}/月</b></dd></dl><span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>`;
    
    displayResult(PP_STATE.dom.result, resultContent);
    PP_STATE.dom.result.dataset.requiredYen = totalAmountNeeded;
    PP_STATE.dom.result.dataset.targetStatusLabel = targetStatusLabel;
}

function reverseCalculate() {
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const texts = config.uiText;
    const amountYen = getValidNumberInput(PP_STATE.dom.amountYen, 0);
    const finalRate = getFinalRate(PP_STATE.dom.reverseBaseRate, PP_STATE.dom.reverseStatus, PP_STATE.dom.reverseMultiplier);
    
    if (amountYen === null || finalRate === null) return displayResult(PP_STATE.dom.reverseResult, texts.errorInputReverse, true);
    if (finalRate < 0) return displayResult(PP_STATE.dom.reverseResult, texts.errorRateReverse, true);
    
    const spendUnit = (PP_STATE.currentRegion === 'JP') ? 100 : 1;
    const earnedPoints = (amountYen / spendUnit) * finalRate;
    
    const resultContent = `<dl><dt>${texts.resultLabelEarnedPoints}</dt><dd><b>${earnedPoints.toLocaleString(config.lang, {minimumFractionDigits: 0, maximumFractionDigits: 2})} pt</b></dd></dl><span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>`;
    
    displayResult(PP_STATE.dom.reverseResult, resultContent);
    PP_STATE.dom.reverseResult.dataset.earnedPoints = earnedPoints.toFixed(2);
    PP_STATE.dom.reverseResult.dataset.amountYen = amountYen;
}

function shareOnTwitter(text) {
    const siteUrl = "https://www.playpoint-sim.com/";
    const fullText = `${text}

#Playポイント計算してみた
#GooglePlayポイント

${siteUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank');
}

function copyResult() {
    if (!PP_STATE.dom.copyButton) return;
    const requiredYen = PP_STATE.dom.result.dataset.requiredYen;
    const targetStatusLabel = PP_STATE.dom.result.dataset.targetStatusLabel;
    if (!PP_STATE.dom.result.classList.contains(PP_CONSTANTS.CLASS_HAS_RESULT) || !requiredYen || !targetStatusLabel) return;
    
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
    const textToCopy = `▼Playポイント計算結果▼
目標ステータス： ${targetStatusLabel}
必要な課金額の目安： 約${formattedYen}${config.currencySymbol}

計算元：Playポイント計算機 ( https://www.playpoint-sim.com/ )`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => { showToast("クリップボードにコピーしました！"); })
        .catch(() => { showToast("コピーに失敗しました。", 'error'); });
}

function handleTweet() {
    const requiredYen = PP_STATE.dom.result.dataset.requiredYen;
    const targetStatusLabel = PP_STATE.dom.result.dataset.targetStatusLabel;
    if (!requiredYen || !targetStatusLabel) return;
    
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
    const text = `【Playポイント計算機で試算】
私の目標「${targetStatusLabel}」まで、あと【${formattedYen}${config.currencySymbol}】必要みたい！💰`;
    shareOnTwitter(text);
}

function handleTweetReverse() {
    const earnedPoints = PP_STATE.dom.reverseResult.dataset.earnedPoints;
    const amountYen = PP_STATE.dom.reverseResult.dataset.amountYen;
    if (!earnedPoints || !amountYen) return;
    
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
    const formattedPoints = parseFloat(earnedPoints).toLocaleString(config.lang, { maximumFractionDigits: 2 });
    const formattedYen = parseFloat(amountYen).toLocaleString(config.lang);
    const text = `【Playポイント計算機で試算】
${formattedYen}${config.currencySymbol}使うと、約 ${formattedPoints}ポイント 獲得できるみたい！✨`;
    shareOnTwitter(text);
}
