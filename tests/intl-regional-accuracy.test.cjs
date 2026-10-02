'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { assertOfficialAnswers, assertPhrases } = require('./helpers/intl-check.cjs');
const { openingTags } = require('./helpers/markup-contract.cjs');

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

test('Super Tickets explain current regional eligibility, deadlines and replacement risk', () => {
  const cases = [
    { locale: 'en', country: 'US', phrases: ['Platinum and Diamond', 'Tuesday', 'Play Pass', 'Gold', 'Thursday', '48 hours', 'eight weeks from when it became available', 'not from the day you saved it', 'gives up the first prize', 'lower or higher', 'current card', 'do not guarantee'] },
    { locale: 'ko', country: 'KR', phrases: ['플래티넘·다이아몬드', '화요일', 'Play Pass', '골드', '목요일', '48시간', '저장일이 아니라 제공된 시점부터 8주', '기존 보상이 사라지고', '더 적거나 많을', '현재 카드', '보장하는 규칙은 아닙니다'] },
    { locale: 'tw', country: 'TW', phrases: ['白金級與鑽石級', '星期二', 'Play Pass', '黃金級', '星期四', '48 小時', '提供日起算 8 週', '不是從儲存日開始', '放棄原獎勵', '較少或較多', '目前卡片', '不保證'] }
  ];
  for (const { locale, country, phrases } of cases) {
    const file = locale + '/articles/google-play-points-super-weekly-reward.html', html = read(file);
    assertOfficialAnswers(html, file, ['9080348']); assertPhrases(html, file, phrases);
    assert.ok(openingTags(html).filter(node => node.tag === 'a').some(node => {
      try { const url = new URL((node.attrs.href || '').replaceAll('&amp;', '&')); return url.hostname === 'support.google.com' && url.pathname === '/googleplay/answer/9080348' && url.searchParams.get('co') === 'GENIE.CountryCode=' + country; } catch { return false; }
    }), file + ': explicit country source');
    assert.doesNotMatch(html, /linked page is not currently available|현재 연결된 페이지를 확인할 수 없어|目前連結頁面無法取得/, file + ': obsolete unavailable-source claim');
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