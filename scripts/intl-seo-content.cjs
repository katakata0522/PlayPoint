'use strict';

const path = require('path');
const { readManualIntlArticleDates } = require('./manual-intl-articles.cjs');

const projectRoot = path.resolve(__dirname, '..');

const LOCALES = {
  en: {
    lang: 'en',
    home: 'Calculator',
    blog: 'Guides',
    back: 'Back to calculator',
    author: 'Katakata',
    siteName: 'Google Play Points Calculator',
    trademarkNotice: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This independent calculator is not affiliated with or endorsed by Google LLC or the game publishers mentioned on this site.',
    relatedTitle: 'Related guides',
    regionNoteTitle: 'Regional note',
    lastUpdatedLabel: 'Last updated',
    referenceLabel: 'Japanese reference page',
    policyLabel: 'Editorial policy',
    privacyLabel: 'Privacy Policy (Japanese)',
    termsLabel: 'Terms of Service (Japanese)',
    estimateTitle: 'How to read this estimate',
    estimateBody: 'Use the result to match planned purchases with the confirmed earning rate available to your account. Check eligible items and the offer period in Google Play, then recalculate the remaining progress after points are credited.',
    disclaimer: 'This page provides a planning estimate. Google Play Points terms, eligibility, promotions, and timing can differ by country or account, so check the Google Play app before purchasing.',
    officialSourceTitle: 'Official source to check',
    officialSourceBody: 'Play Points availability, levels, rewards, and campaign terms can differ by country or account. Confirm the latest rule in Google Play Help and the Google Play app before purchasing.',
    officialSourceLink: 'Google Play Points official help',
    articles: [
      ['/en/articles/google-play-points-not-showing.html', 'Google Play Points not showing up'],
      ['/en/articles/google-play-points-levels.html', 'Google Play Points levels explained'],
      ['/en/articles/google-play-points-platinum-diamond-cost.html', 'How much to reach Platinum or Diamond'],
      ['/en/articles/google-play-points-gift-cards.html', 'Do gift cards earn Play Points?']
    ]
  },
  ko: {
    lang: 'ko',
    home: '계산기',
    blog: '가이드',
    back: '계산기로 돌아가기',
    author: 'Katakata',
    siteName: 'Google Play Points 계산기',
    trademarkNotice: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 독립적으로 운영되는 비공식 계산기이며 Google LLC 및 언급된 게임의 개발·배급사와 제휴 또는 승인 관계가 없습니다.',
    relatedTitle: '함께 확인할 가이드',
    regionNoteTitle: '국가별 확인',
    lastUpdatedLabel: '업데이트',
    referenceLabel: '일본어 참고 페이지',
    policyLabel: '운영 및 검증 방침',
    privacyLabel: '개인정보처리방침 (일본어)',
    termsLabel: '이용약관 (일본어)',
    estimateTitle: '예상치를 읽는 방법',
    estimateBody: '계산 결과는 예정된 결제를 계정에 확인된 적립률과 맞추는 기준입니다. Google Play 앱에서 대상 상품과 오퍼 기간을 확인하고, 포인트 반영 후 남은 진행도를 다시 계산하세요.',
    disclaimer: '이 페이지는 계획용 예상치입니다. Google Play Points 조건, 대상 결제, 캠페인, 반영 시점은 국가와 계정에 따라 달라질 수 있으므로 결제 전 Google Play 앱에서 확인하세요.',
    officialSourceTitle: '공식 정보 확인',
    officialSourceBody: 'Play Points 제공 여부, 등급, 리워드, 캠페인 조건은 국가나 계정에 따라 달라질 수 있습니다. 결제 전 Google Play 공식 도움말과 앱 화면에서 최신 조건을 확인하세요.',
    officialSourceLink: 'Google Play Points 공식 도움말',
    articles: [
      ['/ko/articles/google-play-points-not-showing.html', 'Play Points가 표시되지 않을 때'],
      ['/ko/articles/google-play-points-levels.html', 'Play Points 등급 구조 이해'],
      ['/ko/articles/google-play-points-gift-cards.html', '기프트카드와 포인트 조건'],
      ['/ko/articles/google-play-points-promotion-not-applied.html', '캠페인 보너스가 적용되지 않을 때']
    ]
  },
  tw: {
    lang: 'zh-TW',
    home: '計算機',
    blog: '指南',
    back: '返回計算機',
    author: 'Katakata',
    siteName: 'Google Play Points 計算器',
    trademarkNotice: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為獨立營運的非官方計算工具，與 Google LLC 及所提及遊戲的開發或發行商無隸屬或認可關係。',
    relatedTitle: '相關指南',
    regionNoteTitle: '地區確認',
    lastUpdatedLabel: '更新日期',
    referenceLabel: '日文參考頁',
    policyLabel: '營運與驗證方針',
    privacyLabel: '隱私權政策 (日文)',
    termsLabel: '服務條款 (日文)',
    estimateTitle: '如何閱讀這個估算',
    estimateBody: '計算結果可用來把原本規劃的購買與帳號確認適用的累積率相配合。請在 Google Play App 確認適用商品與活動期間，點數入帳後再計算剩餘進度。',
    disclaimer: '本頁提供規劃用估算。Google Play Points 的適用付款、活動特別獲點率、回饋時間與條款可能因國家、地區或帳號而不同，購買前請先在 Google Play App 內確認。',
    officialSourceTitle: '官方資訊確認',
    officialSourceBody: 'Play Points 的提供地區、等級、回饋與活動條件可能因國家、地區或帳號不同。購買前請先確認 Google Play 官方說明與 App 內顯示。',
    officialSourceLink: 'Google Play Points 官方說明',
    articles: [
      ['/tw/articles/google-play-points-not-showing.html', 'Play Points 沒有顯示時'],
      ['/tw/articles/google-play-points-levels.html', 'Play Points 等級說明'],
      ['/tw/articles/google-play-points-gift-cards.html', '禮物卡與點數條件'],
      ['/tw/articles/google-play-points-promotion-not-applied.html', '活動加碼沒有套用時']
    ]
  }
};

