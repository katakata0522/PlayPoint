'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GAME_SEO, SOURCES } = require('../scripts/game-seo-data.cjs');
const { getGamePageHtmlFiles } = require('../scripts/game-page-targets.cjs');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function assertSource(urlText, host, pathname) {
  const parsed = new URL(urlText);
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.hostname, host);
  assert.equal(parsed.pathname, pathname);
}

test('第2波SSOTは価格スナップショットと公式情報の信頼区分を分ける', () => {
  assert.equal(GAME_SEO.starrail.verification, 'current-published-price-snapshot');
  assert.equal(GAME_SEO.zzz.verification, 'current-published-price-snapshot');
  assert.equal(GAME_SEO.umamusume.verification, 'official');
  assert.equal(GAME_SEO.proseka.verification, 'official-webstore-current');
  assert.deepEqual(GAME_SEO.starrail.japanPriceCorrections[0], { item: '往日の夢華 980+110個', oldPrice: 1220, price: 1840 });
  assert.deepEqual(GAME_SEO.zzz.japanPriceCorrections[0], { item: 'モノクローム 980+110個', oldPrice: 1220, price: 1840 });
});

test('第2波の一次情報・公開スナップショットURLは想定ホストとパスを厳密に持つ', () => {
  assertSource(SOURCES.starrailPriceSnapshot, 'www.hoyolab.com', '/article/43772496');
  assertSource(SOURCES.zzzPriceSnapshot, 'www.hoyolab.com', '/article/36511454');
  assertSource(SOURCES.umamusumeUmasuku, 'webstore.cygames.com', '/umamusume/subscriptions/detail/umapack/');
  assertSource(SOURCES.umamusumeUmasukuLaunch, 'umamusume.jp', '/steam-news/detail');
  assertSource(SOURCES.prosekaWebStore, 'pjsekai.sega.jp', '/webstore');
  assertSource(SOURCES.prosekaFaq, 'pjsekai.sega.jp', '/faq/index.html');
});

test('スタレは旧980帯価格と固定天井円額を公開計算機から除く', () => {
  const html = read('games/starrail/index.html');
  assert.match(html, /往日の夢華 980\+110個 \(1,840円\)/);
  assert.doesNotMatch(html, /往日の夢華 980\+110個 \(1,220円\)/);
  assert.doesNotMatch(html, /data-amount="27000"/);
  assert.doesNotMatch(html, /data-amount="54000"/);
  assert.match(html, /supply-pass-value\//);
});

test('スタレ深掘りは列車補給標章の総量・速度・Play Pointsを分ける', () => {
  const html = read('games/starrail/supply-pass-value/index.html');
  assert.match(html, /610円/);
  assert.match(html, /最大3,000星玉相当/);
  assert.match(html, /ログインしなかった日の90星玉は後からまとめて受け取れない/);
  assert.match(html, /固定の円額を断定しません/);
});

test('ゼンゼロは旧980帯価格と固定天井円額を公開計算機から除く', () => {
  const html = read('games/zzz/index.html');
  assert.match(html, /モノクローム 980\+110個 \(1,840円\)/);
  assert.doesNotMatch(html, /モノクローム 980\+110個 \(1,220円\)/);
  assert.doesNotMatch(html, /data-amount="27000"/);
  assert.doesNotMatch(html, /data-amount="54000"/);
  assert.match(html, /membership-value\//);
});

test('ゼンゼロ深掘りはインターノット会員を即時チャージと混同しない', () => {
  const html = read('games/zzz/membership-value/index.html');
  assert.match(html, /610円/);
  assert.match(html, /最大3,000ポリクローム相当/);
  assert.match(html, /即時に3,000個を受け取る商品ではない/);
  assert.match(html, /固定の円額としては扱いません/);
});

test('ウマ娘は終了済みデイリージュエルパックを購入候補から除外する', () => {
  const html = read('games/umamusume/index.html');
  assert.doesNotMatch(html, /<option[^>]*>デイリージュエルパック/);
  assert.doesNotMatch(html, /data-amount="60000"/);
  assert.doesNotMatch(html, /200連=6万円/);
  assert.match(html, /ウマスク（980円）/);
  assert.match(html, /ウマプラン（1,980円）/);
  assert.match(html, /umasuku-value\//);
});

test('ウマスク深掘りは現行公式特典と未受取仕様を説明する', () => {
  const html = read('games/umamusume/umasuku-value/index.html');
  assert.match(html, /2024年12月19日4:59に販売終了/);
  assert.match(html, /有償ジュエル500個 \+ 無償ジュエル50個/);
  assert.match(html, /未受取分は次回ログイン時にまとめてプレゼントへ送られる/);
  assert.match(html, /Google PlayとCygames WebStoreは別の購入経路/);
});

test('他ゲームのカードにも終了済みウマ娘説明を残さない', () => {
  const stale = 'ウマ娘のジュエル購入、デイリージュエルパック、200連天井・完凸課金で貯まるGoogle Play Pointsを即時シミュレーション！';
  for (const file of getGamePageHtmlFiles(root)) {
    assert.equal(read(file).includes(stale), false, file);
  }
});

test('プロセカは公式WebStore価格とGoogle Play Pointsを別軸で説明する', () => {
  const parent = read('games/proseka/index.html');
  const guide = read('games/proseka/google-play-vs-webstore/index.html');
  assert.match(parent, /google-play-vs-webstore\//);
  assert.match(guide, /160 \/ 480 \/ 1,000 \/ 1,800 \/ 3,000 \/ 4,900 \/ 10,000円/);
  assert.match(guide, /BASIC 480円、DELUXE 1,500円、PRECIOUS 3,000円/);
  assert.match(guide, /公式WebStoreはGoogle Play上の購入ではない/);
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

test('通常ビルドは第2波ゲームSEO同期を毎回実行する', () => {
  const build = read('scripts/build-html.js');
  assert.match(build, /game-seo-expanded-sync\.cjs/);
  assert.match(build, /syncGameSeoExpanded\(rootDir\)/);
});
