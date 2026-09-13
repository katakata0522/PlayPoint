'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');
const { VERIFIED_AT, SOURCES, GAME_SEO_WAVE4 } = require('./game-seo-wave4-data.cjs');

function read(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function writeIfChanged(rootDir, relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const normalized = content.replace(/\r\n/g, '\n');
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (previous === normalized) return false;
  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

function replaceRegexRequired(source, pattern, after, marker, label) {
  if (marker && source.includes(marker)) return source;
  if (!pattern.test(source)) throw new Error(`[game-seo-wave4] ${label}: expected source pattern was not found`);
  pattern.lastIndex = 0;
  return source.replace(pattern, after);
}

function insertBeforeRequired(source, needle, block, marker, label) {
  if (source.includes(marker)) return source;
  const index = source.indexOf(needle);
  if (index < 0) throw new Error(`[game-seo-wave4] ${label}: insertion point was not found`);
  return `${source.slice(0, index)}${block}\n\n          ${source.slice(index)}`;
}

function replaceDescriptionAcrossGamePages(rootDir, before, after) {
  const changedFiles = [];
  for (const relativePath of getGamePageHtmlFiles(rootDir)) {
    if (!relativePath.startsWith('games/')) continue;
    const filePath = path.join(rootDir, relativePath);
    const html = fs.readFileSync(filePath, 'utf8');
    if (!html.includes(before)) continue;
    const next = html.replaceAll(before, after);
    if (next !== html) {
      fs.writeFileSync(filePath, next, 'utf8');
      changedFiles.push(relativePath);
    }
  }
  return changedFiles;
}

function guideShell({ gameId, slug, title, description, lead, body, faq = [] }) {
  const canonical = `https://playpoint-sim.com/games/${gameId}/${slug}/`;
  const faqJson = faq.length ? `\n  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } }))
  }, null, 2)}\n  </script>` : '';
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="last-modified" content="${VERIFIED_AT}" />
  <meta name="author" content="かたかた" />
  <link rel="icon" href="../../../favicon.svg" type="image/svg+xml" />
  <title>${title} | Playポイント計算機</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="../../../articles/article-shared.css?v=1f3377e639" />
  <link rel="stylesheet" href="../../games.css?v=09016b3c58" />
  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    dateModified: VERIFIED_AT,
    author: { '@type': 'Person', name: 'かたかた', url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: 'Playポイント計算機', url: 'https://playpoint-sim.com/' },
    mainEntityOfPage: canonical
  }, null, 2)}\n  </script>${faqJson}
</head>
<body>
  <header class="site-header"><div class="site-header-inner"><a class="site-logo" href="../../../"><span class="site-logo-icon">🎮</span><span class="site-logo-text">Playポイント計算機</span></a></div></header>
  <nav class="global-nav" aria-label="メインナビゲーション"><div class="global-nav-inner"><a class="nav-item" href="../../../"><span>ホーム</span></a><a class="nav-item active" href="../../"><span>ゲーム別計算</span></a><a class="nav-item" href="../../../blog/"><span>記事一覧</span></a><a class="nav-item" href="../../../author/katakata.html"><span>運営者</span></a></div></nav>
  <div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="../../../">ホーム</a> <span>&gt;</span> <a href="../../">ゲーム別計算</a> <span>&gt;</span> <a href="../">ゲーム本体</a> <span>&gt;</span> <span>${title}</span></nav></div>
  <div class="game-page-container"><main class="game-main-content">
    <header class="game-header"><span class="game-badge">🔎 公式情報を基準に検証</span><h1 class="game-title">${title}</h1><p class="game-meta">最終確認：${VERIFIED_AT}</p></header>
    <p>${lead}</p>
    ${body}
    <section class="section"><h2>このページの確認方針</h2><p>Google Playと公式Web決済は別の購入経路です。現行Google Play価格を公開一次情報で確認できない場合は推測で補わず、ゲーム内・Google Playの購入画面を最終正本とします。</p></section>
  </main></div>
  <footer class="site-footer"><p>© Playポイント計算機 / 非公式の独立した計算・解説サイトです。</p></footer>
