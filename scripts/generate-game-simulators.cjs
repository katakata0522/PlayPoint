'use strict';

const fs = require('fs');
const path = require('path');

// 多言語ロケール定義
const LOCALES = {
  ja: {
    lang: 'ja',
    langCode: 'ja',
    dir: '',
    siteName: 'Playポイント計算機',
    authorName: 'かたかた',
    homeTitle: 'ホーム',
    portalTitle: 'ゲーム別計算',
    blogTitle: '記事一覧',
    authorTitle: '運営者',
    breadcrumbsHome: 'ホーム',
    breadcrumbsPortal: 'ゲーム別計算機一覧',
    currencySymbol: '円',
    currencyPrefix: '',
    currencySuffix: ' 円',
    pointValuePrefix: '約 ',
    pointValueSuffix: ' 円分',
    unitSpend: 100,
    rateText: '100円=1pt',
    verifiedDate: '最終確認：2026年8月',
    badgeText: '人気ゲーム別シミュレーター',
    portalBadge: '🎮 ソシャゲ特化',
    portalH1: '人気ゲーム別 Playポイント課金・天井シミュレーター',
    portalMeta: 'お気に入りのゲームを選んで、パック課金や天井ガチャで貯まるPlayポイントを計算できます。',
    portalLead: 'Google Playストアで配信されている人気ゲームの課金アイテム（創世結晶、往日の夢華、モノクローム、青輝石、ポケゴールド、ジュエル、聖晶石、オーブなど）の価格レートに対応！「天井（ガチャ確定）まで回したら何ポイント還元される？」「完凸でゴールド・プラチナランクに届く？」をワンタップでシミュレーションできます。',
    openCalc: '計算機を開く ➔',
    presetHeading: '▼ 目標プリセット：',
    approxText: '約 ',
    customAmountLabel: '課金予定合計額（円）：',
    packSelectLabel: '課金パックを選択：',
    packCountLabel: '購入回数：',
    customOption: '自由入力（カスタム金額）',
    multiplierLabel: 'ポイント倍率：',
    multiplierOptions: [
      { val: '1', label: '通常時（等倍 / 1%）' },
      { val: '2', label: '2倍キャンペーン' },
      { val: '3', label: '3倍キャンペーン' },
      { val: '4', label: '4倍キャンペーン' },
      { val: '5', label: '5倍キャンペーン' },
      { val: '7', label: '7倍キャンペーン' }
    ],
    statusLabel: '現在の会員ランク：',
    statusOptions: [
      { val: '1.0', label: 'ブロンズ（100円=1pt）' },
      { val: '1.25', label: 'シルバー（100円=1.25pt）' },
      { val: '1.5', label: 'ゴールド（100円=1.5pt）' },
      { val: '1.75', label: 'プラチナ（100円=1.75pt）' },
      { val: '2.0', label: 'ダイヤモンド（100円=2.0pt）' }
    ],
    resTotalLabel: '課金合計金額',
    resEarnedLabel: '獲得予定 Playポイント',
    resValueLabel: 'ポイント還元価値',
    resRankLabel: '到達ステータス',
    resProgressTitle: 'ランク進捗状況',
    disclaimerText: '※Google Play公式の四捨五入ルールに基づき計算しています。実際の付与ポイントはGoogle Play購入画面の事前表示をご確認ください。',
    giftCardCtaTitle: '💳 課金前にチェック！さらにお得にする裏技',
    giftCardCtaText: '楽天市場の「Google Play ギフトコード認定店」で購入すると、楽天ポイント（SPU等）が二重取りできて実質数％〜十数％お得になります！',
    giftCardCtaBtn: 'お得な購入方法を見る ➔',
    giftCardCtaHref: 'articles/2026-06-20-discount-gift-cards.html',
    tableTitle: '課金パック別 Playポイント還元早見表',
    tableThPack: '課金パック名',
    tableThPrice: '価格 (税込)',
    tableThNormal: '通常時還元 (1%)',
    tableThCp: '5倍CP時還元 (5%)',
    faqHeading: 'よくある質問（FAQ）',
    otherGamesHeading: '他の人気ゲームの課金シミュレーター',
    ctaTitle: '目標ポイントからの逆算シミュレーター',
    ctaDesc: '「ゴールドランクまであと◯◯pt必要」など、不足ポイントから必要課金額を逆算したい場合は総合計算機をご利用ください。',
    ctaBtn: 'Playポイント総合計算機へ ➔',
    sidebarCalcTitle: '🧮 総合計算機',
    sidebarCalcHeading: 'あと何ポイント必要？',
    sidebarCalcDesc: '目標ランクまでの必要金額を即時シミュレーション！',
    sidebarCalcBtn: '計算機を使う ➔',
    sidebarArticlesTitle: '📚 おすすめ攻略記事',
    sidebarArticles: [
      { title: 'Google Playギフトコードをお得に買う方法', href: 'articles/2026-06-20-discount-gift-cards.html' },
      { title: '100ポイントはいくら相当？', href: 'articles/2026-07-24-play-points-100-value.html' },
      { title: 'スーパーウィークリーリワード完全ガイド', href: 'articles/2026-07-31-super-weekly-reward.html' }
    ]
  },
  en: {
    lang: 'en',
    langCode: 'en',
    dir: 'en',
    siteName: 'Google Play Points Calculator',
    authorName: 'Katakata',
    homeTitle: 'Calculator',
    portalTitle: 'Game Calculators',
    blogTitle: 'Guides',
    authorTitle: 'About',
    breadcrumbsHome: 'Home',
    breadcrumbsPortal: 'Game Points Calculators',
    currencySymbol: '$',
    currencyPrefix: '$',
    currencySuffix: '',
    pointValuePrefix: 'Approx. $',
    pointValueSuffix: ' value',
    unitSpend: 1.0,
    rateText: '$1=1pt',
    verifiedDate: 'Verified: August 2026',
    badgeText: 'Mobile Game Points Simulator',
    portalBadge: '🎮 Mobile Game Special',
    portalH1: 'Google Play Points Mobile Game Spending Calculators',
    portalMeta: 'Select your favorite mobile game to calculate Google Play Points earned on in-app purchases, monthly passes, and pity summons.',
    portalLead: 'Accurate Play Points simulation for top mobile titles including Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Blue Archive, Pokémon TCG Pocket, and FGO. Estimate points earned from monthly passes, pity summons, and level-up progress in one click.',
    openCalc: 'Open Calculator ➔',
    presetHeading: '▼ Quick Targets:',
    approxText: '~',
    customAmountLabel: 'Planned Spending ($ USD):',
    packSelectLabel: 'Select Purchase Pack:',
    packCountLabel: 'Quantity:',
    customOption: 'Custom Amount (Free input)',
    multiplierLabel: 'Promotion Multiplier:',
    multiplierOptions: [
      { val: '1', label: 'Standard Rate (1x)' },
      { val: '2', label: '2x Point Promotion' },
      { val: '3', label: '3x Point Promotion' },
      { val: '4', label: '4x Point Promotion' },
      { val: '5', label: '5x Point Promotion' },
      { val: '7', label: '7x Point Promotion' }
    ],
    statusLabel: 'Current Status Level:',
    statusOptions: [
      { val: '1.0', label: 'Bronze ($1 = 1pt)' },
      { val: '1.1', label: 'Silver ($1 = 1.1pt)' },
      { val: '1.2', label: 'Gold ($1 = 1.2pt)' },
      { val: '1.4', label: 'Platinum ($1 = 1.4pt)' },
      { val: '1.75', label: 'Diamond ($1 = 1.75pt)' }
    ],
    resTotalLabel: 'Total Spending',
    resEarnedLabel: 'Estimated Play Points',
    resValueLabel: 'Points Cash Value',
    resRankLabel: 'Reached Level',
    resProgressTitle: 'Level Progress',
    disclaimerText: '※ Calculated based on official Google Play rounding rules. Check the Google Play purchase screen for exact points before checkout.',
    giftCardCtaTitle: '💳 Maximizing Play Points with Gift Cards',
    giftCardCtaText: 'Learn how Google Play Gift Cards interact with points, promotions, and status level progress.',
    giftCardCtaBtn: 'Read Gift Card Guide ➔',
    giftCardCtaHref: 'en/articles/google-play-points-gift-cards.html',
    tableTitle: 'In-App Purchase Packs & Points Reward Table',
    tableThPack: 'Pack / Item Name',
    tableThPrice: 'Price (USD)',
    tableThNormal: 'Standard (1x)',
    tableThCp: '5x Promo (5x)',
    faqHeading: 'Frequently Asked Questions (FAQ)',
    otherGamesHeading: 'Other Popular Game Points Calculators',
    ctaTitle: 'Reverse Mode & Target Status Calculator',
    ctaDesc: 'Need to find out how much spending is required for Silver, Gold, or Platinum? Use our main Google Play Points calculator.',
    ctaBtn: 'Open Main Calculator ➔',
    sidebarCalcTitle: '🧮 Main Calculator',
    sidebarCalcHeading: 'How many points needed?',
    sidebarCalcDesc: 'Estimate spending required for your target status level instantly!',
    sidebarCalcBtn: 'Go to Calculator ➔',
    sidebarArticlesTitle: '📚 Recommended Guides',
    sidebarArticles: [
      { title: 'Google Play Points Levels Explained', href: 'en/articles/google-play-points-levels.html' },
      { title: 'Points Not Showing Up Troubleshooting', href: 'en/articles/google-play-points-not-showing.html' },
      { title: 'Google Play Gift Cards & Points Guide', href: 'en/articles/google-play-points-gift-cards.html' }
    ]
  },
  ko: {
    lang: 'ko',
    langCode: 'ko',
    dir: 'ko',
    siteName: 'Google Play Points 계산기',
    authorName: '카타카타',
    homeTitle: '계산기',
    portalTitle: '게임별 계산',
    blogTitle: '가이드',
    authorTitle: '운영자',
    breadcrumbsHome: '홈',
    breadcrumbsPortal: '게임별 포인트 계산기 목록',
    currencySymbol: '원',
    currencyPrefix: '₩',
    currencySuffix: '원',
    pointValuePrefix: '약 ₩',
    pointValueSuffix: ' 상당',
    unitSpend: 1000,
    rateText: '1,000원=1pt',
    verifiedDate: '최종 확인: 2026년 8월',
    badgeText: '인기 게임별 포인트 시뮬레이터',
    portalBadge: '🎮 모바일 게임 특화',
    portalH1: '인기 모바일 게임 Google Play Points 과금·천장 계산기',
    portalMeta: '원신, 붕괴: 스타레일, 젠레스 존 제로, 블루 아카이브, 포켓몬 카드 등 인기 게임의 패키지 과금 시 적립되는 Play Points를 계산하세요.',
    portalLead: 'Google Play 스토어에서 서비스 중인 주요 모바일 게임의 인앱 결제 패키지(창세의 결정, 오래된 꿈, 모노크롬, 청휘석, 포케골드 등) 가격에 대응! 천장 가챠 결제 시 적립 포인트 및 등급 달성을 즉시 시뮬레이션할 수 있습니다.',
    openCalc: '계산기 열기 ➔',
    presetHeading: '▼ 목표 프리셋:',
    approxText: '약 ',
    customAmountLabel: '과금 예정 금액 (원):',
    packSelectLabel: '과금 패키지 선택:',
    packCountLabel: '구매 수량:',
    customOption: '직접 입력 (자유 금액)',
    multiplierLabel: '포인트 배율:',
    multiplierOptions: [
      { val: '1', label: '일반 적립 (1배 / 1%)' },
      { val: '2', label: '2배 이벤트' },
      { val: '3', label: '3배 이벤트' },
      { val: '4', label: '4배 이벤트' },
      { val: '5', label: '5배 이벤트' },
      { val: '7', label: '7배 이벤트' }
    ],
    statusLabel: '현재 회원 등급:',
    statusOptions: [
      { val: '1.0', label: '브론즈 (1,000원=1pt)' },
      { val: '1.1', label: '실버 (1,000원=1.1pt)' },
      { val: '1.2', label: '골드 (1,000원=1.2pt)' },
      { val: '1.4', label: '플래티넘 (1,000원=1.4pt)' },
      { val: '1.75', label: '다이아몬드 (1,000원=1.75pt)' }
    ],
    resTotalLabel: '과금 합계 금액',
    resEarnedLabel: '적립 예정 Play Points',
    resValueLabel: '포인트 환산 가치',
    resRankLabel: '도달 등급',
    resProgressTitle: '등급 진행 상황',
    disclaimerText: '※ Google Play 공식 사사오입(반올림) 기준에 따라 계산됩니다. 실제 적립 포인트는 결제 전 Google Play 화면에서 확인하세요.',
    giftCardCtaTitle: '💳 기프트카드 결제 시 포인트 적립 팁',
    giftCardCtaText: 'Google Play 기프트카드로 잔액을 충전한 후 결제해도 동일하게 등급별 Play Points가 정상 적립됩니다.',
    giftCardCtaBtn: '기프트카드 가이드 확인 ➔',
    giftCardCtaHref: 'ko/articles/google-play-points-gift-cards.html',
    tableTitle: '패키지별 Play Points 적립 비교표',
    tableThPack: '패키지 / 아이템명',
    tableThPrice: '가격 (KRW)',
    tableThNormal: '일반 적립 (1배)',
    tableThCp: '5배 이벤트 (5배)',
    faqHeading: '자주 묻는 질문 (FAQ)',
    otherGamesHeading: '다른 인기 게임 계산기',
    ctaTitle: '목표 포인트 역산 시뮬레이터',
    ctaDesc: '골드나 플래티넘 등급까지 남은 포인트로 필요한 과금액을 계산하려면 종합 계산기를 이용하세요.',
    ctaBtn: '종합 계산기로 이동 ➔',
    sidebarCalcTitle: '🧮 종합 계산기',
    sidebarCalcHeading: '몇 포인트가 더 필요한가요?',
    sidebarCalcDesc: '목표 등급까지 필요한 결제 금액을 즉시 시뮬레이션하세요!',
    sidebarCalcBtn: '계산기 사용하기 ➔',
    sidebarArticlesTitle: '📚 추천 가이드',
    sidebarArticles: [
      { title: 'Play Points 등급 구조 및 혜택', href: 'ko/articles/google-play-points-levels.html' },
      { title: 'Play Points가 표시되지 않을 때 해결법', href: 'ko/articles/google-play-points-not-showing.html' },
      { title: '기프트카드와 포인트 적립 조건', href: 'ko/articles/google-play-points-gift-cards.html' }
    ]
  },
  tw: {
    lang: 'zh-TW',
    langCode: 'zh-TW',
    dir: 'tw',
    siteName: 'Google Play Points 計算器',
    authorName: 'Katakata',
    homeTitle: '計算機',
    portalTitle: '遊戲專屬計算',
    blogTitle: '攻略指南',
    authorTitle: '營運團隊',
    breadcrumbsHome: '首頁',
    breadcrumbsPortal: '熱門遊戲點數計算器',
    currencySymbol: 'NT$',
    currencyPrefix: 'NT$',
    currencySuffix: ' 元',
    pointValuePrefix: '約 NT$',
    pointValueSuffix: ' 等值',
    unitSpend: 30,
    rateText: 'NT$30=1pt',
    verifiedDate: '最後確認：2026年8月',
    badgeText: '熱門手遊點數試算工具',
    portalBadge: '🎮 手遊課金專區',
    portalH1: '熱門手遊 Google Play Points 課金與保底點數計算器',
    portalMeta: '針對原神、崩壞：星穹鐵道、絕區零、蔚藍檔案、寶可夢卡牌等熱門遊戲，快速計算課金禮包與保底可獲得的 Play Points。',
    portalLead: '支援 Google Play 商店熱門手機遊戲（創世結晶、古老夢華、底片、青輝石、寶可金幣等）價格匯率！一鍵計算大保底能拿多少點數回饋、距離白金與鑽石等級還差多少。',
    openCalc: '開啟計算器 ➔',
    presetHeading: '▼ 快速試算目標：',
    approxText: '約 ',
    customAmountLabel: '預計課金總額（新台幣）：',
    packSelectLabel: '選擇課金禮包：',
    packCountLabel: '購買次數：',
    customOption: '自由輸入（自訂金額）',
    multiplierLabel: '點數加碼倍率：',
    multiplierOptions: [
      { val: '1', label: '一般回饋（1倍 / 3.3%）' },
      { val: '2', label: '2倍活動加碼' },
      { val: '3', label: '3倍活動加碼' },
      { val: '4', label: '4倍活動加碼' },
      { val: '5', label: '5倍活動加碼' },
      { val: '7', label: '7倍活動加碼' }
    ],
    statusLabel: '目前會員等級：',
    statusOptions: [
      { val: '1.0', label: '銅級（NT$30 = 1點）' },
      { val: '1.1', label: '銀級（NT$30 = 1.1點）' },
      { val: '1.2', label: '金級（NT$30 = 1.2點）' },
      { val: '1.4', label: '白金級（NT$30 = 1.4點）' },
      { val: '1.75', label: '鑽石級（NT$30 = 1.75點）' }
    ],
    resTotalLabel: '課金總金額',
    resEarnedLabel: '預計獲得 Play Points',
    resValueLabel: '點數換算價值',
    resRankLabel: '達成等級',
    resProgressTitle: '等級進度',
    disclaimerText: '※ 依據 Google Play 官方四捨五入計算規則試算。實際獲得點數請以購買結帳畫面顯示為準。',
    giftCardCtaTitle: '💳 禮物卡儲值與點數累積重點',
    giftCardCtaText: '使用 Google Play 禮物卡儲值餘額後購買遊戲道具，同樣享有會員等級之點數回饋！',
    giftCardCtaBtn: '查看禮物卡攻略 ➔',
    giftCardCtaHref: 'tw/articles/google-play-points-gift-cards.html',
    tableTitle: '課金禮包 Play Points 回饋速查表',
    tableThPack: '禮包 / 道具名稱',
    tableThPrice: '售價 (TWD)',
    tableThNormal: '一般回饋 (1倍)',
    tableThCp: '5倍加碼 (5倍)',
    faqHeading: '常見問題（FAQ）',
    otherGamesHeading: '其他熱門遊戲計算器',
    ctaTitle: '目標點數逆算計算器',
    ctaDesc: '想知道還需要多少課金金額才能升級至金級或白金級？請使用綜合計算器。',
    ctaBtn: '前往 Play Points 綜合計算器 ➔',
    sidebarCalcTitle: '🧮 綜合計算器',
    sidebarCalcHeading: '還差多少點數升級？',
    sidebarCalcDesc: '即時試算達成目標等級所需的課金金額！',
    sidebarCalcBtn: '使用計算器 ➔',
    sidebarArticlesTitle: '📚 推薦攻略',
    sidebarArticles: [
      { title: 'Play Points 等級結構與升級攻略', href: 'tw/articles/google-play-points-levels.html' },
      { title: '點數未正常顯示的排查步驟', href: 'tw/articles/google-play-points-not-showing.html' },
      { title: '禮物卡與點數回饋條件整理', href: 'tw/articles/google-play-points-gift-cards.html' }
    ]
  }
};

