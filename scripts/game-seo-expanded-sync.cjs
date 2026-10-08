'use strict';

const { read, writeIfChanged, createGuideShell, createRequiredEdits } = require('./game-seo-common.cjs');
const { replaceAllRequired, insertBeforeRequired } = createRequiredEdits('game-seo-expanded');

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
  const body = `
    <section class="section answer-box" data-editorial-flow="2026-10"><h2>毎日受け取れるなら候補。すぐ必要な星玉とは分けて考える</h2><p>列車補給標章は、購入時の往日の夢華300個と、30日間のログインで受け取る星玉90個ずつを合わせた商品です。夢華を1:1で星玉へ交換し、毎日分もすべて受け取れば<strong>最大3,000星玉相当</strong>になります。</p><p>選ぶときに大切なのは、<span class="marker-yellow">欲しいガチャの終了までに、何日分を受け取れるか</span>です。購入直後に3,000個使える商品ではありません。</p><p class="reader-source">出典：<a href="${SOURCES.starrailSupplyPassReference}" target="_blank" rel="noopener noreferrer">COGNOSPHEREの商品説明：購入時300夢華・ログイン日の90星玉</a></p></section>
    <section class="section"><h2>10日・20日・30日で、使える量はどれくらい？</h2><div class="pack-table-wrap"><table class="pack-table"><caption>購入時の300夢華を1:1で星玉へ交換する場合</caption><thead><tr><th scope="col">受け取った日数</th><th scope="col">毎日分の星玉</th><th scope="col">購入時分を含む星玉相当</th></tr></thead><tbody><tr><th scope="row">10日</th><td>90×10＝900</td><td>1,200</td></tr><tr><th scope="row">20日</th><td>90×20＝1,800</td><td>2,100</td></tr><tr><th scope="row">30日</th><td>90×30＝2,700</td><td>3,000</td></tr></tbody></table></div><p>たとえばガチャ終了までに受け取れるのが10日分なら、その期間に使えるのは最大1,200星玉相当です。残り20日分は後で受け取る分なので、今のガチャの不足分には含めません。</p><p><strong>ログインしなかった日の90星玉は、後からまとめて受け取れない仕組みです。</strong> 30日分の合計より、自分が受け取れる日数で比較すると選びやすくなります。</p></section>
    <section class="section"><h2>即時チャージと迷ったら、必要な日を先に決める</h2><p>日々受け取って次のガチャへ備えるなら、列車補給標章を候補にできます。今日の不足分を埋めたいなら、手持ち・チケット・間に合う配布を引いた残りと、即時に受け取れる商品を比較します。</p><p>同じ支払額でも、初回増量の有無や購入経路で内容が変わることがあります。価格と内容は購入画面を揃えて見てください。日本のGoogle Playの現行価格は、このページでは固定の円額として断定していません。</p></section>
    <section class="section"><h2>Play Pointsは、Google Playから買う分で計算する</h2><p>Google Playでの対象購入ならPlay Pointsを確認できます。HoYoverseの別決済経路で買った分を、そのままGoogle Play購入として加算はしません。経路の違いは<a href="/articles/2026-08-19-web-store-external-billing-points.html">詳しくはこちら</a>です。</p><p>以下は税込1,000円の対象商品を1回購入する場合の例で、列車補給標章の販売価格ではありません。</p>${pointTableHtml(1000)}<p>価格が分かったら、購入予定額と現在のランクを同じゲームの計算機へ入力できます。ゲーム内通貨とPlayポイントは、使い道が違うものとして比べてください。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.starrailSupplyPassReference}" target="_blank" rel="noopener noreferrer">COGNOSPHEREの商品説明（Epic Games）：列車補給標章の内容。Google Play価格の出典ではありません</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">スターレイル Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'starrail', slug: 'supply-pass-value', pageDescription: '崩壊：スターレイルの列車補給標章を最大3,000星玉相当・受取速度・Google Play Pointsで比較。購入価格はGoogle Playの表示で確認します。',
    lead: '列車補給標章を買うか迷ったら、合計量と受け取る日数を分けると判断しやすくなります。10日・20日・30日の具体例で、今のガチャに間に合う分を確認しましょう。',
    body,
    faq: [
      { q: '列車補給標章は何星玉相当ですか？', a: '購入時の往日の夢華300個と、30日すべてログインした場合の星玉90個×30日を合わせ、最大3,000星玉相当です。ログインしなかった日の90星玉は後から受け取れません。' },
      { q: 'ログインしなかった日の星玉はまとめて受け取れますか？', a: 'ログインしなかった日の90星玉は後からまとめて受け取れません。必要な日までに受け取れる日数で比較してください。' }
    ]
  });
}

function renderZzzGuide() {
  const data = GAME_SEO.zzz;
  const pass = data.membership;
  const body = `
    <section class="section"><h2>インターノット会員は最大3,000ポリクローム相当</h2><p>購入時にモノクローム300個、その後30日間にポリクローム90個ずつを受け取る定額型です。30日分をすべて受け取れば2,700ポリクロームなので、モノクローム300個を1:1で換算する前提では<strong>最大3,000ポリクローム相当</strong>です。</p><p>即時に3,000個を受け取る商品ではないため、通常チャージとは「総量」と「受取速度」を分けて比較します。</p></section>
    <section class="section"><h2>価格は購入経路ごとに確認する</h2><p>月パスと通常チャージの価格は、利用地域・購入経路・販売時期で異なる場合があります。このページでは日本のGoogle Playの現行価格を確定できていないため、金額を固定した価格表は掲載していません。購入する商品の価格と内容をGoogle Playの購入画面で確認し、実際の支払予定額を計算機に入力してください。</p></section>
    <section class="section"><h2>90連・180連までの不足通貨と購入額を確認する</h2><p>ガチャ必要量が同じでも、所持ポリクローム、暗号化マスターテープ、インターノット会員、イベント配布、初回増量などで現金負担は変わります。このため固定の円額では示さず、実際に支払う予定額からPlay Pointsを計算します。</p></section>
    <section class="section"><h2>購入額からPlay Pointsを計算する</h2><p>以下は税込1,000円の対象商品を購入する場合の計算例です。月パスの販売価格を示すものではありません。</p>${pointTableHtml(1000)}<p>Play PointsはGoogle Play上の対象購入を基準にします。ゲーム外・Google Play外の決済経路は同じものとして加算しません。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.zzzMembershipReference}" target="_blank" rel="noopener noreferrer">COGNOSPHEREの商品説明（PlayStation）：会員の内容。Google Play価格の出典ではありません</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">ゼンゼロ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'zzz', slug: 'membership-value', pageDescription: 'ゼンレスゾーンゼロのインターノット会員を最大3,000ポリクローム相当・受取速度・Google Play Pointsで比較。購入価格はGoogle Playの表示で確認します。',
    lead: '月パス型のインターノット会員と即時チャージでは、同じ金額でも価値の出方が違います。総量・速度・Play Pointsを分けて確認します。',
    body,
    faq: [
      { q: 'インターノット会員は何ポリクローム相当ですか？', a: '購入時のモノクローム300個と、30日分のポリクローム90個×30日を合わせ、すべて受け取れば最大3,000ポリクローム相当です。' },
      { q: 'ゼンゼロの180連は何円ですか？', a: '所持通貨・チケット・配布・月パス・初回増量で実負担が変わるため、固定の円額としては扱いません。' }
    ]
  });
}

