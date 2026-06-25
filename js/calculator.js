'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';

/**
 * CALC_PURE: DOM非依存の純粋計算関数群
 * - ブラウザ環境なしでUnit Testが書ける
 * - 将来的に CALC.calculate() はこちらに計算を委譲する設計
 */
export const CALC_PURE = {
    /**
     * 年末までの残り月数を算出（カレンダー基準）
     * @param {Date} baseDate
     * @returns {number} 残り月数（1〜12）
     */
    getRemainingMonths(baseDate = new Date()) {
        const month = baseDate.getMonth();
        const day = baseDate.getDate();
        if (month === 11 && day === 31) return 0;
        return 12 - month;
    },

    /**
     * 課金シミュレーション計算（純粋関数）
     * @param {object} params - 計算に必要なパラメータ
     * @param {number} params.neededPoints - 必要ポイント数
     * @param {number} params.finalRate - 最終還元率
     * @param {number} params.packAmount - パック額（0の場合は非パック計算）
     * @param {number} params.spendUnit - 計算単位（例: 100円）
     * @param {Date}   params.baseDate - 基準日（デフォルト: 今日）
     * @returns {{ totalAmountNeeded: number, packsNeeded: number|null, remainingMonths: number }}
     */
    computeMainResult({ neededPoints, finalRate, packAmount = 0, spendUnit = 100, baseDate = new Date() }) {
        const remainingMonths = this.getRemainingMonths(baseDate);
        let totalAmountNeeded = 0;
        let packsNeeded = null;

        if (neededPoints <= 0) {
            return { totalAmountNeeded: 0, packsNeeded: null, remainingMonths };
        }

        if (packAmount > 0) {
            const pointsPerPack = Math.floor(Math.floor(packAmount / spendUnit) * finalRate);
            if (pointsPerPack <= 0) {
                totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
            } else {
                packsNeeded = Math.ceil(neededPoints / pointsPerPack);
                totalAmountNeeded = packsNeeded * packAmount;
            }
        } else {
            totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
        }

        return { totalAmountNeeded, packsNeeded, remainingMonths };
    },

    /**
     * 逆算シミュレーション計算（純粋関数）
     * @param {object} params
     * @param {number} params.amountYen - 課金額
     * @param {number} params.finalRate - 最終還元率
     * @param {number} params.spendUnit - 計算単位
     * @returns {{ earnedPoints: number, earnedPointsRaw: number }}
     */
    computeReverseResult({ amountYen, finalRate, spendUnit = 100 }) {
        const earnedPointsRaw = (amountYen / spendUnit) * finalRate;
        const earnedPoints = Math.round(earnedPointsRaw);
        return { earnedPoints, earnedPointsRaw };
    }
};

