'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function localeArticleFiles(locale) {
  const directory = path.join(root, locale, 'articles');
  return fs.readdirSync(directory)
    .filter(file => file.endsWith('.html'))
    .map(file => `${locale}/articles/${file}`);
}

test('海外の金額LPは各地域の現地通貨と初期金額を使う', () => {
  const cases = [
    {
      file: 'en/amount/10000/index.html',
      marker: '$50',
      href: '/en/?mode=reverse&status=1&amount=50&multiplier=1',
      forbidden: '10,000 yen'
    },
    {
      file: 'ko/amount/10000/index.html',
      marker: '50,000원',
      href: '/ko/?mode=reverse&status=1&amount=50000&multiplier=1',
      forbidden: '10,000엔'
    },
    {
      file: 'tw/amount/10000/index.html',
      marker: 'NT$1,500',
      href: '/tw/?mode=reverse&status=1&amount=1500&multiplier=1',
      forbidden: '10,000 日圓'
    }
  ];

  for (const { file, marker, href, forbidden } of cases) {
    const html = read(file);
    assert.ok(html.includes(marker), `${file}: 現地通貨の代表金額 ${marker} がありません`);
    assert.ok(html.includes(href), `${file}: 現地通貨の逆算初期値が計算機リンクに反映されていません`);
    assert.ok(!html.includes(forbidden), `${file}: 旧日本円固定表現 ${forbidden} が残っています`);
  }
});

test('ギフトカード購入・登録と対象コンテンツ購入を分離して説明する', () => {
  const requiredStatements = {
    'en/articles/google-play-points-gift-cards.html': 'Buying or redeeming a Google Play gift card does not normally earn Play Points by itself',
    'ko/articles/google-play-points-gift-cards.html': '기프트카드를 구매하거나 Google Play 잔액으로 등록하는 것만으로는 일반적으로 Play Points가 적립되지 않습니다',
    'tw/articles/google-play-points-gift-cards.html': '購買禮物卡或把序號兌換成 Play 餘額，本身通常不會累積 Play Points'
  };

  for (const [file, statement] of Object.entries(requiredStatements)) {
    assert.ok(read(file).includes(statement), `${file}: 기프트카드 적립 결론이 명시되어 있지 않습니다`);
  }
});

test('영문 구독 가이드는 적격 Google Play 구독의 적립 가능성을 직접 답한다', () => {
  const html = read('en/articles/google-play-points-subscriptions.html');
  assert.ok(
    html.includes('Eligible subscriptions billed through Google Play can earn Play Points'),
    '영문 구독 가이드의 직접 답변이 없습니다'
  );
});

test('Super Weekly Prize와 Super Ticket의 공식 명칭과 계정 한정을 유지한다', () => {
  const files = [
    'ko/articles/google-play-points-super-weekly-reward.html',
    'tw/articles/google-play-points-super-weekly-reward.html'
  ];

  for (const file of files) {
    const html = read(file);
    assert.ok(html.includes('Super Weekly Prize'), `${file}: 공식 명칭 Super Weekly Prize가 없습니다`);
    assert.ok(html.includes('Super Ticket'), `${file}: 공식 명칭 Super Ticket이 없습니다`);
  }

  assert.ok(
    read(files[0]).includes('본인 Google Play 계정의 혜택 화면'),
    `${files[0]}: 계정별 제공 조건이 명시되어 있지 않습니다`
  );
  assert.ok(
    read(files[1]).includes('自己的 Google Play 福利頁'),
    `${files[1]}: 帳號별 제공 조건이 명시되어 있지 않습니다`
  );
});

test('영문 수치 기사는 미국 기준임을 명시한다', () => {
  const hundredPoints = read('en/articles/google-play-points-100-value.html');
  const platinumDiamond = read('en/articles/google-play-points-platinum-diamond-cost.html');

  assert.ok(hundredPoints.includes('US account example'), '100포인트 기사에 US account example 표기가 없습니다');
  assert.match(platinumDiamond, /(?:US|United States) level comparison/i, '플래티넘·다이아몬드 기사에 미국 지역 표기가 없습니다');
  assert.match(platinumDiamond, /(?:Based on )?US official conditions/i, '플래티넘·다이아몬드 기사에 미국 공식 조건 표기가 없습니다');
});
