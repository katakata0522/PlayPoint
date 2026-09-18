'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const { VERIFIED_AT, SOURCES, GAME_SEO_WAVE4 } = require('../scripts/game-seo-wave4-data.cjs');
const { getGeneratedGamePageContentDate } = require('../scripts/content-dates.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

function assertSource(urlString, host, prefix) {
  const url = new URL(urlString);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, host);
  assert.ok(url.pathname.startsWith(prefix), `${url.pathname} should start with ${prefix}`);
}

test('Wave 4 verification data separates Web payment facts from unverified Google Play prices', () => {
  assert.equal(GAME_SEO_WAVE4.hbr.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO_WAVE4.hbr.webShop.appItemDiscountPercent, 5);
  assert.equal(GAME_SEO_WAVE4.hbr.webShop.basePointPercent, 1);
  assert.equal(GAME_SEO_WAVE4.hbr.webShop.passesPurchasable, false);

  assert.equal(GAME_SEO_WAVE4.honkai3rd.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO_WAVE4.honkai3rd.chargeCenter.crystalDoubleBonusSharedExceptMonthlyPass, true);
  assert.equal(GAME_SEO_WAVE4.honkai3rd.chargeCenter.inGameChargeRewardsStillGranted, true);
  assert.equal(GAME_SEO_WAVE4.honkai3rd.chargeCenter.monthlyPassCanExtendWhenRemainingDaysBelow, 180);
  assert.equal(GAME_SEO_WAVE4.honkai3rd.chargeCenter.historical2026CouponCampaign.currentStandingDiscount, false);

  assert.equal(GAME_SEO_WAVE4.phantomparade.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO_WAVE4.phantomparade.webShop.outsideGooglePlay, true);
  assert.deepEqual(GAME_SEO_WAVE4.phantomparade.webShop.currentPaidBeadFirstBonusPercentRange, [17, 20]);

  assert.equal(GAME_SEO_WAVE4.reverse1999.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO_WAVE4.reverse1999.priceRule, 'purchase-page-display');
});

test('Wave 4 official sources are pinned to intended domains and paths', () => {
  assertSource(SOURCES.hbrWebShop, 'webshop-jp.heaven-burns-red.wfs.games', '/');
  assertSource(SOURCES.hbrWebShopHelp, 'webshop-jp.heaven-burns-red.wfs.games', '/ja/help/1');
  assertSource(SOURCES.hi3ChargeCenterLaunch, 'www.hoyolab.com', '/article/31445251');
  assertSource(SOURCES.phantomWebShop, 'webshop.jujutsuphanpara.jp', '/');
  assertSource(SOURCES.reverseFund, 're1999.bluepoch.com', '/jp/bluepoch/fund.html');
  assertSource(SOURCES.reverseTopUp, 're1999.bluepoch.com', '/payment/info');
});

