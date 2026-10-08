'use strict';

const { read, writeIfChanged, replaceDescriptionsAcrossGamePages, createGuideShell, createRequiredEdits } = require('./game-seo-common.cjs');
const { insertBeforeRequired } = createRequiredEdits('game-seo-wave3');

const {
  VERIFIED_AT,
  GOOGLE_PLAY_JP_LEVELS,
  SOURCES,
  GAME_SEO,
  roundedPointsForYen
} = require('./game-seo-data.cjs');

function pointTableHtml(amount) {
  const eligibleAmount = amount / 1.1;
  const rows = GOOGLE_PLAY_JP_LEVELS.map(level => `<tr><td>${level.label}</td><td>${level.rate}pt / 100円</td><td>約 ${roundedPointsForYen(eligibleAmount, level.rate).toLocaleString('ja-JP')}pt</td></tr>`).join('\n');
  return `<div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>Play Pointsステータス</th><th>通常獲得率</th><th>${Number(amount).toLocaleString('ja-JP')}円購入時</th></tr></thead><tbody>${rows}</tbody></table></div><p>税込価格に消費税10%が含まれると仮定し、税抜換算額から計算した概算です。複数の商品を買う場合は商品ごとに丸められるため、合計額からの試算とは差が出ます。実際の税額・対象額と獲得予定ポイントはGoogle Playの購入画面で確認してください。</p>`;
}

const guideShell = createGuideShell({
  verifiedAt: VERIFIED_AT,
  badge: '🔎 公式情報を基準に検証',
  verificationPolicy: '価格・定額商品・ガチャ仕様は変更されることがあります。公開一次情報で確認できないGoogle Play価格は推測で補わず、購入直前のゲーム内表示とGoogle Playの獲得予定ポイント表示を購入前に確認してください。'
});

function syncParentGuide(rootDir, config) {
  const file = config.file;
  let html = read(rootDir, file);
  if (config.descriptionBefore && config.descriptionAfter) html = html.replaceAll(config.descriptionBefore, config.descriptionAfter);
  for (const [before, after] of config.replacements || []) html = html.replaceAll(before, after);
  if (config.guideBlock) html = insertBeforeRequired(html, '<section class="section game-source-section">', config.guideBlock, config.guideMarker, `${file} guide block`);
  return writeIfChanged(rootDir, file, html);
}

