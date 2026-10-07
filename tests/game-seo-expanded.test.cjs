'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GAME_SEO, SOURCES } = require('../scripts/game-seo-data.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const formatNumber = value => new Intl.NumberFormat('ja-JP').format(value);

function assertSource(urlText, host, pathname) {
  const parsed = new URL(urlText);
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.hostname, host);
  assert.equal(parsed.pathname, pathname);
}

test('第2波SSOTは商品内容の公式確認と価格再確認待ちを区別する', () => {
  assert.equal(GAME_SEO.starrail.verification, 'specification-verified-google-play-price-pending');
  assert.equal(GAME_SEO.zzz.verification, 'specification-verified-google-play-price-pending');
  assert.equal(GAME_SEO.umamusume.verification, 'official');
  assert.equal(GAME_SEO.proseka.verification, 'official-webstore-current-google-play-price-recheck-pending');
  assert.equal(GAME_SEO.proseka.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.nikke.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.gakumas.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.starrail.publishGooglePlayPrices, false);
  assert.equal(GAME_SEO.zzz.publishGooglePlayPrices, false);
});

test('第2波の商品内容の一次情報URLは想定ホストとパスを厳密に持つ', () => {
  assertSource(SOURCES.starrailSupplyPassReference, 'store.epicgames.com', '/p/honkai-star-rail-express-supply-pass-b72410');
  assertSource(SOURCES.zzzMembershipReference, 'store.playstation.com', '/en-nz/product/EP7711-PPSA20599_00-NAPPS5VIPUSD0499');
  assertSource(SOURCES.umamusumeUmasuku, 'webstore.cygames.com', '/umamusume/subscriptions/detail/umapack/');
  assertSource(SOURCES.umamusumeUmasukuLaunch, 'umamusume.jp', '/steam-news/detail');
  assertSource(SOURCES.prosekaWebStore, 'pjsekai.sega.jp', '/webstore');
  assertSource(SOURCES.prosekaFaq, 'pjsekai.sega.jp', '/faq/index.html');
  assertSource(SOURCES.nikkeCommerceLaw, 'nikke-jp.com', '/lawts/');
  assertSource(SOURCES.gakumasDmmSettlement, 'dmg-gakuen.idolmaster-official.jp', '/fund-settlement/');
});

