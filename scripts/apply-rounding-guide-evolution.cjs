'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const registryPath = path.join(root, 'blog', 'articles.json');
const editorialPath = path.join(root, 'scripts', 'article-editorial-structure.cjs');
const browserScriptPath = path.join(root, 'js', 'play-points-rounding.js');
const testPath = path.join(root, 'tests', 'play-points-rounding-guide.test.cjs');

function replaceOrThrow(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`更新対象が見つかりません: ${label}`);
  return source.replace(pattern, replacement);
}

const articleHtml = String.raw`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="author" content="かたかた" />
  <meta name="last-modified" content="2026-08-03" />
  <meta name="article:category" content="使い方" />
  <meta property="article:published_time" content="2026-07-24T00:00:00+09:00" />
  <meta property="article:modified_time" content="2026-08-03T00:00:00+09:00" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <title>Google Play Points 1ポイントはいくら？100円で何ポイント貯まるか</title>
  <meta name="description" content="Google Play Pointsの計算を、税抜の対象価格、商品ごとの四捨五入、分割購入と合計計算の差から解説。日本のステータス別獲得率を使える比較シミュレーター付きです。" />
  <link rel="canonical" href="https://playpoint-sim.com/articles/2026-07-24-play-points-1-value.html" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="Google Play Points 1ポイントはいくら？税抜価格・丸め方を解説" />
  <meta property="og:description" content="税金を除く対象価格と商品ごとの四捨五入を基準に、分割購入と合計計算で差が出る理由を整理します。" />
  <meta property="og:url" content="https://playpoint-sim.com/articles/2026-07-24-play-points-1-value.html" />
  <meta property="og:image" content="https://playpoint-sim.com/articles/ogp/getting-started.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="/articles/article-modern.css?v=59b39a295e" />
  <link rel="stylesheet" href="./article-shared.css?v=309339d951" />
  <style>
    .rounding-simulator { padding: 1.25rem; border: 1px solid var(--border); border-radius: 12px; background: #f7f9fc; }
    .rounding-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .rounding-field label { display: block; margin-bottom: 0.35rem; font-weight: 700; }
    .rounding-field input, .rounding-field select { width: 100%; min-height: 46px; padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; background: #fff; color: var(--text); font: inherit; }
    .rounding-action { margin-top: 1rem; min-height: 48px; padding: 0.75rem 1.2rem; border: 0; border-radius: 8px; background: var(--interaction); color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    .rounding-action:hover { background: var(--interaction-hover); }
    .rounding-result { margin-top: 1rem; padding: 1rem; border-left: 4px solid var(--brand); background: #fff; }
    .rounding-result dl { display: grid; grid-template-columns: minmax(10rem, 1fr) 1fr; gap: 0.45rem 1rem; }
    .rounding-result dt { font-weight: 700; }
    .rounding-result dd { margin: 0; text-align: right; }
    @media (max-width: 700px) { .rounding-fields { grid-template-columns: 1fr; } .rounding-result dl { grid-template-columns: 1fr; } .rounding-result dd { text-align: left; margin-bottom: 0.45rem; } }
  </style>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"Article",
    "mainEntityOfPage":{"@type":"WebPage","@id":"https://playpoint-sim.com/articles/2026-07-24-play-points-1-value.html"},
    "headline":"Google Play Points 1ポイントはいくら？100円で何ポイント貯まるか",
    "description":"Google Play Pointsの税抜対象価格、商品ごとの四捨五入、分割購入と合計計算の差を解説します。",
    "inLanguage":"ja",
    "datePublished":"2026-07-24",
    "dateModified":"2026-08-03",
    "image":"https://playpoint-sim.com/articles/ogp/getting-started.png",
    "author":{"@type":"Person","name":"かたかた","url":"https://playpoint-sim.com/author/katakata.html"},
    "publisher":{"@type":"Organization","name":"Playポイント計算機","url":"https://playpoint-sim.com/","logo":{"@type":"ImageObject","url":"https://playpoint-sim.com/favicon.svg"}}
  }
  </script>
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {"@type":"Question","name":"Google Play Pointsは税込価格と税抜価格のどちらで計算されますか？","acceptedAnswer":{"@type":"Answer","text":"Google公式は、ポイントの対象はアイテム価格のみで、支払った税金は含まれないと案内しています。日本では表示価格が税込の場合があるため、表示金額をそのまま100で割った結果と一致しないことがあります。"}},
      {"@type":"Question","name":"99円の商品なら必ず1ポイント貯まりますか？","acceptedAnswer":{"@type":"Answer","text":"表示価格だけでは断定できません。対象可否、税金を除いたアイテム価格、ステータス獲得率、キャンペーン条件を使って計算され、最終結果は購入画面とポイント履歴で確認します。"}},
      {"@type":"Question","name":"分割購入とまとめて計算した場合でポイントは変わりますか？","acceptedAnswer":{"@type":"Answer","text":"差が出る場合があります。Google公式はアイテム価格に獲得率を掛け、最も近い整数へ丸めると案内しているため、別々の購入を合計して最後に一度だけ丸める計算は実際の丸めを再現しない場合があります。"}},
      {"@type":"Question","name":"この記事のシミュレーターは実際の付与を保証しますか？","acceptedAnswer":{"@type":"Answer","text":"保証しません。税金を除いた対象価格と獲得率が分かっている場合の丸め方を比較する試算です。対象商品、税額、キャンペーン適用、購入アカウントはGoogle Playの画面で確認してください。"}}
    ]
  }
  </script>
</head>
<body>
<main class="main-card">
  <header class="hero">
    <span class="hero-badge">税抜価格・端数・四捨五入</span>
    <h1>Google Play Points 1ポイントはいくら？100円で何ポイント貯まるか</h1>
    <p class="hero-meta">2026/08/03 更新 ・ 読了 8分</p>
  </header>

  <article class="content">
    <section class="answer-box" aria-labelledby="quick-answer">
      <h2 id="quick-answer">結論：税金を除くアイテム価格に獲得率を掛け、商品ごとに整数へ丸める</h2>
      <p>日本のブロンズは通常、100円ごとに1ポイントが基準です。ただしGoogle公式は、<strong>ポイント対象はアイテム価格のみで税金を含めず</strong>、計算結果を<strong>最も近い整数へ四捨五入</strong>すると案内しています。</p>
      <p>そのため、税込の表示価格を合計して100で割るだけでは、実際の付与ポイントと一致しない場合があります。購入前の獲得予定表示と、購入後のポイント履歴を最終確認に使ってください。</p>
    </section>

    <!-- editorial-summary:start -->
    <!-- editorial-summary:end -->

    <section class="section">
      <h2>公式の計算ルールを3段階で整理</h2>
      <ol>
        <li><strong>対象となるアイテム価格を確認する：</strong>支払った税金はポイント計算に含まれません。</li>
        <li><strong>ステータスの通常獲得率を掛ける：</strong>日本では100円あたり1～2ポイントです。</li>
        <li><strong>最も近い整数へ丸める：</strong>小数のまま残高へ加算されるわけではありません。</li>
      </ol>
      <div class="formula">概算ポイント ＝ 税金を除く対象アイテム価格 ÷ 100 × 獲得率 → 最も近い整数へ丸める</div>
      <p class="note">日本はGoogle Playの表示価格が税込になる場合があります。一方でPlay Pointsは税金を除いて計算されるため、表示価格だけから税抜の計算対象額を正確に逆算できない取引もあります。</p>
    </section>

    <section class="section">
      <h2>日本のステータス別獲得率</h2>
      <div class="table-wrap">
        <table>
          <caption>日本の通常獲得率と税抜500円を例にした丸め</caption>
          <thead><tr><th>ステータス</th><th>100円あたり</th><th>税抜500円の計算</th><th>丸め後</th></tr></thead>
          <tbody>
            <tr><td>ブロンズ</td><td>1ポイント</td><td>500 ÷ 100 × 1 = 5</td><td>5ポイント</td></tr>
            <tr><td>シルバー</td><td>1.25ポイント</td><td>500 ÷ 100 × 1.25 = 6.25</td><td>6ポイント</td></tr>
            <tr><td>ゴールド</td><td>1.5ポイント</td><td>500 ÷ 100 × 1.5 = 7.5</td><td>8ポイント</td></tr>
            <tr><td>プラチナ</td><td>1.75ポイント</td><td>500 ÷ 100 × 1.75 = 8.75</td><td>9ポイント</td></tr>
            <tr><td>ダイヤモンド</td><td>2ポイント</td><td>500 ÷ 100 × 2 = 10</td><td>10ポイント</td></tr>
          </tbody>
        </table>
      </div>
      <p>シルバーの「500円で6ポイント」はGoogle公式にも例示されています。ほかの行は、同じ公式の獲得率と四捨五入ルールを当てはめた計算例です。</p>
    </section>

    <section class="section">
      <h2>分割購入と合計計算で差が出る理由</h2>
      <p>Google公式は、アイテム価格に獲得率を掛けて整数へ丸めると説明しています。このため、複数の別々の購入を最後に合計して一度だけ丸める計算は、購入ごとの丸めを再現しない場合があります。</p>
      <div class="table-wrap">
        <table>
          <caption>税抜40円・ゴールド・2回購入の計算例</caption>
          <thead><tr><th>計算方法</th><th>途中計算</th><th>結果</th></tr></thead>
          <tbody>
            <tr><td>購入ごとに丸める</td><td>40 ÷ 100 × 1.5 = 0.6 → 1ポイント、それを2回</td><td>2ポイント</td></tr>
            <tr><td>合計80円として一度だけ丸める</td><td>80 ÷ 100 × 1.5 = 1.2</td><td>1ポイント</td></tr>
          </tbody>
        </table>
      </div>
      <p class="small">これは丸め方を理解するための数値例です。実際にその価格の商品があることや、対象購入になることを示すものではありません。</p>
    </section>

    <section class="section" id="rounding-simulator-section">
      <h2>購入ごとの丸めと合計計算を比較する</h2>
      <p>税金を除いた対象価格が分かっている場合に、購入ごとに丸めた結果と、総額へ一度だけ丸めた結果を比較できます。税額や対象可否を判定する機能ではありません。</p>
      <div class="rounding-simulator" id="rounding-simulator">
        <div class="rounding-fields">
          <div class="rounding-field">
            <label for="rounding-price">1回の対象価格（税抜・円）</label>
            <input id="rounding-price" type="number" min="0" step="1" value="500" inputmode="numeric" />
          </div>
          <div class="rounding-field">
            <label for="rounding-count">同じ価格の購入回数</label>
            <input id="rounding-count" type="number" min="1" max="1000" step="1" value="2" inputmode="numeric" />
          </div>
          <div class="rounding-field">
            <label for="rounding-rate">100円あたりの獲得率</label>
            <select id="rounding-rate">
              <option value="1">ブロンズ：1</option>
              <option value="1.25" selected>シルバー：1.25</option>
              <option value="1.5">ゴールド：1.5</option>
              <option value="1.75">プラチナ：1.75</option>
              <option value="2">ダイヤモンド：2</option>
            </select>
          </div>
        </div>
        <button class="rounding-action" id="rounding-calculate" type="button">丸め方を比較する</button>
        <div class="rounding-result" id="rounding-result" aria-live="polite"></div>
      </div>
    </section>

    <section class="section">
      <h2>税込表示から単純に逆算しない</h2>
      <p>Google Playでは、購入手続きの完了前に適用される税金が表示されます。また、日本は表示価格へ税を含める内税方式の対象地域です。一方、Play Pointsの公式計算では税金を含めません。</p>
      <p>したがって「表示価格が550円だから税抜500円」と常に決め打ちするのではなく、注文情報、購入前の獲得予定ポイント、購入後のポイント履歴を確認する方が安全です。コンテンツの種類や販売者によって税金の処理が異なる場合があります。</p>
    </section>

    <section class="section">
      <h2>キャンペーンとクーポン利用時の注意</h2>
      <ul>
        <li>キャンペーン倍率は、対象商品・対象期間・有効化条件を満たす場合だけ適用します。</li>
        <li>複数のプロモーションは、同じ購入へ重ねて使えないとGoogleは案内しています。</li>
        <li>クーポンや割引利用後のポイントは、購入画面の支払額と獲得予定表示を確認します。</li>
        <li>別のGoogleアカウントで購入すると、確認中のアカウントへポイントは付きません。</li>
      </ul>
      <p><a href="./2025-12-25-campaign.html">キャンペーンを待つべきか判断する方法</a>と、<a href="./2026-07-25-play-points-coupon-not-applied.html">クーポンが適用されない時の確認順</a>も参照してください。</p>
    </section>

    <section class="section">
      <h2>よくある質問</h2>
      <div class="faq-item"><h3>Google Play Pointsは税込価格と税抜価格のどちらで計算されますか？</h3><p>Google公式は、ポイントの対象はアイテム価格のみで、支払った税金は含まれないと案内しています。日本では表示価格が税込の場合があるため、表示金額をそのまま100で割った結果と一致しないことがあります。</p></div>
      <div class="faq-item"><h3>99円の商品なら必ず1ポイント貯まりますか？</h3><p>表示価格だけでは断定できません。対象可否、税金を除いたアイテム価格、ステータス獲得率、キャンペーン条件を使って計算され、最終結果は購入画面とポイント履歴で確認します。</p></div>
      <div class="faq-item"><h3>分割購入とまとめて計算した場合でポイントは変わりますか？</h3><p>差が出る場合があります。Google公式はアイテム価格に獲得率を掛け、最も近い整数へ丸めると案内しているため、別々の購入を合計して最後に一度だけ丸める計算は実際の丸めを再現しない場合があります。</p></div>
      <div class="faq-item"><h3>この記事のシミュレーターは実際の付与を保証しますか？</h3><p>保証しません。税金を除いた対象価格と獲得率が分かっている場合の丸め方を比較する試算です。対象商品、税額、キャンペーン適用、購入アカウントはGoogle Playの画面で確認してください。</p></div>
    </section>

    <aside class="official-source-note source-list">
      <h2>Google公式情報</h2>
      <ul>
        <li><a href="https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&amp;hl=ja" target="_blank" rel="noopener noreferrer">Google Play ポイントを貯める、管理する</a></li>
        <li><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&amp;hl=ja" target="_blank" rel="noopener noreferrer">日本のステータスと通常獲得率</a></li>
        <li><a href="https://support.google.com/googleplay/answer/2850368?hl=ja" target="_blank" rel="noopener noreferrer">Google Playでの購入にかかる税金の情報</a></li>
        <li><a href="https://support.google.com/googleplay/android-developer/answer/138000?hl=ja" target="_blank" rel="noopener noreferrer">表示価格へ税を含める地域の公式案内</a></li>
      </ul>
      <p class="small">公式情報の最終確認日：2026年8月3日。個別の獲得予定ポイントはGoogle Playの購入画面とポイント履歴を優先してください。</p>
    </aside>

    <section class="cta-box" aria-labelledby="calculator-cta">
      <h2 id="calculator-cta">目標ポイントまでの必要額を計算する</h2>
      <p>丸め比較とは別に、現在ステータスと確認済みの倍率から必要額の目安を逆算できます。</p>
      <a class="cta-btn" href="../points-cost/?points=1">1ポイントから必要額を計算</a>
    </section>

    <section class="section related-links-section">
      <h2>次に確認する記事</h2>
      <ul>
        <li><a href="./2026-07-24-play-points-100-value.html">100ポイントの必要額と使う価値</a></li>
        <li><a href="./2026-07-24-play-points-500-1000-value.html">500・1,000ポイントの必要額早見表</a></li>
        <li><a href="./2025-12-25-check-balance.html">購入後のポイント履歴を確認する</a></li>
        <li><a href="./2026-03-10-play-points-reflection-timing.html">計算と履歴が合わない時の確認順</a></li>
      </ul>
    </section>
  </article>

  <aside class="author-box" aria-label="この記事の著者">
    <p class="author-box-label">この記事を書いた人</p>
    <p class="author-box-name"><a href="../author/katakata.html" rel="author">かたかた</a> — Playポイント計算機 運営・編集</p>
    <p>Google Play公式の計算条件と、サイト内のシミュレーションで扱える範囲を分けて掲載しています。<a href="../author/katakata.html">運営者・記事の検証方針を見る</a></p>
  </aside>
  <nav id="article-nav" class="article-nav"></nav>
  <footer class="article-footer"><p><a href="../blog/">記事一覧へ戻る</a> ｜ <a href="../">計算機トップへ</a></p><p class="small">本記事は購入を勧めるものではありません。実際の付与数はGoogle Playの表示をご確認ください。</p></footer>
</main>
<script src="../js/play-points-rounding.js" defer></script>
<script src="../blog/article.js?v=2cac3022ad"></script>
<script src="../blog/components.js?v=784e955c93"></script>
</body>
</html>
`;