function renderPokepokeGuide() {
  const body = `
    <section class="section"><h2>プレミアムパスは月額型、初回無料体験は14日</h2><p>ポケポケ公式サポートでは、プレミアムパスは<strong>1か月単位の定期購入</strong>として案内され、初めて利用するプラットフォームアカウントでは<strong>14日間の無料体験</strong>が利用できます。Google Playでは選択したGoogleアカウントに購入権利が結びつくため、複数アカウント利用時は購入先の確認が重要です。</p></section>
    <section class="section"><h2>現行月額・ポケゴールド価格は購入画面で確認する</h2><p>公式サポートの公開ページでは、プレミアムパスの現行日本円月額や各ポケゴールド商品の現在価格を固定表示していません。月額と更新日、ポケゴールドの個数を購入直前に確認し、Google Play画面の支払額からPlay Pointsを計算してください。無料体験の終了後は有料で更新されるため、解約期限も確認します。</p></section>
    <section class="section"><h2>Play Pointsで見るときの注意点</h2><p>無料体験中は支払いが発生しないため、その時点の購入額からPlay Pointsを見積もる対象にはしません。有料更新やポケゴールド購入をGoogle Play上で行う場合は、購入確認画面に表示される支払額と獲得予定ポイントを優先してください。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.pokepokePremiumPass}" target="_blank" rel="noopener noreferrer">ポケポケ公式サポート：プレミアムパス</a></li><li><a href="${SOURCES.pokepokePremiumMechanics}" target="_blank" rel="noopener noreferrer">Pokémon Support：購入・Premium Pass FAQ</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ポケポケ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'pokepoke', slug: 'premium-pass-guide', pageDescription: 'Pokémon TCG Pocketのプレミアムパスを、1か月の定期購入、14日無料体験、Googleアカウントとの紐付け、Play Pointsの確認方法から整理します。', lead: 'プレミアムパスは「月額いくら」だけでなく、無料体験、更新、購入アカウント、Play Points対象の支払いタイミングを分けて考える必要があります。', body, faq: [
    { q: 'ポケポケのプレミアムパス無料体験は何日ですか？', a: '公式サポートでは、初回の無料体験は14日間です。利用条件はプラットフォームアカウント単位で確認してください。' },
    { q: 'プレミアムパスの現行価格はいくらですか？', a: '公開公式サポートでは現行の日本円価格を固定表示していないため、PlayPointでは購入時のGoogle Play画面に表示された価格を正本とします。' }
  ] });
}

function renderPadGuide() {
  const pass = GAME_SEO.pad.pass;
  const body = `
    <section class="section"><h2>パズドラパスは月額980円の自動更新サービス</h2><p>パズドラ公式は、パズドラパスを<strong>月額980円</strong>・1か月単位の自動更新サービスとして案内しています。Android版ではGoogle Playの定期購入として管理され、初回は<strong>1週間の無料トライアル</strong>があります。</p></section>
    <section class="section"><h2>毎日ダンジョン以外の常設メリットもある</h2><p>公式ページでは、専用の毎日ダンジョンに加え、チーム枠+5、獲得ランク経験値5%アップ、対象ダンジョンの常時解放、専用バッジなどが案内されています。イベントによってはクエスト報酬の追加特典もあります。</p></section>
    <section class="section"><h2>980円をGoogle Playで支払ったときのPlay Points目安</h2>${pointTableHtml(pass.price)}<p>無料トライアル期間中は支払いが発生しないため、その期間の利用自体を980円購入として数えません。有料更新時はGoogle Playの購入確認画面に表示される獲得予定ポイントを優先してください。</p></section>
    <section class="section"><h2>誰に向く？</h2><p>毎日ログインして専用ダンジョンや常設特典を継続的に使う人ほど価値を取りやすい商品です。反対に、特典を使う頻度が低い場合は「980円で何個の魔法石」という単純比較では判断できません。Play Pointsも含め、継続利用する機能の価値を分けて考えるのが安全です。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.padPass}" target="_blank" rel="noopener noreferrer">パズドラ公式：パズドラパス</a></li><li><a href="${SOURCES.padPassFaq}" target="_blank" rel="noopener noreferrer">パズドラ公式：パズドラパスFAQ</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">パズドラ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'pad', slug: 'pad-pass-value', pageDescription: 'パズドラパスの月額980円、1週間無料トライアル、毎日ダンジョン、チーム枠、ランク経験値などの公式特典とGoogle Play Pointsを整理します。', lead: 'パズドラパスは魔法石だけで価値を測る商品ではありません。月額、無料体験、毎日・常設特典、Play Pointsを分けて確認します。', body, faq: [
    { q: 'パズドラパスはいくらですか？', a: '公式案内では月額980円の自動更新サービスです。AndroidではGoogle Playの定期購入として管理されます。' },
    { q: '無料トライアルはありますか？', a: '公式案内では初回1週間の無料トライアルがあります。適用条件は購入時の表示を確認してください。' }
  ] });
}

