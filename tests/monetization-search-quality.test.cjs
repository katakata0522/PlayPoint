'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const SLOT = '8250492620';
const { openingTags } = require('./helpers/markup-contract.cjs');

test("記事・LP・ゲームの管理広告は有効な広告ユニットIDを持つ", () => {
  for (const targetFile of ['articles/2025-12-25-campaign.html', 'status/gold/index.html', 'games/fgo/index.html', 'en/games/fgo/index.html']) {
    const ads = openingTags(read(targetFile)).filter(tag => tag.tag === 'ins' && (tag.attrs.class || '').split(/\s+/).includes('adsbygoogle'));
    assert.ok(ads.length > 0, targetFile + ': 広告要素がない');
    for (const ad of ads) assert.equal(ad.attrs['data-ad-slot'], SLOT, targetFile);
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
  assert.ok(item.modified >= '2026-10-03');
  assert.equal(item.modified, html.match(/name="last-modified" content="([^"]+)"/)[1]);
  assert.match(html, /開催終了・記録/);
  assert.ok(html.includes('href="/latest/"'));
});

// 実entrypointを隔離I/Oで実行し、生成された広告要素だけを確認する。
function generatedFiles(script, initial={}) {
  const files = new Map(Object.entries(initial).map(([file,content])=>[path.resolve(root,file),content]));
  const writes = new Map();
  const io = {
    existsSync(file){return files.has(path.resolve(file));},
    mkdirSync(){},
    readdirSync(dir){return [...files.keys()].filter(file=>path.dirname(file)===path.resolve(dir)).map(file=>path.basename(file));},
    readFileSync(file){const key=path.resolve(file);assert.ok(files.has(key),'fixture read: '+key);return files.get(key);},
    writeFileSync(file,content){
      const key=path.resolve(file);assert.ok(key.startsWith(root+path.sep),'生成がroot外へ書く');
      files.set(key,String(content));writes.set(path.relative(root,key).replaceAll('\\','/'),String(content));
    }
  };
  vm.runInNewContext(read(script),{__dirname:path.join(root,'scripts'),require(id){
    if(id==='fs')return io;if(id==='path')return path;
    // 操作モデルと紹介文はI/Oを持たない。生成先の隔離は維持する。
    if(id==='./game-calculator-presentation.cjs')return require('../scripts/game-calculator-presentation.cjs');
    throw Error('Unexpected dependency '+id);
  },console:{log(){}}},{filename:script,timeout:5000});
  return writes;
}
let gameOutputs;
function generatedGames(){return gameOutputs ||= generatedFiles('scripts/generate-game-simulators.cjs',{'blog/articles.json':read('blog/articles.json')});}

test('全24ゲームで特別商品の出典と価格の確認状態を計算前に案内する', () => {
  const { SPECIAL_OFFERS } = require('../scripts/game-special-offers.cjs');
  const { getJapaneseCalculator } = require('../scripts/game-calculator-presentation.cjs');
  const ids = Object.keys(SPECIAL_OFFERS);
  assert.equal(ids.length, 24);
  for (const id of ids) {
    const file = `games/${id}/index.html`;
    for (const html of [generatedGames().get(file), read(file)].filter(Boolean)) {
      assert.ok(html.indexOf('class="game-offers"') >= 0, file);
      assert.ok(html.indexOf('class="game-offers"') < html.indexOf('id="game-calculator"'), file);
      const sourceLinks = openingTags(html).filter(tag => tag.attrs.class === 'game-offer-source');
      assert.ok(sourceLinks.length, file);
      for (const link of sourceLinks) assert.equal(new URL(link.attrs.href).protocol, 'https:', file);
    }
    const offers = getJapaneseCalculator({ id, presets: { ja: [] } }).offers;
    for (const offer of offers.items) {
      assert.ok(offer.name && offer.detail && offer.source.url, `${id}/${offer.id}`);
      if (!offer.productId) assert.equal(offer.price, undefined, '未確認・別ストア価格を計算へ入れない');
    }
  }
  assert.match(read('games/mementomori/index.html'), /盟約特権（1週間）/);
  assert.match(read('games/mementomori/index.html'), /盟約特権（1か月）/);
  assert.match(read('games/efootball/index.html'), /従来のマッチパスはv5.0.0でキャンペーンハブへ変更済み/);
});

test('初回生成で商品と予算を区別し、商品がない操作欄は出さない', () => {
  const output = generatedGames();
  const pad = output.get('games/pad/index.html');
  const productSelect = pad.match(/<select id="sim-pack-select">([\s\S]*?)<\/select>/)[1];
  const values = openingTags(productSelect).filter(node => node.tag === 'option').map(node => node.attrs.value);
  assert.deepEqual(values, ['980', 'custom']);
  assert.match(pad, /data-table-kind="products"/);
  assert.match(pad, /data-table-kind="budgets"/);
  assert.match(pad, /商品価格ではなく/);
  for (const slug of ['genshin', 'bluearchive', 'mementomori', 'shadowversewb']) {
    const html = output.get(`games/${slug}/index.html`);
    assert.match(html, /data-input-mode="amount"/);
    assert.doesNotMatch(html, /id="sim-pack-select"|id="sim-pack-count"|data-table-kind="products"/);
    if (['genshin', 'bluearchive'].includes(slug)) assert.doesNotMatch(html, /preset-heading|pack-table/);
  }
  const memento = output.get('games/mementomori/index.html');
  assert.match(memento, /data-amount="30000"[^>]*>予算 30,000円/);
  assert.doesNotMatch(memento, /ピックアップ天井 100連|LR進化目安/);
});
function assertAdUnits(html,label) {
  const units=openingTags(html).filter(node=>node.tag==='ins' && (node.attrs.class||'').split(/\s+/).includes('adsbygoogle'));
  assert.ok(units.length>0,label+': 広告要素がない');
  for(const unit of units)assert.equal(unit.attrs['data-ad-slot'],SLOT,label);
}
test('実広告生成の出力は記事・LP・4言語ゲームの有効なslotを保持する', () => {
  const article=generatedFiles('scripts/insert-article-ads.cjs',{'articles/fixture.html':'<article>Preserved body</article>'});
  assertAdUnits(article.get('articles/fixture.html'),'記事生成');
  const {normalizeLpContent} = require('../scripts/insert-lp-monetization.cjs');
  assertAdUnits(normalizeLpContent('<main>Preserved body</main>'),'LP生成');
  const outputs=[...generatedGames()].filter(([file])=>!/(^|\/)games\/index.html$/.test(file));
  assert.ok(outputs.length>0);
  for(const [file,html] of outputs)assertAdUnits(html,file);
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

function assertNoMissingTemplateValues(html,label) {
  const missing=/\b(?:undefined|NaN)\b|\$\{[^}]*\}/;
  const tokens=/<!--[\s\S]*?(?:-->|$)|<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1(?=[\s/>])[^>]*>|$)|<\/?[a-z][\w:-]*\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  let cursor=0;
  for (const token of html.matchAll(tokens)) {
    assert.doesNotMatch(html.slice(cursor,token.index),missing,label+': 表示値が未定義');
    if (!token[1]) for(const node of openingTags(token[0]))for(const value of Object.values(node.attrs))
      assert.doesNotMatch(value,missing,label+': 属性値が未定義');
    cursor=token.index+token[0].length;
  }
  assert.doesNotMatch(html.slice(cursor),missing,label+': 表示値が未定義');
}
test('全ゲームの生成出力と公開4言語ページに未定義テンプレート値を残さない', () => {
  const {getGamePageHtmlFiles}=require('../scripts/game-page-targets.cjs');
  const files=getGamePageHtmlFiles(root);
  assert.ok(files.length>0);
  for(const file of files)assertNoMissingTemplateValues(read(file),file);
  assert.ok(generatedGames().size>0);
  for(const [file,html] of generatedGames())assertNoMissingTemplateValues(html,file);
  for(const bad of ['<p>value: undefined result</p>','<a href="/games/undefined/">Guide</a>','<p>NaN points</p>','<p>\$'+'{missing}</p>'])
    assert.throws(()=>assertNoMissingTemplateValues(bad,'欠損fixture'));
  assertNoMissingTemplateValues('<script>let undefinedValue;</script><!-- undefined --> <p>Valid</p>','非表示のコード');
  assertNoMissingTemplateValues('<script>undefined</script\t\n bar><p>Valid</p>','終了タグ属性');
});
