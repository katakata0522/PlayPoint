'use strict';

const VERIFIED_AT = '2026-09-13';

const SOURCES = Object.freeze({
  googlePlayEarn: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja',
  hbrWebShop: 'https://webshop-jp.heaven-burns-red.wfs.games/',
  hbrWebShopHelp: 'https://webshop-jp.heaven-burns-red.wfs.games/ja/help/1',
  hbrWebShopPoints: 'https://webshop-jp.heaven-burns-red.wfs.games/ja/help/2',
  hbrWebShopOther: 'https://webshop-jp.heaven-burns-red.wfs.games/ja/help/4',
  hbrMonthlyServiceLaunch: 'https://heaven-burns-red.com/half-anniversary-campaign/',
  hi3ChargeCenterLaunch: 'https://www.hoyolab.com/article/31445251',
  hi3TopUpDiscount2026: 'https://www.hoyolab.com/article/44065005',
  phantomWebShop: 'https://webshop.jujutsuphanpara.jp/',
  phantomWebShopLogin: 'https://webshop.jujutsuphanpara.jp/login',
  reverseFund: 'https://re1999.bluepoch.com/jp/bluepoch/fund.html',
  reverseCommerce: 'https://re1999.bluepoch.com/jp/bluepoch/about.html',
  reverseOfficial: 'https://re1999.bluepoch.com/jp/home/',
  reverseTopUp: 'https://re1999.bluepoch.com/payment/info'
});

const GAME_SEO_WAVE4 = Object.freeze({
  hbr: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-webshop-current-google-play-price-recheck-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.hbrWebShop, SOURCES.hbrWebShopHelp, SOURCES.hbrWebShopPoints, SOURCES.hbrWebShopOther, SOURCES.hbrMonthlyServiceLaunch, SOURCES.googlePlayEarn],
    monthlyServicesVerified: ['プレミアムパス', 'ライトパス'],
    webShop: {
      appItemDiscountPercent: 5,
      basePointPercent: 1,
      passesPurchasable: false,
      currentQuartzExamples: [
        { quartz: 30000, price: 28500, webOnly: true },
        { quartz: 20000, price: 19000, webOnly: true },
        { quartz: 10000, price: 9500, discountPercent: 5 },
        { quartz: 4750, price: 4655, discountPercent: 5 }
      ]
    },
    note: '公式WEB SHOPはアプリ内より5%OFF・WEB SHOPポイント基本1%を案内している。一方、プレミアムパス/ライトパスはWEB SHOPでは加入不可。現行Google Play側のパス・クォーツ価格は公開一次情報で固定せず、購入画面を正本とする。'
  },
  honkai3rd: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-charge-center-current-google-play-price-recheck-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.hi3ChargeCenterLaunch, SOURCES.hi3TopUpDiscount2026, SOURCES.googlePlayEarn],
    chargeCenter: {
      outsideGooglePlay: true,
      crystalDoubleBonusSharedExceptMonthlyPass: true,
      inGameChargeRewardsStillGranted: true,
      monthlyPassCanExtendWhenRemainingDaysBelow: 180,
      historical2026CouponCampaign: {
        start: '2026-03-05',
        end: '2026-04-16',
        couponPercents: [5, 10],
        currentStandingDiscount: false
      }
    },
    note: '公式チャージセンターの仕組みは確認できるが、現行日本Google Playの水晶・月パス価格を公開一次情報で固定できないため旧価格と固定天井円額を掲載しない。'
  },
  phantomparade: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-webshop-current-google-play-price-recheck-pending',
    publishGooglePlayPrices: false,
    sources: [SOURCES.phantomWebShop, SOURCES.phantomWebShopLogin, SOURCES.googlePlayEarn],
    webShop: {
      outsideGooglePlay: true,
      currentPaidBeadPrices: [160, 480, 1000, 1500, 3000, 5000, 10000],
      currentPaidBeadFirstBonusPercentRange: [17, 20],
      currentPackBonusPercentRange: [4, 5],
      webMileagePerYen: 1,
      currentPassExamples: [
        { name: 'ファンパレボーナス', price: 610, bonusPercent: 4 },
        { name: '毎日廻珠ボーナス', price: 480, bonusPercent: 4 }
      ]
    },
    note: '公式WEBショップの現行商品・増量・マイルは確認できるが、Google Play価格へ流用しない。Google Play親計算機は購入画面の実額入力へfail closedする。'
  },
  reverse1999: {
    verifiedAt: VERIFIED_AT,
    verification: 'official-topup-center-price-page-only',
    publishGooglePlayPrices: false,
    sources: [SOURCES.reverseFund, SOURCES.reverseCommerce, SOURCES.reverseOfficial, SOURCES.reverseTopUp, SOURCES.googlePlayEarn],
    officialTopUpCenter: true,
    priceRule: 'purchase-page-display',
    note: '公式の資金決済法・特商法表示が販売価格を購入ページ表示としている。公式サイトにはチャージセンター導線もあるため、旧固定価格・固定天井円額・全購入がPlay Points対象という断定を撤去する。'
  }
});

module.exports = {
  VERIFIED_AT,
  SOURCES,
  GAME_SEO_WAVE4
};
