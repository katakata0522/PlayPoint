'use strict';

// 日本語版の有用な題材を、価格・対象地域を混同しない地域別ガイドへ展開する。
const TOPICS = [
  {
    slug: 'google-play-points-basics', jaAlternate: '/about-playpoints.html', source: '15776742', category: 'account',
    en: {
      title: 'Google Play Points explained: how US earning, rewards and levels work',
      seoTitle: 'Google Play Points US Guide: Earning, Rewards & Levels',
      description: 'New to Google Play Points in the US? Learn how to join, what $10 earns at Bronze, how Play credit differs from points, and how level progress stays separate.',
      intro: 'If you already buy apps, game items, or subscriptions on Android, Google Play Points is an easy extra perk to pick up along the way. Once you split the program into three simple pieces—earning points, redeeming rewards, and climbing annual levels—the rules become straightforward.',
      sections: [
        ['Join with your buying account first', ['Open your profile in the Google Play Store and tap Play Points to enroll. Only eligible purchases made after you join count toward points; earlier orders are never added retroactively.', 'If you juggle more than one Gmail address on your phone, make sure you enroll the exact Google account you plan to pay with.']],
        ['What $10 actually earns at US Bronze', ['At the US Bronze base rate, $10 of eligible pre-tax spending earns about 10 points (1 point per $1 before tax). Active offers in the Earn tab can raise the final earn rate on specific apps or purchases.', 'Think of points as a bonus on purchases you were already going to make, rather than a reason to buy items just to nudge a meter forward.']],
        ['Pick rewards you will genuinely use', ['The Use tab mixes app-specific coupons, in-game items, and Google Play credit. A coupon for a game you actually play often stretches further than a random bundle for an unfamiliar title.', 'Glance at the point cost alongside what you already plan to buy next before redeeming anything.']],
        ['Points and Google Play credit are different balances', ['Play Points sit in your rewards counter until you redeem them, while Google Play credit acts as spending balance at checkout. Simply collecting points will not discount your next bill automatically.', 'When you want to pay with points, exchange them for Google Play credit first, then choose that Play balance when you check out.']],
        ['Spending points never lowers your annual level progress', ['Your redeemable point balance and your annual level progress do two completely different jobs. Redeeming points from your balance only reduces what you have left to spend—it never subtracts from the annual progress counting toward Silver, Gold, Platinum, or Diamond.', 'For local US tier thresholds, follow our US levels guide, or use the calculator to see how much planned spending bridges the gap.']],
        ['A quick routine before your next purchase', 'Before tapping pay, glance at three things: which Google account is signed in, your current level, and whether a relevant offer is waiting in the Earn or Use tab. With that habit in place, Play Points quietly rewards the games and apps you already enjoy.']
      ],
      faq: [
        ['Is this guide using Japanese rates?', 'No. All spending examples here use US account rates, where Bronze starts at 1 point per $1 before tax. Since Google sets earning rates by country, always go by the local rate displayed in your own Google Play account.'],
        ['Does exchanging points lower my annual progress?', 'No. Redeeming points only deducts from your spendable reward balance, while your annual level progress keeps every eligible point you earned this year. Think of them as two separate counters moving independently.']
      ]
    },
    ko: {
      title: 'Google Play Points 시작하기: 한국 적립률부터 사용법과 등급까지',
      description: '가입부터 포인트 적립, 쿠폰과 크레딧 교환, 등급 기준까지 한눈에 정리했습니다. 한국 브론즈 10,000원 예시와 잔액, 연간 진행도의 차이를 쉽게 알아보세요.',
      intro: '어차피 결제하려던 게임 상품이나 앱이 있다면, 포인트 혜택까지 함께 챙기는 편이 훨씬 기분 좋죠. Google Play Points는 대상 결제로 포인트를 모아 쿠폰이나 게임 아이템, Play 크레딧으로 바꿔 쓰는 프로그램입니다. 가입, 사용, 등급 세 갈래로 나눠 보면 처음 접해도 금방 감이 잡힙니다.',
      sections: [
        ['결제할 계정으로 먼저 가입하세요', ['Play 스토어 오른쪽 위 프로필에서 Play Points를 선택하면 바로 시작할 수 있습니다. 다만 가입하기 전에 결제한 내역은 소급 적립되지 않으니, 첫 결제 전에 가입부터 마쳐 두는 게 좋습니다.', '휴대폰에 Google 계정이 여러 개 로그인되어 있다면, 실제로 결제를 진행할 계정이 맞는지 한 번만 살펴보고 가입하세요.']],
        ['한국 브론즈 기준 10,000원 예시', ['한국 브론즈 기본 적립률은 1,000원당 1포인트입니다. 대상 상품 10,000원을 결제하면 기본적으로 약 10포인트가 쌓이는 셈이죠.', '진행 중인 캠페인이 있다면 화면에 표시된 최종 특별 적립률을 기준으로 계산하면 됩니다. 포인트를 채우려고 굳이 필요 없는 결제를 늘리기보다는, 원래 예정된 구매에 보너스를 더한다는 느낌으로 접근하는 편이 알뜰합니다.']],
        ['자주 쓰는 곳에 맞춰 교환하기', ['사용 탭을 열면 앱 전용 쿠폰, 게임 내 아이템, Google Play 크레딧 등 계정에 맞는 교환 목록이 보입니다.', '포인트 수만 보고 낯선 아이템을 고르기보다, 평소 즐겨 하는 게임의 할인 쿠폰이나 필요한 크레딧처럼 바로 쓸 수 있는 혜택과 비교해 보세요.']],
        ['포인트와 Play 크레딧 잔액은 별개입니다', ['Play Points는 모아 두는 리워드 점수이고, Google Play 크레딧은 실제 결제에 쓸 수 있는 잔액입니다. 포인트가 쌓였다고 해서 다음 결제 금액이 자동으로 깎이지는 않습니다.', '결제 금액에 보태고 싶다면 먼저 사용 탭에서 크레딧으로 교환한 뒤, 결제 수단 화면에 해당 잔액이 적용되었는지 보고 결제하면 됩니다.']],
        ['포인트를 써도 등급 진행도는 깎이지 않습니다', ['교환에 쓰는 사용 가능 잔액과 회원 등급을 매기는 연간 등급 진행도는 서로 따로 움직입니다. 쿠폰이나 크레딧으로 포인트를 사용해 잔액이 줄어들어도, 올해 쌓은 등급 실적은 그대로 유지됩니다.', '한국 등급별 기준은 등급 가이드에서, 다음 등급까지 남은 예상 금액은 계산기에서 바로 가늠해 볼 수 있습니다.']],
        ['결제 전에 떠올릴 가벼운 습관', '구매 버튼을 누르기 전에는 결제 계정, 현재 등급, 그리고 적립과 사용 탭에 올라온 혜택 세 가지만 떠올려 보세요. 이 흐름만 익혀 두면 평소 즐기는 게임 안에서 무리 없이 혜택을 챙길 수 있습니다.']
      ],
      faq: [
        ['일본 적립률을 그대로 적용한 글인가요?', '아니요. 이 글의 10,000원 예시는 한국 계정 기준(1,000원당 1포인트)으로 계산한 내용입니다. 국가마다 통화와 적립 기준이 다르니, 본인 Google Play 계정에 표시되는 한국 적립률을 기준으로 보시면 됩니다.'],
        ['포인트를 교환하면 연간 등급 진행도도 줄어드나요?', '아니요. 포인트를 써도 연간 등급 진행도는 줄어들지 않습니다. 사용 가능한 포인트 잔액과 등급 산정용 연간 누적 포인트는 별도로 계산되기 때문에, 마음 편히 원하는 보상으로 바꾸셔도 됩니다.']
      ]
    },
    tw: {
      title: 'Google Play Points 入門：台灣積點方式、兌換與會員等級一次看懂',
      description: '剛加入 Google Play Points 嗎？用台灣銅級每 NT$30 累積 1 點的實例，帶你分清點數餘額、Play 餘額與年度等級進度，挑出真正用得到的回饋。',
      intro: '本來就有打算購買的遊戲禮包或訂閱，如果還能順便多拿一份回饋，感覺會更划算。Google Play Points 讓你透過符合資格的消費累積點數，再換成優惠券、遊戲道具或抵用金。只要先把加入順序、兌換方式和等級計算分清楚，操作起來其實很單純。',
      sections: [
        ['先用買單的帳號加入，再開始消費', ['打開 Play 商店右上角的個人資料，點進 Play Points 就能加入。因為加入之前的歷史消費不會追溯補發點數，建議在下一筆付款前先完成啟用。', '如果手機裡登入了好幾個 Google 帳號，記得挑實際要付款的那一個帳號加入，點數才不會散在不同地方。']],
        ['台灣銅級的小例子：消費 NT$300 大約拿幾點？', ['台灣銅級的基本積點率是每 NT$30 獲得 1 點。舉例來說，一筆 NT$300 的符合資格未稅消費，在銅級基本情況下大約能拿到 10 點。', '如果有參加加碼活動，結帳或活動頁面會顯示最終獲點率，到時候就以實際顯示為準。把點數當成原本計畫內消費的額外獎勵就好，不必為了湊點數而多買不需要的東西。']],
        ['選自己真的會用到的回饋最划算', ['在「使用」分頁裡，可以看到各類 App 專用優惠券、遊戲虛寶或 Google Play 抵用金。', '與其只看哪個道具折算起來點數少，不如優先挑選自己常玩遊戲的優惠券或通用抵用金。換之前先想一下最近會買什麼，點數才不會換了卻放到過期。']],
        ['點數和 Play 餘額是兩本不同的帳', ['Play Points 是還放在點數帳戶裡的積分，Google Play 抵用金則是換完後能拿來折抵消費的付款餘額。帳號裡有點數，並不會在結帳時自動幫你扣錢。', '如果想拿來折抵消費，要先在「使用」分頁把它換成抵用金，結帳時再選用這筆 Google Play 餘額即可。']],
        ['把點數換掉了，會影響年度等級嗎？', ['可兌換的點數餘額跟決定會員等級的年度進度，是各自獨立的兩個數字。你把點數拿去換優惠券或抵用金，只會扣掉手上的餘額，不會倒扣今年已經累計的升級進度。', '想了解台灣各等級門檻可以參考等級指南，想知道離下一個等級還差多少消費額，也能直接用計算機抓個大概。']],
        ['下次消費前可以順手看一眼', '準備結帳前，不妨順手留意三個小細節：現在登入的是不是付款帳號、目前的會員等級，以及「賺取」和「使用」分頁有沒有剛好能搭上的優惠。習慣之後，就能在原本的遊戲花費裡自然多賺一份回饋。']
      ],
      faq: [
        ['這篇文章是直接拿日本的積點率來算嗎？', '不是喔，文章裡的 NT$300 試算是依照台灣帳號的基本積點率（每 NT$30 1 點）寫的。不同地區的幣別與積點率各有規定，看自己 Google Play 帳號裡顯示的數字最準。'],
        ['把點數拿去兌換後，年度等級進度會被扣掉嗎？', '不會。點數餘額和年度等級進度是兩條分開計算的數字，換成優惠券或抵用金只會花掉可用餘額，今年累積起來的升級進度會完整保留。']
      ]
    }
  },
  {
    slug: 'google-play-credit-subscriptions', jaAlternate: '/articles/2026-10-14-play-credit-subscription.html', source: '6080850', category: 'earn',
    en: {
      title: 'Paying for subscriptions with Google Play credit: first bill and renewals',
      seoTitle: 'Use Play Credit for Subscriptions: First Pay & Renewal',
      description: 'Can Play Points exchanged for Google Play credit cover a subscription? See how billing store, matching currency, partial balances and auto-renewals work.',
      intro: 'Redeeming Play Points for Google Play credit is a smart way to trim down a recurring subscription bill. The real catch is making sure the plan is actually billed through Google Play—and knowing what happens not just today, but when next month’s renewal hits.',
      sections: [
        ['Make sure Google Play is the store billing you', ['In the US, Google Play balance can cover supported subscriptions, as long as the subscription is billed through Google Play itself. If you originally subscribed on a publisher’s website or through Apple, that payment runs through a different billing system.', 'Open your Play Store Subscriptions list on that Google account to see if the plan shows up there before redeeming points for credit.']],
        ['Using Play credit for your first payment', ['If Google Play credit is offered in your Use tab, exchange your points first, then start the subscription checkout and choose your Play balance as the payment method.', 'Your credit needs to sit on the exact Google account making the purchase and match the store’s currency—otherwise the balance option simply will not appear at checkout.']],
        ['Keep an eye on upcoming renewals too', ['Auto-renewing plans normally keep charging whichever payment method you selected. Before the next billing cycle arrives, take a quick look at the subscription’s payment settings to see the renewal date and whether enough usable balance is left.', 'Whether a plan lets you fall back to a backup card or split a renewal with another method depends on the specific subscription and what checkout supports.']],
        ['When your balance covers only part of the bill', ['Suppose an example bill is $6 and you have $4 in usable Play credit, leaving a $2 difference. Having credit on your account does not guarantee the remaining $2 will be handled the same way on every subscription.', 'Look closely at the checkout breakdown to see if a secondary payment method can cover that $2 gap, and treat these numbers as a quick illustration rather than an actual plan price.']],
        ['If Play credit does not show up at checkout', ['Before exchanging any more points, walk through five quick details: the signed-in Google account, Play country, currency, any credit expiration date, and which store bills the plan.', 'If a balance is sitting right there in your account but still refuses to appear as a payment option, our Play credit troubleshooting guide walks through each mismatch step by step.']]
      ],
      faq: [
        ['Is Play credit the same as an app-specific coupon?', 'No. An app-specific coupon only works inside one designated app and follows its own minimum-spend or item rules. Play credit added from Play Points becomes part of your Google Play balance, which can pay for supported subscriptions and other eligible Google Play purchases.'],
        ['Does uninstalling the app stop a subscription from renewing?', 'No. Deleting an app icon from your phone does not touch the billing agreement behind it. To stop future charges, cancel the plan directly in Google Play’s Subscriptions menu—or through the website or Apple if one of those stores bills you.']
      ]
    },
    ko: {
      title: 'Google Play 크레딧으로 구독 결제하기: 첫 결제부터 다음 갱신까지',
      description: '모아 둔 Play Points를 크레딧으로 바꿔 정기 구독에 쓰는 법을 정리했습니다. 청구 스토어와 통화 일치, 6,000원 대 4,000원 같은 잔액 부족 예시, 자동 갱신 관리까지 알아보세요.',
      intro: '모아 둔 Play Points를 Google Play 크레딧으로 바꾸면 매달 나가는 구독 요금 부담을 조금 덜 수 있습니다. 다만 중요한 건 지금 잔액이 있다는 사실뿐만이 아닙니다. 이 구독이 Google Play에서 청구되는 상품인지, 그리고 첫 결제 이후 다음 갱신 때도 문제없이 이어지는지 함께 살펴봐야 합니다.',
      sections: [
        ['어느 스토어에서 청구하는지부터 보세요', ['한국 계정의 Google Play 잔액은 Google Play가 직접 청구하는 지원 구독에 사용할 수 있습니다. 반대로 게임사나 서비스 공식 웹사이트, 혹은 Apple을 통해 시작한 구독은 결제 경로 자체가 다릅니다.', '포인트를 크레딧으로 바꾸기 전에, 내 Google 계정의 Play 스토어 정기 결제 목록에 해당 구독이 올라와 있는지 먼저 살펴보면 헛걸음을 줄일 수 있습니다.']],
        ['첫 결제 화면에서 크레딧 고르기', ['사용 탭에 Google Play 크레딧 교환 항목이 있다면 먼저 포인트를 크레딧으로 전환한 뒤, 구독 결제 창에서 결제 수단을 열어 보세요.', '잔액을 보유한 Google 계정과 결제하려는 계정이 같아야 하고 통화도 일치해야 합니다. 계정이 어긋나면 잔액이 있어도 결제 수단 목록에 크레딧이 보이지 않습니다.']],
        ['다음 갱신 일정도 같이 챙겨 두기', ['정기 구독은 보통 처음에 골라 둔 결제 수단으로 다음 회차도 자동 청구됩니다. 갱신일이 다가오기 전에 구독 설정에서 다음 결제 날짜와 현재 남은 잔액을 미리 봐 두는 편이 마음 편합니다.', '잔액이 모자랄 때 등록해 둔 보조 결제 수단으로 넘어갈지, 다른 수단과 나눠서 결제될지는 구독 상품과 결제 화면의 지원 여부에 따라 달라집니다.']],
        ['잔액이 있어도 일부만 덮일 수 있습니다', ['예를 들어 청구 금액이 6,000원이고 쓸 수 있는 잔액이 4,000원이라면 2,000원의 차액이 남습니다. 이때 결제 화면이 나머지 2,000원을 다른 수단과 합쳐 낼 수 있게 해 주는지, 실제 청구 내역이 어떻게 잡히는지 살펴보세요.', '이 6,000원과 4,000원은 이해를 돕기 위한 가상 예시일 뿐 특정 구독 상품의 실제 가격을 뜻하지는 않으며, 모든 갱신에서 자동으로 분할 결제가 된다고 볼 수도 없습니다.']],
        ['결제 수단에 크레딧이 안 보일 때', ['원인을 찾지 못한 채 포인트를 추가로 크레딧으로 바꾸기보다는, 로그인된 Google 계정, Play 국가, 통화, 잔액 유효기간, 그리고 실제 청구 스토어를 차례로 대조해 보세요.', '분명 잔액이 있는데도 선택지에 뜨지 않는다면, 아래 연결된 Play 크레딧 문제 해결 가이드에서 원인별 점검 순서를 따라가 보실 수 있습니다.']]
      ],
      faq: [
        ['앱 전용 쿠폰과 Google Play 크레딧은 같은 건가요?', '아니요, 둘은 사용 방식이 다릅니다. 앱 전용 쿠폰은 지정된 앱 안에서 정해진 구매 조건을 채워야 쓸 수 있고, Play 크레딧은 지원되는 결제와 구독에 두루 쓰는 Google Play 잔액입니다.'],
        ['앱을 지우면 구독 자동 갱신도 멈추나요?', '아니요. 휴대폰에서 앱을 삭제해도 스토어의 정기 결제 계약은 그대로 유지됩니다. 다음 결제를 막으려면 Google Play 정기 결제 메뉴나 원래 청구하던 웹 스토어 또는 Apple 계정에서 직접 구독을 해지해야 합니다.']
      ]
    },
    tw: {
      title: '用 Google Play 抵用金付訂閱：第一次扣款與後續續訂這樣看',
      modifiedAt: '2026-10-16',
      description: '想用 Play Points 換來的 Google Play 抵用金支付訂閱嗎？先看清請款平台、帳號幣別是否相符，再帶你看懂 NT$180 對 NT$120 的差額範例與續訂提醒。',
      intro: '把平常存下來的 Play Points 換成抵用金，拿來貼補每個月的訂閱費相當實用。不過重點不只是帳號裡有餘額而已，還要看這筆訂閱到底是不是透過 Google Play 請款，以及第一次扣款和下個月自動續訂時，能不能順利接著使用。',
      sections: [
        ['先認明實際請款的商店是誰', ['台灣 Google Play 餘額可以用在 Google Play 支援的訂閱項目上；如果你當初是在網站上刷卡，或是從 Apple 訂閱的，那就屬於完全不同的收款管道。', '在把點數換成抵用金之前，先到同一個 Google 帳號的 Play 商店訂閱清單裡看一眼，有看到該方案才算走 Google Play 管道。']],
        ['第一次付款時選用抵用金', ['如果帳號的「使用」分頁有提供抵用金兌換項目，先完成點數兌換，接著打開訂閱結帳頁面，把付款方式切換成 Google Play 餘額。', '要特別留意的是，存著餘額的 Google 帳號必須跟訂閱帳號一致，而且交易幣別也要相同，否則結帳畫面上不會出現這個選項。']],
        ['別忘了替下一次續訂留個底', ['自動續訂通常會繼續沿用你當初選好的付款方式。在下次扣款日到來前，不妨先點進訂閱設定看一眼日期與手頭上剩餘的可用餘額。', '萬一餘額不夠時能不能改扣備用付款方式或拆分付款，會依不同訂閱方案和當下的結帳畫面支援度而定。']],
        ['就算有餘額，也可能只夠付一部分', ['舉例來說，假設訂閱帳單是 NT$180，但可用餘額只有 NT$120，中間就會少 NT$60。這時就要看結帳畫面有沒有提供其他方式補上這 NT$60，以及最後的金額分配怎麼顯示。', '這裡的 NT$180 與 NT$120 只是方便計算的舉例，不代表某個方案的實際售價，也不表示每次自動續訂都能自動幫你合併扣款。']],
        ['結帳時找不到抵用金怎麼辦？', ['在還沒搞清楚原因之前，先別急著又換更多點數。建議順著帳號、Play 地區、幣別、餘額使用期限以及請款平台這幾個項目逐一比對。', '如果確定餘額就在帳號裡卻還是用不了，可以接著看下方的 Play 抵用金問題排解指南，會更快找出卡關的地方。']]
      ],
      faq: [
        ['Google Play 抵用金和 App 專用優惠券是一樣的東西嗎？', '不一樣。App 專用優惠券通常限定單一遊戲或應用程式，還有最低消費等使用條件；這裡提到的抵用金則會變成 Google Play 餘額，可用在符合條件的應用程式消費與訂閱上。'],
        ['把手機裡的 App 刪掉，訂閱就會自動停掉嗎？', '不會。移除 App 只會清掉手機上的程式，請款合約還是會繼續跑。想停止下次扣款，一定要回到實際向你請款的平台（像是 Google Play 的訂閱管理頁面、官方網站或 Apple 訂閱設定）手動取消訂閱。']
      ]
    }
  },
  {
    slug: 'google-play-points-stamp-cards', jaAlternate: '/articles/2026-10-13-play-points-stamp-cards.html', source: '9077192', category: 'earn',
    en: {
      title: 'Google Play Points stamp cards: how purchase counts and minimums work',
      description: 'Understand Play Points stamp cards without confusing them with boosts or quests. See the $5 example, mobile-only rule, currency terms and reward deadlines.',
      intro: 'Seeing “one more purchase to unlock your reward” can make any stamp card hard to ignore. A Play Points stamp card rewards a set number of qualifying purchases, which feels like a great bonus when your usual plans already fit—as long as you know that total spend alone is not what fills the card.',
      sections: [
        ['Stamp cards count transactions, not multipliers', ['In Play Points, each promo type plays by different rules: a stamp card counts individual qualifying purchases, a boost raises your earn rate, and a quest asks for a specific set of actions.', 'Before assuming a card works like a points multiplier, look at two lines first: the minimum spend required per purchase and the number of purchases needed.']],
        ['Why the same $15 total can give three different outcomes', ['Imagine an example card requiring three purchases of at least $5 each. One $15 purchase hits the total dollar amount, yet only stamps one slot; three separate $5 purchases satisfy both the count and the minimum.', 'By contrast, five $3 purchases spend $15 overall without earning a single stamp because each order sits under the $5 threshold. Treat these as invented comparison numbers rather than an active promotion.']],
        ['Where to find stamp cards (phone only)', ['Open the mobile Play Store app, tap your profile icon, go to Play Points, and look under Earn. Google notes that quests and stamp cards are not available on Google Play Games on PC or on the Google Play website.', 'Promotions vary by account and region, so not seeing a card on your screen simply means that campaign is not active on your account right now.']],
        ['Read the fine print before your first qualifying order', ['Before making the first purchase toward a card, check which apps or items qualify, whether you have to tap a Start or Activate button first, and when both the purchase window and the reward claim deadline end.', 'Orders must also be paid in the promotion’s currency, and the card’s terms decide whether discounts or coupons reduce an item below the minimum spend.']],
        ['Weigh the extra spend before chasing the last stamp', 'If finishing a card means buying something you would otherwise skip, add up that extra out-of-pocket cost before deciding. When your regular planned purchases already clear the bar, a stamp card turns into a straightforward bonus without inventing a new shopping list.']
      ],
      faq: [
        ['Does a stamp card automatically give a higher earn rate?', 'Not by itself. A stamp card rewards you for completing a set number of qualifying purchases, while a points boost changes the points earned per dollar. Look at the card title and terms to see whether you are looking at a purchase-count reward or a rate boost.'],
        ['Can I start or finish a stamp card from a PC?', 'No, you will need a supported phone. Google explicitly states that quests and stamp cards are unavailable on Google Play Games on PC and the Google Play website, so open the mobile Play Store app on the same Google account.']
      ]
    },
    ko: {
      title: 'Google Play Points 스탬프 카드: 구매 횟수와 건별 최소 금액 읽는 법',
      description: '한 번만 더 사면 보상을 받는 스탬프 카드, 어떻게 채워질까요? 5,000원 예시로 보는 금액과 횟수 조건, 부스트나 퀘스트와의 차이, 모바일 전용 규칙을 정리했습니다.',
      intro: '적립 화면에 “한 번만 더 구매하면 완료” 같은 카드가 떠 있으면 은근히 신경 쓰이죠. Play Points 스탬프 카드는 정해진 횟수만큼 대상 구매를 채우면 리워드를 주는 캠페인입니다. 원래 살 계획이 있던 상품으로 자연스럽게 채워진다면 더할 나위 없는 보너스가 됩니다.',
      sections: [
        ['스탬프는 배율이 아니라 구매 횟수 조건입니다', ['Play Points의 프로모션은 이름과 다르게 움직입니다. 스탬프 카드는 조건을 채운 구매 건수를 세고, 부스트는 적립률을 올려 주며, 퀘스트는 정해진 미션 수행을 요구합니다.', '따라서 포인트가 몇 배로 붙는 이벤트와 혼동하지 말고, 카드 안에 적힌 건별 최소 결제 금액과 필요한 총 횟수부터 읽어 두는 것이 좋습니다.']],
        ['총결제액이 같아도 결과는 달라집니다', ['예를 들어 5,000원 이상 구매를 세 번 요구하는 카드가 있다고 가정해 봅시다. 15,000원을 한 번에 결제하면 총액은 같아도 스탬프는 1칸만 채워지지만, 5,000원짜리 대상 상품을 세 번 나누어 사면 금액과 횟수 조건을 모두 넘깁니다.', '반면 3,000원 결제를 다섯 번 하면 합계는 15,000원이어도 매 건마다 5,000원 기준에 못 미쳐 스탬프가 찍히지 않습니다. 이 숫자들은 원리를 보여 주기 위한 가상 예시일 뿐 현재 진행 중인 오퍼를 뜻하지는 않습니다.']],
        ['스탬프 카드는 스마트폰에서만 찾을 수 있습니다', ['모바일 Play 스토어 앱에서 프로필을 누른 뒤 Play Points의 적립 탭으로 들어가면 내 계정에 열린 카드를 볼 수 있습니다. PC용 Google Play Games나 Google Play 웹사이트에서는 퀘스트와 스탬프 카드를 이용할 수 없습니다.', '계정과 시기별로 열리는 캠페인이 다르므로, 내 화면에 카드가 보이지 않는다고 해서 오류가 난 것은 아닙니다.']],
        ['첫 구매 전에 훑어볼 네 가지', ['카드를 채우기 시작하기 전에 대상 앱과 상품 범위, 참여 시작 버튼이 따로 있는지, 구매 기간과 리워드 수령 마감일이 언제인지 미리 살펴보세요.', '결제 통화 역시 프로모션 통화와 같아야 하며, 할인이나 쿠폰을 썼을 때 할인 후 금액이 최소 기준을 넘는지도 카드 약관에 따라 판정됩니다.']],
        ['마지막 한 칸 때문에 무리할 필요는 없습니다', '보상이 탐나서 굳이 필요 없는 상품을 담아야 한다면, 그 추가 지출이 보상 가치보다 큰지 먼저 따져 보는 편이 현명합니다. 이미 살 계획이 있던 결제만으로 조건이 채워질 때가 가장 기분 좋게 혜택을 챙길 수 있는 순간입니다.']
      ],
      faq: [
        ['스탬프 카드를 쓰면 포인트 적립률도 자동으로 올라가나요?', '아니요, 스탬프 카드 자체에 적립률 배수 효과가 붙는 것은 아닙니다. 스탬프 카드는 구매 횟수에 따라 보상을 주는 방식이고, 적립률을 높이는 건 포인트 부스트이므로 카드 설명에서 어떤 조건인지 구분해 보세요.'],
        ['PC용 Play Games에서도 스탬프 카드에 참여할 수 있나요?', '아니요, 지원되는 스마트폰에서 진행해야 합니다. Google 공식 안내에서도 PC용 Google Play Games와 Play 웹사이트에서는 퀘스트 및 스탬프 카드를 제공하지 않는다고 밝히고 있으니, 같은 Google 계정의 모바일 Play 스토어 앱을 이용하세요.']
      ]
    },
    tw: {
      title: 'Google Play Points 集章卡怎麼算？購買次數與單筆門檻一次看懂',
      description: '看到集章卡只差一格好心動？用單筆 NT$150 範例看懂集點卡次數計算、為什麼跟點數加倍和任務不同，以及手機限定規則與領獎期限。',
      intro: '滑進賺取頁面看到「再買 1 次就領獎」，任誰都會想順手把那張集章卡填滿。Google Play Points 的集點卡只要完成指定次數的合格購買就能拿獎勵，如果原本就有計畫買的東西剛好符合門檻，就能輕鬆多賺一份驚喜。',
      sections: [
        ['集章卡比的是「合格次數」，不是點數倍率', ['雖然都在活動區出現，但三種活動的玩法不一樣：集章卡計算符合條件的購買筆數，加倍活動看的是獲點率，任務則要求完成指定動作。', '所以看到這類集點卡時，先看清楚單筆最低消費金額和需要購買幾次，才不會把它誤會成所有消費都能點數翻倍的活動。']],
        ['花一樣的總金額，結果卻可能差很多', ['假設某張活動卡要求「買滿 3 次、每次至少 NT$150」。如果一次直接買 NT$450，總額雖然一樣，系統只會算成 1 筆；分 3 次買符合資格的 NT$150 商品，才會同時滿足金額與次數。', '至於買 5 筆 NT$90 的小額商品，因為每一筆都低於 NT$150 門檻，一格都不會累積。以上純粹是為了示範規則的假設數字，不代表目前正在進行的活動。']],
        ['想找集章卡，請打開手機版 Play 商店', ['開啟手機的 Play 商店個人資料，點進 Play Points 後切到「賺取」分頁就能看到目前可用的活動。Google Play Games 電腦版和 Play 網頁版都不支援任務和集章卡。', '另外，每張卡會依照帳號與地區發送，沒看到卡片只是代表帳號當下沒有收到同一檔活動，不一定是故障。']],
        ['第一筆結帳前，先留意這幾個細節', ['在買第一筆之前，先瞄一眼適用的 App 或商品範圍、有沒有要先按「開始」或「啟用」、活動起訖時間，以及最後領獎截止日。', '消費幣別必須與活動一致；如果有搭配優惠券或折扣，扣除折扣後的實付金額算不算跨過門檻，也要以活動條款為準。']],
        ['先算多花的錢，再決定要不要湊最後一格', '如果為了把集章卡填滿而多買原本不需要的東西，不妨先算一下多出來的花費划不划算。當原本就打算買的品項剛好能過關時，才是不用多花冤枉錢、最安心拿回饋的時候。']
      ],
      faq: [
        ['參加集章卡會同時提高平常的積點率嗎？', '不會自動提高喔。集章卡給的是達成購買次數後的任務獎勵，而提高每筆積點率屬於點數倍增活動，兩者條件分開計算，活動卡片上的說明會寫明是哪一種。'],
        ['可以在電腦上完成 Google Play Points 集章卡嗎？', '不行，請改用支援的 Android 手機操作。Google 官方說明任務與集章卡目前僅限手機版 Play 商店，電腦版 Play Games 與 Play 網頁版都無法參與或累積進度。']
      ]
    }
  },
  {
    slug: 'pokemon-sleep-premium-pass-plans', jaAlternate: '/articles/2026-10-14-pokemon-sleep-premium-pass-plans.html', category: 'earn',
    sourceHref: 'https://support.pokemon.com/hc/en-us/articles/17264929442324-Pok%C3%A9mon-Sleep-Billing-and-Premium-Pass-FAQ',
    sourceHrefByLocale: { tw: 'https://app-psl.pokemon-support.com/hc/zh-tw/articles/20406040940185' },
    en: {
      title: 'Pokémon Sleep Premium Pass: 1-month vs 6-month plan compared',
      seoTitle: 'Pokémon Sleep Premium Pass: 1 vs 6 Months Compared',
      description: 'Deciding between the 1-month and 6-month Pokémon Sleep Premium Pass? Compare daily 100 sleep points, local store pricing, streak rules and Play Points.',
      intro: 'When checking new sleep styles every morning becomes part of your routine, the Pokémon Sleep Premium Pass starts looking pretty appealing. Choosing between one month and six months comes down to two things: how steadily you play, and how the local store prices stack up.',
      sections: [
        ['How the daily bonus adds up over a month', ['With an active Premium Pass, every day you track sleep brings a bonus of 100 sleep points—so 30 tracked days add up to 3,000 bonus sleep points on top of your normal rewards.', 'Access to the Premium Exchange and the upgraded daily biscuit also makes morning research sessions feel noticeably smoother if you log sleep most nights.']],
        ['Compare the prices shown in your own app store', ['Open the pass screen inside your app and jot down both the 1-month and 6-month prices. Multiply the 1-month price by 6 to compare the half-year total, then divide the 6-month price by 6 to see the effective monthly cost.', 'Always keep both quotes in the same country, platform, and tax basis—Japanese yen figures listed online are not a reliable stand-in for US Google Play prices.']],
        ['Match the plan length to your sleep-tracking habit', ['If you are still seeing whether nightly sleep tracking sticks for you, starting with a 1-month plan keeps your commitment light and easy to judge.', 'A 6-month plan makes more sense once you already know you will keep playing through the season, letting you weigh the lower monthly rate against the chance you might take a break early.']],
        ['Switching plans or stores can reset your streak', ['Before jumping straight to a different plan just because its monthly rate looks lower, take a moment to review how subscription streaks work. Pokémon’s billing FAQ notes that changing plans on Android can require canceling, letting the current term expire, and buying the new plan—which resets your streak.', 'Moving from Google Play to another app store resets that streak too, so it is worth factoring in before making a switch.']],
        ['Sleep points and Google Play Points are separate currencies', ['The 100 daily bonus points covered here are Pokémon Sleep’s in-game sleep points, used inside the game’s shops.', 'Google Play Points, by contrast, come from eligible purchases billed through Google Play. Keep those two balances separate when weighing whether the pass feels worthwhile.']],
        ['Pick the routine that fits your mornings', 'List the daily pass perks you genuinely look forward to using and how many months you realistically expect to keep tracking. Grounding the comparison in your real play habit makes the choice clear without defaulting to the longest plan just for the sticker discount.']
      ],
      faq: [
        ['Does the pass’s daily bonus add to Google Play Points?', 'No. The 100 daily bonus points are in-game sleep points inside Pokémon Sleep, meant for features like the Premium Exchange. You only earn Google Play Points from eligible Google Play billing transactions, such as paying for the pass itself through Google Play.'],
        ['Can I use Japan’s listed price in a US comparison?', 'No. App store prices vary by country, currency, tax handling, and regional pricing tiers. Always pull both the 1-month and 6-month prices directly from the US store screen you plan to buy on.']
      ]
    },
    ko: {
      title: '포켓몬 슬립 프리미엄 패스: 1개월과 6개월 플랜, 매일 혜택으로 고르기',
      description: 'Pokémon Sleep 프리미엄 패스를 1개월로 쓸지 6개월로 끊을지 고민되시나요? 하루 100 슬립 포인트, 한국 스토어 가격 비교법, 플랜 변경 시 연속 구독 규칙까지 정리했습니다.',
      intro: '아침마다 포켓몬들의 새로운 잠자는 모습을 발견하는 재미에 빠졌다면 프리미엄 패스도 자연스럽게 눈에 들어옵니다. 한 달씩 가볍게 이어 갈지, 여섯 달 플랜을 고를지 고민된다면 가격표보다 매일 내 손에 들어오는 혜택과 내 기록 습관부터 떠올려 보세요.',
      sections: [
        ['매일 쌓이는 보너스가 꽤 쏠쏠합니다', ['프리미엄 패스가 켜져 있는 동안 수면을 측정한 날에는 하루에 한 번 보너스 슬립 포인트 100포인트를 추가로 받습니다. 한 달 동안 30일을 꾸준히 기록하면 보너스만으로도 3,000포인트가 모입니다.', '여기에 프리미엄 교환소와 매일 한 개씩 받는 보너스 사블레+까지 더해져 아침 리서치 시간의 여유가 한층 커집니다.']],
        ['한국 구매 화면의 실제 가격으로 계산해 보기', ['앱 안의 구매 화면에서 1개월 가격과 6개월 가격을 나란히 적어 두고 비교해 보세요. 1개월 가격에 6을 곱한 금액과 6개월 총액을 나란히 놓은 뒤, 6개월 가격을 6으로 나누면 월 환산 비용이 바로 보입니다.', '이때는 반드시 같은 국가, 같은 플랫폼, 같은 세금 기준으로 비교해야 합니다. 인터넷에 돌아다니는 일본 엔화 가격을 그대로 한국 판매가로 바꿔 계산하면 실제 결제액과 어긋납니다.']],
        ['내 수면 기록 습관에 기간 맞추기', ['아직 매일 밤 수면을 재는 습관이 자리 잡는 중이라면, 부담 없이 판단할 수 있는 1개월 플랜이 편합니다.', '반대로 앞으로 반년은 거뜬히 플레이할 자신 있다면, 6개월 플랜으로 아끼는 총액과 혹시 중간에 쉬게 될 가능성을 저울질해 보시면 됩니다.']],
        ['플랜이나 스토어를 바꿀 때 연속 구독 초기화 주의', ['월 환산 금액이 조금 더 저렴해 보인다고 해서 곧장 갈아타기 전에 연속 구독 기간 규칙을 알고 넘어가는 게 좋습니다.', '포켓몬 공식 결제 FAQ에 따르면 Android에서 플랜을 바꿀 때는 기존 구독을 해지하고 만료된 뒤 새로 결제해야 할 수 있으며, 이 과정에서 연속 구독 기간이 초기화됩니다. 결제 스토어를 다른 곳으로 옮길 때도 마찬가지로 초기화되니 유의하세요.']],
        ['슬립 포인트와 Google Play Points는 따로 움직입니다', ['매일 받는 보너스 100포인트는 포켓몬 슬립 게임 안에서 쓰는 슬립 포인트입니다.', '반면 Google Play Points는 Google Play를 통해 대상 결제를 진행했을 때 적립되는 스토어 포인트이므로, 두 잔액을 한데 합쳐 계산하지 않도록 구분하는 편이 정확합니다.']],
        ['가장 긴 플랜보다 내 아침 루틴에 맞게', '매일 실제로 쓰게 될 패스 기능과 앞으로 몇 달이나 즐겁게 기록할 수 있을지 차분히 떠올려 보세요. 가장 오래 묶이는 상품이 아니라 내 생활 리듬에 딱 맞는 기간을 고를 때 가장 만족스럽게 쓸 수 있습니다.']
      ],
      faq: [
        ['매일 받는 보너스 100포인트가 Google Play Points로도 쌓이나요?', '아니요. 매일 받는 보너스는 포켓몬 슬립 게임 내 프리미엄 교환소 등에서 사용하는 슬립 포인트입니다. Google Play Points는 Google Play를 통해 패스 요금 등 적격 결제를 할 때 별도로 적립됩니다.'],
        ['일본 엔화 가격을 그대로 한국 플랜 비교에 써도 되나요?', '아니요. 스토어마다 국가별 세금, 환율, 가격 책정 기준이 다르기 때문에 일본 가격으로는 한국 결제 금액을 가늠하기 어렵습니다. 반드시 내 한국 Google Play 구매 화면에 뜨는 1개월과 6개월 가격으로 비교하세요.']
      ]
    },
    tw: {
      title: 'Pokémon Sleep 進階票證：1 個月還是 6 個月？從每天領的福利挑起',
      description: '猶豫 Pokémon Sleep 進階票證要買 1 個月還是 6 個月嗎？一起看懂每日 100 睡眠點數、進階兌換處福利、台灣售價算法，以及換方案重設連續訂閱的細節。',
      intro: '如果每天早上起床看看寶可夢的新睡姿已經變成日常樂趣，進階票證自然會讓人很心動。到底該先買 1 個月試水溫，還是直接選 6 個月方案？與其只盯著價目表，不如先看自己每天用得到哪些福利。',
      sections: [
        ['每日獎勵慢慢存，一個月差很多', ['在進階票證有效期間，只要當天有記錄睡眠，就能額外領一次 100 睡眠點數；算下來如果 30 天都順利記錄，光額外點數就多出 3,000 點。', '再加上能逛進階兌換處、每天還有升級版的獎勵沙布蕾+，早上研究睡姿和抓寶可夢都會順手不少。']],
        ['拿台灣購買畫面的數字直接算最準', ['打開自己遊戲內的購買畫面，把 1 個月和 6 個月方案的價格列出來比較：先算「單月價格 × 6」對比六個月總價，再把「六個月價格 ÷ 6」看平均每月花多少。', '比較時記得保持同一個地區、平台和稅金基準，千萬別直接拿日本日圓售價當作台灣會扣款的價格。']],
        ['配合自己的作息節奏選長短', ['還在摸索能不能每天記得按睡眠記錄的話，從 1 個月方案開始會比較輕鬆，試完再決定要不要續。', '如果已經確定接下來半年都會繼續玩，就把 6 個月方案省下來的總價，和萬一中途偷懶少玩的機率放在一起衡量。']],
        ['想換方案前，留意連續訂閱期間會重設', ['別只看到平均月費比較低就急著切換方案。根據寶可夢官方付款 FAQ 的說明，Android 系統要更換方案時，通常得先取消訂閱、等到當期結束後再重新購買，而這麼做會重設連續訂閱期間。', '另外，更換付款商店同樣會讓連續訂閱紀錄歸零，決定換方案前把這一點也算進去會比較穩妥。']],
        ['睡眠點數跟 Google Play Points 是兩回事', ['這篇提到的每天 100 點，是 Pokémon Sleep 遊戲裡自己使用的睡眠點數。', 'Google Play Points 則是透過 Google Play 結帳合格消費後累積的點數，兩邊的餘額完全分開計算，評估划不划算時別混在一起。']],
        ['選每天真的會用到的那一個', '想想自己最常打開的進階票證福利是哪幾項、大概還會玩幾個月，價格比較自然就會有明確答案，不需要只因為 6 個月看起來最便宜就硬綁長期。']
      ],
      faq: [
        ['每天領的 100 點睡眠獎勵，會算進 Google Play Points 嗎？', '不會喔。每天拿到的 100 點屬於 Pokémon Sleep 遊戲內的睡眠點數，主要用在進階兌換處換道具；只有在透過 Google Play 支付票證費用等合格交易時，才會累積 Google Play Points。'],
        ['可以直接用日本公布的價格來比較台灣方案嗎？', '不建議這樣比較。各地區的稅制、幣別與商店定價基準都不同，請直接看自己台灣地區購買畫面上實際顯示的 1 個月與 6 個月價格來計算。']
      ]
    }
  },
  {
    slug: 'google-play-games-pc-play-points', jaAlternate: '/articles/2026-08-16-pc-play-games-points.html', source: '9077192', category: 'earn',
    publishedAt: '2026-11-19', modifiedAt: '2026-11-19',
    en: {
      title: 'Google Play Games on PC and Play Points: why PC boosts do not travel to your phone',
      seoTitle: 'Google Play Games on PC & Play Points: PC Boost Rules',
      description: 'Bought in-game items on Google Play Games on PC? Learn how desktop purchases earn Play Points, why "on PC" boosts never apply on Android phones, and where quests live.',
      intro: 'Playing mobile games on a bigger monitor with Google Play Games on PC feels seamless—and eligible purchases made there earn Google Play Points just like on Android. The catch is that desktop promotions follow their own device rules, which often surprises players switching between PC and phone.',
      sections: [
        ['Desktop purchases earn Play Points, playtime does not', ['Google’s official Play Points rules confirm you earn points on eligible Google Play purchases made on an Android device, computer, or smart TV.', 'Just launching a title or logging hours on PC will not generate regular Play Points on its own—an eligible checkout has to happen through Google Play.']],
        ['Where to see your level on PC', 'Inside Google Play Games on your computer, click Play Points in the left sidebar and open Level benefits. That view shows your current tier, base rate, and annual progress deadline without needing to grab your phone.'],
        ['Why “on PC” boosts stay strictly on PC', ['Whenever a boost card is labeled “on PC”, that promotional rate counts only toward qualifying purchases you actually complete on your computer.', 'Even if you hit Activate while sitting at your desk, switching back to your Android phone to buy an item drops the purchase back to your regular rate. If you want the PC boost, finish the checkout on PC too.']],
        ['Quests and stamp cards still live on your phone', ['Google Play Quests and Play Points stamp cards are currently unavailable on Google Play Games on PC and on the Google Play website.', 'If you want to join or track those mobile missions, open the Play Store app on your Android phone while signed into the same Google account.']],
        ['If points from a PC purchase look slow to appear', 'Do not panic or buy the pack a second time if your point total does not jump right away. Close and reopen Google Play Games on PC first, then review the Play Points history on the exact Google account that paid—points earned on computer checkouts can sometimes take extra time to show up.']
      ],
      faq: [
        ['Do “on PC” Play Points boosts apply to Android phone purchases?', 'No. Google explicitly notes that a points boost labeled “on PC” applies only to qualifying purchases completed on a computer. Activating it on PC does not carry the higher rate over to checkouts on your Android phone.'],
        ['Can I complete Google Play Quests from PC?', 'No. Play Quests and stamp cards are supported only in the mobile Play Store app right now, not inside Google Play Games on PC or on the Google Play website.']
      ]
    },
    ko: {
      title: 'PC용 Google Play Games 결제와 Play Points: PC 전용 부스트 주의할 점',
      description: '컴퓨터에서 PC용 Google Play Games로 결제해도 Play Points가 쌓일까요? 기본 적립 조건부터 PC 전용 부스트가 폰 결제에 안 붙는 이유, 퀘스트 제한까지 정리했습니다.',
      intro: '집에서는 큰 모니터로 즐기려고 PC용 Google Play Games를 켜는 분이 많죠. 컴퓨터에서 진행한 결제라도 Google Play 적격 구매라면 Android와 똑같이 Play Points가 적립됩니다. 다만 PC 전용으로 표시된 부스트나 퀘스트는 모바일과 조건이 달라, 기기를 오가며 결제할 때 헷갈리기 쉽습니다.',
      sections: [
        ['PC 결제도 적립되지만 플레이만으로는 쌓이지 않습니다', ['Google 공식 안내에 따르면 Android 기기뿐 아니라 컴퓨터와 스마트 TV에서 진행한 적격 Google Play 구매에서도 포인트를 모을 수 있습니다.', '반면 단순히 PC에서 게임을 오래 켜 두고 플레이하는 것만으로는 일반 구매 포인트가 적립되지 않으니 결제 여부가 기준이 됩니다.']],
        ['PC 화면에서 내 등급 살펴보기', '컴퓨터에서 Google Play Games를 연 뒤 왼쪽 메뉴의 Play Points를 누르고 등급 혜택을 클릭하면, 스마트폰을 켜지 않고도 현재 등급과 혜택, 다음 등급까지의 기한을 한눈에 볼 수 있습니다.'],
        ['PC 전용 부스트는 결제까지 PC에서 마쳐야 적용됩니다', ['프로모션 카드에 “PC에서” 또는 PC 전용 표시가 붙은 포인트 부스트는 말 그대로 컴퓨터 결제에만 반응합니다.', 'PC 화면에서 미리 시작 버튼을 눌러 두었더라도, 실제 결제를 스마트폰에서 진행하면 PC 전용 배율은 따라가지 않고 기본 적립률만 적용됩니다. 혜택을 노린 결제라면 결제 버튼도 PC에서 누르는 편이 안전합니다.']],
        ['퀘스트와 스탬프 카드는 스마트폰 전용입니다', ['현재 Google Play 퀘스트와 스탬프 카드는 PC용 Google Play Games나 Google Play 웹사이트에서 지원되지 않습니다.', '모바일 전용 미션을 살펴보거나 참여하고 싶을 때는 같은 Google 계정으로 로그인한 스마트폰 Play 스토어 앱을 열어 보세요.']],
        ['PC 결제 후 포인트가 바로 안 보일 때', '결제를 마쳤는데 포인트 숫자가 즉시 늘어나지 않더라도 곧장 다시 결제하지 마세요. 먼저 PC 앱을 완전히 닫았다가 다시 켜 보고, 실제 결제한 Google 계정의 포인트 기록을 살펴보는 게 좋습니다. PC 구매 건은 내역에 반영되기까지 시간이 조금 더 걸릴 수 있습니다.']
      ],
      faq: [
        ['PC에서 부스트를 시작하면 휴대폰 결제에도 추가 적립되나요?', '아니요, 적용되지 않습니다. PC용 포인트 부스트는 컴퓨터에서 완료한 구매에만 적용되기 때문에, PC에서 먼저 활성화했더라도 스마트폰에서 결제하면 일반 적립률로 계산됩니다.'],
        ['PC에서도 Play Points 퀘스트를 깰 수 있나요?', '아니요. 현재 퀘스트와 스탬프 카드는 PC용 Google Play Games나 웹사이트가 아닌 스마트폰 Play 스토어 앱에서만 이용할 수 있으므로, 같은 계정의 모바일 앱에서 참여해야 합니다.']
      ]
    },
    tw: {
      title: 'Google Play Games 電腦版課金也能拿 Play Points 嗎？電腦版點數倍增規則整理',
      seoTitle: 'Google Play Games 電腦版與 Play Points：電腦版加倍規則',
      description: '用電腦版 Google Play Games 儲值可以累積 Play Points 嗎？整理電腦版積點資格、電腦點數倍增為何不適用手機付款，以及任務與集章卡限制。',
      intro: '回家改用電腦大螢幕玩手遊越來越方便，在 Google Play Games 電腦版裡面儲值，只要透過符合資格的 Google Play 結帳同樣能累積 Play Points。不過標上「電腦版」的點數倍增活動與任務規則和手機不太一樣，切換裝置儲值前先分清楚才不會白跑一趟。',
      sections: [
        ['電腦消費一樣有基本點數，但光掛機玩不會給點', ['依 Google 官方說明，無論是在 Android 手機、電腦或智慧電視上透過 Google Play 完成合格購買，都能照常累積點數。', '不過單純在電腦開啟遊戲遊玩、沒有經過合格消費，並不會因此直接拿到一般購買點數。']],
        ['在電腦版就能直接看等級進度', '打開電腦上的 Google Play Games，點選左側選單的「Play Points」，再進到「等級禮遇」，不用拿起手機就能查看目前的會員等級、專屬福利與升級期限。'],
        ['標註「電腦版」的點數倍增只認電腦交易', ['如果你啟用了標記「電腦版」的點數倍增活動，這份加碼倍率就只認你在電腦端完成的合格購買。', '就算你已經在電腦上按了啟用，最後卻拿手機去結帳，手機那筆交易還是只會照手機當下適用的倍率計算，不會把電腦版的加倍一起帶過去。']],
        ['任務與集章卡目前只支援手機版', ['Google Play 任務與集章卡目前只做在手機版 Play 商店裡，Google Play Games 電腦版跟網頁版都還不支援參加或追蹤進度。', '想解任務或湊集章卡時，記得切回同一組 Google 帳號的手機操作。']],
        ['電腦儲值完點數比較慢跳出來怎麼辦？', '結帳後如果點數沒立刻加進來，先別急著重買一次。建議先把電腦版 Google Play Games 完全關閉再重新開啟，並看清楚登入的是不是實際扣款的那個 Google 帳號；電腦端交易有時候需要多等一小段處理時間才會更新在紀錄裡。']
      ],
      faq: [
        ['在電腦版啟用「電腦版加倍」後，改用手機課金也有同倍率嗎？', '沒有喔。只要活動標註為電腦版點數倍增，就只適用在電腦端完成的購買交易；回到手機上結帳時，仍會依手機當時適用的點數率計算。'],
        ['可以直接在電腦版完成 Play Points 任務或集章卡嗎？', '不行。Google 官方說明任務與集章卡目前僅支援手機版 Play 商店，電腦版 Play Games 和 Play 網頁版都無法使用這兩項功能。']
      ]
    }
  },
  {
    slug: 'web-store-external-billing-play-points', jaAlternate: '/articles/2026-08-19-web-store-external-billing-points.html', source: '11174377', category: 'earn',
    publishedAt: '2026-11-19', modifiedAt: '2026-11-19',
    en: {
      title: 'Game web stores and external billing: do they earn Google Play Points?',
      seoTitle: 'Game Web Stores & External Billing: Play Points Rules',
      description: 'Official game web shops often dangle bonus gems, while apps may show alternative billing. See why neither earns Google Play Points or accepts Play balance.',
      intro: 'Plenty of mobile games now run their own official web stores loaded with bonus gems or extra bundles. Before assuming those browser purchases still nudge your Google Play Points forward, it helps to look at which billing system actually takes the payment.',
      sections: [
        ['An official game web shop is not Google Play billing', ['A developer’s web store is an official place to buy items for that game, yet paying directly through a browser or external processor skips Google Play’s billing system altogether.', 'Because Google Play never processes that transaction, browser checkouts do not earn Play Points and do not count toward your annual level progress.']],
        ['Alternative in-app billing rules out points and Play balance', 'Even inside an app, choosing an alternative billing option instead of Google Play’s checkout changes what works. Google’s billing policy notes that alternative billing purchases cannot earn Google Play Points, cannot be paid with Google Play balance or gift cards, and are not eligible for Play offers.'],
        ['How to compare an external bonus against Play Points fairly', ['Put the same dollar budget side by side before deciding where to pay. On the publisher web store side, count the guaranteed extra in-game items or direct discount; on the Google Play side, add up the regular or boosted points you will earn plus any Play coupon you plan to use.', 'Resist treating Play Points and in-game currency as equal 1:1 numbers—what matters is which side gives you more value you will actually use.']],
        ['Refunds and support follow whichever checkout you used', 'Because external web shops and alternative billing systems sit outside Google Play’s order history, Google Play cannot process refunds or billing disputes for them. Take a quick look at the seller’s refund and support terms before paying on an external site.']
      ],
      faq: [
        ['If a web shop is run by the official game studio, will I still get Play Points?', 'No, unless the checkout itself runs through Google Play’s billing system. Official publisher web stores that charge you directly in a browser or through a third-party gateway never pass through Google Play billing, so no Play Points or tier progress are awarded.'],
        ['Can I spend Google Play balance on an official game web store?', 'No. Alternative billing screens and external browser checkouts do not accept Google Play balance or Google Play gift cards, which can only be spent through standard Google Play billing.']
      ]
    },
    ko: {
      title: '게임사 공식 웹 스토어나 외부 결제에서도 Play Points가 쌓일까?',
      description: '보너스 재화를 더 주는 게임 공식 웹 상점이나 앱 내 대체 결제, Google Play Points도 같이 적립될까요? 적립과 Play 잔액 사용, 공정한 비교 기준과 환불 창구까지 정리했습니다.',
      intro: '요즘은 보너스 재화를 더 얹어 주며 게임사 공식 웹 스토어로 안내하는 모바일 게임이 꽤 많습니다. 공식 상점인 만큼 어쩐지 Google Play Points도 함께 쌓일 것 같지만, 실제 적립 여부는 누가 공식인지가 아니라 결제 창이 Google Play를 거치는지에 달려 있습니다.',
      sections: [
        ['게임사 공식 몰이라도 Google Play 결제는 아닙니다', ['개발사가 직접 여는 웹 스토어는 정식 판매 채널이 맞지만, 브라우저에서 외부 결제사로 바로 넘어가 결제하는 거래는 Google Play 결제 시스템을 거치지 않습니다.', '결제 자체가 Google Play 바깥에서 끝나기 때문에 Play Points 적립 대상이 아니며 연간 등급 진행도에도 들어가지 않습니다.']],
        ['앱 내 대체 결제 역시 포인트와 Play 잔액을 못 씁니다', '앱 안에서 결제하더라도 Google Play 결제 대신 대체 결제 시스템을 고르면 혜택 구조가 달라집니다. Google 결제 도움말은 대체 결제 시스템으로 진행한 거래에서는 Play Points를 모을 수 없고, Google Play 잔액이나 기프트카드 사용 및 Play 프로모션 적용도 불가능하다고 안내합니다.'],
        ['어느 쪽이 유리한지는 같은 예산으로 나란히 비교하세요', ['두 경로를 비교할 때는 똑같은 결제 금액을 기준으로 놓는 편이 가장 정확합니다. 웹 스토어 쪽에는 확실히 더 주는 보너스 재화와 직접 할인을 두고, Google Play 쪽에는 기본 적립이나 적용 가능한 부스트, 실제로 쓸 Play 쿠폰 가치를 얹어 보세요.', '포인트 숫자와 게임 내 재화 수량을 단순 1 대 1로 더하기보다는, 당장 내 계정에 체감되는 이득이 큰 쪽을 고르면 됩니다.']],
        ['환불과 문의 창구도 결제한 곳을 따라갑니다', 'Google Play를 거치지 않은 웹 상점이나 대체 결제 내역은 Google Play 주문 관리 목록에 남지 않습니다. 문제가 생겼을 때를 대비해 외부 사이트에서 결제하기 전에 해당 판매자나 결제 제공사의 환불 규정을 먼저 살펴 두는 편이 안전합니다.']
      ],
      faq: [
        ['게임사가 직접 운영하는 공식 웹 상점이라면 Play Points가 쌓이나요?', '아니요. 게임사의 공식 몰이더라도 결제가 Google Play 결제 시스템으로 처리되지 않는 이상 Play Points는 적립되지 않으며, 연간 등급 진행도에도 반영되지 않습니다.'],
        ['대체 결제 화면에서 Google Play 잔액을 쓸 수 있나요?', '사용할 수 없습니다. Google 안내에 따르면 대체 결제 시스템이나 외부 웹 스토어에서는 Google Play 잔액 및 기프트카드를 결제 수단으로 쓸 수 없고, 일반 Google Play 결제 화면에서만 사용할 수 있습니다.']
      ]
    },
    tw: {
      title: '遊戲官方 Web 商店與外部付款，也能累積 Play Points 嗎？',
      seoTitle: '遊戲官方 Web 商店與外部付款：Play Points 規則比較',
      description: '不少手遊都在推官方網頁商店送加碼虛寶，在裡面課金也能順便拿 Play Points 嗎？整理 Google Play 計費差異、餘額限制、比價算法與退款窗口。',
      intro: '現在許多熱門手遊都會在自家官方 Web 商店主打加贈寶石或專屬折扣，讓人忍不住好奇：「在那邊儲值也能順便累積 Play Points 嗎？」其實關鍵不在商店是不是官方直營，而在於最後收款有沒有經過 Google Play 計費系統。',
      sections: [
        ['遊戲商官方通路，不等於 Google Play 計費系統', ['開發商自己架設的 Web 商店雖然是貨真價實的官方通路，但只要是在瀏覽器裡交給第三方金流或官方自行扣款，這筆交易就沒有走進 Google Play 的計費系統。', '也因為沒有經過 Google Play 收款，這類消費不會產生 Play Points，自然也不會算進你的年度等級進度裡。']],
        ['App 內選用替代計費，也無法積點或用 Play 餘額', '就算是在遊戲 App 裡按購買，只要選了 Google Play 以外的替代計費系統，適用規則就會完全不同。依 Google 官方付款說明，透過替代計費系統完成的交易不能賺取 Google Play Points，無法使用 Google Play 餘額或禮物卡，也不適用 Google Play 的優惠活動。'],
        ['拿同一筆預算兩邊比一比，誰划算很明顯', ['與其猜哪邊比較賺，不如用同一筆預算來並列試算：一邊放進 Web 商店多送的遊戲幣與現金折扣，另一邊則算入 Google Play 當下的點數倍率加上你真的會用到的 Play 優惠券。', '記得把點數跟遊戲幣分開看，不要直接把兩者相加，這樣很快就能看出哪一邊比較符合這次的需求。']],
        ['退款與客服窗口也要找原本結帳的那一邊', '沒經過 Google Play 結帳的外部購買，不會出現在 Google Play 的訂單管理中，Google Play 也無法幫忙處理退款。因此在外部網頁輸入付款資料前，不妨先掃一眼該 Web 商店或支付平台的退款規則與客服聯絡方式。']
      ],
      faq: [
        ['只要是遊戲公司官方開的網頁儲值，就能累積 Play Points 嗎？', '不能喔。是否累積 Play Points 看的是結帳有沒有經過 Google Play 計費系統，而不是通路是不是官方直營；透過遊戲公司自建網頁金流完成的交易不會計入 Play Points。'],
        ['用替代付款或外部 Web 商店時，可以拿 Google Play 餘額來付嗎？', '不可以。根據 Google 計費規定，替代計費系統與外部瀏覽器結帳都不支援使用 Google Play 餘額或 Google Play 禮物卡，這兩者只能在標準 Google Play 計費畫面裡折抵。']
      ]
    }
  }
];