const PAGE_TYPES = {
  diamond: {
    slug: 'status/diamond',
    mode: 'main',
    query: 'status=1.75&target=diamond&points=3000&multiplier=1',
    campaign: 'intl_status_diamond',
    jaPath: '/status/diamond/',
    en: {
      title: 'Google Play Points Diamond cost calculator',
      description: 'Estimate how much spending may be needed to reach Google Play Points Diamond, with notes for Japan, the US, Korea, and Taiwan.',
      eyebrow: 'Diamond status planning',
      h1: 'How much does it take to reach Google Play Points Diamond?',
      lead: 'Diamond is the top status many Play Points users search for, but the useful question is not only the total spend. You need to check how many points are still missing, whether a promotion applies, and whether your country uses the same earning conditions.',
      cta: 'Calculate Diamond progress',
      secondary: 'Read Diamond value notes',
      secondaryHref: '/articles/2025-12-25-diamond-worth-it.html',
      summary: ['Preset: Platinum to Diamond', 'Best for: users close to the top tier', 'Check: remaining points and promotion rules'],
      sections: [
        ['What to check first', 'Start with the remaining points shown in Google Play. If you enter total lifetime points instead of the missing points, the estimate will be too high.'],
        ['Country differences', 'Promotions, reward availability, and point earning rules can vary. Treat the calculator as a planning tool, then confirm the final rule in your local Google Play app.'],
        ['When to wait', 'If the estimate is far above your usual spending, compare the base rate and the special earn rate shown in Google Play before buying anything only for status.']
      ],
      faq: [
        ['Can this calculator confirm the official Diamond requirement?', 'No. It estimates spending from the values you enter. The official progress shown in Google Play is the source of truth.'],
        ['Should I use a campaign special earn rate?', 'Start with your base rate, then enter the final special earn rate shown for an eligible purchase in Google Play.'],
        ['Is Diamond always worth reaching?', 'Not always. It depends on whether you use the rewards enough to justify the extra spending.']
      ]
    },
    ko: {
      title: 'Google Play Points 다이아몬드 필요 금액 계산',
      description: 'Google Play Points 다이아몬드까지 남은 포인트와 필요 금액을 계산하고, 한국·일본·미국·대만의 캠페인 차이와 공식 확인 포인트를 함께 점검합니다.',
      eyebrow: '다이아몬드 등급 계획',
      h1: 'Google Play Points 다이아몬드는 얼마가 필요할까요?',
      lead: '다이아몬드를 목표로 할 때는 총 결제액보다 남은 포인트, 캠페인 특별 적립률, 국가별 조건을 먼저 확인하는 편이 안전합니다.',
      cta: '다이아몬드까지 계산하기',
      secondary: '영문 등급 가이드 보기',
      secondaryHref: '/en/articles/google-play-points-levels.html',
      summary: ['초기 조건: 플래티넘에서 다이아몬드', '추천: 최고 등급이 가까운 사용자', '확인: 남은 포인트와 캠페인 조건'],
      sections: [
        ['먼저 확인할 것', 'Google Play 앱에 표시된 남은 포인트를 기준으로 입력하세요. 전체 누적 포인트를 넣으면 예상 금액이 어긋날 수 있습니다.'],
        ['국가별 차이', '한국, 일본, 미국, 대만은 프로모션과 리워드 표시가 다를 수 있습니다. 계산 후 앱의 조건을 다시 확인하세요.'],
        ['기다릴지 판단', '평소 결제액보다 필요한 금액이 크다면 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교하고, 불필요한 지출은 피하는 것이 좋습니다.']
      ],
      faq: [
        ['공식 필요 금액을 보장하나요?', '아니요. 입력값을 바탕으로 한 예상치이며, 최종 기준은 Google Play 앱의 진행 상황입니다.'],
        ['캠페인 특별 적립률을 넣어도 되나요?', '대상 결제가 맞을 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요. 먼저 현재 등급의 기본 적립률을 기준으로 보는 것이 안전합니다.'],
        ['다이아몬드는 항상 이득인가요?', '리워드를 실제로 사용할 수 있는지에 따라 달라집니다.']
      ]
    },
    tw: {
      title: 'Google Play Points 鑽石等級需要多少？',
      description: '估算 Google Play Points 鑽石等級所需點數與金額，並確認台灣、日本、美國、韓國的活動差異與官方條件確認重點。',
      eyebrow: '鑽石等級規劃',
      h1: 'Google Play Points 鑽石等級需要多少？',
      lead: '想衝鑽石等級時，先確認還差多少點、是否有活動特別獲點率，以及所在地區的規則是否相同，會比直接估總金額更安全。',
      cta: '計算鑽石等級進度',
      secondary: '查看英文等級指南',
      secondaryHref: '/en/articles/google-play-points-levels.html',
      summary: ['預設: 白金到鑽石', '適合: 接近最高等級的使用者', '確認: 剩餘點數與活動條件'],
      sections: [
        ['先看剩餘點數', '請以 Google Play App 顯示的剩餘點數為準。若輸入累積總點數，估算金額可能會失真。'],
        ['地區差異', '台灣、日本、韓國、美國的活動顯示與回饋條件可能不同。計算後仍要回到 App 確認。'],
        ['是否等待活動', '如果估算金額高於平常消費，請比較目前等級的基本獲點率與 Google Play 顯示的活動特別獲點率，不要為了等級增加不必要支出。']
      ],
      faq: [
        ['這能保證官方鑽石條件嗎？', '不能。這是依輸入值估算，官方進度仍以 Google Play App 顯示為準。'],
        ['可以輸入活動特別獲點率嗎？', '可以，但請輸入 Google Play 顯示的最終特別獲點率，並且只用於實際符合活動資格的消費。'],
        ['鑽石等級一定值得嗎？', '不一定，取決於你是否真的會使用相關回饋。']
      ]
    }
  },
  platinum: {
    slug: 'status/platinum',
    mode: 'main',
    query: 'status=1.2&target=platinum&points=1000&multiplier=1',
    campaign: 'intl_status_platinum',
    jaPath: '/status/platinum/',
    en: {
      title: 'Google Play Points Platinum cost calculator',
      description: 'Estimate how much spending may be needed to reach Google Play Points Platinum, with US, Korea, Taiwan, and Japan region notes.',
      eyebrow: 'Platinum status planning',
      h1: 'How much does it take to reach Google Play Points Platinum?',
      lead: 'Platinum is one of the most common Play Points goals because it can feel close enough to plan around. The useful estimate starts with missing points, then checks status rate, promotion special earn rate, and country-specific eligibility.',
      cta: 'Calculate Platinum progress',
      secondary: 'Compare Diamond status',
      secondaryHref: '/en/status/diamond/',
      summary: ['Preset: Gold to Platinum', 'Best for: users planning the next realistic tier', 'Check: missing points, status rate, and local rules'],
      sections: [
        ['Start from missing points', 'Use the remaining points shown in Google Play, not the total points you have earned so far. This keeps the estimate tied to the next status target.'],
        ['Use your local status rate', 'Google Play Points status benefits and point rates can differ by country or account. For US, Korea, Taiwan, and Japan users, the calculator should be treated as a planning aid until the Google Play app confirms the official progress.'],
        ['Compare normal earning with campaigns', 'Start with your normal tier earn rate, then compare the final special earn rate shown in Google Play only when the purchase is actually eligible. A promotion that does not apply should not change the decision.'],
        ['Check whether Platinum is worth the extra spend', 'If the missing amount is close to a purchase you already planned, Platinum may be a reasonable goal. If it requires new spending only for status, compare the reward value before buying.']
      ],
      faq: [
        ['Is this a US Google Play Points Platinum calculator?', 'It is written for international users, including the US, but it does not replace the official Google Play progress shown in your account.'],
        ['Can I use this for Korea or Taiwan?', 'Yes, as an estimate. Confirm the local status rate, campaign terms, and eligible purchase amount in the Google Play app.'],
        ['Should I wait for a promotion before trying for Platinum?', 'If the purchase can wait and the promotion clearly applies, compare your normal tier earn rate with the final special earn rate shown in Google Play to see whether waiting changes the result.']
      ]
    },
    ko: {
      title: 'Google Play Points 플래티넘 필요 금액 계산',
      description: 'Google Play Points 플래티넘까지 남은 포인트와 필요 금액을 계산하고 한국, 미국, 대만, 일본의 조건 차이를 확인합니다.',
      eyebrow: '플래티넘 등급 계획',
      h1: 'Google Play Points 플래티넘은 얼마가 필요할까요?',
      lead: '플래티넘은 현실적인 목표로 검색되는 경우가 많습니다. 남은 포인트, 현재 등급 적립률, 캠페인 특별 적립률, 국가별 대상 조건을 함께 확인해야 과소비를 피할 수 있습니다.',
      cta: '플래티넘까지 계산하기',
      secondary: '다이아몬드 계산 보기',
      secondaryHref: '/ko/status/diamond/',
      summary: ['초기 조건: 골드에서 플래티넘', '추천: 다음 등급을 계획하는 사용자', '확인: 남은 포인트, 특별 적립률, 지역 조건'],
      sections: [
        ['남은 포인트부터 입력', '누적 포인트가 아니라 Google Play 앱에 표시된 목표까지 남은 포인트를 기준으로 입력하세요.'],
        ['한국 조건을 앱에서 확인', 'Google Play Points 적립률, 혜택, 캠페인은 국가나 계정에 따라 다를 수 있습니다. 계산기는 계획용으로 쓰고 최종 조건은 앱에서 확인하세요.'],
        ['캠페인 특별 적립률 비교', '먼저 현재 등급의 기본 적립률을 기준으로 보고, 실제 대상 결제일 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하는 편이 안전합니다.'],
        ['등급 가치 판단', '예정된 결제와 가까운 금액이면 플래티넘 목표가 의미 있을 수 있지만, 등급만을 위한 추가 결제라면 혜택 가치와 비교해야 합니다.']
      ],
      faq: [
        ['한국 Google Play Points 플래티넘 계산에 쓸 수 있나요?', '예상치로 사용할 수 있습니다. 단, 공식 진행 상황과 대상 조건은 Google Play 앱 기준입니다.'],
        ['미국이나 대만 조건도 같나요?', '국가와 계정에 따라 다를 수 있으므로 같은 숫자를 그대로 적용하지 말고 앱에서 확인하세요.'],
        ['캠페인을 기다리는 것이 좋나요?', '예정된 결제가 있고 캠페인 대상이 확실하다면 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교해 볼 가치가 있습니다.']
      ]
    },
    tw: {
      title: 'Google Play Points 白金等級需要多少？',
      description: '估算 Google Play Points 白金等級所需點數與金額，並確認台灣、美國、韓國、日本的地區差異。',
      eyebrow: '白金等級規劃',
      h1: 'Google Play Points 白金等級需要多少？',
      lead: '白金是許多使用者會先規劃的等級。請先確認還差多少點，再比較目前等級回饋、活動特別獲點率與所在地區的適用條件。',
      cta: '計算白金等級進度',
      secondary: '比較鑽石等級',
      secondaryHref: '/tw/status/diamond/',
      summary: ['預設: 金級到白金', '適合: 規劃下一個等級', '確認: 剩餘點數、特別獲點率、地區條件'],
      sections: [
        ['從剩餘點數開始', '請輸入 Google Play App 顯示的目標剩餘點數，而不是累積總點數。'],
        ['確認台灣適用條件', 'Google Play Points 的回饋率、優惠與活動可能因國家或帳號不同。計算結果應作為規劃參考，最終仍以 App 為準。'],
        ['比較一般與活動特別獲點率', '先以目前等級基本獲點率建立基準，只有在該筆消費確定符合活動時，才輸入 Google Play 顯示的最終特別獲點率進行估算。'],
        ['判斷白金是否值得', '如果金額接近原本計畫的消費，白金可能值得考慮；如果只是為了等級而新增支出，應先比較回饋價值。']
      ],
      faq: [
        ['這能用來估算台灣 Google Play Points 白金嗎？', '可以作為估算，但官方進度與適用條件仍以 Google Play App 顯示為準。'],
        ['美國或韓國也能參考嗎？', '可以參考計算方式，但國家與帳號條件可能不同，請不要直接套用同一數字。'],
        ['應該等活動再衝白金嗎？', '如果原本就有計畫消費，且活動資格明確，比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率會更好判斷。']
      ]
    }
  },
  gold: {
    slug: 'status/gold',
    mode: 'main',
    query: 'status=1.2&target=gold&points=600&multiplier=1',
    campaign: 'intl_status_gold',
    jaPath: '/status/gold/',
    en: {
      title: 'Google Play Points Gold cost calculator',
      description: 'Estimate how much spending may be needed to reach Google Play Points Gold, with country and promotion notes.',
      eyebrow: 'Gold status planning',
      h1: 'How much does it take to reach Google Play Points Gold?',
      lead: 'Gold is often the first status goal that feels reachable. Use the missing points from Google Play, compare normal earning with promotions, and keep local eligibility in view.',
      cta: 'Calculate Gold progress',
      secondary: 'Compare Platinum status',
      secondaryHref: '/en/status/platinum/',
      summary: ['Preset: Silver to Gold', 'Best for: first realistic status goal', 'Check: missing points and local rules'],
      sections: [
        ['Start with the next reachable tier', 'Gold can be a practical target when the missing points are close to spending you already planned. Enter only the points still needed for the next status.'],
        ['Compare before waiting for a campaign', 'Start with your normal tier earn rate, then compare the final special earn rate shown in Google Play only when the purchase is eligible and useful.'],
        ['Use local Google Play conditions', 'Rewards, point rates, and campaign details may differ by country or account, so the Google Play app should decide the final rule.'],
        ['Avoid making Gold a spending excuse', 'If the estimate is far above normal purchases, staying at the current level may be the better decision.']
      ],
      faq: [
        ['Is Gold a good first target?', 'Often, yes. It is easier to evaluate than Platinum or Diamond because the missing amount is usually smaller.'],
        ['Can I use a promotion special earn rate?', 'Yes, but only if the exact purchase qualifies for that promotion.'],
        ['Does this replace the official Google Play progress?', 'No. It is a planning estimate, not an account checker.']
      ]
    },
    ko: {
      title: 'Google Play Points 골드 필요 금액 계산',
      description: 'Google Play Points 골드까지 남은 포인트와 필요 금액을 계산하고, 캠페인 특별 적립률과 국가별 조건을 비교해 무리한 결제 없이 다음 등급을 판단합니다.',
      eyebrow: '골드 등급 계획',
      h1: 'Google Play Points 골드는 얼마가 필요할까요?',
      lead: '골드는 처음으로 현실적인 목표가 되기 쉬운 등급입니다. 남은 포인트와 일반 적립, 캠페인 특별 적립률, 지역 조건을 함께 확인하세요.',
      cta: '골드까지 계산하기',
      secondary: '플래티넘 계산 보기',
      secondaryHref: '/ko/status/platinum/',
      summary: ['초기 조건: 실버에서 골드', '추천: 첫 등급 목표', '확인: 남은 포인트와 지역 조건'],
      sections: [
        ['가까운 목표부터 보기', '골드는 예정된 결제와 가까운 금액일 때 의미가 있습니다. 누적 포인트가 아니라 목표까지 남은 포인트를 입력하세요.'],
        ['캠페인 전후 비교', '먼저 현재 등급의 기본 적립률을 기준으로 보고, 실제 대상 결제일 때만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요.'],
        ['한국 계정 조건 확인', '리워드, 적립률, 캠페인은 국가와 계정에 따라 달라질 수 있으므로 Google Play 앱을 최종 기준으로 보세요.'],
        ['무리한 결제 방지', '평소 소비보다 필요한 금액이 크다면 현재 등급을 유지하는 선택도 합리적입니다.']
      ],
      faq: [
        ['골드는 첫 목표로 괜찮나요?', '대체로 판단하기 좋은 목표입니다. 플래티넘이나 다이아몬드보다 필요한 금액을 현실적으로 비교하기 쉽습니다.'],
        ['캠페인 특별 적립률을 넣어도 되나요?', '해당 결제가 실제 캠페인 대상일 때만 넣어 비교하세요.'],
        ['공식 진행 상황을 대신하나요?', '아니요. 공식 기준은 Google Play 앱의 진행 상황입니다.']
      ]
    },
    tw: {
      title: 'Google Play Points 金級需要多少？',
      description: '估算 Google Play Points 金級所需點數與金額，並用目前等級、剩餘點數與活動特別獲點率比較是否值得升級。',
      eyebrow: '金級規劃',
      h1: 'Google Play Points 金級需要多少？',
      lead: '金級通常是第一個比較容易規劃的目標。請輸入還差多少點，再比較一般回饋、活動特別獲點率與地區條件。',
      cta: '計算金級進度',
      secondary: '比較白金等級',
      secondaryHref: '/tw/status/platinum/',
      summary: ['預設: 銀級到金級', '適合: 第一個實際目標', '確認: 剩餘點數與地區條件'],
      sections: [
        ['先看最近的等級', '金級適合用來判斷下一步是否值得。請輸入目標還差的點數，而不是累積總點數。'],
        ['比較活動前後', '先以目前等級基本獲點率建立基準，只有在消費確定符合活動時，才輸入 Google Play 顯示的最終特別獲點率估算。'],
        ['以所在地區 App 為準', '回饋、活動與資格可能依地區或帳號不同，最終仍要確認 Google Play App。'],
        ['避免為等級硬買', '如果估算金額高於平常消費，維持目前等級可能更合理。']
      ],
      faq: [
        ['金級適合作為第一個目標嗎？', '通常適合，因為比白金或鑽石更容易用平常消費來比較。'],
        ['可以輸入活動特別獲點率嗎？', '可以，但必須是實際符合活動資格的消費。'],
        ['這能取代官方進度嗎？', '不能。官方進度仍以 Google Play App 顯示為準。']
      ]
    }
  },
  silver: {
    slug: 'status/silver',
    mode: 'main',
    query: 'status=1&target=silver&points=150&multiplier=1',
    campaign: 'intl_status_silver',
    jaPath: '/status/silver/',
    en: {
      query: 'status=1&target=silver&points=150&multiplier=1',
      title: 'Google Play Points Silver cost calculator for the US',
      description: 'Estimate the United States Silver threshold of 150 points and compare planned purchases with confirmed earning offers.',
      eyebrow: 'US Silver planning',
      h1: 'How much does it take to reach Google Play Points Silver in the US?',
      lead: 'US Silver starts at 150 annual points. Check the exact missing points, then align planned purchases with the highest eligible earning rate shown on your account.',
      cta: 'Calculate US Silver progress',
      secondary: 'Read the US Silver strategy',
      secondaryHref: '/en/articles/google-play-points-fastest-silver.html',
      summary: ['US threshold: 150 points', 'Bronze base: 1 point per $1', 'Base estimate from zero: $150 before tax'],
      sections: [
        ['Use the US threshold', 'The United States uses 150 annual points for Silver. Do not use the Taiwan 250-point threshold or another country’s currency unit.'],
        ['Enter missing points', 'Use the annual level progress shown in Play Points. Redeemable balance is a separate number.'],
        ['Compare the highest eligible rate', 'Start with 1 point per $1, then compare only an offer that is active and eligible for the planned purchase. Promotions do not stack.'],
        ['Verify item-level results', 'Google calculates from item price excluding tax and rounds each item to the nearest whole point.']
      ],
      faq: [
        ['How many points are needed for US Silver?', '150 annual points.'],
        ['What is the base zero-to-Silver estimate?', 'About $150 before tax at the Bronze base rate.'],
        ['Can I add two promotion rates?', 'No. The highest eligible rate applies.']
      ]
    },
    ko: {
      query: 'status=1&target=silver&points=150&multiplier=1',
      title: '한국 Google Play Points 실버 필요 금액 계산',
      description: '한국 실버 150포인트까지 남은 포인트와 예정 결제를 계산하고 실제 대상 적립 오퍼를 비교합니다.',
      eyebrow: '한국 실버 계획',
      h1: '한국 Google Play Points 실버는 얼마가 필요할까요?',
      lead: '한국 실버는 연간 150포인트부터입니다. 부족한 포인트를 확인하고 예정된 결제를 계정에 표시된 가장 높은 대상 적립률과 맞춰 보세요.',
      cta: '한국 실버까지 계산하기',
      secondary: '한국 실버 달성 전략 보기',
      secondaryHref: '/ko/articles/google-play-points-fastest-silver.html',
      summary: ['한국 기준: 150포인트', '브론즈 기본: ₩1,000당 1포인트', '0포인트 기본 추정: 세금 제외 ₩150,000'],
      sections: [
        ['한국 기준 사용', '대한민국은 실버 기준이 연간 150포인트입니다. 대만 250포인트나 일본의 엔화 예시를 사용하지 마세요.'],
        ['부족한 포인트 입력', 'Play Points 연간 등급 진행도에서 남은 포인트를 입력합니다. 사용 가능한 잔액은 다른 숫자입니다.'],
        ['가장 높은 대상 적립률 비교', '기본 ₩1,000당 1포인트를 본 뒤 실제 활성화되고 대상인 오퍼만 비교합니다. 프로모션은 중복되지 않습니다.'],
        ['상품별 결과 확인', '세금을 제외한 상품 가격을 기준으로 상품별 가장 가까운 정수로 반올림합니다.']
      ],
      faq: [
        ['한국 실버는 몇 포인트인가요?', '연간 150포인트입니다.'],
        ['0포인트에서 기본 추정 금액은?', '브론즈 일반 적립 기준 세금 제외 약 ₩150,000입니다.'],
        ['여러 프로모션을 더해도 되나요?', '아니요. 가장 높은 대상 적립률을 사용합니다.']
      ]
    },
    tw: {
      query: 'status=1&target=silver&points=250&multiplier=1',
      title: '台灣 Google Play Points 銀級需要多少？',
      description: '估算台灣 Google Play Points 銀級所需的 250 點與金額，並依 NT$30 累積單位、帳號特典與活動特別獲點率安排購買計畫。',
      eyebrow: '台灣銀級規劃',
      h1: '台灣 Google Play Points 銀級需要多少？',
      lead: '台灣銀級從年度 250 點開始。先確認還差多少點，再把原本規劃的購買安排到帳號顯示的最高適用累積率。',
      cta: '計算台灣銀級進度',
      secondary: '查看台灣銀級攻略',
      secondaryHref: '/tw/articles/google-play-points-fastest-silver.html',
      summary: ['台灣門檻: 250 點', '銅級基本: 每 NT$30 1 點', '從 0 點基本估算: 未稅 NT$7,500'],
      sections: [
        ['使用台灣門檻', '台灣銀級門檻為年度 250 點。不要使用美國或韓國 150 點門檻。'],
        ['輸入尚缺點數', '請輸入 Play Points 年度等級進度中還差的點數，可使用餘額是另一個數字。'],
        ['比較最高適用累積率', '先看每 NT$30 1 點，再比較已啟用且符合原定購買的優惠。多個促銷不會疊加。'],
        ['確認商品別結果', 'Google 以未稅商品價格計算，每件商品四捨五入到最接近的整數點。']
      ],
      faq: [
        ['台灣銀級需要幾點？', '年度 250 點。'],
        ['從 0 點的基本估算是多少？', '以銅級一般累積率計算，未稅約 NT$7,500。'],
        ['可以把多個活動特別獲點率相乘嗎？', '不可以，套用最高的適用累積率。']
      ]
    }
  },
  campaign2x: {
    slug: 'campaign/2x',
    mode: 'main',
    query: 'status=1.5&target=platinum&points=1000&multiplier=2',
    campaign: 'intl_campaign_2x',
    jaPath: '/campaign/2x/',
    en: {
      title: 'Google Play Points 2x promotion calculator',
      description: 'Compare regular Google Play Points earning with a 2x promotion and estimate the spending needed for status progress.',
      eyebrow: '2x promotion estimate',
      h1: 'How much does a Google Play Points 2x promotion help?',
      lead: 'This legacy “2x” page models a final special earn rate of 2 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 2.',
      cta: 'Calculate with 2 pt / $1',
      secondary: 'Compare 3x promotion',
      secondaryHref: '/en/campaign/3x/',
      summary: ['Preset: special earn rate 2 pt / $1', 'Best for: planned purchases', 'Check: eligible apps, caps, and timing'],
      sections: [
        ['Compare your base rate with 2 pt / $1', 'Use your normal tier earn rate as the baseline, then enter 2 only when Google Play shows a final special earn rate of 2 points per $1 for the eligible purchase.'],
        ['Eligibility matters', 'Promotion labels can hide limits such as selected apps, maximum bonus points, or payment-method restrictions.'],
        ['Avoid forced spending', 'Use campaigns to move planned purchases, not to create new purchases that exceed the value of the reward.']
      ],
      faq: [
        ['Does 2x make the cost exactly half?', 'Not necessarily. A 2-point special earn rate is compared with your tier base rate rather than multiplying that base rate by 2; caps and eligibility also matter.'],
        ['Can gift cards count?', 'They may not count at purchase time in the way users expect. Check the local rule and compare with the gift-card guide.'],
        ['Is 2x enough for Platinum or Diamond?', 'It depends on missing points. Use the calculator result with your current Play Points progress.']
      ]
    },
    ko: {
      title: 'Google Play Points 2배 캠페인 계산',
      description: 'Google Play Points 2배 캠페인에서 필요한 결제 금액을 비교하고, 일반 적립과 캠페인 적용 시 차이를 한국어로 확인합니다.',
      eyebrow: '2배 캠페인 예상',
      h1: 'Google Play Points 2배 캠페인은 얼마나 도움이 될까요?',
      lead: '2배 캠페인은 필요한 금액을 낮출 수 있지만, 대상 결제일 때만 의미가 있습니다. 이 기존 “2배” 페이지는 Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 2pt로 표시될 때 그 값을 사용하며, 등급 기본 적립률에 2를 곱하지 않습니다.',
      cta: '1,000원당 2pt로 계산하기',
      secondary: '3배 캠페인 비교',
      secondaryHref: '/ko/campaign/3x/',
      summary: ['초기 조건: 특별 적립률 1,000원당 2pt', '추천: 예정된 결제가 있는 경우', '확인: 대상 앱, 상한, 반영 시점'],
      sections: [
        ['기본 적립률과 1,000원당 2pt 비교', '현재 등급의 기본 적립률을 기준으로 보고, Google Play에 해당 결제의 최종 특별 적립률이 1,000원당 2pt로 표시될 때만 2를 입력해 비교하세요.'],
        ['대상 조건 확인', '일부 앱, 결제수단, 보너스 상한이 있을 수 있습니다.'],
        ['불필요한 지출 방지', '캠페인은 예정된 결제를 옮기는 데 쓰고, 등급만을 위해 새 지출을 만들지 않는 편이 안전합니다.']
      ],
      faq: [
        ['2배면 금액이 정확히 절반인가요?', '아닙니다. 1,000원당 2pt의 특별 적립률은 현재 등급 기본 적립률과 비교하는 값이며, 기본 적립률에 2를 곱하지 않습니다. 상한과 대상 조건도 확인해야 합니다.'],
        ['기프트카드도 대상인가요?', '사용자가 기대하는 방식과 다를 수 있으므로 지역별 조건을 확인해야 합니다.'],
        ['플래티넘이나 다이아몬드에 충분한가요?', '남은 포인트에 따라 다릅니다. 현재 진행 상황과 함께 보세요.']
      ]
    },
    tw: {
      title: 'Google Play Points 2 倍活動計算',
      description: '使用 Google Play Points 2 倍活動估算所需消費，並和一般 1 倍累積比較，判斷活動是否值得等待。',
      eyebrow: '2 倍活動估算',
      h1: 'Google Play Points 2 倍活動能省多少？',
      lead: '2 倍活動可能降低達成目標所需金額，但前提是該筆消費符合資格。這個保留「2 倍」搜尋名稱的頁面，僅在 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 2 點時使用 2，不會把等級基本獲點率乘以 2。',
      cta: '以每 NT$30 2 點計算',
      secondary: '比較 3 倍活動',
      secondaryHref: '/tw/campaign/3x/',
      summary: ['預設：特別獲點率每 NT$30 2 點', '適合: 已計畫的消費', '確認: 適用 App、上限、回饋時間'],
      sections: [
        ['比較基本獲點率與每 NT$30 2 點', '先以目前等級基本獲點率為基準，只有 Google Play 對該筆消費顯示最終特別獲點率為每 NT$30 2 點時，才輸入 2 進行比較。'],
        ['資格條件很重要', '活動可能限制 App、付款方式或加碼點數上限。'],
        ['避免為活動硬買', '活動適合調整原本就要買的項目，不適合為了等級增加不必要支出。']
      ],
      faq: [
        ['2 倍會讓成本剛好減半嗎？', '不會直接減半。每 NT$30 2 點的特別獲點率是與會員等級基本獲點率比較，不是把基本獲點率乘以 2；上限與適用條件也要確認。'],
        ['禮物卡也算嗎？', '可能與直覺不同，請確認所在地區的規則。'],
        ['2 倍足夠升白金或鑽石嗎？', '取決於剩餘點數，請搭配 Google Play App 的進度查看。']
      ]
    }
  },
  campaign3x: {
    slug: 'campaign/3x',
    mode: 'main',
    query: 'status=1.5&target=platinum&points=1000&multiplier=3',
    campaign: 'intl_campaign_3x',
    jaPath: '/campaign/3x/',
    en: {
      title: 'Google Play Points 3x promotion calculator',
      description: 'Compare regular Google Play Points earning with a 3x promotion and estimate whether waiting changes the required spending.',
      eyebrow: '3x promotion estimate',
      h1: 'How much does a Google Play Points 3x promotion help?',
      lead: 'This legacy “3x” page models a final special earn rate of 3 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 3.',
      cta: 'Calculate with 3 pt / $1',
      secondary: 'Should I wait for a campaign?',
      secondaryHref: '/en/campaign/wait/',
      summary: ['Preset: special earn rate 3 pt / $1', 'Best for: larger planned purchases', 'Check: caps, activation, and eligible apps'],
      sections: [
        ['Use the 3 pt / $1 rate only when it is shown', 'Only enter 3 when Google Play shows a final special earn rate of 3 points per $1 for the purchase. Check the eligible app, item, period, activation, and cap.'],
        ['Compare against your base earn rate', 'Compare the confirmed special earn rate with your normal tier earn rate. Use the higher applicable rate rather than multiplying the two.'],
        ['Watch bonus caps', 'A maximum bonus can make the final result smaller than the headline suggests.'],
        ['Do not chase status with new spending', 'If the purchase exists only because of the campaign, compare the reward value with the extra cost first.']
      ],
      faq: [
        ['Does 3x cut the cost to one third?', 'Not necessarily. A 3-point special rate is compared with your base tier rate; it does not multiply that tier rate. Caps and eligibility can also change the result.'],
        ['Is 3x better than a gift-card discount?', 'They answer different questions. Compare point eligibility and cost savings separately.'],
        ['Should I wait for 3x?', 'Only when the purchase can wait and the offer clearly applies.']
      ]
    },
    ko: {
      title: 'Google Play Points 3배 캠페인 계산',
      description: 'Google Play Points 3배 캠페인 기준으로 필요한 결제 금액을 비교하고, 보너스 조건과 일반 적립 기준의 차이를 한국어로 점검합니다.',
      eyebrow: '3배 캠페인 예상',
      h1: 'Google Play Points 3배 캠페인은 얼마나 도움이 될까요?',
      lead: '이 기존 “3배” 페이지는 Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 3pt로 표시될 때 그 값을 사용합니다. 현재 등급의 기본 적립률에 3을 곱하지 않습니다.',
      cta: '1,000원당 3pt로 계산하기',
      secondary: '캠페인을 기다릴지 보기',
      secondaryHref: '/ko/campaign/wait/',
      summary: ['초기 조건: 특별 적립률 1,000원당 3pt', '추천: 큰 예정 결제', '확인: 상한, 활성화, 대상 앱'],
      sections: [
        ['실제 대상일 때만 사용', 'Google Play에 해당 결제의 최종 특별 적립률이 1,000원당 3pt로 표시될 때만 3을 입력하세요. 대상 앱, 상품, 기간, 활성화, 상한을 함께 확인해야 합니다.'],
        ['기본 적립률과 비교', '확인된 특별 적립률과 현재 등급의 기본 적립률을 비교해 더 높은 적용률을 사용하며, 두 값을 곱하지 않습니다.'],
        ['보너스 상한 확인', '상한이 있으면 문구보다 실제 결과가 작을 수 있습니다.'],
        ['등급만을 위한 새 지출 피하기', '캠페인 때문에 생긴 지출이라면 혜택 가치와 추가 비용을 먼저 비교하세요.']
      ],
      faq: [
        ['3배면 비용이 3분의 1인가요?', '항상 그렇지는 않습니다. 1,000원당 3pt의 특별 적립률은 등급 기본 적립률과 비교하는 값이며, 기본 적립률에 3을 곱하지 않습니다. 상한과 대상 조건도 확인해야 합니다.'],
        ['기프트카드 할인보다 낫나요?', '포인트 대상 여부와 비용 절감은 별도 문제로 비교해야 합니다.'],
        ['3배 캠페인을 기다려야 하나요?', '결제를 기다릴 수 있고 조건이 확실할 때만 고려하세요.']
      ]
    },
    tw: {
      title: 'Google Play Points 3 倍活動計算',
      description: '使用 Google Play Points 3 倍活動估算所需消費，並檢查活動條件、剩餘點數與一般累積時的差異。',
      eyebrow: '3 倍活動估算',
      h1: 'Google Play Points 3 倍活動能省多少？',
      lead: '這個保留「3 倍」搜尋名稱的頁面，僅在 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 3 點時使用 3；不會把會員等級的基本獲點率再乘以 3。',
      cta: '以每 NT$30 3 點計算',
      secondary: '判斷是否等待活動',
      secondaryHref: '/tw/campaign/wait/',
      summary: ['預設：特別獲點率每 NT$30 3 點', '適合: 較大的計畫消費', '確認: 上限、啟用、適用 App'],
      sections: [
        ['只有符合資格才使用', '只有 Google Play 對該筆消費顯示最終特別獲點率為每 NT$30 3 點時才輸入 3，並確認適用 App、商品、期間、啟用方式與上限。'],
        ['與基本獲點率比較', '請比較已確認的活動特別獲點率與會員等級基本獲點率，採用實際適用的較高者，不要把兩者相乘。'],
        ['注意加碼上限', '若有上限，實際結果可能低於標題直覺。'],
        ['不要為等級新增消費', '如果這筆消費只是為了活動產生，請先比較回饋價值與額外成本。']
      ],
      faq: [
        ['3 倍會讓成本變成三分之一嗎？', '不一定。每 NT$30 3 點的特別獲點率要與等級基本獲點率比較，不是把基本獲點率乘以 3；上限與資格也會影響結果。'],
        ['比禮物卡折扣更好嗎？', '點數資格與成本折扣要分開比較。'],
        ['應該等 3 倍活動嗎？', '只有在原本消費可以等待且資格明確時才值得考慮。']
      ]
    }
  },
  campaignWait: {
    slug: 'campaign/wait',
    mode: 'main',
    query: 'status=1.5&target=platinum&points=1000&multiplier=2',
    campaign: 'intl_campaign_wait',
    jaPath: '/campaign/wait/',
    en: {
      title: 'Should you wait for a Google Play Points promotion?',
      description: 'Compare your normal tier earn rate with the final special earn rate shown by an eligible Google Play promotion to decide whether waiting is worth it.',
      eyebrow: 'Promotion wait decision',
      h1: 'Should you wait for a Google Play Points promotion?',
      lead: 'Waiting can help when a purchase is planned and the promotion applies. It can also create unnecessary spending if the target is only attractive under uncertain conditions.',
      cta: 'Compare promotion timing',
      secondary: 'Calculate with 3 pt / $1',
      secondaryHref: '/en/campaign/3x/',
      summary: ['Preset: compare promotion timing', 'Best for: planned purchases', 'Check: base rate, special earn rate, and eligibility'],
      sections: [
        ['Start with your normal tier earn rate', 'If the target is already reasonable at your normal tier earn rate, a promotion is a timing bonus rather than a requirement.'],
        ['Use a special earn rate only for eligible purchases', 'Enter only the final special earn rate shown in Google Play when the offer clearly applies to the planned purchase.'],
        ['Waiting is useful when the purchase can move', 'If you already planned to buy soon and the campaign window is clear, waiting can improve the result without increasing spending.'],
        ['Do not wait forever for a vague offer', 'If the campaign is uncertain or the purchase is not needed, waiting can turn into a spending trap.']
      ],
      faq: [
        ['When is waiting worth it?', 'When the purchase is already planned, can wait, and the campaign terms clearly apply.'],
        ['Should I buy more during a promotion?', 'Not unless the purchase itself has value outside the status goal.'],
        ['What should I compare first?', 'Use the same missing-point target and compare your normal tier earn rate with the final special earn rate shown in Google Play.']
      ]
    },
    ko: {
      title: 'Google Play Points 캠페인을 기다려야 할까요?',
      description: 'Google Play Points 캠페인을 기다릴지 지금 결제할지, 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률, 남은 포인트를 기준으로 한국어로 비교합니다.',
      eyebrow: '캠페인 대기 판단',
      h1: 'Google Play Points 캠페인을 기다려야 할까요?',
      lead: '예정된 결제가 있고 캠페인 대상이 확실하다면 기다리는 것이 도움이 될 수 있습니다. 하지만 불확실한 조건 때문에 새 지출을 만들면 위험합니다.',
      cta: '캠페인 시점 비교',
      secondary: '3배 계산 보기',
      secondaryHref: '/ko/campaign/3x/',
      summary: ['초기 조건: 캠페인 대기 비교', '추천: 예정된 결제', '확인: 기본 적립률, 최종 특별 적립률, 대상 조건'],
      sections: [
        ['현재 등급 기본 적립률부터 보기', '현재 등급의 기본 적립률에서도 목표가 현실적이라면 캠페인은 필수가 아니라 시점 조정입니다.'],
        ['대상 결제일 때만 특별 적립률 사용', '캠페인 조건이 명확한 예정 결제에만 Google Play에 표시된 최종 특별 적립률을 입력해 비교하세요.'],
        ['결제를 미룰 수 있을 때 유용', '원래 살 예정이고 기간이 분명하다면 기다리는 것이 지출을 늘리지 않고 결과를 개선할 수 있습니다.'],
        ['막연한 캠페인을 기다리지 않기', '조건이 불확실하거나 필요 없는 구매라면 기다림 자체가 과소비의 시작이 될 수 있습니다.']
      ],
      faq: [
        ['언제 기다릴 가치가 있나요?', '원래 예정된 결제가 있고, 기다릴 수 있으며, 캠페인 조건이 확실할 때입니다.'],
        ['캠페인 때 더 사도 되나요?', '등급 외에도 그 구매 자체의 가치가 있을 때만 고려하세요.'],
        ['무엇부터 비교하나요?', '같은 부족 포인트로 현재 등급의 기본 적립률과 Google Play에 표시된 최종 특별 적립률을 비교하세요.']
      ]
    },
    tw: {
      title: 'Google Play Points 活動值得等嗎？',
      description: '比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率，判斷等待 Google Play Points 活動是否值得。',
      eyebrow: '活動等待判斷',
      h1: 'Google Play Points 活動值得等嗎？',
      lead: '如果原本就有計畫消費，且活動資格明確，等待可能有幫助。但若只因不確定活動而新增消費，就需要保守。',
      cta: '比較活動時機',
      secondary: '以每 NT$30 3 點計算',
      secondaryHref: '/tw/campaign/3x/',
      summary: ['預設: 活動等待比較', '適合: 已計畫的消費', '確認：基本獲點率、特別獲點率與資格'],
      sections: [
        ['先看目前等級基本獲點率', '如果以目前等級基本獲點率估算時目標已經合理，活動只是時機優化，不是必要條件。'],
        ['只有符合資格才輸入特別獲點率', '只有在該筆計畫消費明確符合活動時，才輸入 Google Play 顯示的最終特別獲點率比較。'],
        ['能移動購買時間時才有用', '如果本來就要買且活動期間明確，等待可以在不增加支出的情況下改善結果。'],
        ['不要無限等待模糊活動', '若活動不確定或購買本身不需要，等待可能變成過度消費的入口。']
      ],
      faq: [
        ['什麼時候值得等？', '原本有計畫消費、可以等待，且活動條件明確時。'],
        ['活動期間應該多買嗎？', '只有該購買本身有價值，而不是單純為了等級時才考慮。'],
        ['先比較什麼？', '用同一個剩餘點數目標，比較目前等級基本獲點率與 Google Play 顯示的最終特別獲點率。']
      ]
    }
  },
  amount10000: {
    slug: 'amount/10000',
    mode: 'reverse',
    query: 'status=1&amount=10000&multiplier=1',
    campaign: 'intl_amount_10000',
    jaPath: '/amount/10000/',
    en: {
      title: 'How many Google Play Points for 10,000 yen?',
      description: 'Estimate how many Google Play Points you may earn from a 10,000 yen purchase, with status and promotion special earn rate notes.',
      eyebrow: '10,000 yen reverse estimate',
      h1: 'How many Google Play Points do you get for 10,000 yen?',
      lead: 'A fixed amount like 10,000 yen is useful for planning, but the points earned depend on status, campaign special earn rates, and whether the purchase is eligible in your country.',
      cta: 'Calculate points for 10,000 yen',
      secondary: 'Read gift-card notes',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['Preset: reverse mode', 'Best for: spend-to-points planning', 'Check: status, special earn rate, eligible amount'],
      sections: [
        ['Use reverse mode', 'This page opens the calculator with amount-based input. Change the status and special earn rate to match your account.'],
        ['Currency and region', 'The Japanese page uses yen. Overseas users can still compare the point logic, but local currency, tax, and eligibility may differ.'],
        ['Next step', 'After checking points from 10,000 yen, compare the result with the missing points for Platinum or Diamond.']
      ],
      faq: [
        ['Is 10,000 yen before or after tax?', 'Use the amount that Google Play treats as eligible for Play Points. This can differ by region and purchase type.'],
        ['Can I use this for US dollars?', 'Use it as a pattern reference. A dedicated local-currency calculator would need region-specific assumptions.'],
        ['Do gift cards earn points?', 'The answer can depend on whether points are awarded on purchase or redemption, so check the local rule.']
      ]
    },
    ko: {
      title: '10,000엔 결제로 Google Play Points는 몇 포인트?',
      description: '10,000엔 결제 시 Google Play Points 예상치를 계산하고, 현재 등급과 캠페인 특별 적립률에 따라 받을 수 있는 포인트를 한국어로 비교합니다.',
      eyebrow: '10,000엔 역산',
      h1: '10,000엔 결제하면 Google Play Points는 몇 포인트일까요?',
      lead: '고정 금액은 계획에 편리하지만, 실제 포인트는 등급, 캠페인 특별 적립률, 국가별 대상 결제 조건에 따라 달라집니다.',
      cta: '10,000엔 포인트 계산',
      secondary: '영문 기프트카드 가이드',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['초기 조건: 역산 모드', '추천: 금액에서 포인트를 보고 싶은 경우', '확인: 등급, 특별 적립률, 대상 금액'],
      sections: [
        ['역산 모드 사용', '금액을 기준으로 예상 포인트를 계산합니다. 실제 등급과 특별 적립률에 맞게 바꾸세요.'],
        ['통화와 국가', '이 페이지는 일본 엔 기준입니다. 한국 사용자는 구조 참고용으로 보고, 실제 조건은 앱에서 확인하세요.'],
        ['다음 단계', '10,000엔의 예상 포인트를 본 뒤 목표 등급까지 부족한 포인트와 비교하세요.']
      ],
      faq: [
        ['세금 포함 금액인가요?', 'Google Play에서 포인트 대상이 되는 금액을 기준으로 봐야 합니다.'],
        ['원화 계산도 가능한가요?', '현재는 엔 기준 구조입니다. 국가별 전용 계산에는 별도 조건이 필요합니다.'],
        ['기프트카드도 포인트가 붙나요?', '구매 시점인지 사용 시점인지에 따라 달라질 수 있어 지역 조건 확인이 필요합니다.']
      ]
    },
    tw: {
      title: '10,000 日圓可獲得多少 Google Play Points？',
      description: '估算 10,000 日圓可獲得多少 Google Play Points，並依目前等級與活動特別獲點率比較可能獲得的點數。',
      eyebrow: '10,000 日圓反推',
      h1: '10,000 日圓可獲得多少 Google Play Points？',
      lead: '固定金額方便規劃，但實際點數會受到等級、活動特別獲點率、所在地區的適用付款條件影響。',
      cta: '計算 10,000 日圓點數',
      secondary: '查看英文禮物卡指南',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['預設: 反推模式', '適合: 從金額估點數', '確認: 等級、特別獲點率、適用金額'],
      sections: [
        ['使用反推模式', '這頁會以金額作為輸入，請依自己的等級與活動特別獲點率調整。'],
        ['貨幣與地區', '本頁以日圓為例。台灣使用者可參考計算邏輯，但實際幣別與資格請以 App 為準。'],
        ['下一步', '確認 10,000 日圓的點數後，再與白金或鑽石所需剩餘點數比較。']
      ],
      faq: [
        ['這是含稅金額嗎？', '應以 Google Play 實際列為點數對象的金額為準。'],
        ['可以換成台幣嗎？', '目前是日圓範例。若要精準台幣頁面，需要台灣條件作為前提。'],
        ['禮物卡會有點數嗎？', '可能取決於購買或兌換時點，請確認所在地區規則。']
      ]
    }
  }
};

