'use strict';

const COPY = Object.freeze({
  en: Object.freeze({
    skip: 'Skip to main content',
    about: 'About Katakata',
    regionLabel: 'Play country',
    regionNames: Object.freeze({ ja: 'Japan', en: 'United States', ko: 'Korea', tw: 'Taiwan', hk: 'Hong Kong', in: 'India' }),
    primary: 'Primary navigation',
    breadcrumb: 'Breadcrumb',
    sidebar: 'Article sidebar',
    nav: Object.freeze({ account: 'Account & basics', earn: 'Earn & spend', levels: 'Levels & rewards', troubleshooting: 'Troubleshooting' }),
    navSub: Object.freeze({ home: 'Cost simulator', guides: 'Play Points guide', account: 'Country, eligibility, setup', earn: 'Purchases, coupons, credit', levels: 'Progress & weekly perks', troubleshooting: 'Missing points & errors' }),
    popularTitle: 'Popular guides', popularNote: 'Recent readership snapshot', relatedTitle: 'Related to this guide',
    authorTitle: 'Who runs PlayPoint?', authorRole: 'PlayPoint operator & editor',
    authorTrust: 'Google first-party sources are checked first, and calculation examples are verified against this site before publication.',
    authorCta: 'About Katakata', labCta: 'KatakataLab ↗', browseTitle: 'Browse guides', reading: 'Reading now',
    hub: Object.freeze({ kicker: 'Play Points guide', title: 'Use the guide, then calculate', body: 'Browse the topic you need first, then use the calculator with the conditions shown for your own account.', cta: 'Open calculator', target: 'calculator' }),
    role: Object.freeze({
      calculator_bridge: Object.freeze({ kicker: 'Next step', title: 'Calculate with your own numbers', body: 'Turn the guide into a personal estimate using your remaining points and the final earn rate shown in Google Play.', cta: 'Open calculator', target: 'calculator' }),
      decision_support: Object.freeze({ kicker: 'Decision support', title: 'Compare before you act', body: 'Use adjacent guides to compare the trade-offs before spending, redeeming, or changing settings.', cta: 'Browse earning & spending', target: 'earn' }),
      troubleshooting: Object.freeze({ kicker: 'Troubleshooting', title: 'Keep the diagnosis moving', body: 'Work through the checks in this guide, then continue with the troubleshooting cluster if the symptom remains.', cta: 'Browse troubleshooting', target: 'troubleshooting' }),
      retention: Object.freeze({ kicker: 'Stay current', title: 'Check what changes over time', body: 'Weekly rewards, quests, and promotions can change. Use the latest guide before the next claim or purchase.', cta: 'Browse current guides', target: 'guides' }),
      game_decision: Object.freeze({ kicker: 'Game decision', title: 'Check the spending impact', body: 'Translate the game purchase into Play Points progress before deciding whether the purchase still makes sense.', cta: 'Open calculator', target: 'calculator' }),
      reference: Object.freeze({ kicker: 'Reference', title: 'Continue with the adjacent guide', body: 'Use this page as the factual base, then move to the guide that matches your next question.', cta: 'See related guides', target: 'related' }),
      hold: Object.freeze({ kicker: 'Reference', title: 'Check the verified guides', body: 'Use the published guide collection for rules that have already passed the site verification process.', cta: 'Browse guides', target: 'guides' })
    })
  }),
  ko: Object.freeze({
    skip: '본문으로 건너뛰기', about: 'Katakata 소개', regionLabel: 'Play 국가',
    regionNames: Object.freeze({ ja: '일본', en: '미국', ko: '대한민국', tw: '대만', hk: '홍콩', in: '인도' }),
    primary: '주요 탐색', breadcrumb: '탐색 경로', sidebar: '기사 사이드바',
    nav: Object.freeze({ account: '계정·기본', earn: '적립·사용', levels: '등급·리워드', troubleshooting: '문제 해결' }),
    navSub: Object.freeze({ home: '필요 금액 계산', guides: 'Play Points 가이드', account: '국가·계정 설정', earn: '결제·쿠폰·교환', levels: '진행도·주간 혜택', troubleshooting: '미반영·오류 확인' }),
    popularTitle: '많이 읽는 가이드', popularNote: '최근 독자 이용 기준', relatedTitle: '이 글과 함께 보기',
    authorTitle: 'PlayPoint 운영자', authorRole: 'PlayPoint 운영·편집',
    authorTrust: 'Google 공식 1차 정보를 먼저 확인하고, 계산 예시는 사이트 계산 결과와 대조한 뒤 공개합니다.',
    authorCta: 'Katakata 소개', labCta: 'KatakataLab ↗', browseTitle: '가이드 찾아보기', reading: '읽는 중',
    hub: Object.freeze({ kicker: 'Play Points 가이드', title: '가이드 확인 후 직접 계산', body: '먼저 필요한 주제를 확인한 뒤, 실제 계정에 표시된 조건으로 계산기를 사용하세요.', cta: '계산기 열기', target: 'calculator' }),
    role: Object.freeze({
      calculator_bridge: Object.freeze({ kicker: '다음 단계', title: '내 조건으로 직접 계산하기', body: '남은 포인트와 Google Play에 표시된 최종 적립률을 넣어 개인별 예상치로 바꿔 보세요.', cta: '계산기 열기', target: 'calculator' }),
      decision_support: Object.freeze({ kicker: '선택 지원', title: '결정 전에 비교하기', body: '결제·교환·설정 변경 전에 인접 가이드를 함께 보고 선택지의 차이를 비교하세요.', cta: '적립·사용 가이드 보기', target: 'earn' }),
      troubleshooting: Object.freeze({ kicker: '문제 해결', title: '증상 확인을 계속하세요', body: '이 글의 확인 순서를 진행한 뒤에도 문제가 남으면 문제 해결 가이드에서 다음 원인을 확인하세요.', cta: '문제 해결 가이드 보기', target: 'troubleshooting' }),
      retention: Object.freeze({ kicker: '최신 정보', title: '시간에 따라 바뀌는 내용을 확인', body: '주간 리워드·퀘스트·프로모션은 바뀔 수 있으므로 다음 수령이나 결제 전 최신 가이드를 확인하세요.', cta: '최신 가이드 보기', target: 'guides' }),
      game_decision: Object.freeze({ kicker: '게임 결제 판단', title: '결제가 주는 영향을 계산', body: '게임 결제를 Play Points 진행도로 바꿔 보고 실제로 결제할 가치가 있는지 비교하세요.', cta: '계산기 열기', target: 'calculator' }),
      reference: Object.freeze({ kicker: '참고 정보', title: '다음 질문에 맞는 글로 이동', body: '이 글을 기준 정보로 활용하고, 다음 궁금증과 가장 가까운 관련 가이드로 이어서 확인하세요.', cta: '관련 가이드 보기', target: 'related' }),
      hold: Object.freeze({ kicker: '참고 정보', title: '검증된 가이드 확인', body: '공식 확인이 끝난 공개 가이드에서 현재 사용할 수 있는 규칙을 확인하세요.', cta: '가이드 보기', target: 'guides' })
    })
  }),
  tw: Object.freeze({
    skip: '跳到主要內容', about: '關於 Katakata', regionLabel: 'Play 國家／地區',
    regionNames: Object.freeze({ ja: '日本', en: '美國', ko: '韓國', tw: '台灣', hk: '香港', in: '印度' }),
    primary: '主要導覽', breadcrumb: '導覽路徑', sidebar: '文章側欄',
    nav: Object.freeze({ account: '帳號與基本', earn: '積點與使用', levels: '等級與回饋', troubleshooting: '問題排解' }),
    navSub: Object.freeze({ home: '所需金額估算', guides: 'Play Points 指南', account: '地區與帳號設定', earn: '購買、優惠與兌換', levels: '進度與每週福利', troubleshooting: '未入帳與錯誤確認' }),
    popularTitle: '熱門指南', popularNote: '依近期閱讀資料排序', relatedTitle: '和這篇一起看',
    authorTitle: '誰在維護 PlayPoint？', authorRole: 'PlayPoint 營運與編輯',
    authorTrust: '優先核對 Google 官方第一手資訊，計算範例也會和本站計算結果互相確認後再發布。',
    authorCta: '關於 Katakata', labCta: 'KatakataLab ↗', browseTitle: '瀏覽指南', reading: '正在閱讀',
    hub: Object.freeze({ kicker: 'Play Points 指南', title: '先看指南，再用自己的條件計算', body: '先找到最接近問題的主題，再依實際帳號顯示的條件使用計算機。', cta: '開啟計算機', target: 'calculator' }),
    role: Object.freeze({
      calculator_bridge: Object.freeze({ kicker: '下一步', title: '換成自己的條件計算', body: '輸入尚缺點數與 Google Play 顯示的最終積點率，把文章資訊轉成個人估算。', cta: '開啟計算機', target: 'calculator' }),
      decision_support: Object.freeze({ kicker: '決策支援', title: '行動前先比較', body: '付款、兌換或改設定之前，搭配相鄰指南比較不同選項的影響。', cta: '查看積點與使用指南', target: 'earn' }),
      troubleshooting: Object.freeze({ kicker: '問題排解', title: '繼續縮小問題範圍', body: '完成這篇的檢查後若問題仍存在，再到問題排解分類確認下一個可能原因。', cta: '查看問題排解', target: 'troubleshooting' }),
      retention: Object.freeze({ kicker: '保持最新', title: '確認會隨時間改變的內容', body: '每週回饋、任務與活動可能改變，下次領取或購買前先查看最新指南。', cta: '查看最新指南', target: 'guides' }),
      game_decision: Object.freeze({ kicker: '遊戲消費判斷', title: '確認這筆消費的影響', body: '把遊戲內購買換算成 Play Points 進度，再判斷這筆消費是否仍值得。', cta: '開啟計算機', target: 'calculator' }),
      reference: Object.freeze({ kicker: '參考資訊', title: '接著看最相關的下一篇', body: '把這篇當作基礎資料，再前往最符合下一個問題的相關指南。', cta: '查看相關指南', target: 'related' }),
      hold: Object.freeze({ kicker: '參考資訊', title: '查看已驗證指南', body: '從已完成官方確認的公開指南，查看目前可用的規則。', cta: '瀏覽指南', target: 'guides' })
    })
  })
});

module.exports = { COPY };