const REGION = { en: { country: 'US', hl: 'en' }, ko: { country: 'KR', hl: 'ko' }, tw: { country: 'TW', hl: 'zh-Hant' } };
const SOURCE_COPY = {
  en: { title: 'Official sources checked: October 14, 2026', body: 'The rules in this guide follow the official help pages linked below. Because live prices and active promos depend on your own account, take a quick look at your Google Play screen before paying.', link: 'Open the official guide', program: 'Google Play Points official help' },
  ko: { title: '공식 정보 확인: 2026년 10월 14일', body: '이 글의 기준은 아래 Google 공식 도움말을 바탕으로 정리했습니다. 실제 가격과 내 계정에 열린 혜택은 결제 직전 Google Play 화면이 가장 정확합니다.', link: '공식 도움말 보기', program: 'Google Play Points 공식 도움말' },
  tw: { title: '官方資訊確認：2026年10月14日', body: '這篇整理的規則都對照下方的官方說明。實際價格和你的帳號能不能參加活動，還是以結帳當下的 Google Play 畫面為準。', link: '前往官方說明頁', program: 'Google Play Points 官方說明' }
};
const EXTRA_SOURCES = {
  'google-play-points-basics': [['9080348', 'levels']],
  'google-play-credit-subscriptions': [['7018481', 'renewal'], ['4646404', 'payments']],
  'google-play-points-stamp-cards': [['9077247', 'devices'], ['android-developer/16517110', 'cards']],
  'pokemon-sleep-premium-pass-plans': [['pokemon-benefits', 'benefits']],
  'google-play-games-pc-play-points': [['9080348', 'levels'], ['9077247', 'devices']],
  'web-store-external-billing-play-points': [['9077192', 'earn']]
};
const SOURCE_LABELS = {
  en: { levels: 'US levels and benefits', renewal: 'Subscription renewal and payment methods', payments: 'US accepted payment methods', devices: 'Devices supported for quests and stamp cards', cards: 'Google’s stamp-card promotion overview', benefits: 'Pokémon Sleep Premium Pass benefits', earn: 'Earn and track Google Play Points' },
  ko: { levels: '한국 등급과 혜택', renewal: '구독 갱신과 결제 수단', payments: '한국 지원 결제 수단', devices: '퀘스트·스탬프 카드 지원 기기', cards: 'Google 스탬프 카드 프로모션 안내', benefits: 'Pokémon Sleep 프리미엄 패스 혜택', earn: 'Google Play Points 적립 및 추적' },
  tw: { levels: '台灣等級與福利', renewal: '訂閱續訂與付款方式', payments: '台灣支援的付款方式', devices: '任務與集章卡支援的裝置', cards: 'Google 集章卡活動說明', benefits: 'Pokémon Sleep 進階票證福利', earn: '賺取與追蹤 Google Play Points' }
};

