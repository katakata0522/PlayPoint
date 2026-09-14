'use strict';

/**
 * CALC_PURE: DOM非依存の純粋計算関数群
 * - ブラウザ環境なしでUnit Testが書ける
 * - 通常計算・逆算の数値計算を担当し、表示や保存は呼び出し側が担当する
 */
export const CALC_PURE = {
    // 購入ごとのポイントは購入金額全体に還元率を掛けてから丸める。
    getPointsForPurchase(amount, finalRate, spendUnit = 100) {
        return Math.round((amount / spendUnit) * finalRate);
    },

    // 小数通貨の金額に浮動小数点誤差を表示・共有しない。
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
     * 年末までの残り日数を算出（暦日基準）。
     * local date componentだけをUTC上の日付へ写し、DSTやtimezone offsetで
     * 「1日」が23/25時間になる影響を受けないようにする。
     * @param {Date} baseDate
     * @returns {number} 次年1月1日までの残り暦日数
     */
    getRemainingCalendarDays(baseDate = new Date()) {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const day = baseDate.getDate();
        const todayUtc = Date.UTC(year, month, day);
        const nextYearUtc = Date.UTC(year + 1, 0, 1);
        return Math.max(0, (nextYearUtc - todayUtc) / 86400000);
    },

    /**
     * 課金シミュレーション計算（純粋関数）
     * @param {object} params - 計算に必要なパラメータ
     * @param {number} params.neededPoints - 必要ポイント数
     * @param {number} params.finalRate - 最終還元率
     * @param {number} params.spendUnit - 計算単位（例: 100円）
     * @param {Date}   params.baseDate - 基準日（デフォルト: 今日）
     * @returns {{ totalAmountNeeded: number, remainingMonths: number }}
     */
    computeMainResult({ neededPoints, finalRate, spendUnit = 100, baseDate = new Date() }) {
        const remainingMonths = this.getRemainingMonths(baseDate);
        if (neededPoints <= 0) {
            return { totalAmountNeeded: 0, remainingMonths };
        }

        return {
            totalAmountNeeded: Math.ceil((neededPoints / finalRate) * spendUnit),
            remainingMonths
        };
    },

    /**
     * 通常還元と選択中の還元条件を比較する。
     * 表示用の比較であり、既存の計算結果そのものは変更しない。
     */
    computeRateComparison({ neededPoints, selectedRate, baseRate, spendUnit = 100 }) {
        const values = [neededPoints, selectedRate, baseRate, spendUnit];
        if (!values.every(Number.isFinite) || neededPoints <= 0 || selectedRate <= 0 || baseRate <= 0 || spendUnit <= 0) {
            return null;
        }

        const baseResult = this.computeMainResult({
            neededPoints,
            finalRate: baseRate,
            spendUnit
        });
        const selectedResult = this.computeMainResult({
            neededPoints,
            finalRate: selectedRate,
            spendUnit
        });

        return {
            baseAmount: baseResult.totalAmountNeeded,
            selectedAmount: selectedResult.totalAmountNeeded,
            savedAmount: this.roundCurrencyAmount(Math.max(0, baseResult.totalAmountNeeded - selectedResult.totalAmountNeeded))
        };
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
