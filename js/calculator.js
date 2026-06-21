'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';

export const CALC = {
    // ステータスセレクトボックスの選択肢を初期化
    populateStatusSelects() {
        const config = CONFIGS[STATE.currentRegion];
        const statuses = config.statuses;
        [STATE.dom.currentStatus, STATE.dom.reverseStatus].forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '';
                for (const [name, value] of Object.entries(statuses)) {
                    select.add(new Option(name, value));
                }
                const currentKey = Object.keys(statuses).find(k => statuses[k] == currentValue);
                select.value = currentKey ? currentValue : String(config.statuses[Object.keys(statuses)[0]]);
            }
        });
    },

    // 現在のステータス変更に合わせて基本還元率と目標ステータス選択肢を更新
    updateBaseRateAndTarget() {
        if (!STATE.dom.currentStatus || !STATE.dom.baseRate || !STATE.dom.targetStatus) return;
        const config = CONFIGS[STATE.currentRegion];
        const currentStatusValue = parseFloat(STATE.dom.currentStatus.value);
        STATE.dom.baseRate.value = (config.statusRates[currentStatusValue] || 1.0).toFixed(2);
        STATE.dom.targetStatus.innerHTML = "";
        const availableTargets = (config.statusPointsMapping[currentStatusValue] || []).slice(0, 1);
        availableTargets.forEach(targetLabel => {
            const points = config.thresholds[targetLabel];
            if (points) {
                const option = new Option(`${targetLabel} (${points.toLocaleString(config.lang)}pt)`, points);
                option.dataset.statusLabel = targetLabel;
                STATE.dom.targetStatus.add(option);
            }
        });
        if (availableTargets.length === 0) {
            const option = new Option(config.uiText.nextTargetNone, "");
            option.disabled = true;
            STATE.dom.targetStatus.add(option);
        }
        this.updateNeededPointsConstraint();
    },

    // 逆算用基本還元率の更新
    updateReverseBaseRate() {
        if (!STATE.dom.reverseStatus || !STATE.dom.reverseBaseRate) return;
        const config = CONFIGS[STATE.currentRegion];
        const selectedStatusValue = parseFloat(STATE.dom.reverseStatus.value);
        STATE.dom.reverseBaseRate.value = (config.statusRates[selectedStatusValue] || 1.0).toFixed(2);
    },

    // 現在のステータスの最低ポイント閾値を取得
    getCurrentStatusFloorPoints(config, currentStatusValue) {
        const statusLabels = Object.keys(config.statuses);
        const currentStatusLabel = statusLabels.find(label => config.statuses[label] === currentStatusValue);
        if (!currentStatusLabel) return null;

        const currentIndex = statusLabels.indexOf(currentStatusLabel);
        if (currentIndex <= 0) return 0;

        const floorPoints = config.thresholds[currentStatusLabel];
        return Number.isFinite(floorPoints) ? floorPoints : null;
    },

    // 目標ランクに対する最大必要ポイントを取得
    getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold) {
        if (!Number.isFinite(targetThreshold)) return null;
        const currentFloorPoints = this.getCurrentStatusFloorPoints(config, currentStatusValue);
        if (currentFloorPoints === null) return null;
        const maxNeededPoints = targetThreshold - currentFloorPoints;
        return maxNeededPoints > 0 ? maxNeededPoints : null;
    },

    // 必要ポイント入力エリアの最大値を自動制御（矛盾防止）
    updateNeededPointsConstraint() {
        if (!STATE.dom.currentStatus || !STATE.dom.targetStatus || !STATE.dom.neededPoints) return;
        const config = CONFIGS[STATE.currentRegion];
        const currentStatusValue = parseFloat(STATE.dom.currentStatus.value);
        const selectedTargetOption = STATE.dom.targetStatus.options[STATE.dom.targetStatus.selectedIndex];
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);

        if (maxNeededPoints === null) {
            STATE.dom.neededPoints.removeAttribute('max');
            return;
        }

        STATE.dom.neededPoints.max = String(maxNeededPoints);
    },

    // 年末までの残日数から月平均の分母を算出
    getRemainingMonths(baseDate = new Date()) {
        const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        if (date.getMonth() === 11 && date.getDate() === 31) return 0;

        const nextYearStart = new Date(date.getFullYear() + 1, 0, 1);
        const remainingDays = Math.max(0, Math.ceil((nextYearStart - date) / (1000 * 60 * 60 * 24)));
        return Math.ceil(remainingDays / (365 / 12));
    },

    // 入力値バリデーション
    getValidNumberInput(element, min = -Infinity, max = Infinity) {
        if (!element) return null;
        const value = Number(element.value);
        const elementMin = element.min === undefined || element.min === '' ? min : Number(element.min);
        const elementMax = element.max === undefined || element.max === '' ? max : Number(element.max);
        const effectiveMin = Number.isFinite(elementMin) ? Math.max(min, elementMin) : min;
        const effectiveMax = Number.isFinite(elementMax) ? Math.min(max, elementMax) : max;

        return (!Number.isFinite(value) || value < effectiveMin || value > effectiveMax) ? null : value;
    },

    // 倍率や補正などを適用した最終還元ポイントレートを計算
    getFinalRate(baseRateElement, statusSelectElement, multiplierElement) {
        const config = CONFIGS[STATE.currentRegion];
        const editedBaseRate = this.getValidNumberInput(baseRateElement, 0.01);
        const multiplier = this.getValidNumberInput(multiplierElement, 1);
        const statusValue = parseFloat(statusSelectElement.value);
        const statusRate = config.statusRates[statusValue];
        if (editedBaseRate === null || multiplier === null || !statusRate) return null;
        return Math.max(editedBaseRate, statusRate * multiplier);
    },

    // 課金シミュレーション計算の実行
    calculate() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const neededPoints = this.getValidNumberInput(STATE.dom.neededPoints, 0.01);
        const finalRate = this.getFinalRate(STATE.dom.baseRate, STATE.dom.currentStatus, STATE.dom.multiplier);
        const currentStatusValue = parseFloat(STATE.dom.currentStatus.value);
        const selectedTargetOption = STATE.dom.targetStatus.options[STATE.dom.targetStatus.selectedIndex];
        const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);
        
        if (neededPoints === null || neededPoints <= 0) return UI.displayResult(STATE.dom.result, texts.errorNeededPoints || texts.errorInput, true);
        if (!targetStatusLabel) return UI.displayResult(STATE.dom.result, texts.errorTargetStatus || texts.errorInput, true);
        if (finalRate === null || finalRate <= 0) return UI.displayResult(STATE.dom.result, texts.errorRate, true);
        if (maxNeededPoints === null || neededPoints > maxNeededPoints) return UI.displayResult(STATE.dom.result, texts.errorTargetConsistency, true);
        
        const remainingMonths = this.getRemainingMonths();
        
        const spendUnit = (STATE.currentRegion === 'JP') ? 100 : 1;
        const totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
        const monthlyResultContent = remainingMonths > 0
            ? `
                <dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt>
                <dd><b>約 <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingMonths)}">0</span> ${config.currencySymbol}${texts.perMonth}</b></dd>
            `
            : '';
        
        // アニメーション用に count-target クラスを付与
        const calculationNoteText = texts.calculationNote.replace('{months}', remainingMonths);
        const resultContent = `
            <dl>
                <dt>${texts.resultLabelNeededPoints}</dt>
                <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                <dt>${texts.resultLabelTotalYen}</dt>
                <dd><b>約 <span class="count-target" data-value="${totalAmountNeeded}">0</span> ${config.currencySymbol}</b></dd>
                ${monthlyResultContent}
            </dl>
            <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>
            <div style="font-size:0.82em; color:var(--link-color); margin-top:0.8em; line-height:1.4;">
                ${calculationNoteText}
            </div>
        `;
        
        UI.displayResult(STATE.dom.result, resultContent);
        STATE.dom.result.dataset.requiredYen = totalAmountNeeded;
        STATE.dom.result.dataset.targetStatusLabel = targetStatusLabel;
        STATE.dom.result.dataset.shareUrl = SHARE ? SHARE.buildMainShareUrl() : '';
        ANALYTICS.track('calculation_completed', {
            calculation_mode: 'rank_up',
            region: STATE.currentRegion,
            target_status: targetStatusLabel
        });
        ANALYTICS.markEngaged();
    },

    // 課金額からの逆算シミュレーション計算の実行
    reverseCalculate() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const amountYen = this.getValidNumberInput(STATE.dom.amountYen, 0);
        const finalRate = this.getFinalRate(STATE.dom.reverseBaseRate, STATE.dom.reverseStatus, STATE.dom.reverseMultiplier);
        
        if (amountYen === null || finalRate === null) return UI.displayResult(STATE.dom.reverseResult, texts.errorInputReverse, true);
        if (finalRate <= 0) return UI.displayResult(STATE.dom.reverseResult, texts.errorRateReverse, true);
        
        const spendUnit = (STATE.currentRegion === 'JP') ? 100 : 1;
        const earnedPointsRaw = (amountYen / spendUnit) * finalRate;
        const earnedPoints = Math.round(earnedPointsRaw);
        
        const resultContent = `
            <dl>
                <dt>${texts.resultLabelEarnedPoints}</dt>
                <dd><b>約 <span class="count-target" data-value="${earnedPoints}">0</span> pt</b></dd>
            </dl>
            <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>
        `;
        
        UI.displayResult(STATE.dom.reverseResult, resultContent);
        STATE.dom.reverseResult.dataset.earnedPoints = String(earnedPoints);
        STATE.dom.reverseResult.dataset.earnedPointsRaw = earnedPointsRaw.toFixed(2);
        STATE.dom.reverseResult.dataset.amountYen = amountYen;
        STATE.dom.reverseResult.dataset.shareUrl = SHARE ? SHARE.buildReverseShareUrl() : '';
        ANALYTICS.track('reverse_calculation_completed', {
            calculation_mode: 'spend_to_points',
            region: STATE.currentRegion
        });
        ANALYTICS.markEngaged();
    },

    // X (Twitter) シェア
    shareOnTwitter(text, shareUrl = "https://playpoint-sim.com/") {
        const fullText = `${text}

#Playポイント計算してみた
#GooglePlayポイント

${shareUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank');
    },

    // 結果コピー
    copyResult() {
        if (!STATE.dom.copyButton) return;
        const requiredYen = STATE.dom.result.dataset.requiredYen;
        const targetStatusLabel = STATE.dom.result.dataset.targetStatusLabel;
        if (!STATE.dom.result.classList.contains(CONSTANTS.CLASS_HAS_RESULT) || !requiredYen || !targetStatusLabel) return;
        
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const shareUrl = STATE.dom.result.dataset.shareUrl || 'https://playpoint-sim.com/';
        
        const textToCopy = texts.copyResultTemplate
            .replace('{status}', targetStatusLabel)
            .replace('{yen}', formattedYen)
            .replace('{symbol}', config.currencySymbol)
            .replace('{url}', shareUrl);
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => { UI.showToast(texts.toastCopySuccess); })
            .catch(() => { UI.showToast(texts.toastCopyError, 'error'); });
    },

    // Xへの通常計算シェアイベントハンドラ
    handleTweet() {
        const requiredYen = STATE.dom.result.dataset.requiredYen;
        const targetStatusLabel = STATE.dom.result.dataset.targetStatusLabel;
        if (!requiredYen || !targetStatusLabel) return;
        
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const text = texts.tweetTextMain
            .replace('{status}', targetStatusLabel)
            .replace('{yen}', formattedYen)
            .replace('{symbol}', config.currencySymbol);
        this.shareOnTwitter(text, STATE.dom.result.dataset.shareUrl);
    },

    // Xへの逆算シェアイベントハンドラ
    handleTweetReverse() {
        const earnedPoints = STATE.dom.reverseResult.dataset.earnedPoints;
        const amountYen = STATE.dom.reverseResult.dataset.amountYen;
        if (!earnedPoints || !amountYen) return;
        
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const formattedPoints = parseFloat(earnedPoints).toLocaleString(config.lang);
        const formattedYen = parseFloat(amountYen).toLocaleString(config.lang);
        const text = texts.tweetTextReverse
            .replace('{yen}', formattedYen)
            .replace('{symbol}', config.currencySymbol)
            .replace('{points}', formattedPoints);
        this.shareOnTwitter(text, STATE.dom.reverseResult.dataset.shareUrl);
    }
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.CALC = CALC;
}
