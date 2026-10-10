'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const search = require('../js/article-search.js');
const manifest = require('../blog/articles.json').filter(article => article.listed !== false);
const index = require('../blog/article-search-index.json').articles;
// 一覧が実際に使う、台帳と本文索引を結合したレコードで検証する。
const articles = manifest.map(article => ({ ...article, sections: index.find(entry => entry.path === new URL(article.file, 'https://playpoint-sim.com/blog/').pathname)?.sections || [] }));
function hits(query) { return articles.filter(article => search.matches(article, query, 'ja')).sort((a,b) => search.score(b, query, 'ja') - search.score(a, query, 'ja')); }

test('読者の目的を表す自然文を回答に結び、数字の桁を取り違えない', () => {
  for (const [query, id] of [
    ['毎週何がもらえる', 'weekly-reward'], ['課金しないで貯めたい', 'earn-play-points-free'],
    ['ポイントを一番お得に使いたい', 'best-use'], ['ウィークリー', 'weekly-reward'],
    ['1ポイントは何円', 'points-value-1'], ['100ポイントは何円', 'points-value-100']
  ]) assert.equal(hits(query)[0]?.id, id, query);
  assert.equal(search.matches({ title: '100ポイント' }, '1ポイント', 'ja'), false);
  assert.equal(search.matches({ title: '1ポイント' }, '1ポイント', 'ja'), true);
  assert.equal(hits('課金しないで貯めたい 未掲載xyz').length, 0);
});

test('必要額と開催情報は記事以外の回答へも案内する', () => {
  const destinations = require('../blog/article-search-index.json').destinations;
  assert.equal(destinations.length, 4);
  const cases = [['あといくらでゴールド', 'guides/ranks/', 'rank_cost'], ['今週の特典', 'latest/', 'current_benefits'], ['キャンペーンいつ', 'latest/', 'current_benefits']];
  for (const [query, owner, intent] of cases) {
    const matches = destinations.filter(a => search.matches(a, query, 'ja')).sort((a,b) => search.score(b, query, 'ja') - search.score(a, query, 'ja'));
    assert.equal(matches[0]?.path, '/' + owner, query);
    assert.equal(search.intentId(query), intent, query);
  }
  assert.equal(search.intentId('連絡先 personal@example.com'), 'other');
});

test('ポケモンGOの日本語と公式表記から同じ比較記事にたどり着く', () => {
  const expected = hits('Pokémon GO');
  assert.match(expected[0]?.id || '', /pokemon-go/);
  for (const query of ['ポケモンGO', 'Pokemon GO', 'PokémonGO', 'ポケモン GO']) {
    assert.deepEqual(hits(query).map(article => article.id), expected.map(article => article.id), query);
  }
});

test('普段の質問から対象と症状を分け、一般的な回答を先頭にする', () => {
  const cases = [
    ['ポイントが消えた', 'points-disappeared'], ['ポイントがなくなったんだけど', 'points-disappeared'],
    ['ポイントが消えました', 'points-disappeared'], ['失効', 'expiration'], ['ポイントの有効期限はいつ', 'expiration'],
    ['ポイントの期限が切れた', 'expiration'], ['ポイントがいつ付くのか知りたい', 'play-points-reflection-timing'],
    ['ポイントが反映されないのはなぜ', 'play-points-reflection-timing'], ['ぷれいぽいんとがつかない', 'play-points-reflection-timing'],
    ['ポイントが反映されてない', 'play-points-reflection-timing'], ['ポイントがついてない', 'play-points-reflection-timing'],
    ['ポイントがもらえない', 'play-points-reflection-timing'], ['ウィークリーがもらえない', 'weekly-reward-not-showing'],
    ['プレイポイントに登録できない', 'play-points-cannot-join'], ['クーポンが見つからない', 'play-points-coupon-not-applied'],
    ['クーポンが使えません', 'play-points-coupon-not-applied'], ['キャンペーンが出てこない', 'play-points-promotion-not-showing'],
    ['ウィークリーが受け取れない', 'weekly-reward-not-showing'], ['交換したアイテムが届かない', 'redeemed-item-not-received']
  ];
  for (const [query, id] of cases) assert.equal(hits(query)[0]?.id, id, query);
});

test('サービス表記・ゲームの正式名・略称・ひらがな・全角を同じ対象として探す', () => {
  for (const query of ['プレイポイント', 'ぷれいぽいんと', 'Ｐｌａｙ Ｐｏｉｎｔｓ', 'GooglePlayPoints', 'グーグル プレイ ポイント', 'Googleプレイポイント', 'GooglePlay ポイント', 'グーグルプレイ ポイント', 'Google プレイポイント', 'google playポイント', 'グーグル プレイポイント']) {
    assert.equal(hits(query)[0]?.id, 'getting-started', query);
    assert.equal(hits(query).length, articles.length, query);
  }
  const cases = [['ニケの月パスについて教えて', 'nikke-monthly-card-midasbuy-2026'],
    ['にけ 月パス', 'nikke-monthly-card-midasbuy-2026'], ['原神の月パスはいくらですか', 'genshin-welkin-value-2026'],
    ['げんしん 月パス', 'genshin-welkin-value-2026'], ['Honkai Star Rail 月パス', 'starrail-supply-pass-value-2026']];
  for (const [query,id] of cases) assert.equal(hits(query)[0]?.id,id,query);
  // Play Passの横断比較記事もモンストの課金に言及するが、一般的な課金検索では専用記事を最優先する。
  assert.match(hits('モンスターストライク 課金')[0]?.id || '', /monst/);
  assert.ok(hits('モンスターストライク 課金').some(article => article.id === 'diamond-play-pass-break-even-2026'));
  assert.deepEqual(hits('プレイ クレジットが使えない').map(a=>a.id),hits('プレイクレジットが使えない').map(a=>a.id));
  assert.ok(hits('プレイ クレジットが使えない').some(a=>a.id==='play-credit-not-working'));
});