const EN_ARTICLES = [
  {
    file: 'en/articles/google-play-points-reflection-timing.html',
    retired: true,
    jaAlternate: '/articles/2026-03-10-play-points-reflection-timing.html',
    title: 'When do Google Play Points appear?',
    description: 'A practical guide to Google Play Points reflection timing, pending points, and what to check before assuming points are missing.',
    h1: 'When do Google Play Points appear?',
    badge: 'Timing check',
    lead: 'Most Play Points confusion starts with timing. A balance can look wrong simply because the purchase, campaign bonus, or account history has not settled in the way you expected.',
    intro: 'If you paid in Google Play and the point balance did not move, it is easy to feel that something broke. In many cases, the calmer first step is to separate three things: the purchase record, the Play Points activity view, and the Google account that made the purchase. This guide keeps the decision practical so you can tell whether you should wait, check another screen, or prepare details for support.',
    sections: [
      ['Start with the purchase record', ['Open the Google Play purchase history first. Confirm that the order is completed, not pending, cancelled, refunded, or attached to a different Google account. This sounds basic, but it prevents the most frustrating mistake: looking at the right Play Points screen for the wrong purchase account.', 'If you use a work profile, family device, or more than one Gmail account, check the account icon before judging the balance. Play Points are account-based, so a purchase on one account will not quietly move to another one.']],
      ['Check regular points and bonus points separately', ['Regular earning and campaign bonus points can feel like one result, but they may not be shown or processed in the same way. When a campaign is involved, compare the normal point estimate first, then review the campaign details for app eligibility, dates, payment method, and any cap.', 'This is also where the calculator helps. A 1x estimate gives you a calm baseline. If the 2x or 3x result is very different, you know that the missing part may be the bonus condition rather than the whole purchase.']],
      ['Do not rush if the transaction is still changing', ['A pending payment, refund, subscription update, or store adjustment can change the point result later. If the order itself is not final, the point balance is not a reliable final answer yet.', 'Before contacting support, take a screenshot only if it hides private information such as email address, payment details, or order numbers. Keep those details for the official support form, not for public posts.']],
      ['Country and account differences matter', ['Play Points availability, campaigns, rewards, and timing can differ by country or account. A guide written for Japan or a US-style English page can explain the checking method, but the local Google Play app should decide the final rule.', 'For that reason, this page avoids promising an exact waiting time. The practical goal is to help you narrow the cause without buying more, switching accounts repeatedly, or assuming a campaign applied when it did not.']],
      ['When to move from waiting to action', ['If the purchase is completed, the account is correct, the campaign conditions clearly match, and the activity view still does not show the expected result after a reasonable wait, collect the order date, item name, account, and campaign name. That gives support a cleaner trail than a message that only says the points are missing.']]
    ],
    faq: [
      ['Should I contact support immediately?', 'Wait until the normal purchase and campaign conditions are clear. If the account, purchase, and eligibility all match but points still do not appear, use Google Play support.'],
      ['Can the calculator force points to appear?', 'No. The calculator only estimates points from your inputs. It cannot read or change your Google account.'],
      ['Why does a friend see points faster than I do?', 'The purchase type, account, country, and campaign can differ. Compare your own purchase history rather than another person\'s timing.']
    ]
  },
  {
    file: 'en/articles/google-play-points-not-showing.html',
    jaAlternate: '/articles/2026-03-10-play-points-reflection-timing.html',
    title: 'Google Play Points not showing up: what to check',
    description: 'Checklist for Google Play Points not showing up, including account mismatch, eligible purchases, campaign rules, refunds, and regional differences.',
    h1: 'Google Play Points not showing up: what to check',
    badge: 'Troubleshooting',
    lead: 'If Play Points do not show up, avoid judging only from the final balance. Work through account, purchase, eligibility, timing, and region in that order.',
    intro: 'When points seem missing, the problem is often not one big mystery. It is usually a small mismatch somewhere in the route from purchase to point history. This checklist keeps the order simple, so you do not spend time refreshing the same screen while the real issue is a second account, a campaign condition, or a purchase that was never eligible.',
    sections: [
      ['1. Confirm the Google account', ['Open Google Play and check the account icon before anything else. Points are not pooled across accounts, so a family device, old phone, or secondary Gmail account can make the balance look wrong even when the purchase itself succeeded.', 'If the purchase receipt is in another account, do not keep changing calculator settings to make the number match. The right next step is to review that account\'s Play Points activity.']],
      ['2. Check whether the purchase was eligible', ['Not every payment pattern behaves the way users expect. Promotional credit, subscriptions, gift-card-funded purchases, trial conversions, refunds, and partial cancellations all deserve a closer look.', 'Read the purchase details and the local Play Points terms together. If the transaction is not eligible, a perfect estimate still will not create points.']],
      ['3. Separate normal points from campaign points', ['A campaign headline such as 2x or 3x is only the front door. The actual rule can include selected apps, a date range, country availability, payment method restrictions, maximum bonus points, or a requirement to activate the offer first.', 'If normal points appear but the bonus does not, the issue may be the campaign condition rather than a full tracking failure. That distinction makes your next action much clearer.']],
      ['4. Compare with a simple estimate', ['Use the calculator at 1x first, then run the same amount with the campaign special earn rate that you believe applied. The gap between those two results helps you explain the situation without relying on memory.', 'The calculator is not an official account checker. Its job is to turn your assumptions into a number, then let you compare that number with Google Play\'s activity screen.']],
      ['5. Prepare support details only after narrowing the cause', ['If everything still looks correct, collect the purchase date, order status, account, item name, and campaign name. Avoid posting order numbers or payment details publicly. A short, organized support message is more useful than a long explanation built from guesses.']]
    ],
    faq: [
      ['Can points be transferred from another account?', 'No. Play Points are account-based.'],
      ['Does a missing bonus mean the normal points are wrong?', 'Not necessarily. Bonus timing and regular points can be handled differently.'],
      ['Should I buy again to test it?', 'No. Do not create another purchase just to test point reflection. Confirm the existing purchase and campaign conditions first.']
    ]
  },
  {
    file: 'en/articles/google-play-points-levels.html',
    title: 'Google Play Points levels explained',
    description: 'Understand Google Play Points levels, what to compare before chasing Platinum or Diamond, and how country differences affect planning.',
    h1: 'Google Play Points levels explained',
    badge: 'Level planning',
    lead: 'Google Play Points levels are useful only when the rewards match your real usage. Before aiming for Platinum or Diamond, compare the missing points, expected spending, and reward value.',
    intro: 'Status can make Play Points feel like a game, but the useful question is more ordinary: will the next level actually help the way you spend? This page explains the levels as a planning tool, not as a reason to force extra purchases. Keep your current balance, missing points, and normal spending pace in view while you compare.',
    sections: [
      ['Levels are planning categories', ['Bronze, Silver, Gold, Platinum, and Diamond help frame earning rates and benefits. They are useful labels, but they are not the same as guaranteed value. Rewards, campaigns, and visibility can differ by country or account.', 'Think of each level as a planning category. It tells you what to compare next, not what you must buy today.']],
      ['Use missing points, not lifetime points', ['For planning, the key number is how many points remain until the target level. Lifetime points, current balance, and points already spent can make the screen feel confusing if you copy the wrong number into a calculator.', 'The PlayPoint calculator is built around the missing-point approach. Enter the points you still need, then compare the amount under your current status and multiplier.']],
      ['Check whether the next level fits your spending rhythm', ['A level can be attractive on paper and still be a poor target if the required spending is far above your normal pace. Weekly and monthly views are helpful because they turn one large number into a habit-sized number.', 'If the monthly amount feels uncomfortable, that is useful information. It may mean waiting for a planned purchase or accepting the current level is better than chasing a badge.']],
      ['Campaigns can change the timing, not the principle', ['A 2x or 3x campaign can make a target easier, but only when the purchase is already useful and eligible. A campaign should move planned spending into a better window, not invent spending that you would not otherwise make.', 'Always compare the 1x estimate first. If the target makes no sense at 1x and only barely works under a narrow campaign, read the campaign details carefully before deciding.']],
      ['International users should verify local rules', ['The site provides Japanese pages, English guidance, Korean pages, and Traditional Chinese pages, but the official Google Play app in your country remains the source of truth. Use this guide for structure and the app for the final rule.', 'That balance keeps the page useful overseas without pretending that every country has exactly the same rewards, campaigns, or status experience.']]
    ],
    faq: [
      ['Is Diamond better than Platinum?', 'It can be, but only if you actually use the added rewards and can maintain the level without forced spending.'],
      ['Can the same plan work in every country?', 'No. Country-specific offers and reward availability can differ.'],
      ['What should I calculate first?', 'Calculate the nearer level first. If that already requires too much spending, a higher level is unlikely to be practical.']
    ]
  },
  {
    file: 'en/articles/google-play-points-platinum-diamond-cost.html',
    manual: true,
    title: 'How much to reach Platinum or Diamond?',
    description: 'Estimate the spending needed to reach Google Play Points Platinum or Diamond and decide whether waiting for a promotion makes sense.',
    h1: 'How much to reach Platinum or Diamond?',
    badge: 'Cost estimate',
    lead: 'The cost to reach Platinum or Diamond depends on current status, missing points, multiplier, and whether purchases are eligible. A single global number is usually misleading.',
    intro: 'Platinum and Diamond sound like clear goals, but the cost changes quickly once you add status rate, remaining points, campaign special earn rates, and local rules. Instead of looking for one universal amount, build the estimate in layers. That makes it easier to see whether a promotion helps or whether the target is simply outside your normal spending.',
    sections: [
      ['Define one target at a time', ['Start with either Platinum or Diamond, not both. If you mix status progress, campaign bonuses, gift-card discounts, and reward value in one step, the decision becomes noisy before the estimate is even useful.', 'A clean target is simple: current status, missing points, normal earning rate, and the multiplier you can honestly use.']],
      ['Estimate at 1x before checking campaigns', ['A 1x estimate gives you the baseline cost. It may look higher than you hoped, but it is the number that tells you whether the goal is close in normal conditions.', 'After that, test 2x or 3x only if a real campaign applies to the purchase you already planned. This prevents the common mistake of treating a campaign headline as a universal discount.']],
      ['Translate the result into weekly or monthly pace', ['A total amount can feel abstract. Break it into the remaining weeks or months of the status period and ask whether that pace matches your actual use of apps, games, subscriptions, or in-app purchases.', 'If the pace is much higher than usual, the level may not be worth forcing. Keeping money for purchases you genuinely want can be better than buying only to reach a status label.']],
      ['Gift-card discounts and Play Points are separate checks', ['A discounted gift card can reduce your effective cost, but it does not automatically prove that points or campaign bonuses apply in the way you expect. Treat savings and point eligibility as two separate columns.', 'This is especially important for international users because gift-card rules, payment flows, and campaign terms can vary by country.']],
      ['Use country-aware caution before deciding', ['The calculation pattern works globally, but official earning rates, reward availability, and promotion rules may differ by country or account. The calculator helps with planning; the Google Play app decides the final rule.', 'If the estimate only works under a narrow campaign or uncertain gift-card flow, wait until the official conditions are clear before spending.']]
    ],
    faq: [
      ['Should I aim for Platinum first?', 'Usually yes. Estimate the nearer level first, then decide whether Diamond still makes sense.'],
      ['Can gift-card discounts change the result?', 'They can change your effective cost, but Play Points eligibility still depends on the local rule.'],
      ['Is there one official global cost for Diamond?', 'No. The useful estimate depends on your account, country, missing points, status, and eligible purchases.']
    ]
  },
  {
    file: 'en/articles/google-play-points-gift-cards.html',
    jaAlternate: '/articles/2025-12-25-gift-card.html',
    title: 'Do gift cards earn Google Play Points?',
    description: 'Understand how Google Play gift cards can affect Play Points planning, why purchase and redemption timing matter, and what to verify by country.',
    h1: 'Do gift cards earn Google Play Points?',
    badge: 'Gift-card planning',
    lead: 'Gift cards are often used to reduce the effective cost of app purchases, but Play Points eligibility can depend on how and when value is used. Treat gift-card savings and points earning as separate checks.',
    intro: 'Gift cards are attractive because the saving is easy to understand: buy value at a discount, then use it later. Play Points are less simple. The point question depends on the local rule, the purchase flow, and whether a campaign treats that payment method as eligible. This guide keeps the two ideas separate so a cheap card does not turn into an unnecessary purchase.',
    sections: [
      ['Separate discount from points', ['A discounted gift card can lower your real cost, but that does not automatically mean Play Points are earned when the card is purchased. The saving and the point earning are two different questions.', 'Keep a simple note: card discount on one side, Play Points estimate on the other. If either side is uncertain, do not combine them into one optimistic result.']],
      ['Check redemption and purchase flow', ['Some users expect points when buying the card. Others expect points when spending the balance inside Google Play. The local Google Play rule and the actual payment flow decide what happens.', 'Look at the activity screen after an eligible purchase rather than assuming the card itself created points. This is especially important if the card was bought outside Google Play.']],
      ['Campaign combinations need care', ['A 2x or 3x campaign may include conditions that do not match every gift-card-funded purchase. It can depend on app, date, country, payment method, activation, or a bonus cap.', 'Before you treat a gift card as part of a status strategy, read the campaign details and compare the result at 1x. If the plan only works because of a bonus that may not apply, the risk is too high.']],
      ['Compare effective cost safely', ['Use the calculator for the Play Points side, then separately note the gift-card discount as a cost-saving side note. This keeps the math honest and makes it easier to explain later.', 'For example, a discounted card may still be useful even if it does not improve status progress. The reverse can also be true: a point campaign may be useful without making a gift card the best payment choice.']],
      ['Avoid buying value you do not plan to use', ['The safest gift-card plan starts with a purchase you already wanted. If you buy a larger card only because it looks cheaper or might help a status goal, you may lock money into a balance that does not create enough value.', 'For international users, also check whether the card region, account region, and Google Play country settings match. Region mismatch can create practical problems that a calculator cannot solve.']]
    ],
    faq: [
      ['Are gift cards always better?', 'No. They are useful only when the discount, eligibility, and your planned purchase all align.'],
      ['Can I use gift cards with promotions?', 'Sometimes, but campaign conditions vary. Check the local Google Play campaign page.'],
      ['Should I count gift-card savings as Play Points?', 'No. Treat the discount as cost savings and Play Points as a separate earning estimate.']
    ]
  }
];

