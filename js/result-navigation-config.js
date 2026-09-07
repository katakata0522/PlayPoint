'use strict';

const OFFICIAL_HK = 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DHK&hl=zh-HK';
const OFFICIAL_IN = 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DIN&hl=en-IN';

const JP = {
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
    decisionTitle: '次に確認すること',
    highSpend: { href: 'campaign/3x/', title: '高い場合は3倍キャンペーンで比較する', note: '通常時との差を先に確認' },
    campaign: { href: 'articles/2025-12-25-campaign.html', title: 'キャンペーン対象外条件を確認する', note: '倍率が本当に適用されるか確認' },
    diamond: { href: 'articles/2025-12-25-diamond-worth-it.html', title: 'ダイヤモンドが本当に得か見る', note: '必要額と特典価値を比較' },
    platinum: { href: 'maintenance/platinum/', title: 'プラチナ維持も確認する', note: '到達後のペースを確認' },
    nearYearEnd: { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: '年末前に反映タイミングを見る', note: '締め直前の遅れを避ける' },
    notShowing: { href: 'articles/2026-03-10-play-points-reflection-timing.html', title: '課金後にポイントがつかない時の確認手順', note: '購入履歴と保留中を確認' },
    giftCards: { href: 'articles/2026-06-20-discount-gift-cards.html', title: '購入前チェックで使いすぎを防ぐ', note: 'ギフトコードや還元上限を確認' }
};

const US = {
    relatedArticleGroups: {
        platinum: [{ href: 'status/platinum/', title: 'Platinum cost calculator' }, { href: 'articles/google-play-points-platinum-diamond-cost.html', title: 'Platinum and Diamond cost guide' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }],
        diamond: [{ href: 'status/diamond/', title: 'Diamond cost calculator' }, { href: 'articles/google-play-points-platinum-diamond-cost.html', title: 'Platinum and Diamond cost guide' }, { href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }],
        campaign: [{ href: 'articles/google-play-points-promotion-not-applied.html', title: 'Promotion not applied: what to check' }, { href: 'articles/google-play-points-gift-cards.html', title: 'Gift card conditions' }],
        default: [{ href: 'articles/google-play-points-levels.html', title: 'Google Play Points levels' }, { href: 'articles/google-play-points-not-showing.html', title: 'Points not showing: what to check' }]
    },
    decisionTitle: 'What to check next',
    highSpend: { href: 'campaign/3x/', title: 'Compare a 3x promotion', note: 'Check the difference before buying' },
    campaign: { href: 'articles/google-play-points-promotion-not-applied.html', title: 'Check promotion conditions', note: 'Confirm the bonus applies to this purchase' },
    diamond: { href: 'status/diamond/', title: 'Check the Diamond target', note: 'Review the points and spending estimate' },
    platinum: { href: 'status/platinum/', title: 'Check the Platinum target', note: 'Review the points and spending estimate' },
    nearYearEnd: { href: 'articles/google-play-points-not-showing.html', title: 'Check point reflection timing', note: 'Avoid a delay near year-end' },
    notShowing: { href: 'articles/google-play-points-not-showing.html', title: 'Check missing points', note: 'Review purchase history and pending items' },
    giftCards: { href: 'articles/google-play-points-gift-cards.html', title: 'Check gift card conditions', note: 'Confirm eligibility before buying' }
};

const KR = {
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
};

const TW = {
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
};

const HK_OFFICIAL = { href: OFFICIAL_HK, title: 'Google Play 香港官方等級與獲點率', note: '確認最新香港條件' };
const HK_NOTES = { href: '../attention.html', title: '查看國家／地區注意事項', note: '購買前確認適用條件' };
const HK = {
    relatedArticleGroups: {
        platinum: [HK_OFFICIAL, HK_NOTES],
        diamond: [HK_OFFICIAL, HK_NOTES],
        campaign: [HK_OFFICIAL, HK_NOTES],
        default: [HK_OFFICIAL, HK_NOTES]
    },
    decisionTitle: '接下來可以確認',
    highSpend: HK_NOTES,
    campaign: HK_OFFICIAL,
    diamond: HK_OFFICIAL,
    platinum: HK_OFFICIAL,
    nearYearEnd: HK_OFFICIAL,
    notShowing: HK_NOTES,
    giftCards: HK_NOTES
};

const IN_OFFICIAL = { href: OFFICIAL_IN, title: 'Official Google Play India levels and earn rates', note: 'Check the latest India conditions' };
const IN_NOTES = { href: '../attention.html', title: 'Check country and promotion notes', note: 'Confirm eligibility before buying' };
const IN = {
    relatedArticleGroups: {
        platinum: [IN_OFFICIAL, IN_NOTES],
        diamond: [IN_OFFICIAL, IN_NOTES],
        campaign: [IN_OFFICIAL, IN_NOTES],
        default: [IN_OFFICIAL, IN_NOTES]
    },
    decisionTitle: 'What to check next',
    highSpend: IN_NOTES,
    campaign: IN_OFFICIAL,
    diamond: IN_OFFICIAL,
    platinum: IN_OFFICIAL,
    nearYearEnd: IN_OFFICIAL,
    notShowing: IN_NOTES,
    giftCards: IN_NOTES
};

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const RESULT_NAVIGATION_CONFIGS = deepFreeze({ JP, US, KR, TW, HK, IN });

export function assertResultNavigationCoverage(regionCodes) {
    const missingRegions = [...new Set(regionCodes || [])]
        .filter(region => !Object.prototype.hasOwnProperty.call(RESULT_NAVIGATION_CONFIGS, region));
    if (missingRegions.length > 0) {
        throw new Error(`Missing result navigation config for region(s): ${missingRegions.join(', ')}`);
    }
    return true;
}

export function getResultNavigationConfig(region) {
    return RESULT_NAVIGATION_CONFIGS[region] || RESULT_NAVIGATION_CONFIGS.JP;
}
