'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  VERIFIED_AT,
  GOOGLE_PLAY_JP_LEVELS,
  SOURCES,
  GAME_SEO,
  pointRowsForYen,
  roundedPointsForYen
} = require('./game-seo-data.cjs');

const GUIDE_ASSETS = {
  articleCss: '../../../articles/article-shared.css?v=1f3377e639',
  gameCss: '../../games.css?v=09016b3c58'
};

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

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`[game-seo] ${label}: expected source text was not found`);
  return source.replace(before, after);
}

function replaceRegexRequired(source, pattern, after, marker, label) {
  if (marker && source.includes(marker)) return source;
  if (!pattern.test(source)) throw new Error(`[game-seo] ${label}: expected source pattern was not found`);
  pattern.lastIndex = 0;
  return source.replace(pattern, after);
}

function insertBeforeRequired(source, needle, block, marker, label) {
  if (source.includes(marker)) return source;
  const index = source.indexOf(needle);
  if (index < 0) throw new Error(`[game-seo] ${label}: insertion point was not found`);
  return `${source.slice(0, index)}${block}\n\n          ${source.slice(index)}`;
}

function yen(value) {
  return `${Number(value).toLocaleString('ja-JP')}円`;
}

function pointTableHtml(amount) {
  const rows = pointRowsForYen(amount)
    .map(row => `<tr><td>${row.label}</td><td>${row.rate}pt / 100円</td><td>約 ${row.points.toLocaleString('ja-JP')}pt</td></tr>`)
    .join('\n');
  const special5 = roundedPointsForYen(amount, 5);
  const special7 = roundedPointsForYen(amount, 7);
  return `<div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>Play Pointsステータス</th><th>通常獲得率</th><th>${yen(amount)}購入時</th></tr></thead><tbody>${rows}</tbody></table></div>\n<p>ゲーム個別の特別獲得率が表示されている場合は、通常獲得率と単純加算せず、Google Play画面に表示される高い方の獲得率を基準にします。参考として5pt/100円なら約 ${special5.toLocaleString('ja-JP')}pt、7pt/100円なら約 ${special7.toLocaleString('ja-JP')}ptです。</p>`;
}

function guideShell({ gameId, slug, title, description, lead, body, faq }) {
  const canonical = `https://playpoint-sim.com/games/${gameId}/${slug}/`;
  const faqJson = faq && faq.length ? `\n  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
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
  <link rel="stylesheet" href="${GUIDE_ASSETS.articleCss}" />
  <link rel="stylesheet" href="${GUIDE_ASSETS.gameCss}" />
  <script type="application/ld+json">
${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    dateModified: VERIFIED_AT,
    author: { '@type': 'Person', name: 'かたかた', url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: 'Playポイント計算機', url: 'https://playpoint-sim.com/' },
    mainEntityOfPage: canonical
  }, null, 2)}
  </script>${faqJson}
</head>
<body>
  <header class="site-header"><div class="site-header-inner"><a class="site-logo" href="../../../"><span class="site-logo-icon">🎮</span><span class="site-logo-text">Playポイント計算機</span></a></div></header>
  <nav class="global-nav" aria-label="メインナビゲーション"><div class="global-nav-inner"><a class="nav-item" href="../../../"><span>ホーム</span></a><a class="nav-item active" href="../../"><span>ゲーム別計算</span></a><a class="nav-item" href="../../../blog/"><span>記事一覧</span></a><a class="nav-item" href="../../../author/katakata.html"><span>運営者</span></a></div></nav>
  <div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="../../../">ホーム</a> <span>&gt;</span> <a href="../../">ゲーム別計算</a> <span>&gt;</span> <a href="../">ゲーム本体</a> <span>&gt;</span> <span>${title}</span></nav></div>
  <div class="game-page-container">
    <main class="game-main-content">
      <header class="game-header"><span class="game-badge">🔎 公式情報を基準に検証</span><h1 class="game-title">${title}</h1><p class="game-meta">最終確認：${VERIFIED_AT}</p></header>
      <p>${lead}</p>
      ${body}
      <section class="section"><h2>このページの確認方針</h2><p>金額・商品構成・ガチャ仕様は変更されることがあります。掲載値は確認日と出典を明示し、確認できない値を推測で補いません。実際の購入前にはゲーム内または公式ストアの最終表示、Google Playの獲得予定ポイント表示を優先してください。</p></section>
    </main>
  </div>
  <footer class="site-footer"><p>© Playポイント計算機 / 非公式の独立した計算・解説サイトです。</p></footer>
</body>
</html>
`;
}

