'use strict';

// GA4本体の読み込み前でも、意味のある完了イベントだけを安全にキューへ積む
export const ANALYTICS = {
    track(eventName, params = {}) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };
        window.gtag('event', eventName, params);
    },
    markEngaged() {
        if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('playpoint:engaged'));
        }
    }
};

export const CONSTANTS = {
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

export const CONFIGS = {
    'JP': {
        lang: "ja",
        statuses: { "ブロンズ": 1.0, "シルバー": 1.25, "ゴールド": 1.5, "プラチナ": 1.75, "ダイヤモンド": 2.0 },
        statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
        thresholds: { "シルバー": 250, "ゴールド": 1000, "プラチナ": 4000, "ダイヤモンド": 15000 },
        statusPointsMapping: { 1.0: ["シルバー", "ゴールド", "プラチナ", "ダイヤモンド"], 1.25: ["ゴールド", "プラチナ", "ダイヤモンド"], 1.5: ["プラチナ", "ダイヤモンド"], 1.75: ["ダイヤモンド"], 2.0: [] },
        currencySymbol: "円",
        rateUnit: "100円",
        tooltips: {
            'tooltip-current-status': `<strong>【現在のステータスの確認方法】</strong><ol><li>Google Play ストアを開きます。</li><li>右上のプロフィールアイコンをタップします。</li><li>「Play ポイント」を選択します。</li></ol><hr><p>※ステータスに応じて、基本還元率は自動で入力されます。</p>`,
            'tooltip-target-status': `<strong>【各ステータスの達成条件】</strong><ul><li><strong>シルバー:</strong> 250 pt 以上</li><li><strong>ゴールド:</strong> 1,000 pt 以上</li><li><strong>プラチナ:</strong> 4,000 pt 以上</li><li><strong>ダイヤモンド:</strong> 15,000 pt 以上</li></ul><hr><p>※ポイントは毎年1月1日〜12月31日の1年間で累積され、目標ポイントに達した時点で即座にランクアップします（有効期限は翌年末まで）。</p>`,
            'tooltip-needed-points': `<strong>【必要ポイントの確認方法】</strong><ol><li>Google Play ストアの「Play ポイント」画面を開きます。</li><li>画面に表示される「次のステータスまであと◯◯ pt」という部分の数字を、そのまま入力してください。</li></ol><hr><p>※Playポイントのランク判定期間は毎年12月31日までです。そのため、計算結果の「月平均」は12月末までの残り月数で均等に割り出した目安となります。</p>`,
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
            errorNeededPoints: "目標までの必要ポイントに有効な数値を入力してください",
            errorTargetStatus: "目標ステータスを選択してください",
            errorRate: "計算に使用する還元率が0以下です", errorMonth: "年内の残り期間の計算に失敗しました（現在12月、またはシステム時刻をご確認ください）",
            errorInputReverse: "有効な数値を入力してください", errorRateReverse: "計算に使用する還元率が0以下です",
            errorTargetConsistency: "入力した必要ポイントが、選択した目標ステータスに対して不正です。値を確認してください。",
            resultLabelNeededPoints: "目標までの必要ポイント", resultLabelTotalYen: "合計の必要課金額目安",
            resultLabelMonthlyYen: "月平均目安", resultLabelMonths: "ヶ月",
            resultLabelRate: "適用還元率", resultLabelEarnedPoints: "獲得ポイント予測",
            perMonth: "/月",
            calculationNote: "※Google Playポイントのランク集計期間（毎年12月31日）までの残り <b>{months}ヶ月</b> で均等に割り出した目標課金額の目安です。",
            yearSuffix: "年", monthNames: ["１月", "２月", "３月", "４月", "５月", "６月", "７月", "８月", "９月", "１０月", "１１月", "１２月"],
            weekLabel: "第", weekSuffix: "週", pointsPlaceholder: "ポイント", saveButton: "保存",
            monthlySummaryTitle: "月間集計", yearlySummaryTitle: "年間集計",
            totalLabel: "合計:", averageLabel: "平均:", pointsUnit: "pt", perWeekUnit: "pt/週",
            guestNotice: "【！】現在、この日記の記録はブラウザ内にのみ保存されます。ブラウザのキャッシュ削除や閲覧データ削除で記録が消えてしまうのでご注意ください。※将来的にサーバー側に記録を保存できる会員機能も検討中です！ご期待ください！",
            prizeOptions: ["景品なし", "マウス", "イヤホン", "その他"],
            noWeeksMessage: "この月には対象となる週がありません。",
            backupTitle: "データのバックアップ・復元",
            exportBtn: "データを書き出す (コピー)",
            importBtn: "データを読み込む (復元)",
            confirmImportBtn: "復元を実行",
            backupPlaceholder: "ここに書き出したデータを貼り付けてください",
            exportSuccess: "日記データをクリップボードにコピーしました！安全な場所に保存してください。",
            importSuccess: "日記データを復元しました！",
            importError: "データのインポートに失敗しました。正しいデータ形式か確認してください。",
            fridayReminderText: "今日は金曜日！今週のウィークリーリワードを引いて日記に記録しましょう！",
            reminderTitle: "金曜リワード通知（カレンダー登録）",
            reminderDesc: "毎週金曜日にウィークリーリワードを通知するリマインダーを登録できます。リワードの引き忘れを防いで、日記への記録を習慣化しましょう！",
            btnGoogleCal: "Google カレンダーに登録",
            btnICal: "カレンダーアプリ（iCal）登録",
            linkArticles: { text: "📝 記事一覧", href: "blog/" },
            linkKatakata: { text: "🧪 KatakataLab", href: "https://katakatalab.com/" },
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
            'tooltip-target-status': `<strong>Level-up requirements:</strong><ul><li><strong>Silver:</strong> 150+ pts</li><li><strong>Gold:</strong> 600+ pts</li><li><strong>Platinum:</strong> 3,000+ pts</li><li><strong>Diamond:</strong> 10,000+ pts</li></ul><hr><p>※Points accumulate from Jan 1st to Dec 31st. Once you reach the threshold, you level up immediately (valid until the end of the next year).</p>`,
            'tooltip-needed-points': `<strong>How to check points needed:</strong><ol><li>Go to the "Play Points" screen in the Google Play Store.</li><li>Enter the number shown in "XX pts to next level".</li></ol><hr><p>※The Play Points annual cycle ends on Dec 31st. Therefore, the "monthly average" is calculated based on the remaining months until the end of December.</p>`,
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
            errorNeededPoints: "Please enter a valid number for points to next level.",
            errorTargetStatus: "Please select a target status.",
            errorRate: "The effective rate for calculation is zero or less.", errorMonth: "Failed to calculate remaining months in this year.",
            errorInputReverse: "Please enter a valid number.", errorRateReverse: "The effective rate for calculation is zero or less.",
            errorTargetConsistency: "The points-to-goal value is not valid for the selected target status.",
            resultLabelNeededPoints: "Points to goal", resultLabelTotalYen: "Estimated total spending",
            resultLabelMonthlyYen: "Monthly average", resultLabelMonths: "months",
            resultLabelRate: "Effective rate", resultLabelEarnedPoints: "Estimated points earned",
            perMonth: "/month",
            calculationNote: "*Estimated target spending evenly split by the remaining <b>{months} months</b> until the Google Play Points rank calculation period ends (December 31st each year).",
            yearSuffix: "", monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            weekLabel: "Week", weekSuffix: "", pointsPlaceholder: "Points", saveButton: "Save",
            monthlySummaryTitle: "Monthly Summary", yearlySummaryTitle: "Yearly Summary",
            totalLabel: "Total:", averageLabel: "Average:", pointsUnit: "pts", perWeekUnit: "pts/week",
            guestNotice: "[!] Right now, your diary records are saved only in this browser. If you clear cache or browsing data, the records may be lost. In the future, we are considering a member feature to store data on the server — please look forward to it!",
            prizeOptions: ["No Prize", "Mouse", "Earbuds", "Other"],
            noWeeksMessage: "No applicable weeks in this month.",
            backupTitle: "Backup & Restore Data",
            exportBtn: "Export Data (Copy)",
            importBtn: "Import Data (Restore)",
            confirmImportBtn: "Execute Restore",
            backupPlaceholder: "Paste your exported data here",
            exportSuccess: "Copied diary data to clipboard! Please save it in a safe place.",
            importSuccess: "Diary data restored successfully!",
            importError: "Failed to import data. Please check if the data format is correct.",
            fridayReminderText: "It's Friday! Let's claim your Weekly Reward and record it in your diary!",
            reminderTitle: "Friday Reward Notification (Calendar)",
            reminderDesc: "You can set up a weekly recurring reminder for the Weekly Reward. Prevent missing your weekly points and make logging a habit!",
            btnGoogleCal: "Add to Google Calendar",
            btnICal: "Add to Calendar App (iCal)",
            linkArticles: { text: "📝 Articles", href: "blog/" },
            linkKatakata: { text: "🧪 KatakataLab", href: "https://katakatalab.com/" },
            linkPrivacy: { text: "Privacy Policy", href: "privacy.html" },
            linkTerms: { text: "Terms of Service", href: "terms.html" },
            linkQA: { text: "Q&A & Afterword", href: "info.html" },
            linkFeedback: { text: "Feedback", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
            linkAbout: { text: "What are Play Points?", href: "about-playpoints.html" }
        }
    }
};

CONFIGS.JP.tooltips['tooltip-reverse-base-rate'] = CONFIGS.JP.tooltips['tooltip-base-rate'];
CONFIGS.JP.tooltips['tooltip-reverse-multiplier'] = CONFIGS.JP.tooltips['tooltip-multiplier'];
CONFIGS.US.tooltips['tooltip-reverse-base-rate'] = CONFIGS.US.tooltips['tooltip-base-rate'];
CONFIGS.US.tooltips['tooltip-reverse-multiplier'] = CONFIGS.US.tooltips['tooltip-multiplier'];

export const STATE = {
    currentRegion: 'JP',
    dom: {},
    diaryState: {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1,
    }
};

// 互換性マウント
if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.ANALYTICS = ANALYTICS;
    window.PP_APP.CONSTANTS = CONSTANTS;
    window.PP_APP.CONFIGS = CONFIGS;
    window.PP_APP.STATE = STATE;
}