function buildLocalizedTopicArticles(locales, labels) {
  return Object.keys(REGION).flatMap(locale => TOPICS.map(topic => {
    const region = REGION[locale], copy = SOURCE_COPY[locale], content = topic[locale];
    const links = topic.slug === 'pokemon-sleep-premium-pass-plans'
      ? [['google-play-points-subscriptions', { en: 'Do subscriptions earn Play Points?', ko: '구독 결제의 Play Points 적립 조건', tw: '訂閱的 Play Points 積點條件' }[locale]], ['google-play-credit-subscriptions', { en: 'Pay subscriptions with Play credit', ko: 'Play 크레딧으로 구독 결제', tw: '抵用金支付訂閱' }[locale]]]
      : [['google-play-points-levels', { en: 'Local levels and earning rates', ko: '한국 등급과 적립률', tw: '台灣等級與積點率' }[locale]], ['google-play-points-play-credit-not-working', { en: 'Play credit troubleshooting', ko: 'Play 크레딧 문제 해결', tw: 'Play 抵用金問題排解' }[locale]], ['google-play-points-stamp-cards', { en: 'Read a stamp card', ko: '스탬프 카드 읽기', tw: '看懂集章卡' }[locale]]];
    return {
      ...content, file: `${locale}/articles/${topic.slug}.html`, lang: locale === 'tw' ? 'zh-TW' : locale,
      h1: content.title, lead: content.intro, badge: { en: 'Practical guide', ko: '실용 가이드', tw: '實用指南' }[locale],
      publishedAt: topic.publishedAt || '2026-10-14', modifiedAt: topic.modifiedAt || content.modifiedAt || '2026-10-14', jaAlternate: topic.jaAlternate,
      labels: labels[locale], siteName: locales[locale].siteName, ctaHref: `/${locale}/`,
      officialSourceTitle: copy.title, officialSourceBody: copy.body,
      officialSourceHref: topic.sourceHrefByLocale?.[locale] || topic.sourceHref || `https://support.google.com/googleplay/answer/${topic.source}?co=GENIE.CountryCode%3D${region.country}&hl=${region.hl}`,
      officialSourceLink: copy.link, officialProgramLink: copy.program,
      officialSourceLinks: (EXTRA_SOURCES[topic.slug] || []).map(([id, label]) => ({
        href: id === 'pokemon-benefits'
          ? ({ ko: 'https://pokemonkorea.co.kr/game_support/pokemonsleep_FAQ/view/1635', tw: 'https://app-psl.pokemon-support.com/hc/zh-tw/articles/20336388720153', en: 'https://app-psl.pokemon-support.com/hc/en-us/articles/20336388720153-After-I-cancel-my-Premium-Pass-can-I-still-use-the-perks-and-items-I-have-received' }[locale])
          : id.startsWith('android-developer/')
            ? `https://support.google.com/googleplay/android-developer/answer/${id.split('/')[1]}?hl=${region.hl}`
            : `https://support.google.com/googleplay/answer/${id}?co=GENIE.CountryCode%3D${region.country}&hl=${region.hl}`,
        label: SOURCE_LABELS[locale][label]
      })),
      nextLinks: links.filter(([slug]) => slug !== topic.slug).map(([slug, label]) => [`/${locale}/articles/${slug}.html`, label])
    };
  }));
}

module.exports = { TOPICS, buildLocalizedTopicArticles };
