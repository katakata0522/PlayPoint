'use strict';

const fs = require('fs');
const path = require('path');

const GAME_CONTENT_UPDATED_AT = '2026-08-18';

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
    navAriaLabel: 'メインナビゲーション',
    breadcrumbAriaLabel: 'パンくずリスト',
    adLabel: 'スポンサーリンク',
    privacyLabel: 'プライバシーポリシー',
    termsLabel: '利用規約',
    currencySymbol: '円',
    currencyPrefix: '',
    currencySuffix: ' 円',
    pointValuePrefix: '約 ',
    pointValueSuffix: ' 円分',
    unitSpend: 100,
    rateText: '100円=1pt',
    verifiedDate: 'Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）',
    badgeText: '人気ゲーム別シミュレーター',
    portalBadge: '🎮 ソシャゲ特化',
    portalH1: '人気ゲーム別 Playポイント課金・天井シミュレーター',
    portalMeta: '原神・スタレ・ブルアカ・ウマ娘・ヘブバン・ファンパレなど人気ゲームの課金パックや天井ガチャで貯まるPlayポイントをパッと計算！各ゲームの課金アイテム価格や還元早見表、お得な使い道を掲載しています。ガチャ前の計画にぜひ役立ててくださいね。',
    portalLead: 'Google Playストアで配信されている人気ゲームの課金アイテム（創世結晶、往日の夢華、モノクローム、青輝石、ポケゴールド、ジュエル、聖晶石、オーブ、月相、有償ジュエル、龍石、純正源石など）の価格レートに対応！「天井（ガチャ確定）まで回したら何ポイント還元される？」「完凸でゴールド・プラチナランクに届く？」をワンタップでシミュレーションできます。',
    openCalc: '計算機を開く ➔',
    presetHeading: '▼ 目標プリセット：',
    approxText: '約 ',
    customAmountLabel: '課金予定合計額（円）：',
    packSelectLabel: '課金パックを選択：',
    packCountLabel: '購入回数：',
    customOption: '自由入力（カスタム金額）',
    multiplierLabel: 'キャンペーン特別獲得率：',
    multiplierOptions: [
      { val: '1', label: '通常 / 100円あたり1pt' },
      { val: '2', label: '特別獲得率：100円あたり2pt' },
      { val: '3', label: '特別獲得率：100円あたり3pt' },
      { val: '4', label: '特別獲得率：100円あたり4pt' },
      { val: '5', label: '特別獲得率：100円あたり5pt' },
      { val: '7', label: '特別獲得率：100円あたり7pt' }
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
    resValueLabel: '交換価値（Play画面で確認）',
    resRankLabel: '0ptから見た参考ランク',
    resProgressTitle: '0ptから見た参考進捗',
    shareBtnText: '𝕏 で計算結果をシェア',
    copyLinkText: '🔗 結果リンクをコピー',
    copiedAlert: '結果リンクをクリップボードにコピーしました！',
    disclaimerText: '※獲得ポイントはGoogle Play公式の国別通常獲得率と四捨五入ルールを基準にした目安です。ランク表示は年間累計0ptから見た参考で、現在の年間進捗は反映しません。購入前にGoogle Play画面の獲得予定ポイントとステータス進捗をご確認ください。',
    giftCardCtaTitle: '💳 課金前にチェック！さらにお得にする裏技',
    giftCardCtaText: '楽天市場のGoogle Play ギフトコード認定店では、楽天側のキャンペーンや会員条件に応じてポイント還元が付く場合があります。購入前に当日の還元条件・上限を確認してください。',
    giftCardCtaBtn: '🛒 楽天市場 認定店でギフトコードを見る ➔',
    giftCardCtaAffiliateUrl: 'https://hb.afl.rakuten.co.jp/hgc/56983677.8efa0dbe.56983678.1b999667/?pc=https%3A%2F%2Fwww.rakuten.co.jp%2Fgpgiftcard%2F&link_type=hybrid_url&ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJoeWJyaWRfdXJsIiwiY29sIjoxLCJjYXQiOjEsImJhbiI6MTcxMDEwMCwiY1W1wIjp1YWxYODQ%3D',
    giftCardGuideBtn: '📖 お得な買い方・注意点ガイド ➔',
    giftCardCtaHref: 'articles/2026-06-20-discount-gift-cards.html',
    tableTitle: '課金パック別 Playポイント還元早見表',
    tableThPack: '課金パック名',
    tableThPrice: '価格 (税込)',
    tableThNormal: '基本獲得率（100円あたり1pt）',
    tableThCp: '特別獲得率 5pt/100円時',
    rewardCompareTitle: 'Play Points「使う」で確認できる交換先',
    rewardTagCoupon: '割引クーポン',
    rewardCouponName: 'ゲーム専用 割引クーポン',
    rewardCouponRate: '必要ポイント・割引額は表示条件で確認',
    rewardCouponDesc: '対象ゲームの割引クーポンが表示される場合があります。必要ポイント、割引額、最低購入額、有効期限はPlay Pointsの「使う」に表示された条件を基準にしてください。',
    rewardTagDirect: '直接交換',
    rewardDirectName: 'ゲーム内課金通貨・アイテム',
    rewardDirectRate: '交換内容・必要ポイントは表示中のオファーで確認',
    rewardDirectDesc: '対象ゲームのゲーム内アイテムとポイントを交換できる場合があります。内容や必要ポイントは国・時期・アカウントで異なるため、Play Pointsの「使う」を確認してください。',
    rewardTagCredit: 'Play残高',
    rewardCreditName: 'Google Play クレジット',
    rewardCreditRate: '必要ポイント・受取額はPlay Points画面で確認',
    rewardCreditDesc: 'Google Playクレジットと交換できる場合があります。交換条件はPlay Pointsの「使う」に表示された内容を確認してください。ポイント交換で受け取ったPlayクレジットの有効期限は1年です。',
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
      { title: '倍率・キャンペーンの正しい計算方法', href: 'articles/2026-08-05-play-points-multiplier-stacking.html' },
      { title: 'Play Pointsランク完全ガイド', href: 'articles/2026-08-05-play-points-levels-guide.html' },
      { title: 'Google Playギフトコードをお得に買う方法', href: 'articles/2026-06-20-discount-gift-cards.html' },
      { title: '100ポイントはいくら相当？', href: 'articles/2026-07-24-play-points-100-value.html' }
    ],
    trademarkNotice: 'Google Play、Google Play ロゴ、Android は Google LLC の商標です。当サイトは独立した非公式ファンサイト・シミュレーターであり、Google LLC および掲載されている各ゲームの開発・配信元企業とは一切関係ありません。記載されているゲーム名・アイテム名・商標の権利は各権利元に帰属します。'
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
    navAriaLabel: 'Main navigation',
    breadcrumbAriaLabel: 'Breadcrumb',
    adLabel: 'Sponsored',
    privacyLabel: 'Privacy Policy (Japanese)',
    termsLabel: 'Terms of Service (Japanese)',
    currencySymbol: '$',
    currencyPrefix: '$',
    currencySuffix: '',
    pointValuePrefix: 'Approx. $',
    pointValueSuffix: ' value',
    unitSpend: 1.0,
    rateText: '$1=1pt',
    verifiedDate: 'Play Points rates checked: August 2026 (game prices/pity are reference values)',
    badgeText: 'Mobile Game Points Simulator',
    portalBadge: '🎮 Mobile Game Special',
    portalH1: 'Google Play Points Mobile Game Spending Calculators',
    portalMeta: 'Select your favorite mobile game to calculate Google Play Points earned on in-app purchases, monthly passes, and pity summons.',
    portalLead: 'Accurate Play Points simulation for top mobile titles including Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Blue Archive, Pokémon TCG Pocket, FGO, NIKKE, Wuthering Waves, Dokkan Battle, and Arknights. Estimate points earned from monthly passes, pity summons, and level-up progress in one click.',
    openCalc: 'Open Calculator ➔',
    presetHeading: '▼ Quick Targets:',
    approxText: '~',
    customAmountLabel: 'Planned Spending ($ USD):',
    packSelectLabel: 'Select Purchase Pack:',
    packCountLabel: 'Quantity:',
    customOption: 'Custom Amount (Free input)',
    multiplierLabel: 'Promotion special earn rate:',
    multiplierOptions: [
      { val: '1', label: 'Base reference: 1 pt / $1' },
      { val: '2', label: 'Special rate: 2 pt / $1' },
      { val: '3', label: 'Special rate: 3 pt / $1' },
      { val: '4', label: 'Special rate: 4 pt / $1' },
      { val: '5', label: 'Special rate: 5 pt / $1' },
      { val: '7', label: 'Special rate: 7 pt / $1' }
    ],
    statusLabel: 'Current Status Level:',
    statusOptions: [
      { val: '1.0', label: 'Bronze ($1 = 1pt)' },
      { val: '1.1', label: 'Silver ($1 = 1.1pt)' },
      { val: '1.2', label: 'Gold ($1 = 1.2pt)' },
      { val: '1.4', label: 'Platinum ($1 = 1.4pt)' },
      { val: '1.6', label: 'Diamond ($1 = 1.6pt)' }
    ],
    resTotalLabel: 'Total Spending',
    resEarnedLabel: 'Estimated Play Points',
    resValueLabel: 'Redemption value (check Play)',
    resRankLabel: 'Reference level from 0 pts',
    resProgressTitle: 'Reference progress from 0 pts',
    shareBtnText: '𝕏 Share Result',
    copyLinkText: '🔗 Copy Link',
    copiedAlert: 'Result link copied to clipboard!',
    disclaimerText: '※Point estimates use the current US base rates and Google Play rounding rules. The level display is only a reference starting from 0 annual points and does not include your current yearly progress. Check the Play purchase screen and level progress before checkout.',
    giftCardCtaTitle: '💳 Maximizing Play Points with Gift Cards',
    giftCardCtaText: 'Check the gift card guide for how Google Play Gift Cards interact with points, promotions, and account conditions before purchase.',
    giftCardCtaBtn: 'Read Gift Card Guide ➔',
    giftCardCtaHref: 'en/articles/google-play-points-gift-cards.html',
    tableTitle: 'In-App Purchase Packs & Points Reward Table',
    tableThPack: 'Pack / Item Name',
    tableThPrice: 'Price (USD)',
    tableThNormal: 'Base earn rate (1 pt / $1)',
    tableThCp: 'Special rate (5 pt / $1)',
    rewardCompareTitle: 'Redemption options shown in Play Points',
    rewardTagCoupon: 'Discount Coupon',
    rewardCouponName: 'Game-Specific Coupon',
    rewardCouponRate: 'Points and discount vary by shown offer',
    rewardCouponDesc: 'Game-specific coupons may appear in Play Points. Use the points cost, discount, minimum purchase, and expiry shown in your Play Points account as the source of truth.',
    rewardTagDirect: 'Direct Item',
    rewardDirectName: 'In-Game Items & Gems',
    rewardDirectRate: 'Contents and points vary by shown offer',
    rewardDirectDesc: 'Eligible in-game items may be available for points. Availability and points cost can vary by country, time, and account, so check the Play Points redemption screen.',
    rewardTagCredit: 'Play Balance',
    rewardCreditName: 'Google Play Credit',
    rewardCreditRate: 'Points and credit amount: check Play Points',
    rewardCreditDesc: 'Google Play Credit may be available as a redemption option. Check the points cost and credit amount shown in Play Points. Play Credit received from points expires after one year.',
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
    ],
    trademarkNotice: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This website is an unofficial community calculator and guide, not affiliated with or endorsed by Google LLC or any game publishers mentioned. All game titles, trademarks, and assets belong to their respective copyright holders.'
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
    navAriaLabel: '주 메뉴',
    breadcrumbAriaLabel: '탐색 경로',
    adLabel: '광고',
    privacyLabel: '개인정보처리방침 (일본어)',
    termsLabel: '이용약관 (일본어)',
    currencySymbol: '원',
    currencyPrefix: '₩',
    currencySuffix: '원',
    pointValuePrefix: '약 ₩',
    pointValueSuffix: ' 상당',
    unitSpend: 1000,
    rateText: '1,000원=1pt',
    verifiedDate: 'Play Points 적립률 확인: 2026년 8월 (게임 가격/천장은 참고값)',
    badgeText: '인기 게임별 포인트 시뮬레이터',
    portalBadge: '🎮 모바일 게임 특화',
    portalH1: '인기 모바일 게임 Google Play Points 과금·천장 계산기',
    portalMeta: '원신, 붕괴: 스타레일, 젠레스 존 제로, 블루 아카이브, 포켓몬 카드 게임 Pocket, 니케, 명조 등 인기 게임의 패키지 과금 시 적립되는 Play Points를 계산하세요.',
    portalLead: 'Google Play 스토어에서 서비스 중인 주요 모바일 게임의 인앱 결제 패키지(창세의 결정, 오래된 꿈, 모노크롬, 청휘석, 포켓골드, 월상, 유료 쥬얼, 용석, 순수한 원석 등) 가격에 대응! 천장 가챠 결제 시 적립 포인트 및 등급 달성을 즉시 시뮬레이션할 수 있습니다.',
    openCalc: '계산기 열기 ➔',
    presetHeading: '▼ 목표 프리셋:',
    approxText: '약 ',
    customAmountLabel: '과금 예정 금액 (원):',
    packSelectLabel: '과금 패키지 선택:',
    packCountLabel: '구매 수량:',
    customOption: '직접 입력 (자유 금액)',
    multiplierLabel: '프로모션 특별 적립률:',
    multiplierOptions: [
      { val: '1', label: '기본 기준: 1,000원당 1pt' },
      { val: '2', label: '특별 적립률: 1,000원당 2pt' },
      { val: '3', label: '특별 적립률: 1,000원당 3pt' },
      { val: '4', label: '특별 적립률: 1,000원당 4pt' },
      { val: '5', label: '특별 적립률: 1,000원당 5pt' },
      { val: '7', label: '특별 적립률: 1,000원당 7pt' }
    ],
    statusLabel: '현재 회원 등급:',
    statusOptions: [
      { val: '1.0', label: '브론즈 (1,000원=1pt)' },
      { val: '1.1', label: '실버 (1,000원=1.1pt)' },
      { val: '1.3', label: '골드 (1,000원=1.3pt)' },
      { val: '1.6', label: '플래티넘 (1,000원=1.6pt)' },
      { val: '2.0', label: '다이아몬드 (1,000원=2pt)' }
    ],
    resTotalLabel: '과금 합계 금액',
    resEarnedLabel: '적립 예정 Play Points',
    resValueLabel: '교환 가치 (Play 화면 확인)',
    resRankLabel: '0pt 기준 참고 등급',
    resProgressTitle: '0pt 기준 참고 진행도',
    shareBtnText: '𝕏 결과 공유하기',
    copyLinkText: '🔗 링크 복사',
    copiedAlert: '결과 링크가 클립보드에 복사되었습니다!',
    disclaimerText: '※포인트 예상치는 현재 대한민국 공식 기본 적립률과 Google Play 반올림 규칙을 기준으로 합니다. 등급 표시는 연간 누적 0pt에서 시작한 참고값이며 현재 연간 진행도는 반영하지 않습니다. 결제 전에 Google Play 화면의 예상 포인트와 등급 진행도를 확인하세요.',
    giftCardCtaTitle: '💳 기프트카드 결제 시 포인트 적립 팁',
    giftCardCtaText: 'Google Play 기프트카드 사용 시 포인트 적립 여부와 조건은 실제 Google Play 결제 화면과 계정 조건을 확인하세요.',
    giftCardCtaBtn: '기프트카드 가이드 확인 ➔',
    giftCardCtaHref: 'ko/articles/google-play-points-gift-cards.html',
    tableTitle: '패키지별 Play Points 적립 비교표',
    tableThPack: '패키지 / 아이템명',
    tableThPrice: '가격 (KRW)',
    tableThNormal: '기본 적립률 (1,000원당 1pt)',
    tableThCp: '특별 적립률 (1,000원당 5pt)',
    rewardCompareTitle: 'Play Points 사용 탭에서 확인할 교환처',
    rewardTagCoupon: '할인 쿠폰',
    rewardCouponName: '게임 전용 할인 쿠폰',
    rewardCouponRate: '필요 포인트와 할인액은 표시된 조건 확인',
    rewardCouponDesc: '대상 게임 할인 쿠폰이 표시될 수 있습니다. 필요한 포인트, 할인액, 최소 결제 금액, 유효기간은 Play Points의 사용 화면에 표시된 조건을 기준으로 확인하세요.',
    rewardTagDirect: '직접 교환',
    rewardDirectName: '게임 내 재화 및 아이템',
    rewardDirectRate: '교환 내용과 필요 포인트는 표시된 오퍼 확인',
    rewardDirectDesc: '대상 게임의 인게임 아이템과 포인트를 교환할 수 있는 경우가 있습니다. 제공 여부와 필요 포인트는 국가, 시기, 계정에 따라 달라질 수 있으므로 Play Points 사용 화면을 확인하세요.',
    rewardTagCredit: 'Play 잔액',
    rewardCreditName: 'Google Play 잔액 충전',
    rewardCreditRate: '필요 포인트와 크레딧 금액은 Play Points에서 확인',
    rewardCreditDesc: 'Google Play 크레딧으로 교환할 수 있는 경우가 있습니다. 필요한 포인트와 금액은 Play Points 사용 화면을 확인하세요. 포인트로 받은 Play 크레딧은 1년 후 만료됩니다.',
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
    ],
    trademarkNotice: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 개인이 운영하는 비공식 계산기 및 정보 사이트이며, Google LLC 및 각 게임 배급사/개발사와 제휴 또는 승인 관계가 없습니다. 언급된 모든 상표와 게임 관련 권리는 해당 권리자에게 귀속됩니다.'
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
    navAriaLabel: '主要導覽',
    breadcrumbAriaLabel: '導覽路徑',
    adLabel: '廣告',
    privacyLabel: '隱私權政策 (日文)',
    termsLabel: '服務條款 (日文)',
    currencySymbol: 'NT$',
    currencyPrefix: 'NT$',
    currencySuffix: ' 元',
    pointValuePrefix: '約 NT$',
    pointValueSuffix: ' 等值',
    unitSpend: 30,
    rateText: 'NT$30=1pt',
    verifiedDate: 'Play Points 獲點率確認：2026年8月（遊戲價格／保底為參考值）',
    badgeText: '熱門手遊點數試算工具',
    portalBadge: '🎮 手遊課金專區',
    portalH1: '熱門手遊 Google Play Points 課金與保底點數計算器',
    portalMeta: '針對原神、崩壞：星穹鐵道、絕區零、蔚藍檔案、寶可夢卡牌、妮姬、鳴潮等熱門遊戲，快速計算課金禮包與保底可獲得的 Play Points。',
    portalLead: '支援 Google Play 商店熱門手機遊戲（創世結晶、古老夢華、菲林底片、青輝石、寶可金塊、月相、付費珠寶、龍石、至純源石等）價格匯率！一鍵計算大保底能拿多少點數回饋、距離白金與鑽石等級還差多少。',
    openCalc: '開啟計算器 ➔',
    presetHeading: '▼ 快速試算目標：',
    approxText: '約 ',
    customAmountLabel: '預計課金總額（新台幣）：',
    packSelectLabel: '選擇課金禮包：',
    packCountLabel: '購買次數：',
    customOption: '自由輸入（自訂金額）',
    multiplierLabel: '活動特別獲點率：',
    multiplierOptions: [
      { val: '1', label: '基本參考：每 NT$30 1點' },
      { val: '2', label: '特別獲點率：每 NT$30 2點' },
      { val: '3', label: '特別獲點率：每 NT$30 3點' },
      { val: '4', label: '特別獲點率：每 NT$30 4點' },
      { val: '5', label: '特別獲點率：每 NT$30 5點' },
      { val: '7', label: '特別獲點率：每 NT$30 7點' }
    ],
    statusLabel: '目前會員等級：',
    statusOptions: [
      { val: '1.0', label: '銅級（NT$30 = 1點）' },
      { val: '1.25', label: '銀級（NT$30 = 1.25點）' },
      { val: '1.5', label: '黃金級（NT$30 = 1.5點）' },
      { val: '1.75', label: '白金級（NT$30 = 1.75點）' },
      { val: '2.0', label: '鑽石級（NT$30 = 2點）' }
    ],
    resTotalLabel: '課金總金額',
    resEarnedLabel: '預計獲得 Play Points',
    resValueLabel: '兌換價值（請以 Play 畫面為準）',
    resRankLabel: '以 0 點起算的參考等級',
    resProgressTitle: '以 0 點起算的參考進度',
    shareBtnText: '𝕏 分享試算結果',
    copyLinkText: '🔗 複製結果連結',
    copiedAlert: '結果連結已成功複製至剪貼簿！',
    disclaimerText: '※點數為依目前台灣官方基本回饋率與 Google Play 四捨五入規則計算的參考值。等級顯示僅以年度累積 0 點起算，不包含你目前的年度進度；付款前請以 Google Play 畫面的預計點數與等級進度為準。',
    giftCardCtaTitle: '💳 禮物卡儲值與點數累積重點',
    giftCardCtaText: '使用 Google Play 禮物卡前，請先確認你的 Play Points 帳戶條件、付款畫面與當期活動規則。',
    giftCardCtaBtn: '查看禮物卡攻略 ➔',
    giftCardCtaHref: 'tw/articles/google-play-points-gift-cards.html',
    tableTitle: '課金禮包 Play Points 回饋速查表',
    tableThPack: '禮包 / 道具名稱',
    tableThPrice: '售價 (TWD)',
    tableThNormal: '基本獲點率（每 NT$30 1點）',
    tableThCp: '特別獲點率（每 NT$30 5點）',
    rewardCompareTitle: '請在 Play Points「使用」頁面確認兌換選項',
    rewardTagCoupon: '折價券',
    rewardCouponName: '遊戲專屬折價券',
    rewardCouponRate: '所需點數與折扣額依顯示優惠為準',
    rewardCouponDesc: 'Play Points 可能會顯示特定遊戲折價券。所需點數、折扣額、最低消費與期限，請以你帳戶「使用」頁面顯示的條件為準。',
    rewardTagDirect: '直接兌換',
    rewardDirectName: '遊戲內道具與內容',
    rewardDirectRate: '內容與所需點數依顯示優惠為準',
    rewardDirectDesc: '部分遊戲可能提供點數兌換遊戲內道具。是否提供與所需點數可能因地區、時間與帳戶而異，請查看 Play Points「使用」頁面。',
    rewardTagCredit: 'Play 餘額',
    rewardCreditName: 'Google Play 餘額',
    rewardCreditRate: '所需點數與額度請以 Play Points 畫面為準',
    rewardCreditDesc: '可兌換 Google Play 餘額時，請以 Play Points「使用」頁面顯示的所需點數與額度為準。使用點數取得的 Play 餘額會在一年後到期。',
    faqHeading: '常見問題（FAQ）',
    otherGamesHeading: '其他熱門遊戲計算器',
    ctaTitle: '目標點數逆算計算器',
    ctaDesc: '想知道還需要多少課金金額才能升級至黃金級或白金級？請使用綜合計算器。',
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
    ],
    trademarkNotice: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為非官方社群營運之計算與攻略站，與 Google LLC 及各遊戲開發/發行商無關。所提及之所有遊戲名稱、商標及版權均歸其各自權利人所有。'
  }
};