function renderUmasukuGuide() {
  const data = GAME_SEO.umamusume;
  const umasuku = data.umasuku;
  const body = `
    <section class="section"><h2>デイリージュエルパックは終了。現在の月額は「ウマスク」</h2><p>旧「デイリージュエルパック」は<strong>2024年12月19日4:59に販売終了</strong>しています。現在の月額サービスとして公式に案内されている「ウマスク」は<strong>月980円</strong>です。購入する場合は現在販売されているウマスクの内容と更新条件を確認してください。</p></section>
    <section class="section"><h2>ウマスク980円でもらえるもの</h2><ul><li>購入時・更新時：有償ジュエル500個 + 無償ジュエル50個</li><li>ログイン時：無償ジュエル50個を毎日</li><li>育成の対象報酬：2倍（+100%）</li><li>デイリーレースチケット：毎日+3枚</li></ul><p>毎日分の無償ジュエルは未受取があっても<strong>次回ログイン時にまとめてプレゼントへ送られる</strong>と公式WebStoreに明記されています。これはHoYoverse系の月パスのような「未ログイン日は失う」商品とは扱いが違います。</p></section>
    <section class="section"><h2>1か月分のジュエルは有効日数で確認する</h2><p>ウマスクの有効期間は「購入後1か月」で、翌月同日までが基準です。月の日数や購入タイミングで日数が変わるため、日数を一律30日として換算すると、実際にもらえる個数と異なる場合があります。比較するときは、購入/更新時の550個と、実際の有効日数に応じる毎日50個を分けます。</p></section>
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
    <section class="section answer-box" data-editorial-flow="2026-10"><h2>まず欲しい商品を選び、同じ内容で購入先を比べる</h2><p>今すぐクリスタルが必要なら即時に受け取る商品、日々遊びながら貯めたいならカラフルパスが候補になります。公式WebStoreとGoogle Playでは、<span class="marker-yellow">商品の増量・割引とPlay Pointsを分けて比べる</span>ことが大切です。</p><p>WebStoreの購入はGoogle Playの決済ではないため、Play Pointsは見込みません。Google Play側の獲得予定数と、WebStore側の現在の特典を、それぞれの購入画面で確認します。</p><p class="reader-source">出典：<a href="${SOURCES.prosekaWebStore}" target="_blank" rel="noopener noreferrer">Colorful Palette運営の公式ストア</a> ／ <a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Playの獲得条件</a></p></section>
    <section class="section"><h2>公式WebStoreの価格一覧</h2><div class="pack-table-wrap"><table class="pack-table"><caption>2026年10月8日に公式WebStoreで確認した掲載価格</caption><thead><tr><th scope="col">商品</th><th scope="col">価格</th></tr></thead><tbody><tr><td>クリスタルA / B / C / D / E / F / G</td><td>160 / 480 / 1,000 / 1,800 / 3,000 / 4,900 / 10,000円</td></tr><tr><td>クリスタルG×3 / G×5</td><td>30,000 / 50,000円</td></tr><tr><td>プレミアムミッションパス</td><td>${yen(store.premiumMissionPass)}</td></tr><tr><td>マイセカイミッションパス</td><td>${yen(store.mySekaiMissionPass)}</td></tr><tr><td>ミッションパスセット</td><td>${yen(store.missionPassSet)}</td></tr><tr><td>カラフルパス BASIC / DELUXE / PRECIOUS</td><td>480 / 1,500 / 3,000円</td></tr><tr><td>ワールドパス</td><td>${yen(store.worldPass)}</td></tr></tbody></table></div><p>これは<strong>公式WebStoreの価格</strong>です。Google Playアプリ内の価格・内容と同じとは限りません。初回増量には購入回数の条件があり、期間限定の商品・割引もあります。欲しい商品を開いて、今の条件を確認してください。</p></section>
    <section class="section"><h2>カラフルパス3種は、毎日分と追加特典で選ぶ</h2><div class="pack-table-wrap"><table class="pack-table"><caption>カラフルパスの毎日分（有償分・その他の特典を含まない）</caption><thead><tr><th scope="col">種類</th><th scope="col">WebStore価格</th><th scope="col">1日分の無償クリスタル</th><th scope="col">30日分を全て受け取ると</th></tr></thead><tbody><tr><th scope="row">BASIC</th><td>480円</td><td>25</td><td>750</td></tr><tr><th scope="row">DELUXE</th><td>1,500円</td><td>50</td><td>1,500</td></tr><tr><th scope="row">PRECIOUS</th><td>3,000円</td><td>100</td><td>3,000</td></tr></tbody></table></div><p>たとえば毎日分を全て受け取るなら、BASICとDELUXEの差は無償750個、WebStore価格の差は1,020円です。ただし、これだけをクリスタルの販売単価とは見なしません。購入時に受け取る内容や、プランごとの追加特典も商品画面で確認してください。</p><p>追加特典をあまり使わず支出を抑えたいなら、まずBASICから検討できます。上位プランは、増える毎日分や自分が使う追加特典に価格差の価値があるかで選びます。複数のカラフルパスは同時購入できず、有効期間中は他の種類を購入できません。</p><p class="reader-source">出典：<a href="${SOURCES.prosekaFaq}" target="_blank" rel="noopener noreferrer">プロセカ公式FAQ：有償・無償の区別、パスの種類・同時購入条件</a></p></section>
    <section class="section"><h2>有償限定ガチャには、毎日分を数えない</h2><p>カラフルパスの毎日分は<strong>無償クリスタル</strong>です。有償クリスタルが必要なガチャを使いたい場合、合計個数が足りていても、毎日分だけでは条件を満たせません。</p><p>また、30日分の3,000個が購入時にまとめて付くわけでもありません。今日必要な分は手持ちと即時に受け取る分で確認し、後日の分は次の購入計画に分けます。</p></section>
    <section class="section"><h2>Google PlayとWebStoreを比べるときの3点</h2><ol><li>同じ予算で、いつ・何個・有償か無償かを確認する。</li><li>WebStoreの初回増量・セット割などが、自分の購入に適用されるか確認する。</li><li>Google Playでは購入画面の支払額・クーポン・獲得予定ポイントを確認する。</li></ol><p>クリスタル数とPlayポイント数をそのまま足さず、ポイントは予定している交換先で評価します。公式WebStoreと外部決済の違いは、<a href="/articles/2026-08-19-web-store-external-billing-points.html">詳しくはこちら</a>で説明しています。</p></section>
    <section class="section"><h2>出典</h2><ul><li><a href="${SOURCES.prosekaWebStore}" target="_blank" rel="noopener noreferrer">プロセカ公式WebStore：現在の商品・価格</a></li><li><a href="${SOURCES.prosekaFaq}" target="_blank" rel="noopener noreferrer">プロセカ公式FAQ：有償/無償クリスタル・カラフルパス</a></li><li><a href="${SOURCES.googlePlayEarn}" target="_blank" rel="noopener noreferrer">Google Play公式：ポイントの計算方法</a></li></ul></section>
    <p><a class="game-giftcard-cta-btn rakuten-primary-btn" href="../">プロセカ Play Points計算機へ戻る ➔</a></p>`;
  return guideShell({ gameId: 'proseka', slug: 'google-play-vs-webstore', pageDescription: 'プロセカ公式WebStoreの現行価格、カラフルパス3種、ミッションパスとGoogle Play Pointsの違いを整理。WebStoreとGoogle Playを別経路として比較します。',
    lead: '公式WebStoreの価格とカラフルパス3種を、使う時期まで含めて比較します。今日必要なクリスタルと、日々受け取る分を分けると、自分に合う買い方を選びやすくなります。',
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
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `スタレ価格・列車補給標章・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="starrail"><h2>列車補給標章と通常チャージを比較する</h2><p>列車補給標章は購入時の往日の夢華300個と、30日間のログインで得る星玉を合わせて最大3,000星玉相当です。価格はGoogle Playの購入画面で確認し、実際の支払予定額で計算してください。</p><p><a href="./supply-pass-value/">列車補給標章の受取条件とPlay Pointsを詳しく見る ➔</a></p></section>`;
  html = html.replace(/<section class="section" data-game-seo-guide="starrail">[\s\S]*?<\/section>/, block);
  html = insertBeforeRequired(html, '<section class="section game-source-section">', block, 'data-game-seo-guide="starrail"', 'Star Rail guide block');
  return writeIfChanged(rootDir, file, html);
}

function syncZzz(rootDir) {
  const file = 'games/zzz/index.html';
  let html = read(rootDir, file);
  html = html.replace('Play Points獲得率確認：2026年8月（ゲーム内価格・天井は参考値）', `ゼンゼロ価格・インターノット会員・Play Points確認：${VERIFIED_AT}`);
  const block = `<section class="section" data-game-seo-guide="zzz"><h2>インターノット会員と通常チャージを比較する</h2><p>インターノット会員は購入時のモノクローム300個と、30日間のログインで得るポリクロームを合わせて最大3,000ポリクローム相当です。価格はGoogle Playの購入画面で確認してください。</p><p><a href="./membership-value/">インターノット会員の受取条件とPlay Pointsを詳しく見る ➔</a></p></section>`;
  html = html.replace(/<section class="section" data-game-seo-guide="zzz">[\s\S]*?<\/section>/, block);
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
