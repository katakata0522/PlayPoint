'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const { GAME_SEO, FGO_PACKS_JP, SOURCES } = require('../scripts/game-seo-data.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com/';
const fgo = () => read('games/fgo/index.html');
const genshin = () => read('games/genshin/index.html');
const monstGuide = () => read('games/monst/google-play-vs-webshop/index.html');
const bluearchive = () => read('games/bluearchive/index.html');
const formatNumber = value => new Intl.NumberFormat('ja-JP').format(value);

function hrefUrls(html) {
  return [...html.matchAll(/\bhref="([^"]+)"/g)].map(match => new URL(match[1], SITE_ORIGIN));
}

function assertHasHref(html, expectedUrl) {
  const expected = new URL(expectedUrl);
  const found = hrefUrls(html).some(candidate =>
    candidate.protocol === expected.protocol &&
    candidate.hostname === expected.hostname &&
    candidate.pathname === expected.pathname
  );
  assert.equal(found, true, `expected href for ${expected.hostname}${expected.pathname}`);
}

function sitemapLocUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
}

function assertSitemapHasPath(xml, pathname) {
  const expectedOrigin = new URL(SITE_ORIGIN).origin;
  const found = sitemapLocUrls(xml).some(candidate => candidate.origin === expectedOrigin && candidate.pathname === pathname);
  assert.equal(found, true, `expected sitemap path ${pathname}`);
}

test('FGOの価格・確定召喚・福袋の正本は確認済み値に固定する', () => {
  assert.deepEqual(FGO_PACKS_JP.map(pack => [pack.paid, pack.free, pack.total, pack.price]), [
    [4, 1, 5, 480],
    [13, 8, 21, 1600],
    [25, 16, 41, 3000],
    [42, 35, 77, 4900],
    [86, 82, 168, 10000]
  ]);
  assert.equal(GAME_SEO.fgo.pity.guaranteedSummonCount, 330);
  assert.equal(GAME_SEO.fgo.pity.quartzRequired, 900);
  assert.equal(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero, 54600);
  assert.equal(GAME_SEO.fgo.pity.quartzPurchasedAtThatSpend, 902);
  assert.equal(GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero, 1920);
});

test('FGO公開計算機はSSOTの確認済み価格と深掘り導線を使う', () => {
  const html = fgo();
  const pack = GAME_SEO.fgo.packsJa.find(item => item.total === 21);
  assert.ok(pack, 'FGO 21-quartz pack is missing from SSOT');
  assert.ok(html.includes('有償' + pack.paid + '+無償' + pack.free + '個（計' + pack.total + '個 / ' + formatNumber(pack.price) + '円）'));
  assert.ok(html.includes('確定召喚' + GAME_SEO.fgo.pity.guaranteedSummonCount + '回・石0から（' + formatNumber(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero) + '円）'));
  assert.ok(html.includes('value="' + GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero + '" min="0"'));
  assert.ok(html.includes('./pity-cost/'));
  assert.ok(!html.includes('聖晶石 1個 (160円)'));
  assert.ok(!html.includes('value="1900" min="0"'));
});

test('FGO深掘り記事はSSOTの確定召喚・福袋値と公式根拠を同期する', () => {
  const html = read('games/fgo/pity-cost/index.html');
  assert.ok(html.includes(formatNumber(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero) + '円で計' + GAME_SEO.fgo.pity.quartzPurchasedAtThatSpend + '個'));
  assert.ok(html.includes('有償' + GAME_SEO.fgo.luckyBag.paidQuartzRequired + '個'));
  assert.ok(html.includes(formatNumber(GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero) + '円'));
  assertHasHref(html, SOURCES.fgoPrice);
  assertHasHref(html, SOURCES.fgoPity);
  assertHasHref(html, SOURCES.googlePlayEarn);
});

test('原神はSSOTの価格補正を使い、旧価格と固定天井円額を公開計算機から除く', () => {
  const html = genshin();
  const correction = GAME_SEO.genshin.japanPriceCorrections[0];
  assert.ok(html.includes(correction.item + ' (' + formatNumber(correction.price) + '円)'));
  assert.ok(html.includes('空月の祝福（' + formatNumber(GAME_SEO.genshin.welkin.price) + '円）'));
  assert.ok(html.includes('./welkin-value/'));
  assert.ok(!html.includes(correction.item + ' (' + formatNumber(correction.oldPrice) + '円)'));
  assert.ok(!html.includes('確定天井 180連 (約54,000円)'));
  assert.ok(!html.includes('仮天井 90連 (約27,000円)'));
});

test('原神の空月記事はSSOTの受取条件・通常チャージとの差・Play Points経路を分ける', () => {
  const html = read('games/genshin/welkin-value/index.html');
  const welkin = GAME_SEO.genshin.welkin;
  const correction = GAME_SEO.genshin.japanPriceCorrections[0];
  assert.ok(html.includes('合計最大' + formatNumber(welkin.maxPrimogemEquivalent) + '原石相当'));
  assert.ok(html.includes(String(welkin.days) + '日'));
  assert.ok(html.includes('Google Play経由'));
  const basePackAmount = correction.item.match(/\d+/)?.[0];
  assert.ok(basePackAmount, 'Genshin corrected pack amount is missing from SSOT');
  assert.ok(html.includes(basePackAmount + '個'));
  assert.ok(html.includes(formatNumber(correction.price) + '円'));
});

test('モンスト記事はSSOTのアプリ・Web・月一商品を区別しGoogle Play外決済を誤認しない', () => {
  const html = monstGuide();
  for (const option of [GAME_SEO.monst.appStoreReference, GAME_SEO.monst.webStore, GAME_SEO.monst.monthlyWebStore]) {
    assert.ok(html.includes('<td>' + option.orbs + '個</td>'));
    assert.ok(html.includes(formatNumber(option.price)));
  }
  assert.ok(html.includes('Google Play購入ではない'));
});

test('ブルアカは現行価格未確認時に固定価格へfail-openしない', () => {
  const html = bluearchive();
  assert.ok(html.includes('100チャージ'));
  assert.ok(html.includes('200チャージ'));
  assert.ok(html.includes('現行価格をGoogle Playで確認して入力'));
  assert.ok(html.includes('一次表示の再確認中'));
  assert.ok(!html.includes('天井 200連 (約48,000円)'));
  assert.ok(!html.includes('青輝石 6600個 (10,000円)'));
});

test('ゲーム深掘り記事はゲームサイトマップ対象として再帰的に発見される', () => {
  const files = new Set(getGamePageHtmlFiles(root));
  assert.ok(files.has('games/fgo/pity-cost/index.html'));
  assert.ok(files.has('games/genshin/welkin-value/index.html'));
  assert.ok(files.has('games/monst/google-play-vs-webshop/index.html'));

  const sitemap = read('sitemap.xml');
  assertSitemapHasPath(sitemap, '/games/fgo/pity-cost/');
  assertSitemapHasPath(sitemap, '/games/genshin/welkin-value/');
  assertSitemapHasPath(sitemap, '/games/monst/google-play-vs-webshop/');
});

test('通常ビルドが検証済みゲームSEOとfail-closed安全処理の両方を実行する', () => {
  const build = read('scripts/build-html.js');
  assert.ok(build.includes("require('./game-seo-sync.cjs')"));
  assert.ok(build.includes("require('./game-seo-safety-sync.cjs')"));
  assert.ok(build.includes('syncGameSeo(rootDir)'));
  assert.ok(build.includes('syncGameSeoSafety(rootDir)'));
});
