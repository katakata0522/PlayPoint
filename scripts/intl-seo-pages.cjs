'use strict';

const fs = require('fs');
const path = require('path');

const LOCALES = {
  en: {
    lang: 'en',
    home: 'Calculator',
    blog: 'Guides',
    back: 'Back to calculator',
    author: 'Katakata',
    siteName: 'Play Points Calculator',
    relatedTitle: 'Related guides',
    regionNoteTitle: 'Regional note',
    disclaimer: 'This page provides a planning estimate. Google Play Points terms, eligibility, promotions, and timing can differ by country or account, so check the Google Play app before purchasing.',
    articles: [
      ['/en/articles/google-play-points-reflection-timing.html', 'When do Google Play Points appear?'],
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
    siteName: 'Play Points 계산기',
    relatedTitle: '함께 확인할 가이드',
    regionNoteTitle: '국가별 확인',
    disclaimer: '이 페이지는 계획용 예상치입니다. Google Play Points 조건, 대상 결제, 캠페인, 반영 시점은 국가와 계정에 따라 달라질 수 있으므로 결제 전 Google Play 앱에서 확인하세요.',
    articles: [
      ['/en/articles/google-play-points-reflection-timing.html', 'When do Google Play Points appear?'],
      ['/en/articles/google-play-points-levels.html', 'Google Play Points levels explained'],
      ['/en/articles/google-play-points-gift-cards.html', 'Do gift cards earn Play Points?']
    ]
  },
  tw: {
    lang: 'zh-TW',
    home: '計算機',
    blog: '指南',
    back: '返回計算機',
    author: 'Katakata',
    siteName: 'Play Points 計算機',
    relatedTitle: '相關指南',
    regionNoteTitle: '地區確認',
    disclaimer: '本頁提供規劃用估算。Google Play Points 的適用付款、活動倍率、回饋時間與條款可能因國家、地區或帳號而不同，購買前請先在 Google Play App 內確認。',
    articles: [
      ['/en/articles/google-play-points-reflection-timing.html', 'When do Google Play Points appear?'],
      ['/en/articles/google-play-points-levels.html', 'Google Play Points levels explained'],
      ['/en/articles/google-play-points-gift-cards.html', 'Do gift cards earn Play Points?']
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
        ['When to wait', 'If the estimate is far above your usual spending, compare 1x and campaign multipliers before buying anything only for status.']
      ],
      faq: [
        ['Can this calculator confirm the official Diamond requirement?', 'No. It estimates spending from the values you enter. The official progress shown in Google Play is the source of truth.'],
        ['Should I use a campaign multiplier?', 'Use 1x first, then compare the result with 2x or 3x if your purchase is actually eligible for that promotion.'],
        ['Is Diamond always worth reaching?', 'Not always. It depends on whether you use the rewards enough to justify the extra spending.']
      ]
    },
    ko: {
      title: 'Google Play Points 다이아몬드 필요 금액 계산',
      description: 'Google Play Points 다이아몬드까지 남은 포인트와 필요 금액을 계산하고, 국가별 캠페인 차이를 확인합니다.',
      eyebrow: '다이아몬드 등급 계획',
      h1: 'Google Play Points 다이아몬드는 얼마가 필요할까요?',
      lead: '다이아몬드를 목표로 할 때는 총 결제액보다 남은 포인트, 캠페인 배율, 국가별 조건을 먼저 확인하는 편이 안전합니다.',
      cta: '다이아몬드까지 계산하기',
      secondary: '영문 등급 가이드 보기',
      secondaryHref: '/en/articles/google-play-points-levels.html',
      summary: ['초기 조건: 플래티넘에서 다이아몬드', '추천: 최고 등급이 가까운 사용자', '확인: 남은 포인트와 캠페인 조건'],
      sections: [
        ['먼저 확인할 것', 'Google Play 앱에 표시된 남은 포인트를 기준으로 입력하세요. 전체 누적 포인트를 넣으면 예상 금액이 어긋날 수 있습니다.'],
        ['국가별 차이', '한국, 일본, 미국, 대만은 프로모션과 리워드 표시가 다를 수 있습니다. 계산 후 앱의 조건을 다시 확인하세요.'],
        ['기다릴지 판단', '평소 결제액보다 필요한 금액이 크다면 1배와 캠페인 배율을 비교하고, 불필요한 지출은 피하는 것이 좋습니다.']
      ],
      faq: [
        ['공식 필요 금액을 보장하나요?', '아니요. 입력값을 바탕으로 한 예상치이며, 최종 기준은 Google Play 앱의 진행 상황입니다.'],
        ['캠페인 배율을 넣어도 되나요?', '대상 결제가 맞을 때만 넣어 비교하세요. 먼저 1배로 기준을 보는 것이 안전합니다.'],
        ['다이아몬드는 항상 이득인가요?', '리워드를 실제로 사용할 수 있는지에 따라 달라집니다.']
      ]
    },
    tw: {
      title: 'Google Play Points 鑽石等級需要多少？',
      description: '估算 Google Play Points 鑽石等級所需點數與金額，並確認日本、美國、韓國、台灣的活動差異。',
      eyebrow: '鑽石等級規劃',
      h1: 'Google Play Points 鑽石等級需要多少？',
      lead: '想衝鑽石等級時，先確認還差多少點、是否有活動倍率，以及所在地區的規則是否相同，會比直接估總金額更安全。',
      cta: '計算鑽石等級進度',
      secondary: '查看英文等級指南',
      secondaryHref: '/en/articles/google-play-points-levels.html',
      summary: ['預設: 白金到鑽石', '適合: 接近最高等級的使用者', '確認: 剩餘點數與活動條件'],
      sections: [
        ['先看剩餘點數', '請以 Google Play App 顯示的剩餘點數為準。若輸入累積總點數，估算金額可能會失真。'],
        ['地區差異', '台灣、日本、韓國、美國的活動顯示與回饋條件可能不同。計算後仍要回到 App 確認。'],
        ['是否等待活動', '如果估算金額高於平常消費，先比較 1 倍、2 倍或 3 倍，不要為了等級增加不必要支出。']
      ],
      faq: [
        ['這能保證官方鑽石條件嗎？', '不能。這是依輸入值估算，官方進度仍以 Google Play App 顯示為準。'],
        ['可以輸入活動倍率嗎？', '可以，但只有實際符合活動資格的消費才適合使用倍率估算。'],
        ['鑽石等級一定值得嗎？', '不一定，取決於你是否真的會使用相關回饋。']
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
      lead: 'A 2x promotion can reduce the spending needed for a target, but only if the purchase is eligible. Use this page to open the calculator with a 2x multiplier and compare it with regular earning.',
      cta: 'Calculate with 2x',
      secondary: 'Compare 3x promotion',
      secondaryHref: '/campaign/3x/',
      summary: ['Preset: 2x multiplier', 'Best for: planned purchases', 'Check: eligible apps, caps, and timing'],
      sections: [
        ['Compare 1x and 2x', 'Run the estimate at 1x first, then switch to 2x. The difference shows whether waiting for the campaign matters.'],
        ['Eligibility matters', 'Promotion labels can hide limits such as selected apps, maximum bonus points, or payment-method restrictions.'],
        ['Avoid forced spending', 'Use campaigns to move planned purchases, not to create new purchases that exceed the value of the reward.']
      ],
      faq: [
        ['Does 2x make the cost exactly half?', 'Not always. It depends on base earning, status, caps, and eligible purchase amount.'],
        ['Can gift cards count?', 'They may not count at purchase time in the way users expect. Check the local rule and compare with the gift-card guide.'],
        ['Is 2x enough for Platinum or Diamond?', 'It depends on missing points. Use the calculator result with your current Play Points progress.']
      ]
    },
    ko: {
      title: 'Google Play Points 2배 캠페인 계산',
      description: '2배 캠페인에서 등급 도달과 유지에 필요한 금액이 어떻게 달라지는지 계산합니다.',
      eyebrow: '2배 캠페인 예상',
      h1: 'Google Play Points 2배 캠페인은 얼마나 도움이 될까요?',
      lead: '2배 캠페인은 필요한 금액을 낮출 수 있지만, 대상 결제일 때만 의미가 있습니다. 이 페이지는 2배 배율로 계산기를 열어 일반 조건과 비교할 수 있게 합니다.',
      cta: '2배로 계산하기',
      secondary: '3배 캠페인 비교',
      secondaryHref: '/campaign/3x/',
      summary: ['초기 조건: 2배 배율', '추천: 예정된 결제가 있는 경우', '확인: 대상 앱, 상한, 반영 시점'],
      sections: [
        ['1배와 2배 비교', '먼저 1배 기준을 보고 2배로 바꾸면 캠페인을 기다릴 가치가 있는지 판단하기 쉽습니다.'],
        ['대상 조건 확인', '일부 앱, 결제수단, 보너스 상한이 있을 수 있습니다.'],
        ['불필요한 지출 방지', '캠페인은 예정된 결제를 옮기는 데 쓰고, 등급만을 위해 새 지출을 만들지 않는 편이 안전합니다.']
      ],
      faq: [
        ['2배면 금액이 정확히 절반인가요?', '항상 그렇지는 않습니다. 기본 적립, 등급, 상한, 대상 금액에 따라 달라집니다.'],
        ['기프트카드도 대상인가요?', '사용자가 기대하는 방식과 다를 수 있으므로 지역별 조건을 확인해야 합니다.'],
        ['플래티넘이나 다이아몬드에 충분한가요?', '남은 포인트에 따라 다릅니다. 현재 진행 상황과 함께 보세요.']
      ]
    },
    tw: {
      title: 'Google Play Points 2 倍活動計算',
      description: '比較一般回饋與 2 倍活動，估算達成或維持 Google Play Points 等級所需金額。',
      eyebrow: '2 倍活動估算',
      h1: 'Google Play Points 2 倍活動能省多少？',
      lead: '2 倍活動可能降低達成目標所需金額，但前提是該筆消費符合資格。這頁會以 2 倍倍率開啟計算機，方便與一般條件比較。',
      cta: '用 2 倍計算',
      secondary: '比較 3 倍活動',
      secondaryHref: '/campaign/3x/',
      summary: ['預設: 2 倍倍率', '適合: 已計畫的消費', '確認: 適用 App、上限、回饋時間'],
      sections: [
        ['比較 1 倍與 2 倍', '先看 1 倍基準，再切換到 2 倍，就能判斷是否值得等待活動。'],
        ['資格條件很重要', '活動可能限制 App、付款方式或加碼點數上限。'],
        ['避免為活動硬買', '活動適合調整原本就要買的項目，不適合為了等級增加不必要支出。']
      ],
      faq: [
        ['2 倍會讓成本剛好減半嗎？', '不一定，會受到基本回饋、等級、上限與適用金額影響。'],
        ['禮物卡也算嗎？', '可能與直覺不同，請確認所在地區的規則。'],
        ['2 倍足夠升白金或鑽石嗎？', '取決於剩餘點數，請搭配 Google Play App 的進度查看。']
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
      description: 'Estimate how many Google Play Points you may earn from a 10,000 yen purchase, with status and promotion multiplier notes.',
      eyebrow: '10,000 yen reverse estimate',
      h1: 'How many Google Play Points do you get for 10,000 yen?',
      lead: 'A fixed amount like 10,000 yen is useful for planning, but the points earned depend on status, campaign multipliers, and whether the purchase is eligible in your country.',
      cta: 'Calculate points for 10,000 yen',
      secondary: 'Read gift-card notes',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['Preset: reverse mode', 'Best for: spend-to-points planning', 'Check: status, multiplier, eligible amount'],
      sections: [
        ['Use reverse mode', 'This page opens the calculator with amount-based input. Change the status and multiplier to match your account.'],
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
      description: '10,000엔 결제 기준으로 등급과 캠페인 배율에 따른 Google Play Points 예상치를 계산합니다.',
      eyebrow: '10,000엔 역산',
      h1: '10,000엔 결제하면 Google Play Points는 몇 포인트일까요?',
      lead: '고정 금액은 계획에 편리하지만, 실제 포인트는 등급, 캠페인 배율, 국가별 대상 결제 조건에 따라 달라집니다.',
      cta: '10,000엔 포인트 계산',
      secondary: '영문 기프트카드 가이드',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['초기 조건: 역산 모드', '추천: 금액에서 포인트를 보고 싶은 경우', '확인: 등급, 배율, 대상 금액'],
      sections: [
        ['역산 모드 사용', '금액을 기준으로 예상 포인트를 계산합니다. 실제 등급과 배율에 맞게 바꾸세요.'],
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
      description: '以 10,000 日圓為例，依等級與活動倍率估算 Google Play Points 回饋。',
      eyebrow: '10,000 日圓反推',
      h1: '10,000 日圓可獲得多少 Google Play Points？',
      lead: '固定金額方便規劃，但實際點數會受到等級、活動倍率、所在地區的適用付款條件影響。',
      cta: '計算 10,000 日圓點數',
      secondary: '查看英文禮物卡指南',
      secondaryHref: '/en/articles/google-play-points-gift-cards.html',
      summary: ['預設: 反推模式', '適合: 從金額估點數', '確認: 等級、倍率、適用金額'],
      sections: [
        ['使用反推模式', '這頁會以金額作為輸入，請依自己的等級與活動倍率調整。'],
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
    title: 'When do Google Play Points appear?',
    description: 'A practical guide to Google Play Points reflection timing, pending points, and what to check before assuming points are missing.',
    h1: 'When do Google Play Points appear?',
    lead: 'Most Play Points confusion starts with timing. Points may appear quickly for some purchases, while campaigns, subscriptions, refunds, account differences, and regional rules can add delay.',
    sections: [
      ['Start with the purchase record', 'Check the Google Play purchase history and confirm that the purchase was made on the same Google account where you expect Play Points to appear. If you use multiple accounts, this is the most common source of mismatch.'],
      ['Campaign timing can differ', 'Bonus points from promotions may not follow the same timing as regular earning. Read the campaign page carefully, especially for caps, eligible apps, and delayed reward delivery.'],
      ['Refunds and pending payments', 'If a payment is pending, cancelled, refunded, or changed by the store, the points result can change later. Do not treat an early estimate as final until the transaction is complete.'],
      ['Country and account differences', 'Availability and timing can vary by country. Japan, the US, Korea, and Taiwan may not expose identical campaigns or reward options at the same time.']
    ],
    faq: [
      ['Should I contact support immediately?', 'Wait until the normal purchase and campaign conditions are clear. If the account, purchase, and eligibility all match but points still do not appear, use Google Play support.'],
      ['Can the calculator force points to appear?', 'No. The calculator only estimates points from your inputs. It cannot read or change your Google account.']
    ]
  },
  {
    file: 'en/articles/google-play-points-not-showing.html',
    title: 'Google Play Points not showing up: what to check',
    description: 'Checklist for Google Play Points not showing up, including account mismatch, eligible purchases, campaign rules, refunds, and regional differences.',
    h1: 'Google Play Points not showing up: what to check',
    lead: 'If Play Points do not show up, avoid guessing from the final balance only. Work through account, purchase, eligibility, timing, and region in that order.',
    sections: [
      ['1. Confirm the Google account', 'Open Google Play with the same account used for the purchase. Points are not combined across accounts, and family or secondary accounts can make the balance look wrong.'],
      ['2. Check whether the purchase was eligible', 'Not every payment pattern is guaranteed to earn points in the way users expect. Promotional credit, gift-card flows, subscriptions, and refunds need extra care.'],
      ['3. Read the campaign details', 'If you expected bonus points, confirm that the app, period, country, payment method, and cap matched the campaign. A headline multiplier is not the full rule.'],
      ['4. Compare with a simple estimate', 'Use the calculator to estimate what should happen under 1x and under the campaign multiplier, then compare that with the official Google Play activity view.']
    ],
    faq: [
      ['Can points be transferred from another account?', 'No. Play Points are account-based.'],
      ['Does a missing bonus mean the normal points are wrong?', 'Not necessarily. Bonus timing and regular points can be handled differently.']
    ]
  },
  {
    file: 'en/articles/google-play-points-levels.html',
    title: 'Google Play Points levels explained',
    description: 'Understand Google Play Points levels, what to compare before chasing Platinum or Diamond, and how country differences affect planning.',
    h1: 'Google Play Points levels explained',
    lead: 'Google Play Points levels are useful only when the rewards match your real usage. Before aiming for Platinum or Diamond, compare the missing points, expected spending, and reward value.',
    sections: [
      ['Levels are planning categories', 'Bronze, Silver, Gold, Platinum, and Diamond help frame earning rates and benefits, but the exact experience can vary by region and account.'],
      ['Do not chase status blindly', 'If the spending needed for the next level is much higher than your normal purchases, the reward may not justify the extra cost.'],
      ['Use missing points, not total points', 'For planning, the key number is how many points remain until the target level. The calculator is designed around that missing-point approach.'],
      ['International users should verify local rules', 'The site supports Japan, US-style English guidance, Korean, and Traditional Chinese pages, but official Play terms in your local app should decide the final action.']
    ],
    faq: [
      ['Is Diamond better than Platinum?', 'It can be, but only if you actually use the added rewards and can maintain the level without forced spending.'],
      ['Can the same plan work in every country?', 'No. Country-specific offers and reward availability can differ.']
    ]
  },
  {
    file: 'en/articles/google-play-points-platinum-diamond-cost.html',
    title: 'How much to reach Platinum or Diamond?',
    description: 'Estimate the spending needed to reach Google Play Points Platinum or Diamond and decide whether waiting for a promotion makes sense.',
    h1: 'How much to reach Platinum or Diamond?',
    lead: 'The cost to reach Platinum or Diamond depends on current status, missing points, multiplier, and whether purchases are eligible. A single global number is usually misleading.',
    sections: [
      ['Define the target', 'Platinum and Diamond planning should start with one target at a time. Mixing status progress, campaign bonuses, and gift-card discounts can make the decision harder.'],
      ['Estimate at 1x first', 'A 1x estimate gives you the baseline. Then test 2x or 3x to see whether waiting for a campaign changes the decision.'],
      ['Check the spending rhythm', 'Monthly and weekly estimates matter. If the required pace is far from your normal usage, the level is probably not worth forcing.'],
      ['Use country-aware caution', 'The same calculation pattern works globally, but official earning rates and promotion rules may differ by country.']
    ],
    faq: [
      ['Should I aim for Platinum first?', 'Usually yes. Estimate the nearer level first, then decide whether Diamond still makes sense.'],
      ['Can gift-card discounts change the result?', 'They can change your effective cost, but Play Points eligibility still depends on the local rule.']
    ]
  },
  {
    file: 'en/articles/google-play-points-gift-cards.html',
    title: 'Do gift cards earn Google Play Points?',
    description: 'Understand how Google Play gift cards can affect Play Points planning, why purchase and redemption timing matter, and what to verify by country.',
    h1: 'Do gift cards earn Google Play Points?',
    lead: 'Gift cards are often used to reduce the effective cost of app purchases, but Play Points eligibility can depend on how and when value is used. Treat gift-card savings and points earning as separate checks.',
    sections: [
      ['Separate discount from points', 'Buying a discounted gift card may lower your real cost. That does not automatically mean points are earned at the card purchase moment.'],
      ['Check redemption and purchase flow', 'Some users expect points when buying the card, while others expect points when spending the balance. The local Google Play rule decides what happens.'],
      ['Campaign combinations need care', 'A 2x or 3x campaign may have conditions that do not match every gift-card-funded purchase. Read the campaign details before assuming the multiplier applies.'],
      ['Compare effective cost safely', 'Use the calculator for points, and separately note any gift-card discount. Avoid increasing spending only because a card looks cheaper.']
    ],
    faq: [
      ['Are gift cards always better?', 'No. They are useful only when the discount, eligibility, and your planned purchase all align.'],
      ['Can I use gift cards with promotions?', 'Sometimes, but campaign conditions vary. Check the local Google Play campaign page.']
    ]
  }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

function pageUrl(locale, slug) {
  return `https://playpoint-sim.com/${locale}/${slug}/`;
}

function renderSeoPage(localeKey, pageKey, assetVersions, todayStr) {
  const locale = LOCALES[localeKey];
  const page = PAGE_TYPES[pageKey];
  const content = page[localeKey];
  const canonical = pageUrl(localeKey, page.slug);
  const calcHref = `/${localeKey}/?mode=${page.mode}&${page.query}&utm_source=intl_lp&utm_medium=internal&utm_campaign=${page.campaign}`;
  const related = [
    [page.jaPath, 'Japanese reference page'],
    ...locale.articles,
    ['/author/katakata.html', 'Editorial policy']
  ];
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: content.title,
      description: content.description,
      url: canonical,
      inLanguage: locale.lang,
      dateModified: todayStr,
      author: { '@type': 'Person', name: locale.author, url: 'https://playpoint-sim.com/author/katakata.html' },
      isPartOf: { '@type': 'WebSite', name: locale.siteName, url: `https://playpoint-sim.com/${localeKey}/` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale.siteName, item: `https://playpoint-sim.com/${localeKey}/` },
        { '@type': 'ListItem', position: 2, name: content.h1, item: canonical }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer }
      }))
    }
  ];

  return `<!DOCTYPE html>
<html lang="${locale.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(content.title)}</title>
    <meta name="description" content="${escapeHtml(content.description)}">
    <meta name="robots" content="index,follow">
    <meta name="author" content="${escapeHtml(locale.author)}">
    <meta name="last-modified" content="${todayStr}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeHtml(locale.siteName)}">
    <meta property="og:title" content="${escapeHtml(content.title)}">
    <meta property="og:description" content="${escapeHtml(content.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(content.title)}">
    <meta name="twitter:description" content="${escapeHtml(content.description)}">
    <meta name="twitter:image" content="https://playpoint-sim.com/ogp.png">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com${page.jaPath}">
    <link rel="alternate" hreflang="en" href="${pageUrl('en', page.slug)}">
    <link rel="alternate" hreflang="ko" href="${pageUrl('ko', page.slug)}">
    <link rel="alternate" hreflang="zh-TW" href="${pageUrl('tw', page.slug)}">
    <link rel="alternate" hreflang="x-default" href="${pageUrl('en', page.slug)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/style.css?v=${assetVersions.cssVersion}">
    ${schemas.map(schema => `<script type="application/ld+json">\n${jsonLd(schema)}\n    </script>`).join('\n    ')}
</head>
<body>
<main class="calculator-wrapper lp-wrapper">
    <nav class="top-bar" aria-label="Site links">
        <a href="/${localeKey}/">${escapeHtml(locale.back)}</a>
        <a href="/blog/">${escapeHtml(locale.blog)}</a>
    </nav>
    <section class="lp-hero">
        <p class="lp-eyebrow">${escapeHtml(content.eyebrow)}</p>
        <h1>${escapeHtml(content.h1)}</h1>
        <p class="lp-lead">${escapeHtml(content.lead)}</p>
        <div class="lp-trust-line">
            <span>Last updated: ${todayStr}</span>
            <span>${escapeHtml(locale.siteName)}</span>
            <span>${escapeHtml(locale.author)}</span>
        </div>
        <div class="lp-hero-panel">
            <p class="lp-note">${escapeHtml(locale.disclaimer)}</p>
            <div class="lp-jp-summary" aria-label="Page summary">
                ${content.summary.map(item => `<div><span class="lp-summary-value">${escapeHtml(item)}</span></div>`).join('\n                ')}
            </div>
            <div class="lp-action-row">
                <a class="lp-primary-link" href="${calcHref}">${escapeHtml(content.cta)}</a>
                <a class="lp-secondary-link" href="${content.secondaryHref}">${escapeHtml(content.secondary)}</a>
            </div>
        </div>
    </section>
    <section class="section">
        <h2>${escapeHtml(locale.regionNoteTitle)}</h2>
        <div class="lp-mini-grid">
            ${content.sections.map(([heading, body]) => `<div><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(body)}</p></div>`).join('\n            ')}
        </div>
    </section>
    <section class="section">
        <h2>${escapeHtml(locale.relatedTitle)}</h2>
        <ul class="lp-related-list">
            ${related.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('\n            ')}
        </ul>
    </section>
    <section class="section lp-faq">
        <h2>FAQ</h2>
        ${content.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('\n        ')}
    </section>
</main>
<script src="/js/intent-tracking.js?v=${assetVersions.intentTrackingVersion}"></script>
<script src="/js/third-party.js?v=${assetVersions.thirdPartyVersion}"></script>
</body>
</html>
`;
}

