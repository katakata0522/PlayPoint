'use strict';

// 計算上の国・地域ルールだけを所有する。UI文言・保存状態・DOMには依存しない。
// 既存の確認済み値を移設したもの。移設日を公式再確認日として扱わない。
const TIER_IDS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

function regionRule(spendUnit, currencyCode, tiers) {
    return Object.freeze({
        spendUnit,
        currencyCode,
        tiers: Object.freeze(tiers.map(([label, rate, threshold], index) =>
            Object.freeze({ id: TIER_IDS[index], label, rate, threshold })))
    });
}

export const REGION_RULES = Object.freeze({
    JP: regionRule(100, 'JPY', [
        ['ブロンズ', 1, 0], ['シルバー', 1.25, 250], ['ゴールド', 1.5, 1000],
        ['プラチナ', 1.75, 4000], ['ダイヤモンド', 2, 15000]
    ]),
    US: regionRule(1, 'USD', [
        ['Bronze', 1, 0], ['Silver', 1.1, 150], ['Gold', 1.2, 600],
        ['Platinum', 1.4, 3000], ['Diamond', 1.6, 10000]
    ]),
    KR: regionRule(1000, 'KRW', [
        ['브론즈', 1, 0], ['실버', 1.1, 150], ['골드', 1.3, 600],
        ['플래티넘', 1.6, 2400], ['다이아몬드', 2, 15000]
    ]),
    TW: regionRule(30, 'TWD', [
        ['銅級', 1, 0], ['銀級', 1.25, 250], ['黃金級', 1.5, 1000],
        ['白金級', 1.75, 4000], ['鑽石級', 2, 15000]
    ]),
    HK: regionRule(7, 'HKD', [
        ['銅級', 1, 0], ['銀級', 1.25, 250], ['金級', 1.5, 1000],
        ['鉑金級', 1.75, 4000], ['鑽石級', 2, 15000]
    ]),
    IN: regionRule(5, 'INR', [
        ['Bronze', 1, 0], ['Silver', 1.1, 250], ['Gold', 1.2, 1000], ['Platinum', 1.4, 4000]
    ])
});

export function getRegionRule(region) {
    if (!Object.prototype.hasOwnProperty.call(REGION_RULES, region)) {
        throw new RangeError(`Unsupported Play Points region: ${region}`);
    }
    return REGION_RULES[region];
}

// 既存の呼び出し形式は保ち、同じ数値・昇格候補を別々に手書きしない。
// 呼び出しごとに新しいオブジェクトと配列を返し、別地域や次回生成を汚染しない。
export function createRegionCalculationConfig(region) {
    const { spendUnit, tiers } = getRegionRule(region);
    return {
        statuses: Object.fromEntries(tiers.map(tier => [tier.label, tier.rate])),
        statusRates: Object.fromEntries(tiers.map(tier => [tier.rate, tier.rate])),
        thresholds: Object.fromEntries(tiers.slice(1).map(tier => [tier.label, tier.threshold])),
        statusPointsMapping: Object.fromEntries(tiers.map((tier, index) =>
            [tier.rate, tiers.slice(index + 1).map(next => next.label)])),
        spendUnit
    };
}
