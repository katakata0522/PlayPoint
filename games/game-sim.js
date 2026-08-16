/**
 * PlayPoint Game-Specific Simulator Logic
 * Zero-dependency, accurate Google Play Points calculator for popular mobile games.
 * Supports Multilingual Locales: Japanese (ja), English (en), Korean (ko), Traditional Chinese (zh-TW).
 */
(function() {
    'use strict';

    const LOCALE_CONFIGS = {
        'ja': {
            unitSpend: 100,
            currencySymbol: '円',
            currencyPrefix: '',
            currencySuffix: ' 円',
            pointValuePrefix: '約 ',
            pointValueSuffix: ' 円分',
            maxRankAchievedText: '最高ランク（ダイヤモンド）達成！',
            nextRankText: (name, pts) => `${name}まであと ${pts.toLocaleString('ja-JP')} pt`,
            ranks: [
                { name: 'ブロンズ', points: 0, rate: 1.0 },
                { name: 'シルバー', points: 250, rate: 1.25 },
                { name: 'ゴールド', points: 1000, rate: 1.5 },
                { name: 'プラチナ', points: 4000, rate: 1.75 },
                { name: 'ダイヤモンド', points: 15000, rate: 2.0 }
            ]
        },
        'en': {
            unitSpend: 1.0,
            currencySymbol: '$',
            currencyPrefix: '$',
            currencySuffix: '',
            pointValuePrefix: 'Approx. $',
            pointValueSuffix: ' value',
            maxRankAchievedText: 'Top level (Diamond) achieved!',
            nextRankText: (name, pts) => `${pts.toLocaleString('en-US')} pts needed for ${name}`,
            ranks: [
                { name: 'Bronze', points: 0, rate: 1.0 },
                { name: 'Silver', points: 150, rate: 1.1 },
                { name: 'Gold', points: 600, rate: 1.2 },
                { name: 'Platinum', points: 3000, rate: 1.4 },
                { name: 'Diamond', points: 10000, rate: 1.75 }
            ]
        },
        'ko': {
            unitSpend: 1000,
            currencySymbol: '원',
            currencyPrefix: '₩',
            currencySuffix: '원',
            pointValuePrefix: '약 ₩',
            pointValueSuffix: ' 상당',
            maxRankAchievedText: '최고 등급(다이아몬드) 달성!',
            nextRankText: (name, pts) => `${name}까지 남은 포인트: ${pts.toLocaleString('ko-KR')} pt`,
            ranks: [
                { name: '브론즈', points: 0, rate: 1.0 },
                { name: '실버', points: 150, rate: 1.1 },
                { name: '골드', points: 600, rate: 1.2 },
                { name: '플래티넘', points: 3000, rate: 1.4 },
                { name: '다이아몬드', points: 10000, rate: 1.75 }
            ]
        },
        'zh-TW': {
            unitSpend: 30,
            currencySymbol: 'NT$',
            currencyPrefix: 'NT$',
            currencySuffix: ' 元',
            pointValuePrefix: '約 NT$',
            pointValueSuffix: ' 等值',
            maxRankAchievedText: '已達成最高等級（鑽石級）！',
            nextRankText: (name, pts) => `距離${name}還差 ${pts.toLocaleString('zh-TW')} 點`,
            ranks: [
                { name: '銅級', points: 0, rate: 1.0 },
                { name: '銀級', points: 250, rate: 1.1 },
                { name: '金級', points: 1000, rate: 1.2 },
                { name: '白金級', points: 5000, rate: 1.4 },
                { name: '鑽石級', points: 15000, rate: 1.75 }
            ]
        }
    };

    function getLocaleConfig() {
        const lang = (document.documentElement.lang || 'ja').toLowerCase();
        if (lang.startsWith('en')) return LOCALE_CONFIGS['en'];
        if (lang.startsWith('ko')) return LOCALE_CONFIGS['ko'];
        if (lang.startsWith('zh') || lang.includes('tw')) return LOCALE_CONFIGS['zh-TW'];
        return LOCALE_CONFIGS['ja'];
    }

    function calculateGamePoints(amount, multiplier, currentStatusRate, cfg) {
        const validAmount = Math.max(0, parseFloat(amount) || 0);
        const validMult = Math.max(1, parseFloat(multiplier) || 1);
        const rate = Math.max(currentStatusRate || 1.0, validMult);

        // 各国の基本単位ごとの四捨五入計算
        const points = Math.round((validAmount / cfg.unitSpend) * rate);
        return {
            amount: validAmount,
            rate: rate,
            points: points
        };
    }

    function getReachedRank(totalEarnedPoints, cfg) {
        const ranks = cfg.ranks;
        let reached = ranks[0];
        let nextRank = ranks[1];

        for (let i = ranks.length - 1; i >= 0; i--) {
            if (totalEarnedPoints >= ranks[i].points) {
                reached = ranks[i];
                nextRank = ranks[i + 1] || null;
                break;
            }
        }

        const denom = nextRank ? (nextRank.points - reached.points) : 0;
        const progressPercent = (nextRank && denom > 0)
            ? Math.min(100, Math.max(0, Math.round(((totalEarnedPoints - reached.points) / denom) * 100)))
            : 100;

        return {
            current: reached,
            next: nextRank,
            neededForNext: nextRank ? Math.max(0, nextRank.points - totalEarnedPoints) : 0,
            progressPercent: progressPercent
        };
    }

    function initGameSimulator() {
        const form = document.getElementById('game-sim-form');
        if (!form) return;

        const cfg = getLocaleConfig();

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
                const unitPrice = parseFloat(packSelect.value) || 0;
                const count = Math.max(1, parseInt(countInput.value, 10) || 1);
                amount = unitPrice * count;
                if (customAmountInput) customAmountInput.value = amount;
            } else if (customAmountInput) {
                amount = parseFloat(customAmountInput.value) || 0;
            }

            const mult = multSelect ? parseFloat(multSelect.value) : 1;
            const statusRate = statusSelect ? parseFloat(statusSelect.value) : 1.0;

            const res = calculateGamePoints(amount, mult, statusRate, cfg);
            const rankInfo = getReachedRank(res.points, cfg);

            if (totalAmountEl) {
                const formattedAmount = res.amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
                totalAmountEl.textContent = `${cfg.currencyPrefix}${formattedAmount}${cfg.currencySuffix}`;
            }
            if (earnedPointsEl) {
                earnedPointsEl.textContent = `${res.points.toLocaleString()} pt`;
            }
            if (pointValueYenEl) {
                const pointValueRatio = cfg.unitSpend / 100;
                const formattedVal = (res.points * pointValueRatio).toLocaleString(undefined, {
                    minimumFractionDigits: cfg.unitSpend === 1 ? 2 : 0,
                    maximumFractionDigits: 2
                });
                pointValueYenEl.textContent = `${cfg.pointValuePrefix}${formattedVal}${cfg.pointValueSuffix}`;
            }

            if (reachedRankEl) {
                reachedRankEl.textContent = rankInfo.current.name;
            }

            if (nextRankProgressEl && rankProgressBar) {
                if (rankInfo.next) {
                    nextRankProgressEl.textContent = cfg.nextRankText(rankInfo.next.name, rankInfo.neededForNext);
                    rankProgressBar.style.width = `${rankInfo.progressPercent}%`;
                    rankProgressBar.setAttribute('aria-valuenow', rankInfo.progressPercent.toString());
                } else {
                    nextRankProgressEl.textContent = cfg.maxRankAchievedText;
                    rankProgressBar.style.width = '100%';
                    rankProgressBar.setAttribute('aria-valuenow', '100');
                }
            }
        }

        if (presetBtns.length) {
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');

                    const targetAmount = btn.getAttribute('data-amount');
                    const targetMult = btn.getAttribute('data-mult');

                    if (targetAmount && customAmountInput) {
                        customAmountInput.value = targetAmount;
                        if (packSelect) {
                            packSelect.value = 'custom';
                            if (countInput) countInput.style.display = 'none';
                        }
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
                presetBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                if (countInput) countInput.style.display = packSelect.value === 'custom' ? 'none' : 'inline-block';
                update();
            });
        }

        if (customAmountInput) {
            const handleCustomInput = () => {
                if (packSelect && packSelect.value !== 'custom') {
                    packSelect.value = 'custom';
                    if (countInput) countInput.style.display = 'none';
                }
                presetBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                update();
            };
            customAmountInput.addEventListener('input', handleCustomInput);
            customAmountInput.addEventListener('focus', handleCustomInput);
        }

        [countInput, multSelect, statusSelect].forEach(el => {
            if (el) {
                el.addEventListener('input', () => {
                    presetBtns.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
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
