'use strict';

const { read, writeIfChanged, createGuideShell, createRequiredEdits } = require('./game-seo-common.cjs');
const { replaceRequired, replaceAllRequired, replaceRegexRequired, insertBeforeRequired } = createRequiredEdits('game-seo-expanded');

const {
  VERIFIED_AT,
  GOOGLE_PLAY_JP_LEVELS,
  SOURCES,
  GAME_SEO,
  roundedPointsForYen
} = require('./game-seo-data.cjs');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');

function yen(value) {
  return `${Number(value).toLocaleString('ja-JP')}円`;
}

function pointTableHtml(amount) {
  const eligibleAmount = amount / 1.1;
  const rows = GOOGLE_PLAY_JP_LEVELS.map(level => `<tr><td>${level.label}</td><td>${level.rate}pt / 100円</td><td>約 ${roundedPointsForYen(eligibleAmount, level.rate).toLocaleString('ja-JP')}pt</td></tr>`).join('\n');
  return `<div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>Play Pointsステータス</th><th>通常獲得率</th><th>${yen(amount)}購入時</th></tr></thead><tbody>${rows}</tbody></table></div><p>税込価格に消費税10%が含まれると仮定し、税抜換算額から計算した概算です。複数の商品を買う場合は商品ごとに丸められるため、合計額からの試算とは差が出ます。実際の税額・対象額と獲得予定ポイントはGoogle Playの購入画面で確認してください。</p>`;
}

const guideShell = createGuideShell({
  verifiedAt: VERIFIED_AT,
  badge: '🔎 現行情報を検証',
  verificationPolicy: 'ゲーム内価格・定額商品・ガチャ仕様は変更されることがあります。一次情報を優先し、公式価格が公開テキストで確認できない箇所は現行の公開スナップショットとして区別します。購入直前はゲーム内の最終価格とGoogle Playの獲得予定ポイント表示を優先してください。'
});

