'use strict';

const { GAME_SEO } = require('./game-seo-data.cjs');

// 日本語の計算機と一覧カードで、実際に使える機能を同じ文章で案内する。
const DESCRIPTIONS = {
  genshin: '空月の祝福にするか、創世結晶をまとめて買うか。原神の購入予定額を入れると、貯まるPlayポイントを計算できます。空月の受け取り方や通常チャージとの違いは、購入前の記事で詳しく紹介しています。',
  starrail: '列車補給標章を買うときも、往日の夢華をチャージするときも。スタレの購入予定額から、貯まるPlayポイントを計算できます。補給標章で何がいつ手に入るかも、関連記事で確認できます。',
  zzz: 'インターノット会員にするか、モノクロームをチャージするか。ゼンゼロで使う予定の金額から、貯まるPlayポイントを計算できます。毎日の受け取りと、すぐ使える分の違いも関連記事で紹介しています。',
  bluearchive: '次の募集に向けて、青輝石をどれだけ買うか。ブルアカの購入予定額から、貯まるPlayポイントを計算できます。月額商品と通常チャージで迷ったら、関連記事の選び方も参考にしてください。',
  pokepoke: 'もう少しパックを開けたいとき、ポケゴールドを買うと何ポイント貯まる？購入予定額を入れて計算できます。毎日パックを開けるなら、関連記事でプレミアムパスの受け取り方も紹介しています。',
  umamusume: 'ウマスク・ウマプランの購入額を選んで、貯まるPlayポイントを計算できます。ジュエル購入の金額を直接入れることもできます。月額サービスの特典や受け取り方は、関連記事で詳しく紹介しています。',
  fgo: '聖晶石を何パック買うか、福袋の予算をどうするか。FGOの購入額を選んで、貯まるPlayポイントを計算できます。福袋や確定召喚までの聖晶石・購入額の考え方は、関連記事で詳しく紹介しています。',
  monst: 'オーブを買う前に、今回の課金で何ポイント貯まるかチェック。パックや購入額を選んで計算できます。すぐオーブが欲しいときの商品選びと、Webショップとの比較は、購入前のガイドへ。',
  wutheringwaves: '鳴潮で月相を買うとき、月額商品を選ぶときに。購入予定額から、貯まるPlayポイントを計算できます。欲しい分をすぐ買うか、毎日受け取るかを考えるときにも使ってみてください。',
  gakumas: '欲しいアイドルのために、今回はいくら使う？学マスのジュエル購入予定額からPlayポイントを計算できます。ランクや獲得率を切り替えると、同じ予算で貯まるポイントの違いが分かります。',
  nikke: 'ジュエルをまとめて買うか、パスに予算を回すか。NIKKEで使う予定の金額を入れると、貯まるPlayポイントが分かります。キャンペーンの獲得率も選んで、購入時期を考える材料にできます。',
  dokkan: '龍石を買い足すなら、Playポイントも予算と一緒に。ドッカンのGoogle Play購入額を入れて計算できます。公式Web Storeの特典が気になるときは、関連記事で購入先の違いを紹介しています。',
  arknights: '純正源石をすぐ使いたいか、月パスで毎日受け取りたいか。アークナイツの購入予定額からPlayポイントを計算できます。月パスの内容や限定スカウトの仕組みは、関連記事で詳しく紹介しています。',
  pad: '魔法石を買い足すときも、パズドラパスを続けるときも。購入額から貯まるPlayポイントを計算できます。月額パスは商品欄から、魔法石の購入は実際の金額を入力して使ってください。',
  mementomori: 'ダイヤを買い足す前に、今回の予算で貯まるPlayポイントを見ておきましょう。購入予定額を直接入力するか、予算ボタンで試せます。',
  proseka: 'プロセカでクリスタルやパスを買う前に、貯まるPlayポイントをチェック。Google Playの購入予定額を入れて計算できます。公式WebStoreとどちらで買うか迷ったら、関連記事も読んでみてください。',
  hbr: '欲しいスタイルに向けて、クォーツ購入の予算を決めるときに。Google Playで使う予定の金額から、Playポイントを計算できます。公式WEB SHOPの割引とどちらを選ぶかは、関連記事でも比較しています。',
  phantomparade: '次のガチャに向けた廻珠購入で、Playポイントはどれくらい貯まる？ファンパレの購入予定額を入力すると計算できます。パスや配布分を含めた今回の支払額で試してください。',
  reverse1999: '雨の雫をまとめて買うときも、月額商品を使うときも。リバース：1999の購入予定額からPlayポイントを計算できます。商品の内容と受け取れる時期は、関連記事で紹介しています。',
  honkai3rd: '崩壊3rdでチャージや月パスを買う前に、貯まるPlayポイントをチェック。Google Playの購入予定額を入れて計算できます。公式チャージセンターと購入先を比べるときは、関連記事へ。',
  shadowversewb: '新しいデッキに向けて、カードやパスにいくら使う？シャドバWBの購入予定額からPlayポイントを計算できます。金額を変えて試したいときは、予算ボタンも使ってください。',
  'prospi-a': 'エナジーを買い足すなら、Google Playで貯まるポイントも予算に合わせて計算できます。KONAMIのストア特典が気になるときは、関連記事で購入経路とポイントの違いを整理しています。',
  'pokemon-go': 'レイドやイベント前のポケコイン購入で、何ポイント貯まる？Google Playの購入予定額を入れて計算できます。Webストアのボーナスポケコインと迷ったら、関連記事もどうぞ。',
  efootball: '欲しい選手に向けたコイン購入で、Playポイントも計算できます。Google Playで支払う予定の金額を入力してください。名前が似ているeFootballポイントとの違いは、関連記事で紹介しています。'
};

