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
  'google-play-balance-combine-payment': {
    en: {mark:'Play balance and Play Points are different', link:['Google Play credit','google-play-points-use-coupons']},
    ko: {mark:'Play 잔액과 Play Points는 별도', link:['Google Play 크레딧','google-play-points-use-coupons']},
    tw: {mark:'Play餘額與Play Points是兩種不同項目', link:['Google Play 抵用金','google-play-points-use-coupons']}
  },
  'google-play-games-vs-play-points': {
    en: {mark:'does not automatically add Play Points', link:['a specific quest','google-play-quests']},
    ko: {mark:'Play Points 잔액이 자동으로 늘어나지는 않습니다', link:['퀘스트','google-play-quests']},
    tw: {mark:'不會自動增加 Play Points', link:['任務','google-play-quests']}
  },
  'google-play-points-500-1000-cost': {
    en: {mark:'fixed-rate references', link:['Google rounds points for individual purchases','google-play-points-rounding-tax']},
    ko: {mark:'실제 달성 금액을 보장하지 않습니다', link:['구매별 반올림','google-play-points-rounding-tax']},
    tw: {mark:'不是保證的達標金額', link:['逐筆四捨五入','google-play-points-rounding-tax']}
  },
  'google-play-points-apps-books-purchases': {
    en: {mark:'The purchase must be made through Google Play', link:['subscriptions','google-play-points-subscriptions']},
    ko: {mark:'Google Play 결제를 완료해야 합니다', link:['정기 결제','google-play-points-subscriptions']},
    tw: {mark:'並由 Google Play 處理', link:['訂閱','google-play-points-subscriptions']}
  },
  'google-play-points-balance-history-progress': {
    en: {mark:'is not reduced when you spend points', link:['Level progress','google-play-points-levels']},
    tw: {mark:'使用點數後不會因此下降', link:['等級進度','google-play-points-levels']}
  },
  'google-play-points-device-change': {
    en: {mark:'not stored only on one phone', link:['Multiple Google accounts','google-play-points-multiple-accounts']},
    ko: {mark:'Google 계정과 Play 국가에 연결됩니다', link:['여러 Google 계정','google-play-points-multiple-accounts']},
    tw: {mark:'連結到加入方案的 Google 帳號', link:['多個 Google 帳號','google-play-points-multiple-accounts']}
  },
  'google-play-points-discounts-promo-codes': {
    en: {mark:'points should not be estimated from the crossed-out list price', link:['excludes tax','google-play-points-rounding-tax']},
    ko: {mark:'정가를 사용한 예상치와 다를 수 있습니다', link:['세금을 제외한 대상 상품 가격','google-play-points-rounding-tax']},
    tw: {mark:'用原價計算可能高估點數', link:['稅金不列入','google-play-points-rounding-tax']}
  },
  'google-play-points-rounding-tax': {
    en: {mark:'nearest whole point', link:['item price','google-play-points-discounts-promo-codes']},
    ko: {mark:'가장 가까운 정수 포인트', link:['대상 상품 가격','google-play-points-discounts-promo-codes']},
    tw: {mark:'最接近的整數點', link:['符合資格的商品價格','google-play-points-discounts-promo-codes']}
  },
  'google-play-points-coupon-not-applied': {tw:{link:['同一帳號','google-play-points-multiple-accounts']}},
  'google-play-points-platinum-diamond-cost': {tw:{link:['每筆四捨五入','google-play-points-rounding-tax']}},
  'google-play-points-play-credit-not-working': {
    en:{mark:'you may not have enough points for that reward'},
    ko:{mark:'해당 보상에 필요한 포인트가 부족할 수 있습니다'},
    tw:{mark:'可能是目前點數不足',link:['Play 抵用金','google-play-credit-uses']}
  },
  'google-play-points-promotion-stacking': {
    en:{mark:'The highest available earning rate applies'},
    ko:{mark:'5배나 6배가 되지 않습니다'},
    tw:{mark:'也不會變成 5 倍或 6 倍'}
  },
  'google-play-points-country-change': {
    en:{mark:'physically in the new country'},ko:{mark:'새 국가에 실제로 위치'},tw:{mark:'實際位於新國家／地區'}
  },
  'google-play-points-expiration': {
    en:{mark:'should not be treated as a reset'},ko:{mark:'갱신으로 간주하지 않는 편이 안전합니다'},tw:{mark:'不應視為延長條件'}
  },
  'google-play-points-refund': {
    en:{mark:'A cancellation and a refund are not the same event'},ko:{mark:'구독 취소와 환불은 다릅니다'},tw:{mark:'取消訂閱與退款不是同一件事'}
  },
  'google-play-points-stamp-cards': {
    en:{mark:'minimum amount per purchase and required purchase count'},ko:{mark:'건별 최소 금액과 필요한 횟수'},tw:{mark:'每筆最低金額和需要幾次購買'}
  },
  'google-play-points-family-sharing': {
    en:{mark:'The Google Account that makes the eligible purchase earns the points'},ko:{mark:'구매를 실제로 진행한 Google 계정'},tw:{mark:'實際進行適用消費的 Google 帳號'}
  },
  'google-play-points-multiple-accounts': {
    en:{mark:'finding the correct account rather than waiting'},ko:{mark:'먼저 올바른 계정을 찾는 것이 우선'},tw:{mark:'先找到正確帳號'}
  },
  'google-play-points-level-maintenance-reset': {
    en:{mark:'until the end of the following calendar year'},ko:{mark:'다음 해 12월 31일까지'},tw:{mark:'維持到明年 12 月 31 日'}
  },
  'google-play-quests': {
    en:{mark:'all of its required steps'},ko:{mark:'여러 단계를 모두 완료'},tw:{mark:'所有指定步驟'}
  }
};
function applyEditorialCues(html, file) {
  const match=file.match(/^(en|ko|tw)\/articles\/([^/]+)\.html$/);if(!match)return html;
  const [,locale,slug]=match, game=metadata('/'+file);
  const selection={...(CUES[slug]?.[locale]||{}),...(game?{mark:GAME_CUES[game.id]?.[['en','ko','tw'].indexOf(locale)]}:{})};
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
