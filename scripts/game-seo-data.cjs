'use strict';

const VERIFIED_AT = '2026-09-13';

const GOOGLE_PLAY_JP_LEVELS = [
  { id: 'bronze', label: 'ブロンズ', rate: 1 },
  { id: 'silver', label: 'シルバー', rate: 1.25 },
  { id: 'gold', label: 'ゴールド', rate: 1.5 },
  { id: 'platinum', label: 'プラチナ', rate: 1.75 },
  { id: 'diamond', label: 'ダイヤモンド', rate: 2 }
];

const SOURCES = {
  googlePlayEarn: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja',
  googlePlayLevels: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja',
  fgoPrice: 'https://news.fate-go.jp/2022/0930mquf/',
  fgoPity: 'https://faq.fate-go.jp/faq/show/1457?site_domain=default',
  fgoLuckyBag2026: 'https://news.fate-go.jp/2026/08/11th_luckybag/',
  monstMonthlyWeb: 'https://www.monster-strike.com/news/20240929_1.html',
  monstWebLaunch: 'https://www.monster-strike.com/news/20240808_10.html',
  monstWebCurrent: 'https://webshop.monster-strike.com/transaction',
  genshinPriceSnapshot: 'https://www.hoyolab.com/article/46140522'
};

const FGO_PACKS_JP = [
  { paid: 4, free: 1, total: 5, price: 480 },
  { paid: 13, free: 8, total: 21, price: 1600 },
  { paid: 25, free: 16, total: 41, price: 3000 },
  { paid: 42, free: 35, total: 77, price: 4900 },
  { paid: 86, free: 82, total: 168, price: 10000 }
];

const GAME_SEO = {
  fgo: {
    verifiedAt: VERIFIED_AT,
    verification: 'official',
    sources: [SOURCES.fgoPrice, SOURCES.fgoPity, SOURCES.fgoLuckyBag2026, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    packsJa: FGO_PACKS_JP,
    pity: {
      guaranteedSummonCount: 330,
      paidTenPulls: 30,
      quartzRequired: 900,
      cheapestVerifiedSpendFromZero: 54600,
      quartzPurchasedAtThatSpend: 902,
      combo: [
        { totalQuartz: 168, price: 10000, count: 5 },
        { totalQuartz: 41, price: 3000, count: 1 },
        { totalQuartz: 21, price: 1600, count: 1 }
      ]
    },
    luckyBag: {
      paidQuartzRequired: 15,
      cheapestVerifiedSpendFromZero: 1920,
      paidQuartzPurchased: 16,
      combo: [{ totalQuartz: 5, paidQuartz: 4, price: 480, count: 4 }]
    }
  },
  genshin: {
    verifiedAt: VERIFIED_AT,
    verification: 'current-published-price-snapshot',
    sources: [SOURCES.genshinPriceSnapshot, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    japanPriceCorrections: [
      { item: '創世結晶 980+110個', oldPrice: 1220, price: 1840 }
    ],
    welkin: {
      price: 610,
      genesisCrystalsImmediate: 300,
      primogemsPerDay: 90,
      days: 30,
      maxPrimogemEquivalent: 3000,
      requiresDailyLogin: true
    }
  },
  monst: {
    verifiedAt: VERIFIED_AT,
    verification: 'official',
    sources: [SOURCES.monstMonthlyWeb, SOURCES.monstWebLaunch, SOURCES.monstWebCurrent, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    appStoreReference: { price: 10000, orbs: 180 },
    webStore: { price: 10000, orbs: 190 },
    monthlyWebStore: { price: 10000, orbs: 200, limitPerMonth: 1 }
  },
  bluearchive: {
    verifiedAt: '2026-09-13',
    verification: 'mechanics-verified-price-recheck-pending',
    publishPriceChanges: false,
    note: '2026-07-29以降の呼び出しチャージ100/200は確認済み。Google Playの現行商品価格は一次情報で再確認できるまで自動更新しない。'
  }
};

function roundedPointsForYen(yen, rate) {
  return Math.round((Number(yen) / 100) * Number(rate));
}

function pointRowsForYen(yen) {
  return GOOGLE_PLAY_JP_LEVELS.map(level => ({
    ...level,
    points: roundedPointsForYen(yen, level.rate)
  }));
}

module.exports = {
  VERIFIED_AT,
  GOOGLE_PLAY_JP_LEVELS,
  SOURCES,
  FGO_PACKS_JP,
  GAME_SEO,
  roundedPointsForYen,
  pointRowsForYen
};