function renderStarrailGuide() {
  const data = GAME_SEO.starrail;
  const pass = data.supplyPass;
  const body = `
    <section class="section"><h2>列車補給標章は610円で最大3,000星玉相当</h2><p>購入時に往日の夢華300個を受け取り、30日間はログインした日に星玉90個を受け取れます。30日すべて受け取ると2,700星玉なので、往日の夢華300個を1:1で星玉へ交換する前提では<strong>最大3,000星玉相当</strong>です。</p><p>ログインしなかった日の90星玉は後からまとめて受け取れないため、即時チャージと同じ「610円で3,000個の商品」として扱わないことが重要です。</p></section>
    <section class="section"><h2>通常チャージとの違い：980個帯は現在1,840円</h2><p>現在確認できる日本向け価格スナップショットでは、往日の夢華980個帯は<strong>1,840円</strong>です。旧PlayPointに残っていた1,220円は現行値として使わないよう修正します。価格スナップショットは公式価格表そのものではないため、購入直前のGoogle Play表示を最終正本にします。</p></section>
    <section class="section"><h2>90連・180連を固定の円額にしない</h2><p>ガチャに必要な星玉は所持星玉、チケット、イベント配布、列車補給標章、初回チャージ特典などで補えるため、旧ページの「90連=約27,000円」「180連=約54,000円」という一律プリセットは実負担を正確に表しません。PlayPointでは、確認できる商品または実際の課金予定額を入力してPlay Pointsを計算する方式に変更します。</p></section>
    <section class="section"><h2>Google Playで610円購入した場合のPlay Points目安</h2>${pointTableHtml(pass.price)}<p>列車補給標章を<strong>Google Play経由</strong>で購入した場合に限り、Google Play上の対象購入としてPlay Pointsを計算します。HoYoverseの別決済経路をGoogle Play購入として数えません。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.starrailPriceSnapshot}" target="_blank" rel="noopener noreferrer">HoYoLAB：現在確認できる日本向け価格スナップショット</a></li><li><a href="${SOURCES.starrailSupplyPassReference}" target="_blank" rel="noopener noreferrer">HoYoLAB：列車補給標章の受取仕様</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">スターレイル Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'starrail', slug: 'supply-pass-value', pageDescription: '崩壊：スターレイルの列車補給標章を610円・最大3,000星玉相当・受取速度・Google Play Pointsで比較。旧980個帯価格と固定天井額も見直します。',
    lead: '列車補給標章はコスパが高い一方、30日かけて受け取る商品です。通常チャージ、ガチャ資金、Play Pointsを同じ数字で混ぜずに比較します。',
    body,
    faq: [
      { q: '列車補給標章は610円で何星玉相当ですか？', a: '購入時の往日の夢華300個と、30日すべてログインした場合の星玉90個×30日を合わせ、最大3,000星玉相当です。ログインしなかった日の90星玉は後から受け取れません。' },
      { q: 'スタレの180連は何円ですか？', a: '所持星玉・チケット・配布・列車補給標章・初回特典で実際の現金負担が変わるため、PlayPointでは固定の円額を断定しません。' }
    ]
  });
}

function renderZzzGuide() {
  const data = GAME_SEO.zzz;
  const pass = data.membership;
  const body = `
    <section class="section"><h2>インターノット会員は610円で最大3,000ポリクローム相当</h2><p>購入時にモノクローム300個、その後30日間にポリクローム90個ずつを受け取る定額型です。30日分をすべて受け取れば2,700ポリクロームなので、モノクローム300個を1:1で換算する前提では<strong>最大3,000ポリクローム相当</strong>です。</p><p>即時に3,000個を受け取る商品ではないため、通常チャージとは「総量」と「受取速度」を分けて比較します。</p></section>
    <section class="section"><h2>モノクローム980個帯の旧1,220円を修正</h2><p>現在確認できる日本向け価格スナップショットでは、モノクローム980個帯は<strong>1,840円</strong>です。PlayPointに残っていた1,220円は現行値として扱いません。最終的な購入価格はGoogle Playの決済画面を確認してください。</p></section>
    <section class="section"><h2>90連・180連を「何円」と固定しない</h2><p>ガチャ必要量が同じでも、所持ポリクローム、暗号化マスターテープ、インターノット会員、イベント配布、初回増量などで現金負担は変わります。このため旧ページの27,000円・54,000円プリセットを撤去し、実際に支払う予定額からPlay Pointsを計算します。</p></section>
    <section class="section"><h2>Google Playで610円購入した場合のPlay Points目安</h2>${pointTableHtml(pass.price)}<p>Play PointsはGoogle Play上の対象購入を基準にします。ゲーム外・Google Play外の決済経路は同じものとして加算しません。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.zzzPriceSnapshot}" target="_blank" rel="noopener noreferrer">HoYoLAB：日本向けモノクローム価格の掲載例</a></li><li><a href="${SOURCES.zzzMembershipReference}" target="_blank" rel="noopener noreferrer">HoYoLAB：インターノット会員の内容</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ゼンゼロ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'zzz', slug: 'membership-value', pageDescription: 'ゼンレスゾーンゼロのインターノット会員を610円・最大3,000ポリクローム相当・受取速度・Google Play Pointsで比較。旧価格と固定天井額も整理します。',
    lead: '月パス型のインターノット会員と即時チャージでは、同じ金額でも価値の出方が違います。総量・速度・Play Pointsを分けて確認します。',
    body,
    faq: [
      { q: 'インターノット会員は610円で何ポリクローム相当ですか？', a: '購入時のモノクローム300個と、30日分のポリクローム90個×30日を合わせ、すべて受け取れば最大3,000ポリクローム相当です。' },
      { q: 'ゼンゼロの180連は固定で54,000円ですか？', a: '所持通貨・チケット・配布・月パス・初回増量で実負担が変わるため、固定の円額としては扱いません。' }
    ]
  });
}