function renderArknightsGuide() {
  const body = `
    <section class="section"><h2>月パスの中身は公式確認できる</h2><p>アークナイツ公式サポートでは、月パス購入時に<strong>有償純正源石6個</strong>を受け取り、その後30日間、毎日<strong>合成玉200個 + 理性回復剤1個</strong>を受け取る仕様が案内されています。</p></section>
    <section class="section"><h2>月パスと源石パックの価格を購入前に確認する</h2><p>月パスは毎日の受け取り、源石パックは購入直後に使える個数を比べてください。現在の日本Google Play価格は購入画面で確認し、表示された支払額からPlay Pointsを計算します。</p></section>
    <section class="section"><h2>リミテッドスカウトの「300回」は現金9万円ではない</h2><p>2026年の公式リミテッドスカウトでも、1回のスカウトにつきリミテッドスカウト契約証を1枚獲得し、<strong>300回スカウト時の追加限定オペレーター</strong>が案内されています。ただし、合成玉・スカウト券・無料分・所持資源があるため、「300回=9万円」のような固定現金額にはしません。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.arknightsMonthlyPass}" target="_blank" rel="noopener noreferrer">アークナイツ公式サポート：月パス内容</a></li><li><a href="${SOURCES.arknightsLimited2026}" target="_blank" rel="noopener noreferrer">アークナイツ公式：2026年リミテッドスカウト</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">アークナイツ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'arknights', slug: 'monthly-pass-limited-scout', pageDescription: 'アークナイツの月パス内容と限定スカウト300回の仕様を公式情報で整理。Google Play価格を推測せず、Play Pointsとの関係も分けて解説します。', lead: '月パスの「中身」とリミテッド300回の「仕組み」は公式確認できますが、現行Google Play価格は別問題です。確定情報と未確定情報を分けて整理します。', body, faq: [
    { q: 'アークナイツの月パスでは何を受け取れますか？', a: '公式サポートでは、購入時に有償純正源石6個、その後30日間毎日、合成玉200個と理性回復剤1個を受け取る仕様です。' },
    { q: '限定300連はいくらですか？', a: '所持合成玉、スカウト券、無料分などで現金負担が変わるため、PlayPointでは固定の円額を断定しません。' }
  ] });
}

function renderDokkanGuide() {
  const body = `
    <section class="section answer-box" data-editorial-flow="2026-10"><h2>同じ金額の龍石数と、使う予定の特典で選ぶ</h2><p>今すぐ龍石を多く受け取りたいなら、まずGoogle Playと公式Web Storeで同じ支払額の個数を比べます。Play Pointsやクーポンを使いたいなら、Google Play側の条件も確認します。公式Web StoreはGoogle Play決済とは別の購入経路です。</p><p><span class="marker-yellow">Web Storeの購入に、Google Play Pointsは加算しません。</span> 商品の増量・割引と、ポイントの使い道を別に評価すると、購入先を選びやすくなります。</p><p class="reader-source">出典：<a href="${SOURCES.dokkanWebStoreUsage}" target="_blank" rel="noopener noreferrer">バンダイナムコ公式FAQ：Web Store購入</a> ／ <a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Playの獲得条件</a></p></section>
    <section class="section reader-comparison"><h2>1,000円で100個と110個なら、どう比べる？</h2><p>以下は<strong>比較方法を説明する仮の例</strong>です。現在販売されている商品の価格・個数ではありません。</p><div class="pack-table-wrap"><table class="pack-table"><caption>同じ支払額で比較する例</caption><thead><tr><th scope="col">購入先</th><th scope="col">支払額</th><th scope="col">龍石</th><th scope="col">1個あたり</th><th scope="col">Play Points</th></tr></thead><tbody><tr><th scope="row">Google Play</th><td>1,000円</td><td>100個</td><td>10円</td><td>対象購入なら獲得予定数を確認</td></tr><tr><th scope="row">公式Web Store</th><td>1,000円</td><td>110個</td><td>約9.09円</td><td>加算しない</td></tr></tbody></table></div><p>この例なら、龍石だけではWebが10個多くなります。ただしGoogle Playに使う予定の割引クーポンがあるなら、割引後の支払額で比較し直します。Playポイントを龍石1個と同じものとして足すことはできません。</p><p>現在の商品価格は購入画面を確認してください。初回・回数限定・販売期間などの条件も揃えて比べます。</p></section>
    <section class="section"><h2>デイリー商品は、ガチャ終了までに受け取れる分で</h2><p>購入時に受け取る龍石と、毎日受け取る龍石は使える時期が違います。合計が多くても、欲しいガチャの終了後に届く分は、そのガチャの不足分には含めません。</p><p>商品そのものの選び方やコインの違いは、<a href="/articles/2026-08-25-dokkan-battle-dragon-ball-play-points.html">詳しくはこちら</a>で整理しています。ここでは購入先の比較を先に進めましょう。</p></section>
    <section class="section"><h2>Web Storeで買った龍石はどこに反映される？</h2><p>公式FAQでは、Web Storeでの購入後にアプリのホーム画面へ戻ると反映されると案内しています。<strong>龍石はプレゼントBOXではなく、所持数へ直接加算</strong>されます。アイテムはプレゼントBOXへの反映です。</p><p>アプリ内の「履歴」→「アプリ外購入受け取り履歴」で、過去3か月分の情報を確認できます。見つからないときは、受取場所と履歴を確認してから問い合わせると整理しやすくなります。</p><p class="reader-source">出典：<a href="${SOURCES.dokkanWebStoreReflection}" target="_blank" rel="noopener noreferrer">バンダイナムコ公式FAQ：反映先と受け取り履歴</a></p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.dokkanWebStoreUsage}" target="_blank" rel="noopener noreferrer">バンダイナムコ公式FAQ：Web Store購入</a></li><li><a href="${SOURCES.dokkanWebStoreReflection}" target="_blank" rel="noopener noreferrer">バンダイナムコ公式FAQ：Web Store反映</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ドッカンバトル Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'dokkan', slug: 'google-play-vs-webstore', lead: 'ドッカンバトルではGoogle Playと公式Web Storeが別の購入経路です。龍石の個数だけでなく、Play Points対象かどうかも分けて比較します。', body, faq: [
    { q: 'ドッカンのWeb Store購入でもGoogle Play Pointsは貯まりますか？', a: 'Web StoreはGoogle Play上の購入ではないため、Google Play Pointsの獲得を前提にしません。Google Play PointsはGoogle Play上の対象購入で確認してください。' },
    { q: 'ドッカンの龍石価格は固定ですか？', a: '通常商品やセールは時期で変わるため、PlayPointでは公開一次情報で現行値を固定できない価格を推測掲載しません。' }
  ] });
}