function renderFgoGuide() {
  const data = GAME_SEO.fgo;
  const packRows = data.packsJa.map(pack => `<tr><td>有償${pack.paid} + 無償${pack.free}</td><td>${pack.total}</td><td>${yen(pack.price)}</td></tr>`).join('\n');
  const faq = [
    { q: 'FGOの確定召喚330回まで、ゼロから課金するといくら必要ですか？', a: '現在確認できるGoogle Play版の聖晶石販売単位を使い、無料石や呼符を0として900個以上を最小金額で用意する組み合わせでは54,600円で902個です。実際は所持石・呼符・1日1回有償召喚などで必要額が下がります。' },
    { q: 'FGOの福袋に必要な有償聖晶石15個は、ゼロからいくらですか？', a: '有償4個+無償1個の480円パックを4回購入すると有償16個になり、1,920円です。購入時のおまけ無償石は有償15個の条件には数えません。' }
  ];
  const body = `
      <section class="section"><h2>先に結論：330回の上限をゼロから用意するなら54,600円</h2><p>FGOの確定召喚は、対象の★5ピックアップを329回以内に引けなかった場合、330回目で確定します。10回召喚ごとの「+1回ボーナス召喚」も確定召喚の回数に数えられるため、330回を30セットの11回召喚で到達する前提では消費聖晶石は900個です。</p><p><strong>確認済み販売単位だけで900個以上を最安にそろえると、10,000円パック×5 + 3,000円パック×1 + 1,600円パック×1 = 54,600円で計902個</strong>です。無料石、呼符、既に持っている聖晶石を使う場合はこの金額より下がります。</p></section>
      <section class="section"><h2>現在確認できるFGOの聖晶石価格</h2><div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>内訳</th><th>合計聖晶石</th><th>価格</th></tr></thead><tbody>${packRows}</tbody></table></div><p>有償1個だけの販売は終了しています。価格表はFate/Grand Order公式のお知らせを基準にしています。</p></section>
      <section class="section"><h2>54,600円の課金でPlay Pointsはどれくらい？</h2>${pointTableHtml(data.pity.cheapestVerifiedSpendFromZero)}<p>ここでのポイント数は税込支払額を使った概算です。Googleは実際のポイント計算を税抜きの商品価格等を基準に行うため、最終的な獲得数はGoogle Playの購入確認画面に表示される値を正としてください。</p></section>
      <section class="section"><h2>福袋の有償15個は、ゼロからなら1,920円</h2><p>2026年の福袋召喚は<strong>有償聖晶石15個</strong>が必要です。現在の最小販売単位は有償4個+無償1個で480円なので、4回購入すると有償16個となり<strong>1,920円</strong>です。無料分4個は福袋の有償条件には入りません。</p>${pointTableHtml(data.luckyBag.cheapestVerifiedSpendFromZero)}</section>
      <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.fgoPrice}" target="_blank" rel="noopener noreferrer">FGO公式：聖晶石販売価格</a></li><li><a href="${SOURCES.fgoPity}" target="_blank" rel="noopener noreferrer">FGO公式FAQ：確定召喚330回</a></li><li><a href="${SOURCES.fgoLuckyBag2026}" target="_blank" rel="noopener noreferrer">FGO公式：2026年11周年福袋（有償15個）</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
      <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">FGO Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'fgo', slug: 'pity-cost', title: 'FGO天井330回はいくら？聖晶石価格・福袋・Play Points還元【2026年】', description: 'FGOの確定召喚330回に必要な聖晶石と課金額を、現行の公式価格から計算。ゼロからの最小購入例、福袋の有償15個、Google Play Points還元をまとめます。', lead: '「FGOの天井は結局いくら？」「福袋の有償15個をゼロから買うと何円？」「その課金でPlay Pointsは何ポイント？」を、確認済みの公式価格だけで計算します。', body, faq });
}

function renderGenshinGuide() {
  const data = GAME_SEO.genshin;
  const faq = [
    { q: '空月の祝福は610円で合計何原石相当ですか？', a: '購入時の創世結晶300個と、30日間毎日ログインした場合の原石90個×30日=2,700個を合わせ、最大3,000原石相当です。ログインしなかった日の原石は受け取れません。' },
    { q: '原神の180連は何円ですか？', a: '最大28,800原石が必要ですが、所持原石、初回2倍、空月の祝福、イベント配布などで必要な課金額が変わるため、PlayPointでは1つの固定金額を断定しません。' }
  ];
  const body = `
      <section class="section"><h2>空月の祝福は「610円で最大3,000原石相当」</h2><p>空月の祝福は購入時に創世結晶300個、その後30日間、ログインした日に原石90個ずつ受け取れます。30日すべて受け取れば2,700原石なので、創世結晶を1:1で原石に変換する前提では<strong>合計最大3,000原石相当</strong>です。</p><p>同じ610円帯の創世結晶300個を基準にすると、受け取り切った空月はベース量の約10倍相当になります。ただし空月は30日かけて受け取る商品で、即時に3,000原石を得る商品ではありません。初回2倍や期間限定のチャージ特典とも条件が違うため、単純な「10倍お得」とだけ扱わないのが安全です。</p></section>
      <section class="section"><h2>空月610円で貯まるPlay Points</h2>${pointTableHtml(data.welkin.price)}<p><strong>Google Play経由で購入した場合</strong>にPlay Pointsの対象になります。HoYoverse公式チャージセンターなどGoogle Play外の決済は、Google Playでの購入ではないため、Play Points獲得を前提に比較しません。</p></section>
      <section class="section"><h2>90連・180連を「固定の円額」にしない理由</h2><p>キャラクター祈願で最大90連なら14,400原石、すり抜け後も含む最大180連なら28,800原石が必要になる計算です。ただし、実際の現金負担は所持原石、紡がれた運命、空月、イベント配布、初回2倍、チャージ特典によって大きく変わります。そのため本サイトでは、旧ページにあった「90連=約27,000円」「180連=約54,000円」のような一律プリセットを廃止し、確認できる商品価格または自由入力からPlay Pointsを計算する方針にします。</p></section>
      <section class="section"><h2>価格確認で修正した点</h2><p>創世結晶980個の日本向け価格は、現在確認できる価格スナップショットで<strong>1,840円</strong>です。旧データの1,220円は修正対象です。購入前にはAndroidのGoogle Play購入画面を最終確認してください。</p></section>
      <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.genshinPriceSnapshot}" target="_blank" rel="noopener noreferrer">HoYoLAB：2026年の価格掲載スナップショット</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li><li><a href="${SOURCES.googlePlayLevels}" target="_blank" rel="noopener noreferrer">Google Play公式：日本のステータス別獲得率</a></li></ul></section>
      <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">原神 Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'genshin', slug: 'welkin-value', title: '原神「空月の祝福」はどれくらいお得？610円・原石3000相当とPlay Points', description: '原神の空月の祝福を、610円・最大3,000原石相当・Google Play Pointsの観点で比較。創世結晶の通常購入や90連/180連との違いも整理します。', lead: '空月の祝福は安い一方で、30日ログインが必要な定額型です。即時チャージと同じ物差しで比べず、「原石量」「受取速度」「Play Points」の3つに分けて判断します。', body, faq });
}

