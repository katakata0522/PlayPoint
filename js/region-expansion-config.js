'use strict';

function cloneRegion(base, overrides) {
    return {
        ...base,
        ...overrides,
        statuses: { ...overrides.statuses },
        statusRates: { ...overrides.statusRates },
        thresholds: { ...overrides.thresholds },
        statusPointsMapping: { ...overrides.statusPointsMapping },
        tooltips: { ...base.tooltips, ...overrides.tooltips },
        uiText: { ...base.uiText, ...overrides.uiText }
    };
}

export function createExpansionConfigs(configs) {
    const baseTw = configs.TW;
    const baseUs = configs.US;

    if (!baseTw || !baseUs) {
        throw new Error('Base region configs must be initialized before expansion regions.');
    }

    const hk = cloneRegion(baseTw, {
        lang: 'zh-HK',
        statuses: { '銅級': 1.0, '銀級': 1.25, '金級': 1.5, '鉑金級': 1.75, '鑽石級': 2.0 },
        statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
        thresholds: { '銀級': 250, '金級': 1000, '鉑金級': 4000, '鑽石級': 15000 },
        statusPointsMapping: {
            1.0: ['銀級', '金級', '鉑金級', '鑽石級'],
            1.25: ['金級', '鉑金級', '鑽石級'],
            1.5: ['鉑金級', '鑽石級'],
            1.75: ['鑽石級'],
            2.0: []
        },
        currencySymbol: 'HK$',
        rateUnit: 'HK$7',
        spendUnit: 7,
        tooltips: {
            'tooltip-target-status': '<strong>【香港 Play Points 等級條件】</strong><ul><li><strong>銀級:</strong> 250 pt 或以上</li><li><strong>金級:</strong> 1,000 pt 或以上</li><li><strong>鉑金級:</strong> 4,000 pt 或以上</li><li><strong>鑽石級:</strong> 15,000 pt 或以上</li></ul><hr><p>等級與獲點率會因國家／地區而異；本頁使用香港的官方條件。</p>',
            'tooltip-base-rate': '<strong>【香港基本獲點率】</strong><p>系統會依目前等級，自動帶入每 HK$7 的基本獲點率。只有 Google Play 活動畫面顯示其他特別獲點率時才需要修改。</p>',
            'tooltip-multiplier': '<strong>【活動特別獲點率】</strong><p>請輸入 Google Play 活動詳情顯示的最終獲點率，例如「每 HK$7 3 點」。系統會比較基本獲點率與特別獲點率並使用較高者，不會把兩者相乘。</p>',
            'tooltip-reverse-base-rate': '<strong>【香港基本獲點率】</strong><p>系統會依目前等級，自動帶入每 HK$7 的基本獲點率。</p>',
            'tooltip-reverse-multiplier': '<strong>【活動特別獲點率】</strong><p>請輸入 Google Play 活動詳情顯示的最終獲點率，例如「每 HK$7 3 點」。</p>'
        },
        uiText: {
            title: 'Google Play Points 計算器（香港）｜升級還差多少？',
            mainTitle: 'Google Play Points 計算器（香港）',
            siteAlias: '香港版 / 非官方 Play Points 試算工具',
            siteDescription: '依照香港 Google Play Points 的等級與獲點率，估算升級所需消費金額。<br>輸入目前等級、目標等級及尚欠點數，即可用港元計算。',
            labelBaseRate: '每 HK$7 獲得點數（自動帶入，可修改）',
            labelMultiplier: '活動特別獲點率（例：每 HK$7 3 點）',
            labelMultiplierReverse: '活動特別獲點率（例：每 HK$7 3 點）',
            warningRate: '本頁使用香港的等級與基本獲點率。若 Google Play 顯示活動特別獲點率，系統會與基本獲點率比較並採用較高者；資格、上限及啟用條件請以 Google Play 為準。',
            labelAmountYen: '消費金額（HK$）',
            amountYenPlaceholder: '例如：350',
            calculationNote: '※本頁依香港 Play Points 條件估算。今年剩餘期間以相同進度計算；實際獲點率、適用購買項目與活動條件請以 Google Play 官方畫面為準。',
            linkLatest: { text: '🆕 最新資訊中心 (日文)', href: '../latest/' },
            linkArticles: { text: '📝 繁體中文指南', href: '../tw/articles/' },
            linkPrivacy: { text: '隱私權政策 (日文)', href: '../privacy.html' },
            linkTerms: { text: '服務條款 (日文)', href: '../terms.html' },
            linkQA: { text: 'Q&A 與後記 (日文)', href: '../info.html' },
            linkAbout: { text: '什麼是 Play Points？', href: '../about-playpoints.html' },
            linkWidget: { text: '免費小工具', href: '../embed.html' },
            linkDiscount: { text: '💡 優惠儲值指南（繁中）', href: '../tw/articles/2026-06-20-discount-gift-cards.html' },
            linkAuthor: { text: '營運者與政策 (日文)', href: '../author/katakata.html' },
            linkAttention: { text: '⚠️ 國家別差異', href: '../attention.html' }
        }
    });

    const india = cloneRegion(baseUs, {
        lang: 'en-IN',
        statuses: { Bronze: 1.0, Silver: 1.1, Gold: 1.2, Platinum: 1.4 },
        statusRates: { 1.0: 1.0, 1.1: 1.1, 1.2: 1.2, 1.4: 1.4 },
        thresholds: { Silver: 250, Gold: 1000, Platinum: 4000 },
        statusPointsMapping: {
            1.0: ['Silver', 'Gold', 'Platinum'],
            1.1: ['Gold', 'Platinum'],
            1.2: ['Platinum'],
            1.4: []
        },
        currencySymbol: '₹',
        rateUnit: '₹5',
        spendUnit: 5,
        tooltips: {
            'tooltip-target-status': '<strong>India Play Points level requirements:</strong><ul><li><strong>Silver:</strong> 250+ pts</li><li><strong>Gold:</strong> 1,000+ pts</li><li><strong>Platinum:</strong> 4,000+ pts</li></ul><hr><p>Google currently lists Platinum as the highest Play Points level for India. Levels and earn rates vary by country.</p>',
            'tooltip-base-rate': '<strong>India base earn rate:</strong><p>The calculator fills your level rate per ₹5 automatically. Change it only when Google Play shows a different special earn rate for an eligible promotion.</p>',
            'tooltip-multiplier': '<strong>Promotion special earn rate:</strong><p>Enter the final rate shown in Google Play, such as “3 points per ₹5.” The calculator uses the higher of the base and special rates; it does not multiply them.</p>',
            'tooltip-reverse-base-rate': '<strong>India base earn rate:</strong><p>The calculator fills your level rate per ₹5 automatically.</p>',
            'tooltip-reverse-multiplier': '<strong>Promotion special earn rate:</strong><p>Enter the final rate shown in Google Play, such as “3 points per ₹5.”</p>'
        },
        uiText: {
            title: 'Google Play Points Calculator for India | Level-up spending estimate',
            mainTitle: 'Google Play Points Calculator — India',
            siteAlias: 'India edition / unofficial Play Points calculator',
            siteDescription: 'Estimate the spending needed to reach your next Google Play Points level using India-specific levels and earn rates.<br>Enter your current level, target level, and points needed to calculate in INR.',
            labelBaseRate: 'Points per ₹5 (auto-filled, editable)',
            labelMultiplier: 'Promotion special earn rate (e.g. 3 pt / ₹5)',
            labelMultiplierReverse: 'Promotion special earn rate (e.g. 3 pt / ₹5)',
            warningRate: 'This page uses India-specific Play Points levels and base earn rates. If Google Play shows a special promotion rate, the calculator compares it with your base rate and uses the higher one. Check eligibility, caps, and activation in Google Play.',
            labelAmountYen: 'Amount spent (INR)',
            amountYenPlaceholder: 'e.g. 500',
            calculationNote: 'This estimate uses India Play Points conditions and the remaining period through December 31. Check Google Play for the latest eligible purchases, promotion terms, and earn rates.',
            linkLatest: { text: '🆕 Latest Hub (Japanese)', href: '../latest/' },
            linkArticles: { text: '📝 English guides', href: '../en/articles/' },
            linkPrivacy: { text: 'Privacy Policy (Japanese)', href: '../privacy.html' },
            linkTerms: { text: 'Terms of Service (Japanese)', href: '../terms.html' },
            linkQA: { text: 'Q&A & Afterword (Japanese)', href: '../info.html' },
            linkAbout: { text: 'What are Play Points?', href: '../about-playpoints.html' },
            linkWidget: { text: 'Free widget', href: '../embed.html' },
            linkDiscount: { text: '💡 Discount Guide (English)', href: '../en/articles/2026-06-20-discount-gift-cards.html' },
            linkAuthor: { text: 'Operator & Policy (Japanese)', href: '../author/katakata.html' },
            linkAttention: { text: '⚠️ Country Diff', href: '../attention.html' }
        }
    });

    return { HK: hk, IN: india };
}