function syncPad(rootDir) {
  const file = 'games/pad/index.html';
  let html = read(rootDir, file);
  html = html.replace(/<p class="game-meta">[^<]*<\/p>/, `<p class="game-meta">パズドラパス・Google Play Points確認：${VERIFIED_AT} ｜ 月額980円（公式確認）</p>`);
  const block = `<section class="section" data-game-seo-guide="pad"><h2>月額980円のパズドラパスを公式条件で確認</h2><p>AndroidではGoogle Playの定期購入として管理され、初回1週間無料トライアルがあります。毎日ダンジョンだけでなく、チーム枠+5・ランク経験値5%アップなどの常設特典も含めて比較できます。</p><p><a href="./pad-pass-value/">パズドラパス980円の特典とPlay Pointsを詳しく見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="pad"', 'PAD guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncWave3(rootDir) {
  const changedFiles = [];

  const configs = [
    {
      file: 'games/pokepoke/index.html',
      descriptionBefore: 'ポケポケ（Pokémon TCG Pocket）のポケゴールド購入、プレミアムパス、パック開封で貯まるGoogle Play Pointsを即時計算！パック別還元早見表やポイント使い道も確認できます。課金前のシミュレーションにぜひ役立ててみてくださいね。',
      descriptionAfter: 'ポケポケのGoogle Play課金予定額からPlay Pointsを計算。プレミアムパスは月額定期購入・初回14日無料体験を公式確認し、現行価格は購入画面で確認します。',
      replacements: [['はい。Android端末から購入するとPlay Pointsが貯まります。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。購入前のGoogle Play画面に表示される獲得予定ポイントを確認してください。']],
      guideBlock: `<section class="section" data-game-seo-guide="pokepoke"><h2>プレミアムパスの無料体験・更新・Play Pointsを分離</h2><p>公式サポートで1か月の定期購入、初回14日無料体験、Googleアカウントとの紐付けを確認しています。現行価格は推測せず購入画面で確認します。</p><p><a href="./premium-pass-guide/">プレミアムパスの課金ルールを詳しく見る ➔</a></p></section>`, guideMarker: 'data-game-seo-guide="pokepoke"'
    },
    {
      file: 'games/arknights/index.html',
      descriptionBefore: 'アークナイツの純正源石購入、月パス、月間スカウトパック、300連天井・潜在MAX課金で貯まるGoogle Play Pointsを即時計算！パック別還元早見表やポイント使い道も確認できます。人材発掘前の計画にぜひ使ってみてくださいね。',
      descriptionAfter: 'アークナイツのGoogle Play課金予定額からPlay Pointsを計算。月パス内容と限定300回の仕様は公式確認し、現行商品価格は購入画面で確認します。',
      replacements: [
        ['アークナイツの限定フェス天井（300連）で何ポイント貯まりますか？', 'アークナイツの限定300回分に必要な現金額は固定ですか？'],
        ['300連（約9万円）課金した場合、通常時（1pt/100円）で約900pt、特別獲得率5pt/100円時なら約4,500pt（プラチナランク到達）還元されます。', 'いいえ。所持合成玉・スカウト券・無料分などで現金負担が変わるため、固定9万円とは扱いません。Google Playで実際に支払う金額からPlay Pointsを確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="arknights"><h2>月パス内容と限定300回を、価格と分けて確認</h2><p>月パスの有償純正源石6個・30日間の合成玉200個/日など、仕様は公式確認できます。現行Google Play価格は固定せず、限定300回も現金9万円と断定しません。</p><p><a href="./monthly-pass-limited-scout/">月パスと限定300回の確認結果を見る ➔</a></p></section>`, guideMarker: 'data-game-seo-guide="arknights"'
    },
    {
      file: 'games/dokkan/index.html',
      descriptionBefore: 'ドラゴンボールZ ドッカンバトルの龍石購入、デイリーカプセル、フェスコイン交換・虹凸課金で貯まるPlayポイントをパッと計算！パック別還元早見表や使い道も比較できます。ガシャ前のシミュレーションにぜひ役立ててみてくださいね。',
      descriptionAfter: 'ドッカンバトルのGoogle Play課金予定額からPlay Pointsを計算。公式Web Storeは別決済として分離し、変動する龍石・セール価格は購入画面で確認します。',
      replacements: [['はい。龍石パックやデイリーカプセルの購入時にPlay Pointsが付与されます。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。公式Web StoreはGoogle Play決済と分けて確認してください。']],
      guideBlock: `<section class="section" data-game-seo-guide="dokkan"><h2>Google Playと公式Web Storeを別軸で比較</h2><p>Web Storeは公式の購入経路ですがGoogle Play決済ではありません。変動する龍石価格を固定せず、Play Points対象経路と商品内容を分けて判断します。</p><p><a href="./google-play-vs-webstore/">Google PlayとWeb Storeの違いを見る ➔</a></p></section>`, guideMarker: 'data-game-seo-guide="dokkan"'
    },
    {
      file: 'games/wutheringwaves/index.html',
      descriptionBefore: '鳴潮（Wuthering Waves）の月相購入、月相観測パス、先駆ラジオ、80連/160連天井ガチャで貯まるPlayポイントを即時計算！パック別還元早見表やお得な使い道も比較できます。集音前のポイント確認にぜひ使ってみてくださいね。',
      descriptionAfter: '鳴潮のGoogle Play課金予定額からPlay Pointsを計算。現行商品価格や天井の現金額を推測で固定せず、購入画面の実際の支払額から確認できます。',
      replacements: [
        ['鳴潮の確定天井（160連）で何ポイント貯まりますか？', '鳴潮の160連分に必要な現金額は固定ですか？'],
        ['160連（約4.8万円）課金した場合、通常時（1pt/100円）で約480pt、特別獲得率5pt/100円時なら約2,400pt（ゴールドランク到達）還元されます。', 'いいえ。所持通貨・配布・チケット・販売中の商品構成で実負担が変わるため、固定4.8万円とは扱いません。Google Playで実際に支払う金額からPlay Pointsを確認してください。'],
        ['はい。武器ガチャ用の金髄の波模様購入も全額Play Pointsの対象です。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。購入前のGoogle Play画面に表示される獲得予定ポイントを確認してください。']
      ]
    }
  ];

  for (const config of configs) if (syncParentGuide(rootDir, config)) changedFiles.push(config.file);
  if (syncPad(rootDir)) changedFiles.push('games/pad/index.html');

  const guides = [
    ['games/pokepoke/premium-pass-guide/index.html', renderPokepokeGuide()],
    ['games/pad/pad-pass-value/index.html', renderPadGuide()],
    ['games/arknights/monthly-pass-limited-scout/index.html', renderArknightsGuide()],
    ['games/dokkan/google-play-vs-webstore/index.html', renderDokkanGuide()]
  ];
  for (const [file, html] of guides) if (writeIfChanged(rootDir, file, html)) changedFiles.push(file);

  const replacements = [
    [configs[0].descriptionBefore, configs[0].descriptionAfter],
    [configs[1].descriptionBefore, configs[1].descriptionAfter],
    [configs[2].descriptionBefore, configs[2].descriptionAfter],
    [configs[3].descriptionBefore, configs[3].descriptionAfter]
  ];
  changedFiles.push(...replaceDescriptionsAcrossGamePages(rootDir, replacements));

  return { checked: 9, changedFiles: [...new Set(changedFiles)].sort() };
}

module.exports = { syncGameSeoWave3: syncWave3 };
