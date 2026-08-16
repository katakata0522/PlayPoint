/**
 * PlayPoint Game-Specific Simulator Logic
 * Zero-dependency, accurate Google Play Points calculator for popular mobile games.
 */
(function() {
    'use strict';

    const RANKS = [
        { name: 'ブロンズ', points: 0, rate: 1.0 },
        { name: 'シルバー', points: 250, rate: 1.25 },
        { name: 'ゴールド', points: 1000, rate: 1.5 },
        { name: 'プラチナ', points: 4000, rate: 1.75 },
        { name: 'ダイヤモンド', points: 15000, rate: 2.0 }
    ];

    function calculateGamePoints(amount, multiplier, currentStatusRate) {
        const validAmount = Math.max(0, parseInt(amount, 10) || 0);
        const validMult = Math.max(1, parseFloat(multiplier) || 1);
        const rate = Math.max(currentStatusRate || 1.0, validMult);

        // Google Play公式仕様: 税抜価格（約100円）× 還元率 → 最も近い整数に丸め
        const points = Math.round((validAmount / 100) * rate);
        return {
            amount: validAmount,
            rate: rate,
            points: points
        };
    }

    function getReachedRank(totalEarnedPoints) {
        let reached = RANKS[0];
        let nextRank = RANKS[1];

        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (totalEarnedPoints >= RANKS[i].points) {
                reached = RANKS[i];
                nextRank = RANKS[i + 1] || null;
                break;
            }
        }

        return {
            current: reached,
            next: nextRank,
            neededForNext: nextRank ? Math.max(0, nextRank.points - totalEarnedPoints) : 0,
            progressPercent: nextRank
                ? Math.min(100, Math.round(((totalEarnedPoints - reached.points) / (nextRank.points - reached.points)) * 100))
                : 100
        };
    }

    function initGameSimulator() {
        const form = document.getElementById('game-sim-form');
        if (!form) return;

        const packSelect = document.getElementById('sim-pack-select');
        const countInput = document.getElementById('sim-pack-count');
        const customAmountInput = document.getElementById('sim-custom-amount');
        const multSelect = document.getElementById('sim-multiplier');
        const statusSelect = document.getElementById('sim-status');

        // 結果DOM
        const totalAmountEl = document.getElementById('res-total-amount');
        const earnedPointsEl = document.getElementById('res-earned-points');
        const reachedRankEl = document.getElementById('res-reached-rank');
        const nextRankProgressEl = document.getElementById('res-next-progress');
        const rankProgressBar = document.getElementById('res-rank-bar');
        const pointValueYenEl = document.getElementById('res-point-value-yen');

        // プリセットボタン
        const presetBtns = document.querySelectorAll('.preset-btn');

        function update() {
            let amount = 0;
            if (packSelect && countInput && packSelect.value !== 'custom') {
                const unitPrice = parseInt(packSelect.value, 10) || 0;
                const count = Math.max(1, parseInt(countInput.value, 10) || 1);
                amount = unitPrice * count;
                if (customAmountInput) customAmountInput.value = amount;
            } else if (customAmountInput) {
                amount = parseInt(customAmountInput.value, 10) || 0;
            }

            const mult = multSelect ? parseFloat(multSelect.value) : 1;
            const statusRate = statusSelect ? parseFloat(statusSelect.value) : 1.0;

            const res = calculateGamePoints(amount, mult, statusRate);
            const rankInfo = getReachedRank(res.points);

            if (totalAmountEl) totalAmountEl.textContent = res.amount.toLocaleString('ja-JP') + ' 円';
            if (earnedPointsEl) earnedPointsEl.textContent = res.points.toLocaleString('ja-JP') + ' pt';
            if (pointValueYenEl) pointValueYenEl.textContent = '約 ' + res.points.toLocaleString('ja-JP') + ' 円分';

            if (reachedRankEl) {
                reachedRankEl.textContent = rankInfo.current.name;
            }

            if (nextRankProgressEl && rankProgressBar) {
                if (rankInfo.next) {
                    nextRankProgressEl.textContent = `${rankInfo.next.name}まであと ${rankInfo.neededForNext.toLocaleString('ja-JP')} pt`;
                    rankProgressBar.style.width = `${rankInfo.progressPercent}%`;
                } else {
                    nextRankProgressEl.textContent = '最高ランク（ダイヤモンド）達成！';
                    rankProgressBar.style.width = '100%';
                }
            }
        }

        if (presetBtns.length) {
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    const targetAmount = btn.getAttribute('data-amount');
                    const targetMult = btn.getAttribute('data-mult');

                    if (targetAmount && customAmountInput) {
                        customAmountInput.value = targetAmount;
                        if (packSelect) packSelect.value = 'custom';
                    }
                    if (targetMult && multSelect) {
                        multSelect.value = targetMult;
                    }
                    update();
                });
            });
        }

        if (packSelect) {
            packSelect.addEventListener('change', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                if (countInput) countInput.style.display = packSelect.value === 'custom' ? 'none' : 'inline-block';
                update();
            });
        }

        [countInput, customAmountInput, multSelect, statusSelect].forEach(el => {
            if (el) {
                el.addEventListener('input', () => {
                    presetBtns.forEach(b => b.classList.remove('active'));
                    update();
                });
                el.addEventListener('change', update);
            }
        });

        update();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameSimulator);
    } else {
        initGameSimulator();
    }
})();
