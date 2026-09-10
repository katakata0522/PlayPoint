'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

// These tests own search-intent/content behavior only. Article publication and
// official-verification dates are owned globally by article-date-contract.test.cjs.
// Keeping live editorial dates out of feature tests prevents valid re-verification
// from turning into unrelated failures across historical rollout tests.
function answerWithoutGenericCalculator(html, marker, label) {
  const answerIndex = html.indexOf(marker);
  const calculatorIndex = html.indexOf('data-generated-intl-article-prompt="true"');
  assert.notEqual(answerIndex, -1, `${label}: answer marker is missing`);
  assert.equal(calculatorIndex, -1, `${label}: non-calculator Role must not receive a generated calculator prompt`);
}

const demandContracts = [
  {
    name: 'English redemption guide answers the decision question without a generic calculator CTA',
    file: 'en/articles/google-play-points-use-coupons.html',
    marker: 'id="quick-answer"',
    patterns: [
      /Best ways to use Google Play Points/i,
      /There is no single best Play Points reward for everyone/,
      /value you would actually use ÷ points required/,
      /Coupon vs Google Play credit/,
      /When you should not redeem yet/
    ]
  },
  {
    name: 'Taiwan weekly reward guide covers the missing-reward search intent without a generic calculator CTA',
    file: 'tw/articles/google-play-points-weekly-reward.html',
    marker: 'id="quick-check"',
    patterns: [/每週獎勵不見/, /星期五重設/, /星期四更新/, /點數記錄/, /9077192/, /9080348/, /16507543/]
  },
  {
    name: 'Taiwan use-coupons guide gives a reward decision framework without a generic calculator CTA',
    file: 'tw/articles/google-play-points-use-coupons.html',
    marker: 'id="tw-use-answer"',
    patterns: [/Google Play Points 怎麼用/, /自己真的會用到的價值 ÷ 所需點數/, /最低消費/, /15776916/]
  },
  {
    name: 'English quests guide diagnoses missing and stuck states without a generic calculator CTA',
    file: 'en/articles/google-play-quests.html',
    marker: 'id="quest-quick-check"',
    patterns: [/Quest missing or stuck/, /purchase step does not count/i, /Play Games profile/, /canceled or refunded/, /11534416/]
  },
  {
    name: 'Korean quests owns generic and troubleshooting intent without a generic calculator CTA',
    file: 'ko/articles/google-play-quests.html',
    marker: 'id="ko-quest-quick-check"',
    patterns: [/구글 플레이 퀘스트란/, /퀘스트 자체가 안 뜸/, /구매 단계가 완료되지 않음/, /Play 게임즈 프로필/, /취소되거나 환불/, /11534416/]
  },
  {
    name: 'Korean Super Ticket guide answers acquisition and use intent without a generic calculator CTA',
    file: 'ko/articles/google-play-points-super-weekly-reward.html',
    marker: 'id="ko-super-ticket-answer"',
    patterns: [/슈퍼티켓 얻는 법·사용법/, /30일마다 1장/, /90일마다 1장/, /이전 Play Points 보상을 유지하지 못합니다/, /mc_games_editorialmd_product_gpp_swp_super_tickets_fcp/]
  },
  {
    name: 'English gift-card guide owns conversion and earning questions without a generic calculator CTA',
    file: 'en/articles/google-play-points-gift-cards.html',
    marker: 'id="gift-card-answer"',
    patterns: [/Can Google Play Points buy gift cards/i, /cannot use Google Play Points or Google Play balance to buy/i, /Play credit is balance, not a gift card/i, /digital gift-card purchases are not eligible/i, /16585331/]
  },
  {
    name: 'Korean expiration guide gives the direct answer without a generic calculator CTA',
    file: 'ko/articles/google-play-points-expiration.html',
    marker: 'class="intro"',
    patterns: [/9077192/, /마지막으로 포인트를 적립하거나 사용한 날부터 1년 후 소멸/]
  },
  {
    name: 'Taiwan expiration guide gives the direct answer without a generic calculator CTA',
    file: 'tw/articles/google-play-points-expiration.html',
    marker: 'class="intro"',
    patterns: [/9077192/, /最後一次獲得或使用點數後一年到期/]
  }
];

for (const contract of demandContracts) {
  test(contract.name, () => {
    const html = read(contract.file);
    for (const pattern of contract.patterns) {
      assert.match(html, pattern, `${contract.file}: ${pattern}`);
    }
    answerWithoutGenericCalculator(html, contract.marker, contract.file);
  });
}