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
    <section class="section"><h2>現在のWEB SHOPにはWEB限定クォーツもある</h2><p>2026年10月29日の公式WEB SHOP表示では、クォーツ30,000個/28,500円、20,000個/19,000円のWEB限定商品や、10,000個/9,500円・4,750個/4,655円の5%OFF商品が表示されています。商品・期間限定パックは変動するため、購入時の公式WEB SHOP表示を優先してください。</p></section>
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
    <section class="section"><h2>2倍ボーナスは購入先ごとにもう一度もらえる？</h2><p>ゲーム内で2倍ボーナスを使ったあと、公式チャージセンターでもう一度もらえたら嬉しい。でも、<strong>2024年の崩壊3rd公式案内では、月パス以外の水晶2倍チャージボーナスはゲーム内とチャージセンターで共有</strong>されます。購入先を変えるだけで別々に2倍を受け取れるわけではありません。</p><p>購入先を選ぶなら、同じ商品で支払額を見比べ、使える割引とGoogle Play Pointsをそれぞれ確認しましょう。現在の価格やボーナスの利用状況は、購入画面で確かめてください。</p></section>
    <section class="section"><h2>Google Playとチャージセンター、どちらを選ぶ？</h2><p>同じ商品を比べたとき、まず見るのは<strong>購入画面の支払額と水晶数</strong>です。そのうえで、自分が使える特典も判断に入れます。</p><p>Google Play側に使いたいクーポンやポイント増量があり、Play Pointsの交換先にも欲しいものがあるなら、Google Playで買う価値があります。一方、チャージセンター側で自分に使える割引が表示されているなら、割引後の金額と比べてみましょう。</p><p>チャージセンターでの購入はGoogle Play上の購入ではないため、Play Points獲得は前提にできません。Google Play側も、対象購入かどうかと獲得予定ポイントを購入画面で確認してください。</p></section>
    <section class="section"><h2>月パスを重ねて買うときの確認</h2><p>水晶を毎日受け取る月パスを延長したい場合は、残り期間にも注意。2024年の公式案内では、<strong>残り有効期間が180日未満</strong>なら追加購入で期間を延長でき、180日以上では延長できないとされています。</p><p>この条件と両方の価格は購入前に表示を確認しましょう。月パスは、上で説明した水晶2倍チャージボーナスとは別に考えます。</p></section>
    <section class="section"><h2>割引クーポンは期間と対象を確認</h2><p>チャージセンターの割引は、いつでも同じ条件で使えるとは限りません。海外向けの公式案内には、2026年3月5日から4月16日までの5%・10%クーポンの例がありました。これは終了した海外向けイベントで、日本の現在の割引を示すものではなく、恒常割引ではありません。</p><p>今使えるクーポンがあれば、期限・対象商品・割引上限を確認し、決済前の最終金額で比べましょう。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.hi3ChargeCenterLaunch}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：チャージセンターの案内（2024年）</a></li><li><a href="${SOURCES.hi3TopUpDiscount2026}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：過去の海外向け割引イベント</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">崩壊3rd Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'honkai3rd', slug: 'google-play-vs-charge-center', pageDescription: '崩壊3rdの水晶2倍ボーナスは購入先を変えても別々にもらえる？公式案内をもとに、チャージセンターとGoogle Playの選び方を整理します。', lead: '水晶2倍ボーナスは購入先で共有。価格や使える特典を分けて比較します。', body, faq: [
    { q: '崩壊3rdの公式チャージセンターでも初回2倍は使えますか？', a: '2024年の公式案内では、月パスを除く商品の水晶2倍チャージボーナスが対象です。ボーナスの利用状況はゲーム内と公式チャージセンターで共通とされています。現在の対象商品と利用状況は購入画面で確認してください。' },
    { q: '公式チャージセンター購入でGoogle Play Pointsは貯まりますか？', a: '公式チャージセンターはGoogle Play上の購入ではありません。Google Play側の対象購入で確認してください。' }
  ] });
}