test('HBR parent fails closed while the guide reflects the Web Shop SSOT', () => {
  const html = read('games/hbr/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-webshop/'));
  for (const stale of ['ライトパス (600円)', 'プレミアムパス (2,900円)', '天井 200連 60,000個 (約60,000円)', '完凸目安 (約240,000円)', 'クォーツ 10,000個 (10,000円)']) {
    assert.ok(!html.includes(stale), `HBR should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/hbr/google-play-vs-webshop/index.html');
  const webShop = GAME_SEO_WAVE4.hbr.webShop;
  assert.ok(guide.includes('アプリ内より' + webShop.appItemDiscountPercent + '%OFF'));
  assert.ok(guide.includes('購入金額の<strong>' + webShop.basePointPercent + '%分のWEB SHOPポイント'));
  assert.match(guide, /パス.*WEB SHOP.*加入できない/);
  for (const example of webShop.currentQuartzExamples.filter(item => item.quartz >= 10000)) {
    assert.ok(guide.includes(formatNumber(example.quartz) + '個/' + formatNumber(example.price) + '円'));
  }
});

test('Honkai Impact 3rd removes cash pity guesses and reflects Charge Center SSOT boundaries', () => {
  const html = read('games/honkai3rd/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-charge-center/'));
  for (const stale of ['水晶月パス (600円)', '10連分 2,800個 (約5,600円)', '確定天井 90連 (約50,400円)', '装備一式目安 (約70,000円)', '水晶 6,000個 (12,000円)']) {
    assert.ok(!html.includes(stale), `HI3 should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/honkai3rd/google-play-vs-charge-center/index.html');
  const charge = GAME_SEO_WAVE4.honkai3rd.chargeCenter;
  assert.match(guide, /月パス以外の水晶2倍チャージボーナス/);
  assert.ok(guide.includes(String(charge.monthlyPassCanExtendWhenRemainingDaysBelow) + '日未満'));
  assert.equal(charge.historical2026CouponCampaign.currentStandingDiscount, false);
  assert.match(guide, /恒常割引ではありません/);
});

test('Phantom Parade fails closed for Google Play while reflecting Web Shop SSOT', () => {
  const html = read('games/phantomparade/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-webshop/'));
  for (const stale of ['ファンパレパス (1,000円)', '天井 250連 (約75,000円)', '完凸目安 (約300,000円)', '廻珠 10,000個 (10,000円)']) {
    assert.ok(!html.includes(stale), `Phantom Parade should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/phantomparade/google-play-vs-webshop/index.html');
  const webShop = GAME_SEO_WAVE4.phantomparade.webShop;
  assert.ok(guide.includes('初回は<strong>' + webShop.currentPaidBeadFirstBonusPercentRange.join('〜') + '%増量'));
  assert.ok(guide.includes(webShop.currentPackBonusPercentRange.join('〜') + '%増量'));
  assert.match(guide, /マイルpt/);
  for (const example of webShop.currentPassExamples) assert.ok(guide.includes(example.name + formatNumber(example.price) + '円'));
  assert.match(guide, /Google Play Pointsとは別/);
});

test('Reverse 1999 removes fixed product and pity cash data because official prices are purchase-page based', () => {
  const html = read('games/reverse1999/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  for (const stale of ['咆哮のひと月 (610円)', '仮天井 70連 (約25,200円)', '確定天井 140連 (約50,400円)', '純雨の雫 5,000個 (10,000円)', 'すべてポイントが還元されます']) {
    assert.ok(!html.includes(stale), `Reverse 1999 should drop stale/unconditional copy: ${stale}`);
  }
  assert.ok(html.includes('公式が価格を購入ページ表示としている'));
});

test('stale Wave 4 fixed-price claims do not survive across Japanese game pages', () => {
  const staleClaims = [
    'プレミアムパス (2,900円)',
    '確定天井 90連 (約50,400円)',
    'ファンパレパス (1,000円)',
    '咆哮のひと月 (610円)'
  ];
  const files = getGamePageHtmlFiles(root).filter(file => file.startsWith('games/'));
  for (const file of files) {
    const html = read(file);
    for (const text of staleClaims) assert.ok(!html.includes(text), `${file} should not retain stale Wave 4 fact: ${text}`);
  }
});

test('Wave 4 deep guides are discoverable and use verified editorial dates', () => {
  const guides = [
    'games/hbr/google-play-vs-webshop/index.html',
    'games/honkai3rd/google-play-vs-charge-center/index.html',
    'games/phantomparade/google-play-vs-webshop/index.html'
  ];
  const sitemap = read('sitemap.xml');
  for (const file of guides) {
    assert.equal(getGeneratedGamePageContentDate(file), VERIFIED_AT);
    assert.ok(sitemap.includes(`/${file.replace(/index\.html$/, '')}`), `${file} should be in sitemap`);
  }
  assert.equal(getGeneratedGamePageContentDate('games/reverse1999/index.html'), VERIFIED_AT);
});

test('canonical build runs Wave 4 after Wave 3', () => {
  const build = read('scripts/build-html.js');
  const wave3 = build.indexOf('syncGameSeoWave3(rootDir)');
  const wave4 = build.indexOf('syncGameSeoWave4(rootDir)');
  assert.ok(wave3 >= 0);
  assert.ok(wave4 > wave3);
});