// 全10大ゲームデータ（多言語対応）
const GAMES_DATA = [
  {
    id: 'genshin',
    icon: '✨',
    names: { ja: '原神（Genshin Impact）', en: 'Genshin Impact', ko: '원신 (Genshin Impact)', tw: '原神 (Genshin Impact)' },
    shortNames: { ja: '原神', en: 'Genshin', ko: '원신', tw: '原神' },
    descs: {
      ja: '創世結晶パック・空月の祝福・天空紀行・天井（180連）・完凸課金で貯まるPlayポイントと到達ランクをシミュレーション！',
      en: 'Calculate Google Play Points earned on Genesis Crystals, Blessing of the Welkin Moon, Gnostic Hymn, 180-pull hard pity, and C6 character summons!',
      ko: '창세의 결정 패키지, 공월 축복, 진주 기행, 180회 확정 천장, 풀돌 과금 시 적립되는 Play Points와 달성 등급을 시뮬레이션하세요!',
      tw: '試算創世結晶、空月祝福、珍珠紀行、180抽大保底、滿命課金可獲得的 Play Points 與等級進度！'
    },
    packs: {
      ja: [
        { name: '空月の祝福 (610円)', price: 610 },
        { name: '天空紀行 (1,220円)', price: 1220 },
        { name: '創世結晶 60個 (120円)', price: 120 },
        { name: '創世結晶 300+30個 (610円)', price: 610 },
        { name: '創世結晶 980+110個 (1,220円)', price: 1220 },
        { name: '創世結晶 1980+260個 (3,680円)', price: 3680 },
        { name: '創世結晶 3280+600個 (6,100円)', price: 6100 },
        { name: '創世結晶 6480+1600個 (12,000円)', price: 12000 }
      ],
      en: [
        { name: 'Blessing of the Welkin Moon ($4.99)', price: 4.99 },
        { name: 'Gnostic Hymn ($9.99)', price: 9.99 },
        { name: '60 Genesis Crystals ($0.99)', price: 0.99 },
        { name: '300+30 Genesis Crystals ($4.99)', price: 4.99 },
        { name: '980+110 Genesis Crystals ($14.99)', price: 14.99 },
        { name: '1980+260 Genesis Crystals ($29.99)', price: 29.99 },
        { name: '3280+600 Genesis Crystals ($49.99)', price: 49.99 },
        { name: '6480+1600 Genesis Crystals ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '공월 축복 (₩5,900)', price: 5900 },
        { name: '진주 기행 (₩12,000)', price: 12000 },
        { name: '창세의 결정 60개 (₩1,200)', price: 1200 },
        { name: '창세의 결정 300+30개 (₩5,900)', price: 5900 },
        { name: '창세의 결정 980+110개 (₩19,000)', price: 19000 },
        { name: '창세의 결정 1980+260개 (₩37,000)', price: 37000 },
        { name: '창세의 결정 3280+600개 (₩65,000)', price: 65000 },
        { name: '창세의 결정 6480+1600개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '空月祝福 (NT$170)', price: 170 },
        { name: '珍珠紀行 (NT$330)', price: 330 },
        { name: '創世結晶 60個 (NT$33)', price: 33 },
        { name: '創世結晶 300+30個 (NT$170)', price: 170 },
        { name: '創世結晶 980+110個 (NT$490)', price: 490 },
        { name: '創世結晶 1980+260個 (NT$990)', price: 990 },
        { name: '創世結晶 3280+600個 (NT$1,690)', price: 1690 },
        { name: '創世結晶 6480+1600個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '空月の祝福 (610円)', amount: 610, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '仮天井 90連 (約27,000円)', amount: 27000, mult: 1 },
        { label: '確定天井 180連 (約54,000円)', amount: 54000, mult: 1 },
        { label: '完凸目安 (約250,000円)', amount: 250000, mult: 1 }
      ],
      en: [
        { label: 'Welkin Moon ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '90-pull Pity ($200.00)', amount: 200.0, mult: 1 },
        { label: '180-pull Hard Pity ($400.00)', amount: 400.0, mult: 1 },
        { label: 'C6 Character (~$1,800.00)', amount: 1800.0, mult: 1 }
      ],
      ko: [
        { label: '공월 축복 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확정천장 (약 ₩540,000)', amount: 540000, mult: 1 },
        { label: '풀돌 기준 (약 ₩2,500,000)', amount: 2500000, mult: 1 }
      ],
      tw: [
        { label: '空月祝福 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$750)', amount: 750, mult: 1 },
        { label: '90抽小保底 (約 NT$6,500)', amount: 6500, mult: 1 },
        { label: '180抽大保底 (約 NT$13,000)', amount: 13000, mult: 1 },
        { label: '滿命預估 (約 NT$60,000)', amount: 60000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: '原神の課金でGoogle Play Pointsは貯まりますか？', a: 'はい。Android端末またはGoogle Play Games（PC版）経由で課金した場合、通常100円につき1ポイント以上のPlay Pointsが貯まります。' },
        { q: '原神で確定天井（180連）まで課金すると何ポイント貯まりますか？', a: '180連（約54,000円）課金した場合、通常時（1%）で約540pt、Google Playのポイント増量キャンペーン（4倍〜7倍時）なら約2,160pt〜3,780pt貯まります。' },
        { q: '空月の祝福や天空紀行の課金でもポイントは付きますか？', a: 'はい。定期課金やシーズンパスもすべて通常のGoogle Play課金と同じ扱いとなり、購入金額に応じたPlay Pointsが付与されます。' }
      ],
      en: [
        { q: 'Do I earn Google Play Points on Genshin Impact purchases?', a: 'Yes! When purchasing Genesis Crystals or passes on Android or Google Play Games PC, you earn at least 1 Play Point per $1 spent.' },
        { q: 'How many points for 180-pull hard pity in Genshin?', a: 'Spending around $400 for 180 pulls yields ~400 points at base rate, or 1,600 to 2,800 points during 4x-7x special point promotions.' },
        { q: 'Do Welkin Moon and Battle Pass purchases count?', a: 'Yes, both Blessing of the Welkin Moon and Gnostic Hymn earn full Play Points based on your current membership tier.' }
      ],
      ko: [
        { q: '원신 결제 시 Google Play Points가 적립되나요?', a: '네! 안드로이드 기기 또는 Google Play Games PC 버전을 통해 결제하면 1,000원당 1포인트 이상의 Play Points가 적립됩니다.' },
        { q: '공월 축복이나 진주 기행 결제도 포인트 적립 대상인가요?', a: '네, 정기 패스 및 기행 결제 금액도 전액 정상적으로 Play Points 적립 대상에 포함됩니다.' }
      ],
      tw: [
        { q: '在原神課金可以獲得 Google Play Points 嗎？', a: '可以！透過 Android 手機或 Google Play Games 電腦版進行遊戲內購買，每 NT$30 即可累積 1 點以上的 Play Points。' },
        { q: '購買空月祝福或珍珠紀行也有點數回饋嗎？', a: '有的，所有月卡與通行證皆享有點數回饋，並計入年度會員等級晉升進度。' }
      ]
    }
  },
  {
    id: 'starrail',
    icon: '🚂',
    names: { ja: '崩壊：スターレイル（Honkai: Star Rail）', en: 'Honkai: Star Rail', ko: '붕괴: 스타레일', tw: '崩壞：星穹鐵道' },
    shortNames: { ja: 'スターレイル', en: 'Star Rail', ko: '스타레일', tw: '星穹鐵道' },
    descs: {
      ja: '往日の夢華・列車補給標章・ナナシビトの褒章・仮天井（90連）・確定天井（180連）課金で貯まるPlayポイントを計算！',
      en: 'Calculate Play Points earned on Oneiric Shards, Express Supply Pass, Nameless Glory, and 90/180-pull pity summons in Honkai: Star Rail!',
      ko: '오래된 꿈, 열차 보급 허가증, 무명의 공훈, 90/180연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算古老夢華、列車補給憑證、無名客的榮勳、90抽/180抽保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: '列車補給標章 (610円)', price: 610 },
        { name: 'ナナシビトの褒章 (1,220円)', price: 1220 },
        { name: '往日の夢華 60個 (120円)', price: 120 },
        { name: '往日の夢華 300+30個 (610円)', price: 610 },
        { name: '往日の夢華 980+110個 (1,220円)', price: 1220 },
        { name: '往日の夢華 1980+260個 (3,680円)', price: 3680 },
        { name: '往日の夢華 3280+600個 (6,100円)', price: 6100 },
        { name: '往日の夢華 6480+1600個 (12,000円)', price: 12000 }
      ],
      en: [
        { name: 'Express Supply Pass ($4.99)', price: 4.99 },
        { name: 'Nameless Glory ($9.99)', price: 9.99 },
        { name: '60 Oneiric Shards ($0.99)', price: 0.99 },
        { name: '300+30 Oneiric Shards ($4.99)', price: 4.99 },
        { name: '980+110 Oneiric Shards ($14.99)', price: 14.99 },
        { name: '1980+260 Oneiric Shards ($29.99)', price: 29.99 },
        { name: '3280+600 Oneiric Shards ($49.99)', price: 49.99 },
        { name: '6480+1600 Oneiric Shards ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '열차 보급 허가증 (₩5,900)', price: 5900 },
        { name: '무명의 공훈 (₩12,000)', price: 12000 },
        { name: '오래된 꿈 60개 (₩1,200)', price: 1200 },
        { name: '오래된 꿈 300+30개 (₩5,900)', price: 5900 },
        { name: '오래된 꿈 980+110개 (₩19,000)', price: 19000 },
        { name: '오래된 꿈 1980+260개 (₩37,000)', price: 37000 },
        { name: '오래된 꿈 3280+600개 (₩65,000)', price: 65000 },
        { name: '오래된 꿈 6480+1600개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '列車補給憑證 (NT$170)', price: 170 },
        { name: '無名客的榮勳 (NT$330)', price: 330 },
        { name: '古老夢華 60個 (NT$33)', price: 33 },
        { name: '古老夢華 300+30個 (NT$170)', price: 170 },
        { name: '古老夢華 980+110個 (NT$490)', price: 490 },
        { name: '古老夢華 1980+260個 (NT$990)', price: 990 },
        { name: '古老夢華 3280+600個 (NT$1,690)', price: 1690 },
        { name: '古老夢華 6480+1600個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '列車補給標章 (610円)', amount: 610, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '仮天井 90連 (約27,000円)', amount: 27000, mult: 1 },
        { label: '確定天井 180連 (約54,000円)', amount: 54000, mult: 1 }
      ],
      en: [
        { label: 'Express Supply Pass ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '90-pull Pity ($200.00)', amount: 200.0, mult: 1 },
        { label: '180-pull Pity ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '열차 보급 허가증 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확정천장 (약 ₩540,000)', amount: 540000, mult: 1 }
      ],
      tw: [
        { label: '列車補給憑證 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$750)', amount: 750, mult: 1 },
        { label: '90抽小保底 (約 NT$6,500)', amount: 6500, mult: 1 },
        { label: '180抽大保底 (約 NT$13,000)', amount: 13000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'スターレイルの課金でGoogle Playポイントは貯まりますか？', a: 'はい。Android端末またはPC版Google Play Games経由で決済すると、100円あたり1pt以上のPlay Pointsが付与されます。' },
        { q: 'スターレイルで天井まで課金すると何ポイント貯まりますか？', a: '180連（約54,000円）課金した場合、通常時（1%）で約540pt、5倍CP時なら約2,700pt貯まり、一気にゴールドランクに到達できます。' }
      ],
      en: [
        { q: 'Can I earn Play Points on Honkai: Star Rail?', a: 'Yes! In-app purchases made via Google Play on Android or PC earn Play Points according to your status tier.' },
        { q: 'How many points for 180-pull hard pity in Star Rail?', a: 'Spending ~$400 earns ~400 points at base rate, or ~2,000 points during a 5x points event.' }
      ],
      ko: [
        { q: '스타레일 과금 시 Play Points가 적립되나요?', a: '네, Google Play 스토어 인앱 결제 시 결제액 1,000원당 1pt 이상이 적립됩니다.' }
      ],
      tw: [
        { q: '星穹鐵道課金可以累積 Play Points 嗎？', a: '可以，透過 Google Play 商店結帳每滿 NT$30 即可累積點數。' }
      ]
    }
  },
  {
    id: 'zzz',
    icon: '⚡',
    names: { ja: 'ゼンレスゾーンゼロ（Zenless Zone Zero）', en: 'Zenless Zone Zero', ko: '젠레스 존 제로', tw: '絕區零 (Zenless Zone Zero)' },
    shortNames: { ja: 'ゼンゼロ', en: 'ZZZ', ko: '젠존제', tw: '絕區零' },
    descs: {
      ja: 'モノクロームパック・インターノット会員・エリーファンド・90/180連天井ガチャで貯まるPlayポイントを即時試算！',
      en: 'Calculate Play Points earned on Monochrome bundles, Inter-Knot Membership, New Eridu City Fund, and S-Rank Agent pity pulls in ZZZ!',
      ko: '모노크롬, 로프꾼 회원, 뉴에리두 도시 펀드, 90/180연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算絕區零底片、繩網會員、新艾利都城募基金、S級代理人保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'インターノット会員 (610円)', price: 610 },
        { name: 'エリーファンド 成長プラン (1,220円)', price: 1220 },
        { name: 'モノクローム 60個 (120円)', price: 120 },
        { name: 'モノクローム 300+30個 (610円)', price: 610 },
        { name: 'モノクローム 980+110個 (1,220円)', price: 1220 },
        { name: 'モノクローム 1980+260個 (3,680円)', price: 3680 },
        { name: 'モノクローム 3280+600個 (6,100円)', price: 6100 },
        { name: 'モノクローム 6480+1600個 (12,000円)', price: 12000 }
      ],
      en: [
        { name: 'Inter-Knot Membership ($4.99)', price: 4.99 },
        { name: 'New Eridu City Fund ($9.99)', price: 9.99 },
        { name: '60 Monochrome ($0.99)', price: 0.99 },
        { name: '300+30 Monochrome ($4.99)', price: 4.99 },
        { name: '980+110 Monochrome ($14.99)', price: 14.99 },
        { name: '1980+260 Monochrome ($29.99)', price: 29.99 },
        { name: '3280+600 Monochrome ($49.99)', price: 49.99 },
        { name: '6480+1600 Monochrome ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '로프꾼 회원 (₩5,900)', price: 5900 },
        { name: '뉴에리두 도시 펀드 (₩12,000)', price: 12000 },
        { name: '모노크롬 60개 (₩1,200)', price: 1200 },
        { name: '모노크롬 300+30개 (₩5,900)', price: 5900 },
        { name: '모노크롬 980+110개 (₩19,000)', price: 19000 },
        { name: '모노크롬 1980+260개 (₩37,000)', price: 37000 },
        { name: '모노크롬 3280+600개 (₩65,000)', price: 65000 },
        { name: '모노크롬 6480+1600개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '繩網會員 (NT$170)', price: 170 },
        { name: '新艾利都城募基金 (NT$330)', price: 330 },
        { name: '底片 60個 (NT$33)', price: 33 },
        { name: '底片 300+30個 (NT$170)', price: 170 },
        { name: '底片 980+110個 (NT$490)', price: 490 },
        { name: '底片 1980+260個 (NT$990)', price: 990 },
        { name: '底片 3280+600個 (NT$1,690)', price: 1690 },
        { name: '底片 6480+1600個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: 'インターノット会員 (610円)', amount: 610, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '仮天井 90連 (約27,000円)', amount: 27000, mult: 1 },
        { label: '確定天井 180連 (約54,000円)', amount: 54000, mult: 1 }
      ],
      en: [
        { label: 'Inter-Knot Membership ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '90-pull S-Rank ($200.00)', amount: 200.0, mult: 1 },
        { label: '180-pull Guarantee ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '로프꾼 회원 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확정천장 (약 ₩540,000)', amount: 540000, mult: 1 }
      ],
      tw: [
        { label: '繩網會員 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$750)', amount: 750, mult: 1 },
        { label: '90抽小保底 (約 NT$6,500)', amount: 6500, mult: 1 },
        { label: '180抽大保底 (約 NT$13,000)', amount: 13000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ゼンゼロの課金でPlayポイントは貯まりますか？', a: 'はい。Android端末またはPC版Google Play Gamesで決済するとPlay Pointsが貯まります。' },
        { q: 'S級確定天井（90連/180連）で何ポイント貯まりますか？', a: '90連で約270pt（5倍CP時約1,350pt）、180連で約540pt（5倍CP時約2,700pt）還元されます。' }
      ],
      en: [
        { q: 'Do ZZZ purchases earn Google Play Points?', a: 'Yes, purchases made through Google Play Store earn Play Points based on your current tier.' }
      ],
      ko: [
        { q: '젠레스 존 제로 결제 시 포인트가 적립되나요?', a: '네, 구글 플레이를 통해 결제 시 포인트가 정상 적립됩니다.' }
      ],
      tw: [
        { q: '絕區零課金能拿 Play Points 嗎？', a: '可以，透過 Google Play 商店結帳均可獲得點數回饋。' }
      ]
    }
  },
  {
    id: 'bluearchive',
    icon: '🎯',
    names: { ja: 'ブルーアーカイブ（Blue Archive）', en: 'Blue Archive', ko: '블루 아카이브', tw: '蔚藍檔案 (Blue Archive)' },
    shortNames: { ja: 'ブルアカ', en: 'Blue Archive', ko: '블루아카', tw: '蔚藍檔案' },
    descs: {
      ja: '青輝石パック・マンスリーパッケージ・200連天井（24,000石=約4.8万円）で貯まるPlayポイントを計算！',
      en: 'Calculate Play Points earned on Pyroxenes, Monthly Packages, and 200-pull spark pity (24,000 Pyroxenes) in Blue Archive!',
      ko: '청휘석 패키지, 월간 청휘석 패키지, 200연차 천장(24,000 청휘석) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算蔚藍檔案青輝石禮包、月卡、200抽保底（24,000青輝石）課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'マンスリーパッケージ (480円)', price: 480 },
        { name: '青輝石 76個 (160円)', price: 160 },
        { name: '青輝石 240個 (480円)', price: 480 },
        { name: '青輝石 530個 (1,000円)', price: 1000 },
        { name: '青輝石 1700個 (3,000円)', price: 3000 },
        { name: '青輝石 2900個 (5,000円)', price: 5000 },
        { name: '青輝石 6600個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: 'Monthly Pyroxene Pack ($3.99)', price: 3.99 },
        { name: '76 Pyroxenes ($0.99)', price: 0.99 },
        { name: '240 Pyroxenes ($3.99)', price: 3.99 },
        { name: '530 Pyroxenes ($7.99)', price: 7.99 },
        { name: '1,700 Pyroxenes ($23.99)', price: 23.99 },
        { name: '2,900 Pyroxenes ($39.99)', price: 39.99 },
        { name: '6,600 Pyroxenes ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '월간 청휘석 패키지 (₩4,900)', price: 4900 },
        { name: '청휘석 76개 (₩1,500)', price: 1500 },
        { name: '청휘석 240개 (₩4,900)', price: 4900 },
        { name: '청휘석 530개 (₩9,900)', price: 9900 },
        { name: '청휘석 1,700개 (₩29,000)', price: 29000 },
        { name: '청휘석 2,900개 (₩49,000)', price: 49000 },
        { name: '청휘석 6,600개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '月度青輝石禮包 (NT$130)', price: 130 },
        { name: '青輝石 76個 (NT$33)', price: 33 },
        { name: '青輝石 240個 (NT$130)', price: 130 },
        { name: '青輝石 530個 (NT$270)', price: 270 },
        { name: '青輝石 1700個 (NT$790)', price: 790 },
        { name: '青輝石 2900個 (NT$1,320)', price: 1320 },
        { name: '青輝石 6600個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'マンスリーパック (480円)', amount: 480, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '天井 200連 (約48,000円)', amount: 48000, mult: 1 }
      ],
      en: [
        { label: 'Monthly Pack ($3.99)', amount: 3.99, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '200-pull Spark ($380.00)', amount: 380.0, mult: 1 }
      ],
      ko: [
        { label: '월간 패키지 (₩4,900)', amount: 4900, mult: 1 },
        { label: '10연차 (약 ₩29,000)', amount: 29000, mult: 1 },
        { label: '천장 200연차 (약 ₩480,000)', amount: 480000, mult: 1 }
      ],
      tw: [
        { label: '月卡禮包 (NT$130)', amount: 130, mult: 1 },
        { label: '10連抽 (約 NT$790)', amount: 790, mult: 1 },
        { label: '200抽保底 (約 NT$12,000)', amount: 12000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ブルアカの天井（200連=約4.8万円）で何ポイント貯まりますか？', a: '通常時で約480pt、Google Playの5倍キャンペーン時なら約2,400pt（ゴールドランク即時達成）貯まります。' },
        { q: 'マンスリーパッケージはPlayポイント対象ですか？', a: 'はい。マンスリーパッケージおよびハーフマンスリーパッケージも通常の課金と同様にポイントが付与されます。' }
      ],
      en: [
        { q: 'How many points for 200-pull spark in Blue Archive?', a: 'Spending ~$380 for 200 pulls earns ~380 pts at base rate, or ~1,900 pts during a 5x promotion.' }
      ],
      ko: [
        { q: '블루아카 200연차 천장 결제 시 포인트는?', a: '기본 적립 시 약 480pt, 5배 이벤트 시 약 2,400pt가 적립됩니다.' }
      ],
      tw: [
        { q: '蔚藍檔案200抽保底能累積多少點數？', a: '一般回饋約 400 點，若遇 5 倍加碼活動則可獲得約 2,000 點。' }
      ]
    }
  },
  {
    id: 'pokepoke',
    icon: '🎴',
    names: { ja: 'Pokémon TCG Pocket (ポケポケ)', en: 'Pokémon TCG Pocket', ko: '포켓몬 TCG 포켓', tw: '寶可夢 TCG Pocket' },
    shortNames: { ja: 'ポケポケ', en: 'PokéPoké', ko: '포켓몬카드', tw: '寶可夢卡牌' },
    descs: {
      ja: 'ポケゴールド・プレミアムパス・パック開封で貯まるGoogle Playポイントを計算！',
      en: 'Calculate Google Play Points earned on Poké Gold and Premium Pass in Pokémon TCG Pocket!',
      ko: '포케골드 및 프리미엄 패스 결제 시 적립되는 Google Play Points를 계산하세요!',
      tw: '計算寶可金幣與高級通行證課金可獲得的 Google Play Points！'
    },
    packs: {
      ja: [
        { name: 'プレミアムパス (980円)', price: 980 },
        { name: 'ポケゴールド 5個 (140円)', price: 140 },
        { name: 'ポケゴールド 15個 (420円)', price: 420 },
        { name: 'ポケゴールド 31個 (840円)', price: 840 },
        { name: 'ポケゴールド 105個 (2,800円)', price: 2800 },
        { name: 'ポケゴールド 215個 (5,600円)', price: 5600 },
        { name: 'ポケゴールド 550個 (13,800円)', price: 13800 }
      ],
      en: [
        { name: 'Premium Pass ($9.99)', price: 9.99 },
        { name: '5 Poké Gold ($0.99)', price: 0.99 },
        { name: '15 Poké Gold ($2.99)', price: 2.99 },
        { name: '31 Poké Gold ($5.99)', price: 5.99 },
        { name: '105 Poké Gold ($19.99)', price: 19.99 },
        { name: '215 Poké Gold ($39.99)', price: 39.99 },
        { name: '550 Poké Gold ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '프리미엄 패스 (₩12,000)', price: 12000 },
        { name: '포케골드 5개 (₩1,400)', price: 1400 },
        { name: '포케골드 15개 (₩4,200)', price: 4200 },
        { name: '포케골드 31개 (₩8,400)', price: 8400 },
        { name: '포케골드 105개 (₩28,000)', price: 28000 },
        { name: '포케골드 215개 (₩56,000)', price: 56000 },
        { name: '포케골드 550개 (₩139,000)', price: 139000 }
      ],
      tw: [
        { name: '高級通行證 (NT$310)', price: 310 },
        { name: '寶可金幣 5個 (NT$33)', price: 33 },
        { name: '寶可金幣 15個 (NT$99)', price: 99 },
        { name: '寶可金幣 31個 (NT$190)', price: 190 },
        { name: '寶可金幣 105個 (NT$630)', price: 630 },
        { name: '寶可金幣 215個 (NT$1,260)', price: 1260 },
        { name: '寶可金幣 550個 (NT$3,190)', price: 3190 }
      ]
    },
    presets: {
      ja: [
        { label: 'プレミアムパス (980円)', amount: 980, mult: 1 },
        { label: 'ポケゴールド 550個 (13,800円)', amount: 13800, mult: 1 }
      ],
      en: [
        { label: 'Premium Pass ($9.99)', amount: 9.99, mult: 1 },
        { label: '550 Poké Gold ($99.99)', amount: 99.99, mult: 1 }
      ],
      ko: [
        { label: '프리미엄 패스 (₩12,000)', amount: 12000, mult: 1 },
        { label: '포케골드 550개 (₩139,000)', amount: 139000, mult: 1 }
      ],
      tw: [
        { label: '高級通行證 (NT$310)', amount: 310, mult: 1 },
        { label: '寶可金幣 550個 (NT$3,190)', amount: 3190, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ポケポケの課金でGoogle Playポイントは貯まりますか？', a: 'はい。Android端末から購入するとPlay Pointsが貯まります。' },
        { q: 'プレミアムパスはPlayポイントの対象になりますか？', a: 'はい。毎月の更新時にも自動でPlay Pointsが付与されます。' }
      ],
      en: [
        { q: 'Do Pokémon TCG Pocket purchases earn Play Points?', a: 'Yes, purchases made through Google Play Store earn Play Points.' }
      ],
      ko: [
        { q: '포켓몬 TCG 포켓 결제 시 포인트가 적립되나요?', a: '네, 구글 플레이 스토어 결제 시 정상 적립됩니다.' }
      ],
      tw: [
        { q: '寶可夢 TCG Pocket 課金能累積點數嗎？', a: '可以，透過 Google Play 商店購買均能累積點數。' }
      ]
    }
  },
  {
    id: 'fgo',
    icon: '⚔️',
    names: { ja: 'Fate/Grand Order (FGO)', en: 'Fate/Grand Order (FGO)', ko: '페이트/그랜드 오더 (FGO)', tw: 'Fate/Grand Order (FGO)' },
    shortNames: { ja: 'FGO', en: 'FGO', ko: '페그오', tw: 'FGO' },
    descs: {
      ja: '聖晶石パック・福袋（有償15個）・確定召喚（天井330連）で貯まるPlayポイントと還元額をシミュレーション！',
      en: 'Calculate Play Points earned on Saint Quartz, Lucky Bag summons, and 330-summon pity in FGO!',
      ko: '성정석, 복주머니, 330연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '試算聖晶石禮包、福袋召喚、330抽保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: '聖晶石 1個 (160円)', price: 160 },
        { name: '聖晶石 4+1個 (480円)', price: 480 },
        { name: '聖晶石 12+6個 (1,400円)', price: 1400 },
        { name: '聖晶石 25+16個 (2,900円)', price: 2900 },
        { name: '聖晶石 42+34個 (4,900円)', price: 4900 },
        { name: '聖晶石 86+82個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '1 Saint Quartz ($0.99)', price: 0.99 },
        { name: '4+1 Saint Quartz ($3.99)', price: 3.99 },
        { name: '12+6 Saint Quartz ($11.99)', price: 11.99 },
        { name: '25+16 Saint Quartz ($23.99)', price: 23.99 },
        { name: '42+34 Saint Quartz ($39.99)', price: 39.99 },
        { name: '86+82 Saint Quartz ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '성정석 1개 (₩1,200)', price: 1200 },
        { name: '성정석 4+1개 (₩4,900)', price: 4900 },
        { name: '성정석 12+6개 (₩14,000)', price: 14000 },
        { name: '성정석 25+16개 (₩29,000)', price: 29000 },
        { name: '성정석 42+34개 (₩49,000)', price: 49000 },
        { name: '성정석 86+82개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '聖晶石 1個 (NT$33)', price: 33 },
        { name: '聖晶石 4+1個 (NT$130)', price: 130 },
        { name: '聖晶石 12+6個 (NT$390)', price: 390 },
        { name: '聖晶石 25+16個 (NT$790)', price: 790 },
        { name: '聖晶石 42+34個 (NT$1,320)', price: 1320 },
        { name: '聖晶石 86+82個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: '福袋目安 (約1,900円)', amount: 1900, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '天井 330連 (約55,000円)', amount: 55000, mult: 1 }
      ],
      en: [
        { label: 'Lucky Bag (~$15.00)', amount: 15.0, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '330-pull Pity ($440.00)', amount: 440.0, mult: 1 }
      ],
      ko: [
        { label: '복주머니 (약 ₩19,000)', amount: 19000, mult: 1 },
        { label: '10연차 (약 ₩29,000)', amount: 29000, mult: 1 },
        { label: '330연차 천장 (약 ₩550,000)', amount: 550000, mult: 1 }
      ],
      tw: [
        { label: '福袋預估 (約 NT$490)', amount: 490, mult: 1 },
        { label: '10連抽 (約 NT$790)', amount: 790, mult: 1 },
        { label: '330抽保底 (約 NT$14,000)', amount: 14000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'FGOの確定召喚（天井330連=約5.5万円）で貯まるポイントは？', a: '通常レートで約550pt、5倍キャンペーン時なら約2,750pt貯まります。' },
        { q: '福袋（有償15個）の課金でもPlayポイントは付きますか？', a: 'はい。有償石の購入時に全額ポイント付与の対象となります。' }
      ],
      en: [
        { q: 'How many points for 330-pull pity in FGO?', a: 'Spending ~$440 earns ~440 pts normally, or ~2,200 pts during a 5x promotion.' }
      ],
      ko: [
        { q: 'FGO 330연차 천장 과금 시 적립되는 포인트는?', a: '기본 적립 약 550pt, 5배 이벤트 시 약 2,750pt가 적립됩니다.' }
      ],
      tw: [
        { q: 'FGO 330抽保底能累積多少點數？', a: '一般回饋約 460 點，若遇 5 倍加碼則可獲得約 2,300 點。' }
      ]
    }
  },
  {
    id: 'umamusume',
    icon: '🐴',
    names: { ja: 'ウマ娘 プリティーダービー', en: 'Umamusume: Pretty Derby', ko: '우마무스메 프리티 더비', tw: '賽馬娘 Pretty Derby' },
    shortNames: { ja: 'ウマ娘', en: 'Umamusume', ko: '우마무스메', tw: '賽馬娘' },
    descs: {
      ja: 'ジュエル購入・デイリージュエルパック・天井（200連=6万円）課金で貯まるPlayポイントを即計算！',
      en: 'Calculate Google Play Points earned on Jewels, Daily Packs, and 200-pull pity in Umamusume!',
      ko: '쥬얼, 데일리 쥬얼 팩, 200연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算寶石、每日寶石包、200抽保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'デイリージュエルパック (980円)', price: 980 },
        { name: 'ジュエル 50個 (160円)', price: 160 },
        { name: 'ジュエル 150個 (480円)', price: 480 },
        { name: 'ジュエル 320個 (1,000円)', price: 1000 },
        { name: 'ジュエル 1000個 (3,000円)', price: 3000 },
        { name: 'ジュエル 1700個 (5,000円)', price: 5000 },
        { name: 'ジュエル 5000個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: 'Daily Jewel Pack ($7.99)', price: 7.99 },
        { name: '50 Jewels ($0.99)', price: 0.99 },
        { name: '150 Jewels ($3.99)', price: 3.99 },
        { name: '320 Jewels ($7.99)', price: 7.99 },
        { name: '1000 Jewels ($23.99)', price: 23.99 },
        { name: '1700 Jewels ($39.99)', price: 39.99 },
        { name: '5000 Jewels ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '데일리 쥬얼 팩 (₩9,900)', price: 9900 },
        { name: '쥬얼 50개 (₩1,500)', price: 1500 },
        { name: '쥬얼 150개 (₩4,900)', price: 4900 },
        { name: '쥬얼 320개 (₩9,900)', price: 9900 },
        { name: '쥬얼 1000개 (₩29,000)', price: 29000 },
        { name: '쥬얼 1700개 (₩49,000)', price: 49000 },
        { name: '쥬얼 5000개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '每日寶石包 (NT$270)', price: 270 },
        { name: '寶石 50個 (NT$33)', price: 33 },
        { name: '寶石 150個 (NT$130)', price: 130 },
        { name: '寶石 320個 (NT$270)', price: 270 },
        { name: '寶石 1000個 (NT$790)', price: 790 },
        { name: '寶石 1700個 (NT$1,320)', price: 1320 },
        { name: '寶石 5000個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'デイリージュエル (980円)', amount: 980, mult: 1 },
        { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
        { label: '1天井 200連 (60,000円)', amount: 60000, mult: 1 }
      ],
      en: [
        { label: 'Daily Jewel ($7.99)', amount: 7.99, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '200-pull Pity ($480.00)', amount: 480.0, mult: 1 }
      ],
      ko: [
        { label: '데일리 쥬얼 (₩9,900)', amount: 9900, mult: 1 },
        { label: '10연차 (₩29,000)', amount: 29000, mult: 1 },
        { label: '1천장 200연차 (₩594,000)', amount: 594000, mult: 1 }
      ],
      tw: [
        { label: '每日寶石包 (NT$270)', amount: 270, mult: 1 },
        { label: '10連抽 (NT$790)', amount: 790, mult: 1 },
        { label: '200抽保底 (NT$16,000)', amount: 16000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ウマ娘の天井（200連=6万円）で何ポイント貯まりますか？', a: '通常時で約600ポイント、Google Playポイント5倍キャンペーン時なら約3,000ポイント貯まります。' },
        { q: 'DMM版（PC）の課金でもPlayポイントは付きますか？', a: 'いいえ。Google Play PointsはAndroid端末またはGoogle Play Games経由で決済した場合のみ付与されます。' }
      ],
      en: [
        { q: 'How many points for 200-pull pity in Umamusume?', a: 'Around ~480 points at base rate, or ~2,400 points during a 5x promotion.' }
      ],
      ko: [
        { q: '우마무스메 200연차 천장 과금 시 포인트는?', a: '기본 적립 시 약 594pt, 5배 이벤트 시 약 2,970pt가 적립됩니다.' }
      ],
      tw: [
        { q: '賽馬娘 200抽保底能累積多少點數？', a: '一般回饋約 530 點，5倍活動時可達約 2,650 點。' }
      ]
    }
  },
  {
    id: 'monst',
    icon: '🐉',
    names: { ja: 'モンスターストライク (モンスト)', en: 'Monster Strike', ko: '몬스터 스트라이크', tw: '怪物彈珠 (Monster Strike)' },
    shortNames: { ja: 'モンスト', en: 'Monst', ko: '몬스', tw: '怪物彈珠' },
    descs: {
      ja: 'オーブ購入・モンパス・超獣神祭・コラボガチャ課金で貯まるPlayポイントを計算！',
      en: 'Calculate Play Points earned on Orbs, Monpass, and special banner summons in Monster Strike!',
      ko: '오브 구매, 몬패스, 초수신제 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '計算寶珠、怪物彈珠通行證、超獸神祭課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'モンパス (480円)', price: 480 },
        { name: 'オーブ 1個 (160円)', price: 160 },
        { name: 'オーブ 3個 (480円)', price: 480 },
        { name: 'オーブ 6+1個 (980円)', price: 980 },
        { name: 'オーブ 12+3個 (2,000円)', price: 2000 },
        { name: 'オーブ 30+9個 (4,900円)', price: 4900 },
        { name: 'オーブ 60+25個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: 'Monpass ($3.99)', price: 3.99 },
        { name: '1 Orb ($0.99)', price: 0.99 },
        { name: '6+1 Orbs ($7.99)', price: 7.99 },
        { name: '60+25 Orbs ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '몬패스 (₩4,900)', price: 4900 },
        { name: '오브 1개 (₩1,500)', price: 1500 },
        { name: '오브 6+1개 (₩9,900)', price: 9900 },
        { name: '오브 60+25개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '通行證 (NT$130)', price: 130 },
        { name: '寶珠 1個 (NT$33)', price: 33 },
        { name: '寶珠 6+1個 (NT$270)', price: 270 },
        { name: '寶珠 60+25個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'モンパス月額 (480円)', amount: 480, mult: 1 },
        { label: '10連分 50個 (約3,500円)', amount: 3500, mult: 1 },
        { label: '新春・周年ガチャ (100,000円)', amount: 100000, mult: 1 }
      ],
      en: [
        { label: 'Monpass ($3.99)', amount: 3.99, mult: 1 },
        { label: '10-pulls ($28.00)', amount: 28.0, mult: 1 },
        { label: 'Big Banner ($800.00)', amount: 800.0, mult: 1 }
      ],
      ko: [
        { label: '몬패스 (₩4,900)', amount: 4900, mult: 1 },
        { label: '10연차 (₩35,000)', amount: 35000, mult: 1 }
      ],
      tw: [
        { label: '通行證 (NT$130)', amount: 130, mult: 1 },
        { label: '10連抽 (NT$950)', amount: 950, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'モンストで10万円課金したらいくらポイントが還元されますか？', a: '通常時で約1,000pt、ポイント増量キャンペーン時なら約3,000pt〜5,000ptが戻ってきます。' }
      ],
      en: [
        { q: 'How many Play Points for spending $800 on Monster Strike?', a: 'You earn ~800 pts normally, or ~4,000 pts during a 5x promo.' }
      ],
      ko: [
        { q: '몬스터 스트라이크 과금 시 포인트 환원은?', a: '기본 1% 적립되며, 5배 이벤트 시 5%가 환원됩니다.' }
      ],
      tw: [
        { q: '怪物彈珠課金回饋點數怎麼算？', a: '一般時段為 1 點/NT$30，活動時段最高可達 5 倍加碼回饋。' }
      ]
    }
  },
  {
    id: 'gakumas',
    icon: '🌟',
    names: { ja: '学園アイドルマスター (学マス)', en: 'Gakuen Idolmaster', ko: '학원 아이돌마스터', tw: '學園偶像大師' },
    shortNames: { ja: '学マス', en: 'Gakumas', ko: '학마스', tw: '學馬斯' },
    descs: {
      ja: 'ジュエルパック・パス課金・天井（200連=6万円）で貯まるPlayポイントと到達ステータスを試算！',
      en: 'Calculate Play Points earned on Jewels and 200-pull pity in Gakuen Idolmaster!',
      ko: '쥬얼 패키지 및 200연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '試算學園偶像大師寶石與200抽保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'ジュエル 60個 (160円)', price: 160 },
        { name: 'ジュエル 180個 (480円)', price: 480 },
        { name: 'ジュエル 470個 (1,200円)', price: 1200 },
        { name: 'ジュエル 1200個 (3,000円)', price: 3000 },
        { name: 'ジュエル 2050個 (5,000円)', price: 5000 },
        { name: 'ジュエル 4200個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '60 Jewels ($0.99)', price: 0.99 },
        { name: '180 Jewels ($3.99)', price: 3.99 },
        { name: '1200 Jewels ($23.99)', price: 23.99 },
        { name: '4200 Jewels ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '쥬얼 60개 (₩1,500)', price: 1500 },
        { name: '쥬얼 180개 (₩4,900)', price: 4900 },
        { name: '쥬얼 1200개 (₩29,000)', price: 29000 },
        { name: '쥬얼 4200개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '寶石 60個 (NT$33)', price: 33 },
        { name: '寶石 180個 (NT$130)', price: 130 },
        { name: '寶石 1200個 (NT$790)', price: 790 },
        { name: '寶石 4200個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
        { label: '天井 200連 (60,000円)', amount: 60000, mult: 1 }
      ],
      en: [
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '200-pull Pity ($480.00)', amount: 480.0, mult: 1 }
      ],
      ko: [
        { label: '10연차 (₩29,000)', amount: 29000, mult: 1 },
        { label: '200연차 천장 (₩594,000)', amount: 594000, mult: 1 }
      ],
      tw: [
        { label: '10連抽 (NT$790)', amount: 790, mult: 1 },
        { label: '200抽保底 (NT$16,000)', amount: 16000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: '学マスの天井課金（6万円）でゴールドランクになれますか？', a: 'はい。通常レートで約600pt、CP時なら約1,800pt〜3,000pt貯まり、ゴールド（1,000pt）に到達可能です。' },
        { q: '有償ジュエルの購入時期はいつがお得ですか？', a: 'Google Play Pointsのポイント3倍〜5倍増量キャンペーン期間中にまとめ買いすると最も効率的です。' }
      ],
      en: [
        { q: 'Can I reach Gold status with 200-pull pity in Gakumas?', a: 'Yes! Pity spending generates enough points to reach Silver and Gold during promotional periods.' }
      ],
      ko: [
        { q: '학마스 천장 결제로 골드 등급 달성이 가능한가요?', a: '네! 이벤트 결합 시 골드 등급(600pt 이상)에 즉시 도달할 수 있습니다.' }
      ],
      tw: [
        { q: '學馬斯保底能達到金級會員嗎？', a: '可以，配合加碼活動可順利達到金級（1,000點）門檻。' }
      ]
    }
  },
  {
    id: 'proseka',
    icon: '🎵',
    names: { ja: 'プロジェクトセカイ (プロセカ)', en: 'Project SEKAI: Colorful Stage!', ko: '프로젝트 세카이 컬러풀 스테이지!', tw: '世界計畫 繽紛舞台！' },
    shortNames: { ja: 'プロセカ', en: 'ProSEKAI', ko: '프세카', tw: '世界計畫' },
    descs: {
      ja: '有償クリスタル・カラフルパス・プレパス・天井課金で貯まるPlayポイントを計算！',
      en: 'Calculate Play Points earned on Crystals, Colorful Pass, and 300-pull spark pity in Project SEKAI!',
      ko: '유료 크리스탈, 컬러풀 패스, 300연차 천장 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算世界計畫付費水晶、月卡、300抽保底課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'カラフルパス (480円)', price: 480 },
        { name: 'プレミアムミッションパス (1,960円)', price: 1960 },
        { name: 'クリスタル 100個 (160円)', price: 160 },
        { name: 'クリスタル 300個 (480円)', price: 480 },
        { name: 'クリスタル 650個 (1,000円)', price: 1000 },
        { name: 'クリスタル 2000個 (3,000円)', price: 3000 },
        { name: 'クリスタル 3400個 (5,000円)', price: 5000 },
        { name: 'クリスタル 7000個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: 'Colorful Pass ($3.99)', price: 3.99 },
        { name: 'Premium Mission Pass ($15.99)', price: 15.99 },
        { name: '100 Crystals ($0.99)', price: 0.99 },
        { name: '2000 Crystals ($23.99)', price: 23.99 },
        { name: '7000 Crystals ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '컬러풀 패스 (₩4,900)', price: 4900 },
        { name: '프리미엄 미션 패스 (₩19,000)', price: 19000 },
        { name: '크리스탈 100개 (₩1,500)', price: 1500 },
        { name: '크리스탈 2000개 (₩29,000)', price: 29000 },
        { name: '크리스탈 7000개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '繽紛通行證 (NT$130)', price: 130 },
        { name: '高級任務通行證 (NT$490)', price: 490 },
        { name: '水晶 100個 (NT$33)', price: 33 },
        { name: '水晶 2000個 (NT$790)', price: 790 },
        { name: '水晶 7000個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'カラパス+プレパス (2,440円)', amount: 2440, mult: 1 },
        { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
        { label: 'シール天井 300連 (90,000円)', amount: 90000, mult: 1 }
      ],
      en: [
        { label: 'Passes Combo ($19.98)', amount: 19.98, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '300-pull Spark ($720.00)', amount: 720.0, mult: 1 }
      ],
      ko: [
        { label: '패스 세트 (₩23,900)', amount: 23900, mult: 1 },
        { label: '10연차 (₩29,000)', amount: 29000, mult: 1 },
        { label: '300연차 천장 (₩891,000)', amount: 891000, mult: 1 }
      ],
      tw: [
        { label: '月卡組合 (NT$620)', amount: 620, mult: 1 },
        { label: '10連抽 (NT$790)', amount: 790, mult: 1 },
        { label: '300抽保底 (NT$24,000)', amount: 24000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'プロセカの天井（9万円）で何ポイント還元されますか？', a: '通常時で約900pt、Google Playの5倍キャンペーン時なら約4,500pt（プラチナランク到達）還元されます。' },
        { q: 'カラフルパスの月額課金もポイント対象ですか？', a: 'はい。カラフルパスおよびプレミアムミッションパスも全額ポイント付与の対象です。' }
      ],
      en: [
        { q: 'How many Play Points for 300-pull spark in Project SEKAI?', a: 'Around ~720 pts normally, or up to ~3,600 pts with a 5x multiplier.' }
      ],
      ko: [
        { q: '프세카 300연차 천장 시 포인트는?', a: '기본 약 891pt, 5배 이벤트 시 약 4,455pt가 환원됩니다.' }
      ],
      tw: [
        { q: '世界計畫 300抽保底能拿多少點數？', a: '一般回饋約 800 點，5倍活動時可獲約 4,000 點。' }
      ]
    }
  }
];

function generateGamePageHtml(game, localeKey) {
  const loc = LOCALES[localeKey];
  const langPrefix = loc.dir ? `/${loc.dir}` : '';
  const rootRelative = loc.dir ? '../../' : '../../';
  const portalRelative = loc.dir ? '../' : '../';
  const assetsRelative = loc.dir ? '../../../' : '../../';
  const articlesRelative = loc.dir ? '../../articles/' : '../../blog/';
  const authorRelative = loc.dir ? `${assetsRelative}author/katakata.html` : '../../author/katakata.html';

  const gameTitle = game.names[localeKey] || game.names.ja;
  const gameShort = game.shortNames[localeKey] || game.shortNames.ja;
  const gameDesc = game.descs[localeKey] || game.descs.ja;
  const gamePacks = game.packs[localeKey] || game.packs.ja;
  const gamePresets = game.presets[localeKey] || game.presets.ja;
  const gameFaq = game.faq[localeKey] || game.faq.ja;

  const packOptions = gamePacks.map(p => `<option value="${p.price}">${p.name}</option>`).join('\n                  ');
  const presetButtons = gamePresets.map((p, idx) => `<button type="button" class="preset-btn ${idx === 0 ? 'active' : ''}" data-amount="${p.amount}" data-mult="${p.mult}" aria-pressed="${idx === 0 ? 'true' : 'false'}">${p.label}</button>`).join('\n              ');
  const faqHtml = gameFaq.map(f => `<h3>${f.q}</h3>\n<p>${f.a}</p>`).join('\n');
  
  const packTableRows = gamePacks.map(p => {
    const normalPts = Math.round(p.price / loc.unitSpend);
    const cpPts = Math.round((p.price / loc.unitSpend) * 5);
    const formattedPrice = `${loc.currencyPrefix}${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}${loc.currencySuffix}`;
    return `<tr><td>${p.name}</td><td>${formattedPrice}</td><td>${loc.approxText}${normalPts.toLocaleString()} pt</td><td>${loc.approxText}${cpPts.toLocaleString()} pt</td></tr>`;
  }).join('\n');

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": gameFaq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": `${gameTitle} Play Points Calculator`,
    "url": `https://playpoint-sim.com${langPrefix}/games/${game.id}/`,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "All"
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": loc.breadcrumbsHome,
        "item": `https://playpoint-sim.com${langPrefix}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": loc.breadcrumbsPortal,
        "item": `https://playpoint-sim.com${langPrefix}/games/`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": gameTitle,
        "item": `https://playpoint-sim.com${langPrefix}/games/${game.id}/`
      }
    ]
  };

  return `<!doctype html>
<html lang="${loc.langCode}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="${loc.authorName}" />
  <link rel="icon" href="${assetsRelative}favicon.svg" type="image/svg+xml" />
  <title>${gameTitle} - ${loc.siteName}</title>
  <meta name="description" content="${gameDesc}" />
  <link rel="canonical" href="https://playpoint-sim.com${langPrefix}/games/${game.id}/" />
  <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/games/${game.id}/" />
  <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/games/${game.id}/" />
  <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/games/${game.id}/" />
  <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/games/${game.id}/" />
  <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/games/${game.id}/" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${loc.siteName}" />
  <meta property="og:title" content="${gameTitle} - ${loc.siteName}" />
  <meta property="og:description" content="${gameDesc}" />
  <meta property="og:url" content="https://playpoint-sim.com${langPrefix}/games/${game.id}/" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${gameTitle} - ${loc.siteName}" />
  <meta name="twitter:description" content="${gameDesc}" />
  <meta name="twitter:image" content="https://playpoint-sim.com/ogp.png" />

  <link rel="stylesheet" href="${assetsRelative}articles/article-shared.css?v=eb2e12f5ef" />
  <link rel="stylesheet" href="${assetsRelative}games/games.css" />

  <script type="application/ld+json">
  ${JSON.stringify(appSchema, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(faqSchema, null, 2)}
  </script>
</head>
<body>

  <!-- ヘッダー -->
  <header class="site-header">
      <div class="site-header-inner">
          <a class="site-logo" href="${rootRelative}">
              <span class="site-logo-icon">🎮</span>
              <span class="site-logo-text">${loc.siteName}</span>
          </a>
          <p class="site-tagline">${loc.portalMeta}</p>
      </div>
  </header>

  <!-- グローバルナビゲーション -->
  <nav class="global-nav" aria-label="メインナビゲーション">
      <div class="global-nav-inner">
          <a class="nav-item" href="${rootRelative}">
              <span>${loc.homeTitle}</span>
          </a>
          <a class="nav-item active" href="${portalRelative}">
              <span>${loc.portalTitle}</span>
          </a>
          <a class="nav-item" href="${articlesRelative}">
              <span>${loc.blogTitle}</span>
          </a>
          <a class="nav-item" href="${authorRelative}">
              <span>${loc.authorTitle}</span>
          </a>
      </div>
  </nav>

  <!-- パンくずリスト -->
  <div class="breadcrumbs-wrapper">
      <nav aria-label="パンくずリスト">
          <a href="${rootRelative}">${loc.breadcrumbsHome}</a> <span>&gt;</span>
          <a href="${portalRelative}">${loc.breadcrumbsPortal}</a> <span>&gt;</span>
          <span>${gameTitle}</span>
      </nav>
  </div>

  <div class="game-page-container">
      <main class="game-main-content">
          <header class="game-header">
              <span class="game-badge">${game.icon} ${loc.badgeText}</span>
              <h1 class="game-title">${gameTitle}</h1>
              <p class="game-meta">${loc.verifiedDate} ｜ Google Play Points (${loc.rateText})</p>
          </header>

          <p>${gameDesc}</p>

          <!-- シミュレーター操作パネル -->
          <section class="game-sim-card">
              <h2 class="game-sim-title">🧮 ${gameShort}</h2>

              <p class="preset-heading">${loc.presetHeading}</p>
              <div class="preset-buttons">
                  ${presetButtons}
              </div>

              <form id="game-sim-form">
                  <div class="input-grid">
                      <div class="input-field">
                          <label for="sim-pack-select">${loc.packSelectLabel}</label>
                          <select id="sim-pack-select">
                              ${packOptions}
                              <option value="custom">${loc.customOption}</option>
                          </select>
                      </div>

                      <div class="input-field">
                          <label for="sim-pack-count">${loc.packCountLabel}</label>
                          <input type="number" id="sim-pack-count" value="1" min="1" max="999" inputmode="numeric">
                      </div>

                      <div class="input-field">
                          <label for="sim-custom-amount">${loc.customAmountLabel}</label>
                          <input type="number" id="sim-custom-amount" value="${gamePresets[0].amount}" min="0" step="any" inputmode="decimal">
                      </div>

                      <div class="input-field">
                          <label for="sim-multiplier">${loc.multiplierLabel}</label>
                          <select id="sim-multiplier">
                              ${loc.multiplierOptions.map(m => `<option value="${m.val}">${m.label}</option>`).join('')}
                          </select>
                      </div>

                      <div class="input-field">
                          <label for="sim-status">${loc.statusLabel}</label>
                          <select id="sim-status">
                              ${loc.statusOptions.map(s => `<option value="${s.val}">${s.label}</option>`).join('')}
                          </select>
                      </div>
                  </div>
              </form>

              <!-- 計算結果表示エリア -->
              <div class="game-result-container">
                  <div class="result-main-grid">
                      <div class="result-stat-box">
                          <span class="result-stat-label">${loc.resTotalLabel}</span>
                          <strong id="res-total-amount" class="result-stat-value">-</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">${loc.resEarnedLabel}</span>
                          <strong id="res-earned-points" class="result-stat-value highlight">- pt</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">${loc.resValueLabel}</span>
                          <strong id="res-point-value-yen" class="result-stat-value">-</strong>
                      </div>
                      <div class="result-stat-box">
                          <span class="result-stat-label">${loc.resRankLabel}</span>
                          <strong id="res-reached-rank" class="result-stat-value">-</strong>
                      </div>
                  </div>

                  <!-- ランク進捗 -->
                  <div class="rank-progress-wrapper">
                      <div class="rank-progress-header">
                          <span>${loc.resProgressTitle}</span>
                          <span id="res-next-progress">-</span>
                      </div>
                      <div class="rank-bar-bg">
                          <div id="res-rank-bar" class="rank-bar-fill" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                      </div>
                  </div>

                  <!-- ギフトカード収益化CTAカード -->
                  <div class="game-giftcard-cta">
                      <div class="game-giftcard-cta-content">
                          <div class="game-giftcard-cta-title">${loc.giftCardCtaTitle}</div>
                          <p class="game-giftcard-cta-text">${loc.giftCardCtaText} <span id="cta-dynamic-savings" class="dynamic-savings-badge" style="display:none;"></span></p>
                      </div>
                      <a class="game-giftcard-cta-btn" href="${assetsRelative}${loc.giftCardCtaHref}">${loc.giftCardCtaBtn}</a>
                  </div>

                  <p style="font-size:0.85rem; color:#64748b; margin-top:12px; margin-bottom:0;">
                      ${loc.disclaimerText}
                  </p>
              </div>
          </section>

          <!-- パック早見表 -->
          <section class="section">
              <h2>${gameShort} ${loc.tableTitle}</h2>
              <div class="pack-table-wrap">
                  <table class="pack-table">
                      <thead>
                          <tr>
                              <th>${loc.tableThPack}</th>
                              <th>${loc.tableThPrice}</th>
                              <th>${loc.tableThNormal}</th>
                              <th>${loc.tableThCp}</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${packTableRows}
                      </tbody>
                  </table>
              </div>
          </section>

          <!-- よくある質問 -->
          <section class="section">
              <h2>${loc.faqHeading}</h2>
              ${faqHtml}
          </section>

          <!-- 他のゲーム計算機 -->
          <section class="section">
              <h2>${loc.otherGamesHeading}</h2>
              <div class="games-grid">
                  ${GAMES_DATA.filter(g => g.id !== game.id).map(g => `
                  <a class="game-portal-card" href="../${g.id}/">
                      <div>
                          <div class="game-card-icon">${g.icon}</div>
                          <h3 class="game-card-title">${g.names[localeKey] || g.names.ja}</h3>
                          <p class="game-card-desc">${g.descs[localeKey] || g.descs.ja}</p>
                      </div>
                      <div class="game-card-action">${loc.openCalc}</div>
                  </a>`).join('')}
              </div>
          </section>

          <!-- 汎用CTA -->
          <aside class="cta-box" style="margin-top:40px;">
              <h3>${loc.ctaTitle}</h3>
              <p>${loc.ctaDesc}</p>
              <a class="cta-btn" href="${rootRelative}">${loc.ctaBtn}</a>
          </aside>
      </main>

      <!-- サイドバー -->
      <aside class="sidebar-column">
          <div class="sidebar-widget">
              <div class="sidebar-widget-title">${loc.sidebarCalcTitle}</div>
              <div class="sidebar-widget-body">
                  <div class="sidebar-calc-banner">
                      <h4>${loc.sidebarCalcHeading}</h4>
                      <p>${loc.sidebarCalcDesc}</p>
                      <a class="sidebar-calc-btn" href="${rootRelative}">${loc.sidebarCalcBtn}</a>
                  </div>
              </div>
          </div>

          <div class="sidebar-widget">
              <div class="sidebar-widget-title">${loc.sidebarArticlesTitle}</div>
              <div class="sidebar-widget-body">
                  <ul class="sidebar-article-list">
                      ${loc.sidebarArticles.map(a => `<li><a href="${assetsRelative}${a.href}">${a.title}</a></li>`).join('')}
                  </ul>
              </div>
          </div>
      </aside>
  </div>

  <!-- サイトフッター -->
  <footer class="site-footer">
      <div class="site-footer-links">
          <a href="${rootRelative}">${loc.homeTitle}</a> ｜
          <a href="${portalRelative}">${loc.portalTitle}</a> ｜
          <a href="${articlesRelative}">${loc.blogTitle}</a> ｜
          <a href="${assetsRelative}privacy.html">Privacy</a> ｜
          <a href="${assetsRelative}terms.html">Terms</a> ｜
          <a href="${authorRelative}">${loc.authorTitle}</a>
      </div>
      <p>© 2026 ${loc.siteName} All Rights Reserved.</p>
  </footer>

  <script src="${assetsRelative}js/analytics-core.js"></script>
  <script src="${assetsRelative}games/game-sim.js"></script>
</body>
</html>
`;
}

function generatePortalPageHtml(localeKey) {
  const loc = LOCALES[localeKey];
  const langPrefix = loc.dir ? `/${loc.dir}` : '';
  const rootRelative = loc.dir ? '../' : '../';
  const assetsRelative = loc.dir ? '../../' : '../';
  const articlesRelative = loc.dir ? '../articles/' : '../blog/';
  const authorRelative = loc.dir ? `${assetsRelative}author/katakata.html` : '../author/katakata.html';

  const cardsHtml = GAMES_DATA.map(game => `
    <a class="game-portal-card" href="./${game.id}/">
        <div>
            <div class="game-card-icon">${game.icon}</div>
            <h2 class="game-card-title">${game.names[localeKey] || game.names.ja}</h2>
            <p class="game-card-desc">${game.descs[localeKey] || game.descs.ja}</p>
        </div>
        <div class="game-card-action">${loc.openCalc}</div>
    </a>
  `).join('\n');

  const portalBreadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": loc.breadcrumbsHome,
        "item": `https://playpoint-sim.com${langPrefix}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": loc.breadcrumbsPortal,
        "item": `https://playpoint-sim.com${langPrefix}/games/`
      }
    ]
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": loc.portalH1,
    "url": `https://playpoint-sim.com${langPrefix}/games/`,
    "description": loc.portalMeta
  };

  return `<!doctype html>
<html lang="${loc.langCode}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="${loc.authorName}" />
  <link rel="icon" href="${assetsRelative}favicon.svg" type="image/svg+xml" />
  <title>${loc.portalH1} - ${loc.siteName}</title>
  <meta name="description" content="${loc.portalMeta}" />
  <link rel="canonical" href="https://playpoint-sim.com${langPrefix}/games/" />
  <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/games/" />
  <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/games/" />
  <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/games/" />
  <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/games/" />
  <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/games/" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${loc.siteName}" />
  <meta property="og:title" content="${loc.portalH1} - ${loc.siteName}" />
  <meta property="og:description" content="${loc.portalMeta}" />
  <meta property="og:url" content="https://playpoint-sim.com${langPrefix}/games/" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${loc.portalH1} - ${loc.siteName}" />
  <meta name="twitter:description" content="${loc.portalMeta}" />
  <meta name="twitter:image" content="https://playpoint-sim.com/ogp.png" />

  <link rel="stylesheet" href="${assetsRelative}articles/article-shared.css?v=eb2e12f5ef" />
  <link rel="stylesheet" href="${assetsRelative}games/games.css" />

  <script type="application/ld+json">
  ${JSON.stringify(collectionSchema, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(portalBreadcrumbSchema, null, 2)}
  </script>
</head>
<body>

  <!-- ヘッダー -->
  <header class="site-header">
      <div class="site-header-inner">
          <a class="site-logo" href="${rootRelative}">
              <span class="site-logo-icon">🎮</span>
              <span class="site-logo-text">${loc.siteName}</span>
          </a>
          <p class="site-tagline">${loc.portalMeta}</p>
      </div>
  </header>

  <!-- グローバルナビゲーション -->
  <nav class="global-nav" aria-label="メインナビゲーション">
      <div class="global-nav-inner">
          <a class="nav-item" href="${rootRelative}">
              <span>${loc.homeTitle}</span>
          </a>
          <a class="nav-item active" href="./">
              <span>${loc.portalTitle}</span>
          </a>
          <a class="nav-item" href="${articlesRelative}">
              <span>${loc.blogTitle}</span>
          </a>
          <a class="nav-item" href="${authorRelative}">
              <span>${loc.authorTitle}</span>
          </a>
      </div>
  </nav>

  <!-- パンくずリスト -->
  <div class="breadcrumbs-wrapper">
      <nav aria-label="パンくずリスト">
          <a href="${rootRelative}">${loc.breadcrumbsHome}</a> <span>&gt;</span>
          <span>${loc.breadcrumbsPortal}</span>
      </nav>
  </div>

  <div class="game-page-container">
      <main class="game-main-content">
          <header class="game-header">
              <span class="game-badge">${loc.portalBadge}</span>
              <h1 class="game-title">${loc.portalH1}</h1>
              <p class="game-meta">${loc.portalMeta}</p>
          </header>

          <p>${loc.portalLead}</p>

          <div class="games-grid">
              ${cardsHtml}
          </div>

          <aside class="cta-box" style="margin-top:40px;">
              <h3>${loc.ctaTitle}</h3>
              <p>${loc.ctaDesc}</p>
              <a class="cta-btn" href="${rootRelative}">${loc.ctaBtn}</a>
          </aside>
      </main>

      <!-- サイドバー -->
      <aside class="sidebar-column">
          <div class="sidebar-widget">
              <div class="sidebar-widget-title">${loc.sidebarCalcTitle}</div>
              <div class="sidebar-widget-body">
                  <div class="sidebar-calc-banner">
                      <h4>${loc.sidebarCalcHeading}</h4>
                      <p>${loc.sidebarCalcDesc}</p>
                      <a class="sidebar-calc-btn" href="${rootRelative}">${loc.sidebarCalcBtn}</a>
                  </div>
              </div>
          </div>

          <div class="sidebar-widget">
              <div class="sidebar-widget-title">${loc.sidebarArticlesTitle}</div>
              <div class="sidebar-widget-body">
                  <ul class="sidebar-article-list">
                      ${loc.sidebarArticles.map(a => `<li><a href="${assetsRelative}${a.href}">${a.title}</a></li>`).join('')}
                  </ul>
              </div>
          </div>
      </aside>
  </div>

  <!-- サイトフッター -->
  <footer class="site-footer">
      <div class="site-footer-links">
          <a href="${rootRelative}">${loc.homeTitle}</a> ｜
          <a href="./">${loc.portalTitle}</a> ｜
          <a href="${articlesRelative}">${loc.blogTitle}</a> ｜
          <a href="${assetsRelative}privacy.html">Privacy</a> ｜
          <a href="${assetsRelative}terms.html">Terms</a> ｜
          <a href="${authorRelative}">${loc.authorTitle}</a>
      </div>
      <p>© 2026 ${loc.siteName} All Rights Reserved.</p>
  </footer>

  <script src="${assetsRelative}js/analytics-core.js"></script>
</body>
</html>
`;
}

function buildAll() {
  const rootDir = path.join(__dirname, '..');

  for (const localeKey of Object.keys(LOCALES)) {
    const loc = LOCALES[localeKey];
    const gamesDir = loc.dir ? path.join(rootDir, loc.dir, 'games') : path.join(rootDir, 'games');

    if (!fs.existsSync(gamesDir)) {
      fs.mkdirSync(gamesDir, { recursive: true });
    }

    // ポータルページ
    fs.writeFileSync(path.join(gamesDir, 'index.html'), generatePortalPageHtml(localeKey), 'utf8');
    console.log(`Generated ${loc.dir ? loc.dir + '/' : ''}games/index.html`);

    // 各ゲーム個別ページ
    for (const game of GAMES_DATA) {
      const targetDir = path.join(gamesDir, game.id);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(path.join(targetDir, 'index.html'), generateGamePageHtml(game, localeKey), 'utf8');
      console.log(`Generated ${loc.dir ? loc.dir + '/' : ''}games/${game.id}/index.html`);
    }
  }
}

buildAll();
