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
    lastUpdatedLabel: 'Last updated',
    referenceLabel: 'Japanese reference page',
    policyLabel: 'Editorial policy',
    estimateTitle: 'How to read this estimate',
    estimateBody: 'Use the result as a decision helper, not as a reason to spend more immediately. If the number is close to your normal plan, compare the official Google Play conditions and the campaign period. If it is far above your usual spending, waiting or staying at the current level may be the better choice.',
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
    lastUpdatedLabel: '업데이트',
    referenceLabel: '일본어 참고 페이지',
    policyLabel: '운영 및 검증 방침',
    estimateTitle: '예상치를 읽는 방법',
    estimateBody: '계산 결과는 바로 결제를 늘리기 위한 숫자가 아니라 판단을 돕는 기준입니다. 평소 예정된 결제와 가깝다면 Google Play 앱의 공식 조건과 캠페인 기간을 확인하세요. 평소 소비보다 크다면 기다리거나 현재 등급을 유지하는 선택이 더 나을 수 있습니다.',
    disclaimer: '이 페이지는 계획용 예상치입니다. Google Play Points 조건, 대상 결제, 캠페인, 반영 시점은 국가와 계정에 따라 달라질 수 있으므로 결제 전 Google Play 앱에서 확인하세요.',
    articles: [
      ['/en/articles/google-play-points-reflection-timing.html', 'Play Points 반영 시점 확인'],
      ['/en/articles/google-play-points-levels.html', 'Play Points 등급 구조 이해'],
      ['/en/articles/google-play-points-gift-cards.html', '기프트카드와 포인트 조건']
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
    lastUpdatedLabel: '更新日期',
    referenceLabel: '日文參考頁',
    policyLabel: '營運與驗證方針',
    estimateTitle: '如何閱讀這個估算',
    estimateBody: '計算結果是用來協助判斷，而不是讓你立刻增加消費。如果金額接近原本計畫的購買，可以再確認 Google Play App 內的官方條件與活動期間；如果遠高於平常消費，等待活動或維持目前等級可能更適合。',
    disclaimer: '本頁提供規劃用估算。Google Play Points 的適用付款、活動倍率、回饋時間與條款可能因國家、地區或帳號而不同，購買前請先在 Google Play App 內確認。',
    articles: [
      ['/en/articles/google-play-points-reflection-timing.html', 'Play Points 回饋時間確認'],
      ['/en/articles/google-play-points-levels.html', 'Play Points 等級說明'],
      ['/en/articles/google-play-points-gift-cards.html', '禮物卡與點數條件']
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
      ['4. Compare with a simple estimate', ['Use the calculator at 1x first, then run the same amount with the campaign multiplier that you believe applied. The gap between those two results helps you explain the situation without relying on memory.', 'The calculator is not an official account checker. Its job is to turn your assumptions into a number, then let you compare that number with Google Play\'s activity screen.']],
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
    title: 'How much to reach Platinum or Diamond?',
    description: 'Estimate the spending needed to reach Google Play Points Platinum or Diamond and decide whether waiting for a promotion makes sense.',
    h1: 'How much to reach Platinum or Diamond?',
    badge: 'Cost estimate',
    lead: 'The cost to reach Platinum or Diamond depends on current status, missing points, multiplier, and whether purchases are eligible. A single global number is usually misleading.',
    intro: 'Platinum and Diamond sound like clear goals, but the cost changes quickly once you add status rate, remaining points, campaign multipliers, and local rules. Instead of looking for one universal amount, build the estimate in layers. That makes it easier to see whether a promotion helps or whether the target is simply outside your normal spending.',
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
.related-links-section a { color: var(--accent); text-decoration: none; }
.small { font-size: 0.85rem; color: var(--muted); }
@media (max-width: 600px) {
    .main-card { margin: 1rem; border-radius: 16px; }
    .hero { padding: 2rem 1.4rem; }
    .hero h1 { font-size: 1.35rem; }
    .content { padding: 1.5rem; }
    .author-box { margin: 0 1.5rem 1.5rem; }
}
`;

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

function renderParagraphs(body) {
  const paragraphs = Array.isArray(body) ? body : [body];
  return paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
}

function articleSectionId(index) {
  return `section-${index + 1}`;
}

function renderArticleToc(article) {
  return `<nav class="intl-article-toc" aria-label="Table of contents">
            <h2>Table of contents</h2>
            <ol>
                ${article.sections.map(([heading], index) => `<li><a href="#${articleSectionId(index)}">${escapeHtml(heading)}</a></li>`).join('\n                ')}
            </ol>
        </nav>`;
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
    [page.jaPath, locale.referenceLabel],
    ...locale.articles,
    ['/author/katakata.html', locale.policyLabel]
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
            <span>${escapeHtml(locale.lastUpdatedLabel)}: ${todayStr}</span>
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
    ${content.sections.map(([heading, body]) => `<section class="section">
        <h2>${escapeHtml(heading)}</h2>
        ${renderParagraphs(body)}
    </section>`).join('\n    ')}
    <section class="section">
        <h2>${escapeHtml(locale.estimateTitle)}</h2>
        <p>${escapeHtml(locale.estimateBody)}</p>
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
  const articleCssVersion = assetVersions.articleSharedCssVersion || assetVersions.cssVersion;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: canonical,
    inLanguage: 'en',
    datePublished: todayStr,
    dateModified: todayStr,
    image: 'https://playpoint-sim.com/ogp.png',
    author: { '@type': 'Person', name: 'Katakata', url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: 'Play Points Calculator', url: 'https://playpoint-sim.com/', logo: { '@type': 'ImageObject', url: 'https://playpoint-sim.com/favicon.svg' } }
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/articles/article-shared.css?v=${articleCssVersion}">
    <link rel="stylesheet" href="/en/articles/intl-article.css?v=${assetVersions.cssVersion}">
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
<main class="main-card">
    <div class="hero">
        <span class="hero-badge">${escapeHtml(article.badge || 'International guide')}</span>
        <h1>${escapeHtml(article.h1)}</h1>
        <p class="hero-meta">Updated ${todayStr} ・ Play Points guide</p>
    </div>

    <article class="content">
        <div class="intro">
            ${escapeHtml(article.intro || article.lead)}
        </div>

        ${renderArticleToc(article)}

        ${article.sections.map(([heading, body], index) => `<section class="section">
            <h2 id="${articleSectionId(index)}">${escapeHtml(heading)}</h2>
            ${renderParagraphs(body)}
        </section>`).join('\n        ')}

        <div class="cta-box">
            <h3>Check the numbers without forcing a purchase</h3>
            <p>Use the calculator as a planning estimate, then confirm the official rule in your local Google Play app.</p>
            <a class="cta-btn" href="/en/?utm_source=article&utm_medium=internal&utm_campaign=intl_article_cta">Open the calculator</a>
        </div>

        <section class="section">
            <h2>FAQ</h2>
            ${article.faq.map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('\n            ')}
        </section>

        <section class="section related-links-section">
            <h2>Next step</h2>
            <ul>
                <li><a href="/en/status/diamond/">Diamond cost calculator</a></li>
                <li><a href="/en/campaign/2x/">2x promotion calculator</a></li>
                <li><a href="/en/amount/10000/">10,000 yen reverse estimate</a></li>
                <li><a href="/author/katakata.html">Editorial policy</a></li>
            </ul>
        </section>
    </article>

    <aside class="author-box" aria-label="Article author">
        <p class="author-box-label">Article author</p>
        <p class="author-box-name"><a href="/author/katakata.html" rel="author">Katakata</a> - Play Points Calculator editor</p>
        <p>This guide is written as a practical planning note. Google Play terms, rewards, campaigns, and eligibility can change by country or account, so official Google Play screens should decide the final action.</p>
    </aside>

    <nav id="article-nav" class="article-nav" style="margin: 0 2rem;"></nav>
    <footer class="article-footer">
        <p><a href="/blog/">Back to guides</a> | <a href="/en/">Calculator top</a></p>
        <p class="small" style="margin-top: 1rem;">This page is a general guide and calculator entry point. Check Google Play official help and the Google Play app for exact current rules.</p>
    </footer>
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
  writeFile(rootDir, 'en/articles/intl-article.css', INTL_ARTICLE_CSS);
  for (const article of EN_ARTICLES) {
    writeFile(rootDir, article.file, renderArticle(article, assetVersions, todayStr));
  }
  console.log(`Generated international SEO pages (${getIntlSeoFiles().length} files).`);
}

module.exports = {
  getIntlSeoFiles,
  writeIntlSeoPages
};