function renderUmasukuGuide() {
  const data = GAME_SEO.umamusume;
  const umasuku = data.umasuku;
  const body = `
    <section class="section"><h2>デイリージュエルパックは終了。現在の月額は「ウマスク」</h2><p>旧「デイリージュエルパック」は<strong>2024年12月19日4:59に販売終了</strong>しています。現在の月額サービスとして公式に案内されている「ウマスク」は<strong>月980円</strong>です。旧商品を現行商品として計算候補に残さないよう修正します。</p></section>
    <section class="section"><h2>ウマスク980円でもらえるもの</h2><ul><li>購入時・更新時：有償ジュエル500個 + 無償ジュエル50個</li><li>ログイン時：無償ジュエル50個を毎日</li><li>育成の対象報酬：2倍（+100%）</li><li>デイリーレースチケット：毎日+3枚</li></ul><p>毎日分の無償ジュエルは未受取があっても<strong>次回ログイン時にまとめてプレゼントへ送られる</strong>と公式WebStoreに明記されています。これはHoYoverse系の月パスのような「未ログイン日は失う」商品とは扱いが違います。</p></section>
    <section class="section"><h2>「30日で何ジュエル」と固定しすぎない</h2><p>ウマスクの有効期間は「購入後1か月」で、翌月同日までが基準です。月の日数や購入タイミングで日数が変わるため、PlayPointでは980円を一律「30日分○個」として固定換算しません。比較するときは、購入/更新時の550個と、実際の有効日数に応じる毎日50個を分けます。</p></section>
    <section class="section"><h2>Google PlayとCygames WebStoreは別の購入経路</h2><p>2026年2月からウマスクはCygames WebStoreでも購入可能です。ただし、Google Play PointsはGoogle Play上の対象購入に対する制度なので、WebStore購入をGoogle Play購入としてポイント計算しません。Play Pointsを重視する場合はGoogle Play側の購入画面、お得なWebStore施策を重視する場合はCygames WebStoreを別軸で比較します。</p>${pointTableHtml(umasuku.price)}</section>
    <section class="section"><h2>ウマプランとは別サービス</h2><p>2026年2月24日から月額1,980円の「ウマプラン」も登場しています。ウマスクと重複購入できるため、ジュエル系月額と機能系月額を混同しないようにします。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.umamusumeUmasuku}" target="_blank" rel="noopener noreferrer">ウマ娘公式WebStore：ウマスク詳細</a></li><li><a href="${SOURCES.umamusumeUmasukuLaunch}" target="_blank" rel="noopener noreferrer">ウマ娘公式：ウマスク開始・デイリージュエルパック終了</a></li><li><a href="${SOURCES.umamusumeUmaplan}" target="_blank" rel="noopener noreferrer">ウマ娘公式：ウマプランとWebStore対応</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ウマ娘 Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'umamusume', slug: 'umasuku-value', pageDescription: 'ウマ娘の現行月額「ウマスク」を公式情報で整理。月980円、購入時の有償500+無償50、毎日50、未受取分、Cygames WebStoreとGoogle Playの違いを比較します。',
    lead: '旧デイリージュエルパックはすでに終了しています。現在のウマスクを、ジュエル数だけでなく育成特典・受取仕様・購入経路まで含めて判断します。',
    body,
    faq: [
      { q: 'ウマスクはいくらですか？', a: '月980円です。購入時・更新時に有償ジュエル500個と無償ジュエル50個、ログイン時に毎日無償ジュエル50個などの特典があります。' },
      { q: 'ウマスクの毎日50ジュエルはログインしないと消えますか？', a: '公式WebStoreでは、毎日もらえる無償ジュエルの未受取分は次回ログイン時にまとめてプレゼントへ送られると案内されています。' }
    ]
  });
}

function renderProsekaGuide() {
  const store = GAME_SEO.proseka.webStore;
  const body = `
    <section class="section"><h2>公式WebStoreはGoogle Playとは別の購入経路</h2><p>プロセカにはColorful Palette運営の公式WebStoreがあります。WebStoreでの購入はGoogle Play上の決済ではないため、WebStore価格をそのままGoogle Play Points計算へ入れません。まず「ゲーム内Google Play決済」と「公式WebStore」を分けることが比較の前提です。</p></section>
    <section class="section"><h2>2026年9月に公式WebStoreで確認できる価格</h2><div class="pack-table-wrap"><table class="pack-table"><thead><tr><th>商品</th><th>価格</th></tr></thead><tbody><tr><td>クリスタルA / B / C / D / E / F / G</td><td>160 / 480 / 1,000 / 1,800 / 3,000 / 4,900 / 10,000円</td></tr><tr><td>クリスタルG×3 / G×5</td><td>30,000 / 50,000円</td></tr><tr><td>プレミアムミッションパス</td><td>${yen(store.premiumMissionPass)}</td></tr><tr><td>マイセカイミッションパス</td><td>${yen(store.mySekaiMissionPass)}</td></tr><tr><td>ミッションパスセット</td><td>${yen(store.missionPassSet)}</td></tr><tr><td>カラフルパス BASIC / DELUXE / PRECIOUS</td><td>480 / 1,500 / 3,000円</td></tr><tr><td>ワールドパス</td><td>${yen(store.worldPass)}</td></tr></tbody></table></div><p>これは<strong>公式WebStoreの価格</strong>です。Google Playアプリ内の商品構成・価格と同一だとは仮定しません。</p></section>
    <section class="section"><h2>カラフルパスは月額だけでなく毎日分も見る</h2><p>公式FAQでは、BASICは30日間1日25、DELUXEは1日50、PRECIOUSは1日100の無償クリスタルが案内されています。WebStore価格と組み合わせると「月額だけ」でなく日々の受取量を含めた比較ができますが、有償/無償の区分や追加特典は別物なので単純な1個あたり価格だけで優劣を断定しません。</p></section>
    <section class="section"><h2>Play Pointsを優先するならGoogle Playの最終表示を見る</h2><p>Google Play PointsはGoogle Play上の対象購入に対して付与されます。WebStoreに初回増量やセット割がある場合でも、それはWebStore側のメリットです。Google Playで購入する場合は、購入確認画面の支払額と獲得予定ポイントを見て比較してください。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.prosekaWebStore}" target="_blank" rel="noopener noreferrer">プロセカ公式WebStore：現在の商品・価格</a></li><li><a href="${SOURCES.prosekaFaq}" target="_blank" rel="noopener noreferrer">プロセカ公式FAQ：有償/無償クリスタル・カラフルパス</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">プロセカ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'proseka', slug: 'google-play-vs-webstore', pageDescription: 'プロセカ公式WebStoreの現行価格、カラフルパス3種、ミッションパスとGoogle Play Pointsの違いを整理。WebStoreとGoogle Playを別経路として比較します。',
    lead: '同じプロセカ課金でも、公式WebStoreとGoogle Playでは「商品のお得さ」と「Play Points」が別軸です。経路を混ぜずに現在の公式情報で比較します。',
    body,
    faq: [
      { q: 'プロセカ公式WebStoreの購入でもGoogle Play Pointsは貯まりますか？', a: '公式WebStoreはGoogle Play上の購入ではないため、Google Play Pointsの獲得を前提にしません。Play PointsはGoogle Play上の対象購入で確認してください。' },
      { q: 'カラフルパスは何種類ありますか？', a: '公式WebStoreではBASIC 480円、DELUXE 1,500円、PRECIOUS 3,000円が掲載されています。公式FAQでは30日間の毎日無償クリスタルがそれぞれ25、50、100と案内されています。' }
    ]
  });
}