</body>
</html>\n`;
}

function syncCustomOnly(rootDir, config) {
  let html = read(rootDir, config.file);
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="0" data-mult="1" aria-pressed="true">Google Playの表示額を入力</button>\n              </div>`, 'Google Playの表示額を入力', `${config.file} preset`);
  html = replaceRegexRequired(html, /(<select id="sim-pack-select">)[\s\S]*?(<\/select>)/, `$1\n                              <option value="custom" selected>現行価格をGoogle Playで確認して入力</option>\n                          $2`, '現行価格をGoogle Playで確認して入力', `${config.file} pack select`);
  html = html.replace(/<input type="number" id="sim-custom-amount" value="[^"]*" min="0" step="any" inputmode="decimal">/, '<input type="number" id="sim-custom-amount" value="0" min="0" step="any" inputmode="decimal">');
  html = replaceRegexRequired(html, /(<table class="pack-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/, `$1\n<tr><td colspan="4">${config.tableMessage}</td></tr>\n                      $2`, config.tableMessage, `${config.file} table`);
  html = html.replace(/<p class="game-meta">[^<]*<\/p>/, `<p class="game-meta">${config.gameMeta}</p>`);
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
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.hbrWebShop}" target="_blank" rel="noopener noreferrer">ヘブバン公式WEB SHOP：現在の商品表示</a></li><li><a href="${SOURCES.hbrWebShopHelp}" target="_blank" rel="noopener noreferrer">公式ヘルプ：アプリ内より5%OFF</a></li><li><a href="${SOURCES.hbrWebShopPoints}" target="_blank" rel="noopener noreferrer">公式ヘルプ：WEB SHOPポイント</a></li><li><a href="${SOURCES.hbrWebShopOther}" target="_blank" rel="noopener noreferrer">公式ヘルプ：月額パスはWEB SHOP加入不可</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ヘブバン Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'hbr', slug: 'google-play-vs-webshop', title: 'ヘブバンはGoogle PlayとWEB SHOPどっちがお得？5%OFF・独自ポイント・パスの違い【2026年】', description: 'ヘブバン公式WEB SHOPの5%OFF、WEB SHOPポイント、WEB限定クォーツ、月額パス加入不可の条件をGoogle Play Pointsと分けて比較します。', lead: 'ヘブバンは公式WEB SHOPが強い一方、月額パスはWEB SHOPで加入できません。「安さ」「独自ポイント」「Google Play Points」「買える商品」を分けて比較します。', body, faq: [
    { q: 'ヘブバンWEB SHOPはアプリ内より安いですか？', a: '公式ヘルプでは、対象のパック商品やクォーツ商品をアプリ内より5%OFFで購入できると案内しています。商品ごとの現在条件はWEB SHOP表示を確認してください。' },
    { q: 'ヘブバンWEB SHOPでGoogle Play Pointsは貯まりますか？', a: 'WEB SHOPはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play上の対象購入で表示される獲得予定ポイントを確認してください。' }
  ] });
}