export const CALC = {
    relatedArticleGroups: {
        platinum: [
            { href: 'articles/2025-12-25-playpoints-rank-maintenance.html', title: 'ランク維持期間の仕組み' },
            { href: 'articles/2025-12-25-weekly-reward.html', title: 'ウィークリーリワードの受け取り方' },
            { href: 'articles/2026-06-20-discount-gift-cards.html', title: 'お得に課金するためのギフトコード活用' },
            { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: 'Play Pointsの反映タイミング' }
        ],
        diamond: [
            { href: 'articles/2025-12-25-diamond-worth-it.html', title: 'ダイヤモンドは本当にお得？' },
            { href: 'articles/2025-12-25-diamond-vip.html', title: 'ダイヤモンドの体験価値' },
            { href: 'articles/2025-12-25-playpoints-rank-maintenance.html', title: 'ランク維持期間の仕組み' },
            { href: 'articles/2026-06-20-discount-gift-cards.html', title: 'お得に課金するためのギフトコード活用' }
        ],
        campaign: [
            { href: 'articles/2025-12-25-campaign.html', title: 'ポイント増量キャンペーンの仕組み' },
            { href: 'articles/2025-12-25-new-year-campaign.html', title: '年末年始キャンペーンの傾向' },
            { href: 'articles/2025-12-25-gift-card.html', title: 'ギフトカードとポイント付与の関係' },
            { href: 'articles/2026-06-20-discount-gift-cards.html', title: 'お得に課金するためのギフトコード活用' }
        ],
        default: [
            { href: 'articles/2025-12-25-getting-started.html', title: 'Google Play Pointsの始め方' },
            { href: 'articles/2025-12-25-check-balance.html', title: 'ポイント残高・履歴の確認方法' },
            { href: 'articles/2025-12-25-playpoints-rank-maintenance.html', title: 'ランク維持期間の仕組み' },
            { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: 'Play Pointsの反映タイミング' }
        ]
    },

    getRelatedArticles(targetStatusLabel, multiplier) {
        const target = String(targetStatusLabel || '').toLowerCase();
        const candidates = [];
        if (/diamond|ダイヤ|다이아|鑽石/i.test(target)) {
            candidates.push(...this.relatedArticleGroups.diamond.slice(0, 2));
        } else if (/platinum|プラチナ|플래티넘|白金/i.test(target)) {
            candidates.push(...this.relatedArticleGroups.platinum.slice(0, 2));
        }
        if (multiplier > 1) candidates.push(...this.relatedArticleGroups.campaign.slice(0, 2));
        candidates.push(...this.relatedArticleGroups.default);

        const seen = new Set();
        return candidates.filter(article => {
            if (seen.has(article.href)) return false;
            seen.add(article.href);
            return true;
        }).slice(0, 4);
    },

    renderRelatedArticles(targetStatusLabel, multiplier) {
        const texts = CONFIGS[STATE.currentRegion].uiText;
        const articles = this.getRelatedArticles(targetStatusLabel, multiplier);
        if (!articles.length) return '';

        const items = articles
            .map(article => `<li><a href="${article.href}">${article.title}</a></li>`)
            .join('');

        return `
            <div class="result-related-links">
                <h3>${texts.resultRelatedTitle || '関連記事'}</h3>
                <ul>${items}</ul>
            </div>
        `;
    },

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

        // すでに入力されている値が新しい最大値を超えている場合、自動的に最大値にクランプする
        const currentVal = parseFloat(STATE.dom.neededPoints.value);
        if (Number.isFinite(currentVal) && currentVal > maxNeededPoints) {
            STATE.dom.neededPoints.value = String(maxNeededPoints);
        }
    },

    // 年末までの残り月数を算出（カレンダー基準）
    // 例: 12月1日 → 残り1ヶ月、11月1日 → 残り2ヶ月
    getRemainingMonths(baseDate = new Date()) {
        const month = baseDate.getMonth(); // 0-indexed (0=1月, 11=12月)
        const day = baseDate.getDate();
        // 12月31日のみ0を返す（年末最終日は月割り計算不要）
        if (month === 11 && day === 31) return 0;
        // 当月を含む残り月数 = 12(月) - 現在の月インデックス
        return 12 - month;
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
        const multiplier = this.getValidNumberInput(STATE.dom.multiplier, 1);
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
                const packStr = texts.packUnit || 'packs';
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

        const relatedArticlesContent = this.renderRelatedArticles(targetStatusLabel, multiplier);

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
                ${relatedArticlesContent}
            `;
        } else {
            const monthlyResultContent = remainingMonths > 0
                ? `
                    <dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt>
                    <dd><b>${texts.approxLabel} <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingMonths)}">0</span> ${config.currencySymbol}${texts.perMonth}</b></dd>
                `
                : '';
            const paceResultContent = remainingDays > 0
                ? `
                    <div class="result-summary-grid" aria-label="${texts.resultLabelPaceSummary || '達成ペース目安'}">
                        <div>
                            <span>${texts.resultLabelWeeklyYen || '週平均目安'}</span>
                            <b>${texts.approxLabel} <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingWeeks)}">0</span> ${config.currencySymbol}${texts.perWeek || '/週'}</b>
                        </div>
                        <div>
                            <span>${texts.resultLabelDailyYen || '1日あたり目安'}</span>
                            <b>${texts.approxLabel} <span class="count-target" data-value="${Math.ceil(totalAmountNeeded / remainingDays)}">0</span> ${config.currencySymbol}${texts.perDay || '/日'}</b>
                        </div>
                        <div>
                            <span>${texts.resultLabelRemainingDays || '年末までの残り日数'}</span>
                            <b><span class="count-target" data-value="${remainingDays}">0</span> ${texts.daysUnit || '日'}</b>
                        </div>
                    </div>
                `
                : '';
            
            resultContent = `
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                    ${rewardsSubtractedContent}
                    ${packResultContent}
                    <dt>${texts.resultLabelTotalYen}</dt>
                    <dd><b>${texts.approxLabel} <span class="count-target" data-value="${totalAmountNeeded}">0</span> ${config.currencySymbol}</b></dd>
                    ${monthlyResultContent}
                </dl>
                ${paceResultContent}
                <span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>
                <div style="font-size:0.82em; color:var(--link-color); margin-top:0.8em; line-height:1.4;">
                    ${calculationNoteText}
                </div>
                ${relatedArticlesContent}
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
                <dd><b>${texts.approxLabel} <span class="count-target" data-value="${earnedPoints}">0</span> pt</b></dd>
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
        const config = CONFIGS[STATE.currentRegion];
        const hashtags = config.uiText.tweetHashtags || "#Playポイント計算してみた\n#GooglePlayポイント";
        const fullText = `${text}\n\n${hashtags}\n\n${shareUrl}`;
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
    window.PP_APP.CALC_PURE = CALC_PURE;
}