function renderArticle(article, assetVersions, todayStr) {
  const canonical = `https://playpoint-sim.com/${article.file}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: canonical,
    inLanguage: 'en',
    datePublished: todayStr,
    dateModified: todayStr,
    author: { '@type': 'Person', name: 'Katakata', url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: 'Play Points Calculator', logo: { '@type': 'ImageObject', url: 'https://playpoint-sim.com/ogp.png' } }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(article.title)} | Play Points Calculator</title>
    <meta name="description" content="${escapeHtml(article.description)}">
    <meta name="robots" content="index,follow">
    <meta name="author" content="Katakata">
    <meta name="last-modified" content="${todayStr}">
    <link rel="canonical" href="${canonical}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/style.css?v=${assetVersions.cssVersion}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Play Points Calculator">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(article.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
${jsonLd(schema)}
    </script>
</head>
<body>
<main class="calculator-wrapper lp-wrapper">
    <nav class="top-bar" aria-label="Site links">
        <a href="/en/">Calculator</a>
        <a href="/blog/">Guides</a>
    </nav>
    <article class="section">
        <p class="lp-eyebrow">International Play Points guide</p>
        <h1>${escapeHtml(article.h1)}</h1>
        <p class="lp-lead">${escapeHtml(article.lead)}</p>
        <div class="lp-trust-line">
            <span>Last updated: ${todayStr}</span>
            <span>Country-aware planning</span>
            <span>Author: Katakata</span>
        </div>
        ${article.sections.map(([heading, body]) => `<section class="section"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`).join('\n        ')}
        <section class="section lp-faq">
            <h2>FAQ</h2>
            ${article.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('\n            ')}
        </section>
        <section class="section">
            <h2>Next step</h2>
            <ul class="lp-related-list">
                <li><a href="/en/status/diamond/">Diamond cost calculator</a></li>
                <li><a href="/en/campaign/2x/">2x promotion calculator</a></li>
                <li><a href="/en/amount/10000/">10,000 yen reverse estimate</a></li>
                <li><a href="/author/katakata.html">Editorial policy</a></li>
            </ul>
        </section>
    </article>
</main>
<script src="/js/intent-tracking.js?v=${assetVersions.intentTrackingVersion}"></script>
<script src="/js/third-party.js?v=${assetVersions.thirdPartyVersion}"></script>
</body>
</html>
`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(rootDir, file, content) {
  const filePath = path.join(rootDir, file);
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function getIntlSeoFiles() {
  const pages = [];
  for (const localeKey of Object.keys(LOCALES)) {
    for (const pageKey of Object.keys(PAGE_TYPES)) {
      pages.push(`${localeKey}/${PAGE_TYPES[pageKey].slug}/index.html`);
    }
  }
  return [
    ...pages,
    ...EN_ARTICLES.map(article => article.file)
  ];
}

function writeIntlSeoPages(rootDir, assetVersions, todayStr) {
  for (const localeKey of Object.keys(LOCALES)) {
    for (const pageKey of Object.keys(PAGE_TYPES)) {
      const file = `${localeKey}/${PAGE_TYPES[pageKey].slug}/index.html`;
      writeFile(rootDir, file, renderSeoPage(localeKey, pageKey, assetVersions, todayStr));
    }
  }
  for (const article of EN_ARTICLES) {
    writeFile(rootDir, article.file, renderArticle(article, assetVersions, todayStr));
  }
  console.log(`Generated international SEO pages (${getIntlSeoFiles().length} files).`);
}

module.exports = {
  getIntlSeoFiles,
  writeIntlSeoPages
};