function renderHi3Guide() {
  const body = `
    <section class="section"><h2>公式チャージセンターとゲーム内は、特典の一部を共有</h2><p>崩壊3rd公式は、HoYoverse公式チャージセンターを提供しています。公式案内では、<strong>月パス以外の水晶2倍チャージボーナスはゲーム内とチャージセンターで共有</strong>され、チャージセンターで購入してもゲーム内のチャージ特典を受け取れると説明しています。</p></section>
    <section class="section"><h2>月パスは有効期間180日未満なら延長購入可能</h2><p>公式案内では、月パスの残り有効期間が180日未満の場合に追加購入して期間を延長できます。現行日本Google Playの月パス価格は公開一次情報で固定できないため、本サイトでは旧600円を現行価格として扱いません。</p></section>
    <section class="section"><h2>チャージセンターでは独自割引キャンペーンもあり得る</h2><p>2026年3月5日〜4月16日には、公式チャージセンター向けに5%・10%割引クーポンを配布する期間限定イベントが実施されました。これは終了済みキャンペーンであり、恒常割引ではありません。現在のお得度はチャージセンターの決済直前表示で確認してください。</p></section>
    <section class="section"><h2>Google Play PointsはGoogle Play購入と分ける</h2><p>HoYoverse公式チャージセンターはGoogle Play上の購入ではありません。Google Play Pointsを重視する場合は、Google Play側の購入確認画面に表示されるポイントと、チャージセンター側の割引・特典を別軸で比較します。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.hi3ChargeCenterLaunch}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：チャージセンター</a></li><li><a href="${SOURCES.hi3TopUpDiscount2026}" target="_blank" rel="noopener noreferrer">崩壊3rd公式：2026年チャージセンター割引イベント</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">崩壊3rd Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'honkai3rd', slug: 'google-play-vs-charge-center', title: '崩壊3rdはGoogle Playと公式チャージセンターどっち？2倍特典・月パス・Play Points【2026年】', description: '崩壊3rdのGoogle Play購入とHoYoverse公式チャージセンターを、2倍チャージ特典、月パス延長、期間限定割引、Play Pointsの違いから整理します。', lead: '崩壊3rdは公式チャージセンターがあり、ゲーム内と共有する特典もあります。ただしGoogle Play Pointsとは別経路なので、購入目的ごとに比較します。', body, faq: [
    { q: '崩壊3rdの公式チャージセンターでも初回2倍は使えますか？', a: '公式案内では、月パス以外の水晶2倍チャージボーナスはゲーム内と公式チャージセンターで共有されます。' },
    { q: '公式チャージセンター購入でGoogle Play Pointsは貯まりますか？', a: '公式チャージセンターはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play側の対象購入で確認してください。' }
  ] });
}

function renderPhantomGuide() {
  const shop = GAME_SEO_WAVE4.phantomparade.webShop;
  const body = `
    <section class="section"><h2>公式WEBショップは増量・マイルが明示されている</h2><p>2026年9月13日のファンパレ公式WEBショップでは、有償廻珠A〜Gを160円〜10,000円で掲載し、初回は<strong>${shop.currentPaidBeadFirstBonusPercentRange[0]}〜${shop.currentPaidBeadFirstBonusPercentRange[1]}%増量</strong>を表示しています。期間商品には4〜5%増量や、WEB限定100%増量商品も表示されています。内容は時期で変わるため現在表示を優先してください。</p></section>
    <section class="section"><h2>WEBショップでは購入金額に応じたマイルptも表示</h2><p>公式WEBショップの商品には、たとえば1,000円商品なら1,000マイルptのようにマイルpt獲得表示があります。これはファンパレWEBショップ側の仕組みで、Google Play Pointsとは別物です。</p></section>
    <section class="section"><h2>パス類もWEBショップにあるが、Google Play価格とは分ける</h2><p>現在のWEBショップではファンパレボーナス610円、毎日廻珠ボーナス480円などが表示されています。これらはWEBショップの現在価格であり、Google Play側の価格として流用しません。Google Play購入では購入画面の実額を本サイトへ入力してください。</p></section>
    <section class="section"><h2>Google Play Pointsを含めた比較</h2><p>WEBショップ購入はGoogle Play上の購入ではないため、Google Play Points獲得を前提にしません。「WEB増量・マイル」と「Google Play Points」を別々に見て、自分の購入額と現在のキャンペーンに合わせて選ぶのが安全です。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.phantomWebShop}" target="_blank" rel="noopener noreferrer">ファンパレ公式WEBショップ：現在の商品・増量表示</a></li><li><a href="${SOURCES.phantomWebShopLogin}" target="_blank" rel="noopener noreferrer">公式WEBショップ：アカウント連携</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ファンパレ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'phantomparade', slug: 'google-play-vs-webshop', title: 'ファンパレはGoogle PlayとWEBショップどっちがお得？増量・マイル・Play Points比較【2026年】', description: 'ファンパレ公式WEBショップの増量率、マイルpt、パス商品とGoogle Play Pointsを別軸で比較。Google Play価格は推測せず購入画面を正本にします。', lead: 'ファンパレ公式WEBショップには増量商品とマイルptがあります。Google Play Pointsと同じものではないため、現在の増量・支払経路・ポイントを分けて比較します。', body, faq: [
    { q: 'ファンパレWEBショップには増量がありますか？', a: '2026年9月13日の公式WEBショップでは、有償廻珠の初回17〜20%増量や、期間商品4〜5%増量などが表示されています。内容は時期で変わります。' },
    { q: 'WEBショップでGoogle Play Pointsは貯まりますか？', a: 'WEBショップはGoogle Play上の購入ではありません。Google Play PointsはGoogle Play上の対象購入で確認してください。' }
  ] });
}

