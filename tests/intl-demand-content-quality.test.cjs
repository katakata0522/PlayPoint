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
    patterns: [/Quest missing or stuck/, /purchase step does not count/i, /Play Games profile/, /qualifying purchase.*refunded/, /11534416/]
  },
  {
    name: 'Korean quests owns generic and troubleshooting intent without a generic calculator CTA',
    file: 'ko/articles/google-play-quests.html',
    marker: 'id="ko-quest-quick-check"',
    patterns: [/구글 플레이 퀘스트란/, /퀘스트 자체가 안 뜸/, /구매 단계가 완료되지 않음/, /Play 게임즈 프로필/, /구매가 환불되면/, /11534416/]
  },
  {
    name: 'Korean Super Ticket guide answers acquisition and use intent without a generic calculator CTA',
    file: 'ko/articles/google-play-points-super-weekly-reward.html',
    marker: 'id="ko-super-ticket-answer"',
    patterns: [/슈퍼티켓 얻는 법·사용법/, /현재 카드/, /48시간/, /기존 보상이 사라지는지/, /9080348/]
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

test('韓国・台湾の週次特典は銀級と上位等級の現行プログラムを区別する', () => {
  for (const [locale, silver, superPrize, country] of [
    ['ko', '실버', 'Super Weekly Prize', 'KR'],
    ['tw', '銀級', '超級每週獎勵', 'TW']
  ]) {
    for (const slug of ['levels', 'weekly-reward']) {
      const file = `${locale}/articles/google-play-points-${slug}.html`;
      const html = read(file);
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
      assert.ok(main.includes(silver), file);
      assert.ok(main.includes(superPrize), `${file}: upper-level weekly program`);
      assert.ok(main.includes(`CountryCode%3D${country}`), `${file}: local official source`);
      assert.doesNotMatch(main, /실버 최대 50|골드 최대 100|플래티넘 최대 500|다이아몬드 최대 1,000/,
        `${file}: outdated caps must not be attributed to the current official table`);
      assert.doesNotMatch(main, /像韓國表格那樣|韓國等級表那種/, `${file}: obsolete cross-country maximum comparison`);
    }
  }
  const ticket = read('ko/articles/google-play-points-super-weekly-reward.html');
  assert.match(ticket, /포인트 내역/);
  assert.match(ticket, /혜택 받기/);
  assert.match(ticket, /기존 보상이 사라지고/);
  assert.match(ticket, /48시간/);
  assert.match(ticket, /8주/);
});

test('有効期限の記事は年間の等級進捗を毎週特典の画面へ案内しない', () => {
  for (const [locale, rowName, destination] of [
    ['en', 'Level progress', 'Play Points → More → Level benefits'],
    ['ko', '등급 진행도', 'Play Points → 더보기 → 등급별 혜택'],
    ['tw', '等級進度', 'Play Points → 更多 → 等級福利']
  ]) {
    const html = read(`${locale}/articles/google-play-points-expiration.html`);
    const row = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)]
      .map(match => match[0]).find(value => value.includes(`>${rowName}</td>`));
    assert.ok(row, `${locale}: annual progress comparison row`);
    assert.ok(row.includes(destination), `${locale}: level information must use level benefits, not weekly perks`);
  }
});

for (const contract of [
  {
    locale: 'en', country: 'US',
    patterns: [/PC Points Boost/, /purchases on your computer, not your phone/, /both phone and computer are not labelled/, /one game or purchases across Google Play/, /activation requirement and end date/, /does not confirm that a particular boost is available/]
  },
  {
    locale: 'tw', country: 'TW',
    patterns: [/電腦點數倍增/, /只適用於電腦購買，手機消費不適用/, /手機與電腦皆適用/, /不會特別標示「電腦」/, /單一遊戲/, /啟用要求與到期日/, /不代表每個台灣帳號目前都有同一個活動/]
  }
]) {
  test(`${contract.locale} promotion diagnosis distinguishes PC-only boosts from phone purchases`, () => {
    const html = read(`${contract.locale}/articles/google-play-points-promotion-not-applied.html`);
    const section = html.match(/<h2 id="section-3">[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, 'Existing purchase-eligibility section must remain');
    for (const pattern of contract.patterns) assert.match(section, pattern);
    assert.match(html, new RegExp(`9077192\\?hl=[^"<]+(?:&amp;|&)co=GENIE.CountryCode%3D${contract.country}`));
    // 端末による適用範囲の説明に、現在の倍率や新しい提供保証を混ぜない。
    const paragraphs = section.match(/<p>[^<]*(?:PC Points Boost|Boosts that cover both|電腦點數倍增|手機與電腦皆適用)[^<]*<\/p>/g);
    assert.equal(paragraphs?.length, 2);
    assert.doesNotMatch(paragraphs.join(' '), /\b\d+x\b|\d+\s*倍|\d+%|\bguaranteed\b/i);
    if (contract.locale === 'tw') {
      const source = read('scripts/intl-seo-content.cjs');
      const entry = source.split("file: 'tw/articles/google-play-points-promotion-not-applied.html'")[1].split('\n  {')[0];
      for (const paragraph of paragraphs) assert.ok(entry.includes(paragraph.replace(/<\/?p>/g, '')), 'Generated Taiwan copy must match its source');
    }
  });
}
