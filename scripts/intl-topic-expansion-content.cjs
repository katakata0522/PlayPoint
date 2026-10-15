'use strict';

// 日本語版の有用な題材を、価格・対象地域を混同しない地域別ガイドへ展開する。
const TOPICS = [
  {
    slug: 'google-play-points-basics', jaAlternate: '/about-playpoints.html', source: '15776742', category: 'account',
    en: {
      title: 'Google Play Points explained: earning, rewards and levels in the US',
      description: 'Start with Google Play Points: how to join, earn points, choose coupons or Play credit, and read US level progress without confusing it with your balance.',
      intro: 'Your next game purchase might also bring a useful reward. Google Play Points connects eligible Google Play purchases with points, coupons and level benefits. Start with the three parts of the program, then choose what is useful for you.',
      sections: [
        ['Join first, then earn', 'Open your profile in the Play Store and select Play Points. Eligible purchases made after joining can earn points; earlier purchases do not. Use the Google account that will make the purchase.'],
        ['A small US example', 'At the US Bronze base rate, $10 of eligible pre-tax spending earns about 10 points. An offer may change the final earn rate. Look at the offer before a purchase you already plan to make, rather than buying something just to fill a points target.'],
        ['Choose a reward you will actually use', 'The Use tab can show app-specific coupons, in-game items or Google Play credit. A coupon for a game you play may be more useful than an unfamiliar item. Compare the points required with the purchase you have in mind.'],
        ['Points are not the same as Play credit', 'Play Points are the rewards you collect. Google Play credit is a payment balance you can obtain through an eligible exchange. Collecting points alone does not automatically reduce a bill. If you choose Play credit, redeem it first, then check that balance at checkout.'],
        ['Your balance and level progress do different jobs', 'The balance is what you can spend on rewards. Annual level progress determines your level; redeeming points does not subtract those earned points from annual progress. The linked US levels guide has the local thresholds, and the calculator lets you compare the amount still needed.'],
        ['Next time you open Google Play', 'Check the account, your level, and the Earn and Use tabs. With those three things clear, the program is easier to enjoy alongside purchases you wanted to make anyway.']
      ],
      faq: [['Is this guide using Japanese rates?', 'No. The spending example is for US accounts. Use the country and earning rate displayed in your own Google Play account.'], ['Does exchanging points lower my annual progress?', 'No. The exchange uses your available balance; annual level progress is a separate number.']]
    },
    ko: {
      title: 'Google Play Points 시작하기: 한국 적립률과 포인트 사용법',
      description: '가입부터 적립·교환·등급까지 Google Play Points를 쉽게 이해하세요. 한국의 기본 적립 예시와 Play 잔액, 연간 등급 진행도의 차이를 설명합니다.',
      intro: '원래 사려던 게임 상품에 포인트 혜택까지 더해지면 반갑죠. Google Play Points는 대상 결제로 포인트를 모아 쿠폰이나 게임 아이템 등에 사용하는 프로그램입니다. 가입, 교환, 등급을 나눠 보면 처음에도 어렵지 않습니다.',
      sections: [
        ['가입을 먼저 마치세요', 'Play 스토어의 프로필에서 Play Points를 선택합니다. 가입 전에 결제한 상품에는 포인트가 소급 적립되지 않습니다. 실제 결제할 Google 계정으로 가입하는 것이 첫 단계입니다.'],
        ['한국 브론즈의 간단한 예시', '한국 브론즈 기본 적립률은 1,000원당 1포인트입니다. 대상 결제 금액 10,000원이면 기본적으로 약 10포인트를 예상할 수 있습니다. 캠페인이 있다면 표시된 최종 특별 적립률로 비교하세요. 포인트 때문에 구매를 늘리기보다 예정된 구매에 혜택을 더하는 편이 좋습니다.'],
        ['쓸 곳을 정하고 교환하기', '사용 탭에서 앱별 쿠폰, 게임 아이템, Google Play 크레딧 등 본인에게 제공되는 교환 항목을 확인합니다. 자주 하는 게임의 쿠폰이라면 낯선 상품보다 활용하기 쉬울 수 있습니다. 필요한 포인트와 구매할 상품을 함께 비교하세요.'],
        ['포인트와 Play 잔액은 다릅니다', 'Play Points는 혜택으로 교환하는 포인트이고 Google Play 크레딧은 지원되는 결제에 쓰는 잔액입니다. 포인트를 얻었다고 다음 결제 금액이 자동으로 줄지는 않습니다. Play 크레딧으로 쓰려면 먼저 교환한 뒤 결제 수단에 해당 잔액이 표시되는지 확인합니다.'],
        ['잔액과 연간 등급 진행도 구분하기', '교환에 쓰는 포인트 잔액과 등급을 결정하는 연간 진행도는 별개입니다. 포인트를 사용해도 그만큼 연간 적립 실적이 줄지는 않습니다. 자세한 한국 등급 기준은 등급 가이드에서, 남은 금액은 계산기에서 확인할 수 있습니다.'],
        ['다음 구매 전에 볼 세 가지', '선택한 계정, 현재 등급, 적립·사용 탭을 살펴보세요. 이 세 가지를 알면 원래 즐기던 게임과 구매 안에서 포인트 혜택을 찾기 쉬워집니다.']
      ],
      faq: [['일본 적립률을 그대로 사용하나요?', '아니요. 이 글의 금액 예시는 한국 계정 기준입니다. 본인 Google Play 계정의 국가와 적립률을 사용하세요.'], ['교환하면 연간 등급 진행도가 줄어드나요?', '아니요. 사용 가능한 잔액과 연간 등급 진행도는 서로 다른 숫자입니다.']]
    },
    tw: {
      title: 'Google Play Points 入門：台灣積點、兌換與會員等級',
      description: '從加入到兌換，看懂 Google Play Points 的運作。用台灣基本積點率示範，分清點數、Play 餘額與年度等級進度。',
      intro: '本來就想買的遊戲商品，如果還能多拿一份回饋，會更有樂趣。Google Play Points 讓你透過符合資格的消費累積點數，再選擇優惠券或遊戲道具。先分清加入、兌換和等級，就容易上手。',
      sections: [
        ['先加入，再累積', '在 Play 商店開啟個人資料，選擇 Play Points。加入前的消費不會追溯積點，因此請先用實際購買的 Google 帳號加入。'],
        ['台灣銅級的小例子', '台灣銅級基本積點率為每 NT$30 1 點。以 NT$300 的符合資格未稅消費為例，銅級基本可得約 10 點。活動可能改變最終獲點率，購買前先看活動畫面，比單純為了點數增加消費更實用。'],
        ['挑選自己真的會用的回饋', '在「使用」分頁比較帳號提供的 App 優惠券、遊戲道具或 Google Play 抵用金。常玩的遊戲優惠券可能比陌生道具更合適，先看需要多少點，再想下一次要買什麼。'],
        ['點數與 Play 餘額是兩件事', 'Play Points 是用來兌換回饋的點數；Google Play 抵用金則是可用於支援交易的餘額。拿到點數不代表下一筆帳單自動折抵。若選擇抵用金，先完成兌換，再確認結帳時能否使用該餘額。'],
        ['點數餘額與年度進度各有用途', '餘額決定還能兌換多少回饋，年度進度決定會員等級。使用點數不會扣除已累積的年度等級進度。台灣等級門檻可到等級指南查看，距離下一級還差多少金額則可用計算機試算。'],
        ['下次購買前看三個地方', '確認目前帳號、會員等級，以及「賺取」和「使用」分頁。掌握這些資訊，就能在原本喜歡的遊戲與消費裡找到合適的回饋。']
      ],
      faq: [['這裡直接套用日本積點率嗎？', '不是。金額例子使用台灣帳號的基本積點率，請以自己 Google Play 帳號的地區與獲點率為準。'], ['兌換點數會扣除年度進度嗎？', '不會。可使用的點數餘額與年度等級進度是不同數字。']]
    }
  },
  {
    slug: 'google-play-credit-subscriptions', jaAlternate: '/articles/2026-10-14-play-credit-subscription.html', source: '6080850', category: 'earn',
    en: {
      title: 'Use Google Play credit for subscriptions: check the first payment and renewal',
      description: 'Can Play credit redeemed from Play Points pay for a subscription? Check the billing store, balance, currency and renewal payment method before you subscribe.',
      intro: 'Turning Play Points into credit can make a subscription more affordable. The useful question is not just whether a balance exists, but whether this subscription accepts it now and will use the same payment method at renewal.',
      sections: [
        ['Find the billing store first', 'US Google Play balance can be used for supported subscriptions. A subscription billed on a website or through Apple is a different purchase route. Check whether the subscription appears in the Google account’s Play Store subscription list.'],
        ['Select credit at the first payment', 'Exchange points for Google Play credit if that option is available, then open the subscription checkout and inspect the payment method. The relevant balance must be in the account and currency used for the purchase.'],
        ['Plan for the next bill as well', 'A recurring plan normally renews using its selected payment method. Before renewal, open the subscription’s payment settings, check the upcoming date, and make sure enough usable balance remains. Backup methods and split payment can depend on the plan and checkout.'],
        ['A simple balance example', 'Suppose the displayed bill is $6 and the usable balance is $4. The $2 difference matters even though credit is available. If checkout offers another payment method for that difference, inspect the final breakdown; do not assume every renewal combines payment methods in the same way. This is an example, not a listed plan price.'],
        ['When credit does not appear', 'Compare the Google account, store country, currency, credit expiry and billing route. Resolve that mismatch before exchanging more points. The linked troubleshooting guide is useful when a balance exists but the payment option is missing.']
      ],
      faq: [['Is Play credit the same as an app-specific coupon?', 'No. A coupon has its own eligible app and purchase conditions. This guide concerns Google Play balance.'], ['Does uninstalling the app stop renewal?', 'No. Manage or cancel the subscription in the store that bills it.']]
    },
    ko: {
      title: 'Google Play 크레딧으로 구독 결제하기: 첫 결제부터 갱신까지',
      description: 'Play Points로 교환한 크레딧을 구독에 쓰려면 결제 스토어, 계정, 통화와 갱신 결제 수단을 확인해야 합니다. 잔액 부족 예시로 비교해 보세요.',
      intro: '모아 둔 Play Points를 크레딧으로 바꾸면 구독 비용에 보탤 수 있습니다. 중요한 것은 잔액이 있다는 사실뿐 아니라, 이 구독의 첫 결제와 다음 갱신에 그 잔액을 사용할 수 있는지입니다.',
      sections: [
        ['어느 스토어가 청구하는지 먼저 확인', '한국의 Google Play 잔액은 지원되는 구독에 사용할 수 있습니다. 웹사이트나 Apple에서 청구하는 구독은 결제 경로가 다릅니다. 먼저 같은 Google 계정의 Play 스토어 구독 목록에 해당 구독이 있는지 확인합니다.'],
        ['첫 결제 화면에서 크레딧 선택', '계정에 크레딧 교환 항목이 있으면 포인트를 교환한 뒤 구독 결제 화면의 결제 수단을 봅니다. 잔액을 가진 계정과 구매 계정, 잔액 통화와 구매 통화가 일치해야 합니다.'],
        ['다음 갱신까지 계산하기', '자동 갱신 구독은 일반적으로 선택한 결제 수단으로 다시 청구됩니다. 갱신 전에 결제 설정과 날짜, 사용 가능한 잔액을 확인하세요. 보조 결제 수단이나 잔액과 다른 수단을 함께 쓰는 방식은 구독과 화면에 따라 달라질 수 있습니다.'],
        ['잔액이 있어도 부족할 수 있습니다', '가상의 청구 금액이 6,000원이고 사용 가능한 잔액이 4,000원이면 차액은 2,000원입니다. 결제 화면이 차액을 다른 수단으로 낼 수 있게 제공하는지, 실제 청구 내역이 어떻게 나오는지 봅니다. 특정 상품의 가격이나 모든 갱신의 결제 방식을 뜻하는 예시는 아닙니다.'],
        ['크레딧이 보이지 않을 때', '계정, Play 국가, 통화, 잔액 유효기간과 청구 경로를 차례로 비교합니다. 원인을 찾기 전에 포인트를 더 교환하기보다 연결된 문제 해결 가이드에서 확인 순서를 살펴보세요.']
      ],
      faq: [['앱 전용 쿠폰과 같은 것인가요?', '아니요. 쿠폰에는 별도의 대상 앱과 구매 조건이 있습니다. 여기서는 Google Play 잔액을 설명합니다.'], ['앱을 지우면 자동 갱신도 중단되나요?', '아니요. 청구하는 스토어에서 구독을 관리하거나 해지해야 합니다.']]
    },
    tw: {
      title: 'Google Play 抵用金支付訂閱：首次付款與續訂要分開看',
      description: '用 Play Points 兌換的 Google Play 抵用金支付訂閱前，確認付款平台、帳號、幣別、餘額與續訂付款方式。',
      intro: '把累積的 Play Points 換成抵用金，可以替訂閱費用出一份力。關鍵不只是帳號有餘額，還要確認這筆訂閱首次付款和下一次續訂是否能用同一份餘額。',
      sections: [
        ['先找出實際請款的平台', '台灣 Google Play 餘額可用於支援的訂閱；網站或 Apple 請款是不同的購買管道。先確認這筆訂閱是否出現在同一 Google 帳號的 Play 商店訂閱清單。'],
        ['首次付款時選擇抵用金', '如果帳號提供抵用金兌換項目，先完成兌換，再看訂閱結帳畫面的付款方式。餘額所屬帳號與購買帳號、餘額幣別與交易幣別必須相符。'],
        ['下一次續訂也要準備好', '自動續訂通常會再次使用選定的付款方式。到訂閱設定查看下一次日期、付款方式與可用餘額。備用付款方式和拆分付款是否支援，要依訂閱方案與實際畫面判斷。'],
        ['有餘額，也可能還差一筆', '假設帳單為 NT$180，可用餘額為 NT$120，差額就是 NT$60。看看結帳畫面是否提供其他方式支付差額，以及最後的付款分配。這是示範，不是某個方案的售價，也不代表每次續訂都能自動合併付款。'],
        ['抵用金沒有出現時', '依序比對帳號、Play 地區、幣別、餘額期限和請款平台。先找到差異，再決定是否兌換更多點數；相關問題排解指南可以幫你縮小範圍。']
      ],
      faq: [['抵用金和 App 專用優惠券一樣嗎？', '不一樣。優惠券另有適用 App 和購買條件，本文說明的是 Google Play 餘額。'], ['移除 App 就會停止續訂嗎？', '不會。要到實際請款的商店管理或取消訂閱。']]
    }
  },
  {
    slug: 'google-play-points-stamp-cards', jaAlternate: '/articles/2026-10-13-play-points-stamp-cards.html', source: '9077192', category: 'earn',
    en: {
      title: 'Google Play Points stamp cards: make each purchase count',
      description: 'Learn how Play Points stamp cards count purchases, how they differ from boosts and quests, and where to check the amount, currency, activation and reward deadline.',
      intro: '“One more purchase” can be tempting. A Play Points stamp card rewards a specified number of qualifying purchases. If those purchases were already in your plans, the card can add a welcome extra; the total spend alone is not the whole rule.',
      sections: [
        ['A stamp is a purchase condition', 'A stamp card counts eligible purchases, a boost changes the earn rate, and a quest asks for a set of actions. Read the card’s minimum amount per purchase and required purchase count before treating it like a points multiplier.'],
        ['The same total can produce different results', 'Imagine a card requiring three purchases of at least $5 each. One $15 purchase meets the amount but only counts as one purchase; three eligible $5 purchases could meet both conditions. Five $3 purchases do not meet this example’s minimum amount. These are invented conditions for comparison, not a current offer.'],
        ['Look on your phone', 'Open the Play Store profile, select Play Points, then check Earn. Stamp cards and quests are not available on Play Games on PC or the Google Play website. Availability depends on the account and offer; an absent card does not mean everyone else has the same campaign.'],
        ['Before the first purchase', 'Read the eligible app or item, currency, activation action, purchase window and reward collection deadline. Purchases must use the promotion’s currency. The card’s terms decide how discounts and minimum amounts are handled.'],
        ['Compare the extra cost, not just the reward', 'If completing a card requires purchases you did not want, write down that additional cost first. If your planned purchases already meet the conditions, enjoy the extra reward without turning the campaign into a new shopping list.']
      ],
      faq: [['Does a stamp card mean a higher earn rate?', 'Not by itself. Purchase-count rewards and earn-rate boosts are different conditions.'], ['Can I complete the card from a PC?', 'Check it on a supported phone. Google says quests and stamp cards are unavailable on Play Games on PC and the Play website.']]
    },
    ko: {
      title: 'Google Play Points 스탬프 카드: 구매 횟수와 보상 조건 읽는 법',
      description: 'Play Points 스탬프 카드의 대상 구매 횟수, 건별 최소 금액, 통화와 시작 조건을 확인하는 방법. 포인트 부스트·퀘스트와의 차이를 설명합니다.',
      intro: '“한 번만 더 구매하면 완료”라는 문구는 눈길을 끕니다. Play Points 스탬프 카드는 정해진 횟수의 대상 구매로 리워드를 받는 캠페인입니다. 원래 예정된 구매로 채울 수 있다면 반가운 추가 혜택이 됩니다.',
      sections: [
        ['스탬프는 구매 조건입니다', '스탬프 카드는 대상 구매 횟수, 부스트는 적립률, 퀘스트는 지정된 행동을 중심으로 봅니다. 먼저 건별 최소 금액과 필요한 횟수를 읽고, 포인트 배율과 혼동하지 않도록 합니다.'],
        ['합계가 같아도 결과는 다릅니다', '가상으로 5,000원 이상 구매를 세 번 요구하는 카드가 있다고 해 보세요. 15,000원 한 번은 구매 한 건이고, 대상 5,000원 구매 세 건은 금액과 횟수를 모두 채울 수 있습니다. 3,000원 다섯 번은 이 예시의 건별 최소 금액을 채우지 못합니다. 현재 제공 중인 오퍼를 뜻하지 않습니다.'],
        ['스마트폰에서 카드 찾기', 'Play 스토어 프로필에서 Play Points의 적립 탭을 봅니다. PC용 Play Games와 Google Play 웹사이트에서는 퀘스트와 스탬프 카드를 사용할 수 없습니다. 제공 여부는 계정과 오퍼에 따라 달라집니다.'],
        ['구매 전에 확인할 조건', '대상 앱·상품, 통화, 시작 또는 활성화 동작, 구매 기간과 리워드 수령 기한을 살펴봅니다. 구매 통화는 프로모션 통화와 일치해야 하며, 할인 후 금액 처리와 최소 금액은 카드 약관을 기준으로 봅니다.'],
        ['리워드보다 추가 지출부터 계산', '완료하려고 필요 없는 상품을 더 사야 한다면 늘어나는 지출을 먼저 적어 보세요. 이미 예정된 구매가 조건을 채운다면 캠페인 때문에 새 구매 목록을 만들지 않고 추가 혜택을 즐길 수 있습니다.']
      ],
      faq: [['스탬프 카드가 곧 포인트 부스트인가요?', '아니요. 구매 횟수에 대한 리워드와 적립률을 높이는 부스트는 조건이 다릅니다.'], ['PC에서 카드에 참여할 수 있나요?', '지원되는 스마트폰에서 확인하세요. Google은 PC용 Play Games와 웹사이트에서 퀘스트·스탬프 카드를 제공하지 않는다고 안내합니다.']]
    },
    tw: {
      title: 'Google Play Points 集章卡：購買次數與每筆金額要一起看',
      description: '看懂 Play Points 集章卡的購買次數、每筆最低金額、幣別、啟用與領獎期限，分清加倍活動和任務的差別。',
      intro: '看到「再買一次就完成」，很容易想把卡片填滿。這類集點卡依指定次數的合格購買提供回饋；如果原本的購買計畫就能完成，會是一份很實用的額外獎勵。',
      sections: [
        ['集章卡看的是購買條件', '集章卡看合格購買次數，加倍活動看獲點率，任務則看指定行動。先讀每筆最低金額和需要幾次購買，不要把次數直接當成點數倍率。'],
        ['總額相同，也可能算不一樣', '假設某張卡要求三次每筆至少 NT$150 的購買。一次 NT$450 只有一筆；三筆合格的 NT$150 購買可能同時滿足金額與次數；五筆 NT$90 則沒有達到每筆門檻。這是假設例子，不是目前正在發送的優惠。'],
        ['到手機找卡片', '在 Play 商店個人資料中選擇 Play Points，再查看「賺取」。Google Play Games 電腦版與 Play 網站不支援任務及集章卡。活動會因帳號與條件而異，看不到卡片不代表每個人都收到同一張。'],
        ['付款前讀完幾個條件', '查看適用 App 或商品、幣別、啟用步驟、購買期間和領獎期限。購買幣別必須與活動一致；折扣後的金額是否符合門檻，要以卡片條款判斷。'],
        ['先算增加的支出', '如果為了完成而多買不需要的商品，先列出額外支出。原本就要買的商品已符合條件時，才能在不新增購物清單的情況下享受回饋。']
      ],
      faq: [['集章卡一定會提高積點倍率嗎？', '不一定。購買次數獎勵與提高獲點率是不同的條件。'], ['可以用電腦完成卡片嗎？', '請在支援的手機查看。Google 說明電腦版 Play Games 與 Play 網站不支援任務和集章卡。']]
    }
  },
  {
    slug: 'pokemon-sleep-premium-pass-plans', jaAlternate: '/articles/2026-10-14-pokemon-sleep-premium-pass-plans.html', category: 'earn',
    sourceHref: 'https://support.pokemon.com/hc/en-us/articles/17264929442324-Pok%C3%A9mon-Sleep-Billing-and-Premium-Pass-FAQ',
    sourceHrefByLocale: { tw: 'https://app-psl.pokemon-support.com/hc/zh-tw/articles/20406040940185' },
    en: {
      title: 'Pokémon Sleep Premium Pass: one month or six months? Compare the daily benefits',
      description: 'Compare Pokémon Sleep Premium Pass monthly and six-month plans, daily sleep points, local prices and subscription-streak rules. Sleep points and Play Points are separate.',
      intro: 'If checking new Pokémon sleep styles has become part of your morning, the Premium Pass may be tempting. One month gives you a way to try it; six months deserves a closer look when you already want to keep playing. Start with what you will use each day.',
      sections: [
        ['The daily bonus adds up', 'An active Premium Pass gives a bonus 100 sleep points each day you track sleep. Tracking on 30 eligible days gives 3,000 bonus sleep points. The Premium Exchange and upgraded daily biscuit also make those regular check-ins more interesting.'],
        ['Compare the prices on your own store', 'Read both the one-month and six-month prices in your app. Compare monthly price × 6 with the six-month price, then divide the six-month price by 6 for its monthly equivalent. Use the same country, platform and tax basis; Japanese yen prices are not a US quote.'],
        ['Match the duration to your routine', 'If you are still finding a sleep-tracking routine, a shorter plan may be easier to judge. If you expect to use the benefits for six months, compare the longer plan’s total saving with the chance that you will stop using it earlier.'],
        ['Check your subscription streak before switching', 'Pokémon’s billing FAQ explains that Android plan changes can require cancellation, expiry and purchasing the new plan, which resets the streak. Changing stores also resets it. Check those steps before changing a plan simply because its monthly equivalent looks lower.'],
        ['Sleep points and Google Play Points are separate', 'The daily bonus in this article is Pokémon Sleep’s in-game currency. Google Play Points concerns eligible purchases billed through Google Play. Keep the two balances separate when assessing the pass.'],
        ['Choose the benefits you will enjoy', 'Write down the daily features you use and the number of months you realistically expect to keep playing. That gives the price comparison a purpose beyond choosing the longest plan.']
      ],
      faq: [['Does the pass’s daily bonus add to Google Play Points?', 'No. The bonus is sleep points inside Pokémon Sleep.'], ['Can I use Japan’s listed price in a US comparison?', 'No. Use the current prices displayed for your country and purchase platform.']]
    },
    ko: {
      title: '포켓몬 슬립 프리미엄 패스: 1개월과 6개월, 매일 받는 혜택으로 비교',
      description: 'Pokémon Sleep 프리미엄 패스의 일일 슬립 포인트와 1개월·6개월 가격 비교 방법, 플랜 변경 시 연속 구독 기간을 확인하세요.',
      intro: '아침마다 포켓몬의 새로운 잠자는 모습을 찾는 일이 익숙해졌다면 프리미엄 패스도 궁금해집니다. 한 달 동안 써 볼지, 여섯 달 이어 갈지 선택하기 전에 매일 실제로 누릴 혜택부터 살펴보세요.',
      sections: [
        ['매일 받는 보너스가 쌓입니다', '프리미엄 패스가 활성화된 동안 수면을 기록한 날에는 하루 한 번 보너스 슬립 포인트 100포인트를 받을 수 있습니다. 대상 기록을 30일 이어 가면 보너스만 3,000포인트입니다. 프리미엄 교환소와 매일 받는 보너스 사블레+도 아침 리서치의 즐거움을 더합니다.'],
        ['한국 구매 화면의 가격으로 비교', '앱에 표시된 1개월 가격을 6배 한 금액과 6개월 가격을 비교하고, 6개월 가격을 6으로 나눠 월 환산 금액을 구합니다. 같은 국가·플랫폼·세금 기준으로 비교하세요. 일본 엔화 가격을 한국 판매 가격처럼 사용하지 않습니다.'],
        ['본인의 기록 습관에 기간 맞추기', '수면 기록 습관을 아직 시험하는 중이면 짧은 플랜이 판단하기 쉽습니다. 앞으로 여섯 달 혜택을 사용할 예정이면 총 절약액과 중간에 사용을 멈출 가능성을 함께 비교하세요.'],
        ['변경 전에 연속 구독 기간 확인', '포켓몬의 결제 FAQ는 Android 플랜 변경 시 해지, 만료와 재구매가 필요할 수 있으며 연속 구독 기간이 초기화된다고 안내합니다. 구매 스토어를 바꿀 때도 초기화됩니다. 월 환산 금액만 보고 바꾸기 전에 절차를 확인하세요.'],
        ['슬립 포인트와 Play Points 구분', '매일 받는 보너스는 포켓몬 슬립 내부의 슬립 포인트입니다. Google Play Points는 Google Play가 청구하는 대상 구매의 포인트이므로 같은 잔액으로 계산하지 않습니다.'],
        ['실제로 즐길 혜택을 선택', '매일 사용할 기능과 앞으로 플레이할 기간을 적어 보세요. 가장 긴 플랜이라는 이유보다 본인의 습관에 맞는지가 더 좋은 선택 기준이 됩니다.']
      ],
      faq: [['매일 받는 보너스가 Google Play Points에 적립되나요?', '아니요. 포켓몬 슬립 게임 안의 슬립 포인트입니다.'], ['일본 가격을 한국 플랜 비교에 그대로 쓰나요?', '아니요. 본인의 국가와 구매 플랫폼에 현재 표시된 가격을 사용합니다.']]
    },
    tw: {
      title: 'Pokémon Sleep 進階票證：1個月或6個月？從每日福利來選',
      description: '比較 Pokémon Sleep 進階票證的每日睡眠點數、1個月與6個月方案，以及台灣價格和變更訂閱時的連續訂閱期間。',
      intro: '每天早上查看新的寶可夢睡姿，已經成為習慣的話，進階票證會很吸引人。先試一個月，或決定用六個月？在比較價格之前，先看看自己每天會享受哪些福利。',
      sections: [
        ['每日獎勵會慢慢累積', '進階票證有效期間，在記錄睡眠的日子每天可領一次額外 100 睡眠點數。符合條件地記錄 30 天，額外點數就有 3,000 點。進階兌換處與每天的獎勵沙布蕾+，也讓日常記錄多一份樂趣。'],
        ['用台灣購買畫面上的價格計算', '比較 App 顯示的單月價格 × 6 與六個月方案價格，再把六個月價格 ÷ 6，算出每月平均費用。使用相同地區、平台和稅金基準，日本日圓售價不是台灣的報價。'],
        ['讓期間配合你的習慣', '還在嘗試建立睡眠記錄習慣時，短期方案比較容易評估；已打算使用六個月，就把總節省金額和可能提前停止使用的情況一起考慮。'],
        ['變更前先看連續訂閱期間', '寶可夢的付款 FAQ 說明，Android 變更方案可能需要取消、等到到期後再購買，並會重設連續訂閱期間。更換購買商店也會重設。別只看平均月費較低，就忽略這個差別。'],
        ['睡眠點數不是 Play Points', '本文的每日獎勵是 Pokémon Sleep 遊戲內的睡眠點數。Google Play Points 則與 Google Play 請款的合格消費有關，兩種餘額要分開計算。'],
        ['選擇每天真的用得到的福利', '列出會使用的功能和預計繼續遊玩的月份，就能把價格比較連結到自己的習慣，而不是只因為方案最長就選它。']
      ],
      faq: [['每日獎勵會增加 Google Play Points 嗎？', '不會。這是 Pokémon Sleep 遊戲內的睡眠點數。'], ['可以直接用日本價格比較台灣方案嗎？', '不可以。請使用自己地區和購買平台現在顯示的價格。']]
    }
  }
];

