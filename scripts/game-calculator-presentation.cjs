'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 日本語の計算機と一覧カードで、実際に使える機能を同じ文章で案内する。
const DESCRIPTIONS = {
  genshin: '空月の祝福にするか、創世結晶をまとめて買うか。原神の購入予定額を入れると、貯まるPlayポイントを計算できます。空月の受け取り方や通常チャージとの違いは、購入前の記事で詳しく紹介しています。',
  starrail: '列車補給標章を買うときも、往日の夢華をチャージするときも。スタレの購入予定額から、貯まるPlayポイントを計算できます。補給標章で何がいつ手に入るかも、関連記事で確認できます。',
  zzz: 'インターノット会員にするか、モノクロームをチャージするか。ゼンゼロで使う予定の金額から、貯まるPlayポイントを計算できます。毎日の受け取りと、すぐ使える分の違いも関連記事で紹介しています。',
  bluearchive: 'ブルアカで青輝石を買う前に、今回の予算で何ポイント貯まるか見てみましょう。購入予定額とランクを入れて計算できます。月額商品と通常チャージの選び方は、関連記事へ。',
  pokepoke: 'ポケゴールドを買う前に、Playポイントもチェック。ポケポケの購入予定額から、貯まるポイントを計算できます。プレミアムパスとの違いや選び方は、関連記事で紹介しています。',
  umamusume: 'ウマスク・ウマプランの購入額を選んで、貯まるPlayポイントを計算できます。ジュエル購入の金額を直接入れることもできます。月額サービスの特典や受け取り方は、関連記事で詳しく紹介しています。',
  fgo: '聖晶石を何パック買うか、福袋の予算をどうするか。FGOの購入額を選んで、貯まるPlayポイントを計算できます。福袋や確定召喚までの聖晶石・購入額の考え方は、関連記事で詳しく紹介しています。',
  monst: 'オーブを買う前に、今回の課金で何ポイント貯まるかチェック。パックや購入額を選んで計算できます。すぐオーブが欲しいときの商品選びと、Webショップとの比較は、購入前のガイドへ。',
  wutheringwaves: '鳴潮で月相を買うとき、月額商品を選ぶときに。購入予定額から、貯まるPlayポイントを計算できます。欲しい分をすぐ買うか、毎日受け取るかを考えるときにも使ってみてください。',
  gakumas: '学マスでジュエルを買う前に、今回の予算で何ポイント貯まるか計算してみましょう。Google Playの購入予定額を入力するだけで、ランクやキャンペーンによる違いを見られます。',
  nikke: 'ジュエルやパスを買う前に、今回の予算で貯まるPlayポイントをチェック。NIKKEの購入予定額を入れて計算できます。通常時とキャンペーン中を比べて、購入のタイミングを考えてみましょう。',
  dokkan: 'ドッカンバトルで龍石を買う前に、貯まるPlayポイントを計算してみましょう。購入予定額を入れて、ランクやキャンペーンを切り替えると、同じ金額でどれだけポイントが変わるか分かります。',
  arknights: 'アークナイツで純正源石や月パスを買う前に、今回の購入で貯まるPlayポイントをチェック。購入予定額を入力して、通常時とキャンペーン中のポイントを比べられます。',
  pad: 'パズドラの魔法石購入やパズドラパスで、何ポイント貯まるか計算できます。パスや試したい金額を選ぶか、今回の購入額を直接入力してみてください。',
  mementomori: 'メメントモリでダイヤを買う前に、Playポイントも計算してみましょう。パックや試したい金額を選んで、通常時とキャンペーン中のポイントを比べられます。',
  proseka: 'プロセカでクリスタルやパスを買う前に、貯まるPlayポイントをチェック。Google Playの購入予定額を入れて計算できます。公式WebStoreとどちらで買うか迷ったら、関連記事も読んでみてください。',
  hbr: 'ヘブバンでクォーツを買う前に、今回の予算で貯まるPlayポイントを見てみましょう。購入予定額とランクを入れて、通常時とキャンペーン中のポイントを比べられます。',
  phantomparade: 'ファンパレで廻珠を買う前に、貯まるPlayポイントをチェック。購入予定額を入れると計算できます。通常時とキャンペーン中を切り替えて、今回の予算でどれだけ違うか比べてみましょう。',
  reverse1999: 'リバース：1999で雨の雫や月額商品を買う前に、Playポイントも計算してみましょう。購入予定額を入力して、ランクやキャンペーンによるポイントの違いを比べられます。',
  honkai3rd: '崩壊3rdでチャージや月パスを買う前に、貯まるPlayポイントをチェック。Google Playの購入予定額を入れて計算できます。公式チャージセンターと購入先を比べるときは、関連記事へ。',
  shadowversewb: 'シャドバWBでクリスタルやパスを買う前に、貯まるPlayポイントを計算できます。パックや試したい金額を選んで、カード購入に使う予算とポイントを一緒に見てみましょう。',
  'prospi-a': 'プロスピAでエナジーを買う前に、今回の予算で貯まるPlayポイントをチェック。Google Playの購入予定額を入れて計算できます。KONAMIのストアとの購入経路の違いは、関連記事で紹介しています。',
  'pokemon-go': 'Pokémon GOでポケコインを買う前に、貯まるPlayポイントを計算してみましょう。Google Playの購入予定額を入力して使えます。Webストアの特典と比べたいときは、関連記事へ。',
  efootball: 'eFootballコインを買う前に、今回の購入で貯まるPlayポイントをチェック。Google Playの購入予定額から計算できます。eFootballポイントとの違いや購入経路は、関連記事で紹介しています。'
};