function renderMonstGuide() {
  const data = GAME_SEO.monst;
  const webGain = ((data.webStore.orbs / data.appStoreReference.orbs) - 1) * 100;
  const monthlyGain = ((data.monthlyWebStore.orbs / data.appStoreReference.orbs) - 1) * 100;
  const faq = [
    { q: 'モンストで1万円課金するならアプリ内とWebショップのどちらがお得ですか？', a: 'オーブ数だけなら、アプリ内180個に対してWebショップ通常190個、月1回の商品は200個なのでWeb側が多いです。一方、Google Play Pointsを貯めたい場合はGoogle Play経由のアプリ内購入を比較対象に残す必要があります。' },
    { q: 'モンストWebショップでもGoogle Play Pointsは貯まりますか？', a: 'WebショップはGoogle Play上の購入ではありません。Google Play PointsはGoogle Playでの対象購入に対して付くため、Webショップの購入ではPlay Points獲得を前提にしません。' }
  ];
  const body = `
      <section class="section"><h2>結論：オーブ数ならWeb、Play Pointsならアプリ内も比較</h2><div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>購入経路</th><th>1万円で得るオーブ</th><th>アプリ内180個との比較</th><th>Google Play Points</th></tr></thead><tbody><tr><td>Google Playアプリ内</td><td>180個</td><td>基準</td><td>対象購入なら獲得</td></tr><tr><td>モンストWebショップ通常</td><td>190個</td><td>+10個 / 約${webGain.toFixed(1)}%</td><td>Google Play購入ではない</td></tr><tr><td>月イチお得オーブ</td><td>200個</td><td>+20個 / 約${monthlyGain.toFixed(1)}%</td><td>Google Play購入ではない</td></tr></tbody></table></div><p>2026年9月時点でも公式Webショップの取引表示に190個/10,000円、月1回200個/10,000円が掲載されています。</p></section>
      <section class="section"><h2>Google Playで1万円課金したときのポイント</h2>${pointTableHtml(data.appStoreReference.price)}<p>特別獲得率が表示されている期間は、オーブ10〜20個の差だけではなく、Play Pointsの増加とステータス進捗も一緒に比較できます。逆に特別獲得率がなく、Play Pointsを重視しない場合は、純粋なオーブ数ではWebショップが強いです。</p></section>
      <section class="section"><h2>「どっちが得？」を一律の円換算にしない</h2><p>Play Pointsはゲーム内アイテム、クーポン、Google Playクレジットなど交換先と条件がアカウントや時期で変わります。そのため「500pt=必ず○円」と固定して、Webショップの20オーブと無理に同じ円価値へ換算しません。Play画面で現在使える交換先を確認し、オーブ増量とポイント価値を分けて判断するのが正確です。</p></section>
      <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.monstMonthlyWeb}" target="_blank" rel="noopener noreferrer">モンスト公式：月イチお得オーブ200個/10,000円</a></li><li><a href="${SOURCES.monstWebLaunch}" target="_blank" rel="noopener noreferrer">モンスト公式：Web190個とアプリ内との差</a></li><li><a href="${SOURCES.monstWebCurrent}" target="_blank" rel="noopener noreferrer">モンスト公式Webショップ：現在の商品表示</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの対象と計算</a></li></ul></section>
      <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">モンスト Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'monst', slug: 'google-play-vs-webshop', title: 'モンストはGoogle Play課金とWebショップどっちがお得？月イチ200個とPlay Points比較【2026年】', description: 'モンストの1万円課金を比較。アプリ内180個、Webショップ190個、月イチ200個の差と、Google Play Pointsを含めた選び方を公式情報ベースで整理します。', lead: '1万円という同じ支出でも、購入経路でオーブ数とPlay Pointsの条件が変わります。どちらかを一律に「最強」とせず、オーブ数とポイントを別々に比較します。', body, faq });
}

function syncFgo(rootDir) {
  const file = 'games/fgo/index.html';
  let html = read(rootDir, file);
  const options = `                              <option value="480">聖晶石 有償4+無償1個（計5個 / 480円）</option>\n                              <option value="1600">聖晶石 有償13+無償8個（計21個 / 1,600円）</option>\n                              <option value="3000">聖晶石 有償25+無償16個（計41個 / 3,000円）</option>\n                              <option value="4900">聖晶石 有償42+無償35個（計77個 / 4,900円）</option>\n                              <option value="10000">聖晶石 有償86+無償82個（計168個 / 10,000円）</option>\n                              <option value="custom">自由入力（カスタム金額）</option>`;
  html = replaceRegexRequired(html, /(<select id="sim-pack-select">)[\s\S]*?(<\/select>)/, `$1\n${options}\n                          $2`, '有償13+無償8個（計21個', 'FGO pack select');
  const rows = GAME_SEO.fgo.packsJa.map(pack => `<tr><td>聖晶石 有償${pack.paid}+無償${pack.free}個（計${pack.total}個）</td><td>${yen(pack.price)}</td><td>約 ${roundedPointsForYen(pack.price, 1)} pt</td><td>約 ${roundedPointsForYen(pack.price, 5)} pt</td></tr>`).join('\n');
  html = replaceRegexRequired(html, /(<table class="pack-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/, `$1\n${rows}\n                      $2`, '有償13+無償8個（計21個）</td>', 'FGO pack table');
  const presets = `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="1920" data-mult="1" aria-pressed="true">福袋 有償15個をゼロから用意（1,920円）</button>\n                  <button type="button" class="preset-btn" data-amount="10000" data-mult="1" aria-pressed="false">最大パック1回（10,000円）</button>\n                  <button type="button" class="preset-btn" data-amount="54600" data-mult="1" aria-pressed="false">確定召喚330回・石0から（54,600円）</button>\n              </div>`;
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, presets, '福袋 有償15個をゼロから用意', 'FGO presets');
  html = html.replaceAll('FGOの確定召喚（天井330連=約5.5万円）で貯まるポイントは？', 'FGOの確定召喚330回を石0から用意するといくら？');
  html = html.replaceAll('通常レートで約550pt、5倍キャンペーン時なら約2,750pt貯まります。', '確認済みの現行価格だけで聖晶石900個以上を最安にそろえる例は54,600円・902個です。ブロンズ通常獲得率なら税込額ベースの概算で約546pt、5pt/100円の特別獲得率なら約2,730ptです。実際の獲得予定ポイントはGoogle Play購入画面を優先してください。');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `FGO価格・確定召喚・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="fgo"><h2>2026年の価格・天井を公式情報で再計算</h2><p>有償1個販売終了後の現行パック、確定召喚330回、福袋の有償15個を分けて再計算しました。石0から確定召喚の上限まで用意する例は54,600円、2026年福袋の有償15個を石0から用意する最小例は1,920円です。</p><p><a href="./pity-cost/">FGO天井330回・福袋・Play Pointsの詳しい計算を見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="fgo"', 'FGO guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncGenshin(rootDir) {
  const file = 'games/genshin/index.html';
  let html = read(rootDir, file);
  html = replaceRequired(html, '<option value="1220">創世結晶 980+110個 (1,220円)</option>', '<option value="1840">創世結晶 980+110個 (1,840円)</option>', 'Genshin 980 select price');
  html = replaceRequired(html, '<tr><td>創世結晶 980+110個 (1,220円)</td><td>1,220 円</td><td>約 12 pt</td><td>約 61 pt</td></tr>', '<tr><td>創世結晶 980+110個 (1,840円)</td><td>1,840 円</td><td>約 18 pt</td><td>約 92 pt</td></tr>', 'Genshin 980 table price');
  const presets = `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="610" data-mult="1" aria-pressed="true">空月の祝福（610円）</button>\n                  <button type="button" class="preset-btn" data-amount="1840" data-mult="1" aria-pressed="false">創世結晶980+110個（1,840円）</button>\n                  <button type="button" class="preset-btn" data-amount="12000" data-mult="1" aria-pressed="false">創世結晶6480+1600個（12,000円）</button>\n              </div>`;
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, presets, '創世結晶980+110個（1,840円）', 'Genshin verified presets');
  html = html.replaceAll('原神で確定天井（180連）まで課金すると何ポイント貯まりますか？', '原神の90連・180連は何円ですか？');
  html = html.replaceAll('180連（約54,000円）課金した場合、通常時（1pt/100円）で約540pt、Google Playに100円あたり4〜7ptの特別獲得率が表示され、その購入が対象なら約2,160pt〜3,780pt貯まります。', '90連は最大14,400原石、180連は最大28,800原石が目安ですが、所持原石・空月・初回2倍・配布分で実際の課金額が変わるため固定の円額は断定しません。購入予定額を計算機へ入力し、Google Playの獲得予定ポイント表示を最終確認してください。');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `原神価格・空月・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="genshin"><h2>空月と通常チャージ、どちらが自分向き？</h2><p>空月の祝福は610円で、30日すべて受け取れば創世結晶300個+原石2,700個、最大3,000原石相当です。一方で即時チャージとは受取速度が違います。旧データで1,220円になっていた創世結晶980個帯は1,840円へ修正しました。</p><p><a href="./welkin-value/">空月610円のお得度とPlay Pointsを詳しく比較する ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="genshin"', 'Genshin guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncMonst(rootDir) {
  const file = 'games/monst/index.html';
  let html = read(rootDir, file);
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `モンスト価格・Webショップ・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="monst"><h2>Google Play課金とWebショップを同じ1万円で比較</h2><p>公式情報では、アプリ内1万円がオーブ180個、Webショップ通常が190個、月1回の「月イチお得オーブ」が200個です。Webの方がオーブは増えますが、Google Play Pointsを貯めるならGoogle Play経由の購入も比較対象になります。</p><p><a href="./google-play-vs-webshop/">180個 vs 190個 vs 200個とPlay Pointsを比較する ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="monst"', 'Monst guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncBlueArchive(rootDir) {
  const file = 'games/bluearchive/index.html';
  let html = read(rootDir, file);
  html = html.replaceAll('200連天井・固有武器完凸', '呼び出しチャージ100/200・固有武器完凸');
  html = html.replaceAll('ブルアカの天井（200連=約4.8万円）で何ポイント貯まりますか？', 'ブルアカの現在の募集上限は何回ですか？');
  html = html.replaceAll('通常時で約480pt、Google Playの5倍キャンペーン時なら約2,400pt（ゴールドランク即時達成）貯まります。', '2026年7月29日以降は旧「呼び出しポイント」方式ではなく、100チャージで★3確定（50%でPU）、200チャージでPU確定の「呼び出しチャージ」方式です。現行Google Play価格を一次情報で再確認できるまでは、固定の天井課金額を断定しません。');
  html = html.replace(/\s*<button type="button" class="preset-btn [^"]*" data-amount="48000"[^>]*>天井 200連 \(約48,000円\)<\/button>/, '');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `ブルアカ募集仕様確認：${VERIFIED_AT}（Google Play価格は再確認待ち）`);
  const block = `<section class="section" data-game-seo-guide="bluearchive"><h2>募集仕様は2026年7月29日から変更</h2><p>旧「呼び出しポイント」前提の固定天井額は掲載を止め、現在は100チャージで★3確定（50%でPU）、200チャージでPU確定の新仕様として案内します。商品価格はGoogle Playの一次表示を再確認できるまで、既存の参考表を購入判断の正値として扱わないでください。</p><p><a href="https://x.com/Blue_ArchiveJP" target="_blank" rel="noopener noreferrer">ブルーアーカイブ公式Xで最新募集情報を確認する ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="bluearchive"', 'Blue Archive verification block');
  return writeIfChanged(rootDir, file, html);
}

function syncGameSeo(rootDir) {
  const changedFiles = [];
  for (const [file, renderer] of [
    ['games/fgo/pity-cost/index.html', renderFgoGuide],
    ['games/genshin/welkin-value/index.html', renderGenshinGuide],
    ['games/monst/google-play-vs-webshop/index.html', renderMonstGuide]
  ]) {
    if (writeIfChanged(rootDir, file, renderer())) changedFiles.push(file);
  }
  if (syncFgo(rootDir)) changedFiles.push('games/fgo/index.html');
  if (syncGenshin(rootDir)) changedFiles.push('games/genshin/index.html');
  if (syncMonst(rootDir)) changedFiles.push('games/monst/index.html');
  if (syncBlueArchive(rootDir)) changedFiles.push('games/bluearchive/index.html');
  return { checked: 7, changedFiles };
}

module.exports = {
  syncGameSeo,
  renderFgoGuide,
  renderGenshinGuide,
  renderMonstGuide
};