test('スタレは未確認の固定価格を使わず、購入予定額を自由入力できる', () => {
  const html = read('games/starrail/index.html');
  assert.match(html, /data-input-mode="amount"/);
  assert.doesNotMatch(html, /id="sim-pack-select"|id="sim-pack-count"|class="pack-table"/);
  assert.match(html, /id="sim-custom-amount" value="0"/);
  assert.doesNotMatch(html, /data-amount=/);
  assert.doesNotMatch(html, /data-amount="27000"/);
  assert.doesNotMatch(html, /data-amount="54000"/);
  assert.match(html, /supply-pass-value\//);
});

test('スタレ深掘りはSSOTの列車補給標章の総量・速度・Play Pointsを分ける', () => {
  const html = read('games/starrail/supply-pass-value/index.html');
  const pass = GAME_SEO.starrail.supplyPass;
  assert.equal(pass.price, undefined);
  assert.ok(html.includes(SOURCES.starrailSupplyPassReference));
  assert.ok(html.includes('最大' + formatNumber(pass.maxJadeEquivalent) + '星玉相当'));
  assert.ok(html.includes(String(pass.stellarJadePerDay) + '星玉'));
  assert.match(html, /受け取れない|補填されない/);
  assert.match(html, /固定の円額/);
});

test('ゼンゼロは未確認の固定価格を使わず、購入予定額を自由入力できる', () => {
  const html = read('games/zzz/index.html');
  assert.match(html, /data-input-mode="amount"/);
  assert.doesNotMatch(html, /id="sim-pack-select"|id="sim-pack-count"|class="pack-table"/);
  assert.match(html, /id="sim-custom-amount" value="0"/);
  assert.doesNotMatch(html, /data-amount=/);
  assert.doesNotMatch(html, /data-amount="27000"/);
  assert.doesNotMatch(html, /data-amount="54000"/);
  assert.match(html, /membership-value\//);
});

test('ゼンゼロ深掘りはSSOTの会員総量を即時チャージと混同しない', () => {
  const html = read('games/zzz/membership-value/index.html');
  const membership = GAME_SEO.zzz.membership;
  assert.equal(membership.price, undefined);
  assert.ok(html.includes(SOURCES.zzzMembershipReference));
  assert.ok(html.includes('最大' + formatNumber(membership.maxPolychromeEquivalent) + 'ポリクローム相当'));
  assert.ok(html.includes(String(membership.days) + '日'));
  assert.match(html, /即時に.*受け取る商品ではない/);
  assert.match(html, /固定の円額/);
});

test('ウマ娘は終了済み商品を除外しSSOTの現行月額サービスを使う', () => {
  const html = read('games/umamusume/index.html');
  assert.doesNotMatch(html, /<option[^>]*>デイリージュエルパック/);
  assert.doesNotMatch(html, /data-amount="60000"/);
  assert.doesNotMatch(html, /200連=6万円/);
  assert.ok(html.includes('ウマスク（' + formatNumber(GAME_SEO.umamusume.umasuku.price) + '円）'));
  assert.ok(html.includes('ウマプラン（' + formatNumber(GAME_SEO.umamusume.umaplan.price) + '円）'));
  assert.match(html, /umasuku-value\//);
});

test('ウマスク深掘りはSSOTの現行公式特典と未受取仕様を説明する', () => {
  const html = read('games/umamusume/umasuku-value/index.html');
  const umasuku = GAME_SEO.umamusume.umasuku;
  assert.match(html, /販売終了/);
  assert.ok(html.includes('有償ジュエル' + umasuku.paidJewelsOnPurchaseOrRenewal + '個'));
  assert.ok(html.includes('無償ジュエル' + umasuku.freeJewelsOnPurchaseOrRenewal + '個'));
  assert.ok(html.includes('次回ログイン'));
  assert.match(html, /Google Play.*Cygames WebStore|Cygames WebStore.*Google Play/);
});

test('他ゲームのカードにも終了済みウマ娘説明を残さない', () => {
  const stale = 'ウマ娘のジュエル購入、デイリージュエルパック、200連天井・完凸課金で貯まるGoogle Play Pointsを即時シミュレーション！';
  for (const file of getGamePageHtmlFiles(root)) {
    assert.equal(read(file).includes(stale), false, file);
  }
});

test('プロセカはSSOTのWebStore価格をGoogle Play価格へ流用せず自由入力に落とす', () => {
  const parent = read('games/proseka/index.html');
  const guide = read('games/proseka/google-play-vs-webstore/index.html');
  const webStore = GAME_SEO.proseka.webStore;
  assert.match(parent, /Google Play購入画面の金額を入力/);
  assert.doesNotMatch(parent, /data-amount="90000"/);
  assert.doesNotMatch(parent, /プロセカの天井（9万円）/);
  assert.match(parent, /google-play-vs-webstore\//);
  for (const price of webStore.crystalProductPrices) assert.ok(guide.includes(formatNumber(price)));
  for (const pass of Object.values(webStore.colorfulPass)) assert.ok(guide.includes(formatNumber(pass.price) + '円'));
  assert.match(guide, /公式WebStoreはGoogle Play上の購入ではない/);
});

test('NIKKEは公開テキストで現行価格を固定できないため旧価格と固定課金額を出さない', () => {
  const html = read('games/nikke/index.html');
  assert.match(html, /Google Play購入画面の金額を入力/);
  assert.doesNotMatch(html, /data-amount="76000"/);
  assert.doesNotMatch(html, /data-amount="200000"/);
  assert.doesNotMatch(html, /200連（約7\.6万円）課金した場合/);
  assert.match(html, /NIKKEの200連分に必要な現金額は固定ですか？/);
  assert.doesNotMatch(html, /全額Play Pointsが付与されます/);
});

test('学マスは未確認Google Play価格と誤ったゴールド到達断定をfail closedする', () => {
  const html = read('games/gakumas/index.html');
  assert.match(html, /Google Play購入画面の金額を入力/);
  assert.doesNotMatch(html, /data-amount="60000"/);
  assert.doesNotMatch(html, /学マスの天井課金（6万円）/);
  assert.doesNotMatch(html, /ゴールド（1,000pt）に到達可能/);
  assert.match(html, /学マスの200連分に必要な現金額は固定ですか？/);
});

test('未確認価格の古い説明を他ゲームの関連記事カードにも残さない', () => {
  const staleDescriptions = [
    '勝利の女神：NIKKEのジュエル購入、30日補給品、イベントパス、マイレージ200連天井で貯まるPlayポイントをサクッと計算！',
    '学園アイドルマスター（学マス）の有償ジュエル、プレミアムミッションパス、200連天井・4凸課金で貯まるPlayポイントをパッと計算！',
    'プロジェクトセカイ（プロセカ）の有償クリスタル、カラフルパス、プレパス、天井ガチャで貯まるGoogle Play Pointsを即時計算！'
  ];
  for (const file of getGamePageHtmlFiles(root)) {
    const html = read(file);
    for (const stale of staleDescriptions) assert.equal(html.includes(stale), false, `${file}: ${stale}`);
  }
});

test('第2波深掘り記事はゲームサイトマップに再帰的に入る', () => {
  const sitemap = read('sitemap.xml');
  for (const slug of [
    'games/starrail/supply-pass-value/',
    'games/zzz/membership-value/',
    'games/umamusume/umasuku-value/',
    'games/proseka/google-play-vs-webstore/'
  ]) {
    assert.ok(sitemap.includes(`https://playpoint-sim.com/${slug}`), slug);
  }
});


