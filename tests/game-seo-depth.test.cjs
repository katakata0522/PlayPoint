'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { openingTags } = require('./helpers/markup-contract.cjs');

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
  return openingTags(html).filter(node => node.tag === 'a' && node.attrs.href).map(node => new URL(node.attrs.href.replaceAll('&amp;', '&'), SITE_ORIGIN));
}

function assertHasHref(html, expectedUrl) {
  const expected = new URL(expectedUrl);
  const found = hrefUrls(html).some(candidate =>
    candidate.protocol === expected.protocol &&
    candidate.hostname === expected.hostname &&
    candidate.pathname === expected.pathname &&
    candidate.search === expected.search
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

test('FGOの2022年公式価格表・確定召喚・福袋の試算値を保持する', () => {
  assert.deepEqual(FGO_PACKS_JP.map(pack => [pack.paid, pack.free, pack.total, pack.price]), [
    [4, 1, 5, 480],
    [13, 8, 21, 1600],
    [25, 16, 41, 3000],
    [42, 35, 77, 4900],
    [86, 82, 168, 10000]
  ]);
  assert.equal(GAME_SEO.fgo.priceSourceDate, '2022-09-30');
  assert.equal(GAME_SEO.fgo.currentGooglePlayPricesVerified, false);
  assert.equal(GAME_SEO.fgo.pity.guaranteedSummonCount, 330);
  assert.equal(GAME_SEO.fgo.pity.quartzRequired, 900);
  assert.equal(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero, 54600);
  assert.equal(GAME_SEO.fgo.pity.quartzPurchasedAtThatSpend, 902);
  assert.equal(GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero, 1920);
});

test('FGO公開計算機は2022年価格例と深掘り導線を使う', () => {
  const html = fgo();
  const pack = GAME_SEO.fgo.packsJa.find(item => item.total === 21);
  assert.ok(pack, 'FGO 21-quartz pack is missing from SSOT');
  assert.ok(html.includes('有償' + pack.paid + '+無償' + pack.free + '個（計' + pack.total + '個 / ' + formatNumber(pack.price) + '円・2022年参考）'));
  assert.ok(html.includes('予算 ' + formatNumber(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero) + '円'));
  assert.ok(html.includes('2022年の公式価格表を前提とした試算'));
  assert.ok(html.includes('現在のGoogle Play版の価格・個数は未確認'));
  assert.ok(html.includes('福袋は終了済み'));
  assert.ok(html.includes('税未調整の支払額ベース'));
  assert.ok(!html.includes('確認済みの現行価格'));
  assert.ok(html.includes('value="' + GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero + '" min="0"'));
  assert.ok(html.includes('./pity-cost/'));
  assert.ok(!html.includes('聖晶石 1個 (160円)'));
  assert.ok(!html.includes('value="1900" min="0"'));
});

test('FGO記事の再生成用テンプレートはFAQと確認日を保つ', () => {
  const { renderFgoGuide } = require('../scripts/game-seo-sync.cjs');
  const { replaceDateMetadata } = require('../scripts/html-replacements.cjs');
  const { getContentDateForFile } = require('../scripts/content-dates.cjs');
  const html = renderFgoGuide();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const faq = blocks.find(block => block['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 2);
  for (const item of faq.mainEntity) {
    assert.ok(html.includes('<h3>Q. ' + item.name + '</h3><p>A. ' + item.acceptedAnswer.text + '</p>'));
  }
  const contentDate = getContentDateForFile('games/fgo/pity-cost/index.html');
  const synced = replaceDateMetadata(html, contentDate, { includeEnglish: true, includeTraditionalChinese: true });
  assert.ok(synced.includes('<meta name="last-modified" content="' + contentDate + '"'));
  assert.ok(synced.includes('最終確認：' + GAME_SEO.fgo.verifiedAt));
  assert.ok(synced.includes('\"dateModified\": \"' + contentDate + '\"'));
});

test('FGO深掘り記事はSSOTの確定召喚・福袋値と公式根拠を同期する', () => {
  const html = read('games/fgo/pity-cost/index.html');
  assert.ok(html.includes(formatNumber(GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero) + '円で' + GAME_SEO.fgo.pity.quartzPurchasedAtThatSpend + '個'));
  assert.ok(html.includes('有償' + GAME_SEO.fgo.luckyBag.paidQuartzRequired + '個'));
  assert.ok(html.includes(formatNumber(GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero) + '円'));
  assertHasHref(html, SOURCES.fgoPrice);
  assertHasHref(html, SOURCES.fgoPity);
  assertHasHref(html, SOURCES.googlePlayEarn);
});

test('原神は未確認の固定価格を使わず、購入予定額を自由入力できる', () => {
  const html = genshin();
  assert.equal(GAME_SEO.genshin.publishGooglePlayPrices, false);
  assert.match(html, /data-input-mode="amount"/);
  assert.doesNotMatch(html, /id="sim-pack-select"|id="sim-pack-count"|class="pack-table"/);
  assert.match(html, /id="sim-custom-amount" value="0"/);
  assert.doesNotMatch(html, /data-amount=/);
  assert.ok(html.includes('./welkin-value/'));
});

test('原神の空月記事はSSOTの受取条件・通常チャージとの差・Play Points経路を分ける', () => {
  const html = read('games/genshin/welkin-value/index.html');
  const welkin = GAME_SEO.genshin.welkin;
  const answer = html.match(/<section\b[^>]*class="[^"]*\banswer-box\b[^"]*"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
  const text = answer.replace(/<[^>]*>/g, '');
  assert.ok(text.includes('最大' + formatNumber(welkin.maxPrimogemEquivalent) + '原石相当'));
  assert.ok(text.includes('創世結晶300個を1:1で原石に交換'));
  assert.ok(html.includes(String(welkin.days) + '日'));
  assert.ok(html.includes('Google Play経由'));
  assert.equal(welkin.price, undefined);
  assertHasHref(html, SOURCES.genshinWelkinReference);
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
  assert.match(html, /data-input-mode="amount"/);
  assert.match(html, /id="sim-custom-amount" value="0"/);
  assert.doesNotMatch(html, /id="sim-pack-select"|data-amount=/);
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



const { compareMonstPurchases } = require('../js/monst-purchase-comparison.js');
const { renderMonstComparison } = require('../scripts/monst-purchase-comparison.cjs');
const data = GAME_SEO.monst;
const config = { price: data.appStoreReference.price, appOrbs: data.appStoreReference.orbs, webOrbs: data.webStore.orbs, monthlyOrbs: data.monthlyWebStore.orbs };

test('使わない特典は0円とし、月イチ購入枠がない時は通常Webだけを比較対象にする', () => {
  assert.deepEqual(compareMonstPurchases(config, 0, 0, false).winners, ['Web通常']);
  assert.deepEqual(compareMonstPurchases(config, 0, 0, true).winners, ['Web月イチ']);
  assert.equal(compareMonstPurchases(config, 0, 0, false).rows.length, 2);
});
test('受取個数と、特典を使い切った場合の比較単価を混同しない', () => {
  const result = compareMonstPurchases(config, 700, 0, false);
  assert.deepEqual(result.winners, ['Google Play']);
  assert.equal(result.rows[0].orbs, 180);
  assert.ok(Math.abs(result.rows[0].unit - 9300 / 180) < 1e-9);
  assert.deepEqual(compareMonstPurchases(config, 700, 0, true).winners, ['Web月イチ']);
});
test('月イチとの分岐点とWeb側還元による移動を、丸め前の値で判定する', () => {
  assert.deepEqual(compareMonstPurchases(config, 1000, 0, true).winners, ['Google Play', 'Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1000, 200, true).winners, ['Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1180, 200, true).winners, ['Google Play', 'Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 999.99, 0, true).winners, ['Web月イチ']);
  assert.deepEqual(compareMonstPurchases(config, 1000.01, 0, true).winners, ['Google Play']);
});
test('不正な特典価値で結論を出さず、100%相当の価値も非負の単価にする', () => {
  for (const invalid of [-1, NaN, Infinity, 10000.01, '700', null]) {
    assert.throws(() => compareMonstPurchases(config, invalid, 0, true), RangeError);
    assert.throws(() => compareMonstPurchases(config, 0, invalid, true), RangeError);
  }
  assert.equal(compareMonstPurchases(config, 10000, 0, true).rows[0].unit, 0);
  assert.throws(() => compareMonstPurchases({ ...config, appOrbs: 0 }, 0, 0, true), TypeError);
});
test('台帳の確認済み商品だけを描画し、異なる予算の商品へ黙って流用しない', () => {
  const html = renderMonstComparison(data);
  for (const value of [config.appOrbs, config.webOrbs, config.monthlyOrbs]) assert.ok(html.includes(value + '個'));
  assert.throws(() => renderMonstComparison({ ...data, webStore: { ...data.webStore, price: 12000 } }));
});