const browserScript = String.raw`'use strict';

(function attachPlayPointsRounding(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayPointsRounding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPlayPointsRounding() {
  function toFiniteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(label + 'は数値で入力してください。');
    return number;
  }

  function roundPoints(value) {
    const number = toFiniteNumber(value, 'ポイント');
    if (number < 0) throw new RangeError('ポイントは0以上で計算してください。');
    return Math.round(number);
  }

  function calculatePurchasePoints(input) {
    const price = toFiniteNumber(input.price, '対象価格');
    const count = toFiniteNumber(input.count, '購入回数');
    const rate = toFiniteNumber(input.rate, '獲得率');

    if (price < 0) throw new RangeError('対象価格は0円以上で入力してください。');
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      throw new RangeError('購入回数は1～1000の整数で入力してください。');
    }
    if (rate <= 0) throw new RangeError('獲得率は0より大きい値を選んでください。');

    const perPurchaseRaw = price / 100 * rate;
    const perPurchaseRounded = roundPoints(perPurchaseRaw);
    const separateTotal = perPurchaseRounded * count;
    const combinedRaw = price * count / 100 * rate;
    const combinedRounded = roundPoints(combinedRaw);

    return {
      price,
      count,
      rate,
      perPurchaseRaw,
      perPurchaseRounded,
      separateTotal,
      combinedRaw,
      combinedRounded,
      difference: separateTotal - combinedRounded
    };
  }

  function formatDecimal(value) {
    return Number(value.toFixed(4)).toLocaleString('ja-JP');
  }

  function renderResult(resultElement, result) {
    const differenceText = result.difference === 0
      ? '差はありません'
      : result.difference > 0
        ? '購入ごとの丸めが ' + result.difference + 'ポイント多い試算'
        : '合計後の丸めが ' + Math.abs(result.difference) + 'ポイント多い試算';

    resultElement.innerHTML = '<dl>'
      + '<dt>1回の丸め前</dt><dd>' + formatDecimal(result.perPurchaseRaw) + 'ポイント</dd>'
      + '<dt>1回の丸め後</dt><dd>' + result.perPurchaseRounded.toLocaleString('ja-JP') + 'ポイント</dd>'
      + '<dt>購入ごとに丸めた合計</dt><dd><strong>' + result.separateTotal.toLocaleString('ja-JP') + 'ポイント</strong></dd>'
      + '<dt>総額へ一度だけ丸めた場合</dt><dd>' + result.combinedRounded.toLocaleString('ja-JP') + 'ポイント</dd>'
      + '<dt>比較結果</dt><dd>' + differenceText + '</dd>'
      + '</dl><p class="small">税額・対象可否・キャンペーン条件は計算していません。実際の付与はGoogle Playの表示を確認してください。</p>';
  }

  function initRoundingSimulator(doc) {
    if (!doc) return false;
    const priceInput = doc.getElementById('rounding-price');
    const countInput = doc.getElementById('rounding-count');
    const rateInput = doc.getElementById('rounding-rate');
    const button = doc.getElementById('rounding-calculate');
    const resultElement = doc.getElementById('rounding-result');
    if (!priceInput || !countInput || !rateInput || !button || !resultElement) return false;

    const calculateAndRender = function calculateAndRender() {
      try {
        renderResult(resultElement, calculatePurchasePoints({
          price: priceInput.value,
          count: countInput.value,
          rate: rateInput.value
        }));
      } catch (error) {
        resultElement.textContent = error.message;
      }
    };

    button.addEventListener('click', calculateAndRender);
    calculateAndRender();
    return true;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function onReady() {
        initRoundingSimulator(document);
      }, { once: true });
    } else {
      initRoundingSimulator(document);
    }
  }

  return { calculatePurchasePoints, initRoundingSimulator, roundPoints };
});
`;