function syncStarrail(rootDir) {
  const file = 'games/starrail/index.html';
  let html = read(rootDir, file);
  html = replaceRequired(html, '<option value="1220">往日の夢華 980+110個 (1,220円)</option>', '<option value="1840">往日の夢華 980+110個 (1,840円)</option>', 'Star Rail 980 select');
  html = replaceRequired(html, '<tr><td>往日の夢華 980+110個 (1,220円)</td><td>1,220 円</td><td>約 12 pt</td><td>約 61 pt</td></tr>', '<tr><td>往日の夢華 980+110個 (1,840円)</td><td>1,840 円</td><td>約 18 pt</td><td>約 92 pt</td></tr>', 'Star Rail 980 table');
  const presets = `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="610" data-mult="1" aria-pressed="true">列車補給標章（610円）</button>\n                  <button type="button" class="preset-btn" data-amount="1840" data-mult="1" aria-pressed="false">往日の夢華980+110個（1,840円）</button>\n                  <button type="button" class="preset-btn" data-amount="12000" data-mult="1" aria-pressed="false">往日の夢華6480+1600個（12,000円）</button>\n              </div>`;
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, presets, '往日の夢華980+110個（1,840円）', 'Star Rail presets');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `スタレ価格・列車補給標章・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="starrail"><h2>固定の天井円額ではなく、月パス・現行価格・実支払額で比較</h2><p>旧ページの27,000円/54,000円プリセットを撤去し、列車補給標章610円、往日の夢華980個帯1,840円など確認できる支払額から計算します。</p><p><a href="./supply-pass-value/">列車補給標章610円のお得度とPlay Pointsを詳しく見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="starrail"', 'Star Rail guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncZzz(rootDir) {
  const file = 'games/zzz/index.html';
  let html = read(rootDir, file);
  html = replaceRequired(html, '<option value="1220">モノクローム 980+110個 (1,220円)</option>', '<option value="1840">モノクローム 980+110個 (1,840円)</option>', 'ZZZ 980 select');
  html = replaceRequired(html, '<tr><td>モノクローム 980+110個 (1,220円)</td><td>1,220 円</td><td>約 12 pt</td><td>約 61 pt</td></tr>', '<tr><td>モノクローム 980+110個 (1,840円)</td><td>1,840 円</td><td>約 18 pt</td><td>約 92 pt</td></tr>', 'ZZZ 980 table');
  const presets = `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="610" data-mult="1" aria-pressed="true">インターノット会員（610円）</button>\n                  <button type="button" class="preset-btn" data-amount="1840" data-mult="1" aria-pressed="false">モノクローム980+110個（1,840円）</button>\n                  <button type="button" class="preset-btn" data-amount="12000" data-mult="1" aria-pressed="false">モノクローム6480+1600個（12,000円）</button>\n              </div>`;
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, presets, 'モノクローム980+110個（1,840円）', 'ZZZ presets');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `ゼンゼロ価格・インターノット会員・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="zzz"><h2>インターノット会員と通常チャージを同じ物差しで比較しない</h2><p>月パスは30日かけて受け取る商品です。旧980個帯価格1,220円と27,000円/54,000円の固定天井プリセットを修正し、実際の課金予定額で計算します。</p><p><a href="./membership-value/">インターノット会員610円のお得度とPlay Pointsを見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="zzz"', 'ZZZ guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncUmamusume(rootDir) {
  const staleDescription = 'ウマ娘のジュエル購入、デイリージュエルパック、200連天井・完凸課金で貯まるGoogle Play Pointsを即時シミュレーション！パック別還元早見表やポイント使い道もまとめているので、育成前の課金計画にぜひ役立ててみてくださいね。';
  const currentDescription = 'ウマ娘の現行月額「ウマスク」や課金予定額で貯まるGoogle Play Pointsを計算。終了済みデイリージュエルパックを除外し、WebStoreとの購入経路差も確認できます。';
  const changedFiles = [];
  for (const file of getGamePageHtmlFiles(rootDir)) {
    const before = read(rootDir, file);
    if (!before.includes(staleDescription)) continue;
    const after = before.replaceAll(staleDescription, currentDescription);
    if (writeIfChanged(rootDir, file, after)) changedFiles.push(file);
  }

  const file = 'games/umamusume/index.html';
  let html = read(rootDir, file);
  const presets = `<div class="preset-buttons">\n                  <button type="button" class="preset-btn active" data-amount="980" data-mult="1" aria-pressed="true">ウマスク（980円）</button>\n                  <button type="button" class="preset-btn" data-amount="1980" data-mult="1" aria-pressed="false">ウマプラン（1,980円）</button>\n              </div>`;
  html = replaceRegexRequired(html, /<div class="preset-buttons">[\s\S]*?<\/div>/, presets, 'ウマスク（980円）', 'Uma presets');
  const options = `                              <option value="980">ウマスク（980円）</option>\n                              <option value="1980">ウマプラン（1,980円）</option>\n                              <option value="custom">自由入力（カスタム金額）</option>`;
  html = replaceRegexRequired(html, /(<select id="sim-pack-select">)[\s\S]*?(<\/select>)/, `$1\n${options}\n                          $2`, 'ウマスク（980円）</option>', 'Uma verified select');
  html = replaceRegexRequired(html, /(<table class="pack-table">[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/, `$1\n<tr><td>ウマスク（月額）</td><td>980 円</td><td>約 10 pt</td><td>約 49 pt</td></tr>\n<tr><td>ウマプラン（月額・機能系）</td><td>1,980 円</td><td>約 20 pt</td><td>約 99 pt</td></tr>\n                      $2`, 'ウマスク（月額）', 'Uma verified table');
  html = html.replace('id="sim-custom-amount" value="1000"', 'id="sim-custom-amount" value="980"');
  html = replaceAllRequired(html, 'ウマ娘の天井（200連=6万円）で何ポイント貯まりますか？', 'ウマ娘の200連は固定で6万円ですか？', 'Uma FAQ question');
  html = replaceAllRequired(html, '通常時で約600ポイント、Google Playポイント5倍キャンペーン時なら約3,000ポイント貯まります。', '200連には通常30,000ジュエルが必要ですが、所持ジュエル・有償/無償・期間限定商品・購入経路で実際の現金負担が変わるため、固定6万円とは断定しません。', 'Uma FAQ answer');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `ウマスク・ウマプラン・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="umamusume"><h2>終了済みのデイリージュエルパックを現行商品から除外</h2><p>デイリージュエルパックは2024年12月19日4:59に終了しています。現在の月額ウマスク980円、ウマプラン1,980円、または実際の課金予定額を使って計算します。</p><p><a href="./umasuku-value/">ウマスク980円の特典・受取仕様・Play Pointsを詳しく見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="umamusume"', 'Uma guide block');
  if (writeIfChanged(rootDir, file, html)) changedFiles.push(file);
  return changedFiles;
}

function syncProseka(rootDir) {
  const file = 'games/proseka/index.html';
  let html = read(rootDir, file);
  const block = `<section class="section" data-game-seo-guide="proseka"><h2>公式WebStoreとGoogle Playは別の購入経路</h2><p>プロセカ公式WebStoreには現在のクリスタル・カラフルパス・ミッションパス価格が公開されています。ただしWebStore購入をGoogle Play購入として扱わず、Play PointsはGoogle Play側の購入確認画面で比較します。</p><p><a href="./google-play-vs-webstore/">公式WebStoreの価格とPlay Pointsの比較を見る ➔</a></p></section>`;
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="proseka"', 'Proseka guide block');
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `プロセカ購入経路・Play Points確認：${VERIFIED_AT}`);
  return writeIfChanged(rootDir, file, html);
}

function syncGameSeoExpanded(rootDir) {
  const changedFiles = [];
  const checks = [
    ['games/starrail/index.html', syncStarrail],
    ['games/zzz/index.html', syncZzz],
    ['games/proseka/index.html', syncProseka]
  ];
  for (const [file, sync] of checks) {
    if (sync(rootDir)) changedFiles.push(file);
  }
  changedFiles.push(...syncUmamusume(rootDir));

  const guides = [
    ['games/starrail/supply-pass-value/index.html', renderStarrailGuide()],
    ['games/zzz/membership-value/index.html', renderZzzGuide()],
    ['games/umamusume/umasuku-value/index.html', renderUmasukuGuide()],
    ['games/proseka/google-play-vs-webstore/index.html', renderProsekaGuide()]
  ];
  for (const [file, content] of guides) {
    if (writeIfChanged(rootDir, file, content)) changedFiles.push(file);
  }
  return { checked: checks.length + 1 + guides.length, changedFiles: [...new Set(changedFiles)].sort() };
}

module.exports = { syncGameSeoExpanded };
