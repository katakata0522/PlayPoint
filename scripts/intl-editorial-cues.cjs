'use strict';
const { metadata } = require('./intl-game-article-discovery.cjs');
const escape = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
// 既存本文から、判断を左右する短い句だけを指定する。本文や説明枠は増やさない。
const GAME_CUES = {
  fgo: ['Use your current count and Saint Quartz before buying more', '가진 성정석·호부를 반영한 부족분만 충전', '把已有聖晶石、呼符算進去，再補不足部分'],
  genshin: ['missed days are not refunded', '놓친 날은 보충되지 않는다는 점', '漏領不補發'],
  monst: ['This is a Japan-version reference, not a US Orb catalog', '한국 서비스 가격표가 아니라 일본판 구매 참고', '怪彈點數與 Play Points 各自計算'],
  starrail: ['count only rewards received before the deadline', '종료 전 받을 보상만', '只算截止前拿得到的部分'],
  zzz: ['the currency available before its deadline', '마감 전 받을 수 있는 재화만', '只算截止前拿得到的內容'],
  umamusume: ['future daily rewards cannot fill today’s shortfall', '그 부족분만 별도 충전으로 계산', '之後的每日獎勵不能當成今天已經能用'],
  proseka: ['both the paid/free Crystal split and the login rewards you will collect', '유료·무료 크리스탈, 이번 달 진행도, 실제로 받을 보상', '不能只用水晶數量評價'],
  pokepoke: ['those openings and the current premium missions', '이번 달 미션과 실제 이용 일수', '實際開包天數與月費一起比較'],
  pad: ['compare a direct pack first', '즉시 받는 마법석만 기준', '先算立即能拿到的數量'],
  arknights: ['keep the banner’s own exchange and guarantee rules separate', '한정 헤드헌팅의 교환·보장 규칙은 결제 상품과 별도로', '不把期限不同的資源湊成今天可用的總量'],
  dokkan: ['Add Play Points only to the eligible Google Play side', '대상 Google Play 구매 쪽에만', '只列在適用 Google Play 付款一側'],
  hbr: ['a longer commitment, not an immediate Quartz pack', '종료 전 받을 쿼츠만', '只算截止前可拿到的石英'],
  honkai3rd: ['web checkout does not earn Google Play Points', '웹 결제에는 Google Play 포인트를 넣지 않습니다', '網頁付款不列 Google Play 點數'],
  phantomparade: ['only rewards available before it ends', '글로벌판 구매 혜택으로 합치지 않습니다', '不當成全球版的付款優惠'],
  'prospi-a': ['Keep store bonuses and Google Play Points separate', '상점 추가 혜택과 Google Play 포인트는 별개', '商店回饋與 Play Points分開'],
  'pokemon-go': ['Reward Road is not a Web-only advantage', '리워드 로드를 웹 전용 장점으로 계산하지 않습니다', '獎勵之路不是網頁商店獨有的優勢'],
  efootball: ['Google Play Points cannot be converted directly into eFootball Points', 'Google Play 포인트를 직접 전환할 수 없으며', 'Google Play 點數不能直接轉成 eFootball™點數']
};
const CUES = {
  '2026-06-20-discount-gift-cards': {
    en: {mark: 'authorized retail partners'},
    ko: {mark: '혜택 한도와 유효기간까지 반영한 실질 결제액'},
    tw: {mark: 'Google 的 Play 禮物卡提供國家清單目前未列出台灣'}
  },
  '2026-10-12-google-play-fest-2026': {
    en: {mark: 'US sweepstakes closed on November 2'},
    ko: {mark: '주요 행사 기간인 10월 13~19일은 이미 종료됐어요'},
    tw: {mark: '主要活動已於 10 月 19 日結束'}
  },
  '2026-10-12-play-pass-double-points-6x': {
    en: {mark: 'ended on October 19, 2026'},
    ko: {mark: '주요 행사 기간인 10월 13~19일은 이미 종료됐어요'},
    tw: {mark: '不要把當時的活動當成目前仍可領取的福利'}
  },
  'google-play-credit-subscriptions': {
    en: {mark: 'Google Play balance can cover supported subscriptions'},
    ko: {mark: 'Google Play가 직접 청구하는 지원 구독에 사용할 수 있습니다'},
    tw: {mark: '還要看這筆訂閱到底是不是透過 Google Play 請款'}
  },
  'google-play-pass-guide': {
    en: {mark: 'unlocks a selected library of games and apps'}
  },
  'google-play-points-account-locked': {
    en: {mark: 'copy the exact error message first'}
  },
  'google-play-points-basics': {
    en: {mark: 'Open your profile in the Google Play Store and tap Play Points to enroll'},
    ko: {mark: '대상 결제로 포인트를 모아'},
    tw: {mark: '透過符合資格的消費累積點數'}
  },
  'google-play-points-cash-conversion': {
    en: {mark: 'Google Play Points cannot be cashed out'},
    ko: {mark: '은행 계좌나 페이·전자지갑으로 출금할 수 없고'},
    tw: {mark: 'Google Play Points 無法換成新台幣現金，也不能提領到銀行帳戶或任何電子錢包'}
  },
  'google-play-points-country-differences': {
    en: {mark: 'Google Play country tied to the account making the purchase'},
    ko: {mark: '지역별 차이를 한눈에 감 잡기 위한 요약'},
    tw: {mark: '實際用來付款的那支 Google 帳號所設定的 Google Play 國家／地區'}
  },
  'google-play-points-earn-free': {
    en: {mark: 'pick up Google Play Points without spending money'},
    ko: {mark: '이미 실버 이상이라면 주간 특별 혜택이 매주 열리고'},
    tw: {mark: '銀級以上每週五的每週獎勵'}
  },
  'google-play-points-fastest-silver': {
    en: {mark: '150 annual points'},
    ko: {mark: '한국 실버 등급은 연간 150포인트부터 열려요'},
    tw: {mark: '台灣銀級從年度 250 點開始'}
  },
  'google-play-points-gift-cards': {
    en: {mark: 'cannot use Google Play Points or Google Play balance to buy Google Play gift cards'},
    ko: {mark: '카드 구매, 코드 등록, 콘텐츠 구매를 서로 다른 단계로'},
    tw: {mark: '購買禮物卡或把序號兌換成 Play 餘額，本身通常不會累積 Play Points'}
  },
  'google-play-points-install-offer-not-received': {
    en: {mark: 'at least two minutes of app use within the first 24 hours'}
  },
  'google-play-points-join-eligibility': {
    en: {mark: 'check the account against Google\'s signup requirements'},
    ko: {mark: '결제수단·청구지 주소'},
    tw: {mark: '付款方式與帳單地址'}
  },
  'google-play-points-levels': {
    en: {mark: 'Silver starts at 150 annual points'},
    ko: {mark: '한국 실버는 연간 150포인트부터'},
    tw: {mark: '銀級從年度累積 250 點開始'}
  },
  'google-play-points-promotion-not-applied': {
    en: {mark: 'Separate missing bonus points from missing normal points'},
    ko: {mark: '일반 적립과 보너스를 먼저 나누어'},
    tw: {mark: '先分清一般點數與活動加碼'}
  },
  'google-play-points-subscriptions': {
    en: {mark: 'completed eligible charges'}
  },
  'google-play-points-super-weekly-reward': {
    en: {mark: 'the card in your Perks tab'},
    ko: {mark: '제공 후 48시간 안에 저장'},
    tw: {mark: '「獎勵」分頁是否顯示超級每週獎勵'}
  },
  'google-play-points-use-coupons': {
    en: {mark: 'matches a purchase you already planned'},
    ko: {mark: '쿠폰은 대상 구매의 가격을 할인'},
    tw: {mark: '帳號有提供時可比較 Play 抵用金'}
  },
  'pokemon-sleep-premium-pass-plans': {
    en: {mark: 'every day you track sleep brings a bonus of 100 sleep points'},
    ko: {mark: '수면을 측정한 날에는 하루에 한 번 보너스 슬립 포인트 100포인트를 추가로 받습니다'},
    tw: {mark: '不如先看自己每天用得到哪些福利'}
  },
  'bluearchive-recruitment-stack-update-2026': {
    ko: {mark: '11월 10일 모집 시스템 개편'}
  },
  'google-play-credit-uses': {
    ko: {mark: 'Google Play 잔액을 결제 수단으로 선택'},
    tw: {mark: '金額會直接進到你的 Google Play 餘額裡'}
  },
  'gakuen-idolmaster-japan-google-play-vs-web-shop': {
    tw: {mark: '付費限定抽卡才能用的有償寶石'}
  },
  'google-play-points-reward-codes': {
    tw: {mark: '不同獎勵的保存位置和使用方式本來就不一樣'}
  },
  'google-play-balance-combine-payment': {
    en: {mark:'Play balance and Play Points are different', link:['Google Play credit','google-play-points-use-coupons']},
    ko: {mark:'Play 잔액과 Play Points는 서로 별도로 동작해요', link:['Google Play 크레딧','google-play-points-use-coupons']},
    tw: {mark:'Play 餘額與 Play Points 是兩套不同東西', link:['Google Play 抵用金','google-play-points-use-coupons']}
  },
  'google-play-games-vs-play-points': {
    en: {mark:'does not automatically add Play Points', link:['a specific quest','google-play-quests']},
    ko: {mark:'Play Points 잔액이 자동으로 늘어나지는 않아요', link:['퀘스트','google-play-quests']},
    tw: {mark:'不會自動增加 Play Points', link:['任務','google-play-quests']}
  },
  'google-play-points-500-1000-cost': {
    en: {mark:'fixed-rate references', link:['Google rounds points on each individual purchase','google-play-points-rounding-tax']},
    ko: {mark:'세금을 뺀 상품 가격을 바탕으로 계산한 대략적인 수치예요', link:['구매별 반올림','google-play-points-rounding-tax']},
    tw: {mark:'這只是把單一積點率固定到底的算法', link:['逐筆四捨五入','google-play-points-rounding-tax']}
  },
  'google-play-points-apps-books-purchases': {
    en: {mark:'Sales tax never counts toward points', link:['subscriptions','google-play-points-subscriptions']},
    ko: {mark:'결제 직전 화면에 예상 적립 포인트가 뜨는지', link:['정기 결제','google-play-points-subscriptions']},
    tw: {mark:'單純下載免費 App 並不會憑空冒出點數', link:['訂閱','google-play-points-subscriptions']}
  },
  'google-play-points-balance-history-progress': {
    ko: {mark: '포인트를 써 버려도 진행도는 줄어들지 않아요'},
    en: {mark:'the line-by-line log of every point earned, spent, or reversed', link:['level progress','google-play-points-levels']},
    tw: {mark:'Google Play 裡共有三個各自獨立的紀錄', link:['等級進度','google-play-points-levels']}
  },
  'google-play-points-device-change': {
    en: {mark:'live on your Google account and Play country', link:['multiple Google accounts','google-play-points-multiple-accounts']},
    ko: {mark:'다른 보조 계정으로 로그인되었거나 국가 설정이 엇갈렸을', link:['여러 Google 계정','google-play-points-multiple-accounts']},
    tw: {mark:'直接綁定在你加入方案的 Google 帳號與 Play 國家/地區上', link:['多個 Google 帳號','google-play-points-multiple-accounts']}
  },
  'google-play-points-discounts-promo-codes': {
    en: {mark:'points should not be estimated from the crossed-out list price', link:['excludes tax','google-play-points-rounding-tax']},
    ko: {mark:'부가세 등 세금을 제외한 대상 상품 가격을 기준으로 Play Points를 계산해요', link:['세금을 제외한 대상 상품 가격','google-play-points-rounding-tax']},
    tw: {mark:'依「實際支付且符合資格的商品價格」來計算，並排除稅金', link:['單筆消費四捨五入','google-play-points-rounding-tax']}
  },
  'google-play-points-rounding-tax': {
    en: {mark:'nearest whole point', link:['item price','google-play-points-discounts-promo-codes']},
    ko: {mark:'가장 가까운 정수 포인트', link:['대상 상품 가격','google-play-points-discounts-promo-codes']},
    tw: {mark:'最接近的整數點', link:['符合資格的商品價格','google-play-points-discounts-promo-codes']}
  },
  'google-play-points-coupon-not-applied': {
    en: {mark: 'automatically applies to every item'},
    ko: {mark: '저장된 혜택 정보와 결제창의 계정이 맞는지'},
    tw: {mark: '看到「已儲存的優惠」裡有券，不代表那款遊戲的每一包禮包都能用', link:['同一帳號','google-play-points-multiple-accounts']}
  },
  'google-play-points-platinum-diamond-cost': {
    en: {mark: 'Diamond starts at 10,000'},
    ko: {mark: '다이아몬드는 15,000점 이상'},
    tw: {mark: '鑽石從 15,000 點開始', link:['每筆四捨五入','google-play-points-rounding-tax']}
  },
  'google-play-points-play-credit-not-working': {
    en:{mark:'you may not have enough points for that reward'},
    ko:{mark:'포인트를 ‘교환하기 전’인지, 이미 ‘교환한 뒤’인지 나누어 보면'},
    tw:{mark:'發現結帳時用不掉或找不到餘額',link:['Play 抵用金','google-play-credit-uses']}
  },
  'google-play-points-promotion-stacking': {
    en:{mark:'The highest available earning rate applies'},
    ko:{mark:'5배나 6배가 되지 않습니다'},
    tw:{mark:'也不會變成 5 倍或 6 倍'}
  },
  'google-play-points-country-change': {
    en:{mark:'physically in the new country'},
    ko:{mark:'새 국가에 실제로 머무르고 있어야 하고, 그 나라에서 발급된 현지 결제 수단을 계정에 추가해야 해요'},
    tw:{mark:'必須實際位於新的國家／地區，並且在帳號裡新增該地區核發的當地付款方式'}
  },
  'google-play-points-expiration': {
    en:{mark:'should not be treated as a reset'},
    ko:{mark:'가장 최근에 포인트를 적립하거나 사용한 날을 기준으로 보유 잔액 전체의 소멸일이 표시돼요'},
    tw:{mark:'Google Play 追蹤的是整筆點數餘額的「最後一次活動時間」'}
  },
  'google-play-points-refund': {
    en:{mark:'A cancellation and a refund are not the same event'},
    ko:{mark:'Play Points 잔액과 연간 등급 진행도에서 모두 빠져요'},
    tw:{mark:'取消訂閱與退款不是同一件事'}
  },
  'google-play-points-stamp-cards': {
    en:{mark:'each promo type plays by different rules'},
    ko:{mark:'스탬프 카드는 조건을 채운 구매 건수를 세고'},
    tw:{mark:'只要完成指定次數的合格購買就能拿獎勵'}
  },
  'google-play-points-family-sharing': {
    en:{mark:'The Google Account that makes the eligible purchase earns the points'},
    ko:{mark:'구매를 실제로 진행한 Google 계정'},
    tw:{mark:'沒辦法轉贈、轉移或合併成共用點數'}
  },
  'google-play-points-multiple-accounts': {
    en:{mark:'finding the correct account rather than waiting'},
    ko:{mark:'먼저 올바른 계정을 찾는 것이 우선'},
    tw:{mark:'先找到正確帳號'}
  },
  'google-play-points-level-maintenance-reset': {
    en:{mark:'until the end of the following calendar year'},
    ko:{mark:'다음 해 12월 31일까지'},
    tw:{mark:'維持到明年 12 月 31 日'}
  },
  'google-play-quests': {
    en:{mark:'all of its required steps'},
    ko:{mark:'여러 단계를 모두 완료'},
    tw:{mark:'所有指定步驟'}
  },
  'google-play-games-pc-play-points': {
    en:{mark:'you earn points on eligible Google Play purchases'},
    ko:{mark:'Android 기기뿐 아니라 컴퓨터와 스마트 TV에서 진행한 적격 Google Play 구매에서도 포인트를 모을 수 있습니다'},
    tw:{mark:'透過 Google Play 完成合格購買，都能照常累積點數'}
  },
  'web-store-external-billing-play-points': {
    en:{mark:'cannot earn Google Play Points'},
    ko:{mark:'외부 결제사로 바로 넘어가 결제하는 거래는 Google Play 결제 시스템을 거치지 않습니다'},
    tw:{mark:'這筆交易就沒有走進 Google Play 的計費系統'}
  }
};
function applyEditorialCues(html, file) {
  const match=file.match(/^(en|ko|tw)\/articles\/([^/]+)\.html$/);if(!match)return html;
  const [,locale,slug]=match, game=metadata('/'+file);
  const articleCue = CUES[slug]?.[locale];
  const selection = {
    mark: articleCue?.mark ?? GAME_CUES[game?.id]?.[['en', 'ko', 'tw'].indexOf(locale)],
    link: articleCue?.link
  };
  if(!selection.mark&&!selection.link)return html;
  // 自分が付けた装飾だけを戻して適用し、再生成でも二重にしない。
  html=html.replace(/<span class="marker-yellow" data-editorial-cue>([\s\S]*?)<\/span>/g,'$1')
    .replace(/<a href="[^"]+" data-editorial-link>([\s\S]*?)<\/a>/g,'$1');
  const article=html.match(/<article\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>/);if(!article)return html;
  const end=html.indexOf('</article>',article.index);if(end<0)return html;
  let body=html.slice(article.index,end),marked=false,linked=false;
  const excluded=[...body.matchAll(/<(header|nav|aside)\b[^>]*>[\s\S]*?<\/\1>|<section\b[^>]*class="[^"]*\brelated-links-section\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map(m=>[m.index,m.index+m[0].length]);
  body=body.replace(/<p\b[^>]*>[\s\S]*?<\/p>|<div\b[^>]*class="[^"]*\bintro\b[^"]*"[^>]*>[\s\S]*?<\/div>/g,(paragraph,offset)=>{
    if(excluded.some(([start,finish])=>offset>=start&&offset<finish))return paragraph;
    const stack=[];
    return paragraph.split(/(<[^>]+>)/g).map(token=>{
      if(token.startsWith('<')){const tag=token.match(/^<(\/?)([\w-]+)/);if(tag){if(tag[1])stack.pop();else if(!/\/\s*>$|^<(?:br|img|input|hr)\b/.test(token))stack.push({name:tag[2],marker:/\bmarker-(?:yellow|blue|red)\b/.test(token)});}return token;}
      if(stack.some(t=>t.name==='a'))return token;
      if(!marked&&selection.mark&&!stack.some(t=>t.marker)){
        const needle=[selection.mark,escape(selection.mark)].find(s=>token.includes(s));
        if(needle){token=token.replace(needle,`<span class="marker-yellow" data-editorial-cue>${needle}</span>`);marked=true;}
      }
      if(!linked&&selection.link){const [label,target]=selection.link;const needle=[label,escape(label)].find(s=>token.includes(s));if(needle){token=token.replace(needle,`<a href="/${locale}/articles/${target}.html" data-editorial-link>${needle}</a>`);linked=true;}}
      return token;
    }).join('');
  });
  return html.slice(0,article.index)+body+html.slice(end);
}
module.exports={CUES,GAME_CUES,applyEditorialCues};