function renderPhantomGuide() {
  const body = `
    <section class="section"><h2>同じ1,000円でも、まず商品を選ぶ</h2><p>引きたいガチャが来た。廻珠を買うなら、公式WEBショップの増量も気になりますよね。まずは<strong>同じ1,000円でも、初回商品と毎月の商品は別物</strong>というところから見てみましょう。</p><p>2026年10月29日の公式WEBショップでは、有償廻珠Cは1,000円で初回19%増量、WEB限定の毎月切り替えお得廻珠パックは1,000円で4%増量と表示されていました。どちらにも1,000マイルptの獲得表示があります。有償廻珠A〜Gの初回は<strong>17〜20%増量</strong>、ほかに4〜5%増量の商品も確認できました。</p><p>数字だけを見て決めず、商品ごとの有償・無償の内訳や購入回数を確認してから、Google Play側で欲しい商品と比べるのがおすすめです。Google Play側の現在の価格・内容は確認できていません。</p></section>
    <section class="section"><h2>マイルptとPlay Pointsは別々に考える</h2><p>WEBショップの商品には、廻珠の増量に加えてマイルptの獲得数が表示されています。マイルptはGoogle Play Pointsとは別の仕組みです。一方、Google Play PointsはGoogle Play上の対象購入で貯まるもの。WEBショップの購入で両方が付く前提にはできません。</p><p>たとえば表示された1,000マイルptを、そのまま<strong>1,000円の値引きや1,000 Play Pointsと同じもの</strong>として計算しないこと。マイルptの利用条件や特典は購入前にショップ内の案内を確認し、Play Pointsも自分が欲しい交換先と必要ポイントを見て比べましょう。</p></section>
    <section class="section"><h2>毎日のボーナスを選ぶなら、受け取る予定日も見る</h2><p>2026年10月29日のWEBショップには、ファンパレボーナス610円、毎日廻珠ボーナス480円も掲載されていました。これらはWEBショップ側の表示価格です。Google Play側の価格とは限らないため、購入画面を見比べてください。</p><p>今すぐ廻珠が欲しいのか、毎日の受け取りで次のガチャに備えたいのか。受取条件と、欲しいガチャまでの日数も合わせて見ると選びやすくなります。</p></section>
    <section class="section"><h2>Google PlayとWEBショップ、どちらを選ぶ？</h2><p>廻珠の増量やWEB限定商品を重視するなら、まず公式WEBショップの対象商品を確認。Google Play側のクーポンやポイント増量が使え、獲得ポイントにも欲しい交換先があるなら、Google Playの購入画面も候補に入れましょう。</p><p>両方で同じ商品を買える場合は、支払額、廻珠の内訳、購入回数、使える特典を一つずつ比べます。期間商品や初回特典は変わるので、決済前の表示が最終確認です。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.phantomWebShop}" target="_blank" rel="noopener noreferrer">ファンパレ公式WEBショップ：商品表示</a></li><li><a href="${SOURCES.phantomWebShopLogin}" target="_blank" rel="noopener noreferrer">公式WEBショップ：アカウント連携</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ファンパレ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'phantomparade', slug: 'google-play-vs-webshop', pageDescription: 'ファンパレ公式WEBショップの廻珠増量とマイルpt、Google Play Pointsを比較。初回と毎月の商品例を見ながら購入先を選びます。', lead: '初回と毎月の商品、マイルpt、Play Pointsを分けて比べます。', body, faq: [
    { q: 'ファンパレWEBショップには増量がありますか？', a: '2026年10月29日の公式WEBショップでは、有償廻珠A〜Gの初回17〜20%増量などを確認しました。商品や条件は変わるため、購入画面で確認してください。' },
    { q: 'WEBショップでGoogle Play Pointsは貯まりますか？', a: 'WEBショップはGoogle Play上の購入ではありません。Google Play上の対象購入で確認してください。' }
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
