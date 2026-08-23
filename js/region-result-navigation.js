'use strict';

const OFFICIAL_HK = 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DHK&hl=zh-HK';
const OFFICIAL_IN = 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DIN&hl=en-IN';

function createHongKongNavigation() {
    const official = { href: OFFICIAL_HK, title: 'Google Play 香港官方等級與獲點率', note: '確認最新香港條件' };
    const notes = { href: '../attention.html', title: '查看國家／地區注意事項', note: '購買前確認適用條件' };
    const groups = {
        platinum: [official, notes],
        diamond: [official, notes],
        campaign: [official, notes],
        default: [official, notes]
    };
    return {
        relatedArticleGroups: groups,
        decisionTitle: '接下來可以確認',
        highSpend: notes,
        campaign: official,
        diamond: official,
        platinum: official,
        nearYearEnd: official,
        notShowing: notes,
        giftCards: notes
    };
}

function createIndiaNavigation() {
    const official = { href: OFFICIAL_IN, title: 'Official Google Play India levels and earn rates', note: 'Check the latest India conditions' };
    const notes = { href: '../attention.html', title: 'Check country and promotion notes', note: 'Confirm eligibility before buying' };
    const groups = {
        platinum: [official, notes],
        diamond: [official, notes],
        campaign: [official, notes],
        default: [official, notes]
    };
    return {
        relatedArticleGroups: groups,
        decisionTitle: 'What to check next',
        highSpend: notes,
        campaign: official,
        diamond: official,
        platinum: official,
        nearYearEnd: official,
        notShowing: notes,
        giftCards: notes
    };
}

export function installExpandedRegionResultNavigation(CALC, STATE) {
    if (!CALC || !STATE || CALC.__expandedRegionNavigationInstalled) return;
    const original = CALC.getResultNavigation.bind(CALC);
    CALC.getResultNavigation = function getExpandedRegionNavigation() {
        if (STATE.currentRegion === 'HK') return createHongKongNavigation();
        if (STATE.currentRegion === 'IN') return createIndiaNavigation();
        return original();
    };
    Object.defineProperty(CALC, '__expandedRegionNavigationInstalled', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
    });
}