const ADDITIONAL_EN_ARTICLES = [
  {
    file: 'en/articles/google-play-points-country-differences.html',
    title: 'Google Play Points country differences',
    description: 'A practical country-difference guide for Google Play Points users comparing availability, promotions, rewards, currencies, and local account rules.',
    h1: 'Google Play Points country differences',
    badge: 'Country differences',
    lead: 'Google Play Points can look similar across countries, but the details that affect a real purchase can change by region. Use this guide to compare the structure without assuming every country has the same offers.',
    intro: 'Many users search in English because they want a simple answer: are Play Points the same in Japan, the US, Korea, Taiwan, or another country? The safest answer is that the checking method can be shared, but the final rule should come from the local Google Play app. This page explains what can differ, what usually stays comparable, and how to use PlayPoint pages without turning a regional guide into a promise.',
    sections: [
      ['What can differ by country', ['Availability, status names, reward catalogs, campaign timing, bonus caps, eligible payment methods, and display language can all differ by country or account. Even when two users see the same 2x or 3x headline, the small conditions below that headline may not match.', 'Do not treat a screenshot from another region as a rule for your own account. It can be useful for learning what to check, but the purchase decision should wait until your local app shows the offer clearly.']],
      ['Use the local app screen as the final rule', ['The calculator can estimate a cost or point result, but it cannot read your account country or campaign eligibility. Before spending, open Google Play, check the Play Points page, and read the offer details from the account that will make the purchase.', 'This is especially important after moving countries, changing payment profiles, or using multiple accounts. A regional mismatch can make a normal purchase feel like a points problem when the real issue is account setup.']],
      ['Compare estimates without assuming the same currency', ['A yen-based shortcut can still teach the calculation pattern, but it should not be copied as a local price. Currency, tax handling, exchange rates, and eligible amount rules can change the actual result.', 'When you use an international page, focus on the relationship between missing points, status rate, and multiplier. Then translate the decision back to your local currency and official screen.']],
      ['When another country guide is still useful', ['A guide from another country is useful when it explains the order of checks: account, purchase record, eligibility, campaign terms, and timing. That process is often more portable than the exact reward value.', 'Use overseas examples to avoid mistakes, not to force a specific outcome. If a reward is not shown in your country, the guide cannot make it available.']],
      ['How to use PlayPoint pages together', ['Start with the English overview if you want the broad structure, then use Korean or Traditional Chinese pages when they match your reading language. For numbers, open the calculator with the closest preset and adjust status, missing points, and multiplier yourself.', 'This keeps internal links helpful without overselling. The site should guide users toward a cleaner decision, not push them into extra spending because one region has an attractive-looking promotion.']]
    ],
    faq: [
      ['Are Play Points rules identical worldwide?', 'No. Availability, offers, rewards, and eligibility can differ by country and account.'],
      ['Can I use a Japanese yen estimate overseas?', 'Use it as a pattern reference only. Local currency and official eligibility should decide the final action.'],
      ['Why do my rewards differ from another country?', 'Reward catalogs and campaigns are often regional. The Google Play app for your account is the source of truth.']
    ]
  },
  {
    file: 'en/articles/google-play-points-promotion-not-applied.html',
    title: 'Google Play Points promotion not applied',
    description: 'A step-by-step checklist for Google Play Points bonuses that did not apply, including activation, dates, app eligibility, caps, and normal point comparison.',
    h1: 'Google Play Points promotion not applied',
    badge: 'Promotion check',
    lead: 'When a Play Points promotion does not appear, the problem is often the bonus condition rather than the whole purchase. Check activation, timing, eligibility, and caps before assuming the account is broken.',
    intro: 'A 2x or 3x campaign looks simple in a banner, but the real rule can include small conditions that matter at checkout. This guide is written for the moment after purchase, when the normal balance or bonus result does not match your expectation. The goal is to separate a missing promotion from a missing purchase, so your next step is based on evidence instead of refreshes and guesswork.',
    sections: [
      ['Confirm whether the offer had to be activated', ['Some promotions are automatic, while others require tapping an activation button before the purchase. If the offer needed activation and the purchase happened first, the bonus may not apply even though the app and payment looked eligible.', 'Check the Play Points activity page and the campaign screen if it is still visible. If you are preparing a support request, mention whether you activated the offer and when the purchase was made.']],
      ['Check dates, time zones, and purchase completion', ['Campaign windows can depend on local dates, store time zones, or the moment a transaction completes. A pending payment near the beginning or end of a campaign can be harder to judge from memory.', 'Use the purchase receipt time and campaign details together. If the order was later cancelled, refunded, or adjusted, the bonus may also change or disappear.']],
      ['Review app, item, and payment eligibility', ['A campaign may apply only to selected apps, games, subscriptions, in-app items, or payment methods. It may also exclude trials, promotional credit, refunded purchases, or some gift-card flows.', 'Do not rely only on the banner headline. The smaller conditions are often where the answer is. If normal points appear but bonus points do not, eligibility is one of the strongest places to check.']],
      ['Look for caps and partial bonuses', ['Some campaigns have maximum bonus points or only apply to part of the purchase. That can make the result look incomplete even when the promotion worked correctly.', 'Compare the expected normal points first, then estimate the bonus separately. A partial result is easier to understand when you know whether the base earning matched.']],
      ['Use the calculator to make the support story cleaner', ['Run the same amount at 1x, then run it with the campaign special earn rate. The gap gives you a simple way to explain what you expected and which part seems missing.', 'The calculator does not prove official eligibility, but it helps you avoid vague messages. A clear support note should include purchase date, account, campaign name, expected bonus, and what actually appeared.']]
    ],
    faq: [
      ['Does a campaign banner mean every purchase qualifies?', 'No. Check the offer details for eligible apps, payment methods, dates, and caps.'],
      ['Can normal points appear while bonus points are missing?', 'Yes. The normal earning and campaign bonus can have different conditions or timing.'],
      ['Should I make another purchase to test the promotion?', 'No. Confirm the existing purchase and campaign rule first. Do not create extra spending just to test a bonus.']
    ]
  },
  {
    file: 'en/articles/google-play-points-subscriptions.html',
    jaAlternate: '/articles/2025-12-25-subscription.html',
    title: 'Do subscriptions earn Google Play Points?',
    description: 'Understand how Google Play Points can apply to subscriptions, renewals, trials, refunds, and campaigns before estimating recurring spend.',
    h1: 'Do subscriptions earn Google Play Points?',
    badge: 'Subscription planning',
    lead: 'Subscriptions can be part of Play Points planning, but renewals, trials, refunds, and campaign rules need separate checks. Estimate recurring spend only after confirming what your local account treats as eligible.',
    intro: 'Subscription spending is different from a one-time app purchase because it repeats. That makes it useful for planning, but also risky if you assume every renewal will behave the same way forever. This guide explains the practical checks before you include subscriptions in a Platinum or Diamond plan, with a focus on avoiding extra spend and keeping the calculator honest.',
    sections: [
      ['Separate the first charge from renewals', ['A subscription may have an initial charge, trial conversion, introductory price, or recurring renewal. Each stage can feel like the same subscription to the user, but Google Play may show and process them differently.', 'When estimating Play Points, note which payment you are planning around. If you only care about the next month, use the next renewal amount instead of the annual total you have not committed to paying yet.']],
      ['Check trials, discounts, and cancellations', ['Free trials, discounted first months, cancellations, refunds, and grace periods can all change the point result. A subscription that looks active in the app may not mean a full eligible charge has settled.', 'Do not include points from a trial unless the local rule and activity screen support that assumption. The safer approach is to estimate only completed, eligible charges.']],
      ['Campaigns may not cover every renewal', ['A 2x or 3x promotion can be tied to selected apps, new purchases, first payments, or limited dates. A renewal outside that window may earn differently from the first charge.', 'If a campaign is involved, calculate the subscription at 1x first. Then compare the promotional result only for the charge that clearly falls inside the campaign conditions.']],
      ['Use recurring spend as a pace check', ['Subscriptions can make a status target easier to understand because they are predictable. Add the monthly eligible amount and compare it with the missing points and remaining time in the status period.', 'If the required extra amount is still large after normal subscriptions, that is a signal not to chase status through unplanned purchases. The best estimate is the one that respects spending you already intended.']],
      ['Keep official account screens in the loop', ['Subscription rules, reward availability, and campaign eligibility can differ by country or account. The calculator is a planning layer, not an account statement.', 'Before changing or adding a subscription for Play Points, check Google Play subscription details, Play Points activity, and campaign terms from the same account. That prevents a clean estimate from being attached to the wrong payment profile.']]
    ],
    faq: [
      ['Do all subscription renewals earn Play Points?', 'Not necessarily. Eligibility depends on the local rule, account, purchase type, and any campaign terms.'],
      ['Should I annualize a monthly subscription?', 'Only if you are truly planning that full spend. For near-term decisions, estimate the next renewal or remaining period.'],
      ['Can a trial earn points?', 'Do not assume so. Check whether there is an actual eligible charge and how your local Play Points activity records it.']
    ]
  }
];

const ARTICLE_LABELS = {
  en: {
    toc: 'Table of contents',
    updatedPrefix: 'Updated',
    guideSuffix: 'Play Points guide',
    ctaTitle: 'Check the numbers without forcing a purchase',
    ctaBody: 'Use the calculator as a planning estimate, then confirm the official rule in your local Google Play app.',
    ctaLabel: 'Open the calculator',
    faq: 'FAQ',
    nextStep: 'Next step',
    authorAria: 'Article author',
    authorLabel: 'Article author',
    authorNameSuffix: 'Google Play Points Calculator editor',
    authorBody: 'This guide is written as a practical planning note. Google Play terms, rewards, campaigns, and eligibility can change by country or account, so official Google Play screens should decide the final action.',
    backToGuides: 'Back to guides',
    calculatorTop: 'Calculator top',
    footerNote: 'This page is a general guide and calculator entry point. Check Google Play official help and the Google Play app for exact current rules.'
  },
  ko: {
    toc: '목차',
    updatedPrefix: '업데이트',
    guideSuffix: 'Play Points 가이드',
    ctaTitle: '무리한 결제 없이 숫자부터 확인하기',
    ctaBody: '계산기는 계획을 돕는 예상치로 사용하고, 최종 조건은 본인 계정의 Google Play 앱에서 확인하세요.',
    ctaLabel: '계산기 열기',
    faq: 'FAQ',
    nextStep: '다음 단계',
    authorAria: '글쓴이',
    authorLabel: '글쓴이',
    authorNameSuffix: 'Google Play Points 계산기 편집자',
    authorBody: '이 글은 실제 결제 판단을 돕기 위한 실용 가이드입니다. Google Play 조건, 리워드, 캠페인, 대상 결제는 국가와 계정에 따라 달라질 수 있으므로 공식 화면을 최종 기준으로 보세요.',
    backToGuides: '가이드 목록',
    calculatorTop: '계산기 홈',
    footerNote: '이 페이지는 일반 가이드와 계산기 진입점입니다. 정확한 최신 조건은 Google Play 공식 도움말과 앱 화면을 확인하세요.'
  },
  tw: {
    toc: '目錄',
    updatedPrefix: '更新',
    guideSuffix: 'Play Points 指南',
    ctaTitle: '先確認數字，不為點數硬買',
    ctaBody: '請把計算機當作規劃用估算，最後仍以你所在地區 Google Play App 內的官方條件為準。',
    ctaLabel: '開啟計算機',
    faq: 'FAQ',
    nextStep: '下一步',
    authorAria: '文章作者',
    authorLabel: '文章作者',
    authorNameSuffix: 'Google Play Points 計算器編輯',
    authorBody: '這篇文章是為了協助實際判斷而寫的規劃筆記。Google Play 條款、回饋、活動與適用資格可能因國家、地區或帳號而不同，最終仍以官方畫面為準。',
    backToGuides: '返回指南',
    calculatorTop: '計算機首頁',
    footerNote: '本頁是一般指南與計算機入口。請在 Google Play 官方說明與 App 畫面確認最新精確規則。'
  }
};

