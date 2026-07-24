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
    // 購入ごとのポイントは購入金額全体に還元率を掛けてから丸める。
    getPointsForPurchase(amount, finalRate, spendUnit = 100) {
        return Math.round((amount / spendUnit) * finalRate);
    },

    // 小数通貨のパック合計に浮動小数点誤差を表示・共有しない。
    roundCurrencyAmount(amount) {
        return Math.round((amount + Number.EPSILON) * 100) / 100;
    },

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
            const pointsPerPack = this.getPointsForPurchase(packAmount, finalRate, spendUnit);
            if (pointsPerPack <= 0) {
                totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
            } else {
                packsNeeded = Math.ceil(neededPoints / pointsPerPack);
                totalAmountNeeded = this.roundCurrencyAmount(packsNeeded * packAmount);
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
            { href: 'maintenance/platinum/', title: 'プラチナ維持はいくら必要？' },
            { href: 'status/platinum/', title: 'プラチナ到達はいくら必要？' },
            { href: 'status/diamond/', title: 'ダイヤモンド到達はいくら必要？' },
            { href: 'articles/2025-12-25-playpoints-rank-maintenance.html', title: 'ランク維持期間の仕組み' },
            { href: 'articles/2025-12-25-weekly-reward.html', title: 'ウィークリーリワードの受け取り方' },
            { href: 'articles/2026-06-20-discount-gift-cards.html', title: 'お得に課金するためのギフトコード活用' },
            { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: 'Play Pointsの反映タイミング' }
        ],
        diamond: [
            { href: 'status/diamond/', title: 'ダイヤモンド到達はいくら必要？' },
            { href: 'maintenance/diamond/', title: 'ダイヤモンド維持はいくら必要？' },
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

    getResultNavigation() {
        const localized = {
            US: {
                relatedArticleGroups: {
                    platinum: [{ href: 'status/platinum/', title: 'Platinum cost calculator' }, { href: 'articles/google-play-points-platinum-diamond-cost.html', title: 'Platinum and Diamond cost guide' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }],
                    diamond: [{ href: 'status/diamond/', title: 'Diamond cost calculator' }, { href: 'articles/google-play-points-platinum-diamond-cost.html', title: 'Platinum and Diamond cost guide' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }],
                    campaign: [{ href: 'articles/google-play-points-promotion-not-applied.html', title: 'Promotion not applied: what to check' }, { href: 'articles/google-play-points-gift-cards.html', title: 'Gift card conditions' }],
                    default: [{ href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }, { href: 'articles/google-play-points-reflection-timing.html', title: 'When points appear' }, { href: 'articles/google-play-points-not-showing.html', title: 'Points not showing: what to check' }]
                },
                decisionTitle: 'What to check next',
                highSpend: { href: 'campaign/3x/', title: 'Compare a 3x promotion', note: 'Check the difference before buying' },
                campaign: { href: 'articles/google-play-points-promotion-not-applied.html', title: 'Check promotion conditions', note: 'Confirm the bonus applies to this purchase' },
                diamond: { href: 'status/diamond/', title: 'Check the Diamond target', note: 'Review the points and spending estimate' },
                platinum: { href: 'status/platinum/', title: 'Check the Platinum target', note: 'Review the points and spending estimate' },
                nearYearEnd: { href: 'articles/google-play-points-reflection-timing.html', title: 'Check point reflection timing', note: 'Avoid a delay near year-end' },
                notShowing: { href: 'articles/google-play-points-not-showing.html', title: 'Check missing points', note: 'Review purchase history and pending items' },
                giftCards: { href: 'articles/google-play-points-gift-cards.html', title: 'Check gift card conditions', note: 'Confirm eligibility before buying' }
            },
            KR: {
                relatedArticleGroups: {
                    platinum: [{ href: 'status/platinum/', title: '플래티넘 목표 계산기' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points 등급 안내' }, { href: 'articles/google-play-points-gift-cards.html', title: '기프트카드 조건 확인' }],
                    diamond: [{ href: 'status/diamond/', title: '다이아몬드 목표 계산기' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points 등급 안내' }, { href: 'articles/google-play-points-gift-cards.html', title: '기프트카드 조건 확인' }],
                    campaign: [{ href: 'articles/google-play-points-promotion-not-applied.html', title: '캠페인 미적용 확인' }, { href: 'articles/google-play-points-gift-cards.html', title: '기프트카드 조건 확인' }],
                    default: [{ href: 'articles/google-play-points-levels.html', title: 'Google Play Points 등급 안내' }, { href: 'articles/google-play-points-not-showing.html', title: '포인트 미반영 확인' }, { href: 'articles/google-play-points-gift-cards.html', title: '기프트카드 조건 확인' }]
                },
                decisionTitle: '다음으로 확인할 사항',
                highSpend: { href: 'campaign/3x/', title: '3배 캠페인과 비교', note: '구매 전 차이를 확인하세요' },
                campaign: { href: 'articles/google-play-points-promotion-not-applied.html', title: '캠페인 조건 확인', note: '이번 구매에 적용되는지 확인하세요' },
                diamond: { href: 'status/diamond/', title: '다이아몬드 목표 확인', note: '필요 포인트와 예상 금액을 확인하세요' },
                platinum: { href: 'status/platinum/', title: '플래티넘 목표 확인', note: '필요 포인트와 예상 금액을 확인하세요' },
                nearYearEnd: { href: 'articles/google-play-points-not-showing.html', title: '포인트 반영 상태 확인', note: '연말 전 반영 상태를 확인하세요' },
                notShowing: { href: 'articles/google-play-points-not-showing.html', title: '포인트 미반영 확인', note: '구매 내역과 보류 항목을 확인하세요' },
                giftCards: { href: 'articles/google-play-points-gift-cards.html', title: '기프트카드 조건 확인', note: '구매 전 대상 여부를 확인하세요' }
            },
            TW: {
                relatedArticleGroups: {
                    platinum: [{ href: 'status/platinum/', title: '白金級目標計算器' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points 等級說明' }, { href: 'articles/google-play-points-gift-cards.html', title: '禮物卡條件確認' }],
                    diamond: [{ href: 'status/diamond/', title: '鑽石級目標計算器' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points 等級說明' }, { href: 'articles/google-play-points-gift-cards.html', title: '禮物卡條件確認' }],
                    campaign: [{ href: 'articles/google-play-points-promotion-not-applied.html', title: '活動未套用確認' }, { href: 'articles/google-play-points-gift-cards.html', title: '禮物卡條件確認' }],
                    default: [{ href: 'articles/google-play-points-levels.html', title: 'Google Play Points 等級說明' }, { href: 'articles/google-play-points-not-showing.html', title: '點數未顯示確認' }, { href: 'articles/google-play-points-gift-cards.html', title: '禮物卡條件確認' }]
                },
                decisionTitle: '接下來請確認',
                highSpend: { href: 'campaign/3x/', title: '比較 3 倍活動', note: '購買前先確認差異' },
                campaign: { href: 'articles/google-play-points-promotion-not-applied.html', title: '確認活動條件', note: '確認本次購買是否適用' },
                diamond: { href: 'status/diamond/', title: '確認鑽石級目標', note: '確認所需點數與預估金額' },
                platinum: { href: 'status/platinum/', title: '確認白金級目標', note: '確認所需點數與預估金額' },
                nearYearEnd: { href: 'articles/google-play-points-not-showing.html', title: '確認點數入帳狀態', note: '年底前確認入帳狀態' },
                notShowing: { href: 'articles/google-play-points-not-showing.html', title: '確認點數未顯示', note: '確認購買紀錄與處理中項目' },
                giftCards: { href: 'articles/google-play-points-gift-cards.html', title: '確認禮物卡條件', note: '購買前確認是否符合資格' }
            }
        };

        return localized[STATE.currentRegion] || {
            relatedArticleGroups: this.relatedArticleGroups,
            decisionTitle: '次に確認すること',
            highSpend: { href: 'campaign/3x/', title: '高い場合は3倍キャンペーンで比較する', note: '通常時との差を先に確認' },
            campaign: { href: 'articles/2025-12-25-campaign.html', title: 'キャンペーン対象外条件を確認する', note: '倍率が本当に適用されるか確認' },
            diamond: { href: 'articles/2025-12-25-diamond-worth-it.html', title: 'ダイヤモンドが本当に得か見る', note: '必要額と特典価値を比較' },
            platinum: { href: 'maintenance/platinum/', title: 'プラチナ維持も確認する', note: '到達後のペースを確認' },
            nearYearEnd: { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: '年末前に反映タイミングを見る', note: '締め直前の遅れを避ける' },
            notShowing: { href: 'articles/2025-12-25-playpoints-not-reflected.html', title: '課金後にポイントがつかない時の確認手順', note: '購入履歴と保留中を確認' },
            giftCards: { href: 'articles/2026-06-20-discount-gift-cards.html', title: '購入前チェックで使いすぎを防ぐ', note: 'ギフトコードや還元上限を確認' }
        };
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

    renderRelatedArticles(targetStatusLabel, multiplier) {
        const texts = CONFIGS[STATE.currentRegion].uiText;
        const articles = this.getRelatedArticles(targetStatusLabel, multiplier);
        if (!articles.length) return '';

        const items = articles
            .map((article, index) => `<li><a href="${article.href}" data-result-related-link data-link-position="${index + 1}">${article.title}</a></li>`)
            .join('');

        return `
            <div class="result-related-links">
                <h3>${texts.resultRelatedTitle || '関連記事'}</h3>
                <ul>${items}</ul>
            </div>
        `;
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

    renderDecisionLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays) {
        const links = this.getDecisionLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays);
        if (!links.length) return '';

        const items = links
            .map((link, index) => `
                <li>
                    <a href="${link.href}" data-result-decision-link data-link-position="${index + 1}">
                        <span>${link.title}</span>
                        <small>${link.note}</small>
                    </a>
                </li>
            `)
            .join('');

        return `
            <div class="result-decision-links">
                <h3>${this.getResultNavigation().decisionTitle}</h3>
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
        // HTML側のstep・min・max制約にも違反している値は計算へ渡さない
        if (element.validity && element.validity.valid === false) return null;
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
        
        const finalNeededPoints = neededPoints;

        const spendUnit = config.spendUnit || 100;
        let totalAmountNeeded = 0;
        let packResultContent = '';

        // パック額が入力されているか検証
        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;

        if (finalNeededPoints <= 0) {
            totalAmountNeeded = 0;
        } else if (packAmount !== null && packAmount > 0) {
            const pointsPerPack = CALC_PURE.getPointsForPurchase(packAmount, finalRate, spendUnit);
            
            if (pointsPerPack <= 0) {
                totalAmountNeeded = Math.ceil((finalNeededPoints / finalRate) * spendUnit);
            } else {
                const packsNeeded = Math.ceil(finalNeededPoints / pointsPerPack);
                totalAmountNeeded = CALC_PURE.roundCurrencyAmount(packsNeeded * packAmount);
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
        const decisionLinksContent = this.renderDecisionLinks(totalAmountNeeded, targetStatusLabel, multiplier, remainingDays);

        if (finalNeededPoints <= 0) {
            resultContent = `
                <div style="padding:1em; background:rgba(40, 167, 69, 0.1); border: 2px solid #28a745; border-radius: 8px; text-align:center; font-weight:bold; color:#218838; margin-bottom:1em;">
                    🎉 ${texts.resultLabelFreeClear || '課金不要'}
                </div>
                <dl>
                    <dt>${texts.resultLabelNeededPoints}</dt>
                    <dd><b><span class="count-target" data-value="${neededPoints}">0</span> pt</b></dd>
                </dl>
                ${relatedArticlesContent}
                ${decisionLinksContent}
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
                ${decisionLinksContent}
            `;
        }
        
        UI.displayResult(STATE.dom.result, resultContent);
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