const REGION = { en: { country: 'US', hl: 'en' }, ko: { country: 'KR', hl: 'ko' }, tw: { country: 'TW', hl: 'zh-Hant' } };
const SOURCE_COPY = {
  en: { title: 'Official sources checked on October 14, 2026', body: 'The official sources below explain the rules used in this guide. Check your purchase screen for current prices and the offers available to your account.', link: 'Read the official guidance', program: 'Google Play Points official help' },
  ko: { title: '공식 자료 확인: 2026년 10월 14일', body: '아래 공식 자료에서 이 가이드에 사용한 규칙을 볼 수 있습니다. 현재 가격과 내 계정에 제공되는 혜택은 실제 구매 화면에서 확인하세요.', link: '공식 안내 읽기', program: 'Google Play Points 공식 도움말' },
  tw: { title: '官方資料確認：2026年10月14日', body: '下方官方資料說明本文使用的規則；目前價格與自己帳號能用的優惠，請查看實際購買畫面。', link: '閱讀官方說明', program: 'Google Play Points 官方說明' }
};
const EXTRA_SOURCES = {
  'google-play-points-basics': [['9080348', 'levels']],
  'google-play-credit-subscriptions': [['7018481', 'renewal'], ['4646404', 'payments']],
  'google-play-points-stamp-cards': [['9077247', 'devices'], ['android-developer/16517110', 'cards']],
  'pokemon-sleep-premium-pass-plans': [['pokemon-benefits', 'benefits']]
};
const SOURCE_LABELS = {
  en: { levels: 'US levels and benefits', renewal: 'Subscription renewal and payment methods', payments: 'US accepted payment methods', devices: 'Devices supported for quests and stamp cards', cards: 'Google’s stamp-card promotion overview', benefits: 'Pokémon Sleep Premium Pass benefits' },
  ko: { levels: '한국 등급과 혜택', renewal: '구독 갱신과 결제 수단', payments: '한국 지원 결제 수단', devices: '퀘스트·스탬프 카드 지원 기기', cards: 'Google 스탬프 카드 프로모션 안내', benefits: 'Pokémon Sleep 프리미엄 패스 혜택' },
  tw: { levels: '台灣等級與福利', renewal: '訂閱續訂與付款方式', payments: '台灣支援的付款方式', devices: '任務與集章卡支援的裝置', cards: 'Google 集章卡活動說明', benefits: 'Pokémon Sleep 進階票證福利' }
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
      publishedAt: '2026-10-14', modifiedAt: '2026-10-14', jaAlternate: topic.jaAlternate,
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
