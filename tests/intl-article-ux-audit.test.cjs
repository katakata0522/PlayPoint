const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('international article hubs keep the shared article shell', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/index.html`);
    assert.match(html, /intl-article-site-header/);
    assert.match(html, /layout-container intl-layout-container/);
    assert.match(html, /main-card intl-article-hub/);
    assert.match(html, /sidebar-column intl-article-sidebar/);
  }
});

test('legacy gift-card stylesheet cannot override international article layout', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/2026-06-20-discount-gift-cards.html`);
    assert.doesNotMatch(html, /article-gift-card\.css/);
    assert.match(html, /\/articles\/intl-article\.css/);
    assert.doesNotMatch(html, /\/en\/articles\/intl-article\.css/);
    assert.match(html, /layout-container intl-layout-container/);
  }
});

test('Japanese articles remain the source layout and do not load international overrides', () => {
  const articleDir = path.join(ROOT, 'articles');
  const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html'));
  for (const file of files) {
    const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
    assert.doesNotMatch(
      html,
      /href=["']\/(?:en\/)?articles\/intl-article\.css/,
      `${file}: Japanese source-layout articles must not depend on international CSS overrides`
    );
  }
});

test('international navigation classification follows article intent instead of broad keywords', () => {
  const { inferIntlSection } = require('../scripts/intl-article-layout.cjs');
  assert.equal(inferIntlSection('en/articles/google-play-points-use-coupons.html'), 'earn');
  assert.equal(inferIntlSection('en/articles/google-play-quests.html'), 'earn');
  assert.equal(inferIntlSection('en/articles/google-play-points-coupon-not-applied.html'), 'troubleshooting');
  assert.equal(inferIntlSection('en/articles/google-play-points-country-change.html'), 'account');
  assert.equal(inferIntlSection('en/articles/google-play-points-platinum-diamond-cost.html'), 'levels');
});

test('international global navigation mirrors the Japanese two-line rhythm with localized sublabels', () => {
  const expected = {
    en: ['Cost simulator', 'Play Points guide', 'Country, eligibility, setup', 'Purchases, coupons, credit', 'Progress & weekly perks', 'Missing points & errors'],
    ko: ['필요 금액 계산', 'Play Points 가이드', '국가·계정 설정', '결제·쿠폰·교환', '진행도·주간 혜택', '미반영·오류 확인'],
    tw: ['所需金額估算', 'Play Points 指南', '地區與帳號設定', '購買、優惠與兌換', '進度與每週福利', '未入帳與錯誤確認']
  };
  for (const locale of ['en', 'ko', 'tw']) {
    const html = read(`${locale}/articles/google-play-points-country-change.html`);
    const globalNav = html.match(/<nav class="global-nav intl-global-nav"[\s\S]*?<\/nav>/)?.[0] || '';
    const readableNav = globalNav.replace(/&amp;/g, '&');
    assert.equal((globalNav.match(/class="nav-sub"/g) || []).length, 6, `${locale}: six localized nav sublabels`);
    for (const label of expected[locale]) assert.ok(readableNav.includes(label), `${locale}: missing nav sublabel ${label}`);
  }
});

test('international font stacks include local Korean and Traditional Chinese fallbacks', () => {
  const cssSource = read('scripts/intl-article-layout.cjs');
  assert.match(cssSource, /Apple SD Gothic Neo/);
  assert.match(cssSource, /Malgun Gothic/);
  assert.match(cssSource, /PingFang TC/);
  assert.match(cssSource, /Microsoft JhengHei/);
});

test('audited English answer headings stay compact', () => {
  const expectations = new Map([
    ['en/articles/google-play-games-vs-play-points.html', 'Answer: Play Games XP and Play Points are separate systems'],
    ['en/articles/google-play-points-apps-books-purchases.html', 'Answer: eligible Google Play purchases can earn Play Points'],
    ['en/articles/google-play-points-earn-free.html', 'Answer: check account benefits before adding a purchase']
  ]);
  for (const [file, heading] of expectations) {
    const html = read(file);
    assert.match(html, new RegExp(`<h2>${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}</h2>`));
  }
});
