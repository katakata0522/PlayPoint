'use strict';

const VERIFIED_AT = '2026-09-13';

const { getRegionRule } = require('../js/region-rules.js');
const GOOGLE_PLAY_JP_LEVELS = getRegionRule('JP').tiers.map(({ id, label, rate }) => ({ id, label, rate }));

const SOURCES = {
  genshinWelkinReference: 'https://support.hoyoverse.com/hc/en-us/articles/52089442214809-What-happens-to-my-Blessing-of-the-Welkin-Moon-Primogems-if-I-don-t-log-in',
  googlePlayEarn: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja',
  googlePlayLevels: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja',
  fgoPrice: 'https://news.fate-go.jp/2022/0930mquf/',
  fgoPity: 'https://faq.fate-go.jp/faq/show/1457?site_domain=default',
  fgoLuckyBag2026: 'https://news.fate-go.jp/2026/08/11th_luckybag/',
  monstMonthlyWeb: 'https://www.monster-strike.com/news/20240929_1.html',
  monstWebLaunch: 'https://www.monster-strike.com/news/20240808_10.html',
  monstWebCurrent: 'https://webshop.monster-strike.com/transaction',
  monstAppProducts: 'https://www.monster-strike.com/transaction/',
  monstPremium: 'https://www.monster-strike.com/news/20250807_3.html',
  starrailSupplyPassReference: 'https://store.epicgames.com/p/honkai-star-rail-express-supply-pass-b72410',
  zzzMembershipReference: 'https://store.playstation.com/en-nz/product/EP7711-PPSA20599_00-NAPPS5VIPUSD0499',
  umamusumeUmasuku: 'https://webstore.cygames.com/umamusume/subscriptions/detail/umapack/',
  umamusumeUmasukuLaunch: 'https://umamusume.jp/steam-news/detail?id=2264',
  umamusumeUmaplan: 'https://umamusume.jp/news/detail?id=3097',
  umamusumeUmaplanDetails: 'https://webstore.cygames.com/umamusume/subscriptions/detail/umaboost/',
  prosekaWebStore: 'https://pjsekai.sega.jp/webstore',
  prosekaFaq: 'https://pjsekai.sega.jp/faq/index.html',
  nikkeCommerceLaw: 'https://nikke-jp.com/lawts/',
  gakumasDmmSettlement: 'https://dmg-gakuen.idolmaster-official.jp/fund-settlement/',
  gakumasOfficialPre: 'https://gakuen.idolmaster-official.jp/pre/',
  pokepokePremiumPass: 'https://app-ptcgp.pokemon-support.com/hc/ja/articles/39082740268569-%E3%83%97%E3%83%AC%E3%83%9F%E3%82%A2%E3%83%A0%E3%83%91%E3%82%B9%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84',
  pokepokePremiumMechanics: 'https://support.pokemon.com/hc/en-us/articles/30331739144596-Pok%C3%A9mon-TCG-Pocket-Purchase-and-Premium-Pass-FAQ',
  padPass: 'https://pad.gungho.jp/member/pdpass/',
  padPassFaq: 'https://pad.gungho.jp/member/pdpass/faq.html',
  arknightsMonthlyPass: 'https://www.arknights.jp/contact-1-hint',
  arknightsLimited2026: 'https://arknights.jp/news/2909',
  dokkanWebStoreUsage: 'https://bnfaq.channel.or.jp/faq/detail/3015/8687',
  dokkanWebStoreReflection: 'https://bnfaq.channel.or.jp/faq/detail/3015/8681',
  wutheringOfficial: 'https://wutheringwaves.kurogames.com/jp/announcement/405',
  prospiAOfficial: 'https://www.konami.com/games/prospi_a/',
  prospiAGooglePlayPurchase: 'https://ja-support1.konami.com/hc/ja/articles/5665131759129-Q-%E3%82%A8%E3%83%8A%E3%82%B8%E3%83%BC%E3%81%AE%E8%B3%BC%E5%85%A5%E6%96%B9%E6%B3%95%E3%82%92%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84-%E3%83%97%E3%83%AD%E9%87%8E%E7%90%83%E3%82%B9%E3%83%94%E3%83%AA%E3%83%83%E3%83%84A',
  prospiAWebStore: 'https://pawaspi-point.konami.net/general/prospi_games_store',
  efootballGooglePlay: 'https://www.konami.com/efootball/ja/topic/news/5074',
  efootballPurchaseLimit: 'https://www.konami.com/efootball/ja/topic/news/4796'
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
    verifiedAt: '2026-09-27',
    verification: 'specification-verified-google-play-price-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.genshinWelkinReference, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    welkin: {
      genesisCrystalsImmediate: 300,
      primogemsPerDay: 90,
      days: 30,
      maxPrimogemEquivalent: 3000,
      requiresDailyLogin: true
    }
  },
  starrail: {
    verifiedAt: '2026-09-27',
    verification: 'specification-verified-google-play-price-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.starrailSupplyPassReference, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    supplyPass: {
      oneiricShardsImmediate: 300,
      stellarJadePerDay: 90,
      days: 30,
      maxJadeEquivalent: 3000,
      missedDaysRecoverable: false
    }
  },
  zzz: {
    verifiedAt: '2026-09-27',
    verification: 'specification-verified-google-play-price-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.zzzMembershipReference, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    membership: {
      monochromeImmediate: 300,
      polychromePerDay: 90,
      days: 30,
      maxPolychromeEquivalent: 3000,
      requiresDailyLogin: true
    }
  },
  monst: {
    verifiedAt: VERIFIED_AT,
    verification: 'official',
    sources: [SOURCES.monstMonthlyWeb, SOURCES.monstWebLaunch, SOURCES.monstWebCurrent, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    appStoreReference: { price: 10000, orbs: 180 },
    webStore: { price: 10000, orbs: 190 },
    monthlyWebStore: { price: 10000, orbs: 200, limitPerMonth: 1 },
    productsVerifiedAt: '2026-10-07',
    // アプリ内の商品。Webショップの増量オーブや予算例は含めない。
    packsJa: [
      { id: 'starter-premium', name: '初心者応援パック プレミアム (1,000円)', price: 1000, detail: '獣神化★6確定ガチャ1回とオーブ8個、育成アイテム。' },
      { id: 'collab-starter', name: 'コラボスターターパック (1,000円)', price: 1000, detail: 'コラボ開催時の商品。対象キャラ・内容・販売期間は開催ごとに異なります。' },
      { id: 'first-acquisition', name: '初獲得パック (1,800円)', price: 1800, detail: '初獲得★6確定ガチャ1回とオーブ10個など。排出対象を全て獲得済みなら重複があります。' },
      { id: 'ability', name: '選べる！アビリティパック (3,800円)', price: 3800, detail: '選べるのはアビリティ。キャラを指名する商品ではありません。' },
      { id: 'monpass', name: 'モンパス (月額480円)', price: 480, billing: 'subscription', detail: '自動更新。1日1回のスタミナ全回復、モンスポットのパワー＋など。' },
      { id: 'monpass-premium', name: 'モンパスプレミアム (月額1,980円)', price: 1980, billing: 'subscription', detail: 'モンパスの特典に追加。入会時・1か月継続ごとにCMスキップ券30枚、使用後2週間ごとの対象クエストでラッキーリザルト確定発動など。' },
      { id: 'premium-monthly-pack', name: 'プレミアム会員限定 月イチお得パック (980円)', price: 980, detail: 'プレミアム会員が月1回、別料金で買うパック。オーブ10個、CMスキップ券30枚、育成アイテム。月額料金に含まれません。' },
      ...[[2, 160], [6, 480], [14, 1000], [33, 2200], [60, 3800], [82, 4900], [180, 10000]].map(([orbs, price]) => ({ id: `orbs-${orbs}`, name: `オーブ ${orbs}個 (${price.toLocaleString('ja-JP')}円)`, price }))
    ]
  },
  bluearchive: {
    verifiedAt: VERIFIED_AT,
    verification: 'mechanics-verified-price-recheck-pending',
    publishPriceChanges: false,
    note: '2026-07-29以降の呼び出しチャージ100/200は確認済み。Google Playの現行商品価格は一次情報で再確認できるまで自動更新しない。'
  },
  umamusume: {
    verifiedAt: VERIFIED_AT,
    verification: 'official',
    sources: [SOURCES.umamusumeUmasuku, SOURCES.umamusumeUmasukuLaunch, SOURCES.umamusumeUmaplan, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    legacyDailyJewelPack: {
      endedAt: '2024-12-19T04:59:00+09:00'
    },
    umasuku: {
      price: 980,
      paidJewelsOnPurchaseOrRenewal: 500,
      freeJewelsOnPurchaseOrRenewal: 50,
      freeJewelsPerDay: 50,
      dailyReset: '05:00',
      missedDailyDeliveredOnNextLogin: true,
      validity: 'one-calendar-month',
      trainingRewardMultiplier: 2,
      dailyRaceTicketBonus: 3
    },
    umaplan: {
      price: 1980,
      canCoexistWithUmasuku: true
    }
  },
  proseka: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-webstore-current-google-play-price-recheck-pending',
    sources: [SOURCES.prosekaWebStore, SOURCES.prosekaFaq, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    webStore: {
      crystalProductPrices: [160, 480, 1000, 1800, 3000, 4900, 10000],
      bulkPrices: [30000, 50000],
      premiumMissionPass: 2000,
      mySekaiMissionPass: 2000,
      missionPassSet: 3500,
      colorfulPass: {
        basic: { price: 480, dailyFreeCrystals: 25, days: 30 },
        deluxe: { price: 1500, dailyFreeCrystals: 50, days: 30 },
        precious: { price: 3000, dailyFreeCrystals: 100, days: 30 }
      },
      worldPass: 1500
    },
    googlePlayBoundary: 'Official Web Store purchases are outside Google Play and must not be counted as Google Play Points purchases.'
  },
  nikke: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-price-page-not-publicly-fixed',
    sources: [SOURCES.nikkeCommerceLaw, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    note: '公式の特定商取引法表示は価格を各商品ページで確認する方式。現行Google Playの商品価格を公開テキストで固定できないため、旧固定価格や200連・凸の固定円額を計算候補にしない。'
  },
  gakumas: {
    verifiedAt: VERIFIED_AT,
    verification: 'platform-price-recheck-pending',
    sources: [SOURCES.gakumasDmmSettlement, SOURCES.gakumasOfficialPre, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    note: '公式DMM版表示でも配信ストアが異なるサービスを区別している。Google Play版の現行商品価格を一次情報で固定できるまで、旧ジュエル価格・パス価格・200連固定円額を掲載しない。'
  },
  pokepoke: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-mechanics-price-recheck-pending',
    sources: [SOURCES.pokepokePremiumPass, SOURCES.pokepokePremiumMechanics, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    premiumPass: {
      billing: 'monthly',
      validFor: 'one-month',
      firstTrialDays: 14,
      tiedToPlatformAccount: true,
      googleAccountSupported: true
    },
    note: '公式サポートでGoogle Play定期購入・1か月有効・初回14日無料体験は確認できるが、公開FAQでは現行月額料金やポケゴールド価格を固定していない。購入画面を正本とする。'
  },
  pad: {
    verifiedAt: VERIFIED_AT,
    verification: 'official',
    sources: [SOURCES.padPass, SOURCES.padPassFaq, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    pass: {
      price: 980,
      billing: 'monthly-auto-renew',
      validFor: 'one-month',
      freeTrialDays: 7,
      googlePlaySubscription: true,
      benefits: {
        dailySpecialDungeon: true,
        extraTeamSlots: 5,
        rankExpBonusPercent: 5,
        alwaysAvailableDungeonSets: true,
        passBadge: true,
        eventQuestExtraRewardsWhenAvailable: true,
        highSpeedModeWithoutExtraStamina: true
      }
    }
  },
  arknights: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-mechanics-price-recheck-pending',
    sources: [SOURCES.arknightsMonthlyPass, SOURCES.arknightsLimited2026, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    monthlyPass: {
      paidOriginitePrimeImmediate: 6,
      orundumPerDay: 200,
      sanityPotionPerDay: 1,
      days: 30
    },
    limitedScout: {
      current2026PatternVerified: true,
      extraLimitedOperatorAtPulls: 300,
      limitedContractPerPull: 1
    },
    note: '月パス内容と2026年リミテッドスカウト300回追加報酬は公式確認済み。現行Google Play価格は公開一次情報で固定できないため、旧価格・90,000円固定天井は掲載しない。'
  },
  dokkan: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-webstore-google-play-price-recheck-pending',
    sources: [SOURCES.dokkanWebStoreUsage, SOURCES.dokkanWebStoreReflection, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    webStoreOutsideGooglePlay: true,
    note: '公式FAQでWeb Storeとアプリ外購入履歴は確認できる。現行Google Play龍石価格・セール構成は変動するため旧固定価格を掲載せず、Web StoreをGoogle Play購入として数えない。'
  },
  wutheringwaves: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-game-current-google-play-price-recheck-pending',
    sources: [SOURCES.wutheringOfficial, SOURCES.googlePlayEarn, SOURCES.googlePlayLevels],
    publishGooglePlayPrices: false,
    note: '公式サイトでAndroid対応・ゲーム内課金ありは確認できるが、現行日本Google Playの商品価格を公開一次情報で固定できないため、旧月相価格・48,000円天井・200,000円完凸を掲載しない。'
  }
};

function roundedPointsForYen(yen, rate) {
  return Math.round((Number(yen) / getRegionRule('JP').spendUnit) * Number(rate));
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