// 全14大ゲームデータ（公式固有名詞・正確なストア価格レート対応）
const GAMES_DATA = [
  {
    id: 'genshin',
    icon: '✨',
    names: { ja: '原神 (Genshin Impact)', en: 'Genshin Impact', ko: '원신 (Genshin Impact)', tw: '原神 (Genshin Impact)' },
    shortNames: { ja: '原神', en: 'Genshin', ko: '원신', tw: '原神' },
    descs: {
      ja: '原神の創世結晶購入、空月の祝福、天空紀行、180連確定天井・完凸課金で貯まるGoogle Play Pointsをパッと計算！パック別の還元早見表やお得な使い道も比較できます。ガチャ前の課金計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Genesis Crystals, Blessing of the Welkin Moon, Gnostic Hymn, 180-pull hard pity, and C6 character summons in Genshin Impact!',
      ko: '창세의 결정 패키지, 공월 축복, 진주 기행, 180연차 확천, 풀돌(6돌) 과금 시 적립되는 Play Points와 달성 등급을 시뮬레이션하세요!',
      tw: '試算創世結晶、空月祝福、珍珠紀行、180抽大保底、滿命(6命)課金可獲得的 Play Points 與等級進度！'
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
        { label: '90-pull Soft Pity ($200.00)', amount: 200.0, mult: 1 },
        { label: '180-pull Hard Pity ($400.00)', amount: 400.0, mult: 1 },
        { label: 'C6 Character (~$1,800.00)', amount: 1800.0, mult: 1 }
      ],
      ko: [
        { label: '공월 축복 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확천 (약 ₩540,000)', amount: 540000, mult: 1 },
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
        { q: '原神で確定天井（180連）まで課金すると何ポイント貯まりますか？', a: '180連（約54,000円）課金した場合、通常時（1pt/100円）で約540pt、Google Playに100円あたり4〜7ptの特別獲得率が表示され、その購入が対象なら約2,160pt〜3,780pt貯まります。' }
      ],
      en: [
        { q: 'Do I earn Google Play Points on Genshin Impact purchases?', a: 'Yes! When purchasing Genesis Crystals or passes on Android or Google Play Games PC, you earn at least 1 Play Point per $1 spent.' },
        { q: 'How many points for 180-pull hard pity in Genshin?', a: 'Spending around $400 for 180 pulls yields ~400 points at base rate, or 1,600 to 2,800 points when an eligible special earn rate of 4-7 points per $1 is shown in Google Play.' }
      ],
      ko: [
        { q: '원신 결제 시 Google Play Points가 적립되나요?', a: '네! 안드로이드 기기 또는 Google Play Games PC 버전을 통해 결제하면 1,000원당 1포인트 이상의 Play Points가 적립됩니다.' }
      ],
      tw: [
        { q: '在原神課金可以獲得 Google Play Points 嗎？', a: '可以！透過 Android 手機或 Google Play Games 電腦版進行遊戲內購買，每 NT$30 即可累積 1 點以上的 Play Points。' }
      ]
    }
  },
  {
    id: 'starrail',
    icon: '🚂',
    names: { ja: '崩壊：スターレイル (Honkai: Star Rail)', en: 'Honkai: Star Rail', ko: '붕괴: 스타레일', tw: '崩壞：星穹鐵道' },
    shortNames: { ja: 'スターレイル', en: 'Star Rail', ko: '붕스', tw: '星鐵' },
    descs: {
      ja: '崩壊スターレイルの往日の夢華、列車補給標章、ナナシビトの褒章、180連確定天井・完凸で貯まるPlayポイントを即時計算！パック別還元早見表やポイントの使い道も比較できます。ガチャ前のシミュレーションにぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on Oneiric Shards, Express Supply Pass, Nameless Honor, 180-pull hard pity, and E6 character summons in Honkai: Star Rail!',
      ko: '오래된 꿈, 열차보급허가증, 무명의 공훈, 180연차 확천, 풀돌(6돌) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算古老夢華、列車補給憑證、無名客的榮勳、180抽大保底、滿魂(6魂)課金可獲得的 Play Points！'
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
        { name: '열차보급허가증 (₩5,900)', price: 5900 },
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
        { label: '180-pull Hard Pity ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '열차보급허가증 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확천 (약 ₩540,000)', amount: 540000, mult: 1 }
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
        { q: 'スターレイルの課金でGoogle Playポイントは貯まりますか？', a: 'はい。Android端末またはPC版Google Play Games経由で決済すると、100円あたり1pt以上のPlay Pointsが付与されます。' }
      ],
      en: [
        { q: 'Can I earn Play Points on Honkai: Star Rail?', a: 'Yes! In-app purchases made via Google Play on Android or PC earn Play Points according to your status tier.' }
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
    names: { ja: 'ゼンレスゾーンゼロ (Zenless Zone Zero)', en: 'Zenless Zone Zero', ko: '젠레스 존 제로', tw: '絕區零 (Zenless Zone Zero)' },
    shortNames: { ja: 'ゼンゼロ', en: 'ZZZ', ko: '젠존제', tw: '絕區零' },
    descs: {
      ja: 'ゼンレスゾーンゼロ（ゼンゼロ）のモノクローム購入、インターノット会員、成長プラン、180連天井で貯まるPlayポイントをサクッと計算！パック別還元早見表や使い道もまとめているので、課金前の確認にぜひ使ってみてくださいね。',
      en: 'Calculate Play Points earned on Monochrome bundles, Inter-Knot Membership, New Eridu City Fund, and S-Rank Agent M6 summons in ZZZ!',
      ko: '모노크롬, 로프넷 회원, 뉴에리두 펀드, 180연차 확천, 풀돌(6돌) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算絕區零菲林底片、繩網會員、麗都城募、180抽大保底、滿影(6影)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'インターノット会員 (610円)', price: 610 },
        { name: 'エリドゥファンド 成長プラン (1,220円)', price: 1220 },
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
        { name: '로프넷 회원 (₩5,900)', price: 5900 },
        { name: '뉴에리두 펀드 (₩12,000)', price: 12000 },
        { name: '모노크롬 60개 (₩1,200)', price: 1200 },
        { name: '모노크롬 300+30개 (₩5,900)', price: 5900 },
        { name: '모노크롬 980+110개 (₩19,000)', price: 19000 },
        { name: '모노크롬 1980+260개 (₩37,000)', price: 37000 },
        { name: '모노크롬 3280+600개 (₩65,000)', price: 65000 },
        { name: '모노크롬 6480+1600개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '繩網會員 (NT$170)', price: 170 },
        { name: '麗都城募 成長計畫 (NT$330)', price: 330 },
        { name: '菲林底片 60個 (NT$33)', price: 33 },
        { name: '菲林底片 300+30個 (NT$170)', price: 170 },
        { name: '菲林底片 980+110個 (NT$490)', price: 490 },
        { name: '菲林底片 1980+260個 (NT$990)', price: 990 },
        { name: '菲林底片 3280+600個 (NT$1,690)', price: 1690 },
        { name: '菲林底片 6480+1600個 (NT$3,290)', price: 3290 }
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
        { label: '로프넷 회원 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '90연차 반천장 (약 ₩270,000)', amount: 270000, mult: 1 },
        { label: '180연차 확천 (약 ₩540,000)', amount: 540000, mult: 1 }
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
        { q: 'ゼンゼロの課金でPlayポイントは貯まりますか？', a: 'はい。Android端末またはPC版Google Play Gamesで決済するとPlay Pointsが貯まります。' }
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
    names: { ja: 'ブルーアーカイブ (Blue Archive)', en: 'Blue Archive', ko: '블루 아카이브', tw: '蔚藍檔案 (Blue Archive)' },
    shortNames: { ja: 'ブルアカ', en: 'Blue Archive', ko: '블아', tw: '蔚藍檔案' },
    descs: {
      ja: 'ブルーアーカイブ（ブルアカ）の青輝石購入、マンスリーパッケージ、200連天井・固有武器完凸で貯まるPlayポイントをパッと計算！パック別早見表やポイント使い道も比較できます。生徒募集前の計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on Pyroxenes, Monthly Packages, and 200-pull Sparking recruitment in Blue Archive!',
      ko: '청휘석 패키지, 월간 청휘석 패키지, 200연차 모집 포인트 교환(천장) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算蔚藍檔案青輝石禮包、月卡、200抽招募點數兌換(保底)課金可獲得的 Play Points！'
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
        { name: '月間青輝石禮包 (NT$130)', price: 130 },
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
        { label: '200연차 천장 (약 ₩480,000)', amount: 480000, mult: 1 }
      ],
      tw: [
        { label: '月卡禮包 (NT$130)', amount: 130, mult: 1 },
        { label: '10連抽 (約 NT$790)', amount: 790, mult: 1 },
        { label: '200抽保底 (約 NT$12,000)', amount: 12000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ブルアカの天井（200連=約4.8万円）で何ポイント貯まりますか？', a: '通常時で約480pt、Google Playの5倍キャンペーン時なら約2,400pt（ゴールドランク即時達成）貯まります。' }
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
    names: { ja: 'Pokémon TCG Pocket (ポケポケ)', en: 'Pokémon TCG Pocket', ko: '포켓몬 카드 게임 Pocket', tw: '寶可夢 TCG Pocket' },
    shortNames: { ja: 'ポケポケ', en: 'PTCGP', ko: '포케포케', tw: '寶可夢卡牌' },
    descs: {
      ja: 'ポケポケ（Pokémon TCG Pocket）のポケゴールド購入、プレミアムパス、パック開封で貯まるGoogle Play Pointsを即時計算！パック別還元早見表やポイント使い道も確認できます。課金前のシミュレーションにぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Poké Gold, Premium Pass, and pack openings in Pokémon TCG Pocket!',
      ko: '포켓골드 및 프리미엄 패스 결제 시 적립되는 Google Play Points를 계산하세요!',
      tw: '計算寶可金塊與特級護照課金可獲得的 Google Play Points！'
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
        { name: '포켓골드 5개 (₩1,400)', price: 1400 },
        { name: '포켓골드 15개 (₩4,200)', price: 4200 },
        { name: '포켓골드 31개 (₩8,400)', price: 8400 },
        { name: '포켓골드 105개 (₩28,000)', price: 28000 },
        { name: '포켓골드 215개 (₩56,000)', price: 56000 },
        { name: '포켓골드 550개 (₩139,000)', price: 139000 }
      ],
      tw: [
        { name: '特級護照 (NT$310)', price: 310 },
        { name: '寶可金塊 5個 (NT$33)', price: 33 },
        { name: '寶可金塊 15個 (NT$99)', price: 99 },
        { name: '寶可金塊 31個 (NT$190)', price: 190 },
        { name: '寶可金塊 105個 (NT$630)', price: 630 },
        { name: '寶可金塊 215個 (NT$1,260)', price: 1260 },
        { name: '寶可金塊 550個 (NT$3,190)', price: 3190 }
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
        { label: '포켓골드 550개 (₩139,000)', amount: 139000, mult: 1 }
      ],
      tw: [
        { label: '特級護照 (NT$310)', amount: 310, mult: 1 },
        { label: '寶可金塊 550個 (NT$3,190)', amount: 3190, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ポケポケの課金でGoogle Playポイントは貯まりますか？', a: 'はい。Android端末から購入するとPlay Pointsが貯まります。' }
      ],
      en: [
        { q: 'Do Pokémon TCG Pocket purchases earn Play Points?', a: 'Yes, purchases made through Google Play Store earn Play Points.' }
      ],
      ko: [
        { q: '포켓몬 카드 게임 Pocket 결제 시 포인트가 적립되나요?', a: '네, 구글 플레이 스토어 결제 시 정상 적립됩니다.' }
      ],
      tw: [
        { q: '寶可夢 TCG Pocket 課金能累積點數嗎？', a: '可以，透過 Google Play 商店購買均能累積點數。' }
      ]
    }
  },
  {
    id: 'fgo',
    icon: '⚔️',
    names: { ja: 'Fate/Grand Order (FGO)', en: 'Fate/Grand Order (FGO)', ko: '페이트/그랜드 오더 (FGO)', tw: '命運-冠位指定 (FGO)' },
    shortNames: { ja: 'FGO', en: 'FGO', ko: '페그오', tw: 'FGO' },
    descs: {
      ja: 'Fate/Grand Order（FGO）の聖晶石購入、福袋召喚、確定召喚（330連天井）・宝具5完凸で貯まるPlayポイントをパッと計算！パック別早見表やお得な使い道も比較できます。ガチャ前のポイント確認にぜひ使ってみてくださいね。',
      en: 'Calculate Play Points earned on Saint Quartz, Lucky Bag GSSR summons, 330-summon pity, and NP5 in FGO!',
      ko: '성정석, 복주머니 GSSR, 330연차 확정소환(천장), 보5 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '試算聖晶石禮包、福袋召喚(GSSR)、330抽確定召喚(保底)、寶5課金可獲得的 Play Points！'
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
        { label: 'Lucky Bag GSSR (~$15.00)', amount: 15.0, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '330-pull Pity ($440.00)', amount: 440.0, mult: 1 }
      ],
      ko: [
        { label: '복주머니 GSSR (약 ₩19,000)', amount: 19000, mult: 1 },
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
        { q: 'FGOの確定召喚（天井330連=約5.5万円）で貯まるポイントは？', a: '通常レートで約550pt、5倍キャンペーン時なら約2,750pt貯まります。' }
      ],
      en: [
        { q: 'How many points for 330-pull pity in FGO?', a: 'Spending ~$440 earns ~440 pts normally, or ~2,200 pts during a 5x promotion.' }
      ],
      ko: [
        { q: 'FGO 330연차 확정소환 과금 시 적립되는 포인트는?', a: '기본 적립 약 550pt, 5배 이벤트 시 약 2,750pt가 적립됩니다.' }
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
      ja: 'ウマ娘のジュエル購入、デイリージュエルパック、200連天井・完凸課金で貯まるGoogle Play Pointsを即時シミュレーション！パック別還元早見表やポイント使い道もまとめているので、育成前の課金計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Jewels, Daily Packs, 200-pull spark pity, and MLB Support Cards in Umamusume!',
      ko: '쥬얼, 먼슬리 우마(데일리 쥬얼), 200연차 교환 Pt 천장, 서포트 4돌(풀돌) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算賽馬娘寶石、每日寶石包、200抽兌換Pt保底、支援卡4凸(滿凸)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'デイリージュエルパック (1,000円)', price: 1000 },
        { name: 'ジュエル 60個 (160円)', price: 160 },
        { name: 'ジュエル 210個 (480円)', price: 480 },
        { name: 'ジュエル 350個 (800円)', price: 800 },
        { name: 'ジュエル 700個 (1,500円)', price: 1500 },
        { name: 'ジュエル 1,500個 (3,000円)', price: 3000 },
        { name: 'ジュエル 2,500個 (5,000円)', price: 5000 },
        { name: 'ジュエル 5,000個 (10,000円)', price: 10000 }
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
        { label: 'デイリージュエル (1,000円)', amount: 1000, mult: 1 },
        { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
        { label: '1天井 200連 (60,000円)', amount: 60000, mult: 1 }
      ],
      en: [
        { label: 'Daily Jewel ($7.99)', amount: 7.99, mult: 1 },
        { label: '10-pulls ($24.00)', amount: 24.0, mult: 1 },
        { label: '200-pull Spark ($480.00)', amount: 480.0, mult: 1 }
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
        { q: 'ウマ娘の天井（200連=6万円）で何ポイント貯まりますか？', a: '通常時で約600ポイント、Google Playポイント5倍キャンペーン時なら約3,000ポイント貯まります。' }
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
      ja: 'モンスターストライク（モンスト）のオーブ購入、モンパス、超獣神祭・コラボガチャ課金で貯まるGoogle Play Pointsをサクッと計算！パック別還元早見表やポイント使い道も掲載しています。ガチャ前の確認にぜひ使ってみてくださいね。',
      en: 'Calculate Play Points earned on Orbs, Monpass, Hoshitama summons, and Max Luck units in Monster Strike!',
      ko: '오브 구매, 몬패스, 호시타마, 초수신제, 운극 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '計算寶珠、怪彈會員、星玉、超獸神祭、極運課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'モンパス (480円)', price: 480 },
        { name: 'オーブ 2個 (160円)', price: 160 },
        { name: 'オーブ 6個 (480円)', price: 480 },
        { name: 'オーブ 14個 (1,000円)', price: 1000 },
        { name: 'オーブ 33個 (2,200円)', price: 2200 },
        { name: 'オーブ 60個 (3,800円)', price: 3800 },
        { name: 'オーブ 82個 (4,900円)', price: 4900 },
        { name: 'オーブ 180個 (10,000円)', price: 10000 }
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
        { name: '怪彈會員 (NT$130)', price: 130 },
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
        { label: '怪彈會員 (NT$130)', amount: 130, mult: 1 },
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
    shortNames: { ja: '学マス', en: 'Gakumas', ko: '학마스', tw: '學馬仕' },
    descs: {
      ja: '学園アイドルマスター（学マス）の有償ジュエル、プレミアムミッションパス、200連天井・4凸課金で貯まるPlayポイントをパッと計算！パック別還元早見表やお得な使い道も比較できます。プロデュース前の計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on Jewels, Premium Mission Pass, and 200 Gacha Pts pity in Gakuen Idolmaster!',
      ko: '쥬얼 패키지, 프리미엄 미션 패스, 200 가챠 Pt 천장, 4돌(풀돌) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '試算學園偶像大師寶石、高級任務通行證、200 轉蛋Pt 保底、4凸(滿凸)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'プレミアムミッションパス (1,980円)', price: 1980 },
        { name: 'ジュエル 80個 (120円)', price: 120 },
        { name: 'ジュエル 360個 (480円)', price: 480 },
        { name: 'ジュエル 600個 (800円)', price: 800 },
        { name: 'ジュエル 1,200個 (1,500円)', price: 1500 },
        { name: 'ジュエル 2,500個 (3,000円)', price: 3000 },
        { name: 'ジュエル 4,000個 (4,800円)', price: 4800 },
        { name: 'ジュエル 8,200個 (9,800円)', price: 9800 }
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
        { label: 'プレミアムミッションパス (1,980円)', amount: 1980, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '天井 200連 (約60,000円)', amount: 60000, mult: 1 }
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
        { q: '学マスの天井課金（6万円）でゴールドランクになれますか？', a: 'はい。通常レートで約600pt、CP時なら約1,800pt〜3,000pt貯まり、ゴールド（1,000pt）に到達可能です。' }
      ],
      en: [
        { q: 'Can I reach Gold status with 200-pull pity in Gakumas?', a: 'Yes! Pity spending generates enough points to reach Silver and Gold during promotional periods.' }
      ],
      ko: [
        { q: '학마스 천장 결제로 골드 등급 달성이 가능한가요?', a: '네! 이벤트 결합 시 골드 등급(600pt 이상)에 즉시 도달할 수 있습니다.' }
      ],
      tw: [
        { q: '學馬仕保底能達到黃金級會員嗎？', a: '可以，配合加碼活動可順利達到黃金級（1,000點）門檻。' }
      ]
    }
  },
  {
    id: 'proseka',
    icon: '🎵',
    names: { ja: 'プロジェクトセカイ (プロセカ)', en: 'HATSUNE MIKU: COLORFUL STAGE!', ko: '프로젝트 세카이 컬러풀 스테이지!', tw: '世界計畫 繽紛舞台！' },
    shortNames: { ja: 'プロセカ', en: 'PJSK', ko: '프세카', tw: '世界計畫' },
    descs: {
      ja: 'プロジェクトセカイ（プロセカ）の有償クリスタル、カラフルパス、プレパス、天井ガチャで貯まるGoogle Play Pointsを即時計算！パック別還元早見表や使い道も掲載しています。ガチャ前のポイント確認にぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on Crystals, Colorful Pass, Premium Mission Pass, and 300 Gacha Stickers spark in Project SEKAI!',
      ko: '유료 크리스탈, 컬러풀 패스, 프리미엄 미션 패스, 가챠 스티커 300장 천장, 마스터 랭크 5 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算世界計畫付費水晶、彩色通行證、高階任務通行證、轉蛋貼紙300張保底、大師等級5課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'カラフルパス (480円)', price: 480 },
        { name: 'プレミアムミッションパス (2,000円)', price: 2000 },
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
        { name: '彩色通行證 (NT$130)', price: 130 },
        { name: '高階任務通行證 (NT$490)', price: 490 },
        { name: '水晶 100個 (NT$33)', price: 33 },
        { name: '水晶 2000個 (NT$790)', price: 790 },
        { name: '水晶 7000個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'カラパス+プレパス (2,480円)', amount: 2480, mult: 1 },
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
        { q: 'プロセカの天井（9万円）で何ポイント還元されますか？', a: '通常時で約900pt、Google Playの5倍キャンペーン時なら約4,500pt（プラチナランク到達）還元されます。' }
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
  },
  {
    id: 'nikke',
    icon: '🔫',
    names: { ja: '勝利の女神：NIKKE', en: 'Goddess of Victory: NIKKE', ko: '승리의 여신: 니케', tw: '勝利女神：妮姬' },
    shortNames: { ja: 'ニケ', en: 'NIKKE', ko: '니케', tw: '妮姬' },
    descs: {
      ja: '勝利の女神：NIKKEのジュエル購入、30日補給品、イベントパス、マイレージ200連天井で貯まるPlayポイントをサクッと計算！パック別還元早見表やポイント使い道も比較できます。隊員募集前の課金計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on 30-Day Supply, Mission Pass, 200 Gold Mileage pity, and Max Core summons in NIKKE!',
      ko: '30일 보급품, 미션 패스, 골드 마일리지 200장 천장, 코어 MAX(3돌+7) 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '計算妮姬30天補給品、任務Pass、金色積分券200張保底、核心MAX(3突+7)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: '30-DAY補給品 (800円)', price: 800 },
        { name: 'ミッションパス (3,200円)', price: 3200 },
        { name: 'ジュエル 60個 (160円)', price: 160 },
        { name: 'ジュエル 320個 (800円)', price: 800 },
        { name: 'ジュエル 1020個 (2,400円)', price: 2400 },
        { name: 'ジュエル 1980個 (4,800円)', price: 4800 },
        { name: 'ジュエル 3300個 (8,000円)', price: 8000 },
        { name: 'ジュエル 6200個 (15,800円)', price: 15800 }
      ],
      en: [
        { name: '30-Day Supply ($4.99)', price: 4.99 },
        { name: 'Mission Pass ($19.99)', price: 19.99 },
        { name: '60 Gems ($0.99)', price: 0.99 },
        { name: '320 Gems ($4.99)', price: 4.99 },
        { name: '1020 Gems ($14.99)', price: 14.99 },
        { name: '1980 Gems ($29.99)', price: 29.99 },
        { name: '3300 Gems ($49.99)', price: 49.99 },
        { name: '6200 Gems ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '30일 보급품 (₩7,500)', price: 7500 },
        { name: '미션 패스 (₩30,000)', price: 30000 },
        { name: '쥬얼 60개 (₩1,500)', price: 1500 },
        { name: '쥬얼 320개 (₩7,500)', price: 7500 },
        { name: '쥬얼 1020개 (₩23,000)', price: 23000 },
        { name: '쥬얼 1980개 (₩45,000)', price: 45000 },
        { name: '쥬얼 3300개 (₩75,000)', price: 75000 },
        { name: '쥬얼 6200개 (₩149,000)', price: 149000 }
      ],
      tw: [
        { name: '30天補給品 (NT$170)', price: 170 },
        { name: '任務Pass (NT$670)', price: 670 },
        { name: '珠寶 60個 (NT$33)', price: 33 },
        { name: '珠寶 320個 (NT$170)', price: 170 },
        { name: '珠寶 1020個 (NT$490)', price: 490 },
        { name: '珠寶 1980個 (NT$990)', price: 990 },
        { name: '珠寶 3300個 (NT$1,690)', price: 1690 },
        { name: '珠寶 6200個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '30-DAY補給品 (800円)', amount: 800, mult: 1 },
        { label: 'ミッションパス (3,200円)', amount: 3200, mult: 1 },
        { label: '10連分 (約3,800円)', amount: 3800, mult: 1 },
        { label: '金票天井 200連 (約76,000円)', amount: 76000, mult: 1 },
        { label: '3凸MLB (約200,000円)', amount: 200000, mult: 1 }
      ],
      en: [
        { label: '30-Day Supply ($4.99)', amount: 4.99, mult: 1 },
        { label: 'Mission Pass ($19.99)', amount: 19.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '200 Mileage Spark ($500.00)', amount: 500.0, mult: 1 }
      ],
      ko: [
        { label: '30일 보급품 (₩7,500)', amount: 7500, mult: 1 },
        { label: '미션 패스 (₩30,000)', amount: 30000, mult: 1 },
        { label: '10연차 (약 ₩37,000)', amount: 37000, mult: 1 },
        { label: '골드 마일리지 200연차 (약 ₩745,000)', amount: 745000, mult: 1 }
      ],
      tw: [
        { label: '30天補給品 (NT$170)', amount: 170, mult: 1 },
        { label: '任務Pass (NT$670)', amount: 670, mult: 1 },
        { label: '10連抽 (約 NT$790)', amount: 790, mult: 1 },
        { label: '200張金票保底 (約 NT$16,000)', amount: 16000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'NIKKEのゴールドマイレージ（金票200枚）で何ポイント還元されますか？', a: '200連（約7.6万円）課金した場合、通常時（1pt/100円）で約760pt、特別獲得率5pt/100円時なら約3,800pt貯まります。' },
        { q: '30-DAY補給品やミッションパスもPlayポイントの対象ですか？', a: 'はい。月額補給品やプレミアムパスの購入時にも全額Play Pointsが付与されます。' }
      ],
      en: [
        { q: 'Do NIKKE in-app purchases earn Google Play Points?', a: 'Yes! 30-Day Supply, Mission Pass, and Gem bundles earn Play Points based on your current tier.' }
      ],
      ko: [
        { q: '니케 결제 시 Google Play Points가 적립되나요?', a: '네! 30일 보급품, 미션 패스, 쥬얼 결제 시 1,000원당 1pt 이상이 적립됩니다.' }
      ],
      tw: [
        { q: '在妮姬課金可以獲得 Google Play Points 嗎？', a: '可以！購買30天補給品、任務Pass與珠寶禮包均享有會員點數回饋。' }
      ]
    }
  },
  {
    id: 'wutheringwaves',
    icon: '🌊',
    names: { ja: '鳴潮 (Wuthering Waves)', en: 'Wuthering Waves', ko: '명조: 워더링 웨이브', tw: '鳴潮 (Wuthering Waves)' },
    shortNames: { ja: '鳴潮', en: 'WuWa', ko: '명조', tw: '鳴潮' },
    descs: {
      ja: '鳴潮（Wuthering Waves）の月相購入、月相観測パス、先駆ラジオ、80連/160連天井ガチャで貯まるPlayポイントを即時計算！パック別還元早見表やお得な使い道も比較できます。集音前のポイント確認にぜひ使ってみてくださいね。',
      en: 'Calculate Play Points earned on Lunite, Lunite Subscription, Pioneer Podcast, 160-pull hard pity, and S6 Resonance Chain in Wuthering Waves!',
      ko: '월상 패키지, 월상 관측 카드, 선구 라디오, 160연차 확천, 공명 체인 6단계(풀돌/S6) 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '計算鳴潮月相、月相觀測卡、先驅電台、160抽大保底、共鳴鏈6(滿鏈/S6)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: '月相観測パス (610円)', price: 610 },
        { name: '先駆ラジオ ユニバース (1,220円)', price: 1220 },
        { name: '先駆ラジオ 豪華特約 (2,440円)', price: 2440 },
        { name: '月相 60個 (120円)', price: 120 },
        { name: '月相 300+30個 (610円)', price: 610 },
        { name: '月相 980+110個 (1,220円)', price: 1220 },
        { name: '月相 1980+260個 (3,680円)', price: 3680 },
        { name: '月相 3280+600個 (6,100円)', price: 6100 },
        { name: '月相 6480+1600個 (12,000円)', price: 12000 }
      ],
      en: [
        { name: 'Lunite Subscription ($4.99)', price: 4.99 },
        { name: 'Pioneer Podcast Insider ($9.99)', price: 9.99 },
        { name: 'Pioneer Podcast Connoisseur ($19.99)', price: 19.99 },
        { name: '60 Lunite ($0.99)', price: 0.99 },
        { name: '300+30 Lunite ($4.99)', price: 4.99 },
        { name: '980+110 Lunite ($14.99)', price: 14.99 },
        { name: '1980+260 Lunite ($29.99)', price: 29.99 },
        { name: '3280+600 Lunite ($49.99)', price: 49.99 },
        { name: '6480+1600 Lunite ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '월상 관측 카드 (₩5,900)', price: 5900 },
        { name: '선구 라디오 유니버스 (₩12,000)', price: 12000 },
        { name: '선구 라디오 엑스트라 (₩25,000)', price: 25000 },
        { name: '월상 60개 (₩1,200)', price: 1200 },
        { name: '월상 300+30개 (₩5,900)', price: 5900 },
        { name: '월상 980+110개 (₩19,000)', price: 19000 },
        { name: '월상 1980+260개 (₩37,000)', price: 37000 },
        { name: '월상 3280+600개 (₩65,000)', price: 65000 },
        { name: '월상 6480+1600개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '月相觀測卡 (NT$170)', price: 170 },
        { name: '先驅電台 通行電台 (NT$330)', price: 330 },
        { name: '先驅電台 寰宇特約 (NT$670)', price: 670 },
        { name: '月相 60個 (NT$33)', price: 33 },
        { name: '月相 300+30個 (NT$170)', price: 170 },
        { name: '月相 980+110個 (NT$490)', price: 490 },
        { name: '月相 1980+260個 (NT$990)', price: 990 },
        { name: '月相 3280+600個 (NT$1,690)', price: 1690 },
        { name: '月相 6480+1600個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '月相観測パス (610円)', amount: 610, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '仮天井 80連 (約24,000円)', amount: 24000, mult: 1 },
        { label: '確定天井 160連 (約48,000円)', amount: 48000, mult: 1 },
        { label: '完凸S6 (約200,000円)', amount: 200000, mult: 1 }
      ],
      en: [
        { label: 'Lunite Subscription ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '80-pull Soft Pity ($200.00)', amount: 200.0, mult: 1 },
        { label: '160-pull Hard Pity ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '월상 관측 카드 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '80연차 반천장 (약 ₩240,000)', amount: 240000, mult: 1 },
        { label: '160연차 확천 (약 ₩480,000)', amount: 480000, mult: 1 }
      ],
      tw: [
        { label: '月相觀測卡 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$750)', amount: 750, mult: 1 },
        { label: '80抽小保底 (約 NT$6,000)', amount: 6000, mult: 1 },
        { label: '160抽大保底 (約 NT$12,000)', amount: 12000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: '鳴潮の確定天井（160連）で何ポイント貯まりますか？', a: '160連（約4.8万円）課金した場合、通常時（1pt/100円）で約480pt、特別獲得率5pt/100円時なら約2,400pt（ゴールドランク到達）還元されます。' },
        { q: '武器ガチャ（80連確定）の課金でもポイントは付きますか？', a: 'はい。武器ガチャ用の金髄の波模様購入も全額Play Pointsの対象です。' }
      ],
      en: [
        { q: 'Do Wuthering Waves purchases earn Google Play Points?', a: 'Yes! Lunite packs and subscriptions earn Play Points on Android and Google Play Games PC.' }
      ],
      ko: [
        { q: '명조 결제 시 Google Play Points가 적립되나요?', a: '네! 구글 플레이 스토어 결제 시 1,000원당 1pt 이상이 적립됩니다.' }
      ],
      tw: [
        { q: '在鳴潮課金可以累積 Play Points 嗎？', a: '可以！透過 Google Play 商店購買月相或禮包均享有回饋。' }
      ]
    }
  },
  {
    id: 'dokkan',
    icon: '💥',
    names: { ja: 'ドラゴンボールZ ドッカンバトル', en: 'DRAGON BALL Z DOKKAN BATTLE', ko: '드래곤볼 Z 폭렬격전', tw: '七龍珠爆裂激戰' },
    shortNames: { ja: 'ドッカン', en: 'Dokkan', ko: '폭렬격전', tw: '爆裂激戰' },
    descs: {
      ja: 'ドラゴンボールZ ドッカンバトルの龍石購入、デイリーカプセル、フェスコイン交換・虹凸課金で貯まるPlayポイントをパッと計算！パック別還元早見表や使い道も比較できます。ガシャ前のシミュレーションにぜひ役立ててみてくださいね。',
      en: 'Calculate Play Points earned on Dragon Stones, Daily Capsules, Dokkan Festival Coins, and 100% Rainbow units in Dokkan Battle!',
      ko: '용석 패키지, 데일리 캡슐, 돗칸 축제 코인 교환, 잠재능력 100% 해방(무지개) 과금 시 적립되는 Play Points를 계산하세요!',
      tw: '計算七龍珠爆裂激戰龍石、每日膠囊、Dokkan祭硬幣兌換、潛在能力100%解放(彩星)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: 'デイリーカプセル 30日 (1,200円)', price: 1200 },
        { name: '龍石 1個 (120円)', price: 120 },
        { name: '龍石 6個 (480円)', price: 480 },
        { name: '龍石 12個 (980円)', price: 980 },
        { name: '龍石 30個 (2,000円)', price: 2000 },
        { name: '龍石 60個 (3,800円)', price: 3800 },
        { name: '龍石 91個 (5,400円)', price: 5400 },
        { name: '龍石 セール100個 (4,000円)', price: 4000 }
      ],
      en: [
        { name: 'Daily Capsule 30-Day ($9.99)', price: 9.99 },
        { name: '1 Dragon Stone ($0.99)', price: 0.99 },
        { name: '6 Dragon Stones ($3.99)', price: 3.99 },
        { name: '12 Dragon Stones ($7.99)', price: 7.99 },
        { name: '32 Dragon Stones ($16.99)', price: 16.99 },
        { name: '63 Dragon Stones ($31.99)', price: 31.99 },
        { name: '91 Dragon Stones ($44.99)', price: 44.99 }
      ],
      ko: [
        { name: '데일리 캡슐 30일 (₩12,000)', price: 12000 },
        { name: '용석 1개 (₩1,200)', price: 1200 },
        { name: '용석 6개 (₩4,900)', price: 4900 },
        { name: '용석 12개 (₩9,900)', price: 9900 },
        { name: '용석 32개 (₩21,000)', price: 21000 },
        { name: '용석 63개 (₩39,000)', price: 39000 },
        { name: '용석 91개 (₩55,000)', price: 55000 }
      ],
      tw: [
        { name: '每日膠囊 30天 (NT$330)', price: 330 },
        { name: '龍石 1個 (NT$33)', price: 33 },
        { name: '龍石 6個 (NT$130)', price: 130 },
        { name: '龍石 12個 (NT$270)', price: 270 },
        { name: '龍石 32個 (NT$590)', price: 590 },
        { name: '龍石 63個 (NT$1,090)', price: 1090 },
        { name: '龍石 91個 (NT$1,490)', price: 1490 }
      ]
    },
    presets: {
      ja: [
        { label: 'デイリー龍石 15日 (1,000円)', amount: 1000, mult: 1 },
        { label: '10連分 50個 (約3,000円)', amount: 3000, mult: 1 },
        { label: '周年・Wフェス (50,000円)', amount: 50000, mult: 1 }
      ],
      en: [
        { label: 'Daily Capsule ($9.99)', amount: 9.99, mult: 1 },
        { label: '10-pulls 50 Stones ($25.00)', amount: 25.0, mult: 1 },
        { label: 'Anniversary Banner ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '데일리 캡슐 (₩12,000)', amount: 12000, mult: 1 },
        { label: '10연차 50개 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '주년 대형 이벤트 (₩500,000)', amount: 500000, mult: 1 }
      ],
      tw: [
        { label: '每日膠囊 (NT$330)', amount: 330, mult: 1 },
        { label: '10連抽 50顆 (約 NT$790)', amount: 790, mult: 1 },
        { label: '週年慶大活動 (NT$13,000)', amount: 13000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ドッカンバトルの課金でGoogle Playポイントは貯まりますか？', a: 'はい。龍石パックやデイリーカプセルの購入時にPlay Pointsが付与されます。' }
      ],
      en: [
        { q: 'Do Dokkan Battle purchases earn Play Points?', a: 'Yes! All Dragon Stone packs earn Google Play Points based on your membership tier.' }
      ],
      ko: [
        { q: '폭렬격전 결제 시 포인트가 적립되나요?', a: '네! 용석 및 데일리 캡슐 구매 시 포인트가 정상 적립됩니다.' }
      ],
      tw: [
        { q: '七龍珠爆裂激戰課金可以拿點數嗎？', a: '可以！購買龍石禮包與每日膠囊均可累積 Google Play Points。' }
      ]
    }
  },
  {
    id: 'pad',
    icon: '🐉',
    names: { ja: 'パズル＆ドラゴンズ (Puzzle & Dragons)', en: 'Puzzle & Dragons', ko: '퍼즐앤드래곤 (Puzzle & Dragons)', tw: '龍族拼圖 (Puzzle & Dragons)' },
    shortNames: { ja: 'パズドラ', en: 'PAD', ko: '퍼드', tw: '龍族拼圖' },
    descs: {
      ja: 'パズドラパス（月額980円）や、ゲーム内で現在表示されている購入額からGoogle Play Pointsの獲得目安を計算できます。商品価格は変わる可能性があるため、購入前にゲーム内とGoogle Playの表示を確認してください。',
      en: 'Estimate Google Play Points for Puzzle & Dragons from the PAD Pass and the purchase amount currently shown in the game. Store prices can change, so verify the purchase screen before paying.',
      ko: '퍼즐앤드래곤의 월정액 패스와 게임 내 현재 표시 금액을 기준으로 Google Play Points 적립 예상치를 계산합니다. 상품 가격은 바뀔 수 있으므로 결제 전 화면을 확인하세요.',
      tw: '依龍族拼圖通行證與遊戲內目前顯示的購買金額，試算 Google Play Points。商品價格可能調整，付款前請以遊戲內與 Google Play 畫面為準。'
    },
    packs: {
      ja: [
        { name: 'パズドラパス (月額980円)', price: 980 },
        { name: '購入額を1,000円として試算', price: 1000 },
        { name: '購入額を5,000円として試算', price: 5000 },
        { name: '購入額を10,000円として試算', price: 10000 },
        { name: '購入額を30,000円として試算', price: 30000 }
      ],
      en: [
        { name: 'PAD Pass example ($8.99)', price: 8.99 },
        { name: 'Example spend ($10)', price: 10 },
        { name: 'Example spend ($25)', price: 25 },
        { name: 'Example spend ($50)', price: 50 },
        { name: 'Example spend ($100)', price: 100 }
      ],
      ko: [
        { name: '결제 예시 ₩10,000', price: 10000 },
        { name: '결제 예시 ₩30,000', price: 30000 },
        { name: '결제 예시 ₩50,000', price: 50000 },
        { name: '결제 예시 ₩100,000', price: 100000 }
      ],
      tw: [
        { name: '消費範例 NT$300', price: 300 },
        { name: '消費範例 NT$750', price: 750 },
        { name: '消費範例 NT$1,500', price: 1500 },
        { name: '消費範例 NT$3,000', price: 3000 }
      ]
    },
    presets: {
      ja: [
        { label: 'パズドラパス (980円)', amount: 980, mult: 1 },
        { label: '課金予定 5,000円', amount: 5000, mult: 1 },
        { label: '課金予定 10,000円', amount: 10000, mult: 1 },
        { label: '課金予定 30,000円', amount: 30000, mult: 1 }
      ],
      en: [
        { label: 'Planned spend $10', amount: 10, mult: 1 },
        { label: 'Planned spend $25', amount: 25, mult: 1 },
        { label: 'Planned spend $50', amount: 50, mult: 1 },
        { label: 'Planned spend $100', amount: 100, mult: 1 }
      ],
      ko: [
        { label: '결제 예정 ₩10,000', amount: 10000, mult: 1 },
        { label: '결제 예정 ₩30,000', amount: 30000, mult: 1 },
        { label: '결제 예정 ₩50,000', amount: 50000, mult: 1 },
        { label: '결제 예정 ₩100,000', amount: 100000, mult: 1 }
      ],
      tw: [
        { label: '預計消費 NT$300', amount: 300, mult: 1 },
        { label: '預計消費 NT$750', amount: 750, mult: 1 },
        { label: '預計消費 NT$1,500', amount: 1500, mult: 1 },
        { label: '預計消費 NT$3,000', amount: 3000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'パズドラのGoogle Play課金でPlay Pointsは貯まりますか？', a: 'Google Play Points参加済みのアカウントで、Google Playを通じた対象のゲーム内購入や定期購入を行うとポイントを獲得できます。実際の獲得予定ポイントは購入前のGoogle Play画面で確認してください。' },
        { q: 'パズドラパスはいくらですか？', a: 'パズドラ公式は、パズドラパスを月額980円の自動更新サービスとして案内しています。価格や提供条件が変更される可能性もあるため、購入時のゲーム内表示も確認してください。' }
      ],
      en: [
        { q: 'Do Puzzle & Dragons purchases earn Google Play Points?', a: 'Eligible purchases made through Google Play with an enrolled account can earn Play Points. Check the Google Play purchase screen for the expected points before paying.' }
      ],
      ko: [
        { q: '퍼즐앤드래곤 결제 시 Google Play Points가 적립되나요?', a: 'Google Play Points에 가입한 계정으로 Google Play의 적립 대상 게임 내 결제 또는 정기 결제를 하면 포인트를 받을 수 있습니다. 결제 전 Google Play 화면의 예상 적립 포인트를 확인하세요.' }
      ],
      tw: [
        { q: '龍族拼圖課金可以累積 Google Play Points 嗎？', a: '已加入 Google Play Points 的帳戶，透過 Google Play 進行符合資格的遊戲內購買或訂閱時可以獲得點數。付款前請確認 Google Play 顯示的預計點數。' }
      ]
    }
  },
  {
    id: 'arknights',
    icon: '🛡️',
    names: { ja: 'アークナイツ (Arknights)', en: 'Arknights', ko: '명일방주', tw: '明日方舟 (Arknights)' },
    shortNames: { ja: 'アクナイ', en: 'Arknights', ko: '명방', tw: '明日方舟' },
    descs: {
      ja: 'アークナイツの純正源石購入、月パス、月間スカウトパック、300連天井・潜在MAX課金で貯まるGoogle Play Pointsを即時計算！パック別還元早見表やポイント使い道も確認できます。人材発掘前の計画にぜひ使ってみてくださいね。',
      en: 'Calculate Play Points earned on Originite Prime, Monthly Card, Headhunting Packs, 300-pull spark pity, and Pot 6 in Arknights!',
      ko: '순수한 원석, 월정액, 월간 헤드헌팅 패키지, 한정 300연차 천장, 풀잠(잠재6) 결제 시 적립되는 Play Points를 계산하세요!',
      tw: '計算明日方舟至純源石、月卡、每月尋訪組合包、限定300抽保底、滿潛(潛能6)課金可獲得的 Play Points！'
    },
    packs: {
      ja: [
        { name: '月パス (610円)', price: 610 },
        { name: '月間スカウトパック (2,440円)', price: 2440 },
        { name: '純正源石 1個 (120円)', price: 120 },
        { name: '純正源石 4個 (490円)', price: 490 },
        { name: '純正源石 12個 (1,480円)', price: 1480 },
        { name: '純正源石 24個 (2,940円)', price: 2940 },
        { name: '純正源石 40個 (4,900円)', price: 4900 },
        { name: '純正源石 90個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: 'Monthly Card ($4.99)', price: 4.99 },
        { name: 'Monthly Headhunting Pack ($24.99)', price: 24.99 },
        { name: '1 Originite Prime ($0.99)', price: 0.99 },
        { name: '6 Originite Prime ($4.99)', price: 4.99 },
        { name: '20 Originite Prime ($14.99)', price: 14.99 },
        { name: '40 Originite Prime ($29.99)', price: 29.99 },
        { name: '66 Originite Prime ($49.99)', price: 49.99 },
        { name: '130 Originite Prime ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '월정액 (₩5,900)', price: 5900 },
        { name: '월간 헤드헌팅 패키지 (₩32,000)', price: 32000 },
        { name: '순수한 원석 1개 (₩1,200)', price: 1200 },
        { name: '순수한 원석 6개 (₩5,900)', price: 5900 },
        { name: '순수한 원석 20개 (₩19,000)', price: 19000 },
        { name: '순수한 원석 40개 (₩37,000)', price: 37000 },
        { name: '순수한 원석 66개 (₩65,000)', price: 65000 },
        { name: '순수한 원석 130개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '月卡 (NT$170)', price: 170 },
        { name: '每月尋訪組合包 (NT$830)', price: 830 },
        { name: '至純源石 1個 (NT$33)', price: 33 },
        { name: '至純源石 6個 (NT$170)', price: 170 },
        { name: '至純源石 20個 (NT$490)', price: 490 },
        { name: '至純源石 40個 (NT$990)', price: 990 },
        { name: '至純源石 66個 (NT$1,690)', price: 1690 },
        { name: '至純源石 130個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '月パス (610円)', amount: 610, mult: 1 },
        { label: '月間スカウトパック (2,440円)', amount: 2440, mult: 1 },
        { label: '10連分 (約3,000円)', amount: 3000, mult: 1 },
        { label: '限定フェス天井 300連 (約90,000円)', amount: 90000, mult: 1 }
      ],
      en: [
        { label: 'Monthly Card ($4.99)', amount: 4.99, mult: 1 },
        { label: 'Monthly Headhunting Pack ($24.99)', amount: 24.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '300-pull Limited Spark ($720.00)', amount: 720.0, mult: 1 }
      ],
      ko: [
        { label: '월정액 (₩5,900)', amount: 5900, mult: 1 },
        { label: '월간 헤드헌팅 패키지 (₩32,000)', amount: 32000, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '한정 300연차 천장 (₩890,000)', amount: 890000, mult: 1 }
      ],
      tw: [
        { label: '月卡 (NT$170)', amount: 170, mult: 1 },
        { label: '每月尋訪組合包 (NT$830)', amount: 830, mult: 1 },
        { label: '10連抽 (約 NT$790)', amount: 790, mult: 1 },
        { label: '限定300抽保底 (約 NT$24,000)', amount: 24000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'アークナイツの限定フェス天井（300連）で何ポイント貯まりますか？', a: '300連（約9万円）課金した場合、通常時（1pt/100円）で約900pt、特別獲得率5pt/100円時なら約4,500pt（プラチナランク到達）還元されます。' }
      ],
      en: [
        { q: 'Do Arknights purchases earn Google Play Points?', a: 'Yes! Originite Prime and Headhunting packs earn Play Points based on your current tier.' }
      ],
      ko: [
        { q: '명일방주 결제 시 포인트가 적립되나요?', a: '네! 원석 및 패키지 구매 시 구글 플레이 포인트가 정상 적립됩니다.' }
      ],
      tw: [
        { q: '明日方舟課金可以累積 Play Points 嗎？', a: '可以！購買源石與尋訪禮包皆享有會員點數回饋。' }
      ]
    }
  },
  {
    id: 'hbr',
    icon: '⚔️',
    names: { ja: 'ヘブンバーンズレッド (ヘブバン)', en: 'Heaven Burns Red', ko: '헤븐 번즈 레드 (HBR)', tw: '緋染天空 (Heaven Burns Red)' },
    shortNames: { ja: 'ヘブバン', en: 'HBR', ko: 'HBR', tw: '緋染天空' },
    descs: {
      ja: 'ヘブンバーンズレッド（ヘブバン）のクォーツ購入、ライト/プレミアムパス、200連天井ガチャで貯まるGoogle Play Pointsをパッと計算！パック別還元早見表や使い道も掲載しています。ガチャ前の確認にぜひ使ってみてくださいね。',
      en: 'Calculate Google Play Points earned on Quartz, HBR Pass, and 200-pull Spark pity in Heaven Burns Red.',
      ko: '헤븐 번즈 레드(HBR)의 쿼츠 구매, 패스, 200연차 천장 달성 시 적립되는 Play Points를 계산합니다.',
      tw: '計算緋染天空（Heaven Burns Red）購買石英、月卡通行證與200抽保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: 'クォーツ 120個 (160円)', price: 160 },
        { name: 'クォーツ 420個 (490円)', price: 490 },
        { name: 'クォーツ 850個 (980円)', price: 980 },
        { name: 'クォーツ 1,350個 (1,480円)', price: 1480 },
        { name: 'クォーツ 2,750個 (2,940円)', price: 2940 },
        { name: 'クォーツ 4,750個 (4,900円)', price: 4900 },
        { name: 'クォーツ 10,000個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '120 Quartz ($0.99)', price: 0.99 },
        { name: '420 Quartz ($3.99)', price: 3.99 },
        { name: '850 Quartz ($7.99)', price: 7.99 },
        { name: '2,750 Quartz ($23.99)', price: 23.99 },
        { name: '4,750 Quartz ($39.99)', price: 39.99 },
        { name: '10,000 Quartz ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '쿼츠 120개 (₩1,500)', price: 1500 },
        { name: '쿼츠 420개 (₩4,900)', price: 4900 },
        { name: '쿼츠 850개 (₩9,900)', price: 9900 },
        { name: '쿼츠 2,750개 (₩29,000)', price: 29000 },
        { name: '쿼츠 4,750개 (₩49,000)', price: 49000 },
        { name: '쿼츠 10,000개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '石英 120個 (NT$33)', price: 33 },
        { name: '石英 420個 (NT$130)', price: 130 },
        { name: '石英 850個 (NT$270)', price: 270 },
        { name: '石英 2,750個 (NT$830)', price: 830 },
        { name: '石英 4,750個 (NT$1,390)', price: 1390 },
        { name: '石英 10,000個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'ライトパス (600円)', amount: 600, mult: 1 },
        { label: 'プレミアムパス (2,900円)', amount: 2900, mult: 1 },
        { label: '10連分 3,000個 (約3,000円)', amount: 3000, mult: 1 },
        { label: '天井 200連 60,000個 (約60,000円)', amount: 60000, mult: 1 },
        { label: '完凸目安 (約240,000円)', amount: 240000, mult: 1 }
      ],
      en: [
        { label: 'Light Pass ($4.99)', amount: 4.99, mult: 1 },
        { label: 'Premium Pass ($24.99)', amount: 24.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '200-pull Spark ($480.00)', amount: 480.0, mult: 1 },
        { label: 'Max Limit Break (~$1,900.00)', amount: 1900.0, mult: 1 }
      ],
      ko: [
        { label: '라이트 패스 (₩5,900)', amount: 5900, mult: 1 },
        { label: '프리미엄 패스 (₩29,000)', amount: 29000, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '200연차 천장 (₩590,000)', amount: 590000, mult: 1 },
        { label: '풀돌 기준 (약 ₩2,400,000)', amount: 2400000, mult: 1 }
      ],
      tw: [
        { label: '輕量通行證 (NT$170)', amount: 170, mult: 1 },
        { label: '高級通行證 (NT$790)', amount: 790, mult: 1 },
        { label: '10連抽 (約 NT$800)', amount: 800, mult: 1 },
        { label: '200抽保底 (約 NT$16,000)', amount: 16000, mult: 1 },
        { label: '滿突預估 (約 NT$64,000)', amount: 64000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ヘブバンのクォーツ課金でGoogle Play Pointsは貯まりますか？', a: 'はい！AndroidおよびPC版（Steam除くPlayストア経由）の決済で100円につき1pt以上が貯まります。' }
      ],
      en: [
        { q: 'Do Heaven Burns Red purchases earn Google Play Points?', a: 'Yes! In-app purchases for Quartz earn points based on your account level.' }
      ],
      ko: [
        { q: '헤븐 번즈 레드 결제 시 포인트가 적립되나요?', a: '네! 구글 플레이 스토어 결제 시 정상적으로 적립됩니다.' }
      ],
      tw: [
        { q: '緋染天空課金可以累積 Play Points 嗎？', a: '可以！透過 Google Play 購買石英均可享有會員回饋。' }
      ]
    }
  },
  {
    id: 'mementomori',
    icon: '🎵',
    names: { ja: 'メメントモリ (MementoMori)', en: 'MementoMori: AFKRPG', ko: '메멘토 모리 (MementoMori)', tw: 'MementoMori' },
    shortNames: { ja: 'メメントモリ', en: 'MementoMori', ko: '메멘토모리', tw: 'MementoMori' },
    descs: {
      ja: 'メメントモリ（メメモリ）のダイヤ購入、月間ブースト、ピックアップ100連天井・LR進化で貯まるPlayポイントを即時シミュレーション！パック別還元早見表や使い道も比較できます。ガチャ前の課金計画にぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Diamonds, Monthly Boosts, and 100-pull Pity in MementoMori.',
      ko: '메멘토 모리의 다이아 결제, 월간 부스트 및 100연차 천장 결제 시 적립되는 Play Points를 계산합니다.',
      tw: '計算 MementoMori 購買鑽石、月間特權及100抽保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: 'ダイヤ 80個 (160円)', price: 160 },
        { name: 'ダイヤ 325個 (650円)', price: 650 },
        { name: 'ダイヤ 500個 (1,000円)', price: 1000 },
        { name: 'ダイヤ 750個 (1,500円)', price: 1500 },
        { name: 'ダイヤ 1,500個 (3,000円)', price: 3000 },
        { name: 'ダイヤ 3,000個 (6,000円)', price: 6000 },
        { name: 'ダイヤ 5,900個 (11,800円)', price: 11800 }
      ],
      en: [
        { name: '80 Diamonds ($0.99)', price: 0.99 },
        { name: '325 Diamonds ($4.99)', price: 4.99 },
        { name: '500 Diamonds ($7.99)', price: 7.99 },
        { name: '1,500 Diamonds ($23.99)', price: 23.99 },
        { name: '3,000 Diamonds ($49.99)', price: 49.99 },
        { name: '5,900 Diamonds ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '다이아 80개 (₩1,500)', price: 1500 },
        { name: '다이아 325개 (₩5,900)', price: 5900 },
        { name: '다이아 500개 (₩9,900)', price: 9900 },
        { name: '다이아 1,500개 (₩29,000)', price: 29000 },
        { name: '다이아 3,000개 (₩59,000)', price: 59000 },
        { name: '다이아 5,900개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '鑽石 80個 (NT$33)', price: 33 },
        { name: '鑽石 325個 (NT$170)', price: 170 },
        { name: '鑽石 500個 (NT$270)', price: 270 },
        { name: '鑽石 1,500個 (NT$830)', price: 830 },
        { name: '鑽石 3,000個 (NT$1,690)', price: 1690 },
        { name: '鑽石 5,900個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '月間ブースト (1,000円)', amount: 1000, mult: 1 },
        { label: '10連分 3,000個 (約6,000円)', amount: 6000, mult: 1 },
        { label: 'ピックアップ天井 100連 (約30,000円)', amount: 30000, mult: 1 },
        { label: 'LR進化目安 (約150,000円)', amount: 150000, mult: 1 }
      ],
      en: [
        { label: 'Monthly Boost ($7.99)', amount: 7.99, mult: 1 },
        { label: '10-pulls ($48.00)', amount: 48.0, mult: 1 },
        { label: 'Pickup Pity ($240.00)', amount: 240.0, mult: 1 },
        { label: 'LR Evolution (~$1,200.00)', amount: 1200.0, mult: 1 }
      ],
      ko: [
        { label: '월간 부스트 (₩9,900)', amount: 9900, mult: 1 },
        { label: '10연차 (약 ₩59,000)', amount: 59000, mult: 1 },
        { label: '픽업 천장 (₩290,000)', amount: 290000, mult: 1 },
        { label: 'LR 진화 기준 (약 ₩1,500,000)', amount: 1500000, mult: 1 }
      ],
      tw: [
        { label: '月間特權 (NT$270)', amount: 270, mult: 1 },
        { label: '10連抽 (約 NT$1,600)', amount: 1600, mult: 1 },
        { label: '專屬保底 (約 NT$8,000)', amount: 8000, mult: 1 },
        { label: 'LR進化預估 (約 NT$40,000)', amount: 40000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'メメントモリの課金でPlayポイントは貯まりますか？', a: 'はい！ダイヤ購入やVIPパックなどすべてのアプリ内決済でPlayポイントが獲得できます。' }
      ],
      en: [
        { q: 'Can I earn Google Play Points in MementoMori?', a: 'Yes! All in-app diamond and bundle purchases earn Play Points.' }
      ],
      ko: [
        { q: '메멘토 모리에서 결제하면 포인트가 적립되나요?', a: '네! 모든 다이아 및 패키지 결제 시 정상 적립됩니다.' }
      ],
      tw: [
        { q: 'MementoMori 課金有 Play Points 回饋嗎？', a: '有的！所有鑽石及禮包購買均能累積點數。' }
      ]
    }
  },
  {
    id: 'phantomparade',
    icon: '🌀',
    names: { ja: '呪術廻戦 ファントムパレード (ファンパレ)', en: 'Jujutsu Kaisen Phantom Parade', ko: '주술회전 팬텀 퍼레이드', tw: '咒術迴戰 幻影夜行 (Phantom Parade)' },
    shortNames: { ja: 'ファンパレ', en: 'Phantom Parade', ko: '팬텀퍼레이드', tw: '幻影夜行' },
    descs: {
      ja: '呪術廻戦ファントムパレード（ファンパレ）の有償廻珠、ファンパレパス、250連天井ガチャで貯まるPlayポイントをサクッと計算！パック別還元早見表やポイント使い道も比較できます。ガチャ前のシミュレーションにぜひ使ってみてくださいね。',
      en: 'Calculate Google Play Points earned on Kaishu, Battle Pass, and 250-pull Pity in Jujutsu Kaisen Phantom Parade.',
      ko: '주술회전 팬텀 퍼레이드의 유료 회주, 패스 및 250연차 천장 결제 시 적립되는 Play Points를 계산합니다.',
      tw: '計算咒術迴戰 幻影夜行購買有償迴珠、通行證及250抽保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: 'ファンパレパス (1,000円)', price: 1000 },
        { name: '廻珠 140個 (160円)', price: 160 },
        { name: '廻珠 430個 (480円)', price: 480 },
        { name: '廻珠 930個 (1,000円)', price: 1000 },
        { name: '廻珠 1,430個 (1,500円)', price: 1500 },
        { name: '廻珠 3,000個 (3,000円)', price: 3000 },
        { name: '廻珠 5,000個 (5,000円)', price: 5000 },
        { name: '廻珠 10,000個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '60 Kaishu ($0.99)', price: 0.99 },
        { name: '190 Kaishu ($3.99)', price: 3.99 },
        { name: '400 Kaishu ($7.99)', price: 7.99 },
        { name: '1,220 Kaishu ($23.99)', price: 23.99 },
        { name: '2,050 Kaishu ($39.99)', price: 39.99 },
        { name: '4,150 Kaishu ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '회주 60개 (₩1,500)', price: 1500 },
        { name: '회주 190개 (₩4,900)', price: 4900 },
        { name: '회주 400개 (₩9,900)', price: 9900 },
        { name: '회주 1,220개 (₩29,000)', price: 29000 },
        { name: '회주 2,050개 (₩49,000)', price: 49000 },
        { name: '회주 4,150개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '迴珠 60個 (NT$33)', price: 33 },
        { name: '迴珠 190個 (NT$130)', price: 130 },
        { name: '迴珠 400個 (NT$270)', price: 270 },
        { name: '迴珠 1,220個 (NT$830)', price: 830 },
        { name: '迴珠 2,050個 (NT$1,390)', price: 1390 },
        { name: '迴珠 4,150個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'ファンパレパス (1,000円)', amount: 1000, mult: 1 },
        { label: '10連分 (3,000円)', amount: 3000, mult: 1 },
        { label: '天井 250連 (約75,000円)', amount: 75000, mult: 1 },
        { label: '完凸目安 (約300,000円)', amount: 300000, mult: 1 }
      ],
      en: [
        { label: 'Battle Pass ($7.99)', amount: 7.99, mult: 1 },
        { label: '10-pulls ($25.00)', amount: 25.0, mult: 1 },
        { label: '250-pull Pity ($600.00)', amount: 600.0, mult: 1 },
        { label: 'Max Limit Break (~$2,400.00)', amount: 2400.0, mult: 1 }
      ],
      ko: [
        { label: '팬텀 패스 (₩9,900)', amount: 9900, mult: 1 },
        { label: '10연차 (약 ₩30,000)', amount: 30000, mult: 1 },
        { label: '250연차 천장 (₩740,000)', amount: 740000, mult: 1 },
        { label: '풀돌 기준 (약 ₩3,000,000)', amount: 3000000, mult: 1 }
      ],
      tw: [
        { label: '通行證 (NT$270)', amount: 270, mult: 1 },
        { label: '10連抽 (約 NT$800)', amount: 800, mult: 1 },
        { label: '250抽保底 (約 NT$20,000)', amount: 20000, mult: 1 },
        { label: '滿突預估 (約 NT$80,000)', amount: 80000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'ファンパレの天井（250連）で何ポイント貯まりますか？', a: '約75,000円課金した場合、通常時（1pt/100円）で約750pt、特別獲得率5pt/100円時なら約3,750pt（ゴールドランク即到達）還元されます。' }
      ],
      en: [
        { q: 'How many points for 250-pull pity in Phantom Parade?', a: 'Spending ~$600 earns ~600 pts at base rate, or ~3,000 pts during 5x point events.' }
      ],
      ko: [
        { q: '팬텀 퍼레이드 250연차 천장 시 포인트는 얼마나 적립되나요?', a: '약 74만원 결제 시 기본 740pt, 5배 이벤트 시 약 3,700pt가 적립됩니다.' }
      ],
      tw: [
        { q: '幻影夜行250抽保底可以獲得多少點數？', a: '約課金 NT$20,000 可獲得 666 點，5倍活動時可獲得高達 3,330 點！' }
      ]
    }
  },
  {
    id: 'reverse1999',
    icon: '⏳',
    names: { ja: 'リバース：1999 (Reverse: 1999)', en: 'Reverse: 1999', ko: '리버스: 1999 (Reverse: 1999)', tw: '重返未來：1999 (Reverse: 1999)' },
    shortNames: { ja: 'リバース1999', en: 'Reverse: 1999', ko: '리버스1999', tw: '重返未來1999' },
    descs: {
      ja: 'リバース：1999の純雨の雫パック、咆哮のひと月（月パス）、70連/140連天井ガチャで貯まるGoogle Play Pointsを即時計算！パック別還元早見表や使い道も比較できます。召喚前のポイント確認にぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Clear Drops, Roaring Month, and 70/140-pull Pity in Reverse: 1999.',
      ko: '리버스: 1999의 순수한 빗방울 구매, 포효의 이달(월정액), 70/140연차 천장 결제 시 적립되는 Play Points를計算합니다.',
      tw: '計算重返未來：1999購買獨享雨滴、咆哮之月（月卡）及70/140抽保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: '純雨の雫 60個 (160円)', price: 160 },
        { name: '純雨の雫 300個 (610円)', price: 610 },
        { name: '純雨の雫 900個 (1,800円)', price: 1800 },
        { name: '純雨の雫 1,500個 (3,000円)', price: 3000 },
        { name: '純雨の雫 3,050個 (6,100円)', price: 6100 },
        { name: '純雨の雫 5,000個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '60 Clear Drops ($0.99)', price: 0.99 },
        { name: '300 Clear Drops ($4.99)', price: 4.99 },
        { name: '900 Clear Drops ($14.99)', price: 14.99 },
        { name: '1,500 Clear Drops ($24.99)', price: 24.99 },
        { name: '3,050 Clear Drops ($49.99)', price: 49.99 },
        { name: '5,000 Clear Drops ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '순수한 빗방울 60개 (₩1,500)', price: 1500 },
        { name: '순수한 빗방울 300개 (₩5,900)', price: 5900 },
        { name: '순수한 빗방울 900개 (₩19,000)', price: 19000 },
        { name: '순수한 빗방울 1,500개 (₩29,000)', price: 29000 },
        { name: '순수한 빗방울 3,050개 (₩59,000)', price: 59000 },
        { name: '순수한 빗방울 5,000개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '獨享雨滴 60個 (NT$33)', price: 33 },
        { name: '獨享雨滴 300個 (NT$170)', price: 170 },
        { name: '獨享雨滴 900個 (NT$490)', price: 490 },
        { name: '獨享雨滴 1,500個 (NT$830)', price: 830 },
        { name: '獨享雨滴 3,050個 (NT$1,690)', price: 1690 },
        { name: '獨享雨滴 5,000個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: '咆哮のひと月 (610円)', amount: 610, mult: 1 },
        { label: '10連分 1,800個 (約3,600円)', amount: 3600, mult: 1 },
        { label: '仮天井 70連 (約25,200円)', amount: 25200, mult: 1 },
        { label: '確定天井 140連 (約50,400円)', amount: 50400, mult: 1 }
      ],
      en: [
        { label: 'Roaring Month ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($28.00)', amount: 28.0, mult: 1 },
        { label: '70-pull Soft Pity ($200.00)', amount: 200.0, mult: 1 },
        { label: '140-pull Hard Pity ($400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '포효의 이달 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩35,000)', amount: 35000, mult: 1 },
        { label: '70연차 반천장 (약 ₩245,000)', amount: 245000, mult: 1 },
        { label: '140연차 확천 (약 ₩490,000)', amount: 490000, mult: 1 }
      ],
      tw: [
        { label: '咆哮之月 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$950)', amount: 950, mult: 1 },
        { label: '70抽小保底 (約 NT$6,500)', amount: 6500, mult: 1 },
        { label: '140抽大保底 (約 NT$13,000)', amount: 13000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'リバース：1999の課金でPlayポイントは貯まりますか？', a: 'はい！咆哮のひと月（月パス）や純雨の雫パックの購入ですべてポイントが還元されます。' }
      ],
      en: [
        { q: 'Do Reverse: 1999 purchases earn Play Points?', a: 'Yes! Roaring Month and Clear Drop purchases earn Play Points.' }
      ],
      ko: [
        { q: '리버스: 1999 결제 시 포인트가 적립되나요?', a: '네! 월정액 및 빗방울 결제 시 정상 적립됩니다.' }
      ],
      tw: [
        { q: '重返未來：1999 課金有回饋嗎？', a: '有的！購買咆哮之月及雨滴均享有 Play Points 點數回饋。' }
      ]
    }
  },
  {
    id: 'honkai3rd',
    icon: '🚀',
    names: { ja: '崩壊3rd (Honkai Impact 3rd)', en: 'Honkai Impact 3rd', ko: '붕괴3rd (Honkai Impact 3rd)', tw: '崩壞3rd (Honkai Impact 3rd)' },
    shortNames: { ja: '崩壊3rd', en: 'Honkai 3rd', ko: '붕괴3rd', tw: '崩壞3rd' },
    descs: {
      ja: '崩壊3rdの水晶購入、ギフトコイン、月パス、90連キャラ確定天井で貯まるGoogle Play Pointsをパッと計算！パック別ポイント還元早見表や使い道も一覧で比較できます。補給前の課金シミュレーションにぜひ使ってみてくださいね。',
      en: 'Calculate Google Play Points earned on Crystals, Monthly Cards, and 90-pull Character Pity in Honkai Impact 3rd.',
      ko: '붕괴3rd의 수정 구매, 월정액, 90연차 캐릭터 천장 결제 시 적립되는 Play Points를 계산합니다.',
      tw: '計算崩壞3rd購買水晶、月卡及90抽角色保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: '水晶 70個 (150円)', price: 150 },
        { name: '水晶 350個 (760円)', price: 760 },
        { name: '水晶 720個 (1,500円)', price: 1500 },
        { name: '水晶 1,200個 (2,600円)', price: 2600 },
        { name: '水晶 1,800個 (3,800円)', price: 3800 },
        { name: '水晶 3,000個 (6,200円)', price: 6200 },
        { name: '水晶 6,000個 (12,000円)', price: 12000 }
      ],
      en: [
        { name: '70 Crystals ($0.99)', price: 0.99 },
        { name: '350 Crystals ($4.99)', price: 4.99 },
        { name: '720 Crystals ($9.99)', price: 9.99 },
        { name: '1,200 Crystals ($19.99)', price: 19.99 },
        { name: '3,000 Crystals ($49.99)', price: 49.99 },
        { name: '6,000 Crystals ($99.99)', price: 99.99 }
      ],
      ko: [
        { name: '수정 70개 (₩1,500)', price: 1500 },
        { name: '수정 350개 (₩5,900)', price: 5900 },
        { name: '수정 720개 (₩12,000)', price: 12000 },
        { name: '수정 1,200개 (₩24,000)', price: 24000 },
        { name: '수정 3,000개 (₩59,000)', price: 59000 },
        { name: '수정 6,000개 (₩119,000)', price: 119000 }
      ],
      tw: [
        { name: '水晶 70個 (NT$33)', price: 33 },
        { name: '水晶 350個 (NT$170)', price: 170 },
        { name: '水晶 720個 (NT$330)', price: 330 },
        { name: '水晶 1,200個 (NT$670)', price: 670 },
        { name: '水晶 3,000個 (NT$1,690)', price: 1690 },
        { name: '水晶 6,000個 (NT$3,290)', price: 3290 }
      ]
    },
    presets: {
      ja: [
        { label: '水晶月パス (600円)', amount: 600, mult: 1 },
        { label: '10連分 2,800個 (約5,600円)', amount: 5600, mult: 1 },
        { label: '確定天井 90連 (約50,400円)', amount: 50400, mult: 1 },
        { label: '装備一式目安 (約70,000円)', amount: 70000, mult: 1 }
      ],
      en: [
        { label: 'Monthly Card ($4.99)', amount: 4.99, mult: 1 },
        { label: '10-pulls ($45.00)', amount: 45.0, mult: 1 },
        { label: '90-pull Character Pity ($400.00)', amount: 400.0, mult: 1 },
        { label: 'Full Gear (~$580.00)', amount: 580.0, mult: 1 }
      ],
      ko: [
        { label: '월정액 (₩5,900)', amount: 5900, mult: 1 },
        { label: '10연차 (약 ₩55,000)', amount: 55000, mult: 1 },
        { label: '90연차 확천 (₩490,000)', amount: 490000, mult: 1 },
        { label: '종결 세팅 (약 ₩700,000)', amount: 700000, mult: 1 }
      ],
      tw: [
        { label: '月卡 (NT$170)', amount: 170, mult: 1 },
        { label: '10連抽 (約 NT$1,500)', amount: 1500, mult: 1 },
        { label: '90抽保底 (約 NT$13,000)', amount: 13000, mult: 1 },
        { label: '畢業裝備 (約 NT$18,000)', amount: 18000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: '崩壊3rdでキャラ確定天井（90連）まで課金すると何ポイント？', a: '約50,400円課金した場合、通常時（1pt/100円）で約504pt、特別獲得率5pt/100円時なら約2,520pt（ゴールドランク到達）貯まります。' }
      ],
      en: [
        { q: 'How many points for 90-pull pity in Honkai 3rd?', a: 'Spending ~$400 yields ~400 pts, or ~2,000 pts during 5x promo events.' }
      ],
      ko: [
        { q: '붕괴3rd 90연차 천장 시 적립 포인트는?', a: '약 49만원 결제 시 기본 490pt, 5배 이벤트 시 약 2,450pt가 적립됩니다.' }
      ],
      tw: [
        { q: '崩壞3rd 90抽保底可以獲得多少點數？', a: '約課金 NT$13,000 可獲得 433 點，5倍活動時可獲得 2,165 點。' }
      ]
    }
  },
  {
    id: 'shadowversewb',
    icon: '🃏',
    names: { ja: 'シャドウバース ワールズビヨンド', en: 'Shadowverse: Worlds Beyond', ko: '섀도우버스 월즈 비욘드', tw: '闇影詩章：凌駕世界 (Shadowverse: WB)' },
    shortNames: { ja: 'シャドバWB', en: 'Shadowverse: WB', ko: '섀도우버스 WB', tw: '闇影詩章WB' },
    descs: {
      ja: 'シャドウバース ワールズビヨンド（シャドバWB）のクリスタル購入、プレパス、天井ガチャで貯まるPlayポイントを即時計算！パック別還元早見表や使い道も掲載しています。カードパック購入前の確認にぜひ役立ててみてくださいね。',
      en: 'Calculate Google Play Points earned on Crystals, Premium Battle Pass, and Pack Points in Shadowverse: Worlds Beyond.',
      ko: '섀도우버스 월즈 비욘드의 크리스탈 구매, 프리미엄 패스 및 팩 포인트 결제 시 적립되는 Play Points를 계산합니다.',
      tw: '計算闇影詩章：凌駕世界購買水晶、尊享通行證及卡包點數保底時可獲得的 Google Play Points。'
    },
    packs: {
      ja: [
        { name: 'クリスタル 50個 (160円)', price: 160 },
        { name: 'クリスタル 150個 (480円)', price: 480 },
        { name: 'クリスタル 320個 (1,000円)', price: 1000 },
        { name: 'クリスタル 1,000個 (3,000円)', price: 3000 },
        { name: 'クリスタル 1,750個 (5,000円)', price: 5000 },
        { name: 'クリスタル 3,600個 (10,000円)', price: 10000 }
      ],
      en: [
        { name: '50 Crystals ($0.99)', price: 0.99 },
        { name: '150 Crystals ($3.99)', price: 3.99 },
        { name: '320 Crystals ($7.99)', price: 7.99 },
        { name: '1,000 Crystals ($23.99)', price: 23.99 },
        { name: '1,750 Crystals ($39.99)', price: 39.99 },
        { name: '3,600 Crystals ($79.99)', price: 79.99 }
      ],
      ko: [
        { name: '크리스탈 50개 (₩1,500)', price: 1500 },
        { name: '크리스탈 150개 (₩4,900)', price: 4900 },
        { name: '크리스탈 320개 (₩9,900)', price: 9900 },
        { name: '크리스탈 1,000개 (₩29,000)', price: 29000 },
        { name: '크리스탈 1,750개 (₩49,000)', price: 49000 },
        { name: '크리스탈 3,600개 (₩99,000)', price: 99000 }
      ],
      tw: [
        { name: '水晶 50個 (NT$33)', price: 33 },
        { name: '水晶 150個 (NT$130)', price: 130 },
        { name: '水晶 320個 (NT$270)', price: 270 },
        { name: '水晶 1,000個 (NT$830)', price: 830 },
        { name: '水晶 1,750個 (NT$1,390)', price: 1390 },
        { name: '水晶 3,600個 (NT$2,690)', price: 2690 }
      ]
    },
    presets: {
      ja: [
        { label: 'プレミアムパス (1,200円)', amount: 1200, mult: 1 },
        { label: '10パック分 (2,000円)', amount: 2000, mult: 1 },
        { label: '新弾50パック (10,000円)', amount: 10000, mult: 1 },
        { label: '天井交換目安 (約50,000円)', amount: 50000, mult: 1 }
      ],
      en: [
        { label: 'Battle Pass ($9.99)', amount: 9.99, mult: 1 },
        { label: '10 Packs ($16.00)', amount: 16.0, mult: 1 },
        { label: '50 Packs ($80.00)', amount: 80.0, mult: 1 },
        { label: 'Spark Exchange (~$400.00)', amount: 400.0, mult: 1 }
      ],
      ko: [
        { label: '배틀 패스 (₩12,000)', amount: 12000, mult: 1 },
        { label: '10팩 (₩20,000)', amount: 20000, mult: 1 },
        { label: '신규 50팩 (₩99,000)', amount: 99000, mult: 1 },
        { label: '천장 교환 (약 ₩490,000)', amount: 490000, mult: 1 }
      ],
      tw: [
        { label: '通行證 (NT$330)', amount: 330, mult: 1 },
        { label: '10包卡包 (NT$540)', amount: 540, mult: 1 },
        { label: '新卡包50包 (NT$2,690)', amount: 2690, mult: 1 },
        { label: '保底兌換 (約 NT$13,000)', amount: 13000, mult: 1 }
      ]
    },
    faq: {
      ja: [
        { q: 'シャドバWBの課金でPlayポイントは貯まりますか？', a: 'はい！クリスタル購入やプレミアムバトルパスの購入でPlayポイントが貯まります。' }
      ],
      en: [
        { q: 'Do Shadowverse: WB purchases earn Play Points?', a: 'Yes! Crystal and Battle Pass purchases earn Google Play Points.' }
      ],
      ko: [
        { q: '섀도우버스 WB 결제 시 포인트가 적립되나요?', a: '네! 크리스탈 및 배틀 패스 결제 시 정상 적립됩니다.' }
      ],
      tw: [
        { q: '闇影詩章WB課金可以累積 Play Points 嗎？', a: '可以！購買水晶及尊享通行證均可獲得點數回饋。' }
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
    "operatingSystem": "All",
    "inLanguage": loc.langCode,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": localeKey === 'ja' ? 'JPY' : (localeKey === 'en' ? 'USD' : (localeKey === 'ko' ? 'KRW' : 'TWD'))
    },
    "author": {
      "@type": "Person",
      "name": loc.authorName,
      "url": `https://playpoint-sim.com/author/katakata.html`
    }
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
  <meta name="last-modified" content="${GAME_CONTENT_UPDATED_AT}" />
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
  <nav class="global-nav" aria-label="${loc.navAriaLabel}">
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
      <nav aria-label="${loc.breadcrumbAriaLabel}">
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

                  <!-- シェア・リンクボタン -->
                  <div class="game-share-actions">
                      <button type="button" id="btn-share-x" class="game-share-btn x-btn">
                          <span>${loc.shareBtnText}</span>
                      </button>
                      <button type="button" id="btn-copy-link" class="game-share-btn copy-btn">
                          <span>${loc.copyLinkText}</span>
                      </button>
                  </div>

                  <!-- ギフトカード収益化CTAカード -->
                  <div class="game-giftcard-cta">
                      <div class="game-giftcard-cta-content">
                          <div class="game-giftcard-cta-title">${loc.giftCardCtaTitle}</div>
                          <p class="game-giftcard-cta-text">${loc.giftCardCtaText} <span id="cta-dynamic-savings" class="dynamic-savings-badge" style="display:none;"></span></p>
                      </div>
                      ${localeKey === 'ja' ? `
                      <div class="game-giftcard-cta-actions">
                          <a class="game-giftcard-cta-btn rakuten-primary-btn" href="${loc.giftCardCtaAffiliateUrl}" target="_blank" rel="sponsored noopener noreferrer">${loc.giftCardCtaBtn}</a>
                          <a class="game-giftcard-cta-sublink" href="${assetsRelative}${loc.giftCardCtaHref}">${loc.giftCardGuideBtn}</a>
                      </div>
                      ` : `
                      <a class="game-giftcard-cta-btn" href="${assetsRelative}${loc.giftCardCtaHref}">${loc.giftCardCtaBtn}</a>
                      `}
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

              <!-- 広告枠（レスポンシブ） -->
              <div class="game-ad-container">
                  <span class="game-ad-label">${loc.adLabel}</span>
                  <ins class="adsbygoogle"
                       style="display:block"
                       data-ad-client="ca-pub-3845885843809455"
                       data-ad-slot="8250492620"
                       data-ad-format="auto"
                       data-full-width-responsive="true"></ins>
              </div>
          </section>

          <!-- ポイント使い道・損得比較 -->
          <section class="section">
              <h2>${gameShort} ${loc.rewardCompareTitle}</h2>
              <div class="reward-compare-grid">
                  <div class="reward-compare-card highlight">
                      <div class="reward-compare-tag best">${loc.rewardTagCoupon}</div>
                      <h3>${loc.rewardCouponName}</h3>
                      <div class="reward-rate-val">${loc.rewardCouponRate}</div>
                      <p class="reward-rate-desc">${loc.rewardCouponDesc}</p>
                  </div>
                  <div class="reward-compare-card">
                      <div class="reward-compare-tag">${loc.rewardTagDirect}</div>
                      <h3>${loc.rewardDirectName}</h3>
                      <div class="reward-rate-val">${loc.rewardDirectRate}</div>
                      <p class="reward-rate-desc">${loc.rewardDirectDesc}</p>
                  </div>
                  <div class="reward-compare-card">
                      <div class="reward-compare-tag">${loc.rewardTagCredit}</div>
                      <h3>${loc.rewardCreditName}</h3>
                      <div class="reward-rate-val">${loc.rewardCreditRate}</div>
                      <p class="reward-rate-desc">${loc.rewardCreditDesc}</p>
                  </div>
              </div>
          </section>

          <!-- よくある質問 -->
          <section class="section">
              <h2>${loc.faqHeading}</h2>
              ${faqHtml}
          </section>

          <section class="section game-source-section">
              <h2>${loc.lang === 'ja' ? '出典・確認範囲' : loc.lang === 'ko' ? '출처 및 확인 범위' : loc.lang === 'zh-TW' ? '來源與確認範圍' : 'Sources & verification scope'}</h2>
              <p>${loc.lang === 'ja' ? 'Play Pointsの国別通常獲得率・ランク条件・四捨五入ルールはGoogle Play公式ヘルプを基準に確認しています。ゲーム内パック価格、ガチャ天井、商品構成は変更されるため参考値であり、購入前に各ゲーム内ストアと公式告知で再確認してください。' : loc.lang === 'ko' ? 'Play Points의 국가별 기본 적립률, 등급 조건, 반올림 규칙은 Google Play 공식 도움말을 기준으로 확인합니다. 게임 내 패키지 가격과 천장 조건은 변경될 수 있는 참고값이므로 결제 전 게임 내 상점과 공식 공지를 다시 확인하세요.' : loc.lang === 'zh-TW' ? 'Play Points 的地區基本獲點率、等級條件與四捨五入規則以 Google Play 官方說明為基準。遊戲內商品價格與保底條件可能變更，僅作參考；購買前請在遊戲內商店與官方公告再次確認。' : 'Google Play Points base earn rates, level thresholds, and rounding rules are checked against Google Play Help. In-game pack prices and pity/guarantee values can change and are reference inputs only; verify them in the game store and publisher notices before purchase.'}</p>
              <p><a href="${loc.lang === 'ja' ? 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' : 'https://support.google.com/googleplay/answer/9077192'}" target="_blank" rel="noopener noreferrer">Google Play Points official help</a></p>
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
          <a href="${assetsRelative}privacy.html">${loc.privacyLabel}</a> ｜
          <a href="${assetsRelative}terms.html">${loc.termsLabel}</a> ｜
          <a href="${authorRelative}">${loc.authorTitle}</a>
      </div>
      <p class="site-footer-trademark">${loc.trademarkNotice}</p>
      <p>© 2026 ${loc.siteName} All Rights Reserved.</p>
  </footer>

  <script src="${assetsRelative}js/analytics-core.js"></script>
  <script src="${assetsRelative}js/third-party.js"></script>
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
      </div>
  </header>

  <!-- グローバルナビゲーション -->
  <nav class="global-nav" aria-label="${loc.navAriaLabel}">
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
      <nav aria-label="${loc.breadcrumbAriaLabel}">
          <a href="${rootRelative}">${loc.breadcrumbsHome}</a> <span>&gt;</span>
          <span>${loc.breadcrumbsPortal}</span>
      </nav>
  </div>

  <div class="game-page-container">
      <main class="game-main-content">
          <header class="game-header">
              <span class="game-badge">${loc.portalBadge}</span>
              <h1 class="game-title">${loc.portalH1}</h1>
          </header>

          <div class="games-grid">
              ${cardsHtml}
          </div>

          <div class="game-giftcard-cta game-portal-purchase-check">
              <div class="game-giftcard-cta-content">
                  <div class="game-giftcard-cta-title">${loc.giftCardCtaTitle}</div>
                  <p class="game-giftcard-cta-text">${loc.giftCardCtaText}</p>
              </div>
              ${localeKey === 'ja' ? `
              <div class="game-giftcard-cta-actions">
                  <a class="game-giftcard-cta-btn rakuten-primary-btn" href="${loc.giftCardCtaAffiliateUrl}" target="_blank" rel="sponsored noopener noreferrer">${loc.giftCardCtaBtn}</a>
                  <a class="game-giftcard-cta-sublink" href="${assetsRelative}${loc.giftCardCtaHref}">${loc.giftCardGuideBtn}</a>
              </div>
              ` : `
              <a class="game-giftcard-cta-btn" href="${assetsRelative}${loc.giftCardCtaHref}">${loc.giftCardCtaBtn}</a>
              `}
          </div>

          <p class="game-portal-lead">${loc.portalLead}</p>

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
          <a href="${assetsRelative}privacy.html">${loc.privacyLabel}</a> ｜
          <a href="${assetsRelative}terms.html">${loc.termsLabel}</a> ｜
          <a href="${authorRelative}">${loc.authorTitle}</a>
      </div>
      <p class="site-footer-trademark">${loc.trademarkNotice}</p>
      <p>© 2026 ${loc.siteName} All Rights Reserved.</p>
  </footer>

  <script src="${assetsRelative}js/analytics-core.js"></script>
  <script src="${assetsRelative}js/third-party.js"></script>
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