const testContent = String.raw`'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { calculatePurchasePoints, roundPoints } = require('../js/play-points-rounding.js');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const registryPath = path.join(root, 'blog', 'articles.json');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function normalizeText(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

test('公式例のシルバー500円は6ポイントへ丸める', () => {
  const result = calculatePurchasePoints({ price: 500, count: 1, rate: 1.25 });
  assert.equal(result.perPurchaseRaw, 6.25);
  assert.equal(result.perPurchaseRounded, 6);
  assert.equal(result.separateTotal, 6);
});

test('購入ごとの丸めと総額への一度だけの丸めを分ける', () => {
  const result = calculatePurchasePoints({ price: 40, count: 2, rate: 1.5 });
  assert.equal(result.perPurchaseRounded, 1);
  assert.equal(result.separateTotal, 2);
  assert.equal(result.combinedRounded, 1);
  assert.equal(result.difference, 1);
});

test('丸め関数は非負のポイントを最も近い整数へ丸める', () => {
  assert.equal(roundPoints(6.25), 6);
  assert.equal(roundPoints(7.5), 8);
  assert.throws(() => roundPoints(-0.1), /0以上/);
});

test('不正な購入回数と獲得率を拒否する', () => {
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 0, rate: 1 }), /1～1000/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1.5, rate: 1 }), /整数/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1, rate: 0 }), /0より大きい/);
});

test('記事は税抜・商品ごとの丸め・限界を明示する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /ポイント対象はアイテム価格のみで税金を含めず/);
  assert.match(html, /最も近い整数へ四捨五入/);
  assert.match(html, /分割購入と合計計算で差が出る理由/);
  assert.match(html, /税額や対象可否を判定する機能ではありません/);
  assert.match(html, /play-points-rounding\.js/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/2850368/);
});

test('画面のFAQとFAQPage構造化データが一致する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  const scripts = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const faqPage = scripts.find(item => item['@type'] === 'FAQPage');
  assert.ok(faqPage);

  const visible = [...html.matchAll(/<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g)]
    .map(match => ({ name: normalizeText(match[1]), answer: normalizeText(match[2]) }));
  const structured = faqPage.mainEntity.map(item => ({
    name: normalizeText(item.name),
    answer: normalizeText(item.acceptedAnswer.text)
  }));
  assert.deepEqual(structured, visible);
});

test('記事台帳は既存記事の役割を維持して更新日と説明を同期する', () => {
  const articles = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const entry = articles.find(article => article.id === 'points-value-1');
  assert.ok(entry);
  assert.equal(entry.modified, '2026-08-03');
  assert.match(entry.description, /商品ごとの四捨五入/);
  assert.equal(articles.filter(article => /丸め|端数/.test(article.title)).length, 0,
    '既存記事と重複する丸め専用記事を追加しないでください');
});
`;