const KO_ARTICLES = [
  {
    file: 'ko/articles/google-play-points-not-showing.html',
    jaAlternate: '/articles/2026-03-10-play-points-reflection-timing.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    faqStructuredData: true,
    officialSourceTitle: 'Play Points 문제 해결 공식 안내',
    officialSourceBody: '결제 계정, 포인트 활동 내역, 가족 결제, 국가 변경 영향을 Google 공식 문제 해결 도움말에서 확인하세요.',
    officialSourceHref: 'https://support.google.com/googleplay/answer/9077247?hl=ko',
    officialSourceLink: 'Google Play Points 문제 해결 도움말 보기',
    officialProgramLink: 'Google Play Points 프로그램 공식 안내',
    nextLinks: [
      ['/ko/status/platinum/', '플래티넘 필요 금액 계산'],
      ['/ko/status/diamond/', '다이아몬드 필요 금액 계산'],
      ['/ko/campaign/2x/', '2배 캠페인 계산'],
      ['/ko/articles/google-play-points-levels.html', 'Play Points 등급 구조 이해'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play Points가 표시되지 않을 때 확인할 것',
    description: 'Google Play Points가 보이지 않을 때 계정, 결제 내역, 대상 결제, 캠페인, 환불, 국가별 조건을 순서대로 확인하는 한국어 체크리스트입니다.',
    h1: 'Google Play Points가 표시되지 않을 때 확인할 것',
    badge: '문제 확인',
    lead: '포인트가 보이지 않을 때는 잔액만 보지 말고 계정, 구매 내역, 대상 조건, 캠페인, 국가별 차이를 차례대로 확인하는 편이 안전합니다.',
    intro: 'Play Points가 안 보이면 바로 오류처럼 느껴지지만, 실제로는 작은 조건 하나가 어긋난 경우가 많습니다. 다른 Google 계정으로 결제했거나, 구매가 아직 완료되지 않았거나, 캠페인 보너스만 늦게 반영되는 식입니다. 이 글은 같은 화면을 계속 새로고침하기보다 무엇을 먼저 확인해야 하는지 정리한 한국어 가이드입니다.',
    sections: [
      ['1. 결제한 Google 계정부터 확인하기', ['Google Play 앱 오른쪽 위의 계정 아이콘을 먼저 확인하세요. Play Points는 계정별로 관리되므로, 가족 기기나 예전 휴대폰에서 다른 Gmail 계정으로 결제했다면 현재 보는 잔액에는 나타나지 않습니다.', '영수증이 도착한 계정과 Play Points 화면의 계정이 같은지 확인하는 것만으로도 많은 혼란을 줄일 수 있습니다. 계산기 숫자를 계속 바꾸기 전에 계정 일치 여부를 먼저 정리하세요.']],
      ['2. 구매가 포인트 대상인지 보기', ['모든 결제가 사용자가 기대하는 방식으로 포인트 대상이 되는 것은 아닙니다. 체험 기간, 일부 구독 전환, 프로모션 크레딧, 기프트카드 사용, 환불, 부분 취소는 별도로 확인해야 합니다.', '구매 내역에서 주문 상태가 완료인지, 환불이나 취소가 없는지 확인하세요. 결제 자체가 대상이 아니라면 계산 결과가 맞아도 실제 포인트는 생기지 않습니다.']],
      ['3. 일반 포인트와 캠페인 보너스를 나누기', ['2배나 3배 캠페인은 문구가 단순해 보여도 대상 앱, 결제수단, 기간, 활성화 여부, 보너스 상한이 붙을 수 있습니다. 일반 포인트는 보이는데 보너스만 안 보인다면 전체 누락이 아니라 캠페인 조건 문제일 수 있습니다.', '먼저 1배 기준으로 예상치를 보고, 실제로 적용된다고 생각한 배율을 따로 비교하세요. 두 숫자의 차이가 무엇이 부족한지 설명하는 데 도움이 됩니다.']],
      ['4. 국가와 계정 조건을 최종 기준으로 보기', ['한국어로 검색하더라도 일부 정보는 일본, 미국, 대만 기준으로 작성되어 있을 수 있습니다. 확인 순서는 참고할 수 있지만 최종 조건은 본인 계정의 Google Play 앱에 표시된 내용을 기준으로 해야 합니다.', '국가 설정, 결제 프로필, 앱의 제공 국가가 다르면 같은 구매처럼 보여도 포인트 조건이 달라질 수 있습니다. 다른 지역의 스크린샷만 보고 판단하지 않는 것이 좋습니다.']],
      ['5. 문의 전에 필요한 정보를 짧게 모으기', ['계정, 구매일, 주문 상태, 상품명, 캠페인 이름, 예상한 포인트와 실제 표시된 포인트를 정리하세요. 주문번호나 결제 정보는 공개 글에 올리지 말고 공식 문의에만 사용하세요.', '정리된 정보가 있으면 지원 문의도 짧아집니다. “포인트가 안 들어왔어요”보다 어떤 조건까지 확인했는지를 적는 편이 해결 가능성을 높입니다.']]
    ],
    faq: [
      ['포인트를 다른 계정으로 옮길 수 있나요?', '일반적으로 Play Points는 계정 단위로 관리되므로 다른 계정으로 합치거나 옮긴다고 가정하면 안 됩니다.'],
      ['일반 포인트는 있는데 보너스만 없을 수 있나요?', '가능합니다. 캠페인 보너스는 일반 적립과 조건이나 반영 시점이 다를 수 있습니다.'],
      ['다시 결제해서 테스트해도 되나요?', '권하지 않습니다. 추가 결제 전에 기존 구매와 캠페인 조건을 먼저 확인하세요.']
    ]
  },
  {
    file: 'ko/articles/google-play-points-levels.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    nextLinks: [
      ['/ko/status/platinum/', '플래티넘 필요 금액 계산'],
      ['/ko/status/diamond/', '다이아몬드 필요 금액 계산'],
      ['/ko/amount/10000/', '10,000엔 포인트 계산'],
      ['/ko/articles/google-play-points-not-showing.html', '포인트가 보이지 않을 때'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play Points 등급 구조 이해',
    description: 'Google Play Points 브론즈, 실버, 골드, 플래티넘, 다이아몬드 등급을 무리한 소비 없이 판단하는 한국어 가이드입니다.',
    h1: 'Google Play Points 등급 구조 이해',
    badge: '등급 계획',
    lead: 'Play Points 등급은 리워드를 실제로 사용할 때 의미가 있습니다. 플래티넘이나 다이아몬드를 목표로 하기 전에 남은 포인트, 평소 결제액, 캠페인 조건을 함께 비교하세요.',
    intro: '등급 이름은 게임처럼 보이지만 실제 판단은 단순해야 합니다. 다음 등급이 내 소비 습관과 맞는지, 필요한 금액이 평소 계획을 넘지 않는지, 리워드를 실제로 사용할 수 있는지가 더 중요합니다. 이 글은 등급을 쫓기 위한 글이 아니라 무리한 결제를 피하면서 숫자를 읽는 방법을 정리합니다.',
    sections: [
      ['등급은 목표가 아니라 비교 기준입니다', ['브론즈, 실버, 골드, 플래티넘, 다이아몬드는 적립률과 혜택을 비교하기 위한 틀입니다. 하지만 등급이 높다고 항상 이득인 것은 아닙니다.', '국가와 계정에 따라 리워드, 캠페인, 표시 방식이 달라질 수 있으므로 등급명보다 실제로 받을 수 있는 혜택을 먼저 보세요.']],
      ['누적 포인트보다 남은 포인트가 중요합니다', ['계획을 세울 때는 목표 등급까지 남은 포인트를 입력해야 합니다. 현재 보유 포인트, 이미 사용한 포인트, 누적 포인트를 섞으면 필요한 금액이 쉽게 틀어집니다.', '계산기는 남은 포인트를 기준으로 보는 도구입니다. 현재 등급, 목표까지 부족한 포인트, 적용할 배율을 차례로 넣고 비교하세요.']],
      ['평소 결제 리듬과 맞는지 확인하기', ['한 번에 필요한 총액만 보면 판단이 흐려질 수 있습니다. 남은 기간을 주 단위나 월 단위로 나누면 실제 생활에서 감당 가능한 금액인지 더 잘 보입니다.', '월별 금액이 평소보다 크다면 그것도 중요한 결과입니다. 등급을 올리는 것보다 현재 등급을 유지하거나 예정된 결제만 하는 편이 나을 수 있습니다.']],
      ['캠페인은 기회를 줄 뿐 결정을 대신하지 않습니다', ['2배나 3배 캠페인은 도움이 될 수 있지만 대상 결제일 때만 의미가 있습니다. 캠페인은 이미 예정된 결제를 좋은 시점으로 옮기는 데 쓰는 것이 좋습니다.', '먼저 1배 기준을 보고, 캠페인 조건이 분명할 때만 배율을 바꿔 비교하세요. 캠페인 없이는 말이 안 되는 계획이라면 조건을 더 엄격하게 확인해야 합니다.']],
      ['해외 정보는 구조만 참고하기', ['한국어 페이지라도 일본 엔 기준 계산이나 영어 가이드를 함께 볼 수 있습니다. 이런 페이지는 확인 순서를 배우는 데 유용하지만, 최종 조건은 한국 계정의 Google Play 앱에서 확인해야 합니다.', 'PlayPoint의 내부 링크는 관련 주제를 이어 보기 위한 장치입니다. 더 많이 쓰게 만들기보다, 숫자를 차분히 확인하고 불필요한 결제를 피하게 하는 것이 목적입니다.']]
    ],
    faq: [
      ['다이아몬드가 플래티넘보다 항상 좋은가요?', '항상 그렇지는 않습니다. 추가 혜택을 실제로 사용할 수 있고 무리 없이 유지할 수 있을 때만 의미가 있습니다.'],
      ['한국과 일본의 조건이 같나요?', '같다고 가정하면 안 됩니다. 국가별 캠페인과 리워드는 달라질 수 있습니다.'],
      ['무엇부터 계산해야 하나요?', '가장 가까운 다음 등급부터 계산하세요. 그 금액이 이미 부담스럽다면 더 높은 등급은 현실적이지 않을 수 있습니다.']
    ]
  },
  {
    file: 'ko/articles/google-play-points-gift-cards.html',
    jaAlternate: '/articles/2025-12-25-gift-card.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    nextLinks: [
      ['/ko/amount/10000/', '10,000엔 포인트 계산'],
      ['/ko/campaign/wait/', '캠페인 대기 판단'],
      ['/ko/articles/google-play-points-levels.html', 'Play Points 등급 구조 이해'],
      ['/ko/articles/google-play-points-promotion-not-applied.html', '캠페인 보너스가 적용되지 않을 때'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play Points 기프트카드 조건',
    description: 'Google Play 기프트카드와 Google Play Points를 함께 볼 때 확인해야 할 구매 시점, 사용 시점, 캠페인 조건, 국가별 차이를 정리한 한국어 가이드입니다.',
    h1: 'Google Play Points 기프트카드 조건',
    badge: '기프트카드 확인',
    lead: '기프트카드는 실제 비용을 낮출 수 있지만, Play Points 적립 여부와 캠페인 적용 여부는 별도로 확인해야 합니다.',
    intro: 'Google Play 기프트카드는 할인이나 포인트 환급을 노릴 때 자주 언급됩니다. 하지만 “기프트카드를 싸게 샀다”와 “Google Play Points가 적립된다”는 같은 이야기가 아닙니다. 이 글은 구매 시점, 충전 후 사용 시점, 캠페인 조건, 국가별 계정 조건을 나누어 확인하도록 정리한 한국어 가이드입니다.',
    sections: [
      ['할인과 Play Points를 분리해서 보기', ['기프트카드 할인은 실제 지출을 줄이는 효과이고, Play Points는 Google Play 안에서 대상 구매가 어떻게 처리되는지에 대한 문제입니다. 두 값을 한 번에 합치면 지나치게 낙관적인 계산이 되기 쉽습니다.', '먼저 기프트카드 할인율을 따로 적고, 그 다음 Google Play에서 실제로 결제될 구매가 포인트 대상인지 확인하세요. 계산기는 포인트 쪽 예상치를 보는 도구로 쓰는 편이 안전합니다.']],
      ['구매 시점과 사용 시점을 구분하기', ['사용자는 카드 자체를 구매할 때 포인트가 붙는다고 생각하기도 하고, 충전한 잔액을 앱이나 게임에 사용할 때 포인트가 붙는다고 생각하기도 합니다. 실제 조건은 국가와 결제 흐름에 따라 달라질 수 있습니다.', '특히 외부 쇼핑몰이나 편의점에서 산 카드라면, 카드 구매처의 혜택과 Google Play 안에서의 포인트 적립을 같은 혜택으로 보지 마세요.']],
      ['캠페인과 함께 쓸 때 확인할 것', ['2배나 3배 캠페인은 대상 앱, 대상 결제, 기간, 활성화 조건, 보너스 상한을 가질 수 있습니다. 기프트카드 잔액을 사용했다는 이유만으로 모든 캠페인이 자동 적용된다고 가정하면 위험합니다.', '먼저 1배 기준으로 필요한 포인트와 금액을 계산하고, 실제 캠페인 조건을 확인한 뒤에만 배율을 넣어 비교하세요.']],
      ['국가와 계정 지역을 맞춰 확인하기', ['Google Play 기프트카드는 지역과 통화 조건이 중요합니다. 계정 국가, 결제 프로필, 카드 지역이 어긋나면 사용 자체가 어렵거나 예상과 다른 방식으로 처리될 수 있습니다.', '한국 계정에서 확인할 때는 한국 Google Play 앱 화면을 기준으로 보세요. 일본 엔 기준 예시나 영어권 설명은 계산 구조를 이해하는 데만 활용하는 편이 좋습니다.']],
      ['불필요한 충전을 피하는 기준', ['기프트카드는 할인율이 좋아 보여도, 실제로 쓸 예정이 없는 금액을 미리 묶어두면 절약이 아닐 수 있습니다. 등급을 올리기 위해 필요한 금액이 평소 소비보다 크다면 더 조심해야 합니다.', '예정된 구매가 있고, 카드 지역과 사용 조건이 명확하며, 캠페인 대상 여부도 확인될 때만 기프트카드를 계산에 넣는 것이 안전합니다.']]
    ],
    faq: [
      ['기프트카드를 사면 바로 Play Points가 적립되나요?', '그렇게 단정하면 안 됩니다. 카드 구매 혜택과 Google Play 안의 포인트 적립은 별도로 확인해야 합니다.'],
      ['기프트카드와 2배 캠페인을 같이 계산해도 되나요?', '대상 결제가 확실할 때만 비교하세요. 먼저 1배 기준을 확인하는 것이 안전합니다.'],
      ['기프트카드 할인은 계산기에 어떻게 넣나요?', '계산기는 포인트 예상용으로 쓰고, 할인율은 실제 지출을 따로 메모해서 비교하는 방식이 좋습니다.']
    ]
  },
  {
    file: 'ko/articles/google-play-points-promotion-not-applied.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    faqStructuredData: true,
    officialSourceTitle: 'Google Play 프로모션 공식 안내',
    officialSourceBody: '프로모션 제공 여부와 자격은 계정 활동, 설정, 국가와 개별 약관에 따라 달라질 수 있습니다. 공식 안내를 확인하세요.',
    officialSourceHref: 'https://support.google.com/googleplay/answer/15698521?hl=ko',
    officialSourceLink: 'Google Play 프로모션 도움말 보기',
    officialProgramLink: 'Google Play Points 프로그램 공식 안내',
    nextLinks: [
      ['/ko/campaign/2x/', '2배 캠페인 계산'],
      ['/ko/campaign/3x/', '3배 캠페인 계산'],
      ['/ko/articles/google-play-points-not-showing.html', '포인트가 보이지 않을 때'],
      ['/ko/articles/google-play-points-gift-cards.html', '기프트카드와 포인트 조건'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play Points 캠페인 미적용 확인',
    description: 'Google Play Points 2배, 3배 캠페인 보너스가 적용되지 않았다고 느낄 때 확인할 활성화, 기간, 대상 앱, 상한, 반영 시점 체크리스트입니다.',
    h1: 'Google Play Points 캠페인 미적용 확인',
    badge: '캠페인 확인',
    lead: '캠페인 보너스가 보이지 않을 때는 전체 포인트 누락인지, 일반 포인트와 보너스가 분리되어 있는지부터 확인해야 합니다.',
    intro: 'Google Play Points 캠페인은 “2배”, “3배”처럼 단순하게 보이지만 실제 조건은 더 세부적일 수 있습니다. 활성화가 필요했는지, 기간 안에 결제했는지, 대상 앱인지, 보너스 상한이 있는지에 따라 결과가 달라집니다. 이 글은 캠페인이 적용되지 않았다고 느낄 때 확인할 순서를 정리합니다.',
    sections: [
      ['일반 포인트와 보너스를 분리하기', ['먼저 기본 적립 포인트가 들어왔는지 확인하세요. 기본 포인트는 있는데 보너스만 없다면, 구매 추적 실패보다 캠페인 조건 문제일 가능성이 큽니다.', '계산기에서는 같은 금액을 1배와 캠페인 특별 적립률로 나누어 비교하세요. 두 결과의 차이가 바로 확인해야 할 보너스 영역입니다.']],
      ['캠페인 활성화 여부 확인하기', ['일부 캠페인은 보기만 해도 적용되는 것이 아니라, 참여 버튼을 누르거나 특정 화면에서 조건을 확인해야 할 수 있습니다. 캠페인 상세 화면에서 활성화 상태를 확인하세요.', '활성화 전에 결제한 구매가 나중에 자동으로 캠페인 대상이 된다고 기대하면 안 됩니다. 결제 시간과 캠페인 시작 시간을 나누어 보세요.']],
      ['기간, 앱, 상품 조건 확인하기', ['캠페인은 전체 Google Play 결제에 적용되는 것처럼 보여도 특정 앱, 게임, 상품, 결제 방식에 제한될 수 있습니다. 구독 갱신이나 프로모션 잔액 사용이 대상에서 빠질 수도 있습니다.', '영수증의 구매 시각, 상품명, 앱 이름을 캠페인 조건과 비교하세요. 조건을 하나씩 지우면 문의할 때도 설명이 쉬워집니다.']],
      ['보너스 상한과 반영 시점 보기', ['캠페인에는 최대 보너스 포인트나 계정별 제한이 있을 수 있습니다. 기대한 포인트보다 적게 보인다면 상한에 걸렸는지 확인하세요.', '또한 일반 포인트와 보너스가 같은 시점에 보이지 않을 수 있습니다. 구매 직후 잔액만 보고 결론을 내리지 말고 활동 내역을 함께 확인하세요.']],
      ['문의 전에 계산 결과를 정리하기', ['1배 예상치, 캠페인 특별 적립률 예상치, 실제 표시 포인트를 간단히 적어두면 원인을 좁히기 쉽습니다. 단, 주문번호와 결제 정보는 공개하지 마세요.', '모든 조건을 확인했는데도 보너스가 보이지 않는다면 공식 지원에 문의하세요. 계산기는 계정을 확인하거나 포인트를 반영시키는 도구가 아니라, 설명을 정리하기 위한 보조 도구입니다.']]
    ],
    faq: [
      ['2배 캠페인인데 정확히 두 배가 아닌 이유는 무엇인가요?', '대상 금액, 보너스 상한, 반영 시점, 구매 조건 때문에 기대와 다르게 보일 수 있습니다.'],
      ['캠페인 버튼을 누르지 않았으면 적용되지 않나요?', '캠페인마다 다릅니다. 활성화가 필요한 경우도 있으므로 상세 조건을 확인하세요.'],
      ['보너스가 없으면 바로 환불해야 하나요?', '바로 판단하지 말고 조건과 활동 내역을 확인한 뒤 결정하세요. 환불은 포인트에도 영향을 줄 수 있습니다.']
    ]
  },
  {
    file: 'ko/articles/google-play-points-country-differences.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    faqStructuredData: true,
    officialSourceTitle: 'Google Play 국가 변경 공식 안내',
    officialSourceBody: '국가 변경 가능 조건, Play 잔액, Play Points, 정기 결제에 미치는 영향은 Google 공식 도움말의 최신 안내를 확인하세요.',
    officialSourceHref: 'https://support.google.com/googleplay/answer/7431675?hl=ko',
    officialSourceLink: 'Google Play 국가 변경 도움말 보기',
    officialProgramLink: 'Google Play Points 프로그램 공식 안내',
    nextLinks: [
      ['/ko/articles/google-play-points-subscriptions.html', '국가 변경과 정기 결제 확인'],
      ['/ko/articles/google-play-points-not-showing.html', '포인트가 보이지 않을 때'],
      ['/ko/articles/google-play-points-levels.html', 'Play Points 등급 구조 이해'],
      ['/ko/status/platinum/', '플래티넘 필요 금액 계산'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play 국가 변경 시 Play Points는 어떻게 될까?',
    description: 'Google Play 국가를 변경할 때 Play Points, 등급, Play 잔액, 정기 결제에 생기는 변화를 공식 안내 기준으로 정리한 한국어 가이드입니다.',
    h1: 'Google Play 국가 변경 시 Play Points는 어떻게 될까?',
    badge: '국가 변경',
    lead: 'Google Play 국가를 바꾸면 기존 Play Points와 등급이 새 국가로 따라오지 않습니다. 이동 전에 잔액, 정기 결제, 가족 그룹까지 먼저 확인하세요.',
    intro: '국가 변경은 표시 통화만 바꾸는 설정이 아닙니다. Google 공식 안내에 따르면 변경 조건이 있고, 기존 Play Points와 등급, Play 잔액, 정기 결제가 서로 다른 방식으로 처리됩니다. 이 글은 이동 직전에 확인해야 할 항목을 결론부터 정리합니다.',
    sections: [
      ['결론: 포인트와 등급은 새 국가로 이전되지 않습니다', ['Google 공식 도움말은 Play 국가를 변경하면 기존 Play Points가 사라지고 등급도 새 국가로 이어지지 않는다고 안내합니다. 등급 달성을 위해 추가 결제를 계획하고 있다면 국가 변경 전에 멈추고 현재 계정 화면을 먼저 확인하세요.', '포인트로 교환한 일부 인앱 상품은 유지될 수 있지만, 쿠폰 등 일부 혜택은 사라질 수 있습니다. 포인트 잔액, 등급, 교환한 항목을 같은 것으로 취급하지 않는 것이 중요합니다.']],
      ['국가 변경 조건부터 확인하세요', ['공식 안내상 국가 변경 사이에는 최소 90일이 필요하며, 새 국가에 실제로 있어야 하고 그 국가에서 사용할 수 있는 결제수단이 필요합니다. Google 가족 그룹 구성원은 국가를 변경할 수 없습니다.', '조건을 충족해도 새 결제 프로필이 앱에 반영되기까지 최대 48시간 걸릴 수 있습니다. 급하게 재결제하기보다 현재 Play 국가와 결제 프로필이 바뀌었는지 먼저 확인하세요.']],
      ['기존 Play 잔액은 새 국가에서 사용할 수 없습니다', ['이전 국가의 Google Play 잔액은 새 국가에서 사용할 수 없지만 기존 국가와 연결된 상태로 남습니다. 국가를 다시 바꾸기 위해 결제하거나 잔액을 억지로 소진할 필요는 없습니다.', '통화, 기프트카드, 프로모션 잔액은 지역 조건이 강합니다. 다른 국가의 잔액을 새 국가의 구매 예산처럼 계산기에 넣지 마세요.']],
      ['정기 결제는 자동으로 새 프로필로 이동하지 않습니다', ['기존 정기 결제는 취소하지 않는 한 이전 결제 프로필에서 계속될 수 있습니다. 새 국가에서 제공되지 않는 앱이나 콘텐츠라면 이용 가능 여부가 달라질 수도 있습니다.', '각 구독의 다음 결제일, 결제수단, 제공 국가를 따로 확인하세요. 새 국가에서 다시 가입하기 전에는 기존 구독이 중복으로 살아 있지 않은지 확인하는 것이 안전합니다.']],
      ['변경 전 체크리스트', ['Play Points 잔액과 등급, 교환하지 않은 쿠폰, Play 잔액, 활성 정기 결제, 가족 그룹 가입 여부를 한 화면씩 기록하세요. 중요한 화면은 개인 보관용으로만 캡처하고 주문번호는 공개하지 마세요.', '변경 후 포인트가 보이지 않는다면 같은 계정인지, 국가 변경이 완료되었는지, 구매가 어느 결제 프로필에서 처리되었는지 순서대로 확인하세요. 계산기는 예상 비교용이며 계정의 실제 이전 상태를 확인할 수 없습니다.']]
    ],
    faq: [
      ['국가를 바꾸면 Play Points를 유지할 수 있나요?', '공식 안내상 기존 포인트는 사라지고 등급도 새 국가로 이전되지 않습니다. 변경 전 최신 안내를 다시 확인하세요.'],
      ['기존 정기 결제는 자동으로 새 국가로 옮겨지나요?', '아니요. 취소하지 않으면 이전 결제 프로필에서 계속될 수 있으므로 각 구독을 따로 확인해야 합니다.'],
      ['국가 변경 직후 화면이 바뀌지 않으면 어떻게 하나요?', '반영에 최대 48시간 걸릴 수 있습니다. 현재 국가와 결제 프로필을 확인하고 중복 결제는 피하세요.']
    ]
  },
  {
    file: 'ko/articles/google-play-points-subscriptions.html',
    jaAlternate: '/articles/2025-12-25-subscription.html',
    lang: 'ko',
    siteName: 'Google Play Points 계산기',
    labels: ARTICLE_LABELS.ko,
    ctaHref: '/ko/',
    faqStructuredData: true,
    officialSourceTitle: '정기 결제 Play Points 공식 안내',
    officialSourceBody: '정기 결제 적립과 일회성 보너스는 국가, 계정, 프로모션 조건에 따라 달라질 수 있으므로 Google 공식 도움말을 함께 확인하세요.',
    officialSourceHref: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DKR&hl=ko',
    officialSourceLink: 'Google Play Points 적립 공식 안내 보기',
    officialProgramLink: 'Google Play Points 프로그램 공식 안내',
    nextLinks: [
      ['/ko/articles/google-play-points-country-differences.html', '국가 변경 시 포인트와 구독'],
      ['/ko/articles/google-play-points-promotion-not-applied.html', '캠페인 보너스가 적용되지 않을 때'],
      ['/ko/articles/google-play-points-not-showing.html', '포인트가 보이지 않을 때'],
      ['/ko/campaign/2x/', '2배 캠페인 계산'],
      ['/author/katakata.html', '운영 및 검증 방침']
    ],
    title: 'Google Play 정기 결제도 Play Points가 적립될까?',
    description: 'Google Play 정기 결제의 Play Points 적립, 첫 구독 보너스, 갱신, 계정과 국가 변경 조건을 확인하는 한국어 가이드입니다.',
    h1: 'Google Play 정기 결제도 Play Points가 적립될까?',
    badge: '정기 결제',
    lead: 'Google Play를 통해 처리되는 대상 정기 결제는 일반 등급 적립률로 포인트가 쌓일 수 있습니다. 첫 구독 보너스와 매월 갱신 적립은 따로 확인하세요.',
    intro: '정기 결제는 한 번의 구매와 달리 자동 갱신, 체험 전환, 첫 가입 보너스, 국가 변경이 겹칠 수 있습니다. 따라서 “구독이면 모두 몇 배”라고 계산하기보다 결제 계정, Google Play 주문 기록, 프로모션 조건을 나누어 보는 것이 안전합니다.',
    sections: [
      ['결론: 대상 정기 결제는 일반 적립 대상이 될 수 있습니다', ['Google 공식 도움말은 앱을 통해 이루어진 정기 결제가 일반 등급 적립률로 포인트를 받을 수 있다고 안내합니다. 단, 결제가 Google Play에서 처리되었는지와 해당 국가·계정에서 적립 대상인지가 먼저입니다.', '앱 회사 웹사이트나 다른 결제 서비스에서 가입한 구독은 Google Play 주문과 다를 수 있습니다. 이메일 영수증과 Play 구매 내역에서 실제 결제 경로를 확인하세요.']],
      ['첫 정기 결제 보너스는 반복 적립이 아닙니다', ['첫 정기 결제에 추가 포인트가 표시되는 프로모션은 일반적으로 최초 한 번만 적용되는 조건을 가질 수 있습니다. 매월 같은 보너스가 반복된다고 가정하면 예상치가 크게 부풀어집니다.', '기본 적립과 첫 가입 보너스를 두 줄로 분리하세요. 계산기에서는 먼저 1배 기준을 보고, 공식 화면에 명확한 배율이 있을 때만 캠페인 값을 비교하세요.']],
      ['체험 종료와 자동 갱신 시점을 확인하세요', ['무료 체험 시작일과 실제 유료 결제일은 다를 수 있습니다. 포인트를 확인할 때는 체험을 시작한 날보다 Google Play 주문이 실제로 완료된 날을 기준으로 보는 편이 정확합니다.', '갱신이 보류, 실패, 취소 또는 환불된 경우 포인트 결과도 달라질 수 있습니다. 잔액만 보지 말고 Play Points 활동과 주문 상태를 함께 확인하세요.']],
      ['계정과 국가를 바꾸면 구독 흐름이 복잡해집니다', ['포인트는 결제한 계정 기준으로 확인해야 합니다. 여러 Google 계정을 쓰는 기기라면 구독 관리 화면, 영수증 계정, Play Points 화면의 계정이 같은지 먼저 맞추세요.', 'Play 국가를 변경해도 기존 구독은 이전 결제 프로필에서 계속될 수 있습니다. 새 국가에서 다시 가입하기 전에 기존 구독과 다음 결제일을 확인해 중복 결제를 피하세요.']],
      ['월 지출 계획은 포인트보다 먼저 정하세요', ['정기 결제는 자동으로 반복되기 때문에 등급 달성을 위해 새 구독을 추가하면 작은 금액이 계속 쌓일 수 있습니다. 원래 사용할 서비스인지, 해지 예정일을 기억할 수 있는지, 연간 비용이 감당 가능한지부터 확인하세요.', 'Play Points는 부가 혜택입니다. 포인트 가치가 사용하지 않는 구독료를 상쇄한다고 가정하지 말고, 이미 필요한 구독의 결제 시점과 조건을 정리하는 데 계산기를 사용하세요.']]
    ],
    faq: [
      ['모든 정기 결제가 Play Points 대상인가요?', '그렇게 단정할 수 없습니다. Google Play 처리 여부와 국가·계정의 공식 적립 조건을 확인하세요.'],
      ['첫 구독 보너스가 매월 반복되나요?', '대개 최초 한 번 조건일 수 있습니다. 일반 적립과 프로모션 보너스를 분리해 확인하세요.'],
      ['국가를 바꾸면 기존 구독은 자동으로 이동하나요?', '아니요. 이전 결제 프로필에서 계속될 수 있으므로 중복 가입 전에 구독 상태를 확인하세요.']
    ]
  },
];

const TW_ARTICLES = [
  {
    file: 'tw/articles/google-play-points-not-showing.html',
    jaAlternate: '/articles/2026-03-10-play-points-reflection-timing.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    faqStructuredData: true,
    officialSourceTitle: 'Play Points 問題排解官方說明',
    officialSourceBody: '請在 Google 官方問題排解說明確認付款帳號、點數活動、家庭付款與國家/地區變更的影響。',
    officialSourceHref: 'https://support.google.com/googleplay/answer/9077247?hl=zh-Hant',
    officialSourceLink: '查看 Play Points 問題排解說明',
    officialProgramLink: 'Google Play Points 方案官方說明',
    nextLinks: [
      ['/tw/status/platinum/', '白金等級需要多少'],
      ['/tw/status/diamond/', '鑽石等級需要多少'],
      ['/tw/campaign/2x/', '2 倍活動計算'],
      ['/tw/articles/google-play-points-levels.html', 'Play Points 等級說明'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: 'Google Play Points 沒有顯示時要確認什麼',
    description: '當 Google Play Points 沒有顯示時，依序確認帳號、購買紀錄、適用資格、活動條件、退款與地區差異的繁體中文指南。',
    h1: 'Google Play Points 沒有顯示時要確認什麼',
    badge: '問題確認',
    lead: '如果 Play Points 沒有顯示，不要只看最後餘額。先依序確認帳號、購買紀錄、適用資格、活動條件與地區差異。',
    intro: '點數沒有出現時，很容易直覺認為系統壞了。但實際上常見原因是帳號不同、付款尚未完成、購買不符合資格，或只有活動加碼尚未反映。這篇指南的目的不是催你再買一次，而是幫你把檢查順序整理清楚，避免一直刷新同一個畫面卻忽略真正原因。',
    sections: [
      ['1. 先確認付款使用的 Google 帳號', ['打開 Google Play 後，先看右上角帳號圖示。Play Points 是依帳號管理，如果購買發生在另一個 Gmail 帳號，目前帳號的點數餘額就不會變動。', '家人共用裝置、舊手機、工作設定檔都可能造成帳號混淆。請先比對收據帳號與 Play Points 畫面，再判斷是否真的少了點數。']],
      ['2. 查看購買是否符合點數資格', ['不是每一種付款流程都會照直覺累積點數。試用期、訂閱轉換、促銷餘額、禮物卡付款、退款或部分取消，都需要分開確認。', '先看訂單狀態是否完成。如果購買本身不符合資格，計算機估算再漂亮，也不會讓實際點數出現。']],
      ['3. 把一般點數和活動加碼分開看', ['2 倍或 3 倍活動可能有限定 App、付款方式、期間、啟用步驟或加碼上限。一般點數有出現但加碼沒有出現時，問題可能是活動條件，而不是整筆購買沒有被追蹤。', '可以先用 1 倍估算基準，再用你認為適用的倍率比較。兩個結果之間的差距，能幫你更清楚說明少的是哪一部分。']],
      ['4. 地區與帳號規則要以官方畫面為準', ['繁體中文使用者可能會看到日本、韓國或英文頁面的資訊。這些內容可以參考檢查方法，但最終條件仍要以自己帳號所在的 Google Play App 顯示為準。', '付款地區、Google Play 國家設定、活動提供地區不同，都可能讓同樣的購買看起來有不同結果。不要只靠其他地區的截圖做決定。']],
      ['5. 詢問支援前先整理短資料', ['如果帳號、訂單、活動條件都確認過，仍然沒有看到預期點數，再整理購買日期、商品名稱、活動名稱、預期點數與實際顯示結果。', '訂單編號和付款資訊不要放在公開貼文中。把資訊保留給官方支援，並用簡短清楚的方式說明你已經確認過哪些項目。']]
    ],
    faq: [
      ['點數可以轉到另一個帳號嗎？', '不要這樣假設。Play Points 通常依帳號管理，應先確認購買帳號是否正確。'],
      ['一般點數有出現，但活動加碼沒有出現正常嗎？', '有可能。活動加碼可能有不同條件或處理時間。'],
      ['可以再買一次測試嗎？', '不建議。先確認既有購買與活動條件，不要為了測試而增加不必要消費。']
    ]
  },
  {
    file: 'tw/articles/google-play-points-levels.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    nextLinks: [
      ['/tw/status/platinum/', '白金等級需要多少'],
      ['/tw/status/diamond/', '鑽石等級需要多少'],
      ['/tw/amount/10000/', '10,000 日圓點數估算'],
      ['/tw/articles/google-play-points-not-showing.html', '點數沒有顯示時'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: 'Google Play Points 等級說明',
    description: '了解 Google Play Points 銅、銀、金、白金、鑽石等級，並用不過度消費的方式評估升級或維持等級。',
    h1: 'Google Play Points 等級說明',
    badge: '等級規劃',
    lead: 'Play Points 等級只有在回饋符合你的實際使用時才有意義。追白金或鑽石前，先比較剩餘點數、平常消費與活動條件。',
    intro: '等級名稱看起來像目標，但真正需要判斷的是下一級是否值得。你是否真的會用到回饋？需要的金額是否高於原本消費？活動條件是否確定適用？這篇文章把等級當作規劃工具，而不是鼓勵為了徽章硬買。',
    sections: [
      ['等級是比較框架，不是必買目標', ['銅、銀、金、白金、鑽石可以幫你理解回饋率與福利，但等級越高不代表一定更划算。實際價值取決於你是否會使用那些回饋。', '不同國家、地區或帳號看到的活動與獎勵可能不同。請把等級當作下一步比較的標籤，而不是今天一定要達成的目標。']],
      ['規劃時看剩餘點數，而不是累積總數', ['想估算升級成本時，最重要的是距離目標還差多少點。若把目前餘額、已使用點數或累積總數混在一起，估算很容易偏離。', '使用計算機時，請輸入還需要的點數，再調整目前等級與活動特別獲點率。這樣比較接近實際決策。']],
      ['把總金額拆成每週或每月節奏', ['一個很大的總額會讓人判斷失真。把它除以剩餘週數或月份後，就能看出是否符合平常的 App、遊戲、訂閱或書籍消費。', '如果每月需要增加的金額明顯高於平常，這本身就是答案。維持目前等級或等待原本就要買的項目，可能比追等級更合理。']],
      ['活動特別獲點率可以改變時機，但不能替你決定', ['2 倍或 3 倍活動可能很有幫助，但只有符合資格的購買才適合拿來估算。活動適合調整原本就要買的時間，不適合創造新的不必要消費。', '先看 1 倍基準，再看活動特別獲點率。如果計畫只有在狹窄活動條件下才勉強成立，購買前就要更保守。']],
      ['海外資料只拿來參考結構', ['PlayPoint 有日文、英文、韓文與繁體中文頁面，但官方條件仍由你所在地區的 Google Play App 決定。跨語言內容可以幫你理解檢查順序，不能取代官方畫面。', '內部連結的目的，是讓你從等級、活動、缺點數問題之間順著查下去，而不是讓頁面變成強烈推銷。最好的結果是少一點衝動，多一點確定性。']]
    ],
    faq: [
      ['鑽石一定比白金值得嗎？', '不一定。要看你是否真的使用額外回饋，以及是否能在不過度消費的情況下維持。'],
      ['台灣、日本、韓國條件都一樣嗎？', '不能這樣假設。活動、獎勵與適用條件可能因地區不同。'],
      ['應該先計算哪個目標？', '先算最近的下一個等級。如果最近目標已經太吃力，更高等級通常更不實際。']
    ]
  },
  {
    file: 'tw/articles/google-play-points-gift-cards.html',
    jaAlternate: '/articles/2025-12-25-gift-card.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    officialSourceTitle: 'Google Play 禮物卡提供國家與限制',
    officialSourceBody: '官方清單目前未列出台灣。禮物卡只能在購買時的國家與幣別使用，帳戶國家也必須相符。',
    officialSourceHref: 'https://support.google.com/googleplay/answer/3422734?hl=zh-Hant',
    officialSourceLink: '查看 Google Play 禮物卡官方清單',
    officialProgramLink: 'Google Play Points 方案官方說明',
    nextLinks: [
      ['/tw/amount/10000/', '10,000 日圓點數估算'],
      ['/tw/campaign/wait/', '活動等待判斷'],
      ['/tw/articles/google-play-points-levels.html', 'Play Points 等級說明'],
      ['/tw/articles/google-play-points-promotion-not-applied.html', '活動加碼沒有套用時'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: 'Google Play Points 禮物卡條件',
    description: 'Google 官方禮物卡提供國家清單目前未列出台灣。說明台灣帳戶在購買序號前應確認的國家、幣別與 Play Points 條件。',
    h1: 'Google Play Points 禮物卡條件',
    badge: '禮物卡確認',
    lead: 'Google 官方提供國家清單目前未列出台灣。先確認序號是否適用帳戶國家，再分開判斷 Play Points。',
    intro: '截至本次更新，Google 官方的禮物卡提供國家清單未列出台灣。不要因網路商店出現序號，就假設台灣帳戶可以兌換；先確認官方提供狀態、發行國家與幣別，再判斷 Play Points。',
    sections: [
      ['先把折扣和點數分成兩欄', ['禮物卡折扣是降低實際成本，Play Points 則取決於 Google Play 內的消費是否符合條件。若把兩者直接加總，容易得到過度樂觀的結果。', '建議先記錄禮物卡折扣，再用計算機估算該筆 Google Play 消費可能獲得的點數。這樣可以知道哪一部分是省錢，哪一部分是等級進度。']],
      ['購買禮物卡和使用餘額不是同一時點', ['有些人以為買禮物卡時就會拿到 Play Points，也有人以為使用餘額時才會累積。實際規則可能依地區、帳號與付款流程而不同。', '如果禮物卡是在 Google Play 以外的商店購買，請更小心區分商店給的回饋與 Google Play App 內的點數紀錄。']],
      ['搭配活動特別獲點率時要看細則', ['2 倍或 3 倍活動可能限定特定 App、日期、付款方式、啟用步驟或加碼上限。使用禮物卡餘額不代表所有活動都會自動套用。', '請先用 1 倍估算基準，再確認活動是否明確適用該筆購買。只有條件確定時，才用活動特別獲點率比較。']],
      ['台灣帳戶先確認官方提供狀態', ['Google 官方清單目前未將台灣列為 Google Play 禮物卡提供國家。其他國家購買的序號受發行國家與幣別限制，帳戶國家也必須相符。', '日文或英文頁面可以幫助理解限制，但不能證明外國序號可用於台灣帳戶。請以官方清單和自己帳戶的 Google Play App 顯示為準。']],
      ['不要為了折扣買超過需要的金額', ['禮物卡折扣看起來划算，但如果買了短期內用不到的餘額，資金被鎖住就不一定是好事。為了等級而多買，也可能讓實際回饋不如預期。', '最安全的做法是從原本就打算購買的 App、遊戲或訂閱開始，再檢查禮物卡與活動是否剛好適用。']]
    ],
    faq: [
      ['台灣帳戶可以使用其他國家的禮物卡嗎？', '不要這樣假設。禮物卡只能在購買時的國家與幣別使用，帳戶國家也必須相符；官方提供國家清單目前未列出台灣。'],
      ['禮物卡可以搭配 2 倍活動嗎？', '可能可以，也可能不行。請看活動是否限制付款方式或適用項目。'],
      ['折扣要怎麼放進計算機？', '計算機用來估點數；折扣則建議另外記錄成實際成本，兩者分開比較。']
    ]
  },
  {
    file: 'tw/articles/google-play-points-promotion-not-applied.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    faqStructuredData: true,
    officialSourceTitle: 'Google Play 促銷活動官方說明',
    officialSourceBody: '促銷活動提供與資格可能因帳號活動、設定、國家/地區與個別條款不同，請確認官方說明。',
    officialSourceHref: 'https://support.google.com/googleplay/answer/15698521?hl=zh-Hant',
    officialSourceLink: '查看 Google Play 促銷活動說明',
    officialProgramLink: 'Google Play Points 方案官方說明',
    nextLinks: [
      ['/tw/campaign/2x/', '2 倍活動計算'],
      ['/tw/campaign/3x/', '3 倍活動計算'],
      ['/tw/articles/google-play-points-not-showing.html', '點數沒有顯示時'],
      ['/tw/articles/google-play-points-gift-cards.html', '禮物卡與點數條件'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: 'Google Play Points 活動未套用確認',
    description: '當 Google Play Points 2 倍或 3 倍活動加碼沒有套用時，確認啟用、期間、適用 App、上限與反映時間的繁體中文清單。',
    h1: 'Google Play Points 活動未套用確認',
    badge: '活動確認',
    lead: '活動加碼沒有出現時，先分清楚是整筆點數沒有顯示，還是一般點數和加碼點數的條件不同。',
    intro: 'Google Play Points 活動常以 2 倍、3 倍呈現，但實際上可能有啟用、日期、指定 App、付款方式、加碼上限等條件。當你覺得活動沒有套用時，最重要的是不要立刻再次購買，而是把一般點數、活動加碼和官方條件拆開確認。',
    sections: [
      ['先看一般點數是否已出現', ['如果一般點數有出現，但活動加碼沒有出現，問題可能不是整筆購買失敗，而是活動條件或反映時間不同。', '用計算機先估 1 倍結果，再估 2 倍或 3 倍結果。兩者差額就是你要追蹤的活動加碼部分。']],
      ['確認活動是否需要啟用', ['有些活動需要先點擊參加或在指定頁面啟用，並不是看到活動頁就一定自動套用。請回到 Google Play App 內確認活動狀態。', '如果購買發生在啟用之前，後續通常不能直接假設會補套用。購買時間和活動開始時間要分開看。']],
      ['檢查期間、App 與付款條件', ['活動可能只適用特定 App、遊戲、商品、期間或付款方式。訂閱續約、試用轉付費、促銷餘額或禮物卡餘額，也可能需要特別確認。', '把收據上的購買日期、商品名稱和活動條件對照，可以更快排除不適用的原因。']],
      ['注意加碼上限與反映時間', ['活動可能有帳號上限或最高加碼點數。如果實際點數比預期少，請確認是否已達上限。', '另外，一般點數與活動加碼可能不是同時出現在畫面上。只看購買後的瞬間餘額，容易太早下結論。']],
      ['詢問支援前整理計算與證據', ['如果條件都符合，仍看不到加碼，請整理購買日期、活動名稱、預期倍率、1 倍估算、活動特別獲點率估算與實際顯示點數。', '訂單編號與付款資訊不要公開。計算機不能替帳號補點數，但能讓你把問題說得更清楚。']]
    ],
    faq: [
      ['為什麼 2 倍活動不是剛好兩倍？', '可能受到適用金額、加碼上限、活動條件或反映時間影響。'],
      ['沒有先啟用活動就購買，還會套用嗎？', '活動規則不同，不能保證。請以 Google Play App 內的條件為準。'],
      ['活動沒套用應該立刻退款嗎？', '不要只因短時間沒有看到加碼就立刻判斷。先確認條件與活動紀錄，退款也可能影響點數。']
    ]
  },
  {
    file: 'tw/articles/google-play-points-country-differences.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    faqStructuredData: true,
    officialSourceTitle: 'Google Play 國家/地區變更官方說明',
    officialSourceBody: '變更條件、Play 餘額、Play Points 與訂閱受到的影響，請以 Google 官方說明的最新內容為準。',
    officialSourceHref: 'https://support.google.com/googleplay/answer/7431675?hl=zh-Hant',
    officialSourceLink: '查看 Google Play 國家/地區變更說明',
    officialProgramLink: 'Google Play Points 方案官方說明',
    nextLinks: [
      ['/tw/articles/google-play-points-subscriptions.html', '國家/地區變更與訂閱'],
      ['/tw/articles/google-play-points-not-showing.html', '點數沒有顯示時'],
      ['/tw/articles/google-play-points-levels.html', 'Play Points 等級說明'],
      ['/tw/status/platinum/', '白金等級需要多少'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: '變更 Google Play 國家/地區後，Play Points 會怎樣？',
    description: '依 Google 官方說明整理變更 Play 國家/地區時，Play Points、等級、Play 餘額與訂閱會發生的變化。',
    h1: '變更 Google Play 國家/地區後，Play Points 會怎樣？',
    badge: '國家/地區變更',
    lead: '變更 Google Play 國家/地區後，既有 Play Points 與等級不會移到新地區。操作前請先確認餘額、訂閱與家庭群組。',
    intro: '變更國家/地區不只是切換顯示幣別。Google 官方說明列出變更資格，而且 Play Points、等級、Play 餘額與訂閱會用不同方式處理。這篇指南先講結果，再提供操作前的檢查順序。',
    sections: [
      ['結論：點數與等級不會移到新地區', ['Google 官方說明指出，變更 Play 國家/地區後，既有 Play Points 會失去，等級也不會帶到新地區。如果你正為了升級而增加消費，請先停下來確認目前帳號畫面。', '已用點數兌換的部分 App 內項目可能保留，但某些優惠券可能失效。不要把點數餘額、等級與已兌換內容當成同一種資產。']],
      ['先確認是否符合變更資格', ['官方說明表示，兩次變更之間至少要相隔 90 天，你必須位於新地區並擁有當地可用的付款方式。Google 家庭群組成員無法直接變更 Play 國家/地區。', '符合條件後，新付款資料可能需要最長 48 小時才會反映。畫面沒有立即更新時，先確認目前國家與付款資料，不要急著重複購買。']],
      ['舊地區的 Play 餘額無法在新地區使用', ['舊地區的 Google Play 餘額不能在新地區使用，但會繼續連結在舊地區。不要把這筆餘額直接換算成新地區可用的購買預算。', '禮物卡、促銷餘額與幣別都有明顯地區限制。為了清空餘額而臨時消費，也不一定比保留更划算。']],
      ['既有訂閱不會自動轉到新付款資料', ['未取消的既有訂閱可能繼續使用舊付款資料扣款。若內容在新地區沒有提供，使用方式也可能改變。', '請逐一查看下一次扣款日、付款方式與服務提供地區。在新地區重新訂閱前，先避免舊訂閱仍在運作造成重複付款。']],
      ['變更前檢查清單', ['記錄 Play Points 餘額與等級、尚未使用的優惠券、Play 餘額、有效訂閱，以及是否加入家庭群組。畫面截圖只供自己保存，不要公開訂單編號。', '變更後若點數沒有顯示，依序確認 Google 帳號、國家/地區是否已更新，以及購買使用哪個付款資料。計算器只能協助比較，無法讀取帳號的實際移轉狀態。']]
    ],
    faq: [
      ['變更國家/地區後可以保留 Play Points 嗎？', '依官方說明，既有點數會失去，等級也不會移轉。操作前請再次確認最新規則。'],
      ['原本的訂閱會自動移到新地區嗎？', '不會。訂閱可能繼續使用舊付款資料，請逐項確認。'],
      ['變更後畫面沒有立刻更新怎麼辦？', '付款資料可能需要最長 48 小時反映。先確認設定並避免重複付款。']
    ]
  },
  {
    file: 'tw/articles/google-play-points-subscriptions.html',
    jaAlternate: '/articles/2025-12-25-subscription.html',
    lang: 'zh-TW',
    siteName: 'Google Play Points 計算器',
    labels: ARTICLE_LABELS.tw,
    ctaHref: '/tw/',
    faqStructuredData: true,
    officialSourceTitle: '訂閱 Play Points 官方說明',
    officialSourceBody: '訂閱累積與首次訂閱加碼可能因地區、帳號與活動條件不同，請一併確認 Google 官方說明。',
    officialSourceHref: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DTW&hl=zh-Hant',
    officialSourceLink: '查看 Play Points 累積官方說明',
    officialProgramLink: 'Google Play Points 方案官方說明',
    nextLinks: [
      ['/tw/articles/google-play-points-country-differences.html', '國家/地區變更時的點數與訂閱'],
      ['/tw/articles/google-play-points-promotion-not-applied.html', '活動加碼沒有套用時'],
      ['/tw/articles/google-play-points-not-showing.html', '點數沒有顯示時'],
      ['/tw/campaign/2x/', '2 倍活動計算'],
      ['/author/katakata.html', '營運與驗證方針']
    ],
    title: 'Google Play 訂閱也會累積 Play Points 嗎？',
    description: '整理 Google Play 訂閱的 Play Points 累積、首次訂閱加碼、續訂、帳號與國家/地區變更條件。',
    h1: 'Google Play 訂閱也會累積 Play Points 嗎？',
    badge: '訂閱',
    lead: '透過 Google Play 處理且符合資格的訂閱，可依一般等級回饋率累積點數。首次訂閱加碼與每月續訂要分開確認。',
    intro: '訂閱會遇到自動續訂、試用轉付費、首次加入加碼與國家/地區變更，因此不能只用「訂閱都是幾倍」來估算。請分開檢查付款帳號、Google Play 訂單與活動條件。',
    sections: [
      ['結論：符合資格的訂閱可按一般回饋率累積', ['Google 官方說明提到，透過 App 進行的訂閱可依一般等級回饋率取得點數。前提是付款由 Google Play 處理，而且該地區與帳號符合累積資格。', '如果是在服務商網站或其他付款平台訂閱，可能不會成為 Google Play 訂單。請比對電子收據與 Play 購買紀錄。']],
      ['首次訂閱加碼不是每月重複加碼', ['畫面若顯示首次訂閱額外點數，通常可能有僅限首次一次的條件。把這項加碼套用到每個月，會讓預估結果明顯偏高。', '請把一般回饋與首次加碼分成兩列。計算時先看 1 倍基準，只有官方畫面明確顯示倍率時才加入活動比較。']],
      ['確認試用結束與實際扣款時間', ['免費試用開始日不一定是點數產生的日期。檢查時應以 Google Play 訂單實際完成的付費日期為準。', '續訂若處於保留、付款失敗、取消或退款狀態，點數也可能受到影響。不要只看總餘額，請一起查看 Play Points 活動與訂單狀態。']],
      ['帳號與國家/地區變更會讓流程更複雜', ['點數要在實際付款的 Google 帳號查看。使用多個帳號時，請確認訂閱管理、收據與 Play Points 畫面都是同一個帳號。', '變更 Play 國家/地區後，舊訂閱可能繼續使用原付款資料。重新加入前，先查看舊訂閱與下次扣款日，避免重複付款。']],
      ['先決定月支出，再考慮點數', ['訂閱會自動重複扣款。為了升級而新增用不到的服務，可能讓小額支出長期累積，遠高於獲得的點數價值。', 'Play Points 應是附加回饋。計算器適合整理原本就需要的訂閱，不適合用來合理化不會使用的月費。']]
    ],
    faq: [
      ['所有訂閱都會累積 Play Points 嗎？', '不能一概而論。請確認是否由 Google Play 處理，以及所在地區與帳號的官方資格。'],
      ['首次訂閱加碼會每月重複嗎？', '可能僅限首次一次。一般回饋與活動加碼要分開確認。'],
      ['變更國家/地區後，舊訂閱會自動移轉嗎？', '不會。舊訂閱可能繼續使用原付款資料，重新加入前要先確認。']
    ]
  },
];

const POINT_VALUE_100_ARTICLES = [
  {
    "badge": "US 100-point guide",
    "ctaHref": "/en/?points=100",
    "description": "Estimate US spending needed for 100 Google Play Points by level, then check why redemption value varies by reward, country, and account.",
    "faq": [
      [
        "Are 100 Google Play Points always worth $1?",
        "No. The reward catalog is not one universal cash exchange rate."
      ],
      [
        "How much do I spend for 100 points in the US?",
        "About $100 at Bronze before promotions and excluding tax. Higher levels need less eligible spend."
      ],
      [
        "Can I buy or cash out Play Points?",
        "No. Google says points cannot be purchased or converted to cash."
      ],
      [
        "Do taxes earn points?",
        "No. Google excludes taxes from the point calculation."
      ]
    ],
    "file": "en/articles/google-play-points-100-value.html",
    "h1": "How much are 100 Google Play Points worth?",
    "intro": "There are two questions behind “How much are 100 Google Play Points worth?” One is how much eligible spending can earn 100 points. The other is what those points can unlock. Country-specific earning rates and account-specific rewards make it important to keep earning cost and redemption value separate.",
    "jaAlternate": "/articles/2026-07-24-play-points-100-value.html",
    "lang": "en",
    "lead": "In the US, Bronze earns 1 point per $1 on eligible purchases, so 100 points usually means about $100 of eligible spend before promotions. Redemption value is a separate question.",
    "modifiedAt": "2026-07-24",
    "nextLinks": [
      [
        "/en/articles/google-play-points-levels.html",
        "Understand Play Points levels"
      ],
      [
        "/en/articles/google-play-points-not-showing.html",
        "Points not showing up"
      ],
      [
        "/en/campaign/2x/",
        "Compare a 2x promotion"
      ],
      [
        "/articles/2026-07-24-play-points-100-value.html",
        "Japanese 100-point guide"
      ],
      [
        "/author/katakata.html",
        "Editorial policy"
      ]
    ],
    "officialSourceBody": "Google confirms one point per $1 at Bronze in the US, item-level rounding, tax exclusion, and country-specific availability.",
    "officialSourceHref": "https://support.google.com/googleplay/answer/15776742?co=GENIE.CountryCode%3DUS&hl=en",
    "officialProgramLink": "Program availability and joining",
    "officialSourceLink": "Google Play Help: Earn Play Points in the US",
    "officialSourceTitle": "Official US earning rules",
    "publishedAt": "2026-07-24",
    "sections": [
      [
        "Short answer for US accounts",
        [
          "At the US Bronze base rate of 1 point per $1, earning 100 points takes about $100 of eligible pre-tax spending. A promotion or higher status can reduce that estimate.",
          "100 points are not cash and cannot be converted to cash. Their use value depends on the rewards actually shown in your Google Play account."
        ]
      ],
      [
        "Spending needed at each US level",
        [
          "Using current US base rates, the rough spend for 100 points is: Bronze $100 at 1 point per $1; Silver about $90.91 at 1.1; Gold about $83.34 at 1.2; Platinum about $71.43 at 1.4; Diamond $62.50 at 1.6.",
          "Google calculates points for each item and rounds to the nearest whole point. Taxes are excluded, so several small purchases can differ from a simple total-spend division."
        ]
      ],
      [
        "Why the redemption value is not fixed",
        [
          "Play Points can be used for in-app items, coupons, Play credit, or partner offers when available. The catalog and exchange requirements can differ by country and account.",
          "Open Google Play, choose Play Points, then Use. Check expiry dates, minimum purchases, and app restrictions before treating a reward as savings."
        ]
      ],
      [
        "How promotions change the estimate",
        [
          "At Bronze, an eligible 2x offer can reduce the rough spend for 100 points from $100 to $50, and a 3x offer to about $33.34. This only works when the offer applies to that item and account.",
          "Run the calculator at 1x first. Then read the activation step, cap, and end date instead of buying only to reach a round point balance."
        ]
      ],
      [
        "Checks before relying on the number",
        [
          "Confirm that the purchase is made after joining Play Points, on the enrolled account, and is eligible in the US. The purchase screen and points history are more authoritative than an estimate.",
          "If your billing country is not the US, use the local rate shown in Google Play rather than the dollar examples on this page."
        ]
      ]
    ],
    "siteName": "Google Play Points Calculator",
    "title": "How much are 100 Google Play Points worth?"
  },
  {
    "badge": "한국 100포인트 가이드",
    "ctaHref": "/ko/?points=100",
    "description": "한국에서 Google Play Points 100포인트를 모으는 데 필요한 결제액을 등급별로 계산하고, 100포인트의 사용 가치가 고정 현금가가 아닌 이유를 설명합니다.",
    "faq": [
      [
        "100포인트는 항상 1,000원 가치인가요?",
        "그렇게 고정하면 안 됩니다. 리워드와 조건이 계정마다 다를 수 있습니다."
      ],
      [
        "한국에서 100포인트를 모으려면 얼마가 필요한가요?",
        "브론즈 기준 약 100,000원입니다."
      ],
      [
        "포인트를 현금으로 바꿀 수 있나요?",
        "아니요."
      ],
      [
        "세금도 계산에 포함되나요?",
        "아니요. 세금은 제외됩니다."
      ]
    ],
    "file": "ko/articles/google-play-points-100-value.html",
    "h1": "Google Play Points 100포인트는 얼마일까요?",
    "intro": "“100포인트는 얼마인가요?”에는 두 가지 뜻이 섞여 있습니다. 모으는 데 필요한 결제액과 어떤 리워드로 바꿀 수 있는지는 다른 문제입니다. 한국 공식 적립률로 결제액을 계산하고, 사용 가치는 내 계정 화면에서 따로 확인합니다.",
    "jaAlternate": "/articles/2026-07-24-play-points-100-value.html",
    "lang": "ko",
    "lead": "한국 브론즈 기본 적립률은 1,000원당 1포인트이므로 100포인트는 약 100,000원의 대상 결제가 기준입니다. 사용하는 가치는 별도로 확인해야 합니다.",
    "modifiedAt": "2026-07-24",
    "nextLinks": [
      [
        "/ko/articles/google-play-points-levels.html",
        "Play Points 등급 구조"
      ],
      [
        "/ko/articles/google-play-points-not-showing.html",
        "포인트가 보이지 않을 때"
      ],
      [
        "/ko/campaign/2x/",
        "2배 캠페인 비교"
      ],
      [
        "/articles/2026-07-24-play-points-100-value.html",
        "일본어 100포인트 가이드"
      ],
      [
        "/author/katakata.html",
        "운영 및 검증 방침"
      ]
    ],
    "officialSourceBody": "Google 공식 안내에서 한국의 등급별 1,000원당 적립률을 확인할 수 있습니다.",
    "officialSourceHref": "https://play.google.com/intl/ko_ALL/about/playpoints/notifications/how-to-earn-points/",
    "officialProgramLink": "가입 및 제공 국가 확인",
    "officialSourceLink": "Google Play 공식: 포인트 적립 방법",
    "officialSourceTitle": "한국 공식 적립률",
    "publishedAt": "2026-07-24",
    "sections": [
      [
        "한국 계정 기준 짧은 답",
        [
          "브론즈는 대상 결제 1,000원당 1포인트이므로 100포인트의 기준은 약 100,000원입니다. 상위 등급이나 대상 프로모션이 있으면 예상 금액은 내려갑니다.",
          "100포인트는 현금이 아니며 현금으로 바꿀 수 없습니다. 실제 교환처에 따라 사용 가치가 달라집니다."
        ]
      ],
      [
        "등급별 100포인트 필요 금액",
        [
          "한국의 기본 적립률을 적용하면 브론즈 약 100,000원, 실버 약 90,910원, 골드 약 76,924원, 플래티넘 62,500원, 다이아몬드 50,000원입니다.",
          "기준 적립률은 1,000원당 브론즈 1, 실버 1.1, 골드 1.3, 플래티넘 1.6, 다이아몬드 2포인트입니다. 상품별 반올림과 세금 제외에 주의하세요."
        ]
      ],
      [
        "100포인트의 사용 가치 확인",
        [
          "Google Play 앱에서 프로필, Play Points, 사용 순서로 이동해 내 계정에 표시되는 리워드와 필요한 포인트를 확인하세요.",
          "쿠폰은 최소 결제 금액과 대상 앱을, 크레딧은 교환 조건과 유효기간을 확인하세요."
        ]
      ],
      [
        "2배·3배 캠페인일 때",
        [
          "브론즈에서 대상 2배 적립이면 약 50,000원, 3배라면 약 33,334원이 단순 기준입니다. 캠페인은 대상 앱, 기간, 참여 버튼, 상한을 가질 수 있습니다.",
          "먼저 1배 기준을 계산하고 내 계정에 표시된 적립률을 비교하세요. 예정에 없던 결제는 권하지 않습니다."
        ]
      ],
      [
        "숫자를 믿기 전 확인할 것",
        [
          "가입 이후 구매인지, 가입 계정으로 결제했는지, 한국 계정의 대상 상품인지 확인하세요. 결제 직전 예상 포인트와 구매 후 내역을 우선합니다.",
          "한국 외 결제 프로필이라면 이 원화 예시 대신 해당 국가 앱의 적립률을 사용하세요."
        ]
      ]
    ],
    "siteName": "Google Play Points 계산기",
    "title": "Google Play Points 100포인트는 얼마일까요?"
  },
  {
    "badge": "台灣 100 點指南",
    "ctaHref": "/tw/?points=100",
    "description": "依台灣各等級積點率計算 Google Play Points 100 點所需消費，並說明 100 點沒有固定現金價值、兌換前應確認哪些條件。",
    "faq": [
      [
        "100 點一定等於 NT$30 嗎？",
        "不一定。點數不是固定現金匯率。"
      ],
      [
        "台灣累積 100 點要花多少？",
        "銅級約需 NT$3,000。"
      ],
      [
        "Play Points 可以換現金嗎？",
        "不可以。"
      ],
      [
        "稅金會累積點數嗎？",
        "不會，稅金不列入計算。"
      ]
    ],
    "file": "tw/articles/google-play-points-100-value.html",
    "h1": "Google Play Points 100 點要花多少？",
    "intro": "「100 點是多少？」可能是在問累積成本，也可能是在問兌換價值。台灣 Play Points 以每 NT$30 的等級積點率計算，但可兌換內容會依帳號顯示而不同。這篇文章把兩個問題拆開，避免把點數直接當現金。",
    "jaAlternate": "/articles/2026-07-24-play-points-100-value.html",
    "lang": "zh-TW",
    "lead": "台灣銅級基本積點率是每消費 NT$30 得 1 點，因此累積 100 點約需 NT$3,000 的適用消費；兌換價值則要分開查看。",
    "modifiedAt": "2026-07-24",
    "nextLinks": [
      [
        "/tw/articles/google-play-points-levels.html",
        "Play Points 等級說明"
      ],
      [
        "/tw/articles/google-play-points-not-showing.html",
        "點數沒有顯示時"
      ],
      [
        "/tw/campaign/2x/",
        "比較 2 倍活動"
      ],
      [
        "/articles/2026-07-24-play-points-100-value.html",
        "日文 100 點指南"
      ],
      [
        "/author/katakata.html",
        "營運與驗證方針"
      ]
    ],
    "officialSourceBody": "Google 官方說明列出台灣每 NT$30 的等級積點率、逐項四捨五入與稅金排除規則。",
    "officialSourceHref": "https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DTW&hl=zh-Hant",
    "officialProgramLink": "加入方式與適用地區",
    "officialSourceLink": "Google Play 說明：台灣等級與福利",
    "officialSourceTitle": "台灣官方積點率",
    "publishedAt": "2026-07-24",
    "sections": [
      [
        "台灣帳號的簡短答案",
        [
          "銅級每消費 NT$30 可得 1 點，所以 100 點的基本消費估算約為 NT$3,000。較高等級或符合資格的活動可以降低估算。",
          "100 點不是現金，也不能兌換成現金。實際使用價值取決於帳號中顯示的獎勵。"
        ]
      ],
      [
        "各等級累積 100 點的估算",
        [
          "依台灣基本積點率，100 點約需：銅級 NT$3,000、銀級 NT$2,400、金級 NT$2,000、白金級約 NT$1,715、鑽石級 NT$1,500。",
          "每 NT$30 的積點率是銅級 1、銀級 1.25、金級 1.5、白金級 1.75、鑽石級 2 點。商品會逐項四捨五入，稅金不列入。"
        ]
      ],
      [
        "如何確認兌換價值",
        [
          "開啟 Google Play，依序進入個人資料、Play Points、使用，查看目前可以兌換什麼。",
          "折價券要確認適用 App、最低消費與期限；不同帳號的兌換目錄可能不同。"
        ]
      ],
      [
        "遇到 2 倍或 3 倍活動",
        [
          "銅級若有符合資格的 2 倍積點，100 點約需 NT$1,500；3 倍約需 NT$1,000。",
          "購買前先看是否需要啟用、限定 App、活動期間與上限。不要為了湊點增加不必要消費。"
        ]
      ],
      [
        "採用估算前的檢查",
        [
          "確認已加入 Play Points、使用正確帳號，且購買符合台灣區規則。結帳前預計點數與購買後記錄應優先於估算。",
          "若付款國家不是台灣，請改用該地區 App 顯示的積點率。"
        ]
      ]
    ],
    "siteName": "Google Play Points 計算器",
    "title": "Google Play Points 100 點要花多少？"
  }
];
POINT_VALUE_100_ARTICLES.forEach((article) => {
  if (article.lang === 'ko') article.labels = ARTICLE_LABELS.ko;
  if (article.lang === 'zh-TW') article.labels = ARTICLE_LABELS.tw;
});

const INTL_ARTICLE_DATES = {
  'en/articles/google-play-points-reflection-timing.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-not-showing.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-levels.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-platinum-diamond-cost.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-25' },
  'en/articles/google-play-points-gift-cards.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-country-differences.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-promotion-not-applied.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'en/articles/google-play-points-subscriptions.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'ko/articles/google-play-points-not-showing.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-24' },
  'ko/articles/google-play-points-levels.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'ko/articles/google-play-points-gift-cards.html': { publishedAt: '2026-07-10', modifiedAt: '2026-07-10' },
  'ko/articles/google-play-points-promotion-not-applied.html': { publishedAt: '2026-07-10', modifiedAt: '2026-07-24' },
  'tw/articles/google-play-points-not-showing.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-24' },
  'tw/articles/google-play-points-levels.html': { publishedAt: '2026-07-07', modifiedAt: '2026-07-10' },
  'tw/articles/google-play-points-gift-cards.html': { publishedAt: '2026-07-10', modifiedAt: '2026-07-25' },
  'tw/articles/google-play-points-promotion-not-applied.html': { publishedAt: '2026-07-10', modifiedAt: '2026-07-24' },
  'ko/articles/google-play-points-country-differences.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'ko/articles/google-play-points-subscriptions.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'tw/articles/google-play-points-country-differences.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'tw/articles/google-play-points-subscriptions.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'en/articles/google-play-points-100-value.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'ko/articles/google-play-points-100-value.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' },
  'tw/articles/google-play-points-100-value.html': { publishedAt: '2026-07-24', modifiedAt: '2026-07-24' }
};

const MANUAL_COMPARISON_ARTICLES = [
  {
    file: 'ko/articles/google-play-points-platinum-diamond-cost.html',
    lang: 'ko',
    title: 'Google Play Points 플래티넘과 다이아몬드 비교 | 필요 포인트·유지 금액',
    publishedAt: '2026-07-25',
    modifiedAt: '2026-07-25',
    manual: true
  },
  {
    file: 'tw/articles/google-play-points-platinum-diamond-cost.html',
    lang: 'zh-TW',
    title: 'Google Play Points 白金與鑽石比較｜點數、維持金額與福利',
    publishedAt: '2026-07-25',
    modifiedAt: '2026-07-25',
    manual: true
  }
];

const MANUAL_MAINTENANCE_PAGES = [
  { file: 'en/maintenance/platinum/index.html', modifiedAt: '2026-07-25' },
  { file: 'en/maintenance/diamond/index.html', modifiedAt: '2026-07-25' },
  { file: 'ko/maintenance/platinum/index.html', modifiedAt: '2026-07-25' },
  { file: 'ko/maintenance/diamond/index.html', modifiedAt: '2026-07-25' },
  { file: 'tw/maintenance/platinum/index.html', modifiedAt: '2026-07-25' },
  { file: 'tw/maintenance/diamond/index.html', modifiedAt: '2026-07-25' }
];

const INTL_ARTICLES = [
  ...[
    ...EN_ARTICLES,
    ...ADDITIONAL_EN_ARTICLES,
    ...KO_ARTICLES,
    ...TW_ARTICLES,
    ...POINT_VALUE_100_ARTICLES
  ].map((article) => {
    const configuredDates = INTL_ARTICLE_DATES[article.file];
    if (!configuredDates) throw new Error(`Missing dates for international article: ${article.file}`);
    const manualDates = readManualIntlArticleDates(projectRoot, article.file);
    return { ...article, ...configuredDates, ...(manualDates || {}) };
  }),
  ...MANUAL_COMPARISON_ARTICLES.map((article) => ({
    ...article,
    ...(readManualIntlArticleDates(projectRoot, article.file) || {})
  }))
];

const ARTICLE_HUB_CONTENT = {
  en: {
    title: 'Google Play Points guides',
    description: 'Browse Google Play Points guides about levels, point timing, promotions, gift cards, and country-specific checks.',
    eyebrow: 'Guide library',
    intro: 'Choose the rule that matches your situation. Each guide gives the answer first, then shows what to verify in Google Play.',
    priorityArticles: [
      ['/en/articles/google-play-points-cash-conversion.html', 'Can you cash out Google Play Points?'],
      ['/en/articles/google-play-points-expiration.html', 'When do Google Play Points expire?'],
      ['/en/articles/google-play-points-refund.html', 'What happens to Play Points after a refund?'],
      ['/en/articles/google-play-points-family-sharing.html', 'Can Play Points be shared with family?']
    ],
    extraModifiedAt: '2026-07-26',
    extraArticles: [
      ['/en/articles/2026-06-20-discount-gift-cards.html', 'Gift card discounts: checks before buying'],
      ['/en/articles/google-play-points-weekly-reward.html', 'Weekly Play Points rewards'],
      ['/en/articles/google-play-points-multiple-accounts.html', 'Play Points with multiple accounts'],
      ['/en/articles/google-play-points-use-coupons.html', 'How to use points and coupons'],
      ['/en/articles/google-play-points-join-eligibility.html', 'Eligibility and missing Join button'],
      ['/en/articles/google-play-points-coupon-not-applied.html', 'Coupon not applied'],
      ['/en/articles/google-play-points-play-credit-not-working.html', 'Play credit cannot be exchanged or used'],
      ['/en/articles/google-play-points-level-maintenance-reset.html', 'Level maintenance and yearly reset'],
      ['/en/maintenance/platinum/', 'Platinum maintenance calculator'],
      ['/en/maintenance/diamond/', 'Diamond maintenance calculator']
    ]
  },
  ko: {
    title: 'Google Play Points 가이드',
    description: '등급, 점수 반영, 캠페인, 기프트카드와 국가별 확인 사항을 다루는 Google Play Points 가이드 모음입니다.',
    eyebrow: '가이드 모음',
    intro: '지금 궁금한 규칙부터 선택하세요. 각 가이드는 결론을 먼저 제시하고 Google Play에서 확인할 항목을 안내합니다.',
    priorityArticles: [
      ['/ko/articles/google-play-points-cash-conversion.html', 'Play Points 현금화 가능할까?'],
      ['/ko/articles/google-play-points-expiration.html', 'Play Points 유효기간은 언제까지일까?'],
      ['/ko/articles/google-play-points-refund.html', '환불 후 Play Points는 어떻게 될까?'],
      ['/ko/articles/google-play-points-family-sharing.html', 'Play Points를 가족과 공유할 수 있을까?']
    ],
    extraModifiedAt: '2026-07-26',
    extraArticles: [
      ['/ko/articles/2026-06-20-discount-gift-cards.html', 'Google Play 기프트카드 할인 구매 전 확인'],
      ['/ko/articles/google-play-points-weekly-reward.html', '주간 Play Points 리워드'],
      ['/ko/articles/google-play-points-multiple-accounts.html', '여러 Google 계정에서 Play Points 확인'],
      ['/ko/articles/google-play-points-use-coupons.html', '포인트와 쿠폰 사용 방법'],
      ['/ko/articles/google-play-points-join-eligibility.html', '가입 조건과 가입 버튼이 없을 때'],
      ['/ko/articles/google-play-points-coupon-not-applied.html', '쿠폰이 자동 적용되지 않을 때'],
      ['/ko/articles/google-play-points-play-credit-not-working.html', 'Play 크레딧을 교환하거나 사용할 수 없을 때'],
      ['/ko/articles/google-play-points-level-maintenance-reset.html', '등급 유지와 연초 재산정'],
      ['/ko/maintenance/platinum/', '플래티넘 유지 계산기'],
      ['/ko/maintenance/diamond/', '다이아몬드 유지 계산기']
    ]
  },
  tw: {
    title: 'Google Play Points 指南',
    description: '瀏覽 Google Play Points 的等級、點數反映、活動、禮物卡與地區確認指南。',
    eyebrow: '指南庫',
    intro: '先選擇最符合目前問題的規則。每篇指南先提供結論，再列出應在 Google Play 確認的項目。',
    priorityArticles: [
      ['/tw/articles/google-play-points-cash-conversion.html', 'Play Points 可以換現金嗎？'],
      ['/tw/articles/google-play-points-expiration.html', 'Play Points 有效期限多久？'],
      ['/tw/articles/google-play-points-refund.html', '退款後 Play Points 怎麼辦？'],
      ['/tw/articles/google-play-points-family-sharing.html', 'Play Points 可以和家人共享嗎？']
    ],
    extraModifiedAt: '2026-07-26',
    extraArticles: [
      ['/tw/articles/2026-06-20-discount-gift-cards.html', 'Google Play 禮物卡折扣購買前檢查'],
      ['/tw/articles/google-play-points-weekly-reward.html', '每週 Play Points 獎勵'],
      ['/tw/articles/google-play-points-multiple-accounts.html', '多個 Google 帳號的 Play Points'],
      ['/tw/articles/google-play-points-use-coupons.html', '點數與折價券使用方法'],
      ['/tw/articles/google-play-points-join-eligibility.html', '加入資格與找不到加入按鈕'],
      ['/tw/articles/google-play-points-coupon-not-applied.html', '折價券沒有自動套用時'],
      ['/tw/articles/google-play-points-play-credit-not-working.html', 'Play 抵用金無法兌換或使用時'],
      ['/tw/articles/google-play-points-level-maintenance-reset.html', '等級維持與年初重新判定'],
      ['/tw/maintenance/platinum/', '白金級維持計算器'],
      ['/tw/maintenance/diamond/', '鑽石級維持計算器']
    ]
  }
};

const INTL_ARTICLE_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
    --bg: #f5f5f5;
    --card: #fff;
    --text: #333;
    --muted: #666;
    --accent: #667eea;
    --accent-light: #f0f4ff;
    --gold: #ffd43b;
    --radius: 20px;
    --hero: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
}
body {
    font-family: "Noto Sans", system-ui, sans-serif;
    background: var(--bg);
    min-height: 100vh;
    color: var(--text);
    line-height: 1.85;
}
.main-card {
    max-width: 820px;
    margin: 2rem auto;
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.10);
    overflow: hidden;
}
.hero {
    background: var(--hero);
    padding: 2.6rem 2rem;
    text-align: center;
}
.hero-badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.24);
    color: #fff;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    margin-bottom: 1rem;
}
.hero h1 {
    color: #fff;
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1.45;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}
.hero-meta {
    margin-top: 1rem;
    color: rgba(255, 255, 255, 0.92);
    font-size: 0.9rem;
}
.content { padding: 2rem; }
.intro {
    font-size: 1.05rem;
    text-align: center;
    padding: 1.4rem;
    background: var(--accent-light);
    border-radius: var(--radius);
    margin-bottom: 2rem;
}
.intl-article-toc {
    margin: 0 0 2rem;
    padding: 1.15rem 1.25rem;
    border: 1px solid #dbe2ea;
    border-radius: 14px;
    background: #f8fafc;
}
.intl-article-toc h2 {
    margin: 0 0 0.7rem;
    border: 0;
    color: #111827;
    font-size: 1rem;
}
.intl-article-toc ol {
    padding-left: 0;
    margin: 0;
    list-style: none;
}
.intl-article-toc li {
    margin: 0.35rem 0;
}
.intl-article-toc a {
    display: inline;
    min-height: 0;
    line-height: 1.55;
    color: var(--accent);
    font-weight: 700;
    text-decoration: none;
}
.section { margin-bottom: 2.3rem; }
.section h2 {
    font-size: 1.2rem;
    color: var(--accent);
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 3px solid var(--accent-light);
}
.section p { margin-bottom: 1rem; }
.section ul { padding-left: 1.4rem; margin-bottom: 1rem; }
.section li { margin-bottom: 0.4rem; }
.cta-box {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: var(--radius);
    padding: 2rem;
    text-align: center;
    color: #fff;
    margin: 2rem 0;
}
.cta-box h3 { font-size: 1.2rem; margin-bottom: 0.6rem; }
.cta-box p { opacity: 0.92; margin-bottom: 1.4rem; }
.cta-btn {
    display: inline-block;
    background: var(--gold);
    color: #333;
    padding: 1rem 2rem;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 800;
}
.official-source-note {
    margin: 2rem 0;
    padding: 1.3rem 1.5rem;
    background: #f8fbff;
    border: 1px solid #d8e5ff;
    border-radius: 16px;
}
.official-source-note h2 { font-size: 1.05rem; margin-bottom: 0.6rem; }
.official-source-note p { color: var(--muted); margin-bottom: 0.8rem; }
.author-box {
    margin: 0 2rem 1.5rem;
    padding: 1.3rem 1.5rem;
    background: #f8f9fa;
    border-radius: 16px;
    color: var(--muted);
}
.author-box-label { font-size: 0.82rem; font-weight: 700; color: var(--accent); }
.author-box-name { color: var(--text); font-weight: 700; margin: 0.25rem 0; }
.article-footer {
    padding: 1.5rem 2rem;
    background: #f8f9fa;
    border-top: 1px solid #eee;
    font-size: 0.88rem;
    color: var(--muted);
}
.article-footer a,
.author-box a,
.official-source-note a,
.related-links-section a { color: var(--accent); text-decoration: none; }
.small { font-size: 0.85rem; color: var(--muted); }
.comparison-table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
}
.table-wrap {
    overflow-x: auto;
    margin: 1.2rem 0;
    border: 1px solid #dbe2ea;
    border-radius: 14px;
}
.comparison-table th,
.comparison-table td {
    padding: 0.9rem 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}
.comparison-table th {
    background: #eef2ff;
    color: #312e81;
}
.comparison-table tr:last-child td { border-bottom: 0; }
.decision-box {
    margin: 1rem 0;
    padding: 1.25rem 1.4rem;
    border-left: 4px solid var(--accent);
    border-radius: 12px;
    background: #f8fafc;
}
.decision-box strong { color: #4338ca; }
.number-note { font-size: 0.9rem; color: #5b6472; }
@media (max-width: 600px) {
    .main-card { margin: 1rem; border-radius: 16px; }
    .hero { padding: 2rem 1.4rem; }
    .hero h1 { font-size: 1.35rem; }
    .content { padding: 1.5rem; }
    .author-box { margin: 0 1.5rem 1.5rem; }
}
`;

module.exports = {
  ARTICLE_HUB_CONTENT,
  ARTICLE_LABELS,
  INTL_ARTICLES,
  INTL_ARTICLE_CSS,
  LOCALES,
  MANUAL_MAINTENANCE_PAGES,
  PAGE_TYPES
};
