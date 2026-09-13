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

test('HBR parent fails closed while the guide preserves current official Web Shop advantages', () => {
  const html = read('games/hbr/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-webshop/'));
  for (const stale of ['ライトパス (600円)', 'プレミアムパス (2,900円)', '天井 200連 60,000個 (約60,000円)', '完凸目安 (約240,000円)', 'クォーツ 10,000個 (10,000円)']) {
    assert.ok(!html.includes(stale), `HBR should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/hbr/google-play-vs-webshop/index.html');
  assert.ok(guide.includes('アプリ内より5%OFF'));
  assert.ok(guide.includes('購入金額の<strong>1%分のWEB SHOPポイント'));
  assert.ok(guide.includes('プレミアムパス/ライトパスはWEB SHOPから加入できない'));
  assert.ok(guide.includes('10,000個/9,500円'));
  assert.ok(guide.includes('30,000個/28,500円'));
});

test('Honkai Impact 3rd removes cash pity guesses and explains official Charge Center boundaries', () => {
  const html = read('games/honkai3rd/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-charge-center/'));
  for (const stale of ['水晶月パス (600円)', '10連分 2,800個 (約5,600円)', '確定天井 90連 (約50,400円)', '装備一式目安 (約70,000円)', '水晶 6,000個 (12,000円)']) {
    assert.ok(!html.includes(stale), `HI3 should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/honkai3rd/google-play-vs-charge-center/index.html');
  assert.ok(guide.includes('月パス以外の水晶2倍チャージボーナス'));
  assert.ok(guide.includes('180日未満'));
  assert.ok(guide.includes('2026年3月5日〜4月16日'));
  assert.ok(guide.includes('恒常割引ではありません'));
});

test('Phantom Parade fails closed for Google Play while preserving current official Web Shop evidence', () => {
  const html = read('games/phantomparade/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-webshop/'));
  for (const stale of ['ファンパレパス (1,000円)', '天井 250連 (約75,000円)', '完凸目安 (約300,000円)', '廻珠 10,000個 (10,000円)']) {
    assert.ok(!html.includes(stale), `Phantom Parade should drop stale fixed value: ${stale}`);
  }

  const guide = read('games/phantomparade/google-play-vs-webshop/index.html');
  assert.ok(guide.includes('初回は<strong>17〜20%増量'));
  assert.ok(guide.includes('4〜5%増量'));
  assert.ok(guide.includes('マイルpt'));
  assert.ok(guide.includes('ファンパレボーナス610円'));
  assert.ok(guide.includes('Google Play Pointsとは別'));
});

test('Reverse 1999 removes fixed product and pity cash data because official prices are purchase-page based', () => {
  const html = read('games/reverse1999/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  for (const stale of ['咆哮のひと月 (610円)', '仮天井 70連 (約25,200円)', '確定天井 140連 (約50,400円)', '純雨の雫 5,000個 (10,000円)', 'すべてポイントが還元されます']) {
    assert.ok(!html.includes(stale), `Reverse 1999 should drop stale/unconditional copy: ${stale}`);
  }
  assert.ok(html.includes('公式が価格を購入ページ表示としている'));
});

test('stale Wave 4 card descriptions do not survive across Japanese game pages', () => {
  const stale = [
    'ヘブンバーンズレッド（ヘブバン）のクォーツ購入、ライト/プレミアムパス、200連天井ガチャで貯まるGoogle Play Pointsをパッと計算！',
    '崩壊3rdの水晶購入、ギフトコイン、月パス、90連キャラ確定天井で貯まるGoogle Play Pointsをパッと計算！',
    '呪術廻戦ファントムパレード（ファンパレ）の有償廻珠、ファンパレパス、250連天井ガチャで貯まるPlayポイントをサクッと計算！',
    'リバース：1999の純雨の雫パック、咆哮のひと月（月パス）、70連/140連天井ガチャで貯まるGoogle Play Pointsを即時計算！'
  ];
  const files = getGamePageHtmlFiles(root).filter(file => file.startsWith('games/'));
  for (const file of files) {
    const html = read(file);
    for (const text of stale) assert.ok(!html.includes(text), `${file} should not retain stale Wave 4 card copy`);
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
