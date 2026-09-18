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

test('海外の金額LPは各地域の現地通貨と正の逆算初期値を使う', () => {
  const cases = [
    { file: 'en/amount/10000/index.html', localePath: '/en/', currency: /\$\s?\d/, forbidden: /10,000 yen/i },
    { file: 'ko/amount/10000/index.html', localePath: '/ko/', currency: /\d[\d,]*원/, forbidden: /10,000엔/ },
    { file: 'tw/amount/10000/index.html', localePath: '/tw/', currency: /NT\$\s?\d/, forbidden: /10,000 日圓/ }
  ];

  for (const { file, localePath, currency, forbidden } of cases) {
    const html = read(file);
    assert.match(html, currency, `${file}: 現地通貨の表示がありません`);
    assert.doesNotMatch(html, forbidden, `${file}: 旧日本円固定表現が残っています`);

    const calculatorHref = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]
      .map(match => match[1])
      .find(href => {
        if (!href.startsWith(localePath + '?')) return false;
        const url = new URL(href, 'https://playpoint-sim.com');
        const amount = Number(url.searchParams.get('amount'));
        return url.searchParams.get('mode') === 'reverse'
          && url.searchParams.get('status') === '1'
          && url.searchParams.get('multiplier') === '1'
          && Number.isFinite(amount) && amount > 0;
      });
    assert.ok(calculatorHref, `${file}: 現地通貨の正の逆算初期値が計算機リンクにありません`);
  }
});

test('ギフトカード自体とGoogle Play上の対象コンテンツ購入を分離して説明する', () => {
  const cases = [
    { file: 'en/articles/google-play-points-gift-cards.html', facts: [/gift card/i, /does not normally earn Play Points|do not normally earn Play Points/i] },
    { file: 'ko/articles/google-play-points-gift-cards.html', facts: [/기프트카드/, /일반적으로 Play Points가 적립되지 않습니다/] },
    { file: 'tw/articles/google-play-points-gift-cards.html', facts: [/禮物卡/, /本身通常不會累積 Play Points/] }
  ];

  for (const { file, facts } of cases) {
    const html = read(file);
    assert.match(html, /support\.google\.com\/googleplay\/answer\/16585331/, `${file}: gift-card公式source`);
    for (const fact of facts) assert.match(html, fact, `${file}: ${fact}`);
  }
});

test('영문 구독 가이드는 Google Play를 통한 적격 구독의 적립 가능성을 직접 답한다', () => {
  const html = read('en/articles/google-play-points-subscriptions.html');
  const text = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/, '영문 구독 가이드의 공식 source가 없습니다');
  assert.match(text, /subscriptions?[\s\S]{0,160}Google Play[\s\S]{0,160}(?:earn|Play Points)/i, 'Google Play 결제 구독의 적립 답변이 없습니다');
});

test('Super Weekly Prize는 현행 공식 조건을 유지하고 Super Ticket은 현재 계정 카드 기준으로 한정한다', () => {
  const cases = [
    {
      file: 'ko/articles/google-play-points-super-weekly-reward.html',
      accountScope: /현재 카드|본인 Google Play 계정의 혜택 화면|모든 .*계정에 자동 제공된다고 단정할 수는 없습니다/,
      historicalGuard: /과거 지급 주기를 현행 규칙으로 보장하지/
    },
    {
      file: 'tw/articles/google-play-points-super-weekly-reward.html',
      accountScope: /目前帳號卡片|自己的 Google Play 福利頁|目前帳號/,
      historicalGuard: /不把過去發放週期當作現行規則/
    }
  ];

  for (const { file, accountScope, historicalGuard } of cases) {
    const html = read(file);
    assert.match(html, /Super Weekly Prize/, `${file}: Super Weekly Prize名稱`);
    assert.match(html, /Super Ticket/, `${file}: Super Ticket主題`);
    assert.match(html, /mc_editorialmd_loyalty_swp_cujs_unenrolled_fcp/, `${file}: current Super Weekly Prize source`);
    assert.match(html, accountScope, `${file}: account/current-card scope`);
    assert.match(html, historicalGuard, `${file}: historical ticket rule guard`);
  }
});

test('영문 수치 기사는 미국 기준과 미국 공식 source를 명시한다', () => {
  for (const file of [
    'en/articles/google-play-points-100-value.html',
    'en/articles/google-play-points-platinum-diamond-cost.html'
  ]) {
    const html = read(file);
    assert.match(html, /(?:US|United States)/i, `${file}: 미국 지역 표기가 없습니다`);
    assert.match(html, /CountryCode%3DUS/, `${file}: 미국 Google Play 공식 source가 없습니다`);
  }
});