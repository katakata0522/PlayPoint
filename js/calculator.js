'use strict';

import { CALC_PURE } from './calculator-core.js';
import { renderCurrencyAmount, renderMainResult, renderReverseResult } from './calculator-result-view.js';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';
import { getResultNavigationConfig } from './result-navigation-config.js';

export { CALC_PURE };

export const CALC = {
    renderCurrencyAmount(value, config) {
        return renderCurrencyAmount(value, config);
    },

    getResultNavigation() {
        return getResultNavigationConfig(STATE.currentRegion);
    },

    getRelatedArticles(targetStatusLabel, multiplier) {
        const target = String(targetStatusLabel || '').toLowerCase();
        const groups = this.getResultNavigation().relatedArticleGroups;
        const candidates = [];
        if (/diamond|ダイヤ|다이아|鑽石/i.test(target)) {
            candidates.push(...groups.diamond.slice(0, 3));
        } else if (/platinum|プラチナ|플래티넘|白金/i.test(target)) {
            candidates.push(...groups.platinum.slice(0, 3));
        }
        if (multiplier > 1) candidates.push(...groups.campaign.slice(0, 2));
        candidates.push(...groups.default);

        const seen = new Set();
        return candidates.filter(article => {
            if (seen.has(article.href)) return false;
            seen.add(article.href);
            return true;
        }).slice(0, 4);
    },

    getDecisionLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays) {
        const target = String(targetStatusLabel || '').toLowerCase();
        const links = [];
        const navigation = this.getResultNavigation();

        if (totalAmountNeeded >= 50000 && multiplier < 2) {
            links.push(navigation.highSpend);
        } else if (multiplier > 1) {
            links.push(navigation.campaign);
        }

        if (/diamond|ダイヤ|다이아|鑽石/i.test(target)) {
            links.push(navigation.diamond);
        } else if (/platinum|プラチナ|플래티넘|白金/i.test(target)) {
            links.push(navigation.platinum);
        }

        if (remainingDays <= 45) {
            links.push(navigation.nearYearEnd);
        } else {
            links.push(navigation.notShowing);
        }

        links.push(navigation.giftCards);

        const seen = new Set();
        return links.filter(link => {
            if (seen.has(link.href)) return false;
            seen.add(link.href);
            return true;
        }).slice(0, 4);
    },

    getResultGuidanceLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays) {
        const relatedArticles = this.getRelatedArticles(targetStatusLabel, multiplier);
        const decisionLinks = this.getDecisionLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays);
        const prioritizedLinks = [
            ...relatedArticles.slice(0, 1).map(link => ({ ...link, linkType: 'related' })),
            ...decisionLinks.map(link => ({ ...link, linkType: 'decision' })),
            ...relatedArticles.slice(1).map(link => ({ ...link, linkType: 'related' }))
        ];

        const seen = new Set();
        return prioritizedLinks.filter(link => {
            if (seen.has(link.href)) return false;
            seen.add(link.href);
            return true;
        }).slice(0, 3);
    },

    renderResultGuidance(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays) {
        const links = this.getResultGuidanceLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays);
        if (!links.length) return '';

        const items = links
            .map((link, index) => {
                const analyticsAttribute = link.linkType === 'decision'
                    ? 'data-result-decision-link'
                    : 'data-result-related-link';
                return `
                    <li>
                        <a href="${link.href}" ${analyticsAttribute} data-link-position="${index + 1}">
                            <span>${link.title}</span>
                            ${link.note ? `<small>${link.note}</small>` : ''}
                        </a>
                    </li>
                `;
            })
            .join('');

        const navigation = this.getResultNavigation();
        return `
            <div class="result-guidance-links">
                <h3>${navigation.decisionTitle}</h3>
                ${navigation.decisionSubtitle ? `<p class="result-guidance-subtitle">${navigation.decisionSubtitle}</p>` : ''}
                <ul>${items}</ul>
            </div>
        `;
    },

    // 計算の前提と比較を確認した後に、必要な人だけ購入条件へ進める。
    renderPurchaseCheckLink() {
        const gift = this.getResultNavigation().giftCards;
        if (!gift?.href) return '';
        const texts = CONFIGS[STATE.currentRegion]?.uiText || {};
        const label = texts.purchaseCheckLabel || gift.title;
        const note = texts.purchaseCheckNote || gift.note || '';
        return `
            <p class="result-purchase-check">
                <a href="${gift.href}" data-result-decision-link data-link-position="purchase-check">${label}</a>
                ${note ? `<small>${note}</small>` : ''}
            </p>
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

        // 2. 現在ランクより上の「昇格」候補をすべて追加
        // statusPointsMapping が昇格候補のSSOT。UI側で最初の1件へ切り詰めない。
        const nextTargets = config.statusPointsMapping[currentStatusValue] || [];
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

    // Play ストアに表示される「目標までの残りポイント」の入力上限を取得
    getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold) {
        if (!Number.isFinite(targetThreshold) || targetThreshold <= 0) return null;
        const currentFloorPoints = this.getCurrentStatusFloorPoints(config, currentStatusValue);
        if (currentFloorPoints === null) return null;

        // 前年に獲得したランクは翌年末まで引き継がれる。
        // そのため現在ランクの最低ポイントを今年すでに獲得済みとは限らず、
        // 昇格時も目標ランクの閾値全体を入力できる必要がある。
        return targetThreshold;
    },

    // 選択中の現在ステータスと目標ステータスに合う入力例を表示
    updateNeededPointsPlaceholder(config, currentStatusValue, targetStatusLabel) {
        if (!STATE.dom.neededPoints) return;
        const currentStatusLabel = Object.keys(config.statuses)
            .find(label => config.statuses[label] === currentStatusValue);
        const transitionKey = currentStatusLabel && targetStatusLabel
            ? `${currentStatusLabel}:${targetStatusLabel}`
            : '';
        const transitionPlaceholder = transitionKey
            ? config.neededPointsPlaceholderOverrides?.[transitionKey]
            : null;

        STATE.dom.neededPoints.placeholder = transitionPlaceholder
            || config.uiText.neededPointsPlaceholder
            || '';
    },

    // 必要ポイント入力エリアの最大値を自動制御（矛盾防止）
    updateNeededPointsConstraint() {
        if (!STATE.dom.currentStatus || !STATE.dom.targetStatus || !STATE.dom.neededPoints) return;
        const config = CONFIGS[STATE.currentRegion];
        const currentStatusValue = parseFloat(STATE.dom.currentStatus.value);
        const selectedTargetOption = STATE.dom.targetStatus.options[STATE.dom.targetStatus.selectedIndex];
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const targetStatusLabel = selectedTargetOption?.dataset.statusLabel || '';
        this.updateNeededPointsPlaceholder(config, currentStatusValue, targetStatusLabel);
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);

        // 0ptは「すでに達成済み」の有効状態として扱う。
        STATE.dom.neededPoints.min = '0';

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
        return CALC_PURE.getRemainingMonths(baseDate);
    },

    // 入力値バリデーション
    getValidNumberInput(element, min = -Infinity, max = Infinity) {
        if (!element) return null;
        // HTML側のstep・min・max制約にも違反している値は計算へ渡さない
        if (element.validity && element.validity.valid === false) return null;
        const value = Number(element.value);
        const elementMin = element.min === undefined || element.min === '' ? min : Number(element.min);
        const elementMax = element.max === undefined || element.max === '' ? max : Number(element.max);
        const effectiveMin = Number.isFinite(elementMin) ? Math.max(min, elementMin) : min;
        const effectiveMax = Number.isFinite(elementMax) ? Math.min(max, elementMax) : max;

        return (!Number.isFinite(value) || value < effectiveMin || value > effectiveMax) ? null : value;
    },

    // 通常獲得率とGoogle Playに表示された特別獲得率を比較し、採用理由も返す。
    // multiplierElement というID/URLパラメータ名は既存共有URLとの互換性のため維持する。
    getRateDetails(baseRateElement, statusSelectElement, multiplierElement) {
        const config = CONFIGS[STATE.currentRegion];
        const directRate = this.getValidNumberInput(baseRateElement, 0.01);
        const multiplier = this.getValidNumberInput(multiplierElement, 1);
        const statusValue = parseFloat(statusSelectElement.value);
        const statusRate = config.statusRates[statusValue];
        if (directRate === null || multiplier === null || !statusRate) return null;

        // Google Playのスペシャルオファーは、ランク通常率へ倍率を掛けるのではなく
        // 「100円/$1/1,000원/NT$30 あたり何pt」の特別獲得率として通常率と比較する。
        const promotionRate = multiplier;
        const difference = directRate - promotionRate;
        const source = Math.abs(difference) < 1e-9
            ? 'same'
            : (difference > 0 ? 'direct' : 'multiplier');

        return {
            directRate,
            multiplier,
            promotionRate,
            // 古いテスト・補助コードとの互換性を保つ読み取り専用エイリアス。
            multipliedRate: promotionRate,
            finalRate: Math.max(directRate, promotionRate),
            source
        };
    },

    // 既存の呼び出し・テスト向けに数値だけを返す
    getFinalRate(baseRateElement, statusSelectElement, multiplierElement) {
        const details = this.getRateDetails(baseRateElement, statusSelectElement, multiplierElement);
        return details ? details.finalRate : null;
    },

    getRateSourceLabel(details, texts) {
        if (!details) return '';
        if (details.source === 'direct') return texts.resultRateSourceDirect || '';
        if (details.source === 'multiplier') return texts.resultRateSourceMultiplier || '';
        return texts.resultRateSourceSame || '';
    },

    // 課金シミュレーション計算の実行
    calculate() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const now = new Date();
        const remainingDays = CALC_PURE.getRemainingCalendarDays(now);
        if (STATE.dom.neededPoints) STATE.dom.neededPoints.min = '0';
        const neededPoints = this.getValidNumberInput(STATE.dom.neededPoints, 0);
        const multiplier = this.getValidNumberInput(STATE.dom.multiplier, 1);
        const rateDetails = this.getRateDetails(STATE.dom.baseRate, STATE.dom.currentStatus, STATE.dom.multiplier);
        const finalRate = rateDetails ? rateDetails.finalRate : null;
        const rateSourceLabel = this.getRateSourceLabel(rateDetails, texts);
        const currentStatusValue = parseFloat(STATE.dom.currentStatus.value);
        const normalRate = config.statusRates[currentStatusValue];
        const selectedTargetOption = STATE.dom.targetStatus.options[STATE.dom.targetStatus.selectedIndex];
        const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;
        const targetThreshold = selectedTargetOption ? parseFloat(selectedTargetOption.value) : NaN;
        const maxNeededPoints = this.getMaxNeededPointsForTarget(config, currentStatusValue, targetThreshold);

        if (neededPoints === null || neededPoints < 0) return UI.displayResult(STATE.dom.result, texts.errorNeededPoints || texts.errorInput, true);
        if (!targetStatusLabel) return UI.displayResult(STATE.dom.result, texts.errorTargetStatus || texts.errorInput, true);
        if (finalRate === null || finalRate <= 0) return UI.displayResult(STATE.dom.result, texts.errorRate, true);
        if (maxNeededPoints === null || neededPoints > maxNeededPoints) return UI.displayResult(STATE.dom.result, texts.errorTargetConsistency, true);

        const finalNeededPoints = neededPoints;
        const spendUnit = config.spendUnit || 100;

        // 購入回数と価格構成が分からないため、購入ごとの丸めは仮定しない概算にする。
        const mainResult = CALC_PURE.computeMainResult({
            neededPoints: finalNeededPoints,
            finalRate,
            spendUnit,
            baseDate: now
        });
        const { totalAmountNeeded, remainingMonths } = mainResult;

        const comparison = finalNeededPoints > 0 && Number.isFinite(normalRate) && finalRate > normalRate
            ? CALC_PURE.computeRateComparison({
                neededPoints: finalNeededPoints, selectedRate: finalRate, baseRate: normalRate, spendUnit
            }) : null;
        const { resultContent, resultDetailsContent } = renderMainResult({
            config, neededPoints: finalNeededPoints, totalAmountNeeded, remainingMonths, remainingDays,
            finalRate, rateSourceLabel, comparison,
            guidanceContent: this.renderResultGuidance(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays),
            purchaseCheckContent: finalNeededPoints > 0 ? this.renderPurchaseCheckLink() : ''
        });

        UI.displayResult(STATE.dom.result, resultContent);
        UI.displayResultDetails(resultDetailsContent);
        STATE.dom.result.dataset.requiredYen = totalAmountNeeded;
        STATE.dom.result.dataset.targetStatusLabel = targetStatusLabel;
        STATE.dom.result.dataset.shareUrl = SHARE ? SHARE.buildMainShareUrl() : '';
        ANALYTICS.track('calculation_completed', {
            calculation_mode: 'rank_up',
            region: STATE.currentRegion,
            target_status: targetStatusLabel,
            ...ANALYTICS.getEntryContext()
        });
        ANALYTICS.markEngaged();
    },

    // 課金額からの逆算シミュレーション計算の実行
    reverseCalculate() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        const amountYen = this.getValidNumberInput(STATE.dom.amountYen, 0.01);
        const rateDetails = this.getRateDetails(STATE.dom.reverseBaseRate, STATE.dom.reverseStatus, STATE.dom.reverseMultiplier);
        const finalRate = rateDetails ? rateDetails.finalRate : null;
        const rateSourceLabel = this.getRateSourceLabel(rateDetails, texts);

        if (amountYen === null || finalRate === null) return UI.displayResult(STATE.dom.reverseResult, texts.errorInputReverse, true);
        if (finalRate <= 0) return UI.displayResult(STATE.dom.reverseResult, texts.errorRateReverse, true);

        const spendUnit = config.spendUnit || 100;
        const { earnedPoints, earnedPointsRaw } = CALC_PURE.computeReverseResult({
            amountYen,
            finalRate,
            spendUnit
        });

        const resultContent = renderReverseResult({
            config, earnedPoints, finalRate, rateSourceLabel,
            purchaseCheckContent: this.renderPurchaseCheckLink()
        });

        UI.displayResult(STATE.dom.reverseResult, resultContent);
        STATE.dom.reverseResult.dataset.earnedPoints = String(earnedPoints);
        STATE.dom.reverseResult.dataset.earnedPointsRaw = earnedPointsRaw.toFixed(2);
        STATE.dom.reverseResult.dataset.amountYen = amountYen;
        STATE.dom.reverseResult.dataset.shareUrl = SHARE ? SHARE.buildReverseShareUrl() : '';
        ANALYTICS.track('reverse_calculation_completed', {
            calculation_mode: 'spend_to_points',
            region: STATE.currentRegion,
            ...ANALYTICS.getEntryContext()
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
            .then(() => {
                ANALYTICS.track('share_url_copied', {
                    calculation_mode: 'rank_up',
                    region: STATE.currentRegion,
                    target_status: targetStatusLabel
                });
                UI.showToast(texts.toastCopySuccess);
            })
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
        ANALYTICS.track('share_x_clicked', {
            calculation_mode: 'rank_up',
            region: STATE.currentRegion,
            target_status: targetStatusLabel
        });
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
        ANALYTICS.track('share_x_clicked', {
            calculation_mode: 'spend_to_points',
            region: STATE.currentRegion
        });
    }
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.CALC = CALC;
    window.PP_APP.CALC_PURE = CALC_PURE;
}
