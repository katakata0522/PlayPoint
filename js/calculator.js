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

        const availableTargets = [];
        const statusLabels = Object.keys(config.statuses);
        const currentStatusLabel = statusLabels.find(label => config.statuses[label] === currentStatusValue);

        // 1. 同ランクの「維持」を追加（ブロンズ以外のステータス）
        if (currentStatusLabel && currentStatusValue > 1.0) {
            availableTargets.push({
                label: `${currentStatusLabel} (${config.uiText.statusKeep || '維持'})`,
                value: config.thresholds[currentStatusLabel],
                statusLabel: currentStatusLabel
            });
        }

        // 2. 次のランクの「昇格」を追加
        const nextTargets = (config.statusPointsMapping[currentStatusValue] || []).slice(0, 1);
        nextTargets.forEach(targetLabel => {
            const points = config.thresholds[targetLabel];
            if (points) {
                availableTargets.push({
                    label: `${targetLabel} (${config.uiText.statusUp || '昇格'})`,
                    value: points,
                    statusLabel: targetLabel
                });
            }
        });

        // DOMに追加
        availableTargets.forEach(target => {
            const pointsStr = target.value.toLocaleString(config.lang);
            const option = new Option(`${target.label} (${pointsStr}pt)`, target.value);
            option.dataset.statusLabel = target.statusLabel;
            STATE.dom.targetStatus.add(option);
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

        // 維持（目標の閾値と現在の閾値が同じ）の場合は、最大必要ポイントは目標の閾値そのもの
        if (targetThreshold === currentFloorPoints) {
            return targetThreshold > 0 ? targetThreshold : null;
        }

        // 昇格の場合は差分
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
        const now = new Date();
        const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
        const remainingDays = Math.max(0, Math.ceil((nextYearStart - now) / (1000 * 60 * 60 * 24)));
        const remainingWeeks = Math.ceil(remainingDays / 7);
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
        
        let finalNeededPoints = neededPoints;
        let rewardsSubtractedContent = '';

        if (STATE.dom.subtractRewards && STATE.dom.subtractRewards.checked) {
            const weeklyEst = config.weeklyRewardEstimates ? (config.weeklyRewardEstimates[currentStatusValue] || 0) : 0;
            const estimatedRewards = weeklyEst * remainingWeeks;
            finalNeededPoints = Math.max(0, neededPoints - estimatedRewards);

            rewardsSubtractedContent = `
                <dt>${texts.resultLabelFinalNeededPoints || '実質必要ポイント'}</dt>
                <dd><b><span class="count-target" data-value="${finalNeededPoints}">0</span> pt</b> <span style="font-size:0.8em; color:var(--link-color);">(${texts.tabDiary || '日記'}予想 -${estimatedRewards}pt)</span></dd>
            `;
        }

        const spendUnit = config.spendUnit || 100;
        let totalAmountNeeded = 0;
        let packResultContent = '';

        // パック額が入力されているか検証
        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;

        if (finalNeededPoints <= 0) {
            totalAmountNeeded = 0;
        } else if (packAmount !== null && packAmount > 0) {
            // 1パックあたりの獲得ポイント ＝ 1回決済ごとの切り捨て処理 (整数値)
            const pointsPerPack = Math.floor(Math.floor(packAmount / spendUnit) * finalRate);
            
            if (pointsPerPack <= 0) {
                totalAmountNeeded = Math.ceil((finalNeededPoints / finalRate) * spendUnit);
            } else {
                const packsNeeded = Math.ceil(finalNeededPoints / pointsPerPack);
                totalAmountNeeded = packsNeeded * packAmount;
                const packStr = (STATE.currentRegion === 'JP') ? 'パック' : ((STATE.currentRegion === 'KR') ? '팩' : 'packs');
                packResultContent = `
                    <dt>${texts.resultLabelRequiredPacks || '必要購入パック数'}</dt>
                    <dd><b><span class="count-target" data-value="${packsNeeded}">0</span> ${packStr}</b> <span style="font-size:0.8em; color:var(--link-color);">(${packAmount.toLocaleString(config.lang)}${config.currencySymbol}/${packStr})</span></dd>
                `;
            }
        } else {
            totalAmountNeeded = Math.ceil((finalNeededPoints / finalRate) * spendUnit);
        }

        const calculationNoteText = texts.calculationNote.replace('{months}', remainingMonths);
        let resultContent = '';

        if (finalNeededPoints <= 0) {
            resultContent = `
                <div style="padding:1em; background:rgba(40, 167, 69, 0.1); border: 2px solid #28a745; border-radius: 8px; text-align:center; font-weight:bold; color:#218838; margin-bottom:1em;">
                    🎉 ${texts.resultLabelFreeClear || '課金不要（リワードのみで達成可能）'}
                </div>
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                    ${rewardsSubtractedContent}
                </dl>
            `;
        } else {
            const monthlyResultContent = remainingMonths > 0
                ? `
                    <dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt>
                    <dd><b>約 <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingMonths)}">0</span> ${config.currencySymbol}${texts.perMonth}</b></dd>
                `
                : '';
            
            resultContent = `
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                    ${rewardsSubtractedContent}
                    ${packResultContent}
                    <dt>${texts.resultLabelTotalYen}</dt>
                    <dd><b>約 <span class="count-target" data-value="${totalAmountNeeded}">0</span> ${config.currencySymbol}</b></dd>
                    ${monthlyResultContent}
                </dl>
                <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>
                <div style="font-size:0.82em; color:var(--link-color); margin-top:0.8em; line-height:1.4;">
                    ${calculationNoteText}
                </div>
            `;
        }
        
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
        
        const spendUnit = config.spendUnit || 100;
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