// 商品価格は既存の確認済み台帳を使う。予算例を商品データへ混ぜない。
function getJapaneseCalculator(game) {
  let packs = [];
  let presets = [];
  let budgets = [];
  if (game.id === 'fgo') {
    packs = GAME_SEO.fgo.packsJa.map(p => ({ name: `聖晶石 有償${p.paid}+無償${p.free}個（計${p.total}個 / ${p.price.toLocaleString('ja-JP')}円）`, tableName: `聖晶石 有償${p.paid}+無償${p.free}個（計${p.total}個）`, price: p.price }));
    // 複数購入の組み合わせは記事で説明し、ここでは支払額の入力ショートカットにする。
    budgets = [GAME_SEO.fgo.luckyBag.cheapestVerifiedSpendFromZero, 10000, GAME_SEO.fgo.pity.cheapestVerifiedSpendFromZero];
  } else if (game.id === 'umamusume') {
    packs = [
      { name: `ウマスク（${GAME_SEO.umamusume.umasuku.price}円）`, tableName: 'ウマスク（月額）', price: GAME_SEO.umamusume.umasuku.price },
      { name: `ウマプラン（${GAME_SEO.umamusume.umaplan.price.toLocaleString('ja-JP')}円）`, tableName: 'ウマプラン（月額・機能系）', price: GAME_SEO.umamusume.umaplan.price }
    ];
    presets = packs.map(p => ({ label: p.name, amount: p.price, mult: 1 }));
  } else if (game.id === 'pad') {
    packs = [{ name: `パズドラパス (月額${GAME_SEO.pad.pass.price}円)`, price: GAME_SEO.pad.pass.price }];
    budgets = [1000, 5000, 10000, 30000];
  } else if (game.id === 'monst') {
    packs = game.packs.ja;
    budgets = game.presets.ja.map(p => p.amount);
  } else if (game.id === 'mementomori') {
    budgets = [1000, 6000, 30000, 150000];
  } else if (game.id === 'shadowversewb') {
    budgets = [1200, 2000, 10000, 50000];
  }
  presets.push(...budgets.map(amount => ({ label: `予算 ${amount.toLocaleString('ja-JP')}円`, amount, mult: 1, kind: 'budget' })));
  return { packs, presets, budgets, mode: packs.length ? 'products' : 'amount', initialAmount: presets[0]?.amount || 0 };
}

module.exports = { DESCRIPTIONS, getJapaneseCalculator };
