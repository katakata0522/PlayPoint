'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const { GAME_SEO, FGO_PACKS_JP } = require('../scripts/game-seo-data.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

const fgo = () => read('games/fgo/index.html');
const genshin = () => read('games/genshin/index.html');
const monstGuide = () => read('games/monst/google-play-vs-webshop/index.html');
const bluearchive = () => read('games/bluearchive/index.html');

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

test('FGO公開計算機は旧価格を残さず確認済み価格と深掘り導線を使う', () => {
  const html = fgo();
  assert.ok(html.includes('有償13+無償8個（計21個 / 1,600円）'));
  assert.ok(html.includes('確定召喚330回・石0から（54,600円）'));
  assert.ok(html.includes('value="1920" min="0"'));
  assert.ok(html.includes('./pity-cost/'));
  assert.ok(!html.includes('聖晶石 1個 (160円)'));
  assert.ok(!html.includes('value="1900" min="0"'));
});

test('FGO深掘り記事は公式根拠・54,600円・福袋1,920円を同じページで説明する', () => {
  const html = read('games/fgo/pity-cost/index.html');
  assert.ok(html.includes('54,600円で計902個'));
  assert.ok(html.includes('有償15個'));
  assert.ok(html.includes('1,920円'));
  assert.ok(html.includes('https://news.fate-go.jp/2022/0930mquf/'));
  assert.ok(html.includes('https://faq.fate-go.jp/faq/show/1457'));
  assert.ok(html.includes('https://support.google.com/googleplay/answer/9077192'));
});

test('原神は980個帯の旧価格と固定天井円額を公開計算機から除く', () => {
  const html = genshin();
  assert.ok(html.includes('創世結晶 980+110個 (1,840円)'));
  assert.ok(html.includes('空月の祝福（610円）'));
  assert.ok(html.includes('./welkin-value/'));
  assert.ok(!html.includes('創世結晶 980+110個 (1,220円)'));
  assert.ok(!html.includes('確定天井 180連 (約54,000円)'));
  assert.ok(!html.includes('仮天井 90連 (約27,000円)'));
});

test('原神の空月記事は受取条件・通常チャージとの差・Play Points経路を分ける', () => {
  const html = read('games/genshin/welkin-value/index.html');
  assert.ok(html.includes('合計最大3,000原石相当'));
  assert.ok(html.includes('30日'));
  assert.ok(html.includes('Google Play経由'));
  assert.ok(html.includes('980個'));
  assert.ok(html.includes('1,840円'));
});

test('モンスト記事はアプリ180・Web190・月一200を区別しGoogle Play外決済を誤認しない', () => {
  const html = monstGuide();
  assert.ok(html.includes('<td>180個</td>'));
  assert.ok(html.includes('<td>190個</td>'));
  assert.ok(html.includes('<td>200個</td>'));
  assert.ok(html.includes('約5.6%'));
  assert.ok(html.includes('約11.1%'));
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
  assert.ok(sitemap.includes('https://playpoint-sim.com/games/fgo/pity-cost/'));
  assert.ok(sitemap.includes('https://playpoint-sim.com/games/genshin/welkin-value/'));
  assert.ok(sitemap.includes('https://playpoint-sim.com/games/monst/google-play-vs-webshop/'));
});

test('通常ビルドが検証済みゲームSEOとfail-closed安全処理の両方を実行する', () => {
  const build = read('scripts/build-html.js');
  assert.ok(build.includes("require('./game-seo-sync.cjs')"));
  assert.ok(build.includes("require('./game-seo-safety-sync.cjs')"));
  assert.ok(build.includes('syncGameSeo(rootDir)'));
  assert.ok(build.includes('syncGameSeoSafety(rootDir)'));
});
