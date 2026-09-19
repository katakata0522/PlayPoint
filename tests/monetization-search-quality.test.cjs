'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const SLOT = '8250492620';

test('記事・LP・ゲームの管理広告は有効な広告ユニットIDを持つ', () => {
  const targets = [
    ['articles/2025-12-25-campaign.html', 'article-ad-container'],
    ['status/gold/index.html', 'lp-ad-container'],
    ['games/fgo/index.html', 'game-ad-container'],
    ['en/games/fgo/index.html', 'game-ad-container']
  ];
  for (const [targetFile, klass] of targets) {
    const html = read(targetFile);
    const marker = 'class="' + klass + '"';
    const index = html.indexOf(marker);
    assert.ok(index >= 0, targetFile + ': 管理広告枠がありません');
    const block = html.slice(index, index + 900);
    assert.ok(block.includes('data-ad-slot="' + SLOT + '"'), targetFile + ': data-ad-slot がありません');
  }
});


test('記事・LP・ゲームの広告初期化経路が共通runtimeと広告Consent境界に接続される', () => {
  for (const [file, scripts] of [
    ['articles/2026-08-05-play-points-multiplier-stacking.html', ['blog/components.js', 'blog/article.js']],
    ['status/gold/index.html', ['js/third-party.js']],
    ['games/fgo/index.html', ['js/third-party.js']],
    ['games/index.html', ['js/third-party.js']]
  ]) {
    const html = read(file);
    for (const script of scripts) assert.ok(html.includes(script), `${file}: ${script} がありません`);
  }

  const articleRuntime = read('blog/article.js');
  const sharedRuntime = read('js/third-party.js');
  assert.match(articleRuntime, /PlayPointConsent\.whenAdsAllowed\s*\(/, '記事広告が広告Consent境界を通っていません');
  assert.match(sharedRuntime, /runAfterConsent\([^,\n]+,\s*['"]ads['"]\)/, 'LP・ゲーム広告が広告Consent用途を指定していません');
});

test('記事・ブログGA4はconfig後にreadinessを立てる', () => {
  const source = read('blog/components.js');
  const configIndex = source.indexOf("window.gtag('config', GA_MEASUREMENT_ID)");
  const readyIndex = source.indexOf('window.PlayPointAnalytics.markAnalyticsReady()');
  assert.ok(configIndex >= 0);
  assert.ok(readyIndex > configIndex);
  assert.ok(!source.includes('window.PlayPointAnalytics.flushPending()'));
});

test('未確認の未来イベント記事は検索品質保留としてnoindex・サイトマップ除外する', () => {
  const files = [
    'articles/2026-08-17-diamond-valley-festival-guide.html'
  ];
  const mainSitemap = read('sitemap.xml');
  const blogSitemap = read('blog/sitemap.xml');
  const rss = read('feed.xml');
  const atom = read('atom.xml');
  const catalog = JSON.parse(read('blog/articles.json'));
  for (const file of files) {
    const html = read(file);
    const name = path.basename(file);
    const item = catalog.find(entry => entry.file === '../' + file);
    assert.match(html, /name=\"robots\" content=\"noindex, follow, max-image-preview:large\"/);
    assert.match(html, /公式発表待ち|未確認/);
    assert.ok(!mainSitemap.includes(name), name + ': main sitemapに残っています');
    assert.ok(!blogSitemap.includes(name), name + ': blog sitemapに残っています');
    assert.ok(!rss.includes(name), name + ': RSSに残っています');
    assert.ok(!atom.includes(name), name + ': Atomに残っています');
    assert.ok(!read('blog/index.html').includes(name), name + ': ブログ静的一覧に残っています');
    assert.ok(!read('sitemap.html').includes(name), name + ': 人向けサイトマップに残っています');
    assert.equal(item.listed, false, name + ': 記事台帳で非掲載になっていません');
  }
});

test('公式発表済みのTGS 2026記事はindex対象へ戻し、現行公式条件を保持する', () => {
  const file = 'articles/2026-08-17-tgs-google-play-vip.html';
  const html = read(file);
  const catalog = JSON.parse(read('blog/articles.json'));
  const item = catalog.find(entry => entry.file === '../' + file);
  assert.match(html, /name="robots" content="index, follow, max-image-preview:large"/);
  assert.doesNotMatch(html, /公式発表待ち|2026年TGSのGoogle Play VIP特典は未確認/);
  assert.match(html, /2026年9月19日（土）〜21日（月・祝）/);
  assert.match(html, /幕張メッセ.*ホール7/);
  assert.match(html, /同行者最大5名/);
  assert.match(html, /最大8人同時対戦/);
  assert.match(html, /TGS限定ビッグショッパー/);
  assert.match(html, /限定デザインステッカー/);
  assert.match(html, /ダイヤモンドラウンジ/);
  assert.match(html, /ダイヤモンドキット/);
  assert.match(html, /PC版Google Play Games/);
  assert.ok(item && item.listed !== false, 'TGS 2026 article must be listed');
  assert.equal(item.modified, '2026-09-19');
});

test('広告生成スクリプト自体もdata-ad-slotを保持する', () => {
  for (const file of [
    'scripts/insert-article-ads.cjs',
    'scripts/insert-lp-monetization.cjs',
    'scripts/generate-game-simulators.cjs'
  ]) {
    assert.ok(read(file).includes('data-ad-slot=\"' + SLOT + '\"'), file);
  }
});


test('ゲーム計算機の国別公式レートは現行Google表と一致する', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  const runtime = read('games/game-sim.js');
  for (const expected of [
    "Diamond ($1 = 1.6pt)",
    "골드 (1,000원=1.3pt)",
    "플래티넘 (1,000원=1.6pt)",
    "다이아몬드 (1,000원=2pt)",
    "銀級（NT$30 = 1.25點）",
    "金級（NT$30 = 1.5點）",
    "白金級（NT$30 = 1.75點）",
    "鑽石級（NT$30 = 2點）"
  ]) assert.ok(generator.includes(expected), expected);
  assert.ok(runtime.includes("{ name: 'Diamond', points: 10000, rate: 1.6 }"));
  assert.ok(runtime.includes("{ name: '플래티넘', points: 2400, rate: 1.6 }"));
  assert.ok(runtime.includes("{ name: '다이아몬드', points: 15000, rate: 2.0 }"));
  assert.ok(runtime.includes("{ name: '白金級', points: 4000, rate: 1.75 }"));
});

test('ゲーム計算機は固定のポイント換金価値を断定しない', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  const runtime = read('games/game-sim.js');
  for (const forbidden of ['1pt ＝ 約2.0〜2.5円相当', '100ptで100円分', '100pts = $1.00 Play Credit', '100pt로 100원 충전']) {
    assert.ok(!generator.includes(forbidden), forbidden);
  }
  assert.ok(runtime.includes('redeemCheckText'));
  assert.ok(!runtime.includes('res.points * pointValueRatio'));
  assert.ok(!runtime.includes('実質 約${min.toLocaleString()}円'));
});

test('品質保留記事はタイトル・OGP・構造化データ・記事台帳を保守的表現へ統一する', () => {
  const catalog = JSON.parse(read('blog/articles.json'));
  for (const [file, id] of [
    ['articles/2026-08-17-diamond-valley-festival-guide.html', 'diamond-valley-festival-guide']
  ]) {
    const html = read(file);
    const title = (html.match(/<h1>([^<]+)<\/h1>/) || [])[1];
    assert.ok(title);
    assert.ok(html.includes('content=\"' + title + '\"'));
    assert.ok(html.includes('\"headline\": \"' + title + '\"'));
    const item = catalog.find(entry => entry.id === id);
    assert.equal(item.title, title);
  }
});

test('ゲーム計算機4言語に未定義テンプレート値を残さない', () => {
  for (const file of ['games/fgo/index.html', 'en/games/fgo/index.html', 'ko/games/fgo/index.html', 'tw/games/fgo/index.html']) {
    const html = read(file);
    assert.ok(!html.includes('>undefined<'), file);
    assert.ok(!html.includes('undefined</'), file);
  }
});
