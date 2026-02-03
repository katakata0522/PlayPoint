(function() {
    'use strict';

    // SVG Icons
    const ICON_SUN = '<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>';
    const ICON_MOON = '<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>';

    // トースト通知を表示する関数
    function showToast(message, type = 'normal') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = 'toast show'; // リセット
        if (type === 'error') {
            toast.classList.add('error');
        }

        setTimeout(() => {
            toast.className = 'toast'; // 非表示
        }, 3000);
    }

    // グローバルエラーハンドラー
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("予期せぬエラーが発生しました:", { message, source, lineno, colno, error });
        showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", 'error');
        return true; 
    };

    const MODE_MAIN = 'main';
    const MODE_REVERSE = 'reverse';
    const MODE_DIARY = 'diary';

    const CLASS_VISIBLE = 'visible';
    const CLASS_HAS_RESULT = 'has-result';
    const CLASS_ACTIVE = 'active';
    const CLASS_HIDDEN = 'hidden';
    const SELECTOR_INFO_BTN = '.info-btn';
    const SELECTOR_TOOLTIP_BOX = '.tooltip-box';
    const DIARY_DATA_KEY = 'hokuhokuDiaryData';
    const SAVE_CONFIRMATION_DURATION = 1500;
    const STORAGE_REGION_KEY = 'playpointPreferredRegion';

    // ▼ リンク先をファイル名に変更済み（設定オブジェクト内） ▼
    const regionConfigs = {
        'JP': {
            lang: "ja",
            statuses: { "ブロンズ": 1.0, "シルバー": 1.25, "ゴールド": 1.5, "プラチナ": 1.75, "ダイヤモンド": 2.0 },
            statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
            thresholds: { "シルバー": 250, "ゴールド": 1000, "プラチナ": 3000, "ダイヤモンド": 15000 },
            statusPointsMapping: { 1.0: ["シルバー", "ゴールド", "プラチナ", "ダイヤモンド"], 1.25: ["ゴールド", "プラチナ", "ダイヤモンド"], 1.5: ["プラチナ", "ダイヤモンド"], 1.75: ["ダイヤモンド"], 2.0: [] },
            currencySymbol: "円",
            rateUnit: "100円",
            tooltips: {
                'tooltip-current-status': `<strong>【現在のステータスの確認方法】</strong><ol><li>Google Play ストアを開きます。</li><li>右上のプロフィールアイコンをタップします。</li><li>「Play ポイント」を選択します。</li></ol><hr><p>※ステータスに応じて、基本還元率は自動で入力されます。</p>`,
                'tooltip-target-status': `<strong>【各ステータスの達成条件】</strong><ul><li><strong>シルバー:</strong> 250 pt 以上</li><li><strong>ゴールド:</strong> 1,000 pt 以上</li><li><strong>プラチナ:</strong> 3,000 pt 以上</li><li><strong>ダイヤモンド:</strong> 15,000 pt 以上</li></ul>`,
                'tooltip-needed-points': `<strong>【必要ポイントの確認方法】</strong><ol><li>Google Play ストアの「Play ポイント」画面を開きます。</li><li>画面に表示される「次のステータスまであと◯◯ pt」という部分の数字を、そのまま入力してください。</li></ol>`,
                'tooltip-base-rate': `<strong>【基本還元ポイントについて】</strong><p>現在のステータスに応じた、基本の還元率が自動で入力されます。</p><p><strong>特定のアプリ限定のポイント増量キャンペーン</strong>などを利用する場合は、こちらの数値を直接編集してください。</p><hr><p><strong>※ご注意</strong><br>この値と「キャンペーン倍率」で計算した値を比較し、<strong>よりお得な方</strong>が計算に自動で適用されます。</p>`,
                'tooltip-multiplier': `<strong>【キャンペーン倍率について】</strong><p>週末などに開催される、ポイント増量キャンペーンの倍率を入力します。</p><p>例：ゴールド(1.5pt) × <strong>3倍</strong> = 4.5pt</p><hr><p><strong>※ご注意</strong><br>この倍率で計算した値と「基本還元ポイント」の入力値を比較し、<strong>よりお得な方</strong>が計算に自動で適用されます。</p>`,
                'tooltip-amount-yen': `<strong>【獲得ポイントを計算】</strong><p>入力した金額で、どれくらいのポイントが獲得できるかをシミュレーションします。</p>`,
                'tooltip-reverse-status': `<strong>【ステータスごとの基本還元率】</strong><ul><li><strong>ブロンズ:</strong> 1.0 pt / 100円</li><li><strong>シルバー:</strong> 1.25 pt / 100円</li><li><strong>ゴールド:</strong> 1.5 pt / 100円</li><li><strong>プラチナ:</strong> 1.75 pt / 100円</li><li><strong>ダイヤモンド:</strong> 2.0 pt / 100円</li></ul>`
            },
            uiText: {
                title: "Playポイント計算機", mainTitle: "Playポイント計算機",
                siteDescription: "現在のステータスから目標達成までの必要課金額の計算ができます！<br>さらに課金額から獲得できるポイントも計算できます！",
                tabMain: "通常計算", tabReverse: "逆算モード", tabDiary: "ほくほくリワード日記",
                sectionTitleStatus: "ステータス入力", labelCurrentStatus: "現在のステータス",
                labelTargetStatus: "目標ステータス", labelNeededPoints: "目標までの必要ポイント",
                neededPointsPlaceholder: "例：1728", sectionTitleRate: "還元設定",
                labelBaseRate: "100円あたりの基本還元ポイント", labelMultiplier: "キャンペーン倍率（例：3倍）", labelMultiplierReverse: "キャンペーン倍率",
                warningRate: "※ ポイント増量/倍率について:<br>計算時、入力値と(ステータス×倍率)を比較し、より有利な方が自動適用されます (併用不可)",
                calculateButton: "課金額を計算", copyButton: "コピーする", tweetButton: "結果をXでシェア",
                sectionTitleReverse: "逆算モード", labelAmountYen: "課金額（円）",
                amountYenPlaceholder: "例：5000", reverseCalculateButton: "ポイントを計算",
                nextTargetNone: "次の目標はありません", errorInput: "有効な数値を入力し、目標ステータスを選択してください",
                errorRate: "計算に使用する還元率が0以下です", errorMonth: "残り月数計算エラー",
                errorInputReverse: "有効な数値を入力してください", errorRateReverse: "計算に使用する還元率が負数です",
                resultLabelNeededPoints: "目標までの必要ポイント", resultLabelTotalYen: "合計の必要課金額目安",
                resultLabelMonthlyYen: "月平均", resultLabelMonths: "ヶ月",
                resultLabelRate: "適用還元率", resultLabelEarnedPoints: "獲得ポイント予測",
                yearSuffix: "年", monthNames: ["１月", "２月", "３月", "４月", "５月", "６月", "７月", "８月", "９月", "１０月", "１１月", "１２月"],
                weekLabel: "第", weekSuffix: "週", pointsPlaceholder: "ポイント", saveButton: "保存",
                monthlySummaryTitle: "月間集計", yearlySummaryTitle: "年間集計",
                totalLabel: "合計:", averageLabel: "平均:", pointsUnit: "pt", perWeekUnit: "pt/週",
                guestNotice: "【！】現在、この日記の記録はブラウザ内にのみ保存されます。ブラウザのキャッシュ削除や閲覧データ削除で記録が消えてしまうのでご注意ください。※将来的にサーバー側に記録を保存できる会員機能も検討中です！ご期待ください！",
                prizeOptions: ["景品なし", "マウス", "イヤホン", "その他"],
                noWeeksMessage: "この月には対象となる週がありません。",
                linkPrivacy: { text: "プライバシーポリシー", href: "privacy.html" },
                linkTerms: { text: "利用規約", href: "terms.html" },
                linkQA: { text: "Q&A・あとがき", href: "info.html" },
                linkFeedback: { text: "ご意見・ご感想", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
                linkAbout: { text: "Playポイントとは？", href: "about-playpoints.html" }
            }
        },
        'US': {
            lang: "en",
            statuses: { "Bronze": 1.0, "Silver": 1.1, "Gold": 1.2, "Platinum": 1.4, "Diamond": 1.6 },
            statusRates: { 1.0: 1.0, 1.1: 1.1, 1.2: 1.2, 1.4: 1.4, 1.6: 1.6 },
            thresholds: { "Silver": 150, "Gold": 600, "Platinum": 3000, "Diamond": 10000 },
            statusPointsMapping: { 1.0: ["Silver", "Gold", "Platinum", "Diamond"], 1.1: ["Gold", "Platinum", "Diamond"], 1.2: ["Platinum", "Diamond"], 1.4: ["Diamond"], 1.6: [] },
            currencySymbol: "USD",
            rateUnit: "$1",
            tooltips: {
                'tooltip-current-status': `<strong>How to check your current status:</strong><ol><li>Open the Google Play Store.</li><li>Tap your profile icon in the top right.</li><li>Select "Play Points".</li></ol><hr><p>Note: The base points rate is automatically filled based on your status.</p>`,
                'tooltip-target-status': `<strong>Level-up requirements:</strong><ul><li><strong>Silver:</strong> 150+ pts</li><li><strong>Gold:</strong> 600+ pts</li><li><strong>Platinum:</strong> 3,000+ pts</li><li><strong>Diamond:</strong> 10,000+ pts</li></ul>`,
                'tooltip-needed-points': `<strong>How to check points needed:</strong><ol><li>Go to the "Play Points" screen in the Google Play Store.</li><li>Enter the number shown in "XX pts to next level".</li></ol>`,
                'tooltip-base-rate': `<strong>About base points rate:</strong><p>The base rate according to your current status is automatically entered.</p><p>If you are using an app-specific point boost campaign, please edit this value directly.</p><hr><p><strong>Note:</strong><br>The calculator will automatically use whichever is higher: this value or the rate calculated from the "Campaign Multiplier".</p>`,
                'tooltip-multiplier': `<strong>About campaign multiplier:</strong><p>Enter the multiplier for point boost campaigns, such as those held on weekends.</p><p>Example: Gold (1.2 pts) × <strong>3x</strong> = 3.6 pts</p><hr><p><strong>Note:</strong><br>The calculator will automatically use whichever is higher: the rate calculated with this multiplier or the "Base points rate" value.</p>`,
                'tooltip-amount-yen': `<strong>Calculate points earned:</strong><p>Simulate how many points you can earn from the amount you spend.</p>`,
                'tooltip-reverse-status': `<strong>Base points rate per status:</strong><ul><li><strong>Bronze:</strong> 1.0 pt / $1</li><li><strong>Silver:</strong> 1.1 pts / $1</li><li><strong>Gold:</strong> 1.2 pts / $1</li><li><strong>Platinum:</strong> 1.4 pts / $1</li><li><strong>Diamond:</strong> 1.6 pts / $1</li></ul>`
            },
            uiText: {
                title: "Play Points Calculator", mainTitle: "Play Points Calculator",
                siteDescription: "Calculate how much you need to spend to reach your goal status!<br>Also, calculate how many points you can earn from your spending!",
                tabMain: "Standard", tabReverse: "Reverse", tabDiary: "Weekly Awards Diary",
                sectionTitleStatus: "Status Input", labelCurrentStatus: "Current Status",
                labelTargetStatus: "Target Status", labelNeededPoints: "Points to Next Level",
                neededPointsPlaceholder: "e.g., 125", sectionTitleRate: "Points Rate Setting",
                labelBaseRate: "Base points per $1", labelMultiplier: "Campaign Multiplier (e.g., 3x)", labelMultiplierReverse: "Campaign Multiplier",
                warningRate: "*Note: The higher of the input value or (Status x Multiplier) will be automatically applied.",
                calculateButton: "Calculate Amount", copyButton: "Copy", tweetButton: "Share on X",
                sectionTitleReverse: "Reverse Mode", labelAmountYen: "Amount Spent (USD)",
                amountYenPlaceholder: "e.g., 50", reverseCalculateButton: "Calculate Points",
                nextTargetNone: "No further levels", errorInput: "Please enter valid numbers and select a target status.",
                errorRate: "The effective rate for calculation is zero or less.", errorMonth: "Error calculating remaining months.",
                errorInputReverse: "Please enter a valid number.", errorRateReverse: "The effective rate for calculation is negative.",
                resultLabelNeededPoints: "Points to goal", resultLabelTotalYen: "Estimated total spending",
                resultLabelMonthlyYen: "Monthly average", resultLabelMonths: "months",
                resultLabelRate: "Effective rate", resultLabelEarnedPoints: "Estimated points earned",
                yearSuffix: "", monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                weekLabel: "Week", weekSuffix: "", pointsPlaceholder: "Points", saveButton: "Save",
                monthlySummaryTitle: "Monthly Summary", yearlySummaryTitle: "Yearly Summary",
                totalLabel: "Total:", averageLabel: "Average:", pointsUnit: "pts", perWeekUnit: "pts/week",
                guestNotice: "[!] Right now, your diary records are saved only in this browser. If you clear cache or browsing data, the records may be lost. In the future, we are considering a member feature to store data on the server — please look forward to it!",
                prizeOptions: ["No Prize", "Mouse", "Earbuds", "Other"],
                noWeeksMessage: "No applicable weeks in this month.",
                linkPrivacy: { text: "Privacy Policy", href: "privacy.html" },
                linkTerms: { text: "Terms of Service", href: "terms.html" },
                linkQA: { text: "Q&A & Afterword", href: "info.html" },
                linkFeedback: { text: "Feedback", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
                linkAbout: { text: "What are Play Points?", href: "about-playpoints.html" }
            }
        }
    };

    // ツールチップの共用設定
    regionConfigs.JP.tooltips['tooltip-reverse-base-rate'] = regionConfigs.JP.tooltips['tooltip-base-rate'];
    regionConfigs.JP.tooltips['tooltip-reverse-multiplier'] = regionConfigs.JP.tooltips['tooltip-multiplier'];
    regionConfigs.US.tooltips['tooltip-reverse-base-rate'] = regionConfigs.US.tooltips['tooltip-base-rate'];
    regionConfigs.US.tooltips['tooltip-reverse-multiplier'] = regionConfigs.US.tooltips['tooltip-multiplier'];

    let currentRegion = 'JP';
    const dom = {};
    let diaryState = {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1,
    };

    function updateUIText() {
        const config = regionConfigs[currentRegion];
        const texts = config.uiText;
        document.documentElement.lang = config.lang;
        document.title = texts.title;

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (!texts[key]) return;

            if (el.tagName === 'A' && typeof texts[key] === 'object' && texts[key].text) {
                el.textContent = texts[key].text;
                if (texts[key].href) {
                    el.href = texts[key].href;
                }
                return;
            }

            const allowHtmlKeys = ['siteDescription', 'warningRate', 'guestNotice'];
            if (allowHtmlKeys.includes(key)) {
                el.innerHTML = texts[key];
            } else {
                el.textContent = texts[key];
            }
        });

        if (dom.neededPoints) dom.neededPoints.placeholder = texts.neededPointsPlaceholder;
        if (dom.amountYen) dom.amountYen.placeholder = texts.amountYenPlaceholder;

        document.querySelectorAll('.tooltip-box').forEach(box => {
            if (config.tooltips[box.id]) {
                box.innerHTML = config.tooltips[box.id];
            }
        });
    }

    function shareOnTwitter(text) {
        const siteUrl = "https://www.playpoint-sim.com/";
        const fullText = `${text}\n\n#Playポイント計算してみた\n#GooglePlayポイント\n\n${siteUrl}`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, '_blank');
    }

    function loadDiaryData() {
        try {
            const data = localStorage.getItem(DIARY_DATA_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("日記データの読み込みに失敗しました:", e);
            showToast("日記データの読み込みに失敗しました。", 'error');
            return {};
        }
    }

    function saveDiaryData(data) {
        try {
            localStorage.setItem(DIARY_DATA_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("日記データの保存に失敗しました:", e);
            showToast("日記データの保存に失敗しました。", 'error');
        }
    }

    function getFridays(year, month) {
        const fridays = [];
        const date = new Date(year, month - 1, 1);
        while (date.getMonth() === month - 1) {
            if (date.getDay() === 5) { fridays.push(new Date(date)); }
            date.setDate(date.getDate() + 1);
        }
        return fridays;
    }

    function renderDiary() {
        if (!dom.diaryMode) return;
        const config = regionConfigs[currentRegion];
        const texts = config.uiText;
        dom.currentYear.textContent = `${diaryState.currentYear}${texts.yearSuffix || ''}`;
        renderMonthSelector();
        renderWeekInputs();
        updateSummary();
    }

    function renderMonthSelector() {
        if (!dom.monthSelector) return;
        const texts = regionConfigs[currentRegion].uiText;
        dom.monthSelector.innerHTML = '';
        texts.monthNames.forEach((name, index) => {
            const monthNum = index + 1;
            const button = document.createElement('button');
            button.textContent = name;
            button.dataset.month = monthNum;
            if (monthNum === diaryState.currentMonth) button.classList.add(CLASS_ACTIVE);
            button.addEventListener('click', () => {
                diaryState.currentMonth = monthNum;
                renderDiary();
            });
            dom.monthSelector.appendChild(button);
        });
    }

    function renderWeekInputs() {
        if (!dom.weekInputs || !dom.selectedMonth) return;
        const texts = regionConfigs[currentRegion].uiText;
        dom.weekInputs.innerHTML = '';
        dom.selectedMonth.textContent = texts.monthNames[diaryState.currentMonth - 1];
        const fridays = getFridays(diaryState.currentYear, diaryState.currentMonth);
        const data = loadDiaryData();
        const yearData = data[diaryState.currentYear] || {};
        const monthData = yearData[diaryState.currentMonth] || {};
        if (fridays.length === 0) {
            dom.weekInputs.innerHTML = `<p>${texts.noWeeksMessage}</p>`;
            return;
        }
        fridays.forEach((friday, index) => {
            const weekNum = index + 1;
            const dateString = `${friday.getMonth() + 1}/${friday.getDate()}`;
            const weekData = monthData[weekNum] || { points: '', prize: texts.prizeOptions[0] };
            const row = document.createElement('div');
            row.className = 'week-row';
            const prizeOptionsHTML = texts.prizeOptions.map(opt => `<option value="${opt}" ${weekData.prize === opt ? 'selected' : ''}>${opt}</option>`).join('');
            row.innerHTML = `
                <label for="week${weekNum}_points">${texts.weekLabel}${weekNum}${texts.weekSuffix} (${dateString})</label>
                <input type="number" id="week${weekNum}_points" placeholder="${texts.pointsPlaceholder}" value="${weekData.points || ''}" inputmode="numeric">
                <select id="week${weekNum}_prize">${prizeOptionsHTML}</select>
                <button data-week="${weekNum}">${texts.saveButton}</button>
            `;
            dom.weekInputs.appendChild(row);
        });
    }

    function updateSummary() {
        if (!dom.monthlyTotal || !dom.yearlyTotal) return;
        const config = regionConfigs[currentRegion];
        const data = loadDiaryData();
        const yearData = data[diaryState.currentYear] || {};
        const monthData = yearData[diaryState.currentMonth] || {};
        let monthlyTotal = 0, monthlyWeeksWithPoints = 0;
        Object.values(monthData).forEach(week => {
            const points = parseInt(week.points, 10);
            if (!isNaN(points)) { monthlyTotal += points; monthlyWeeksWithPoints++; }
        });
        dom.monthlyTotal.textContent = monthlyTotal.toLocaleString(config.lang);
        dom.monthlyAverage.textContent = (monthlyWeeksWithPoints > 0 ? (monthlyTotal / monthlyWeeksWithPoints).toFixed(1) : '0.0');
        let yearlyTotal = 0, yearlyWeeksWithPoints = 0;
        Object.values(yearData).forEach(month => {
            Object.values(month).forEach(week => {
                const points = parseInt(week.points, 10);
                if (!isNaN(points)) { yearlyTotal += points; yearlyWeeksWithPoints++; }
            });
        });
        dom.yearlyTotal.textContent = yearlyTotal.toLocaleString(config.lang);
        dom.yearlyAverage.textContent = (yearlyWeeksWithPoints > 0 ? (yearlyTotal / yearlyWeeksWithPoints).toFixed(1) : '0.0');
    }

    function handleDiarySave(e) {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.week) {
            const weekNum = e.target.dataset.week;
            const pointsInput = dom.weekInputs.querySelector(`#week${weekNum}_points`);
            const prizeSelect = dom.weekInputs.querySelector(`#week${weekNum}_prize`);
            const data = loadDiaryData();
            if (!data[diaryState.currentYear]) data[diaryState.currentYear] = {};
            if (!data[diaryState.currentYear][diaryState.currentMonth]) data[diaryState.currentYear][diaryState.currentMonth] = {};
            data[diaryState.currentYear][diaryState.currentMonth][weekNum] = { points: pointsInput.value, prize: prizeSelect.value };
            saveDiaryData(data);
            const originalText = regionConfigs[currentRegion].uiText.saveButton;
            e.target.textContent = 'OK!';
            e.target.disabled = true;
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, SAVE_CONFIRMATION_DURATION);
            updateSummary();
        }
    }

    function updateUIForRegion() {
        updateUIText();
        populateStatusSelects();
        updateBaseRateAndTarget();
        updateReverseBaseRate();
        if(dom.result) clearResult(dom.result);
        if(dom.reverseResult) clearResult(dom.reverseResult);
        if (dom.diaryMode && !dom.diaryMode.classList.contains(CLASS_HIDDEN)) renderDiary();
    }

    function switchRegion(newRegion) {
        if (!regionConfigs[newRegion] || currentRegion === newRegion) return;
        currentRegion = newRegion;
        document.querySelectorAll(".region-switch button").forEach(button => {
            button.classList.toggle(CLASS_ACTIVE, button.dataset.region === newRegion);
        });
        try {
            localStorage.setItem(STORAGE_REGION_KEY, newRegion);
        } catch (e) {
            console.error("地域設定の保存に失敗しました:", e);
            showToast("地域設定の保存に失敗しました。", 'error');
        }
        updateUIForRegion();
    }

    function populateStatusSelects() {
        const config = regionConfigs[currentRegion];
        const statuses = config.statuses;
        [dom.currentStatus, dom.reverseStatus].forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '';
                for (const [name, value] of Object.entries(statuses)) {
                    select.add(new Option(name, value));
                }
                const currentKey = Object.keys(statuses).find(k => statuses[k] == currentValue);
                select.value = currentKey ? currentValue : config.statuses[Object.keys(statuses)[2]];
            }
        });
    }

    function updateBaseRateAndTarget() {
        if (!dom.currentStatus || !dom.baseRate || !dom.targetStatus) return;
        const config = regionConfigs[currentRegion];
        const currentStatusValue = parseFloat(dom.currentStatus.value);
        dom.baseRate.value = (config.statusRates[currentStatusValue] || 1.0).toFixed(2);
        dom.targetStatus.innerHTML = "";
        const availableTargets = config.statusPointsMapping[currentStatusValue] || [];
        availableTargets.forEach(targetLabel => {
            const points = config.thresholds[targetLabel];
            if (points) {
                const option = new Option(`${targetLabel} (${points.toLocaleString(config.lang)}pt)`, points);
                option.dataset.statusLabel = targetLabel;
                dom.targetStatus.add(option);
            }
        });
        if (availableTargets.length === 0) {
            const option = new Option(config.uiText.nextTargetNone, "");
            option.disabled = true;
            dom.targetStatus.add(option);
        }
    }

    function updateReverseBaseRate() {
        if (!dom.reverseStatus || !dom.reverseBaseRate) return;
        const config = regionConfigs[currentRegion];
        const selectedStatusValue = parseFloat(dom.reverseStatus.value);
        dom.reverseBaseRate.value = (config.statusRates[selectedStatusValue] || 1.0).toFixed(2);
    }

    const getRemainingMonths = () => 12 - new Date().getMonth();
    const getValidNumberInput = (element, min = -Infinity) => {
        if (!element) return null;
        const value = parseFloat(element.value);
        return (isNaN(value) || value < min) ? null : value;
    };

    const getFinalRate = (baseRateElement, statusSelectElement, multiplierElement) => {
        const config = regionConfigs[currentRegion];
        const editedBaseRate = getValidNumberInput(baseRateElement, 0.01);
        const multiplier = getValidNumberInput(multiplierElement, 1);
        const statusValue = parseFloat(statusSelectElement.value);
        const statusRate = config.statusRates[statusValue];
        if (editedBaseRate === null || multiplier === null || !statusRate) return null;
        return Math.max(editedBaseRate, statusRate * multiplier);
    };

    function displayResult(targetElement, content, isError = false) {
        if (!targetElement) return;
        targetElement.innerHTML = isError ? `<span class="error-text">${content}</span>` : content;
        targetElement.classList.add(CLASS_HAS_RESULT);
        const showShareButtons = !isError;

        if (targetElement === dom.result) {
            if (dom.tweetButton) dom.tweetButton.classList.toggle(CLASS_HIDDEN, !showShareButtons);
            if (dom.copyButton) dom.copyButton.classList.toggle(CLASS_HIDDEN, !showShareButtons);
        } else if (targetElement === dom.reverseResult) {
            if(dom.shareTwitterReverse) dom.shareTwitterReverse.classList.toggle(CLASS_HIDDEN, !showShareButtons);
        }
    }

    function clearResult(targetElement) {
        if (!targetElement) return;
        targetElement.innerHTML = "";
        targetElement.classList.remove(CLASS_HAS_RESULT);
        if (targetElement === dom.result) {
            if(dom.tweetButton) dom.tweetButton.classList.add(CLASS_HIDDEN);
            if(dom.copyButton) dom.copyButton.classList.add(CLASS_HIDDEN);
        } else if (targetElement === dom.reverseResult) {
            if(dom.shareTwitterReverse) dom.shareTwitterReverse.classList.add(CLASS_HIDDEN);
        }
    }

    function calculate() {
        const config = regionConfigs[currentRegion];
        const texts = config.uiText;
        const neededPoints = getValidNumberInput(dom.neededPoints, 0.01);
        const finalRate = getFinalRate(dom.baseRate, dom.currentStatus, dom.multiplier);
        const selectedTargetOption = dom.targetStatus.options[dom.targetStatus.selectedIndex];
        const targetStatusLabel = selectedTargetOption ? selectedTargetOption.dataset.statusLabel : null;
        if (neededPoints === null || finalRate === null || !targetStatusLabel) return displayResult(dom.result, texts.errorInput, true);
        if (finalRate <= 0) return displayResult(dom.result, texts.errorRate, true);
        const remainingMonths = getRemainingMonths();
        if (remainingMonths <= 0) return displayResult(dom.result, texts.errorMonth, true);
        const spendUnit = (currentRegion === 'JP') ? 100 : 1;
        const totalAmountNeeded = Math.ceil((neededPoints / finalRate) * spendUnit);
        const monthlyAmountNeeded = Math.ceil(totalAmountNeeded / remainingMonths);
        const resultContent = `<dl><dt>${texts.resultLabelNeededPoints}</dt><dd><b>${neededPoints.toLocaleString(config.lang)} pt</b></dd><dt>${texts.resultLabelTotalYen}</dt><dd><b>${totalAmountNeeded.toLocaleString(config.lang)} ${config.currencySymbol}</b></dd><dt>${texts.resultLabelMonthlyYen} (${remainingMonths}${texts.resultLabelMonths})</dt><dd><b>約 ${monthlyAmountNeeded.toLocaleString(config.lang)} ${config.currencySymbol}/月</b></dd></dl><span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>`;
        displayResult(dom.result, resultContent);
        dom.result.dataset.requiredYen = totalAmountNeeded;
        dom.result.dataset.targetStatusLabel = targetStatusLabel;
    }

    function reverseCalculate() {
        const config = regionConfigs[currentRegion];
        const texts = config.uiText;
        const amountYen = getValidNumberInput(dom.amountYen, 0);
        const finalRate = getFinalRate(dom.reverseBaseRate, dom.reverseStatus, dom.reverseMultiplier);
        if (amountYen === null || finalRate === null) return displayResult(dom.reverseResult, texts.errorInputReverse, true);
        if (finalRate < 0) return displayResult(dom.reverseResult, texts.errorRateReverse, true);
        const spendUnit = (currentRegion === 'JP') ? 100 : 1;
        const earnedPoints = (amountYen / spendUnit) * finalRate;
        const resultContent = `<dl><dt>${texts.resultLabelEarnedPoints}</dt><dd><b>${earnedPoints.toLocaleString(config.lang, {minimumFractionDigits: 0, maximumFractionDigits: 2})} pt</b></dd></dl><span class="rate-info">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit})</span>`;
        displayResult(dom.reverseResult, resultContent);
        dom.reverseResult.dataset.earnedPoints = earnedPoints.toFixed(2);
        dom.reverseResult.dataset.amountYen = amountYen;
    }

    function copyResult() {
        if (!dom.copyButton) return;
        const requiredYen = dom.result.dataset.requiredYen;
        const targetStatusLabel = dom.result.dataset.targetStatusLabel;
        if (!dom.result.classList.contains(CLASS_HAS_RESULT) || !requiredYen || !targetStatusLabel) return;
        const config = regionConfigs[currentRegion];
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const textToCopy = `▼Playポイント計算結果▼\n目標ステータス： ${targetStatusLabel}\n必要な課金額の目安： 約${formattedYen}${config.currencySymbol}\n\n計算元：Playポイント計算機 ( https://www.playpoint-sim.com/ )`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => { showToast("クリップボードにコピーしました！"); })
            .catch(() => { showToast("コピーに失敗しました。", 'error'); });
    }

    function handleTweet() {
        const requiredYen = dom.result.dataset.requiredYen;
        const targetStatusLabel = dom.result.dataset.targetStatusLabel;
        if (!requiredYen || !targetStatusLabel) return;
        const config = regionConfigs[currentRegion];
        const formattedYen = parseFloat(requiredYen).toLocaleString(config.lang);
        const text = `【Playポイント計算機で試算】\n私の目標「${targetStatusLabel}」まで、あと【${formattedYen}${config.currencySymbol}】必要みたい！💰`;
        shareOnTwitter(text);
    }

    function handleTweetReverse() {
        const earnedPoints = dom.reverseResult.dataset.earnedPoints;
        const amountYen = dom.reverseResult.dataset.amountYen;
        if (!earnedPoints || !amountYen) return;
        const config = regionConfigs[currentRegion];
        const formattedPoints = parseFloat(earnedPoints).toLocaleString(config.lang, { maximumFractionDigits: 2 });
        const formattedYen = parseFloat(amountYen).toLocaleString(config.lang);
        const text = `【Playポイント計算機で試算】\n${formattedYen}${config.currencySymbol}使うと、約 ${formattedPoints}ポイント 獲得できるみたい！✨`;
        shareOnTwitter(text);
    }

    function switchMode(mode) {
        dom.mainMode.classList.toggle(CLASS_HIDDEN, mode !== MODE_MAIN);
        dom.reverseMode.classList.toggle(CLASS_HIDDEN, mode !== MODE_REVERSE);
        if (dom.diaryMode) dom.diaryMode.classList.toggle(CLASS_HIDDEN, mode !== MODE_DIARY);
        document.querySelectorAll(".tab-switch button").forEach(button => {
            button.classList.toggle(CLASS_ACTIVE, button.dataset.mode === mode);
        });
        if(dom.result) clearResult(dom.result);
        if(dom.reverseResult) clearResult(dom.reverseResult);
        if (mode === MODE_DIARY) renderDiary();
    }

    function closeAllTooltips() {
        document.querySelectorAll(`${SELECTOR_TOOLTIP_BOX}.${CLASS_VISIBLE}`).forEach(box => {
            box.classList.remove(CLASS_VISIBLE);
            const btn = box.parentElement.querySelector(SELECTOR_INFO_BTN);
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    }

    function toggleTooltip(event) {
        event.preventDefault();
        event.stopPropagation();
        const btn = event.currentTarget;
        const tooltip = btn.parentElement.querySelector(SELECTOR_TOOLTIP_BOX);
        if (!tooltip) return;
        const isVisible = tooltip.classList.contains(CLASS_VISIBLE);
        closeAllTooltips();
        if (!isVisible) {
            tooltip.classList.add(CLASS_VISIBLE);
            btn.setAttribute('aria-expanded', 'true');
        }
    }

    function init() {
        const ids = [
            'mainMode', 'reverseMode', 'currentStatus', 'baseRate', 'targetStatus',
            'neededPoints', 'multiplier', 'calculateButton', 'result', 'copyButton',
            'tweetButton', 'amountYen', 'reverseStatus', 'reverseBaseRate',
            'reverseMultiplier', 'reverseCalculateButton', 'reverseResult', 'share-twitter-reverse',
            'copyright-year',
            'tab-diary', 'diaryMode', 'prevYearBtn', 'currentYear', 'nextYearBtn',
            'monthSelector', 'selectedMonth', 'weekInputs', 'monthlyTotal', 'monthlyAverage',
            'yearlyTotal', 'yearlyAverage', 'diary-guest-notice'
        ];
        ids.forEach(id => {
            const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
            const element = document.getElementById(id);
            if (element) dom[key] = element;
        });

        if (dom.calculateButton) dom.calculateButton.addEventListener('click', calculate);
        if (dom.copyButton) dom.copyButton.addEventListener('click', copyResult);
        if (dom.tweetButton) dom.tweetButton.addEventListener('click', handleTweet);
        if (dom.reverseCalculateButton) dom.reverseCalculateButton.addEventListener('click', reverseCalculate);
        if (dom.shareTwitterReverse) dom.shareTwitterReverse.addEventListener('click', handleTweetReverse);
        if (dom.currentStatus) dom.currentStatus.addEventListener('change', updateBaseRateAndTarget);
        if (dom.reverseStatus) dom.reverseStatus.addEventListener('change', updateReverseBaseRate);

        [dom.neededPoints, dom.baseRate, dom.multiplier].forEach(el => {
            if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); calculate();} });
        });
        [dom.amountYen, dom.reverseBaseRate, dom.reverseMultiplier].forEach(el => {
            if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); reverseCalculate();} });
        });

        document.querySelectorAll(".tab-switch button").forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
        document.querySelectorAll(SELECTOR_INFO_BTN).forEach(button => {
            button.addEventListener('click', toggleTooltip);
            button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTooltip(e); } });
        });
        document.querySelectorAll(".region-switch button").forEach(button => button.addEventListener('click', (e) => switchRegion(e.currentTarget.dataset.region)));
        document.addEventListener('click', (e) => { if (!e.target.closest(SELECTOR_INFO_BTN) && !e.target.closest(SELECTOR_TOOLTIP_BOX)) closeAllTooltips(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllTooltips(); });

        if (dom.prevYearBtn) dom.prevYearBtn.addEventListener('click', () => { if (diaryState.currentYear > 2023) { diaryState.currentYear--; renderDiary(); } });
        if (dom.nextYearBtn) dom.nextYearBtn.addEventListener('click', () => { diaryState.currentYear++; renderDiary(); });
        if (dom.weekInputs) dom.weekInputs.addEventListener('click', handleDiarySave);

        if (dom.copyrightYear) dom.copyrightYear.textContent = new Date().getFullYear();

        // 保存された地域設定があれば復元
        try {
            const savedRegion = localStorage.getItem(STORAGE_REGION_KEY);
            if (savedRegion && regionConfigs[savedRegion]) {
                currentRegion = savedRegion;
            }
        } catch (e) {
            console.error("地域設定の読み込みに失敗しました:", e);
            // alert("地域設定の読み込みに失敗しました。"); // ユーザー通知は任意
        }

        // ヘッダーの地域ボタンの見た目を現在の地域に同期
        document.querySelectorAll(".region-switch button").forEach(button => {
            button.classList.toggle(CLASS_ACTIVE, button.dataset.region === currentRegion);
        });

        switchMode(MODE_MAIN);
        updateUIForRegion();
    }

    function initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        let storedTheme;

        try {
            storedTheme = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        } catch (e) {
            console.error("テーマ設定の読み込みに失敗しました:", e);
            storedTheme = "light"; // フォールバック
        }

        const updateIcon = (theme) => {
             if (themeToggle) {
                 themeToggle.innerHTML = theme === 'dark' ? ICON_SUN : ICON_MOON;
                 themeToggle.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
             }
        };

        if (storedTheme) {
            document.documentElement.setAttribute('data-theme', storedTheme);
            updateIcon(storedTheme);
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                try {
                    let currentTheme = document.documentElement.getAttribute('data-theme');
                    let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                    updateIcon(newTheme);
                } catch (e) {
                    console.error("テーマ設定の保存に失敗しました:", e);
                    showToast("テーマ設定の保存に失敗しました。", 'error');
                }
            });
        }
    }


    document.addEventListener('DOMContentLoaded', () => {
        init();
        initTheme();
    });

})();