test('既知の長い名前の一文字誤入力を拾い、短い語や未知の条件を推測しない', () => {
  for (const query of ['プレイポインツ', 'プレイポイト', 'プレイポイイント', 'プライポイント', 'プレイポンイト', 'グーグルプレィポイント'])
    assert.equal(hits(query)[0]?.id, 'getting-started', query);
  assert.equal(hits('プレイポインツが消えた')[0]?.id, 'points-disappeared');
  assert.match(hits('モンスターストラィク 課金')[0]?.id || '', /monst/);
  assert.ok(hits('モンスターストラィク 課金').length > 0);
  assert.equal(search.matches({ title:'ニケ' }, 'ニキ', 'ja'), false);
  assert.equal(hits('原神 存在しない条件xyz').length, 0);
  assert.equal(hits('ポイントがない').some(article => article.id === 'getting-started'), false);
});

test('個別条件を一般案内で上書きせず、絞り込みとAND条件を維持する', () => {
  assert.equal(hits('機種変更でポイントが消えた')[0]?.id, 'device-change');
  assert.equal(hits('インストール ポイントが付かない')[0]?.id, 'install-offer-points-not-received');
  assert.match(hits('スーパーチケット 失効')[0]?.id || '', /super-ticket/);
  assert.equal(hits('モンスト 初心者').some(article => article.id === 'getting-started'), false);
  assert.equal(hits('パズドラ ドッカン').length, 0);
  assert.notDeepEqual(search.tokens('ポイントが貯まらない'),search.tokens('ポイントが反映されない'), '獲得条件と反映遅延を一律に同一視しない');
  const utils = require('../blog/utils.js');
  const filtered = utils.filterListedArticles(articles, { search:'ニケ 月パス', gameTitle:'原神' });
  assert.equal(filtered.length, 0);
});

test('ゼロ件時の候補は回答の関連度で並べ、通常検索の追加条件を消さない', () => {
  for (const [query, id] of [['プラチナ 維持費', 'playpoints-rank-maintenance'], ['ポイントがついてこない', 'play-points-reflection-timing'], ['ポイントを現金にしたい', 'play-points-cash-conversion'], ['プリペイド', 'gift-card']]) assert.equal(hits(query)[0]?.id, id, query);
  const cashQuery = 'ポイントを現金にしたい 未掲載xyz';
  assert.equal(hits(cashQuery).length, 0);
  assert.deepEqual(search.suggest(articles, cashQuery, 'ja').map(article => article.id), ['play-points-cash-conversion']);
  const query = 'ポイントが反映されてない 未掲載の条件xyz';
  assert.equal(hits(query).length,0);
  assert.equal(search.suggest(articles,query,'ja')[0]?.id,'play-points-reflection-timing');
  const specific = 'インストール ポイントが反映されてない 未掲載の条件xyz';
  assert.equal(hits(specific).length,0);
  assert.equal(search.suggest(articles,specific,'ja')[0]?.id,'install-offer-points-not-received');
  const gameQuery = 'にけ 月パス 未掲載の条件xyz';
  assert.equal(hits(gameQuery).length,0);
  assert.equal(search.suggest(articles,gameQuery,'ja')[0]?.id,'nikke-monthly-card-midasbuy-2026');
});

test('本文索引の遅延読み込み後にも検索キャッシュを更新し、節へのリンクを返す', () => {
  const article = { title:'Guide', description:'Summary', sections:[] };
  assert.equal(search.matches(article,'げんしん 月パス','ja'),false);
  article.sections = [{ id:'answer', heading:'原神の空月の祝福', text:'毎日受け取る条件を確認します。' }];
  assert.equal(search.matches(article,'げんしん 月パス','ja'),true);
  assert.equal(search.excerpt(article,'げんしん 月パス','ja').id,'answer');
  article.title = 'ニケの30日補給'; article.sections = [];
  assert.equal(search.matches(article,'原神 月パス','ja'),false);
  assert.equal(search.matches(article,'にけ 月パス','ja'),true);
  const terms = search.tokens('ニケ 月パス'); terms.push('不要な変更');
  assert.equal(search.tokens('ニケ 月パス').includes('不要な変更'),false);
});

test('空入力は全件、未知語・記号だけ・過長入力は誤って全件に一致しない', () => {
  assert.equal(hits('').length, articles.length);
  for (const query of ['？！？', 'あ'.repeat(257), '原神 ' + 'x'.repeat(300), '<script>alert(1)</script>', '😀😀😀😀'])
    assert.equal(hits(query).length,0,query.slice(0,40));
  assert.ok(hits('ない').length < articles.length, '否定だけの入力を空の検索として扱わない');
  const tooMany = Array.from({length:13},(_,i) => 'word'+i).join(' ');
  assert.equal(search.matches({ title:tooMany },tooMany,'ja'),false);
});
