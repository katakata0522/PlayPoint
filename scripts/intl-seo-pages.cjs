'use strict';

// /amount/10000/ は既存URLを維持しつつ、海外3地域では現地通貨の入口として扱う。
// 生成元の大規模コンテンツ定義を直接分岐させず、地域別の金額・文言だけをここで上書きする。
const { PAGE_TYPES } = require('./intl-seo-content.cjs');

const amountEntryOverrides = {
  en: {
    query: 'status=1&amount=50&multiplier=1',
    title: 'How many Google Play Points for $50 in the US?',
    description: 'Estimate how many Google Play Points a US account may earn from $50 of eligible pre-tax spending, then compare level rates and promotion special earn rates.',
    eyebrow: '$50 US reverse estimate',
    h1: 'How many Google Play Points do you get for $50 in the US?',
    lead: 'For US accounts, Bronze earns 1 point per $1 of eligible pre-tax spending. Use $50 as a simple starting amount, then adjust your level and any confirmed promotion special earn rate.',
    cta: 'Calculate points for $50',
    secondary: 'Read gift-card notes',
    secondaryHref: '/en/articles/google-play-points-gift-cards.html',
    summary: ['$50 preset for US accounts', 'Bronze base: about 50 points', 'Check: level, promotion rate, eligible pre-tax amount'],
    sections: [
      ['Use reverse mode', 'This page opens reverse mode with $50. Change the amount, level, or special earn rate to match the purchase you are planning.'],
      ['US amount and point unit', 'At the Bronze base rate, eligible pre-tax spending earns 1 point per $1 in the US, so $50 is about 50 points before any eligible promotion. Google rounds points per item, so actual results can differ when purchases are split.'],
      ['Next step', 'Compare the result with the points still needed for your next level, then confirm the eligible amount and offer terms in Google Play before buying.']
    ],
    faq: [
      ['Is $50 before or after tax?', 'Use the eligible item price before tax. Google excludes tax from Play Points calculations in the US.'],
      ['Can I use this outside the US?', 'Use your local-currency PlayPoint page and the earning rate shown for your country or account. This preset is for US dollars.'],
      ['Do gift cards earn points?', 'Buying or redeeming a gift card does not by itself mean the card amount earns Play Points. Check how the eligible Google Play purchase is treated in your account.']
    ]
  },
  ko: {
    query: 'status=1&amount=50000&multiplier=1',
    title: '50,000원 결제로 Google Play Points는 몇 포인트?',
    description: '한국 계정에서 50,000원의 대상 결제로 받을 수 있는 Google Play Points 예상치를 계산하고, 등급별 적립률과 캠페인 특별 적립률을 비교합니다.',
    eyebrow: '50,000원 역산',
    h1: '50,000원 결제하면 Google Play Points는 몇 포인트일까요?',
    lead: '한국 브론즈 기본 적립률은 1,000원당 1포인트입니다. 50,000원을 간단한 시작 금액으로 두고 현재 등급과 실제로 확인된 캠페인 특별 적립률에 맞춰 조정하세요.',
    cta: '50,000원 포인트 계산',
    secondary: '기프트카드 가이드 보기',
    secondaryHref: '/ko/articles/google-play-points-gift-cards.html',
    summary: ['한국 기준: 50,000원', '브론즈 기본: 약 50포인트', '확인: 등급, 특별 적립률, 대상 금액'],
    sections: [
      ['역산 모드 사용', '이 페이지는 역산 모드를 50,000원으로 엽니다. 예정된 결제에 맞게 금액, 등급, 특별 적립률을 바꿔 계산하세요.'],
      ['한국의 금액과 적립 단위', '브론즈 기본 적립률에서는 대상 결제 1,000원당 1포인트이므로 50,000원은 캠페인 적용 전 약 50포인트의 기준입니다. 상품별 반올림 때문에 구매를 나누면 실제 결과가 달라질 수 있습니다.'],
      ['다음 단계', '예상 포인트를 다음 등급까지 부족한 포인트와 비교한 뒤, 결제 전에 Google Play에서 대상 금액과 오퍼 조건을 확인하세요.']
    ],
    faq: [
      ['50,000원은 세금 포함 금액인가요?', 'Play Points 계산에는 세금을 제외한 대상 상품 금액을 기준으로 보는 것이 안전합니다. 결제 화면과 포인트 내역을 최종 기준으로 확인하세요.'],
      ['한국 외 계정에서도 이 금액을 그대로 쓰나요?', '아니요. 결제 국가가 다르면 해당 지역의 통화와 계정에 표시된 적립률을 사용하세요.'],
      ['기프트카드를 사면 바로 포인트가 적립되나요?', '기프트카드 구매나 잔액 등록 자체와 Google Play 안의 대상 구매 적립은 별개입니다. 실제 대상 결제가 어떻게 처리되는지 확인하세요.']
    ]
  },
  tw: {
    query: 'status=1&amount=1500&multiplier=1',
    title: 'NT$1,500 可獲得多少 Google Play Points？',
    description: '估算台灣帳號消費 NT$1,500 可獲得多少 Google Play Points，並比較等級積點率與活動特別獲點率。',
    eyebrow: 'NT$1,500 反推估算',
    h1: '消費 NT$1,500 可獲得多少 Google Play Points？',
    lead: '台灣銅級基本積點率為每 NT$30 1 點。先用 NT$1,500 作為簡單起點，再依目前等級與實際確認的活動特別獲點率調整。',
    cta: '計算 NT$1,500 點數',
    secondary: '查看禮物卡指南',
    secondaryHref: '/tw/articles/google-play-points-gift-cards.html',
    summary: ['台灣預設: NT$1,500', '銅級基本: 約 50 點', '確認: 等級、特別獲點率、適用金額'],
    sections: [
      ['使用反推模式', '本頁會以 NT$1,500 開啟反推模式。請依實際預計消費調整金額、等級與特別獲點率。'],
      ['台灣金額與積點單位', '銅級基本積點率為適用消費每 NT$30 1 點，因此 NT$1,500 在活動套用前約為 50 點。Google 會依商品逐項四捨五入，拆分購買時實際結果可能不同。'],
      ['下一步', '將預估點數和距離下一個等級還差的點數比較，購買前再到 Google Play 確認適用金額與活動條件。']
    ],
    faq: [
      ['NT$1,500 是含稅金額嗎？', '請以符合 Play Points 資格的未稅商品金額作為估算基準，最終仍以結帳畫面與點數紀錄為準。'],
      ['台灣以外的帳號也使用 NT$1,500 嗎？', '不是。若付款地區不同，請使用該地區的幣別與帳號顯示的積點率。'],
      ['購買禮物卡就會累積點數嗎？', '禮物卡購買或兌換本身與 Google Play 內符合資格的消費是兩件事，請確認實際購買如何被計入 Play Points。']
    ]
  }
};

for (const [localeKey, override] of Object.entries(amountEntryOverrides)) {
  PAGE_TYPES.amount10000[localeKey] = {
    ...PAGE_TYPES.amount10000[localeKey],
    ...override
  };
}

module.exports = require('./intl-seo-pages-core.cjs');