function syncGameCalculatorPresentation(rootDir) {
  const files = ['games/index.html', ...Object.keys(DESCRIPTIONS).map(slug => `games/${slug}/index.html`)];
  let changed = 0;
  for (const file of files) {
    const absolute = path.join(rootDir, file);
    let html = fs.readFileSync(absolute, 'utf8');
    const before = html;
    const slug = file.split('/')[1];
    const description = DESCRIPTIONS[slug];
    if (description) {
      // 生成済みの本文・検索・共有説明を一緒に更新し、古い機能紹介を残さない。
      const lead = html.match(/(<header class="game-header">[\s\S]*?<\/header>\s*<p>)([\s\S]*?)(<\/p>)/);
      if (!lead) throw new Error(`${file}: ゲーム紹介文が見つかりません`);
      html = html.replaceAll(lead[2], description);
      const select = html.match(/<select id="sim-pack-select">([\s\S]*?)<\/select>/);
      const amountOnly = select && !/<option value="(?!custom)[^"]+"/.test(select[1]);
      if (amountOnly) {
        html = html.replace(/\s*<p class="preset-heading">[\s\S]*?<div class="preset-buttons">[\s\S]*?<\/div>/, '');
        for (const id of ['sim-pack-select', 'sim-pack-count']) {
          const field = new RegExp(`\\s*<div class="input-field">\\s*<label for="${id}">[\\s\\S]*?<\\/div>`);
          html = html.replace(field, '');
        }
        html = html.replace('<form id="game-sim-form">', '<p class="game-sim-lead">Google Play購入画面の金額を入力。ランクやキャンペーンを切り替えて、貯まるポイントを比べてみましょう。</p>\n              <form id="game-sim-form" data-input-mode="amount">');
        // 空の表だけを外す。直後の既存広告枠とスロットは保持する。
        html = html.replace(/<!-- パック早見表 -->\s*<section class="section">\s*<h2>[^<]*<\/h2>\s*<div class="pack-table-wrap"[\s\S]*?<\/table>\s*<\/div>/, '<section class="section game-ad-section">');
        html = html.replace(/<p class="game-meta">[\s\S]*?<\/p>/, '<p class="game-meta">Google Playでの購入額からPlayポイントを計算</p>');
      } else {
        html = html.replace('▼ 目標プリセット：', 'よく使う購入額：');
        html = html.replace('課金パックを選択：', '商品・試算額を選ぶ：');
      }
    }
    html = html.replace(/<a class="game-portal-card" href="(?:\.\/|\.\.\/)([^/]+)\/">[\s\S]*?<\/a>/g, (card, game) => DESCRIPTIONS[game]
      ? card.replace(/(<p class="game-card-desc">)[\s\S]*?(<\/p>)/, `$1${DESCRIPTIONS[game]}$2`) : card);
    if (html !== before) {
      fs.writeFileSync(absolute, html, 'utf8');
      changed++;
    }
  }
  return { checked: files.length, changed };
}

module.exports = { syncGameCalculatorPresentation };
