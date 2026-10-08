'use strict';

const { read, writeIfChanged, replaceDescriptionsAcrossGamePages, createGuideShell, createRequiredEdits } = require('./game-seo-common.cjs');
const { insertBeforeRequired } = createRequiredEdits('game-seo-wave4');

const { VERIFIED_AT, SOURCES, GAME_SEO_WAVE4 } = require('./game-seo-wave4-data.cjs');

const guideShell = createGuideShell({
  verifiedAt: VERIFIED_AT,
  badge: '🔎 公式情報を基準に検証',
  verificationPolicy: 'Google Playと公式Web決済は別の購入経路です。現行Google Play価格を公開一次情報で確認できない場合は推測で補わず、ゲーム内・Google Playの購入画面を購入前に確認してください。'
});

function syncParentGuide(rootDir, config) {
  let html = read(rootDir, config.file);
  html = html.replaceAll(config.descriptionBefore, config.descriptionAfter);
  for (const [before, after] of config.replacements || []) html = html.replaceAll(before, after);
  if (config.guideBlock) html = insertBeforeRequired(html, '<section class="section game-source-section">', config.guideBlock, config.guideMarker, `${config.file} guide block`);
  return writeIfChanged(rootDir, config.file, html);
}

function renderHbrGuide() {
  const web = GAME_SEO_WAVE4.hbr.webShop;
  const body = `
    <section class="section"><h2>結論：WEB SHOPはアプリ内商品より5%OFF、ただしPlay Pointsとは別軸</h2><p>ヘブバン公式WEB SHOPは、対象のパック商品やクォーツ商品を<strong>アプリ内より5%OFF</strong>で購入できると公式ヘルプで案内しています。さらにWEB SHOP購入では、基本として購入金額の<strong>${web.basePointPercent}%分のWEB SHOPポイント</strong>を獲得できます。</p></section>
    <section class="section"><h2>現在のWEB SHOPにはWEB限定クォーツもある</h2><p>2026年9月13日の公式WEB SHOP表示では、クォーツ30,000個/28,500円、20,000個/19,000円のWEB限定商品や、10,000個/9,500円・4,750個/4,655円の5%OFF商品が表示されています。商品・期間限定パックは変動するため、購入時の公式WEB SHOP表示を優先してください。</p></section>
    <section class="section"><h2>プレミアムパス・ライトパスはWEB SHOP加入不可</h2><p>公式ヘルプは、<strong>プレミアムパス/ライトパスはWEB SHOPから加入できない</strong>と明記しています。したがって「WEB SHOPが常に全商品で有利」とは言えません。月額サービスはゲーム内の購入経路で現在価格と条件を確認します。</p></section>
    <section class="section"><h2>Google Play Pointsを重視するなら</h2><p>WEB SHOPはGoogle Play上の購入ではありません。Google Play Pointsを貯めたい場合は、Google Play側の対象購入で表示される獲得予定ポイントと、WEB SHOPの5%OFF・WEB SHOPポイントを別々に比較してください。両者を同じポイントとして合算しません。</p></section>
    <section class="section" aria-labelledby="hbr-shop-points"><h2 id="hbr-shop-points">WEB SHOPポイントは何に使える？</h2><p>貯まったポイントは、WEB SHOP内の「ポイント交換所」で<strong>ゲーム内アイテムと交換</strong>します。購入代金の値引きと同じ扱いにせず、交換先に自分が欲しいアイテムがあるかで判断しましょう。</p><p>たとえばレギュラーステータス・キャンペーンなしで、WEB SHOPでの支払額が10,000円なら基本分は100ポイントです。これは計算例で、100円の値引きを示すものではありません。実際には基本・ステータス・キャンペーンの倍率を加算し、それぞれの獲得分の小数点以下を切り捨てます。</p><p>ポイントは決済完了後に付与され、有効期限は<strong>最後の獲得から365日後</strong>。新しく獲得すると保有分すべての期限が延長されます。5%OFFで今の支払額が下がる効果と、後からアイテムへ交換する効果を分けて比較すると分かりやすくなります。</p><p class="reader-source"><a href="${SOURCES.hbrWebShopPoints}" target="_blank" rel="noopener noreferrer">公式ヘルプ：交換先・計算方法・有効期限（2026年10月9日確認）</a></p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.hbrWebShop}" target="_blank" rel="noopener noreferrer">ヘブバン公式WEB SHOP：現在の商品表示</a></li><li><a href="${SOURCES.hbrWebShopHelp}" target="_blank" rel="noopener noreferrer">公式ヘルプ：アプリ内より5%OFF</a></li><li><a href="${SOURCES.hbrWebShopPoints}" target="_blank" rel="noopener noreferrer">公式ヘルプ：WEB SHOPポイント</a></li><li><a href="${SOURCES.hbrWebShopOther}" target="_blank" rel="noopener noreferrer">公式ヘルプ：月額パスはWEB SHOP加入不可</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ヘブバン Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'hbr', slug: 'google-play-vs-webshop', lead: 'ヘブバンは公式WEB SHOPが強い一方、月額パスはWEB SHOPで加入できません。「安さ」「独自ポイント」「Google Play Points」「買える商品」を分けて比較します。', body, faq: [
    { q: 'ヘブバンWEB SHOPはアプリ内より安いですか？', a: '公式ヘルプでは、対象のパック商品やクォーツ商品をアプリ内より5%OFFで購入できると案内しています。商品ごとの現在条件はWEB SHOP表示を確認してください。' },
    { q: 'ヘブバンWEB SHOPでGoogle Play Pointsは貯まりますか？', a: 'WEB SHOPはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play上の対象購入で表示される獲得予定ポイントを確認してください。' }
  ] });
}

function renderHi3Guide() {
  const body = `
    <section class="section"><h2>公式チャージセンターとゲーム内は、特典の一部を共有</h2><p>崩壊3rd公式は、HoYoverse公式チャージセンターを提供しています。公式案内では、<strong>月パス以外の水晶2倍チャージボーナスはゲーム内とチャージセンターで共有</strong>され、チャージセンターで購入してもゲーム内のチャージ特典を受け取れると説明しています。</p></section>
    <section class="section"><h2>月パスは有効期間180日未満なら延長購入可能</h2><p>公式案内では、月パスの残り有効期間が180日未満の場合に追加購入して期間を延長できます。現行日本Google Playの月パス価格は公開一次情報で固定できないため、本サイトでは旧600円を現行価格として扱いません。</p></section>
    <section class="section"><h2>チャージセンターでは独自割引キャンペーンもあり得る</h2><p>海外向けの公式案内では、2026年3月5日〜4月16日にチャージセンター向けの5%・10%割引クーポンを配布する期間限定イベントが実施されました。これは海外向けの終了済みキャンペーンの例です。日本向けの開催を示すものではなく、恒常割引ではありません。現在のお得度はチャージセンターの決済直前表示で確認してください。</p></section>
    <section class="section"><h2>Google Play PointsはGoogle Play購入と分ける</h2><p>HoYoverse公式チャージセンターはGoogle Play上の購入ではありません。Google Play Pointsを重視する場合は、Google Play側の購入確認画面に表示されるポイントと、チャージセンター側の割引・特典を別軸で比較します。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.hi3ChargeCenterLaunch}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：チャージセンター</a></li><li><a href="${SOURCES.hi3TopUpDiscount2026}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：2026年チャージセンター割引イベント</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">崩壊3rd Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'honkai3rd', slug: 'google-play-vs-charge-center', pageDescription: '崩壊3rdのGoogle Play購入とHoYoverse公式チャージセンターを、2倍チャージ特典、月パス延長、期間限定割引、Play Pointsの違いから整理します。', lead: '崩壊3rdは公式チャージセンターがあり、ゲーム内と共有する特典もあります。ただしGoogle Play Pointsとは別経路なので、購入目的ごとに比較します。', body, faq: [
    { q: '崩壊3rdの公式チャージセンターでも初回2倍は使えますか？', a: '公式案内では、月パス以外の水晶2倍チャージボーナスはゲーム内と公式チャージセンターで共有されます。' },
    { q: '公式チャージセンター購入でGoogle Play Pointsは貯まりますか？', a: '公式チャージセンターはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play側の対象購入で確認してください。' }
  ] });
}

