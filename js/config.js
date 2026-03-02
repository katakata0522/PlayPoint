'use strict';

const PP_CONSTANTS = {
    ICON_SUN: '<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>',
    ICON_MOON: '<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>',
    MODE_MAIN: 'main',
    MODE_REVERSE: 'reverse',
    MODE_DIARY: 'diary',
    CLASS_VISIBLE: 'visible',
    CLASS_HAS_RESULT: 'has-result',
    CLASS_ACTIVE: 'active',
    CLASS_HIDDEN: 'hidden',
    SELECTOR_INFO_BTN: '.info-btn',
    SELECTOR_TOOLTIP_BOX: '.tooltip-box',
    DIARY_DATA_KEY: 'hokuhokuDiaryData',
    SAVE_CONFIRMATION_DURATION: 1500,
    STORAGE_REGION_KEY: 'playpointPreferredRegion'
};

const PP_REGION_CONFIGS = {
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
            title: "Playポイント計算機 | あといくらでレベルアップ？", mainTitle: "Playポイント計算機",
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
            yearSuffix: "年", monthNames: ["１月", "２月", "３月", "４月", "５月", "６月", "７月", "８月", "９月", "１0月", "１１月", "１２月"],
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
            title: "Play Points Calculator | How much to level up?", mainTitle: "Play Points Calculator",
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

PP_REGION_CONFIGS.JP.tooltips['tooltip-reverse-base-rate'] = PP_REGION_CONFIGS.JP.tooltips['tooltip-base-rate'];
PP_REGION_CONFIGS.JP.tooltips['tooltip-reverse-multiplier'] = PP_REGION_CONFIGS.JP.tooltips['tooltip-multiplier'];
PP_REGION_CONFIGS.US.tooltips['tooltip-reverse-base-rate'] = PP_REGION_CONFIGS.US.tooltips['tooltip-base-rate'];
PP_REGION_CONFIGS.US.tooltips['tooltip-reverse-multiplier'] = PP_REGION_CONFIGS.US.tooltips['tooltip-multiplier'];

const PP_STATE = {
    currentRegion: 'JP',
    dom: {},
    diaryState: {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1,
    }
};
