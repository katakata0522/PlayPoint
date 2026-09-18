'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const { GAME_SEO, SOURCES, VERIFIED_AT } = require('../scripts/game-seo-data.cjs');
const { getGeneratedGamePageContentDate } = require('../scripts/content-dates.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

function assertSource(urlString, expectedHost, expectedPathPrefix) {
  const parsed = new URL(urlString);
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.hostname, expectedHost);
  assert.ok(parsed.pathname.startsWith(expectedPathPrefix), `${parsed.pathname} should start with ${expectedPathPrefix}`);
}

test('wave 3 verification states separate verified mechanics from unverified prices', () => {
  assert.equal(GAME_SEO.pokepoke.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.pokepoke.premiumPass.firstTrialDays, 14);
  assert.equal(GAME_SEO.pad.verification, 'official');
  assert.equal(GAME_SEO.pad.pass.price, 980);
  assert.equal(GAME_SEO.pad.pass.freeTrialDays, 7);
  assert.equal(GAME_SEO.arknights.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.arknights.monthlyPass.paidOriginitePrimeImmediate, 6);
  assert.equal(GAME_SEO.arknights.monthlyPass.orundumPerDay, 200);
  assert.equal(GAME_SEO.arknights.limitedScout.extraLimitedOperatorAtPulls, 300);
  assert.equal(GAME_SEO.dokkan.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.dokkan.webStoreOutsideGooglePlay, true);
  assert.equal(GAME_SEO.wutheringwaves.publishGooglePlayPrices, false);
});

test('wave 3 sources stay on the intended official domains', () => {
  assertSource(SOURCES.pokepokePremiumPass, 'app-ptcgp.pokemon-support.com', '/hc/ja/articles/');
  assertSource(SOURCES.padPass, 'pad.gungho.jp', '/member/pdpass/');
  assertSource(SOURCES.arknightsMonthlyPass, 'www.arknights.jp', '/contact-1-hint');
  assertSource(SOURCES.dokkanWebStoreUsage, 'bnfaq.channel.or.jp', '/faq/detail/');
  assertSource(SOURCES.wutheringOfficial, 'wutheringwaves.kurogames.com', '/jp/announcement/');
});

test('Pokepoke parent fails closed on current prices and links to the verified pass guide', () => {
  const html = read('games/pokepoke/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./premium-pass-guide/'));
  assert.ok(!html.includes('プレミアムパス (980円)'));
  assert.ok(!html.includes('ポケゴールド 550個 (13,800円)'));
  assert.ok(!html.includes('<option value="140">ポケゴールド'));

  const guide = read('games/pokepoke/premium-pass-guide/index.html');
  assert.ok(guide.includes(String(GAME_SEO.pokepoke.premiumPass.firstTrialDays) + '日間の無料体験'));
  assert.match(guide, /1か月単位|1ヶ月単位/);
  assert.match(guide, /現行日本円月額|購入画面/);
});

test('PAD keeps the SSOT-verified pass and explains trial and persistent benefits', () => {
  const html = read('games/pad/index.html');
  const pass = GAME_SEO.pad.pass;
  assert.ok(html.includes('パズドラパス (月額' + pass.price + '円)'));
  assert.ok(html.includes('./pad-pass-value/'));

  const guide = read('games/pad/pad-pass-value/index.html');
  assert.ok(guide.includes('月額' + pass.price + '円'));
  assert.ok(guide.includes(String(pass.freeTrialDays) + '週間の無料トライアル'));
  assert.ok(guide.includes('チーム枠+' + pass.benefits.extraTeamSlots));
  assert.ok(guide.includes('ランク経験値' + pass.benefits.rankExpBonusPercent + '%アップ'));
});

test('Arknights preserves SSOT-verified mechanics but removes unverified price and fixed cash pity claims', () => {
  const html = read('games/arknights/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./monthly-pass-limited-scout/'));
  assert.ok(!html.includes('月パス (610円)'));
  assert.ok(!html.includes('月間スカウトパック (2,440円)'));
  assert.ok(!html.includes('限定フェス天井 300連 (約90,000円)'));

  const guide = read('games/arknights/monthly-pass-limited-scout/index.html');
  const monthly = GAME_SEO.arknights.monthlyPass;
  const limited = GAME_SEO.arknights.limitedScout;
  assert.ok(guide.includes('有償純正源石' + monthly.paidOriginitePrimeImmediate + '個'));
  assert.ok(guide.includes('合成玉' + monthly.orundumPerDay + '個'));
  assert.ok(guide.includes(String(limited.extraLimitedOperatorAtPulls) + '回スカウト'));
  assert.match(guide, /固定現金額/);
});

test('Dokkan separates official Web Store from Google Play and drops changing fixed pack prices', () => {
  const html = read('games/dokkan/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(html.includes('./google-play-vs-webstore/'));
  assert.ok(!html.includes('デイリーカプセル 30日 (1,200円)'));
  assert.ok(!html.includes('龍石 セール100個 (4,000円)'));
  assert.ok(!html.includes('周年・Wフェス (50,000円)'));

  const guide = read('games/dokkan/google-play-vs-webstore/index.html');
  assert.ok(guide.includes('公式Web Store'));
  assert.ok(guide.includes('Google Play決済とは別'));
  assert.ok(guide.includes('Google Play Points'));
});

test('Wuthering Waves removes unverifiable prices, fixed cash pity, and unconditional Points claims', () => {
  const html = read('games/wutheringwaves/index.html');
  assert.ok(html.includes('Google Playの表示額を入力'));
  assert.ok(!html.includes('月相観測パス (610円)'));
  assert.ok(!html.includes('確定天井 160連 (約48,000円)'));
  assert.ok(!html.includes('完凸S6 (約200,000円)'));
  assert.ok(!html.includes('全額Play Pointsの対象です'));
});

test('stale Wave 3 fixed-price claims do not survive across Japanese game pages', () => {
  const staleClaims = [
    'ポケゴールド 550個 (13,800円)',
    '月間スカウトパック (2,440円)',
    '龍石 セール100個 (4,000円)',
    '月相観測パス (610円)'
  ];
  const japaneseFiles = getGamePageHtmlFiles(root).filter(file => file.startsWith('games/'));
  for (const file of japaneseFiles) {
    const html = read(file);
    for (const text of staleClaims) assert.ok(!html.includes(text), `${file} should not retain stale Wave 3 fact: ${text}`);
  }
});

test('Wave 3 guides are sitemap-visible and use verified editorial dates', () => {
  const paths = [
    'games/pokepoke/premium-pass-guide/index.html',
    'games/pad/pad-pass-value/index.html',
    'games/arknights/monthly-pass-limited-scout/index.html',
    'games/dokkan/google-play-vs-webstore/index.html'
  ];
  const sitemap = read('sitemap.xml');
  for (const file of paths) {
    assert.equal(getGeneratedGamePageContentDate(file), VERIFIED_AT);
    const relativeUrl = `/${file.replace(/index\.html$/, '')}`;
    assert.ok(sitemap.includes(relativeUrl), `${relativeUrl} should be present in sitemap`);
  }
});

test('canonical build runs Wave 3 synchronization after the earlier game SEO layers', () => {
  const build = read('scripts/build-html.js');
  const expanded = build.indexOf('syncGameSeoExpanded(rootDir)');
  const wave3 = build.indexOf('syncGameSeoWave3(rootDir)');
  assert.ok(expanded >= 0);
  assert.ok(wave3 > expanded);
});
