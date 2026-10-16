'use strict';

// 価格・個数は既存のゲーム商品台帳から渡す。この試作は同じ1万円の商品だけを扱う。
function renderMonstComparison(data) {
  const { appStoreReference: app, webStore: web, monthlyWebStore: monthly } = data;
  if (app.price !== 10000 || web.price !== app.price || monthly.price !== app.price) {
    throw new Error('モンスト購入先比較は同額の1万円商品を確認してから更新してください');
  }
  return `<details class="monst-comparison" id="monst-comparison" hidden
      data-price="${app.price}" data-app-orbs="${app.orbs}" data-web-orbs="${web.orbs}" data-monthly-orbs="${monthly.orbs}">
    <summary>自分の特典で1万円の購入先を比べる</summary>
    <div class="monst-comparison-body">
      <form id="monst-comparison-form" novalidate>
        <label for="monst-play-value">Google Play側の特典価値（円分）</label>
        <input id="monst-play-value" type="number" inputmode="decimal" min="0" max="${app.price}" step="0.01" value="0" aria-describedby="monst-play-value-help monst-comparison-error" required>
        <p id="monst-play-value-help" class="monst-comparison-help">ポイント数ではなく、使う交換先の金額を入力。使う予定がなければ0円です。</p>
        <label class="monst-comparison-check"><input id="monst-monthly-available" type="checkbox">月イチ${monthly.orbs}個の購入枠が残っている</label>
        <details class="monst-comparison-extra"><summary>Web側の還元も含める</summary>
          <label for="monst-web-value">Web側で使える決済還元など（円分）</label>
          <input id="monst-web-value" type="number" inputmode="decimal" min="0" max="${web.price}" step="0.01" value="0" aria-describedby="monst-web-value-help monst-comparison-error" required>
          <p id="monst-web-value-help" class="monst-comparison-help">通常・月イチのどちらでも使える金額を入力。おまけや抽選賞品は含めません。</p>
        </details>
        <p id="monst-comparison-error" class="monst-comparison-error" role="alert" hidden></p>
        <button type="submit">この条件で比べる</button>
      </form>
      <div id="monst-comparison-result" aria-live="polite" aria-atomic="true" hidden>
        <p id="monst-comparison-today"></p>
        <table class="monst-comparison-table">
          <caption>特典を使い切れた場合の比較単価</caption>
          <thead><tr><th scope="col">購入先</th><th scope="col">受取個数</th><th scope="col">円／個</th></tr></thead>
          <tbody>
            <tr><th scope="row">Google Play</th><td>${app.orbs}個</td><td id="monst-app-unit"></td></tr>
            <tr><th scope="row">Web通常</th><td>${web.orbs}個</td><td id="monst-web-unit"></td></tr>
            <tr id="monst-monthly-row" hidden><th scope="row">Web月イチ</th><td>${monthly.orbs}個</td><td id="monst-monthly-unit"></td></tr>
          </tbody>
        </table>
        <p id="monst-comparison-conclusion"></p>
        <p class="monst-comparison-help">どの経路も今日の支払額は1万円です。将来の特典を差し引く比較で、購入時の値引きやオーブ増量ではありません。</p>
      </div>
      <p class="monst-comparison-help">交換条件・期限と購入画面の表示を確認して利用してください。<a href="/articles/2026-09-19-monst-web-shop-vs-google-play.html">計算式・特典価値の考え方を見る</a></p>
    </div>
  </details>`;
}

module.exports = { renderMonstComparison };
