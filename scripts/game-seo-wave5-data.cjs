'use strict';

const VERIFIED_AT = '2026-09-13';

const SOURCES = Object.freeze({
  googlePlayEarn: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja',
  prospiOfficial: 'https://www.konami.com/games/prospi_a/',
  prospiPurchaseHelp: 'https://ja-support1.konami.com/hc/ja/articles/5665131759129-Q-%E3%82%A8%E3%83%8A%E3%82%B8%E3%83%BC%E3%81%AE%E8%B3%BC%E5%85%A5%E6%96%B9%E6%B3%95%E3%82%92%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84-%E3%83%97%E3%83%AD%E9%87%8E%E7%90%83%E3%82%B9%E3%83%94%E3%83%AA%E3%83%83%E3%83%84A',
  prospiKonamiStore: 'https://pawaspi-point.konami.net/general/prospi_games_store',
  pokemonGoPurchaseHelp: 'https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/94-how-can-i-purchase-items-and-pokecoins/',
  pokemonGoWebStoreJapan: 'https://niantic.helpshift.com/hc/ja/48-web-store/faq/5475-pokemon-go-web-store-support-japan-only/',
  pokemonGoRewardRoad: 'https://niantic.helpshift.com/hc/ja/48-web-store/faq/5473-what-is-the-reward-road/?l=ja',
  efootballGooglePlay: 'https://www.konami.com/efootball/ja/topic/news/5074',
  efootballOverview: 'https://www.konami.com/efootball/ja/page/overview',
  efootballPoints: 'https://www.konami.com/wepes/efootball_point/ja/'
});

const GAME_SEO_WAVE5 = Object.freeze({
  'prospi-a': {
    icon: '⚾',
    verifiedAt: VERIFIED_AT,
    verification: 'official-android-google-account-and-konami-games-store-verified-current-price-recheck-pending',
    publishGooglePlayPrices: false,
    currencyName: 'エナジー',
    sources: [SOURCES.prospiOfficial, SOURCES.prospiPurchaseHelp, SOURCES.prospiKonamiStore, SOURCES.googlePlayEarn],
    googlePlay: {
      androidAccountPaymentVerified: true,
      currentPricesPublished: false
    },
    webStore: {
      outsideGooglePlay: true,
      officialName: 'KONAMI Gamesストア',
      officialSaysBetterThanInApp: true,
      pawaspiGoldPerTaxIncludedYen: 0.01,
      dPointPerTaxIncludedYenWhenLinked: 0.005,
      pointPaidPortionExcludedFromRewardAccrual: true
    },
    note: 'Androidのアプリ内エナジー購入はGoogleアカウントの支払い方法でストア決済される。KONAMI Gamesストアは別のWEB決済で、公式がアプリ内よりお得と案内し、独自のパワスピ・ゴールド等があるためGoogle Play Pointsと混同しない。現行エナジー価格は購入画面を正本とする。'
  },
  'pokemon-go': {
    icon: '📍',
    verifiedAt: VERIFIED_AT,
    verification: 'official-android-store-routing-and-web-store-benefits-verified-current-price-recheck-pending',
    publishGooglePlayPrices: false,
    currencyName: 'ポケコイン',
    sources: [SOURCES.pokemonGoPurchaseHelp, SOURCES.pokemonGoWebStoreJapan, SOURCES.pokemonGoRewardRoad, SOURCES.googlePlayEarn],
    googlePlay: {
      androidPurchaseRoutes: ['Google Play', 'Galaxy Store'],
      currentPricesPublished: false
    },
    webStore: {
      outsideGooglePlay: true,
      bonusPokeCoinsOnStandardBundles: true,
      webExclusivePacks: true,
      rewardRoad: true,
      rewardRoadEligiblePurchaseRule: 'real-money-eligible-purchases',
      giftCardAndPokeCoinPurchasesExcludedFromRewardRoad: true
    },
    note: 'AndroidではGoogle PlayまたはGalaxy Storeで購入が完了するため、Google Play Pointsを数えるのはGoogle Play決済として表示される購入だけ。Pokémon GO Web Storeは別決済で、ボーナスポケコイン・Web限定商品・Reward Roadを別軸で比較する。'
  },
  efootball: {
    icon: '⚽',
    verifiedAt: VERIFIED_AT,
    verification: 'official-google-play-coin-purchase-and-efootball-point-separation-verified-current-price-recheck-pending',
    publishGooglePlayPrices: false,
    currencyName: 'eFootball™コイン',
    sources: [SOURCES.efootballGooglePlay, SOURCES.efootballOverview, SOURCES.efootballPoints, SOURCES.googlePlayEarn],
    googlePlay: {
      androidGooglePlayPurchaseVerified: true,
      currentPricesPublished: false
    },
    efootballPoints: {
      sameAsGooglePlayPoints: false,
      use: 'players-and-in-game-items',
      konamiIdLinkRequiredForExchange: true,
      expiryMonthsAfterClaim: 6
    },
    note: 'eFootball™コインのAndroid/Google Play購入経路は公式確認済み。一方、eFootball™ポイントはKONAMI独自ポイントでGoogle Play Pointsとは別制度。現行コイン価格は固定せず購入画面を正本とする。'
  }
});

module.exports = {
  VERIFIED_AT,
  SOURCES,
  GAME_SEO_WAVE5
};