function renderPhantomGuide() {
  const shop = GAME_SEO_WAVE4.phantomparade.webShop;
  const body = `
    <section class="section"><h2>公式WEBショップは増量・マイルが明示されている</h2><p>2026年9月13日のファンパレ公式WEBショップでは、有償廻珠A〜Gを160円〜10,000円で掲載し、初回は<strong>${shop.currentPaidBeadFirstBonusPercentRange[0]}〜${shop.currentPaidBeadFirstBonusPercentRange[1]}%増量</strong>を表示しています。期間商品には4〜5%増量や、WEB限定100%増量商品も表示されています。内容は時期で変わるため現在表示を優先してください。</p></section>
    <section class="section"><h2>WEBショップでは購入金額に応じたマイルptも表示</h2><p>2026年10月9日の公式WEBショップでは、有償廻珠Cは1,000円・初回19%増量・1,000マイルpt、WEB限定の毎月切り替えお得廻珠パックは1,000円・4%増量・1,000マイルptと表示されています。同じ支払額・マイル数でも、増量率と購入条件は商品によって違います。マイルptはGoogle Play Pointsとは別の仕組みです。</p><p><strong>1,000マイルptを、そのまま1,000円の還元として計算しない</strong>ようにしましょう。マイルの円換算や交換条件は商品カードの獲得表示だけでは分からないため、利用時の案内を確認します。比較する順番は、廻珠の内訳と総数、初回・回数制限、マイルの使い道です。</p><p class="reader-source"><a href="${SOURCES.phantomWebShop}" target="_blank" rel="noopener noreferrer">公式WEBショップ：商品ごとの増量・マイル表示（2026年10月9日確認）</a></p></section>
    <section class="section"><h2>パス類もWEBショップにあるが、Google Play価格とは分ける</h2><p>現在のWEBショップではファンパレボーナス610円、毎日廻珠ボーナス480円などが表示されています。これらはWEBショップの現在価格であり、Google Play側の価格として流用しません。Google Play購入では購入画面の実額を本サイトへ入力してください。</p></section>
    <section class="section"><h2>Google Play Pointsを含めた比較</h2><p>WEBショップ購入はGoogle Play上の購入ではないため、Google Play Points獲得を前提にしません。「WEB増量・マイル」と「Google Play Points」を別々に見て、自分の購入額と現在のキャンペーンに合わせて選ぶのが安全です。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.phantomWebShop}" target="_blank" rel="noopener noreferrer">ファンパレ公式WEBショップ：現在の商品・増量表示</a></li><li><a href="${SOURCES.phantomWebShopLogin}" target="_blank" rel="noopener noreferrer">公式WEBショップ：アカウント連携</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ファンパレ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'phantomparade', slug: 'google-play-vs-webshop', pageDescription: 'ファンパレ公式WEBショップの増量率、マイルpt、パス商品とGoogle Play Pointsを別軸で比較。Google Play価格は推測せず購入画面で確認します。', lead: 'ファンパレ公式WEBショップには増量商品とマイルptがあります。Google Play Pointsと同じものではないため、現在の増量・支払経路・ポイントを分けて比較します。', body, faq: [
    { q: 'ファンパレWEBショップには増量がありますか？', a: '2026年9月13日の公式WEBショップでは、有償廻珠の初回17〜20%増量や、期間商品4〜5%増量などが表示されています。内容は時期で変わります。' },
    { q: 'WEBショップでGoogle Play Pointsは貯まりますか？', a: 'WEBショップはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play上の対象購入で確認してください。' }
  ] });
}

function syncGameSeoWave4(rootDir) {
  const changedFiles = [];
  const configs = [
    {
      file: 'games/hbr/index.html',
      descriptionBefore: 'ヘブンバーンズレッド（ヘブバン）のクォーツ購入、ライト/プレミアムパス、200連天井ガチャで貯まるGoogle Play Pointsをパッと計算！パック別還元早見表や使い道も掲載しています。ガチャ前の確認にぜひ使ってみてくださいね。',
      descriptionAfter: 'ヘブバンのGoogle Play課金予定額からPlay Pointsを計算。公式WEB SHOPの5%OFF・独自ポイントは別決済として分離し、Google Play価格は購入画面で確認します。',
      replacements: [
        ['ヘブバンのクォーツ課金でGoogle Play Pointsは貯まりますか？', 'ヘブバンのGoogle Play課金でPlay Pointsは貯まりますか？'],
        ['はい！AndroidおよびPC版（Steam除くPlayストア経由）の決済で100円につき1pt以上が貯まります。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。WEB SHOP購入はGoogle Play決済と分けて確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="hbr"><h2>Google Playと公式WEB SHOPを5%OFF・独自ポイントで比較</h2><p>公式WEB SHOPは対象商品をアプリ内より5%OFF、基本1%のWEB SHOPポイントを案内しています。一方、プレミアム/ライトパスはWEB SHOP加入不可です。</p><p><a href="./google-play-vs-webshop/">Google PlayとWEB SHOPの違いを詳しく見る ➔</a></p></section>`,
      guideMarker: 'data-game-seo-guide="hbr"'
    },
    {
      file: 'games/honkai3rd/index.html',
      descriptionBefore: '崩壊3rdの水晶購入、ギフトコイン、月パス、90連キャラ確定天井で貯まるGoogle Play Pointsをパッと計算！パック別ポイント還元早見表や使い道も一覧で比較できます。補給前の課金シミュレーションにぜひ使ってみてくださいね。',
      descriptionAfter: '崩壊3rdのGoogle Play課金予定額からPlay Pointsを計算。HoYoverse公式チャージセンターの2倍特典共有や月パス条件と分けて比較できます。',
      replacements: [
        ['崩壊3rdでキャラ確定天井（90連）まで課金すると何ポイント？', '崩壊3rdの90連分に必要な現金額は固定ですか？'],
        ['約50,400円課金した場合、通常時（1pt/100円）で約504pt、特別獲得率5pt/100円時なら約2,520pt（ゴールドランク到達）貯まります。', 'いいえ。所持水晶・配布・チケット・初回特典・購入経路で実際の支払額が変わるため固定円額とは扱いません。Google Playで実際に支払う金額からPlay Pointsを確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="honkai3rd"><h2>Google PlayとHoYoverse公式チャージセンターを分けて比較</h2><p>月パス以外の2倍チャージボーナスは両経路で共有され、公式チャージセンター独自の期間割引もあります。Google Play Pointsとは別軸です。</p><p><a href="./google-play-vs-charge-center/">公式チャージセンターとの違いを見る ➔</a></p></section>`,
      guideMarker: 'data-game-seo-guide="honkai3rd"'
    },
    {
      file: 'games/phantomparade/index.html',
      descriptionBefore: '呪術廻戦ファントムパレード（ファンパレ）の有償廻珠、ファンパレパス、250連天井ガチャで貯まるPlayポイントをサクッと計算！パック別還元早見表やポイント使い道も比較できます。ガチャ前のシミュレーションにぜひ使ってみてくださいね。',
      descriptionAfter: 'ファンパレのGoogle Play課金予定額からPlay Pointsを計算。公式WEBショップの増量・マイル・パス商品は別決済として分離し、Google Play価格は購入画面で確認します。',
      replacements: [
        ['ファンパレの天井（250連）で何ポイント貯まりますか？', 'ファンパレの250連分に必要な現金額は固定ですか？'],
        ['約75,000円課金した場合、通常時（1pt/100円）で約750pt、特別獲得率5pt/100円時なら約3,750pt（ゴールドランク即到達）還元されます。', 'いいえ。所持廻珠・配布・チケット・販売中の商品構成・購入経路で実負担が変わるため固定円額とは扱いません。Google Playの実支払額からPlay Pointsを確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="phantomparade"><h2>Google Playと公式WEBショップを増量・マイルで比較</h2><p>公式WEBショップでは有償廻珠の初回増量や期間パック、マイルptが表示されています。Google Play Pointsとは別の仕組みとして比較します。</p><p><a href="./google-play-vs-webshop/">公式WEBショップとの違いを見る ➔</a></p></section>`,
      guideMarker: 'data-game-seo-guide="phantomparade"'
    },
    {
      file: 'games/reverse1999/index.html',
      descriptionBefore: 'リバース：1999の純雨の雫パック、咆哮のひと月（月パス）、70連/140連天井ガチャで貯まるGoogle Play Pointsを即時計算！パック別還元早見表や使い道も比較できます。召喚前のポイント確認にぜひ役立ててみてくださいね。',
      descriptionAfter: 'リバース：1999のGoogle Play課金予定額からPlay Pointsを計算。公式が価格を購入ページ表示としているため、固定価格や固定天井額を推測せず実際の支払額を確認します。',
      replacements: [
        ['はい！咆哮のひと月（月パス）や純雨の雫パックの購入ですべてポイントが還元されます。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。公式チャージセンターなどGoogle Play外の購入は分けて確認してください。']
      ]
    }
  ];

  for (const config of configs) if (syncParentGuide(rootDir, config)) changedFiles.push(config.file);

  const guides = [
    ['games/hbr/google-play-vs-webshop/index.html', renderHbrGuide()],
    ['games/honkai3rd/google-play-vs-charge-center/index.html', renderHi3Guide()],
    ['games/phantomparade/google-play-vs-webshop/index.html', renderPhantomGuide()]
  ];
  for (const [file, html] of guides) if (writeIfChanged(rootDir, file, html)) changedFiles.push(file);

  changedFiles.push(...replaceDescriptionsAcrossGamePages(rootDir, configs.map(config => [config.descriptionBefore, config.descriptionAfter])));

  return { checked: 7, changedFiles: [...new Set(changedFiles)].sort() };
}

module.exports = { syncGameSeoWave4 };
