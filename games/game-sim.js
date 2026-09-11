/**
 * PlayPoint Game Simulator Engine
 * Google Play Points calculator for popular mobile games.
 * Supports Japanese, English, Korean and Traditional Chinese pages.
 */
(function() {
    'use strict';

    const LOCALE_CONFIGS = {
        'ja': {
            lang: 'ja',
            unitSpend: 100,
            currencySymbol: '円',
            currencyPrefix: '',
            currencySuffix: ' 円',
            pointValuePrefix: '約 ',
            pointValueSuffix: ' 円分',
            maxRankAchievedText: '最高ランク（ダイヤモンド）達成！',
            nextRankText: (name, pts) => `${name}まであと ${pts.toLocaleString('ja-JP')} pt`,
            savingsText: () => '',
            redeemCheckText: 'Play Points「使う」で交換条件を確認',
            copiedAlert: '✅ コピー完了！',
            eligiblePackLabel: '1回あたりのポイント計算対象額（税を除く商品価格・任意）：',
            eligibleCustomLabel: 'ポイント計算対象額（税を除く商品価格・任意）：',
            eligiblePlaceholder: 'Google Playに表示された対象額が分かる場合のみ入力',
            basisEstimated: '対象額が未入力のため、支払額をポイント計算対象額として仮置きした概算です。',
            basisExact: '入力した税を除く商品価格をポイント計算対象額として使用しています。',
            perPurchaseBasis: (points, count) => `1回あたり ${points.toLocaleString('ja-JP')} pt × ${count.toLocaleString('ja-JP')}回で計算しています。`,
            officialRuleText: 'Google Play公式では、税金を除いた商品の価格に獲得率を掛け、購入ごとに最も近い整数へ丸めます。購入前はGoogle Play画面の獲得予定ポイントを最優先で確認してください。',
            presetDisclaimer: '天井・完凸などのプリセットは、所持数や現在のガチャ回数、保証状態を判定するガチャシミュレーターではありません。表示した参考支出額をPlay Pointsへ換算するためのショートカットです。',
            verificationText: 'Play Points獲得率はGoogle公式情報を基準にしています。ゲーム内価格・天井/完凸の必要額は参考値です。',
            ranks: [
                { name: 'ブロンズ', points: 0, rate: 1.0 },
                { name: 'シルバー', points: 250, rate: 1.25 },
                { name: 'ゴールド', points: 1000, rate: 1.5 },
                { name: 'プラチナ', points: 4000, rate: 1.75 },
                { name: 'ダイヤモンド', points: 15000, rate: 2.0 }
            ]
        },
        'en': {
            lang: 'en',
            unitSpend: 1.0,
            currencySymbol: '$',
            currencyPrefix: '$',
            currencySuffix: '',
            pointValuePrefix: 'Approx. $',
            pointValueSuffix: ' value',
            maxRankAchievedText: 'Top level (Diamond) achieved!',
            nextRankText: (name, pts) => `${pts.toLocaleString('en-US')} pts needed for ${name}`,
            savingsText: () => '',
            redeemCheckText: 'Check redemption options in Play Points',
            copiedAlert: '✅ Copied!',
            eligiblePackLabel: 'Play Points eligible item price per purchase (before tax, optional):',
            eligibleCustomLabel: 'Play Points eligible item price (before tax, optional):',
            eligiblePlaceholder: 'Enter only if the eligible item price is known',
            basisEstimated: 'Eligible item price is blank, so this is an estimate using the displayed spending amount as a placeholder.',
            basisExact: 'The entered pre-tax item price is being used as the Play Points eligible amount.',
            perPurchaseBasis: (points, count) => `${points.toLocaleString('en-US')} pts per purchase × ${count.toLocaleString('en-US')} purchases.`,
            officialRuleText: 'Google Play calculates points from the item price excluding taxes and rounds to the nearest whole point for each purchase. Check the points shown by Google Play before checkout.',
            presetDisclaimer: 'Pity/full-upgrade presets are spending examples only. They do not inspect your current pull count, owned currency, guarantee state, or game account.',
            verificationText: 'Play Points earn rates use Google official information. Game prices and pity/full-upgrade spending amounts are reference values.',
            ranks: [
                { name: 'Bronze', points: 0, rate: 1.0 },
                { name: 'Silver', points: 150, rate: 1.1 },
                { name: 'Gold', points: 600, rate: 1.2 },
                { name: 'Platinum', points: 3000, rate: 1.4 },
                { name: 'Diamond', points: 10000, rate: 1.6 }
            ]
        },
        'ko': {
            lang: 'ko',
            unitSpend: 1000,
            currencySymbol: '원',
            currencyPrefix: '₩',
            currencySuffix: '원',
            pointValuePrefix: '약 ₩',
            pointValueSuffix: ' 상당',
            maxRankAchievedText: '최고 등급(다이아몬드) 달성!',
            nextRankText: (name, pts) => `${name}까지 남은 포인트: ${pts.toLocaleString('ko-KR')} pt`,
            savingsText: () => '',
            redeemCheckText: 'Play Points 사용 화면에서 교환 조건 확인',
            copiedAlert: '✅ 복사됨!',
            eligiblePackLabel: '1회당 Play Points 계산 대상 금액(세금 제외 상품 가격, 선택):',
            eligibleCustomLabel: 'Play Points 계산 대상 금액(세금 제외 상품 가격, 선택):',
            eligiblePlaceholder: 'Google Play에 표시된 대상 금액을 아는 경우에만 입력',
            basisEstimated: '계산 대상 금액을 입력하지 않아 결제 금액을 대상 금액으로 임시 적용한 추정치입니다.',
            basisExact: '입력한 세금 제외 상품 가격을 Play Points 계산 대상 금액으로 사용하고 있습니다.',
            perPurchaseBasis: (points, count) => `1회 ${points.toLocaleString('ko-KR')} pt × ${count.toLocaleString('ko-KR')}회로 계산합니다.`,
            officialRuleText: 'Google Play 공식 계산은 세금을 제외한 상품 가격에 적립률을 적용하고 구매 건별로 가장 가까운 정수 포인트로 반올림합니다. 결제 전 Google Play의 예상 적립 포인트를 확인하세요.',
            presetDisclaimer: '천장·완성 등의 프리셋은 현재 뽑기 횟수, 보유 재화, 확정 상태를 판정하는 가챠 시뮬레이터가 아니라 참고 결제 금액을 Play Points로 환산하는 바로가기입니다.',
            verificationText: 'Play Points 적립률은 Google 공식 정보를 기준으로 합니다. 게임 내 가격과 천장/완성 필요 금액은 참고값입니다.',
            ranks: [
                { name: '브론즈', points: 0, rate: 1.0 },
                { name: '실버', points: 150, rate: 1.1 },
                { name: '골드', points: 600, rate: 1.3 },
                { name: '플래티넘', points: 2400, rate: 1.6 },
                { name: '다이아몬드', points: 15000, rate: 2.0 }
            ]
        },
        'zh-TW': {
            lang: 'zh-TW',
            unitSpend: 30,
            currencySymbol: 'NT$',
            currencyPrefix: 'NT$',
            currencySuffix: ' 元',
            pointValuePrefix: '約 NT$',
            pointValueSuffix: ' 等值',
            maxRankAchievedText: '已達成最高等級（鑽石級）！',
            nextRankText: (name, pts) => `距離${name}還差 ${pts.toLocaleString('zh-TW')} 點`,
            savingsText: () => '',
            redeemCheckText: '請在 Play Points「使用」頁面確認兌換條件',
            copiedAlert: '✅ 已複製！',
            eligiblePackLabel: '每次購買的 Play Points 計算金額（不含稅商品價格，可選）：',
            eligibleCustomLabel: 'Play Points 計算金額（不含稅商品價格，可選）：',
            eligiblePlaceholder: '僅在知道 Google Play 顯示的計算金額時輸入',
            basisEstimated: '未輸入計算金額，因此目前是以付款金額暫代計算金額的估算。',
            basisExact: '目前使用你輸入的不含稅商品價格作為 Play Points 計算金額。',
            perPurchaseBasis: (points, count) => `每次 ${points.toLocaleString('zh-TW')} 點 × ${count.toLocaleString('zh-TW')} 次購買。`,
            officialRuleText: 'Google Play 官方計算會以不含稅的商品價格乘上獲得率，並針對每次購買四捨五入到最接近的整數點數。結帳前請以 Google Play 顯示的預計獲得點數為準。',
            presetDisclaimer: '保底、滿突破等預設只是參考消費金額的快捷選項，不會判斷目前抽數、持有資源或保底狀態。',
            verificationText: 'Play Points 獲得率以 Google 官方資訊為基準；遊戲內價格與保底/滿突破所需金額為參考值。',
            ranks: [
                { name: '銅級', points: 0, rate: 1.0 },
                { name: '銀級', points: 250, rate: 1.25 },
                { name: '黃金級', points: 1000, rate: 1.5 },
                { name: '白金級', points: 4000, rate: 1.75 },
                { name: '鑽石級', points: 15000, rate: 2.0 }
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

    function calculateGamePoints(amount, multiplier, currentStatusRate, cfg, options = {}) {
        const validAmount = Math.max(0, parseFloat(amount) || 0);
        const validMult = Math.max(1, parseFloat(multiplier) || 1);
        const rate = Math.max(parseFloat(currentStatusRate) || 1.0, validMult);
        const purchaseCount = Math.max(1, parseInt(options.purchaseCount, 10) || 1);
        const fallbackAmountPerPurchase = purchaseCount > 0 ? validAmount / purchaseCount : validAmount;
        const parsedAmountPerPurchase = parseFloat(options.amountPerPurchase);
        const amountPerPurchase = Number.isFinite(parsedAmountPerPurchase) && parsedAmountPerPurchase >= 0
            ? parsedAmountPerPurchase
            : fallbackAmountPerPurchase;
        const parsedEligibleAmount = options.eligibleAmountPerPurchase === null || options.eligibleAmountPerPurchase === undefined || options.eligibleAmountPerPurchase === ''
            ? NaN
            : parseFloat(options.eligibleAmountPerPurchase);
        const hasEligibleAmount = Number.isFinite(parsedEligibleAmount) && parsedEligibleAmount >= 0 && parsedEligibleAmount <= amountPerPurchase;
        const eligibleAmountPerPurchase = hasEligibleAmount ? parsedEligibleAmount : amountPerPurchase;
        const pointsPerPurchase = Math.round((eligibleAmountPerPurchase / cfg.unitSpend) * rate);
        const points = pointsPerPurchase * purchaseCount;

        return {
            amount: validAmount,
            rate,
            points,
            purchaseCount,
            amountPerPurchase,
            eligibleAmountPerPurchase,
            pointsPerPurchase,
            usesEligibleAmount: hasEligibleAmount
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
            progressPercent
        };
    }

    function triggerUpdateAnimation(el) {
        if (!el) return;
        el.classList.remove('value-updated');
        void el.offsetWidth;
        el.classList.add('value-updated');
    }

    function createEligibleAmountField(cfg, customAmountInput) {
        if (!customAmountInput || document.getElementById('sim-eligible-amount')) return document.getElementById('sim-eligible-amount');
        const anchor = customAmountInput.closest ? customAmountInput.closest('.input-field') : null;
        if (!anchor || !anchor.parentNode) return null;

        const field = document.createElement('div');
        field.className = 'input-field';
        const label = document.createElement('label');
        label.htmlFor = 'sim-eligible-amount';
        label.id = 'sim-eligible-amount-label';
        label.textContent = cfg.eligiblePackLabel;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'sim-eligible-amount';
        input.min = '0';
        input.step = 'any';
        input.inputMode = 'decimal';
        input.placeholder = cfg.eligiblePlaceholder;
        input.setAttribute('aria-describedby', 'game-calculation-basis');
        field.append(label, input);
        anchor.insertAdjacentElement('afterend', field);
        return input;
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
        const eligibleAmountInput = createEligibleAmountField(cfg, customAmountInput);

        const totalAmountEl = document.getElementById('res-total-amount');
        const earnedPointsEl = document.getElementById('res-earned-points');
        const reachedRankEl = document.getElementById('res-reached-rank');
        const nextRankProgressEl = document.getElementById('res-next-progress');
        const rankProgressBar = document.getElementById('res-rank-bar');
        const pointValueYenEl = document.getElementById('res-point-value-yen');
        const ctaSavingsEl = document.getElementById('cta-dynamic-savings');
        const resultContainer = document.querySelector('.game-result-container');
        const presetBtns = document.querySelectorAll('.preset-btn');

        const meta = document.querySelector('.game-meta');
        if (meta && cfg.verificationText) meta.textContent = cfg.verificationText;

        const presetHeading = document.querySelector('.preset-heading');
        if (presetHeading && cfg.presetDisclaimer && !document.getElementById('game-preset-disclaimer')) {
            const note = document.createElement('p');
            note.id = 'game-preset-disclaimer';
            note.className = 'game-calculation-note';
            note.textContent = cfg.presetDisclaimer;
            presetHeading.insertAdjacentElement('afterend', note);
        }

        let basisEl = document.getElementById('game-calculation-basis');
        if (!basisEl && resultContainer) {
            basisEl = document.createElement('p');
            basisEl.id = 'game-calculation-basis';
            basisEl.className = 'game-calculation-note';
            basisEl.setAttribute('aria-live', 'polite');
            const shareActions = resultContainer.querySelector('.game-share-actions');
            if (shareActions) shareActions.insertAdjacentElement('beforebegin', basisEl);
            else resultContainer.appendChild(basisEl);
        }

        const existingDisclaimer = resultContainer ? resultContainer.querySelector('p[style*="font-size:0.85rem"]') : null;
        if (existingDisclaimer && cfg.officialRuleText) existingDisclaimer.textContent = cfg.officialRuleText;

        function refreshEligibleField() {
            if (!eligibleAmountInput) return;
            const label = document.getElementById('sim-eligible-amount-label');
            const isPack = packSelect && packSelect.value !== 'custom';
            if (label) label.textContent = isPack ? cfg.eligiblePackLabel : cfg.eligibleCustomLabel;
            const perPurchaseAmount = isPack ? (parseFloat(packSelect.value) || 0) : (parseFloat(customAmountInput?.value) || 0);
            if (perPurchaseAmount > 0) eligibleAmountInput.max = String(perPurchaseAmount);
            else eligibleAmountInput.removeAttribute('max');
        }

        // URLクエリパラメータの初期読み込み。旧URLの amount だけでも引き続き動作する。
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const paramAmount = urlParams.get('amount');
            const paramPack = urlParams.get('pack');
            const paramCount = urlParams.get('count');
            const paramEligible = urlParams.get('eligible');
            const paramMult = urlParams.get('mult');
            const paramStatus = urlParams.get('status');
            let matchedPackFromUrl = false;

            if (paramPack !== null && packSelect && !isNaN(parseFloat(paramPack))) {
                for (let i = 0; i < packSelect.options.length; i++) {
                    if (parseFloat(packSelect.options[i].value) === parseFloat(paramPack)) {
                        packSelect.selectedIndex = i;
                        matchedPackFromUrl = true;
                        break;
                    }
                }
                if (matchedPackFromUrl && countInput) {
                    countInput.value = String(Math.max(1, parseInt(paramCount, 10) || 1));
                    countInput.style.display = 'inline-block';
                }
            }

            if (paramAmount !== null && !isNaN(parseFloat(paramAmount))) {
                if (customAmountInput) customAmountInput.value = parseFloat(paramAmount);
                if (packSelect && !matchedPackFromUrl) {
                    let matched = false;
                    for (let i = 0; i < packSelect.options.length; i++) {
                        if (parseFloat(packSelect.options[i].value) === parseFloat(paramAmount)) {
                            packSelect.selectedIndex = i;
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        packSelect.value = 'custom';
                        if (countInput) countInput.style.display = 'none';
                    }
                }
            }
            if (paramEligible !== null && eligibleAmountInput && !isNaN(parseFloat(paramEligible))) {
                eligibleAmountInput.value = paramEligible;
            }
            if (paramMult !== null && multSelect) multSelect.value = paramMult;
            if (paramStatus !== null && statusSelect) statusSelect.value = paramStatus;
        } catch (e) {
            console.error('Failed to parse URL query params', e);
        }

        // 初期ロード時の双方向同期判定
        if (customAmountInput && packSelect) {
            const initVal = parseFloat(customAmountInput.value) || 0;
            const currentPackVal = parseFloat(packSelect.value);
            const currentCount = Math.max(1, parseInt(countInput?.value, 10) || 1);
            const currentPackTotal = Number.isFinite(currentPackVal) ? currentPackVal * currentCount : NaN;
            let matched = packSelect.value !== 'custom' && Math.abs(currentPackTotal - initVal) < 1e-9;
            if (!matched) {
                for (let i = 0; i < packSelect.options.length; i++) {
                    if (parseFloat(packSelect.options[i].value) === initVal) {
                        packSelect.selectedIndex = i;
                        if (countInput) countInput.value = '1';
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                packSelect.value = 'custom';
                if (countInput) countInput.style.display = 'none';
            } else if (countInput) {
                countInput.style.display = 'inline-block';
            }
        }
        refreshEligibleField();

        function getCurrentCalculation() {
            let amount = 0;
            let amountPerPurchase = 0;
            let purchaseCount = 1;
            const isPack = packSelect && countInput && packSelect.value !== 'custom';

            if (isPack) {
                amountPerPurchase = Math.max(0, parseFloat(packSelect.value) || 0);
                purchaseCount = Math.max(1, parseInt(countInput.value, 10) || 1);
                amount = amountPerPurchase * purchaseCount;
                if (customAmountInput) customAmountInput.value = amount;
            } else if (customAmountInput) {
                amount = Math.max(0, parseFloat(customAmountInput.value) || 0);
                amountPerPurchase = amount;
            }

            refreshEligibleField();
            const rawEligible = eligibleAmountInput ? eligibleAmountInput.value.trim() : '';
            const parsedEligible = rawEligible === '' ? null : parseFloat(rawEligible);
            const eligibleAmount = parsedEligible !== null
                && Number.isFinite(parsedEligible)
                && parsedEligible >= 0
                && parsedEligible <= amountPerPurchase
                ? parsedEligible
                : null;
            if (eligibleAmountInput) eligibleAmountInput.setAttribute('aria-invalid', rawEligible !== '' && eligibleAmount === null ? 'true' : 'false');

            const mult = multSelect ? parseFloat(multSelect.value) : 1;
            const statusRate = statusSelect ? parseFloat(statusSelect.value) : 1.0;
            const result = calculateGamePoints(amount, mult, statusRate, cfg, {
                purchaseCount,
                amountPerPurchase,
                eligibleAmountPerPurchase: eligibleAmount
            });

            return { result, isPack };
        }

        function buildShareUrl(calculation) {
            const params = new URLSearchParams();
            const res = calculation.result;
            params.set('amount', String(res.amount));
            params.set('mult', multSelect ? multSelect.value : '1');
            params.set('status', statusSelect ? statusSelect.value : '1.0');
            if (calculation.isPack && packSelect) {
                params.set('pack', String(res.amountPerPurchase));
                params.set('count', String(res.purchaseCount));
            }
            if (res.usesEligibleAmount) params.set('eligible', String(res.eligibleAmountPerPurchase));
            return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        }

        function update(isUserAction) {
            const calculation = getCurrentCalculation();
            const res = calculation.result;
            const rankInfo = getReachedRank(res.points, cfg);

            if (totalAmountEl) {
                const formattedAmount = res.amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
                totalAmountEl.textContent = `${cfg.currencyPrefix}${formattedAmount}${cfg.currencySuffix}`;
                if (isUserAction) triggerUpdateAnimation(totalAmountEl);
            }
            if (earnedPointsEl) {
                earnedPointsEl.textContent = `${res.points.toLocaleString()} pt`;
                if (isUserAction) triggerUpdateAnimation(earnedPointsEl);
            }
            if (pointValueYenEl) pointValueYenEl.textContent = cfg.redeemCheckText || '';

            if (basisEl) {
                const basis = res.usesEligibleAmount ? cfg.basisExact : cfg.basisEstimated;
                const purchaseBreakdown = res.purchaseCount > 1 ? ` ${cfg.perPurchaseBasis(res.pointsPerPurchase, res.purchaseCount)}` : '';
                basisEl.textContent = `${basis}${purchaseBreakdown}`;
            }

            if (reachedRankEl) reachedRankEl.textContent = rankInfo.current.name;

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

            if (ctaSavingsEl && cfg.savingsText) {
                if (res.amount > 0) {
                    const minSave = Math.round(res.amount * 0.03);
                    const maxSave = Math.round(res.amount * 0.10);
                    const savingsStr = cfg.savingsText(minSave, maxSave);
                    if (savingsStr) {
                        ctaSavingsEl.textContent = savingsStr;
                        ctaSavingsEl.style.display = 'inline';
                    } else {
                        ctaSavingsEl.style.display = 'none';
                    }
                } else {
                    ctaSavingsEl.style.display = 'none';
                }
            }
        }

        // 𝕏 (Twitter) シェア機能
        const btnShareX = document.getElementById('btn-share-x');
        if (btnShareX) {
            btnShareX.addEventListener('click', () => {
                const calculation = getCurrentCalculation();
                const res = calculation.result;
                const amount = res.amount;
                const currentTitle = document.querySelector('h1.game-title') ? document.querySelector('h1.game-title').textContent : 'PlayPoint';
                const shareUrl = buildShareUrl(calculation);

                let shareText = '';
                if (cfg.lang === 'ja') {
                    shareText = `【${currentTitle}】${cfg.currencyPrefix}${amount.toLocaleString()}${cfg.currencySuffix}の支出で、Google Play Pointsは約${res.points.toLocaleString()}ptの試算。購入前はPlay画面の獲得予定ポイントを確認！\n#Playポイント計算機 #GooglePlayPoints\n`;
                } else if (cfg.lang === 'ko') {
                    shareText = `【${currentTitle}】 ${cfg.currencyPrefix}${amount.toLocaleString()}${cfg.currencySuffix} 결제 시 Google Play Points 약 ${res.points.toLocaleString()} pt 추정. 결제 전 Play 화면의 예상 적립 포인트를 확인하세요.\n#구글플레이포인트 #PlayPoints\n`;
                } else if (cfg.lang === 'zh-TW') {
                    shareText = `【${currentTitle}】消費 ${cfg.currencyPrefix}${amount.toLocaleString()}${cfg.currencySuffix}，Google Play Points 估算約 ${res.points.toLocaleString()} 點。結帳前請確認 Play 顯示的預計點數。\n#GooglePlayPoints #手遊課金\n`;
                } else {
                    shareText = `Google Play Points estimate for ${currentTitle}: ${cfg.currencyPrefix}${amount.toLocaleString()}${cfg.currencySuffix} → ~${res.points.toLocaleString()} pts. Check the points shown by Play before checkout.\n#GooglePlayPoints #Gaming\n`;
                }

                const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                window.open(twitterIntent, '_blank', 'noopener,noreferrer');
            });
        }

        // 結果リンクコピー機能
        const btnCopyLink = document.getElementById('btn-copy-link');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', () => {
                const shareUrl = buildShareUrl(getCurrentCalculation());

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        const origHtml = btnCopyLink.innerHTML;
                        btnCopyLink.classList.add('copied');
                        btnCopyLink.innerHTML = '<span>' + cfg.copiedAlert + '</span>';
                        setTimeout(() => {
                            btnCopyLink.classList.remove('copied');
                            btnCopyLink.innerHTML = origHtml;
                        }, 2500);
                    }).catch(() => {
                        prompt('URL:', shareUrl);
                    });
                } else {
                    prompt('URL:', shareUrl);
                }
            });
        }

        // プリセットボタンクリック
        if (presetBtns.length) {
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    presetBtns.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');

                    const targetAmount = parseFloat(btn.getAttribute('data-amount')) || 0;
                    const targetMult = btn.getAttribute('data-mult');
                    if (customAmountInput) customAmountInput.value = targetAmount;
                    if (eligibleAmountInput) eligibleAmountInput.value = '';
                    if (targetMult && multSelect) multSelect.value = targetMult;

                    if (packSelect) {
                        let matched = false;
                        for (let i = 0; i < packSelect.options.length; i++) {
                            if (parseFloat(packSelect.options[i].value) === targetAmount) {
                                packSelect.selectedIndex = i;
                                matched = true;
                                break;
                            }
                        }
                        if (matched) {
                            if (countInput) {
                                countInput.value = '1';
                                countInput.style.display = 'inline-block';
                            }
                        } else {
                            packSelect.value = 'custom';
                            if (countInput) countInput.style.display = 'none';
                        }
                    }

                    refreshEligibleField();
                    update(true);
                });
            });
        }

        // パックセレクト変更
        if (packSelect) {
            packSelect.addEventListener('change', () => {
                presetBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                if (eligibleAmountInput) eligibleAmountInput.value = '';
                if (countInput) {
                    countInput.style.display = packSelect.value === 'custom' ? 'none' : 'inline-block';
                    if (packSelect.value !== 'custom' && (!countInput.value || parseInt(countInput.value, 10) < 1)) {
                        countInput.value = '1';
                    }
                }
                refreshEligibleField();
                update(true);
            });
        }

        // カスタム金額手入力
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                if (packSelect && packSelect.value !== 'custom') {
                    packSelect.value = 'custom';
                    if (countInput) countInput.style.display = 'none';
                    if (eligibleAmountInput) eligibleAmountInput.value = '';
                }
                presetBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                refreshEligibleField();
                update(true);
            });
        }

        if (eligibleAmountInput) eligibleAmountInput.addEventListener('input', () => update(true));

        // 回数・倍率・ステータス変更
        [countInput, multSelect, statusSelect].forEach(el => {
            if (el) {
                el.addEventListener('input', () => update(true));
                el.addEventListener('change', () => update(true));
            }
        });

        update(false);
    }

    if (typeof window !== 'undefined' && window.__TEST_ENV__) {
        window.PP_GAME_SIM_TEST = { calculateGamePoints, getReachedRank };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGameSimulator);
    } else {
        initGameSimulator();
    }
})();