function syncGameSeoWave4(rootDir) {
  const changedFiles = [];
  const configs = [
    {
      file: 'games/hbr/index.html',
      tableMessage: 'プレミアム/ライトパスの存在と公式WEB SHOPは確認済みですが、現行Google Playのパス・クォーツ価格を公開一次情報で固定できません。購入画面の実額を入力してください。',
      gameMeta: `ヘブバン Google Play・WEB SHOP・Play Points確認：${VERIFIED_AT}（Google Play価格は購入画面を正本）`,
      descriptionBefore: 'ヘブンバーンズレッド（ヘブバン）のクォーツ購入、ライト/プレミアムパス、200連天井ガチャで貯まるGoogle Play Pointsをパッと計算！パック別還元早見表や使い道も掲載しています。ガチャ前の確認にぜひ使ってみてくださいね。',
      descriptionAfter: 'ヘブバンのGoogle Play課金予定額からPlay Pointsを計算。公式WEB SHOPの5%OFF・独自ポイントは別決済として分離し、Google Play価格は購入画面を正本とします。',
      replacements: [
        ['ヘブバンのクォーツ課金でGoogle Play Pointsは貯まりますか？', 'ヘブバンのGoogle Play課金でPlay Pointsは貯まりますか？'],
        ['はい！AndroidおよびPC版（Steam除くPlayストア経由）の決済で100円につき1pt以上が貯まります。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。WEB SHOP購入はGoogle Play決済と分けて確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="hbr"><h2>Google Playと公式WEB SHOPを5%OFF・独自ポイントで比較</h2><p>公式WEB SHOPは対象商品をアプリ内より5%OFF、基本1%のWEB SHOPポイントを案内しています。一方、プレミアム/ライトパスはWEB SHOP加入不可です。</p><p><a href="./google-play-vs-webshop/">Google PlayとWEB SHOPの違いを詳しく見る ➔</a></p></section>`,
      guideMarker: 'data-game-seo-guide="hbr"'
    },
    {
      file: 'games/honkai3rd/index.html',
      tableMessage: '公式チャージセンターの仕組みは確認済みですが、現行日本Google Playの水晶・月パス価格を公開一次情報で固定できません。購入画面の実額を入力してください。',
      gameMeta: `崩壊3rd Google Play・公式チャージセンター確認：${VERIFIED_AT}（Google Play価格は購入画面を正本）`,
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
      tableMessage: '公式WEBショップの商品・増量は確認済みですが、Google Play側の現行商品価格として流用しません。Google Play購入画面の実額を入力してください。',
      gameMeta: `ファンパレ Google Play・公式WEBショップ確認：${VERIFIED_AT}（Google Play価格は購入画面を正本）`,
      descriptionBefore: '呪術廻戦ファントムパレード（ファンパレ）の有償廻珠、ファンパレパス、250連天井ガチャで貯まるPlayポイントをサクッと計算！パック別還元早見表やポイント使い道も比較できます。ガチャ前のシミュレーションにぜひ使ってみてくださいね。',
      descriptionAfter: 'ファンパレのGoogle Play課金予定額からPlay Pointsを計算。公式WEBショップの増量・マイル・パス商品は別決済として分離し、Google Play価格は購入画面を正本とします。',
      replacements: [
        ['ファンパレの天井（250連）で何ポイント貯まりますか？', 'ファンパレの250連分に必要な現金額は固定ですか？'],
        ['約75,000円課金した場合、通常時（1pt/100円）で約750pt、特別獲得率5pt/100円時なら約3,750pt（ゴールドランク即到達）還元されます。', 'いいえ。所持廻珠・配布・チケット・販売中の商品構成・購入経路で実負担が変わるため固定円額とは扱いません。Google Playの実支払額からPlay Pointsを確認してください。']
      ],
      guideBlock: `<section class="section" data-game-seo-guide="phantomparade"><h2>Google Playと公式WEBショップを増量・マイルで比較</h2><p>公式WEBショップでは有償廻珠の初回増量や期間パック、マイルptが表示されています。Google Play Pointsとは別の仕組みとして比較します。</p><p><a href="./google-play-vs-webshop/">公式WEBショップとの違いを見る ➔</a></p></section>`,
      guideMarker: 'data-game-seo-guide="phantomparade"'
    },
    {
      file: 'games/reverse1999/index.html',
      tableMessage: '公式は販売価格を購入ページ表示としており、チャージセンターも提供しています。現行Google Play価格を固定せず、購入画面の実額を入力してください。',
      gameMeta: `リバース1999 Google Play・公式チャージセンター確認：${VERIFIED_AT}（価格は購入ページを正本）`,
      descriptionBefore: 'リバース：1999の純雨の雫パック、咆哮のひと月（月パス）、70連/140連天井ガチャで貯まるGoogle Play Pointsを即時計算！パック別還元早見表や使い道も比較できます。召喚前のポイント確認にぜひ役立ててみてくださいね。',
      descriptionAfter: 'リバース：1999のGoogle Play課金予定額からPlay Pointsを計算。公式が価格を購入ページ表示としているため、固定価格や固定天井額を推測せず実額を正本とします。',
      replacements: [
        ['はい！咆哮のひと月（月パス）や純雨の雫パックの購入ですべてポイントが還元されます。', 'Google Play上の対象購入として処理される場合にポイントが計算されます。公式チャージセンターなどGoogle Play外の購入は分けて確認してください。']
      ]
    }
  ];

  for (const config of configs) if (syncCustomOnly(rootDir, config)) changedFiles.push(config.file);

  const guides = [
    ['games/hbr/google-play-vs-webshop/index.html', renderHbrGuide()],
    ['games/honkai3rd/google-play-vs-charge-center/index.html', renderHi3Guide()],
    ['games/phantomparade/google-play-vs-webshop/index.html', renderPhantomGuide()]
  ];
  for (const [file, html] of guides) if (writeIfChanged(rootDir, file, html)) changedFiles.push(file);

  for (const config of configs) changedFiles.push(...replaceDescriptionAcrossGamePages(rootDir, config.descriptionBefore, config.descriptionAfter));

  return { checked: 7, changedFiles: [...new Set(changedFiles)].sort() };
}

module.exports = { syncGameSeoWave4 };
