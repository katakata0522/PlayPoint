'use strict';

(() => {
    function compareMonstPurchases(config, playValue, webValue, monthlyAvailable) {
        if (!config || !['price', 'appOrbs', 'webOrbs', 'monthlyOrbs'].every(key => Number.isFinite(config[key]) && config[key] > 0)) {
            throw new TypeError('商品の価格と個数を確認できません');
        }
        if (![playValue, webValue].every(value => Number.isFinite(value) && value >= 0 && value <= config.price)) {
            throw new RangeError('特典価値は0円から購入金額までで入力してください');
        }
        const rows = [
            { id: 'app', name: 'Google Play', orbs: config.appOrbs, unit: (config.price - playValue) / config.appOrbs },
            { id: 'web', name: 'Web通常', orbs: config.webOrbs, unit: (config.price - webValue) / config.webOrbs }
        ];
        if (monthlyAvailable) rows.push({ id: 'monthly', name: 'Web月イチ', orbs: config.monthlyOrbs, unit: (config.price - webValue) / config.monthlyOrbs });
        const minimum = Math.min(...rows.map(row => row.unit));
        return { rows, winners: rows.filter(row => Math.abs(row.unit - minimum) < 1e-9).map(row => row.name) };
    }

    if (typeof module === 'object' && module.exports) module.exports = { compareMonstPurchases };
    if (typeof document === 'undefined') return;
    function initialize() {
        const root = document.getElementById('monst-comparison');
        if (!root) return;
        const form = root.querySelector('form');
        const play = root.querySelector('#monst-play-value');
        const web = root.querySelector('#monst-web-value');
        const monthly = root.querySelector('#monst-monthly-available');
        const result = root.querySelector('#monst-comparison-result');
        const error = root.querySelector('#monst-comparison-error');
        const config = {
            price: Number(root.dataset.price), appOrbs: Number(root.dataset.appOrbs),
            webOrbs: Number(root.dataset.webOrbs), monthlyOrbs: Number(root.dataset.monthlyOrbs)
        };
        const emitted = new Set();
        function trackOnce(name) {
            if (emitted.has(name)) return;
            emitted.add(name);
            // 入力額・ポイント残高・交換先は送信しない。同意と送信待ちは共有基盤へ任せる。
            window.PlayPointAnalytics?.track(name, { game_id: 'monst', region: 'JP' });
        }
        root.addEventListener('toggle', () => {
            if (root.open) trackOnce('purchase_comparison_opened');
        });
        // 条件変更後は前の条件の結論を隠し、再計算を明示的に行う。
        form.addEventListener('input', () => { result.hidden = true; });
        form.addEventListener('submit', event => {
            event.preventDefault();
            error.hidden = true;
            result.hidden = true;
            for (const field of [play, web]) {
                const number = Number(field.value);
                const valid = field.value.trim() !== '' && field.validity.valid && Number.isFinite(number) && number >= 0 && number <= config.price;
                field.setAttribute('aria-invalid', String(!valid));
                if (!valid) {
                    if (field === web) root.querySelector('.monst-comparison-extra').open = true;
                    error.textContent = '特典価値を0〜10,000円の数値で入力してください。';
                    error.hidden = false;
                    field.focus();
                    return;
                }
            }
            let comparison;
            try {
                comparison = compareMonstPurchases(config, Number(play.value), Number(web.value), monthly.checked);
            } catch (failure) {
                error.textContent = failure.message;
                error.hidden = false;
                return;
            }
            const format = new Intl.NumberFormat('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            for (const row of comparison.rows) root.querySelector('#monst-' + row.id + '-unit').textContent = format.format(row.unit);
            root.querySelector('#monst-monthly-row').hidden = !monthly.checked;
            root.querySelector('#monst-comparison-today').textContent = monthly.checked
                ? `今すぐのオーブ数は、Google Play ${config.appOrbs}個・Web通常${config.webOrbs}個・月イチ${config.monthlyOrbs}個です。`
                : `月イチを除くと、今すぐのオーブ数はGoogle Play ${config.appOrbs}個・Web通常${config.webOrbs}個です。`;
            root.querySelector('#monst-comparison-conclusion').textContent = comparison.winners.length > 1
                ? `${comparison.winners.join('と')}の比較単価が同じです。`
                : `入力した特典価値を含めると、比較単価が小さいのは${comparison.winners[0]}です。`;
            result.hidden = false;
            trackOnce('purchase_comparison_completed');
        });
        root.hidden = false;
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
})();
