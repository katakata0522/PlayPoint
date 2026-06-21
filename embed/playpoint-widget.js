(function () {
    'use strict';

    // 日本語・英語・韓国語・繁体字中国語の多言語翻訳辞書（通常計算と逆算の両方の文言を含む）
    const I18N = {
        ja: {
            tabMain: '目標課金',
            tabReverse: 'ポイント逆算',
            title: 'Playポイント簡易計算',
            desc: '目標ランクへの課金額、または課金時の獲得ポイントを計算します。',
            amountLabel: '課金額',
            amountPlaceholder: '例：5000',
            currentStatusLabel: '現在のステータス',
            targetStatusLabel: '目標ステータス',
            neededPointsLabel: '目標までの必要ポイント',
            neededPointsPlaceholder: '例：150',
            rateLabel: '100円あたりの基本ポイント',
            multiplierLabel: 'キャンペーン倍率',
            calcBtnMain: '課金額を計算',
            calcBtnReverse: 'ポイントを計算',
            initOutputMain: '必要ポイントを入力してください。',
            initOutputReverse: '金額を入力してください。',
            resultTotalPrefix: '必要課金額目安：約 ',
            resultMonthlyPrefix: '月平均目安：約 ',
            resultMonthlySuffix: '/月',
            resultMonthsSuffix: 'ヶ月',
            resultPointsPrefix: '獲得ポイントの目安：',
            resultPointsSuffix: 'pt',
            errorMsgInput: '有効な数値を入力してください。',
            errorMsgTarget: '必要ポイントが不正か、次の目標がありません。',
            linkText: '詳しい計算機を開く',
            currency: '円',
            nextTargetNone: '次の目標はありません',
            unit: 100,
            statuses: {
                '1.0': 'ブロンズ',
                '1.25': 'シルバー',
                '1.5': 'ゴールド',
                '1.75': 'プラチナ',
                '2.0': 'ダイヤモンド'
            },
            targets: {
                '1.0': { label: 'シルバー', val: 250 },
                '1.25': { label: 'ゴールド', val: 1000 },
                '1.5': { label: 'プラチナ', val: 4000 },
                '1.75': { label: 'ダイヤモンド', val: 15000 },
                '2.0': { label: 'なし', val: 0 }
            },
            multipliers: {
                1: '通常（1倍）',
                2: '2倍',
                3: '3倍',
                4: '4倍',
                5: '5倍',
                10: '10倍'
            }
        },
        en: {
            tabMain: 'Target Spend',
            tabReverse: 'Points Earned',
            title: 'Play Points Calculator',
            desc: 'Calculate spending required to level up, or points earned.',
            amountLabel: 'Amount Spent',
            amountPlaceholder: 'e.g., 50',
            currentStatusLabel: 'Current Status',
            targetStatusLabel: 'Target Status',
            neededPointsLabel: 'Points to Next Level',
            neededPointsPlaceholder: 'e.g., 100',
            rateLabel: 'Points per $1',
            multiplierLabel: 'Campaign Multiplier',
            calcBtnMain: 'Calculate Spend',
            calcBtnReverse: 'Calculate Points',
            initOutputMain: 'Enter the points needed.',
            initOutputReverse: 'Enter the amount.',
            resultTotalPrefix: 'Estimated Spend: Approx. ',
            resultMonthlyPrefix: 'Monthly Avg: Approx. ',
            resultMonthlySuffix: '/mo',
            resultMonthsSuffix: 'mos',
            resultPointsPrefix: 'Estimated Points: ',
            resultPointsSuffix: ' pts',
            errorMsgInput: 'Please enter a valid number.',
            errorMsgTarget: 'Invalid points or no next level available.',
            linkText: 'Open Full Calculator',
            currency: 'USD',
            nextTargetNone: 'No further levels',
            unit: 1,
            statuses: {
                '1.0': 'Bronze',
                '1.1': 'Silver',
                '1.2': 'Gold',
                '1.4': 'Platinum',
                '1.6': 'Diamond'
            },
            targets: {
                '1.0': { label: 'Silver', val: 150 },
                '1.1': { label: 'Gold', val: 600 },
                '1.2': { label: 'Platinum', val: 3000 },
                '1.4': { label: 'Diamond', val: 10000 },
                '1.6': { label: 'None', val: 0 }
            },
            multipliers: {
                1: 'Normal (1x)',
                2: '2x',
                3: '3x',
                4: '4x',
                5: '5x',
                10: '10x'
            }
        },
        ko: {
            tabMain: '목표 결제',
            tabReverse: '포인트 역산',
            title: 'Play 포인트 간편 계산',
            desc: '목표 등급 달성 결제액 또는 결제 시 획득 포인트를 계산합니다.',
            amountLabel: '결제 금액',
            amountPlaceholder: '예: 50000',
            currentStatusLabel: '현재 등급',
            targetStatusLabel: '목표 등급',
            neededPointsLabel: '목표까지 필요한 포인트',
            neededPointsPlaceholder: '예: 120',
            rateLabel: '1,000₩당 기본 포인트',
            multiplierLabel: '이벤트 배율',
            calcBtnMain: '결제 금액 계산',
            calcBtnReverse: '포인트 계산',
            initOutputMain: '필요 포인트를 입력해 주세요.',
            initOutputReverse: '금액을 입력해 주세요.',
            resultTotalPrefix: '예상 결제 금액: 약 ',
            resultMonthlyPrefix: '월 평균 기준: 약 ',
            resultMonthlySuffix: '/월',
            resultMonthsSuffix: '개월',
            resultPointsPrefix: '예상 적립 포인트: 약 ',
            resultPointsSuffix: ' pt',
            errorMsgInput: '올바른 숫자를 입력해 주세요.',
            errorMsgTarget: '필요 포인트가 올바르지 않거나 다음 목표가 없습니다.',
            linkText: '상세 계산기 열기',
            currency: '₩',
            nextTargetNone: '다음 목표 등급이 없습니다',
            unit: 1000,
            statuses: {
                '1.0': '브론즈',
                '1.1': '실버',
                '1.3': '골드',
                '1.6': '플래티넘',
                '2.0': '다이아몬드'
            },
            targets: {
                '1.0': { label: '실버', val: 150 },
                '1.1': { label: '골드', val: 600 },
                '1.3': { label: '플래티넘', val: 2400 },
                '1.6': { label: '다이아몬드', val: 15000 },
                '2.0': { label: '없음', val: 0 }
            },
            multipliers: {
                1: '일반 (1배)',
                2: '2배',
                3: '3배',
                4: '4배',
                5: '5배',
                10: '10배'
            }
        },
        zh: {
            tabMain: '目標消費',
            tabReverse: '點數逆算',
            title: 'Play 點數簡易試算',
            desc: '計算達到目標等級的消費金額，或消費可獲得的點數。',
            amountLabel: '消費金額',
            amountPlaceholder: '例：5000',
            currentStatusLabel: '目前等級',
            targetStatusLabel: '目標等級',
            neededPointsLabel: '距離下一等級所需點數',
            neededPointsPlaceholder: '例：150',
            rateLabel: '每 30元 基本點數',
            multiplierLabel: '加倍活動倍率',
            calcBtnMain: '計算消費金額',
            calcBtnReverse: '計算點數',
            initOutputMain: '請輸入距離下一等級所需的點數。',
            initOutputReverse: '請輸入消費金額。',
            resultTotalPrefix: '消費金額目安：約 ',
            resultMonthlyPrefix: '月平均目安：約 ',
            resultMonthlySuffix: '/月',
            resultMonthsSuffix: '個月',
            resultPointsPrefix: '預期獲得點數：約 ',
            resultPointsSuffix: ' pt',
            errorMsgInput: '請輸入有效的數值。',
            errorMsgTarget: '點數不正確或已達最高等級。',
            linkText: '開啟詳細計算器',
            currency: 'NT$',
            nextTargetNone: '已達最高等級',
            unit: 30,
            statuses: {
                '1.0': '銅級',
                '1.25': '銀級',
                '1.5': '金級',
                '1.75': '白金級',
                '2.0': '鑽石級'
            },
            targets: {
                '1.0': { label: '銀級', val: 250 },
                '1.25': { label: '金級', val: 1000 },
                '1.5': { label: '白金級', val: 4000 },
                '1.75': { label: '鑽石級', val: 15000 },
                '2.0': { label: '無', val: 0 }
            },
            multipliers: {
                1: '一般 (1倍)',
                2: '2倍',
                3: '3倍',
                4: '4倍',
                5: '5倍',
                10: '10倍'
            }
        }
    };

    class PlayPointWidget extends HTMLElement {
        // 属性変更の監視
        static get observedAttributes() {
            return ['lang', 'theme', 'mode'];
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.currentMode = 'main'; // デフォルトモード
        }

        connectedCallback() {
            this.render();
            // 初期モードの反映
            const initialMode = this.getAttribute('mode') || 'main';
            this.switchMode(initialMode);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                if (name === 'mode') {
                    this.switchMode(newValue);
                } else {
                    this.render();
                    this.switchMode(this.currentMode);
                }
            }
        }

        // 表示言語の判定
        getLanguage() {
            let lang = this.getAttribute('lang');
            if (lang) {
                lang = lang.toLowerCase().split('-')[0];
                if (I18N[lang]) return lang;
            }
            
            const htmlLang = document.documentElement.lang;
            if (htmlLang) {
                const normalizedHtmlLang = htmlLang.toLowerCase().split('-')[0];
                if (I18N[normalizedHtmlLang]) return normalizedHtmlLang;
            }
            
            const navLang = navigator.language;
            if (navLang) {
                const normalizedNavLang = navLang.toLowerCase().split('-')[0];
                if (I18N[normalizedNavLang]) return normalizedNavLang;
            }
            
            return 'ja';
        }

        // 年内の残り月数を算出
        getRemainingMonths(baseDate = new Date()) {
            const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
            if (date.getMonth() === 11 && date.getDate() === 31) return 0;
            const nextYearStart = new Date(date.getFullYear() + 1, 0, 1);
            const remainingDays = Math.max(0, Math.ceil((nextYearStart - date) / (1000 * 60 * 60 * 24)));
            return Math.ceil(remainingDays / (365 / 12));
        }

        // 現在のステータスに応じた目標ステータスの自動更新
        updateTargetStatus() {
            const lang = this.getLanguage();
            const t = I18N[lang];
            const currentStatusSelect = this.shadowRoot.getElementById('current-status');
            const targetDisplay = this.shadowRoot.getElementById('target-status-display');
            const neededInput = this.shadowRoot.getElementById('needed-points');

            if (!currentStatusSelect || !targetDisplay || !neededInput) return;

            const currentVal = currentStatusSelect.value;
            const targetObj = t.targets[currentVal];
            
            if (targetObj && targetObj.val > 0) {
                targetDisplay.textContent = `${targetObj.label} (${targetObj.val.toLocaleString(lang === 'en' ? 'en-US' : 'ja-JP')}pt)`;
                
                // 矛盾防止の最大必要ポイント算出
                let prevVal = 0;
                const keys = Object.keys(t.targets);
                const idx = keys.indexOf(currentVal);
                if (idx > 0) {
                    prevVal = t.targets[keys[idx - 1]].val;
                }
                const maxNeeded = targetObj.val - prevVal;
                neededInput.max = String(maxNeeded);
                neededInput.disabled = false;
                neededInput.placeholder = `${t.neededPointsPlaceholder} (Max: ${maxNeeded})`;
            } else {
                targetDisplay.textContent = t.nextTargetNone;
                neededInput.disabled = true;
                neededInput.value = '';
                neededInput.placeholder = '-';
            }
        }

        switchMode(mode) {
            const actualMode = mode === 'reverse' ? 'reverse' : 'main';
            this.currentMode = actualMode;

            const mainForm = this.shadowRoot.getElementById('main-form');
            const reverseForm = this.shadowRoot.getElementById('reverse-form');
            const mainBtn = this.shadowRoot.getElementById('tab-main-btn');
            const reverseBtn = this.shadowRoot.getElementById('tab-reverse-btn');
            const calculateBtn = this.shadowRoot.getElementById('calculate');
            const result = this.shadowRoot.getElementById('result');
            const t = I18N[this.getLanguage()];

            if (!mainForm || !reverseForm || !mainBtn || !reverseBtn || !calculateBtn || !result) return;

            if (actualMode === 'main') {
                mainForm.classList.remove('hidden');
                reverseForm.classList.add('hidden');
                mainBtn.classList.add('active');
                reverseBtn.classList.remove('active');
                calculateBtn.textContent = t.calcBtnMain;
                result.textContent = t.initOutputMain;
            } else {
                mainForm.classList.add('hidden');
                reverseForm.classList.remove('hidden');
                mainBtn.classList.remove('active');
                reverseBtn.classList.add('active');
                calculateBtn.textContent = t.calcBtnReverse;
                result.textContent = t.initOutputReverse;
            }
            result.classList.remove('error');
        }

        render() {
            const lang = this.getLanguage();
            const t = I18N[lang];
            const theme = this.getAttribute('theme') || 'light';
            const isDark = theme === 'dark';

            // ステータスセレクトボックスの生成
            const statusOptions = Object.entries(t.statuses).map(([val, label]) => {
                return `<option value="${val}">${label}</option>`;
            }).join('');

            const multiplierOptions = Object.entries(t.multipliers).map(([val, label]) => {
                return `<option value="${val}">${label}</option>`;
            }).join('');

            const shareUrl = (lang === 'en' 
                ? 'https://playpoint-sim.com/en/?utm_source=embedded_widget' 
                : lang === 'ko'
                ? 'https://playpoint-sim.com/ko/?utm_source=embedded_widget'
                : lang === 'zh'
                ? 'https://playpoint-sim.com/tw/?utm_source=embedded_widget'
                : 'https://playpoint-sim.com/?utm_source=embedded_widget') + '&utm_medium=referral&utm_campaign=widget';

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        box-sizing: border-box;
                        width: 100%;
                        max-width: 100%;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif;
                    }
                    .widget {
                        box-sizing: border-box;
                        padding: 16px;
                        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                        border-radius: 12px;
                        background: ${isDark ? 'linear-gradient(145deg, #1e293b, #0f172a)' : 'linear-gradient(145deg, #ffffff, #f8fafc)'};
                        color: ${isDark ? '#f8fafc' : '#1e293b'};
                        box-shadow: 0 4px 12px rgba(15, 23, 42, ${isDark ? '0.15' : '0.04'});
                    }
                    h2 {
                        margin: 0 0 4px;
                        font-size: 1.05rem;
                        font-weight: 700;
                        color: ${isDark ? '#f1f5f9' : '#0f172a'};
                        line-height: 1.3;
                    }
                    p {
                        margin: 0 0 12px;
                        font-size: 0.76rem;
                        line-height: 1.4;
                        color: ${isDark ? '#94a3b8' : '#64748b'};
                    }
                    .tabs {
                        display: flex;
                        border-bottom: 2px solid ${isDark ? '#334155' : '#e2e8f0'};
                        margin-bottom: 12px;
                    }
                    .tab-btn {
                        flex: 1;
                        background: none;
                        border: 0;
                        padding: 8px 6px;
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: ${isDark ? '#94a3b8' : '#64748b'};
                        cursor: pointer;
                        text-align: center;
                        border-radius: 0;
                        min-height: auto;
                        margin-top: 0;
                        transition: color 0.15s ease-in-out;
                    }
                    .tab-btn.active {
                        color: ${isDark ? '#3b82f6' : '#0b57d0'};
                        border-bottom: 2px solid ${isDark ? '#3b82f6' : '#0b57d0'};
                        margin-bottom: -2px;
                    }
                    .tab-btn:hover {
                        color: ${isDark ? '#f8fafc' : '#1e293b'};
                    }
                    .form-group {
                        margin-bottom: 10px;
                    }
                    label {
                        display: block;
                        font-size: 0.76rem;
                        font-weight: 600;
                        color: ${isDark ? '#cbd5e1' : '#475569'};
                    }
                    .input-wrapper {
                        position: relative;
                        margin-top: 4px;
                    }
                    .static-text {
                        min-height: 40px;
                        display: flex;
                        align-items: center;
                        font-size: 0.9rem;
                        font-weight: 700;
                        color: ${isDark ? '#f1f5f9' : '#1e293b'};
                    }
                    input, select {
                        box-sizing: border-box;
                        width: 100%;
                        min-height: 40px;
                        padding: 8px 12px;
                        border: 1px solid ${isDark ? '#475569' : '#cbd5e1'};
                        border-radius: 8px;
                        background: ${isDark ? '#0f172a' : '#ffffff'};
                        color: ${isDark ? '#f8fafc' : '#1e293b'};
                        font-size: 14px;
                        outline: none;
                        transition: border-color 0.15s ease-in-out;
                    }
                    input:focus, select:focus {
                        border-color: #3b82f6;
                    }
                    .currency-input {
                        padding-right: 42px;
                    }
                    .currency-addon {
                        position: absolute;
                        right: 12px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: ${isDark ? '#64748b' : '#94a3b8'};
                        pointer-events: none;
                    }
                    button.calc-btn {
                        box-sizing: border-box;
                        width: 100%;
                        min-height: 42px;
                        margin-top: 12px;
                        border: 0;
                        border-radius: 8px;
                        background: #10b981;
                        color: #ffffff;
                        font-size: 14px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: background-color 0.15s ease-in-out;
                    }
                    button.calc-btn:hover {
                        background: #059669;
                    }
                    output {
                        display: block;
                        box-sizing: border-box;
                        min-height: 38px;
                        margin-top: 12px;
                        padding: 8px;
                        border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                        border-radius: 8px;
                        background: ${isDark ? '#020617' : '#f8fafc'};
                        font-size: 0.8rem;
                        font-weight: 600;
                        text-align: center;
                        line-height: 1.4;
                        color: ${isDark ? '#cbd5e1' : '#334155'};
                    }
                    output.error {
                        border-color: ${isDark ? '#7f1d1d' : '#fee2e2'};
                        background: ${isDark ? '#450a0a' : '#fef2f2'};
                        color: ${isDark ? '#fca5a5' : '#b91c1c'};
                    }
                    .footer-link {
                        display: flex;
                        justify-content: flex-end;
                        margin-top: 10px;
                    }
                    a {
                        display: inline-flex;
                        align-items: center;
                        min-height: 32px;
                        color: #3b82f6;
                        font-size: 0.76rem;
                        font-weight: 600;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    .hidden {
                        display: none !important;
                    }
                </style>
                <section class="widget" aria-labelledby="pp-widget-title">
                    <h2 id="pp-widget-title">${t.title}</h2>
                    <p>${t.desc}</p>

                    <!-- モード切り替えタブ -->
                    <div class="tabs">
                        <button class="tab-btn" id="tab-main-btn">${t.tabMain}</button>
                        <button class="tab-btn" id="tab-reverse-btn">${t.tabReverse}</button>
                    </div>

                    <!-- 通常計算フォーム -->
                    <div id="main-form">
                        <div class="form-group">
                            <label for="current-status">${t.currentStatusLabel}</label>
                            <select id="current-status">
                                ${statusOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t.targetStatusLabel}</label>
                            <div class="static-text" id="target-status-display">-</div>
                        </div>
                        <div class="form-group">
                            <label for="needed-points">${t.neededPointsLabel}</label>
                            <div class="input-wrapper">
                                <input id="needed-points" type="number" min="1" inputmode="numeric">
                            </div>
                        </div>
                    </div>

                    <!-- 逆算フォーム -->
                    <div id="reverse-form" class="hidden">
                        <div class="form-group">
                            <label for="amount">${t.amountLabel}</label>
                            <div class="input-wrapper">
                                <input id="amount" type="number" min="0" max="100000000" inputmode="numeric" placeholder="${t.amountPlaceholder}" class="currency-input">
                                <span class="currency-addon">${t.currency}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="reverse-status">${t.currentStatusLabel}</label>
                            <select id="reverse-status">
                                ${statusOptions}
                            </select>
                        </div>
                    </div>

                    <!-- 共通項目 -->
                    <div class="form-group">
                        <label for="multiplier">${t.multiplierLabel}</label>
                        <select id="multiplier">
                            ${multiplierOptions}
                        </select>
                    </div>
                    
                    <button class="calc-btn" id="calculate" type="button">${t.calcBtnMain}</button>
                    <output id="result" aria-live="polite">${t.initOutputMain}</output>
                    
                    <div class="footer-link">
                        <a href="${shareUrl}" target="_blank" rel="noopener noreferrer">${t.linkText} →</a>
                    </div>
                </section>
            `;

            // イベントバインド
            this.shadowRoot.getElementById('tab-main-btn').addEventListener('click', () => this.switchMode('main'));
            this.shadowRoot.getElementById('tab-reverse-btn').addEventListener('click', () => this.switchMode('reverse'));
            this.shadowRoot.getElementById('calculate').addEventListener('click', () => this.handleCalculate());

            // ステータス変更時に目標ランク表示を更新
            const currentStatusSelect = this.shadowRoot.getElementById('current-status');
            currentStatusSelect.addEventListener('change', () => this.updateTargetStatus());

            // Enterキーでの計算実行
            this.shadowRoot.getElementById('needed-points').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.handleCalculate(); }
            });
            this.shadowRoot.getElementById('amount').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); this.handleCalculate(); }
            });

            // 目標ステータスの初期判定反映
            this.updateTargetStatus();
        }

        handleCalculate() {
            if (this.currentMode === 'main') {
                this.calculateMain();
            } else {
                this.calculateReverse();
            }
        }

        // 通常計算（目標課金）ロジック
        calculateMain() {
            const lang = this.getLanguage();
            const t = I18N[lang];
            const currentStatus = this.shadowRoot.getElementById('current-status').value;
            const neededInput = this.shadowRoot.getElementById('needed-points');
            const multiplierInput = this.shadowRoot.getElementById('multiplier');
            const result = this.shadowRoot.getElementById('result');

            const rate = parseFloat(currentStatus);
            const neededPoints = Number(neededInput.value);
            const multiplier = Number(multiplierInput.value);
            const targetObj = t.targets[currentStatus];

            if (neededInput.value === '' || !Number.isFinite(neededPoints) || neededPoints <= 0 || !targetObj || targetObj.val === 0) {
                result.textContent = t.errorMsgInput;
                result.classList.add('error');
                return;
            }

            // 矛盾値（最大値制限）チェック
            const maxVal = Number(neededInput.max);
            if (Number.isFinite(maxVal) && neededPoints > maxVal) {
                result.textContent = t.errorMsgTarget;
                result.classList.add('error');
                return;
            }

            const finalRate = rate * multiplier;
            const unit = t.unit || (lang === 'en' ? 1 : 100);
            const totalAmountNeeded = Math.ceil((neededPoints / finalRate) * unit);

            const localeCode = lang === 'en' ? 'en-US' : lang === 'ko' ? 'ko-KR' : lang === 'zh' ? 'zh-TW' : 'ja-JP';
            const remainingMonths = this.getRemainingMonths();
            const monthlyResultContent = remainingMonths > 0
                ? `, ${t.resultMonthlyPrefix}${Math.ceil(totalAmountNeeded / remainingMonths).toLocaleString(localeCode)}${t.currency}${t.resultMonthlySuffix} (${remainingMonths}${t.resultMonthsSuffix})`
                : '';

            result.textContent = `${t.resultTotalPrefix}${totalAmountNeeded.toLocaleString(localeCode)}${t.currency}${monthlyResultContent}`;
            result.classList.remove('error');
        }

        // 逆算ロジック
        calculateReverse() {
            const lang = this.getLanguage();
            const t = I18N[lang];
            const amountInput = this.shadowRoot.getElementById('amount');
            const rateInput = this.shadowRoot.getElementById('reverse-status');
            const multiplierInput = this.shadowRoot.getElementById('multiplier');
            const result = this.shadowRoot.getElementById('result');

            const amount = Number(amountInput.value);
            const rate = Number(rateInput.value);
            const multiplier = Number(multiplierInput.value);

            if (amountInput.value === '' || !Number.isFinite(amount) || amount < 0 || amount > 100000000 || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(multiplier) || multiplier <= 0) {
                result.textContent = t.errorMsgInput;
                result.classList.add('error');
                return;
            }

            const unit = t.unit || (lang === 'en' ? 1 : 100);
            const points = Math.round((amount / unit) * rate * multiplier);

            const localeCode = lang === 'en' ? 'en-US' : lang === 'ko' ? 'ko-KR' : lang === 'zh' ? 'zh-TW' : 'ja-JP';
            result.textContent = `${t.resultPointsPrefix}${points.toLocaleString(localeCode)}${t.resultPointsSuffix}`;
            result.classList.remove('error');
        }
    }

    if (!customElements.get('playpoint-widget')) {
        customElements.define('playpoint-widget', PlayPointWidget);
    }

    // data属性連携
    document.querySelectorAll('[data-playpoint-widget]').forEach((target) => {
        if (!target.querySelector('playpoint-widget')) {
            const widget = document.createElement('playpoint-widget');
            const theme = target.getAttribute('data-theme');
            const lang = target.getAttribute('data-lang');
            const mode = target.getAttribute('data-mode');
            if (theme) widget.setAttribute('theme', theme);
            if (lang) widget.setAttribute('lang', lang);
            if (mode) widget.setAttribute('mode', mode);
            target.appendChild(widget);
        }
    });
})();
