'use strict';

// 商品の内容・提供版とGoogle Playの決済価格は別々の証拠として扱う。
// iOSやPCの商品掲載は名称の出典であり、Android価格の出典ではない。
const REVIEWED_AT = '2026-10-07';
const locales = ['en', 'ko', 'tw'];
const text = (en, ko, tw) => ({ en, ko, tw });
const source = (url, scope, kind = 'publisher-help') => ({ url, scope, kind });
const offer = (names, details, evidence, subscription = false) => ({ names, details, evidence, subscription });
const common = (entry) => Object.fromEntries(locales.map(locale => [locale, [entry]]));
const S = {
  welkin: source('https://support.hoyoverse.com/hc/en-us/articles/52089442214809-What-happens-to-my-Blessing-of-the-Welkin-Moon-Primogems-if-I-don-t-log-in', 'global'),
  supply: source('https://store.epicgames.com/p/honkai-star-rail-express-supply-pass-b72410', 'global', 'publisher-store-content'),
  interknot: source('https://store.playstation.com/en-nz/product/EP7711-PPSA20599_00-NAPPS5VIPUSD0499', 'global', 'publisher-store-content'),
  lunite: source('https://store.playstation.com/en-us/product/EB1238-PPSA24686_00-0039297268247085/', 'global', 'publisher-store-content'),
  blue: source('https://forum.nexon.com/bluearchive-en/board_view?board=3223&thread=3302505', 'global', 'publisher-notice'),
  pocket: source('https://support.pokemon.com/hc/en-us/articles/30331739144596-Pok%C3%A9mon-TCG-Pocket-Purchase-and-Premium-Pass-FAQ', 'global'),
  umaUS: source('https://apps.apple.com/us/app/umamusume-pretty-derby/id6480433538?platform=ipad', 'US', 'publisher-ios-listing'),
  umaKR: source('https://kakaogames.oqupie.com/portals/1576/articles/85236', 'KR'),
  umaTW: source('https://apps.apple.com/tw/app/%E8%B3%BD%E9%A6%AC%E5%A8%98pretty-derby/id1575861620', 'TW', 'publisher-ios-listing'),
  fgoUS: source('https://fate-go.us/9th_anniversary/campaign/', 'US', 'publisher-notice'),
  monpass: source('https://www.monster-strike.com.tw/news/20250509_km.html', 'TW', 'publisher-notice'),
  monpassPremium: source('https://www.monster-strike.com.tw/news/20250807_kk.html', 'TW', 'publisher-notice'),
  padUS: source('https://www.puzzleanddragons.us/single-post/2020/06/25/pd-pass-frequently-asked-questions', 'US'),
  padKR: source('https://pad.neocyon.com/W/Notice/View.aspx?id=2260', 'KR', 'publisher-notice'),
  hbrUS: source('https://apps.apple.com/us/app/heaven-burns-red/id6630372362', 'US', 'publisher-ios-listing'),
  hbrKR: source('https://apps.apple.com/kr/app/%ED%97%A4%EB%B8%90-%EB%B2%88%EC%A6%88-%EB%A0%88%EB%93%9C/id1576831351', 'KR', 'publisher-ios-listing'),
  hbrTW: source('https://apps.apple.com/tw/app/%E7%B7%8B%E6%9F%93%E5%A4%A9%E7%A9%BA-heaven-burns-red/id1576831351', 'TW', 'publisher-ios-listing'),
  colorUS: source('https://sega.helpshift.com/hc/en/12-hatsune-miku-colorful-stage/faq/704-how-many-crystals-do-i-get-from-subscribing-to-colorful/', 'US'),
  sekaiUS: source('https://www.colorfulstage.com/news/detail/000985.html', 'US', 'publisher-notice'),
  sekaiKR: source('https://apps.apple.com/kr/app/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EC%84%B8%EC%B9%B4%EC%9D%B4-%EC%BB%AC%EB%9F%AC%ED%92%80-%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%A7%80-feat-%ED%95%98%EC%B8%A0%EB%84%A4-%EB%AF%B8%EC%BF%A0/id1598881852?ct=Tap235158', 'KR', 'publisher-ios-listing'),
  sekaiTW: source('https://apps.apple.com/tw/app/%E4%B8%96%E7%95%8C%E8%A8%88%E7%95%AB-%E7%B9%BD%E7%B4%9B%E8%88%9E%E5%8F%B0-feat-%E5%88%9D%E9%9F%B3%E6%9C%AA%E4%BE%86/id1557595935?platform=ipad', 'TW', 'publisher-ios-listing'),
  boost: source('https://mementomori.zendesk.com/hc/en-us/articles/44102448913049-About-Monthly-Boost', 'global'),
  phantom: source('https://apps.apple.com/us/app/jujutsu-kaisen-phantom-parade/id6475925341?platform=watch', 'US', 'publisher-ios-listing'),
  reverseUS: source('https://apps.apple.com/us/app/reverse-1999/id1672933190?at=11l9ub', 'US', 'publisher-ios-listing'),
  reverseTW: source('https://re1999.movergames.com/page/new_52629.html', 'TW', 'publisher-notice'),
  sv: source('https://shadowverse-wb.com/en/news/detail/?id=01M1AVCXPWBBD14K80ME5RPVQF', 'global', 'publisher-notice'),
  go: source('https://pokemongo.com/news/go-pass-october-2026?hl=en', 'global', 'publisher-notice'),
  efootball: source('https://www.konami.com/efootball/en-us/page/v5/versioninfo_v5-00', 'global', 'publisher-notice')
};
const empty = () => ({ en: [], ko: [], tw: [] });
const GAME_EVIDENCE = {
  genshin: {
    editions: text('https://genshin.hoyoverse.com/en/', 'https://genshin.hoyoverse.com/ko/', 'https://genshin.hoyoverse.com/zh-tw/'),
    offers: common(offer(text('Blessing of the Welkin Moon', '공월 축복 (Blessing of the Welkin Moon)', '空月祝福'), text('Log in to collect 90 Primogems each day. Missed days are not refunded, so choose this for daily play rather than an immediate top-up.', '매일 로그인해 원석 90개를 받습니다. 놓친 날은 보충되지 않으니 바로 쓸 원석보다 매일 플레이할 때 비교해 보세요.', '每天登入領取90原石，漏領不補發。適合每天遊玩；今天急需的原石要另外算。'), S.welkin))
  },
  starrail: {
    editions: text('https://hsr.hoyoverse.com/en-us/', 'https://hsr.hoyoverse.com/ko-kr/', 'https://hsr.hoyoverse.com/zh-tw/'),
    offers: common(offer(text('Express Supply Pass', '열차 보급 허가증', '列車補給憑證'), text('300 Oneiric Shards arrive on purchase, then 90 Stellar Jades per login day for 30 days. Missed daily rewards are not refunded.', '구매 즉시 오래된 꿈 300개, 30일 동안 로그인한 날마다 성옥 90개를 받습니다. 놓친 날의 성옥은 보충되지 않습니다.', '購買時獲得300古老夢華，30天內每天登入領取90星瓊。未登入當日的星瓊不補發。'), S.supply))
  },
  zzz: {
    editions: text('https://zenless.hoyoverse.com/en-us/', 'https://zenless.hoyoverse.com/ko-kr/', 'https://zenless.hoyoverse.com/zh-tw/'),
    offers: common(offer(text('Inter-Knot Membership', '인터넷 회원', '繩網會員'), text('Includes 300 Monochromes at purchase and 90 Polychromes per daily login during a 30-day membership. Separate the immediate reward from the daily rewards.', '구매 시 흑백 필름 300개와 30일간 매일 로그인 보상 폴리크롬 90개를 받습니다. 즉시 받는 보상과 일일 보상을 나눠 생각하세요.', '購買時獲得300菲林底片，30天會員期間每天登入領取90菲林。立即獲得的部分與每日獎勵要分開考慮。'), S.interknot))
  },
  wutheringwaves: {
    editions: text('https://wutheringwaves.kurogames.com/en/', 'https://wutheringwaves.kurogames.com/kr/', 'https://wutheringwaves.kurogames.com/zh-tw/'),
    offers: common(offer(text('Lunite Subscription', '월정액 (Lunite Subscription)', '月相觀測卡'), text('The publisher lists 300 Lunites at purchase and 90 Astrites on daily login for 30 days. A console listing confirms the contents, not the Google Play price.', '공식 상품은 구매 시 월상 300개와 30일간 매일 로그인 시 별의 소리 90개를 안내합니다. 콘솔 상품 설명은 내용의 출처이며 Google Play 가격이 아닙니다.', '官方商品說明為購買時300月相、30天每天登入90星聲。主機商品頁用來核對內容，Google Play售價另看結帳畫面。'), S.lunite))
  },
  bluearchive: {
    editions: text('https://bluearchive.nexon.com/', 'https://apps.apple.com/kr/app/%EB%B8%94%EB%A3%A8-%EC%95%84%EC%B9%B4%EC%9D%B4%EB%B8%8C/id1571873795', 'https://apps.apple.com/tw/app/%E8%94%9A%E8%97%8D%E6%AA%94%E6%A1%88/id1571873795'),
    offers: common(offer(text('Monthly / Half Monthly Pyroxene Packs', '월간 / 하프 월간 청휘석 패키지', 'Monthly／Half Monthly青輝石禮包'), text('Check the full and half packs separately. Nexon also lists Lite products and a Battle Pass; their duration and rewards differ from the standard packs.', '일반형과 하프형을 따로 비교하세요. Nexon 안내에는 Lite 상품과 배틀 패스도 있으며 기간과 보상이 일반 상품과 다릅니다.', '一般與半量版本要分開比較。Nexon另有Lite商品與Battle Pass，期間及獎勵不能直接套用一般禮包。'), S.blue))
  },
  pokepoke: {
    extraSources: [source('https://play.google.com/store/apps/editorial?hl=en_US&id=mc_games_editorialmd_pokemon_trading_card_game_pocket_launch_fcp', 'global', 'google-play-product-introduction')],
    editions: text('https://tcgpocket.pokemon.com/en-us/', 'https://pokemonkorea.co.kr/game_support/pokemon_tcg_pocket_FAQ/view/2434', 'https://www.pokemontcgpocket.com/tc/'),
    offers: common(offer(text('Premium Pass', '프리미엄 패스', '高級通行證'), text('A monthly subscription for additional pack stamina and premium missions. It is tied to the store account used to subscribe; deleting the app does not cancel it.', '추가 팩 스태미나와 프리미엄 미션을 제공하는 월간 구독입니다. 구독한 스토어 계정에 연결되며 앱을 삭제해도 구독은 취소되지 않습니다.', '月費訂閱提供額外開包體力及高級任務。權益連結訂閱時的商店帳號；刪除App不會取消訂閱。'), S.pocket, true))
  },
  umamusume: {
    editions: text('https://cygames.com/en/games/umamusume_en/', 'https://umamusume.kakaogames.com/mejiro/index.html', 'https://apps.apple.com/tw/app/%E8%B3%BD%E9%A6%AC%E5%A8%98pretty-derby/id1575861620'),
    offers: {
      en: [offer(text('Daily Carat Pack'), text('The English publisher listing names this Daily Carat Pack. Japanese Umasuku and Umaplan are separate services; their prices and benefits are not copied to this edition.'), S.umaUS)],
      ko: [offer(text(null, '먼슬리 우마'), text(null, '구매·갱신 시 유료 쥬얼 500개, 매일 무료 쥬얼 50개와 데일리 레이스 티켓 추가 보충 등을 제공합니다. 못 받은 일일 무료 쥬얼은 다음 로그인에 모아서 지급됩니다.'), S.umaKR, true)],
      tw: [offer(text(null, null, '每日寶石包'), text(null, null, '繁體中文版的發行商商品列表列有每日寶石包。不要直接套用日本版ウマスク與ウマプラン的特典或日圓價格。'), S.umaTW)]
    }
  },
  fgo: {
    editions: text('https://fate-go.us/', 'https://fgo.netmarble.com/', 'https://www.fate-go.com.tw/'),
    offers: {
      en: [offer(text('Paid Saint Quartz summons — event dependent'), text('The NA 9th Anniversary Destiny Order used 30 paid Saint Quartz and ended July 14, 2026. It is not an ongoing pass. Check the next banner’s paid-only requirements before buying.'), S.fgoUS)],
      ko: [], tw: []
    },
    focus: text('Keep paid Saint Quartz separate from free bonus Quartz when checking a paid-only summon.', '유료 전용 소환을 확인할 때 유료 성정석과 무료 보너스 성정석을 구분하세요.', '付費限定召喚的條件要分開核對付費聖晶石與免費贈送的聖晶石。')
  },
  monst: {
    editions: text('https://www.monster-strike.com/', 'https://www.monster-strike.com/', 'https://www.monster-strike.com.tw/'),
    referenceLocales: ['en', 'ko'],
    offers: { en: [], ko: [], tw: [
      offer(text(null, null, '怪彈會員'), text(null, null, '官方公告月費為NT$140，提供會員便利功能。請核對Google Play現行月費；這裡不把香港售價換算成台灣價格。'), S.monpass, true),
      offer(text(null, null, '怪彈會員豪華版'), text(null, null, '官方公告月費為NT$440，與一般怪彈會員不同。會員限定禮包另行付費，不包含在月費中；APK版不能購買會員。'), S.monpassPremium, true)
    ] }
  },
  gakumas: {
    editions: text('https://gakuen.idolmaster-official.jp/', 'https://gakuen.idolmaster-official.jp/', 'https://gakuen.idolmaster-official.jp/'),
    referenceLocales: locales, offers: empty()
  },
  nikke: {
    editions: text('https://nikke-en.com/indexm.html', 'https://nikke-kr.com/', 'https://nikke.hotcool.tw/'),
    offers: { en: [offer(text('30-Day Supply / 30-Day Upgrade Supply'), text('The publisher lists these as two different products. Compare each product’s current Android contents and price before choosing which one fits your play.'), source('https://apps.apple.com/us/app/goddess-of-victory-nikke/id1585915174?platform=ipad', 'US', 'publisher-ios-listing'))], ko: [], tw: [offer(text(null, null, 'MISSION PASS'), text(null, null, '台灣營運方的更新公告列有MISSION PASS。先查看本期內容與剩餘時間，再決定把預算放在通行證或珠寶上。'), source('https://nikke.hotcool.tw/m/News_detail-203', 'TW', 'publisher-notice'))] }
  },
  dokkan: {
    editions: text('https://bnfaq.channel.or.jp/title/1624', 'https://apps.apple.com/kr/app/dragon-ball-z-%ED%8F%AD%EB%A0%AC%EA%B2%A9%EC%A0%84/id951627425', 'https://apps.apple.com/tw/app/dragon-ball-z-%E4%B8%83%E9%BE%8D%E7%8F%A0%E7%88%86%E8%A3%82%E6%BF%80%E6%88%B0/id951627425'), offers: empty(),
    focus: text('Compare the Dragon Stone offer in the app with the official Web Store separately. A web purchase is not a Google Play transaction.', '앱의 용석 상품과 공식 Web Store 상품을 따로 비교하세요. 웹 구매는 Google Play 거래가 아닙니다.', 'App內龍石商品與官方Web Store要分開比較。Web付款不是Google Play交易。')
  },
  arknights: {
    editions: text('https://www.arknights.global/', 'https://www.arknights.kr/', 'https://apps.apple.com/tw/app/%E6%98%8E%E6%97%A5%E6%96%B9%E8%88%9F/id1490985322?platform=ipad'),
    offers: { en: [offer(text('Monthly Card'), text('The publisher identifies a Monthly Card in its pack notice. Compare its daily rewards with the Originite Prime you need immediately; enter the Android checkout price below.'), source('https://www.arknights.global/news/337', 'US', 'publisher-notice'))], ko: [], tw: [offer(text(null, null, '月卡'), text(null, null, '台灣發行商的商品列表列有月卡。先比較每天領取的獎勵與立即需要的源石，再用Android結帳金額計算。'), source('https://apps.apple.com/tw/app/%E6%98%8E%E6%97%A5%E6%96%B9%E8%88%9F/id1490985322?platform=ipad', 'TW', 'publisher-ios-listing'))] }
  },
  pad: {
    editions: text('https://www.puzzleanddragons.us/', 'https://pad.neocyon.com/', 'https://pad.gungho.jp/hktw/pad/'),
    offers: { en: [offer(text('P&D Pass'), text('A monthly, automatically renewing subscription with scheduled exclusive dungeons and other benefits. It is a different purchase from individual Magic Stone packs.'), S.padUS, true)], ko: [offer(text(null, '퍼드패스'), text(null, '전용 던전 등이 제공되는 월정액 서비스입니다. 한국 운영사의 2026년 안내를 기준으로 확인했으며 일본 파즈도라 패스 가격을 원화로 환산하지 않습니다.'), S.padKR, true)], tw: [] }
  },
  mementomori: {
    editions: text('https://mememori-game.com/en/', 'https://mememori-game.com/kr/', 'https://mememori-game.com/tw/'),
    offers: common(offer(text('Monthly Boost', 'Monthly Boost (월간 혜택)', 'Monthly Boost（30天特典）'), text('Lasts 30 days including purchase day. Includes immediate and daily rewards; the previous day’s unclaimed rewards are sent to Presents.', '구매일을 포함해 30일간 적용됩니다. 즉시·일일 보상이 있으며 전날 받지 않은 보상은 선물함으로 지급됩니다.', '包含購買日在內有效30天，有立即與每日獎勵。前一天未領取的獎勵會寄到禮物箱。'), S.boost))
  },
  proseka: {
    editions: text('https://www.colorfulstage.com/', 'https://www.kr-pjsekai.com/', 'https://www.tw-pjsekai.com/'),
    offers: {
      en: [offer(text('Colorful+ Basic / Standard / Deluxe'), text('Each tier has paid and free Crystals, items and a 14-day login bonus. First-month discounts change the Crystal quantities; compare tiers before choosing.'), S.colorUS, true), offer(text('World Pass / MYSEKAI Mission Pass'), text('The English version’s 5.0 update introduced these MYSEKAI-related products. They are distinct from Colorful+ and its Crystal subscription.'), S.sekaiUS)],
      ko: [offer(text(null, '컬러풀 패스 / 프리미엄 미션 패스'), text(null, '한국판 업데이트에는 컬러풀 패스 연속 구매와 프리미엄 미션 패스가 안내되어 있습니다. 영어판 Colorful+의 보상 수량을 한국판에 그대로 적용하지 않습니다.'), S.sekaiKR)],
      tw: [offer(text(null, null, '世界通行證／我的「世界」任務通行證'), text(null, null, '繁體中文版更新說明列有世界通行證及每月任務通行證。我的「世界」家具與工具等獎勵，和水晶訂閱商品要分開比較。'), S.sekaiTW)]
    }
  },
  hbr: {
    editions: text('https://heavenburnsred.yo-star.com/', 'https://kr.heaven-burns-red.com/', 'https://tw.heaven-burns-red.com/'),
    offers: {
      en: [offer(text('Monthly Light Pass / Monthly Premium Pass'), text('Yostar’s English listing includes Light and Premium passes as separate products, plus three-month bundles. Choose the product actually shown in your app before entering its price.'), S.hbrUS)],
      ko: [offer(text(null, '월정액 라이트 패스 / 월정액 프리미엄 패스'), text(null, 'WFS 한국판 상품 목록에는 라이트와 프리미엄 패스가 각각 있습니다. 글로벌 Yostar판 달러 가격 대신 한국 Google Play 결제액으로 계산하세요.'), S.hbrKR)],
      tw: [offer(text(null, null, '輕型月費方案／尊爵月費方案'), text(null, null, 'WFS繁體中文版有輕型與尊爵兩種月費方案。與Yostar英語版分開核對，再輸入台灣Google Play結帳金額。'), S.hbrTW)]
    }
  },
  phantomparade: {
    editions: text('https://jujutsuphanpara.biligames.com/1stanniversary/special/timeline/?language=en', 'https://play.google.com/store/apps/details?hl=ko&id=com.bilibilihk.jujutsuphanparagp', 'https://play.google.com/store/apps/details?hl=zh-TW&id=com.bilibilihk.jujutsuphanparagp'),
    names: text('Jujutsu Kaisen Phantom Parade', '주술회전 팬텀 퍼레이드', '咒術迴戰 幻影夜行'),
    offers: { en: [offer(text('Monthly Pass / Weekly Pass'), text('The global publisher listing names Monthly Pass and Weekly Pass separately. They are not Japanese paid-Cube bundles; use your Android purchase screen to compare the two.'), S.phantom)], ko: [], tw: [] }
  },
  reverse1999: {
    editions: text('https://re1999.bluepoch.com/en/home/', 'https://apps.apple.com/kr/app/%EB%A6%AC%EB%B2%84%EC%8A%A4-1999/id6449023119', 'https://re1999.movergames.com/'),
    offers: { en: [offer(text('Roaring Month'), text('Bluepoch’s English product list includes Roaring Month. It is distinct from the version’s one-off sale packs; compare the offer in your Android shop before topping up.'), S.reverseUS)], ko: [], tw: [offer(text(null, null, '咆哮的一月'), text(null, null, '台灣營運方將訂閱商品「咆哮的一月」與活動「咆哮驚喜月」分開說明。活動贈送的獎勵不是你本次付費的金額。'), S.reverseTW)] }
  },
  honkai3rd: {
    editions: text('https://honkaiimpact3.hoyoverse.com/global/en-us/', 'https://apps.apple.com/kr/app/%EB%B6%95%EA%B4%B43rd/id1286705196', 'https://apps.apple.com/tw/app/%E5%B4%A9%E5%A3%9E3rd/id1233055283'), offers: empty()
  },
  shadowversewb: {
    editions: text('https://shadowverse-wb.com/en/', 'https://shadowverse-wb.com/ko/', 'https://shadowverse-wb.com/cht/'),
    names: text('Shadowverse: Worlds Beyond', '섀도우버스: 월즈 비욘드', '闇影詩章：凌越世界'),
    offers: common(offer(text('Premium Battle Pass', '프리미엄 배틀 패스', '高級對戰通行證'), text('Season 16 runs from the September 29 maintenance until card set #10. The pass uses in-game Crystals; spending Crystals you already own is not a new Google Play purchase.', '시즌 16은 9월 29일 점검 후부터 10탄 카드팩 출시까지입니다. 패스는 게임 내 크리스탈로 구매하며 이미 가진 크리스탈 사용은 새로운 Google Play 결제가 아닙니다.', 'Season 16自9月29日維護後至第10彈卡包登場為止。通行證以遊戲內水晶購買，花掉原有水晶不是一筆新的Google Play付款。'), S.sv))
  },
  'prospi-a': {
    editions: text('https://www.konami.com/games/prospi_a/', 'https://www.konami.com/games/prospi_a/', 'https://www.konami.com/games/prospi_a/'), referenceLocales: locales, offers: empty()
  },
  'pokemon-go': {
    editions: text('https://pokemongo.com/', 'https://pokemongo.com/?hl=ko', 'https://pokemongo.com/?hl=zh_Hant'),
    offers: common(offer(text('GO Pass Deluxe — October 2026', 'GO패스 디럭스 — 2026년 10월', 'GO Pass Deluxe — 2026年10月'), text('October’s paid upgrade is available October 6–November 3, local time. Deluxe and Deluxe + 10 Ranks differ; collect unlocked rewards before November 5. It is not a renewing monthly subscription.', '10월 유료 업그레이드 기간은 현지 시간 10월 6일~11월 3일입니다. 디럭스와 디럭스 + 10랭크는 다른 상품이며 보상은 11월 5일까지 수령해야 합니다. 자동 갱신 월정액이 아닙니다.', '10月付費升級於當地時間10月6日至11月3日提供。Deluxe與Deluxe + 10 Ranks不同，已解鎖獎勵須於11月5日前領取，不是自動續訂月費。'), S.go))
  },
  efootball: {
    editions: text('https://www.konami.com/efootball/en-us/', 'https://www.konami.com/efootball/ko/', 'https://www.konami.com/efootball/zh-tw/'), offers: empty(),
    focus: text('The old Match Pass was replaced by Campaign Hub. Check current packs in the app; eFootball Points are separate from Google Play Points.', '기존 매치 패스는 캠페인 허브로 변경됐습니다. 앱의 현재 상품을 확인하세요. eFootball 포인트는 Google Play Points와 다른 제도입니다.', '舊Match Pass已改為Campaign Hub。請看App內目前的商品；eFootball點數與Google Play Points不同。'), extraSources: [S.efootball]
  }
};

// 価格未確認は0円の商品ではなく、価格データが存在しない状態とする。
function isReference(locale, id) { return GAME_EVIDENCE[id]?.referenceLocales?.includes(locale) || false; }
function referenceFiles() { return Object.keys(GAME_EVIDENCE).flatMap(id => locales.filter(locale => isReference(locale, id)).map(locale => `${locale}/games/${id}/index.html`)); }
module.exports = { REVIEWED_AT, GAME_EVIDENCE, S, locales, isReference, referenceFiles };