fs.writeFileSync(articlePath, articleHtml.replace(/\r\n/g, '\n'), 'utf8');
fs.writeFileSync(browserScriptPath, browserScript.replace(/\r\n/g, '\n'), 'utf8');
fs.writeFileSync(testPath, testContent.replace(/\r\n/g, '\n'), 'utf8');

const articles = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const entry = articles.find(article => article.id === 'points-value-1');
if (!entry) throw new Error('記事台帳に points-value-1 がありません。');
entry.modified = '2026-08-03';
entry.description = 'Google Play Pointsの計算を、税抜の対象価格、商品ごとの四捨五入、分割購入と合計計算の差から解説。日本のステータス別獲得率を使える比較シミュレーター付きです。';
entry.tags = [...new Set([...entry.tags, '丸め', '税抜'])];
fs.writeFileSync(registryPath, `${JSON.stringify(articles, null, 2)}\n`, 'utf8');

let editorial = fs.readFileSync(editorialPath, 'utf8');
editorial = replaceOrThrow(
  editorial,
  /  'articles\/2026-07-24-play-points-1-value\.html': \{[\s\S]*?\n  \},\n  'articles\/2026-07-24-play-points-100-value\.html': \{/,
  `  'articles/2026-07-24-play-points-1-value.html': {\n    modifiedDate: '2026-08-03',\n    known: [\n      'ポイントの対象は税金を除いたアイテム価格で、最も近い整数へ丸める計算方法はGoogle公式で確認できます。',\n      '日本のステータス別通常獲得率は100円あたり1～2ポイントです。'\n    ],\n    unknown: [\n      '税込の表示価格だけから、個別取引の税抜対象価格を常に正確に逆算できるとは限りません。',\n      '対象可否、キャンペーン適用、実際の付与数は購入画面とポイント履歴が最終判断です。'\n    ],\n    comparisonHref: '/compare/earning-rates/#status-rates',\n    comparisonLabel: 'ステータス別獲得率の引用用比較表を見る'\n  },\n  'articles/2026-07-24-play-points-100-value.html': {`,
  '1ポイント記事の編集設定'
);
editorial = replaceOrThrow(
  editorial,
  /    let html = fs\.readFileSync\(absolutePath, 'utf8'\)\.replace\(EDITORIAL_MARKER_PATTERN, '\\n'\);\n    const knowledge/,
  `    const targetModifiedDate = config.modifiedDate || EDITORIAL_MODIFIED_DATE;\n    let html = fs.readFileSync(absolutePath, 'utf8').replace(EDITORIAL_MARKER_PATTERN, '\\n');\n    const knowledge`,
  '記事別更新日の初期化'
);
editorial = replaceOrThrow(
  editorial,
  /    html = updateDateMetadata\(html, EDITORIAL_MODIFIED_DATE\)/,
  '    html = updateDateMetadata(html, targetModifiedDate)',
  '記事別更新日の適用'
);
editorial = replaceOrThrow(
  editorial,
  /  const targetFiles = new Set\(Object\.keys\(EDITORIAL_TARGETS\)\.map\(file => `\.\.\/\$\{file\}`\)\);\n  for \(const article of articles\) \{\n    if \(targetFiles\.has\(article\.file\)\) article\.modified = EDITORIAL_MODIFIED_DATE;\n  \}/,
  `  const targetDates = new Map(Object.entries(EDITORIAL_TARGETS).map(([file, config]) => [\n    \`../\${file}\`,\n    config.modifiedDate || EDITORIAL_MODIFIED_DATE\n  ]));\n  for (const article of articles) {\n    if (targetDates.has(article.file)) article.modified = targetDates.get(article.file);\n  }`,
  '記事台帳への記事別更新日反映'
);
fs.writeFileSync(editorialPath, editorial.replace(/\r\n/g, '\n'), 'utf8');

console.log('丸め計算ガイド、比較シミュレーター、回帰テストを更新しました。');
