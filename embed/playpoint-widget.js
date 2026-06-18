(function () {
    'use strict';

    class PlayPointWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; max-width: 420px; color: #263238; font-family: "Yu Gothic", "YuGothic", Meiryo, sans-serif; }
                    .widget { padding: 18px; border: 1px solid #cbd5e1; border-radius: 14px; background: linear-gradient(145deg, #f8fbff, #eef4ff); box-shadow: 0 8px 24px rgba(15, 23, 42, .08); }
                    h2 { margin: 0 0 8px; font-size: 1.15rem; }
                    p { margin: 0 0 14px; font-size: .9rem; line-height: 1.6; }
                    label { display: block; margin-top: 10px; font-size: .88rem; font-weight: 700; }
                    input, select, button { box-sizing: border-box; width: 100%; min-height: 44px; margin-top: 5px; border-radius: 8px; font-size: 16px; }
                    input, select { padding: 8px 10px; border: 1px solid #94a3b8; background: #fff; }
                    button { border: 0; background: #1f9d55; color: #fff; font-weight: 700; cursor: pointer; }
                    button:hover { background: #178148; }
                    output { display: block; min-height: 24px; margin-top: 14px; padding: 10px; border-radius: 8px; background: #fff; font-weight: 700; }
                    .error { color: #b4232c; }
                    a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; color: #0b57d0; font-size: .85rem; font-weight: 700; }
                </style>
                <section class="widget" aria-labelledby="pp-widget-title">
                    <h2 id="pp-widget-title">Playポイント簡易計算</h2>
                    <p>課金額から獲得ポイントの目安を計算します。</p>
                    <label>課金額（円）<input id="amount" type="number" min="0" max="100000000" inputmode="numeric" placeholder="例：5000"></label>
                    <label>100円あたりのポイント
                        <select id="rate">
                            <option value="1">ブロンズ：1.00pt</option>
                            <option value="1.25">シルバー：1.25pt</option>
                            <option value="1.5">ゴールド：1.50pt</option>
                            <option value="1.75">プラチナ：1.75pt</option>
                            <option value="2">ダイヤモンド：2.00pt</option>
                        </select>
                    </label>
                    <button id="calculate" type="button">ポイントを計算</button>
                    <output id="result" aria-live="polite">金額を入力してください。</output>
                    <a href="https://playpoint-sim.com/?utm_source=embedded_widget&utm_medium=referral&utm_campaign=widget">詳しい計算機を開く</a>
                </section>
            `;

            this.shadowRoot.getElementById('calculate').addEventListener('click', () => this.calculate());
        }

        calculate() {
            const amount = Number(this.shadowRoot.getElementById('amount').value);
            const rate = Number(this.shadowRoot.getElementById('rate').value);
            const result = this.shadowRoot.getElementById('result');
            if (!Number.isFinite(amount) || amount < 0 || amount > 100000000 || !Number.isFinite(rate) || rate <= 0) {
                result.textContent = '有効な金額を入力してください。';
                result.classList.add('error');
                return;
            }

            const points = Math.round((amount / 100) * rate);
            result.textContent = `獲得ポイントの目安：${points.toLocaleString('ja-JP')}pt`;
            result.classList.remove('error');
        }
    }

    if (!customElements.get('playpoint-widget')) {
        customElements.define('playpoint-widget', PlayPointWidget);
    }

    document.querySelectorAll('[data-playpoint-widget]').forEach((target) => {
        if (!target.querySelector('playpoint-widget')) target.appendChild(document.createElement('playpoint-widget'));
    });
})();
