'use strict';

PP_APP.CALC = {
    // ステータスセレクトボックスの選択肢を初期化
    populateStatusSelects() {
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const statuses = config.statuses;
        [PP_APP.STATE.dom.currentStatus, PP_APP.STATE.dom.reverseStatus].forEach(select => {
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
        if (!PP_APP.STATE.dom.currentStatus || !PP_APP.STATE.dom.baseRate || !PP_APP.STATE.dom.targetStatus) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const currentStatusValue = parseFloat(PP_APP.STATE.dom.currentStatus.value);
        PP_APP.STATE.dom.baseRate.value = (config.statusRates[currentStatusValue] || 1.0).toFixed(2);
        PP_APP.STATE.dom.targetStatus.innerHTML = "";
        const availableTargets = (config.statusPointsMapping[currentStatusValue] || []).slice(0, 1);
        availableTargets.forEach(targetLabel => {
            const points = config.thresholds[targetLabel];
            if (points) {
                const option = new Option(`${targetLabel} (${points.toLocaleString(config.lang)}pt)`, points);
                option.dataset.statusLabel = targetLabel;
                PP_APP.STATE.dom.targetStatus.add(option);
            }
        });
        if (availableTargets.length === 0) {
            const option = new Option(config.uiText.nextTargetNone, "");
            option.disabled = true;
            PP_APP.STATE.dom.targetStatus.add(option);
        }
        this.updateNeededPointsConstraint();
    },

    // 逆算用基本還元率の更新
    updateReverseBaseRate() {
        if (!PP_APP.STATE.dom.reverseStatus || !PP_APP.STATE.dom.reverseBaseRate) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const selectedStatusValue = parseFloat(PP_APP.STATE.dom.reverseStatus.value);
        PP_APP.STATE.dom.reverseBaseRate.value = (config.statusRates[selectedStatusValue] || 1.0).toFixed(2);
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
        if (!PP_APP.STATE.dom.currentStatus || !PP_APP.STATE.dom.targetStatus || !PP_APP.STATE.dom.neededPoints) return;
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const currentStatusValue = parseFloat(PP_APP.STATE.dom.currentStatus.value);
        const selectedTargetOption = PP_APP.STATE.dom.targetStatus.options[PP_APP.STATE.dom.targetStatus.selectedIndex];
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);

        if (maxNeededPoints === null) {
            PP_APP.STATE.dom.neededPoints.removeAttribute('max');
            return;
        }

        PP_APP.STATE.dom.neededPoints.max = String(maxNeededPoints);
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
    getValidNumberInput(element, min = -Infinity) {
        if (!element) return null;
        const value = parseFloat(element.value);
        return (isNaN(value) || value < min) ? null : value;
    },

    // 倍率や補正などを適用した最終還元ポイントレートを計算
    getFinalRate(baseRateElement, statusSelectElement, multiplierElement) {
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const editedBaseRate = this.getValidNumberInput(baseRateElement, 0.01);
        const multiplier = this.getValidNumberInput(multiplierElement, 1);
        const statusValue = parseFloat(statusSelectElement.value);
        const statusRate = config.statusRates[statusValue];
        if (editedBaseRate === null || multiplier === null || !statusRate) return null;
        return Math.max(editedBaseRate, statusRate * multiplier);
    },

    // 課金シミュレーション計算の実行
    calculate() {
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const texts = config.uiText;
        const neededPoints = this.getValidNumberInput(PP_APP.STATE.dom.neededPoints, 0.01);
        const finalRate = this.getFinalRate(PP_APP.STATE.dom.baseRate, PP_APP.STATE.dom.currentStatus, PP_APP.STATE.dom.multiplier);
        const currentStatusValue = parseFloat(PP_APP.STATE.dom.currentStatus.value);
        const selectedTargetOption = PP_APP.STATE.dom.targetStatus.options[PP_APP.STATE.dom.targetStatus.selectedIndex];
        const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);
        
        if (neededPoints === null || finalRate === null || !targetStatusLabel) return PP_APP.UI.displayResult(PP_APP.STATE.dom.result, texts.errorInput, true);
        if (maxNeededPoints === null || neededPoints > maxNeededPoints) return PP_APP.UI.displayResult(PP_APP.STATE.dom.result, texts.errorTargetConsistency, true);
        if (finalRate <= 0) return PP_APP.UI.displayResult(PP_APP.STATE.dom.result, texts.errorRate, true);
        
        const remainingMonths = this.getRemainingMonths();
        
        const spendUnit = (PP_APP.STATE.currentRegion === 'JP') ? 100 : 1;
        const totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
        const monthlyResultContent = remainingMonths > 0
            ? `
                <dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt>
                <dd><b>約 <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingMonths)}">0</span> ${config.currencySymbol}/月</b></dd>
            `
            : '';
        
        // アニメーション用に count-target クラスを付与
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
                ※Google Playポイントのランク集計期間（毎年12月31日）までの残り <b>${remainingMonths}ヶ月</b> で均等に割り出した目標課金額の目安です。
            </div>
        `;
        
        PP_APP.UI.displayResult(PP_APP.STATE.dom.result, resultContent);
        PP_APP.STATE.dom.result.dataset.requiredYen = totalAmountNeeded;
        PP_APP.STATE.dom.result.dataset.targetStatusLabel = targetStatusLabel;
    },

    // 課金額からの逆算シミュレーション計算の実行
    reverseCalculate() {
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const texts = config.uiText;
        const amountYen = this.getValidNumberInput(PP_APP.STATE.dom.amountYen, 0);
        const finalRate = this.getFinalRate(PP_APP.STATE.dom.reverseBaseRate, PP_APP.STATE.dom.reverseStatus, PP_APP.STATE.dom.reverseMultiplier);
        
        if (amountYen === null || finalRate === null) return PP_APP.UI.displayResult(PP_APP.STATE.dom.reverseResult, texts.errorInputReverse, true);
        if (finalRate <= 0) return PP_APP.UI.displayResult(PP_APP.STATE.dom.reverseResult, texts.errorRateReverse, true);
        
        const spendUnit = (PP_APP.STATE.currentRegion === 'JP') ? 100 : 1;
        const earnedPointsRaw = (amountYen / spendUnit) * finalRate;
        const earnedPoints = Math.round(earnedPointsRaw);
        
        const resultContent = `
            <dl>
                <dt>${texts.resultLabelEarnedPoints}</dt>
                <dd><b>約 <span class="count-target" data-value="${earnedPoints}">0</span> pt</b></dd>
            </dl>
            <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>
        `;
        
        PP_APP.UI.displayResult(PP_APP.STATE.dom.reverseResult, resultContent);
        PP_APP.STATE.dom.reverseResult.dataset.earnedPoints = String(earnedPoints);
        PP_APP.STATE.dom.reverseResult.dataset.earnedPointsRaw = earnedPointsRaw.toFixed(2);
        PP_APP.STATE.dom.reverseResult.dataset.amountYen = amountYen;
    },

    // X (Twitter) シェア
    shareOnTwitter(text) {
        const siteUrl = "https://playpoint-sim.com/";
        const fullText = `${text}

#Playポイント計算してみた
#GooglePlayポイント

${siteUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank');
    },

    // 結果コピー
    copyResult() {
        if (!PP_APP.STATE.dom.copyButton) return;
        const requiredYen = PP_APP.STATE.dom.result.dataset.requiredYen;
        const targetStatusLabel = PP_APP.STATE.dom.result.dataset.targetStatusLabel;
        if (!PP_APP.STATE.dom.result.classList.contains(PP_APP.CONSTANTS.CLASS_HAS_RESULT) || !requiredYen || !targetStatusLabel) return;
        
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const textToCopy = `▼Playポイント計算結果▼
目標ステータス： ${targetStatusLabel}
必要な課金額の目安： 約${formattedYen}${config.currencySymbol}

計算元：Playポイント計算機 ( https://playpoint-sim.com/ )`;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => { PP_APP.UI.showToast("クリップボードにコピーしました！"); })
            .catch(() => { PP_APP.UI.showToast("コピーに失敗しました。", 'error'); });
    },

    // Xへの通常計算シェアイベントハンドラ
    handleTweet() {
        const requiredYen = PP_APP.STATE.dom.result.dataset.requiredYen;
        const targetStatusLabel = PP_APP.STATE.dom.result.dataset.targetStatusLabel;
        if (!requiredYen || !targetStatusLabel) return;
        
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const text = `【Playポイント計算機で試算】
私の目標「${targetStatusLabel}」まで、あと【${formattedYen}${config.currencySymbol}】必要みたい！💰`;
        this.shareOnTwitter(text);
    },

    // Xへの逆算シェアイベントハンドラ
    handleTweetReverse() {
        const earnedPoints = PP_APP.STATE.dom.reverseResult.dataset.earnedPoints;
        const amountYen = PP_APP.STATE.dom.reverseResult.dataset.amountYen;
        if (!earnedPoints || !amountYen) return;
        
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
        const formattedPoints = parseFloat(earnedPoints).toLocaleString(config.lang);
        const formattedYen = parseFloat(amountYen).toLocaleString(config.lang);
        const text = `【Playポイント計算機で試算】
${formattedYen}${config.currencySymbol}使うと、約 ${formattedPoints}ポイント 獲得できるみたい！✨`;
        this.shareOnTwitter(text);
    }
};
