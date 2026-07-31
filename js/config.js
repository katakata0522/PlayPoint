'use strict';

// GA4本体の読み込み前でも、意味のある完了イベントだけを安全にキューへ積む
export const ANALYTICS = {
    pendingEvents: [],
    maxPendingEvents: 20,
    allowedParams: {
        calculation_completed: ['calculation_mode', 'region', 'target_status', 'entry_source', 'entry_medium', 'entry_campaign'],
        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign'],
        diary_entry_saved: ['region', 'entry_type'],
        article_to_calculator_clicked: ['source_path', 'link_context', 'destination_path'],
        lp_to_calculator_clicked: ['source_path', 'entry_campaign', 'link_context'],
        lp_related_link_clicked: ['source_path', 'target_path', 'link_context'],
        result_related_article_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        share_url_copied: ['calculation_mode', 'region', 'target_status'],
        share_x_clicked: ['calculation_mode', 'region', 'target_status'],
        calendar_reminder_added: ['region', 'calendar_type'],
        pwa_install_accepted: ['region', 'install_surface'],
        widget_referral_landed: ['region', 'entry_surface'],
        widget_code_copied: ['theme', 'language', 'mode'],
        web_vital: ['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version']
    },
    hasConsent() {
        return typeof window !== 'undefined'
            && window.PlayPointConsent
            && window.PlayPointConsent.getStatus() === 'granted';
    },
    sanitizeValue(key, value) {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'link_position') {
            const numberValue = Number(value);
            return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 10 ? numberValue : null;
        }
        let text = String(value).trim();
        if (!text) return null;
        if (key.endsWith('_path')) {
            try {
                text = new URL(text, window.location.origin).pathname;
            } catch (error) {
                return null;
            }
        }
        return text.replace(/[<>"']/g, '').slice(0, 120);
    },
    sanitizeParams(eventName, params = {}) {
        const allowed = this.allowedParams[eventName];
        if (!allowed) return null;
        return allowed.reduce((clean, key) => {
            const value = this.sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    },
    getEntryContext() {
        if (typeof window === 'undefined') return {};
        if (typeof URLSearchParams === 'undefined' || !window.location) return {};
        const params = new URLSearchParams(window.location.search);
        return {
            entry_source: params.get('utm_source') || undefined,
            entry_medium: params.get('utm_medium') || undefined,
            entry_campaign: params.get('utm_campaign') || undefined
        };
    },
    queue(eventName, params) {
        if (this.pendingEvents.length >= this.maxPendingEvents) this.pendingEvents.shift();
        this.pendingEvents.push({ eventName, params });
    },
    send(eventName, params) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };
        window.gtag('event', eventName, params);
    },
    track(eventName, params = {}) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return;
        if (typeof window === 'undefined') return;
        const cleanParams = this.sanitizeParams(eventName, params);
        if (!cleanParams) return;

        if (!window.PlayPointConsent) {
            this.queue(eventName, cleanParams);
            return;
        }
        if (!this.hasConsent()) {
            this.pendingEvents = [];
            return;
        }

        this.send(eventName, cleanParams);
    },
    flushPending() {
        if (typeof window === 'undefined' || !window.PlayPointConsent) return;
        if (!this.hasConsent()) {
            this.pendingEvents = [];
            return;
        }
        while (this.pendingEvents.length) {
            const { eventName, params } = this.pendingEvents.shift();
            this.send(eventName, params);
        }
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

function formatCalendarTimestamp(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    return `${year}${month}${day}T${hour}0000Z`;
}

export function getNextFridayCalendarWindow(isGlobalTime, baseDate = new Date()) {
    const startHourUtc = isGlobalTime ? 14 : 1;
    const daysUntilFriday = (5 - baseDate.getUTCDay() + 7) % 7;
    const nextStart = new Date(Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth(),
        baseDate.getUTCDate() + daysUntilFriday,
        startHourUtc
    ));

    // 金曜の開始時刻を過ぎている場合は、同日ではなく翌週を登録する。
    if (nextStart.getTime() <= baseDate.getTime()) {
        nextStart.setUTCDate(nextStart.getUTCDate() + 7);
    }

    const nextEnd = new Date(nextStart.getTime() + 60 * 60 * 1000);
    return {
        start: formatCalendarTimestamp(nextStart),
        end: formatCalendarTimestamp(nextEnd)
    };
}

export const CONFIGS = {
    'JP': {
        lang: "ja",
        statuses: { "ブロンズ": 1.0, "シルバー": 1.25, "ゴールド": 1.5, "プラチナ": 1.75, "ダイヤモンド": 2.0 },
        statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
        thresholds: { "シルバー": 250, "ゴールド": 1000, "プラチナ": 4000, "ダイヤモンド": 15000 },
        statusPointsMapping: { 1.0: ["シルバー", "ゴールド", "プラチナ", "ダイヤモンド"], 1.25: ["ゴールド", "プラチナ", "ダイヤモンド"], 1.5: ["プラチナ", "ダイヤモンド"], 1.75: ["ダイヤモンド"], 2.0: [] },
        currencySymbol: "円",
        rateUnit: "100円",
        spendUnit: 100,
        tooltips: {
            'tooltip-current-status': `<strong>【現在のステータスの確認方法】</strong><ol><li>Google Play ストアを開きます。</li><li>右上のプロフィールアイコンをタップします。</li><li>「Play ポイント」を選択します。</li></ol><hr><p>※ステータスに応じて、基本還元率は自動で入力されます。</p>`,
            'tooltip-target-status': `<strong>【各ステータスの達成条件】</strong><ul><li><strong>シルバー:</strong> 250 pt 以上</li><li><strong>ゴールド:</strong> 1,000 pt 以上</li><li><strong>プラチナ:</strong> 4,000 pt 以上</li><li><strong>ダイヤモンド:</strong> 15,000 pt 以上</li></ul><hr><p>※ポイントは毎年1月1日〜12月31日の1年間で累積され、目標ポイントに達した時点で即座にランクアップします（有効期限は翌年末まで）。</p>`,
            'tooltip-needed-points': `<strong>【必要ポイントの確認方法】</strong><ol><li>Google Play ストアの「Play Points」を開きます。</li><li>「次のステータスまで」に表示される不足ポイントを入力します。</li></ol><hr><p>月・週・日の金額は、今年12月31日までに同じペースで進める場合の目安です。到達したステータスは翌年末まで維持され、毎年初めに前年の獲得ポイントで再判定されます。</p>`,
            'tooltip-base-rate': `<strong>【獲得率を直接入力】</strong><p>最初は現在のステータスの基本獲得率が入ります。公式のオファー画面に「3ポイント/100円」のような獲得率が表示されている場合だけ、その数値へ置き換えてください。</p><hr><p>倍率で表示されるオファーは、隣の「キャンペーン倍率」を使います。計算機は対象可否や上限を確認できないため、購入前に公式画面をご確認ください。</p>`,
            'tooltip-multiplier': `<strong>【倍率で入力】</strong><p>公式のオファー画面に「3倍」のような倍率が表示されている場合に入力します。</p><p>例：ゴールド（1.5pt/100円）× <strong>3倍</strong> = 4.5pt/100円</p><hr><p>獲得率の直接入力とは別の入力方法です。両方が入力された場合は高い方を試算へ使いますが、実際の併用可否を意味しません。</p>`,
            'tooltip-amount-yen': `<strong>【獲得ポイントを計算】</strong><p>入力した金額で、どれくらいのポイントが獲得できるかをシミュレーションします。</p>`,
            'tooltip-reverse-status': `<strong>【ステータスごとの基本還元率】</strong><ul><li><strong>ブロンズ:</strong> 1.0 pt / 100円</li><li><strong>シルバー:</strong> 1.25 pt / 100円</li><li><strong>ゴールド:</strong> 1.5 pt / 100円</li><li><strong>プラチナ:</strong> 1.75 pt / 100円</li><li><strong>ダイヤモンド:</strong> 2.0 pt / 100円</li></ul>`
        },
        uiText: {
            title: "Google Play Points 計算機｜あといくらでランクアップ？必要課金額を逆算", mainTitle: "Google Play Points 計算機",
            closeAria: "閉じる", showHelpAria: "説明を表示", shareResultAria: "計算結果の共有", prevYearAria: "前の年へ", nextYearAria: "次の年へ",
            siteAlias: "通称: Playポイント計算機 / 非公式ツール",
            siteDescription: "Google Play ポイントのランクアップまでに、あといくら必要かを目安計算できます。<br>現在ステータス・目標ステータス・必要ポイントを入力すると、<br>必要な課金額やキャンペーン倍率込みの目安を確認できます。",
            tabMain: "通常計算", tabReverse: "逆算モード", tabDiary: "ほくほくリワード日記",
            firstStepTitle: "まずは3つだけ入力", firstStepCurrent: "現在のステータス", firstStepTarget: "目標ステータス", firstStepNeeded: "目標までの必要ポイント",
            sectionTitleStatus: "ステータス入力", labelCurrentStatus: "現在のステータス",
            labelTargetStatus: "目標ステータス", labelNeededPoints: "目標までの必要ポイント",
            neededPointsPlaceholder: "例：1728", sectionTitleRate: "還元設定",
            labelBaseRate: "100円あたりの獲得率（直接入力）", labelMultiplier: "キャンペーン倍率（もう一つの入力方法）", labelMultiplierReverse: "キャンペーン倍率（もう一つの入力方法）",
            warningRate: "「獲得率の直接入力」または「ステータス×倍率」の高い方を試算に使います。両方は別の入力方法です。実際の対象・上限・有効化はキャンペーン画面で確認してください。",
            calculateButton: "課金額を計算", copyButton: "コピーする", tweetButton: "結果をXでシェア",
            sectionTitleReverse: "逆算モード", labelAmountYen: "課金額（円）",
            amountYenPlaceholder: "例：5000", reverseCalculateButton: "ポイントを計算",
            nextTargetNone: "次の目標はありません", statusKeep: "維持", statusUp: "昇格", packAmountLabel: "1回あたりの平均課金パック額 (オプション)", packAmountPlaceholder: "例：9800", packUnit: "パック", resultLabelRequiredPacks: "必要購入パック数", resultLabelFreeClear: "課金不要", errorInput: "有効な数値を入力し、目標ステータスを選択してください",
            errorNeededPoints: "目標までの必要ポイントに有効な数値を入力してください",
            errorTargetStatus: "目標ステータスを選択してください",
            errorRate: "計算に使用する還元率が0以下です", errorMonth: "年内の残り期間の計算に失敗しました（現在12月、またはシステム時刻をご確認ください）",
            errorInputReverse: "有効な数値を入力してください", errorRateReverse: "計算に使用する還元率が0以下です",
            errorTargetConsistency: "入力した必要ポイントが、選択した目標ステータスに対して不正です。値を確認してください。",
            resultLabelNeededPoints: "目標までの必要ポイント", resultLabelTotalYen: "合計の必要課金額目安",
            resultLabelMonthlyYen: "月平均目安", resultLabelWeeklyYen: "週平均目安", resultLabelDailyYen: "1日あたり目安", resultLabelRemainingDays: "年末までの残り日数", resultLabelPaceSummary: "達成ペース目安", resultRelatedTitle: "関連記事", resultLabelMonths: "ヶ月",
            resultComparisonTitle: "通常時との比較", resultComparisonBase: "通常還元の場合", resultComparisonSelected: "現在の還元条件", resultComparisonSaved: "少なくなる目安", resultComparisonSamePack: "この購入単位では必要パック数が同じため、差額はありません。",
            resultLabelRate: "適用獲得率", resultLabelEarnedPoints: "獲得ポイント予測", resultRateSourceDirect: "直接入力の獲得率を使用", resultRateSourceMultiplier: "ステータス×倍率を使用", resultRateSourceSame: "どちらも同じ獲得率",
            perMonth: "/月", perWeek: "/週", perDay: "/日", daysUnit: "日",
            approxLabel: "約",
            descriptionSectionTitle: "Play Points 計算機でできること",
            articleDrawerTitle: "よくある悩みから記事を探す",
            articleDrawerSubtitle: "悩み別の記事を開く",
            articleCount: "{count}記事",
            faqSectionTitle: "❓ よくある質問 (FAQ)",
            tweetHashtags: "#Playポイント計算してみた\n#GooglePlayポイント",
            calculationNote: "※今年12月31日までの残り <b>{months}ヶ月</b> で均等に進める場合の目安です。実際の獲得率・対象購入・反映時期はGoogle Playの公式画面をご確認ください。",
            yearSuffix: "年", monthNames: ["１月", "２月", "３月", "４月", "５月", "６月", "７月", "８月", "９月", "１０月", "１１月", "１２月"],
            weekLabel: "第", weekSuffix: "週", pointsPlaceholder: "ポイント", prizeLabel: "受け取った景品", saveButton: "保存",
            monthlySummaryTitle: "月間集計", yearlySummaryTitle: "年間集計",
            yearlyChartTitle: "年間の記録グラフ", yearlyChartDescription: "月ごとの記録ポイントを、この端末内だけで比較します。",
            totalLabel: "合計:", averageLabel: "平均:", pointsUnit: "pt", perWeekUnit: "pt/週",
            guestNotice: "【！】日記はこのブラウザのローカルストレージにだけ保存されます。サイトデータの削除、プライベートブラウズ、別の端末・ブラウザへの移動では引き継がれません。必要に応じて書き出しデータを保管してください。",
            prizeOptions: ["（景品なし）", "マウス", "イヤホン", "その他"],
            noWeeksMessage: "この月には対象となる週がありません。",
            backupTitle: "データのバックアップ・復元",
            exportBtn: "データを書き出す (コピー)",
            importBtn: "データを読み込む (復元)",
            confirmImportBtn: "復元を実行",
            backupPlaceholder: "ここに書き出したデータを貼り付けてください",
            exportSuccess: "日記データをクリップボードにコピーしました！安全な場所に保存してください。",
            importSuccess: "日記データを復元しました！",
            importError: "データのインポートに失敗しました。正しいデータ形式か確認してください。",
            reminderTitle: "金曜リワード通知（カレンダー登録）",
            reminderDesc: "通常のウィークリーリワードが表示される対象アカウント向けに、毎週金曜日の確認リマインダーを登録できます。",
            btnGoogleCal: "Google カレンダーに登録",
            btnICal: "カレンダーアプリ（iCal）登録",
            linkLatest: { text: "🆕 最新情報", href: "latest/" },
            linkArticles: { text: "📝 記事一覧", href: "blog/" },
            linkKatakata: { text: "🧪 KatakataLab", href: "https://katakatalab.com/" },
            linkPrivacy: { text: "プライバシーポリシー", href: "privacy.html" },
            linkTerms: { text: "利用規約", href: "terms.html" },
            linkQA: { text: "Q&A・あとがき", href: "info.html" },
            linkFeedback: { text: "ご意見・ご感想", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
            linkAbout: { text: "Playポイントとは？", href: "about-playpoints.html" },
            linkWidget: { text: "無料ウィジェット", href: "embed.html" },
            linkDiscount: { text: "💡 お得に課金する", href: "articles/2026-06-20-discount-gift-cards.html" },
            linkAuthor: { text: "運営者・検証方針", href: "author/katakata.html" },
            linkAttention: { text: "⚠️ For users outside Japan", href: "attention.html" },
            toastCopySuccess: "クリップボードにコピーしました！",
            toastCopyError: "コピーに失敗しました。",
            copyResultTemplate: "▼Playポイント計算結果▼\n目標ステータス： {status}\n必要な課金額の目安： 約{yen}{symbol}\n\n計算元：Playポイント計算機 ( {url} )",
            tweetTextMain: "【Playポイント計算機で試算】\n私の目標「{status}」まで、あと【{yen}{symbol}】必要みたい！💰",
            tweetTextReverse: "【Playポイント計算機で試算】\n{yen}{symbol}使うと、約 {points}ポイント 獲得できるみたい！✨",
            calSubject: "【GooglePlay】ウィークリーリワードの日！",
            calDetails: "シルバー以上の対象アカウントでは、Playの国・地域の金曜日に通常のウィークリーリワードを確認できます。対象画面を確認し、受け取った結果を日記へ記録しましょう。\nhttps://playpoint-sim.com/",
            icsFilename: "play-point-reward-reminder.ics",
            toastDiarySaveSuccess: "日記を保存しました！",
            toastDiaryLoadError: "日記データの読み込みに失敗しました。",
            toastDiarySaveError: "日記データの保存に失敗しました。",
            toastCopyError: "コピーに失敗しました。",
            errorEmptyBackup: "復元するデータが空です。"
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
        spendUnit: 1,
        tooltips: {
            'tooltip-current-status': `<strong>How to check your current status:</strong><ol><li>Open the Google Play Store.</li><li>Tap your profile icon in the top right.</li><li>Select "Play Points".</li></ol><hr><p>Note: The base points rate is automatically filled based on your status.</p>`,
            'tooltip-target-status': `<strong>Level-up requirements:</strong><ul><li><strong>Silver:</strong> 150+ pts</li><li><strong>Gold:</strong> 600+ pts</li><li><strong>Platinum:</strong> 3,000+ pts</li><li><strong>Diamond:</strong> 10,000+ pts</li></ul><hr><p>※Points accumulate from Jan 1st to Dec 31st. Once you reach the threshold, you level up immediately (valid until the end of the next year).</p>`,
            'tooltip-needed-points': `<strong>How to check points needed:</strong><ol><li>Open Play Points in the Google Play Store.</li><li>Enter the number shown for points to the next level.</li></ol><hr><p>Monthly, weekly, and daily amounts are pace estimates through December 31 of the current year. A level you reach stays through the end of the next calendar year, and may be recalculated at the start of each year from the previous year’s earned points.</p>`,
            'tooltip-base-rate': `<strong>Enter an earn rate directly:</strong><p>Your level’s base rate is filled first. Replace it only when the official offer shows a rate such as “3 points per $1.”</p><hr><p>If the offer is shown as “3x,” use Campaign multiplier instead. The calculator cannot verify eligibility, activation, or caps.</p>`,
            'tooltip-multiplier': `<strong>Enter a multiplier:</strong><p>Use this field when the official offer is shown as “3x.”</p><p>Example: Gold (1.2 pts per $1) × <strong>3x</strong> = 3.6 pts per $1.</p><hr><p>This is an alternative to direct rate entry. If both are entered, the calculator uses the higher estimate; that does not confirm the offers can be combined.</p>`,
            'tooltip-amount-yen': `<strong>Calculate points earned:</strong><p>Simulate how many points you can earn from the amount you spend.</p>`,
            'tooltip-reverse-status': `<strong>Base points rate per status:</strong><ul><li><strong>Bronze:</strong> 1.0 pt / $1</li><li><strong>Silver:</strong> 1.1 pts / $1</li><li><strong>Gold:</strong> 1.2 pts / $1</li><li><strong>Platinum:</strong> 1.4 pts / $1</li><li><strong>Diamond:</strong> 1.6 pts / $1</li></ul>`
        },
        uiText: {
            title: "Google Play Points Calculator | How much to reach the next level?", mainTitle: "Google Play Points Calculator",
            closeAria: "Close", showHelpAria: "Show explanation", shareResultAria: "Share calculation result", prevYearAria: "Previous year", nextYearAria: "Next year",
            siteAlias: "Also known as Play Points Calculator / unofficial tool",
            siteDescription: "Calculate how much you need to spend to reach the next Google Play Points level.<br>Enter your current status, target status, and points needed to estimate spending with campaign multipliers.",
            tabMain: "Standard", tabReverse: "Reverse", tabDiary: "Weekly Awards Diary",
            firstStepTitle: "Enter just 3 items first", firstStepCurrent: "Current status", firstStepTarget: "Target status", firstStepNeeded: "Points needed",
            sectionTitleStatus: "Status Input", labelCurrentStatus: "Current Status",
            labelTargetStatus: "Target Status", labelNeededPoints: "Points to Next Level",
            neededPointsPlaceholder: "e.g., 125", sectionTitleRate: "Points Rate Setting",
            labelBaseRate: "Earn rate per $1 (direct entry)", labelMultiplier: "Campaign multiplier (alternative input)", labelMultiplierReverse: "Campaign multiplier (alternative input)",
            warningRate: "The calculator uses the higher estimate from direct rate entry or level rate × multiplier. These are alternative inputs. Confirm eligibility, activation, and caps in the official offer.",
            calculateButton: "Calculate Amount", copyButton: "Copy", tweetButton: "Share on X",
            sectionTitleReverse: "Reverse Mode", labelAmountYen: "Amount Spent (USD)",
            amountYenPlaceholder: "e.g., 50", reverseCalculateButton: "Calculate Points",
            nextTargetNone: "No further levels", statusKeep: "Keep", statusUp: "Level Up", packAmountLabel: "Average pack spending per transaction (Optional)", packAmountPlaceholder: "e.g., 98", packUnit: "packs", resultLabelRequiredPacks: "Packs needed", resultLabelFreeClear: "No spending needed", errorInput: "Please enter valid numbers and select a target status.",
            errorNeededPoints: "Please enter a valid number for points to next level.",
            errorTargetStatus: "Please select a target status.",
            errorRate: "The effective rate for calculation is zero or less.", errorMonth: "Failed to calculate remaining months in this year.",
            errorInputReverse: "Please enter a valid number.", errorRateReverse: "The effective rate for calculation is zero or less.",
            errorTargetConsistency: "The points-to-goal value is not valid for the selected target status.",
            resultLabelNeededPoints: "Points to goal", resultLabelTotalYen: "Estimated total spending",
            resultLabelMonthlyYen: "Monthly average", resultLabelWeeklyYen: "Weekly average", resultLabelDailyYen: "Daily average", resultLabelRemainingDays: "Days left this year", resultLabelPaceSummary: "Goal pace estimate", resultRelatedTitle: "Related guides", resultLabelMonths: "months",
            resultComparisonTitle: "Compared with the base rate", resultComparisonBase: "At the base rate", resultComparisonSelected: "With the selected rate", resultComparisonSaved: "Estimated difference", resultComparisonSamePack: "The required number of packs is the same at this purchase size, so there is no difference.",
            resultLabelRate: "Applied earn rate", resultLabelEarnedPoints: "Estimated points earned", resultRateSourceDirect: "using direct rate entry", resultRateSourceMultiplier: "using level rate × multiplier", resultRateSourceSame: "both inputs give the same rate",
            perMonth: "/month", perWeek: "/week", perDay: "/day", daysUnit: "days",
            approxLabel: "Approx.",
            descriptionSectionTitle: "What You Can Do with Google Play Points Calculator",
            articleDrawerTitle: "Find Articles by Common Concerns",
            articleDrawerSubtitle: "Open articles by category",
            articleCount: "{count} Guides",
            faqSectionTitle: "❓ Frequently Asked Questions (FAQ)",
            tweetHashtags: "#PlayPointsCalculator\n#GooglePlayPoints",
            calculationNote: "*Pace estimate split across the remaining <b>{months} months</b> through December 31 of the current year. Confirm the actual rate, eligible purchase, and timing in Google Play.",
            yearSuffix: "", monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            weekLabel: "Week", weekSuffix: "", pointsPlaceholder: "Points", prizeLabel: "Prize received", saveButton: "Save",
            monthlySummaryTitle: "Monthly Summary", yearlySummaryTitle: "Yearly Summary",
            yearlyChartTitle: "Yearly record chart", yearlyChartDescription: "Compare monthly recorded points only on this device.",
            totalLabel: "Total:", averageLabel: "Average:", pointsUnit: "pts", perWeekUnit: "pts/week",
            guestNotice: "[!] Diary data is stored only in this browser’s local storage. It will not move to another device or browser and can be lost when site data is cleared or private browsing ends. Keep an exported copy if needed.",
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
            reminderTitle: "Friday Reward Notification (Calendar)",
            reminderDesc: "For eligible accounts with regular weekly prizes, set a Friday reminder to check the Perks screen.",
            btnGoogleCal: "Add to Google Calendar",
            btnICal: "Add to Calendar App (iCal)",
            linkLatest: { text: "🆕 Latest Hub (Japanese)", href: "latest/" },
            linkArticles: { text: "📝 Articles", href: "articles/" },
            linkKatakata: { text: "🧪 KatakataLab (Japanese)", href: "https://katakatalab.com/" },
            linkPrivacy: { text: "Privacy Policy (Japanese)", href: "privacy.html" },
            linkTerms: { text: "Terms of Service (Japanese)", href: "terms.html" },
            linkQA: { text: "Q&A & Afterword (Japanese)", href: "info.html" },
            linkFeedback: { text: "Feedback", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
            linkAbout: { text: "What are Play Points?", href: "about-playpoints.html" },
            linkWidget: { text: "Free widget", href: "embed.html" },
            linkDiscount: { text: "💡 Discount Guide", href: "articles/2026-06-20-discount-gift-cards.html" },
            linkAuthor: { text: "Operator & Policy (Japanese)", href: "author/katakata.html" },
            linkAttention: { text: "⚠️ Country Diff", href: "attention.html" },
            toastCopySuccess: "Copied to clipboard!",
            toastCopyError: "Failed to copy.",
            copyResultTemplate: "▼Google Play Points Calculator Result▼\nTarget Status: {status}\nEstimated Spending: Approx. {yen} {symbol}\n\nSource: Google Play Points Calculator ( {url} )",
            tweetTextMain: "[Google Play Points Calculator]\nI need approx. {yen} {symbol} to reach my goal \"{status}\"! 💰",
            tweetTextReverse: "[Google Play Points Calculator]\nIf I spend {yen} {symbol}, I can earn approx. {points} points! ✨",
            calSubject: "[GooglePlay] Weekly Reward Day!",
            calDetails: "Claim your Google Play Points Weekly Reward and log it!\nhttps://playpoint-sim.com/en/",
            icsFilename: "google-play-reward-reminder.ics",
            toastDiarySaveSuccess: "Diary entry saved!",
            toastDiaryLoadError: "Failed to load diary data.",
            toastDiarySaveError: "Failed to save diary data.",
            toastCopyError: "Failed to copy.",
            errorEmptyBackup: "Backup data is empty."
        }
    },
    'KR': {
        lang: "ko",
        statuses: { "브론즈": 1.0, "실버": 1.1, "골드": 1.3, "플래티넘": 1.6, "다이아몬드": 2.0 },
        statusRates: { 1.0: 1.0, 1.1: 1.1, 1.3: 1.3, 1.6: 1.6, 2.0: 2.0 },
        thresholds: { "실버": 150, "골드": 600, "플래티넘": 2400, "다이아몬드": 15000 },
        statusPointsMapping: { 1.0: ["실버", "골드", "플래티넘", "다이아몬드"], 1.1: ["골드", "플래티넘", "다이아몬드"], 1.3: ["플래티넘", "다이아몬드"], 1.6: ["다이아몬드"], 2.0: [] },
        currencySymbol: "₩",
        rateUnit: "1,000₩",
        spendUnit: 1000,
        tooltips: {
            'tooltip-current-status': `<strong>【현재 등급 확인 방법】</strong><ol><li>Google Play 스토어를 엽니다.</li><li>우측 상단의 프로필 아이콘을 누릅니다.</li><li>'Play 포인트'를 선택합니다.</li></ol><hr><p>※등급에 따라 기본 적립률이 자동으로 입력됩니다.</p>`,
            'tooltip-target-status': `<strong>【등급 달성 조건】</strong><ul><li><strong>실버:</strong> 150 pt 이상</li><li><strong>골드:</strong> 600 pt 이상</li><li><strong>플래티넘:</strong> 2,400 pt 이상</li><li><strong>다이아몬드:</strong> 15,000 pt 이상</li></ul><hr><p>※포인트는 매년 1월 1일~12월 31일 동안 누적되며, 조건 달성 시 즉시 등급이 올라갑니다(유효기간은 다음 해 말까지).</p>`,
            'tooltip-needed-points': `<strong>【필요 포인트 확인 방법】</strong><ol><li>Google Play 스토어에서 Play Points를 엽니다.</li><li>다음 등급까지 표시된 부족 포인트를 입력합니다.</li></ol><hr><p>월·주·일 금액은 올해 12월 31일까지 같은 속도로 진행할 때의 예상치입니다. 도달한 등급은 다음 해 말까지 유지되며, 매년 초 전년도 적립 포인트에 따라 다시 산정될 수 있습니다.</p>`,
            'tooltip-base-rate': `<strong>【적립률 직접 입력】</strong><p>처음에는 현재 등급의 기본 적립률이 입력됩니다. 공식 혜택 화면에 “1,000원당 3포인트”처럼 적립률이 표시된 경우에만 해당 수치로 바꾸세요.</p><hr><p>“3배”처럼 표시된 혜택은 이벤트 배율을 사용합니다. 계산기는 대상 여부·활성화·상한을 확인할 수 없습니다.</p>`,
            'tooltip-multiplier': `<strong>【배율 입력】</strong><p>공식 혜택 화면에 “3배”처럼 배율이 표시된 경우 사용합니다.</p><p>예: 골드(1.3pt/1,000원) × <strong>3배</strong> = 3.9pt/1,000원</p><hr><p>직접 적립률 입력과는 다른 방식입니다. 둘 다 입력하면 높은 예상치를 사용하지만, 실제 중복 적용을 뜻하지 않습니다.</p>`,
            'tooltip-amount-yen': `<strong>【적립 포인트 계산】</strong><p>입력한 금액으로 획득 가능한 포인트를 시뮬레이션합니다.</p>`,
            'tooltip-reverse-status': `<strong>등급별 기본 적립률:</strong><ul><li><strong>브론즈:</strong> 1.0 pt / 1,000₩</li><li><strong>실버:</strong> 1.1 pt / 1,000₩</li><li><strong>골드:</strong> 1.3 pt / 1,000₩</li><li><strong>플래티넘:</strong> 1.6 pt / 1,000₩</li><li><strong>다이아몬드:</strong> 2.0 pt / 1,000₩</li></ul>`
        },
        uiText: {
            title: "Google Play Points 계산기 | 등급 업까지 얼마 남았지?", mainTitle: "Google Play Points 계산기",
            closeAria: "닫기", showHelpAria: "설명 보기", shareResultAria: "계산 결과 공유", prevYearAria: "이전 연도", nextYearAria: "다음 연도",
            siteAlias: "별칭: 구글 플레이 포인트 계산기 / 비공식 도구",
            siteDescription: "먼저 현재 등급, 목표 등급, 목표까지 필요한 포인트를 입력하세요.<br>등급 달성에 필요한 결제 금액과 결제 금액으로 받을 수 있는 포인트를 계산합니다.",
            tabMain: "일반 계산", tabReverse: "역산 모드", tabDiary: "주간 리워드 일기",
            firstStepTitle: "먼저 3가지만 입력", firstStepCurrent: "현재 등급", firstStepTarget: "목표 등급", firstStepNeeded: "목표까지 필요한 포인트",
            sectionTitleStatus: "등급 입력", labelCurrentStatus: "현재 등급",
            labelTargetStatus: "목표 등급", labelNeededPoints: "목표까지 필요한 포인트",
            neededPointsPlaceholder: "예: 120", sectionTitleRate: "적립 설정",
            labelBaseRate: "1,000원당 적립률(직접 입력)", labelMultiplier: "이벤트 배율(다른 입력 방식)", labelMultiplierReverse: "이벤트 배율(다른 입력 방식)",
            warningRate: "직접 입력한 적립률과 등급 기본 적립률×배율 중 높은 예상치를 사용합니다. 두 항목은 서로 다른 입력 방식이며, 실제 대상·활성화·상한은 공식 혜택 화면에서 확인해야 합니다.",
            calculateButton: "결제 금액 계산", copyButton: "복사하기", tweetButton: "결과를 X에 공유",
            sectionTitleReverse: "역산 모드", labelAmountYen: "결제 금액 (₩)",
            amountYenPlaceholder: "예: 50000", reverseCalculateButton: "포인트 계산",
            nextTargetNone: "다음 목표 등급이 없습니다", statusKeep: "유지", statusUp: "승급", packAmountLabel: "1회당 평균 결제 팩 금액 (선택 사항)", packAmountPlaceholder: "예: 10000", packUnit: "팩", resultLabelRequiredPacks: "필요 구매 팩 수", resultLabelFreeClear: "결제 불필요", errorInput: "올바른 숫자를 입력하고 목표 등급을 선택해 주세요",
            errorNeededPoints: "목표까지 필요한 포인트에 올바른 숫자를 입력해 주세요",
            errorTargetStatus: "목표 등급을 선택해 주세요",
            errorRate: "계산에 사용되는 적립률이 0 이하입니다", errorMonth: "올해 남은 기간 계산에 실패했습니다",
            errorInputReverse: "올바른 숫자를 입력해 주세요", errorRateReverse: "계산에 사용되는 적립률이 0 이하입니다",
            errorTargetConsistency: "입력한 필요 포인트가 선택한 목표 등급에 대해 올바르지 않습니다.",
            resultLabelNeededPoints: "목표까지 필요한 포인트", resultLabelTotalYen: "총 예상 결제 금액",
            resultLabelMonthlyYen: "월 평균 기준", resultLabelWeeklyYen: "주 평균 기준", resultLabelDailyYen: "하루 평균 기준", resultLabelRemainingDays: "연말까지 남은 일수", resultLabelPaceSummary: "달성 페이스 기준", resultRelatedTitle: "관련 글", resultLabelMonths: "개월",
            resultComparisonTitle: "기본 적립률과 비교", resultComparisonBase: "기본 적립률", resultComparisonSelected: "선택한 적립 조건", resultComparisonSaved: "예상 차액", resultComparisonSamePack: "이 구매 단위에서는 필요한 팩 수가 같아 차액이 없습니다.",
            resultLabelRate: "적용 적립률", resultLabelEarnedPoints: "예상 적립 포인트", resultRateSourceDirect: "직접 입력 적립률 사용", resultRateSourceMultiplier: "등급 적립률×배율 사용", resultRateSourceSame: "두 입력의 적립률이 같음",
            perMonth: "/월", perWeek: "/주", perDay: "/일", daysUnit: "일",
            approxLabel: "약",
            descriptionSectionTitle: "구글 플레이 포인트 계산기로 할 수 있는 것",
            articleDrawerTitle: "자주 하는 고민에서 가이드 찾기",
            articleDrawerSubtitle: "고민별 가이드 열기",
            articleCount: "{count}개 가이드",
            faqSectionTitle: "❓ 자주 묻는 질문 (FAQ)",
            tweetHashtags: "#구글플레이포인트계산기\n#PlayPoints",
            calculationNote: "*올해 12월 31일까지 남은 <b>{months}개월</b> 동안 같은 속도로 진행할 때의 예상치입니다. 실제 적립률·대상 구매·반영 시점은 Google Play 공식 화면에서 확인하세요.",
            yearSuffix: "년", monthNames: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
            weekLabel: "제", weekSuffix: "주", pointsPlaceholder: "포인트", prizeLabel: "받은 리워드", saveButton: "저장",
            monthlySummaryTitle: "월간 합계", yearlySummaryTitle: "연간 합계",
            yearlyChartTitle: "연간 기록 그래프", yearlyChartDescription: "월별 기록 포인트를 이 기기 안에서만 비교합니다.",
            totalLabel: "합계:", averageLabel: "평균:", pointsUnit: "pt", perWeekUnit: "pt/주",
            guestNotice: "[!] 일지 데이터는 이 브라우저의 로컬 저장소에만 보관됩니다. 사이트 데이터 삭제, 비공개 탐색 종료, 다른 기기·브라우저로 이동할 때는 이어지지 않으므로 필요하면 내보낸 데이터를 보관하세요.",
            prizeOptions: ["경품 없음", "마우스", "이어폰", "기타"],
            noWeeksMessage: "이 달에는 대상 주가 없습니다.",
            backupTitle: "데이터 백업 및 복원",
            exportBtn: "데이터 내보내기 (복사)",
            importBtn: "데이터 가져오기 (복원)",
            confirmImportBtn: "복원 실행",
            backupPlaceholder: "내보낸 데이터를 여기에 붙여넣어 주세요",
            exportSuccess: "일기 데이터를 클립보드에 복사했습니다! 안전한 곳에 저장해 주세요.",
            importSuccess: "일기 데이터를 복원했습니다!",
            importError: "데이터 가져오기에 실패했습니다. 데이터 형식을 확인해 주세요.",
            reminderTitle: "금요 리워드 알림 (캘린더)",
            reminderDesc: "일반 주간 리워드가 표시되는 대상 계정이라면 매주 금요일 확인 알림을 등록할 수 있습니다.",
            btnGoogleCal: "Google 캘린더 등록",
            btnICal: "캘린더 앱 (iCal) 등록",
            linkLatest: { text: "🆕 최신 정보 허브 (일본어)", href: "latest/" },
            linkArticles: { text: "📝 가이드 목록", href: "articles/" },
            linkKatakata: { text: "🧪 KatakataLab (일본어)", href: "https://katakatalab.com/" },
            linkPrivacy: { text: "개인정보처리방침 (일본어)", href: "privacy.html" },
            linkTerms: { text: "이용약관 (일본어)", href: "terms.html" },
            linkQA: { text: "Q&A 및 후기 (일본어)", href: "info.html" },
            linkFeedback: { text: "의견 제안", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
            linkAbout: { text: "Play 포인트란?", href: "about-playpoints.html" },
            linkWidget: { text: "무료 위젯", href: "embed.html" },
            linkDiscount: { text: "💡 할인 구매 가이드", href: "articles/2026-06-20-discount-gift-cards.html" },
            linkAuthor: { text: "운영자 및 정책 (일본어)", href: "author/katakata.html" },
            linkAttention: { text: "⚠️ 국가별 차이", href: "attention.html" },
            toastCopySuccess: "클립보드에 복사되었습니다!",
            toastCopyError: "복사에 실패했습니다.",
            copyResultTemplate: "▼Play 포인트 계산 결과▼\n목표 등급: {status}\n예상 결제 금액: 약 {yen}{symbol}\n\n출처: 플레이 포인트 계산기 ( {url} )",
            tweetTextMain: "【구글 플레이 포인트 계산기】\n내 목표 「{status}」 등급까지 약 【{yen}{symbol}】 더 필요하네요! 💰",
            tweetTextReverse: "【구글 플레이 포인트 계산기】\n{yen}{symbol} 결제하면 약 {points}포인트 적립되네요! ✨",
            calSubject: "【GooglePlay】주간 리워드 확인하는 날!",
            calDetails: "구글 플레이 포인트 주간 리워드를 받고, 계산기 일지에 기록하세요!\nhttps://playpoint-sim.com/ko/",
            icsFilename: "play-point-reward-reminder-ko.ics",
            toastDiarySaveSuccess: "일지를 저장했습니다!",
            toastDiaryLoadError: "일기 데이터를 불러오지 못했습니다.",
            toastDiarySaveError: "일기 데이터를 저장하지 못했습니다.",
            toastCopyError: "복사에 실패했습니다.",
            errorEmptyBackup: "복원할 데이터가 비어 있습니다."
        }
    },
    'TW': {
        lang: "zh-TW",
        statuses: { "銅級": 1.0, "銀級": 1.25, "金級": 1.5, "白金級": 1.75, "鑽石級": 2.0 },
        statusRates: { 1.0: 1.0, 1.25: 1.25, 1.5: 1.5, 1.75: 1.75, 2.0: 2.0 },
        thresholds: { "銀級": 250, "金級": 1000, "白金級": 4000, "鑽石級": 15000 },
        statusPointsMapping: { 1.0: ["銀級", "金級", "白金級", "鑽石級"], 1.25: ["金級", "白金級", "鑽石級"], 1.5: ["白金級", "鑽石級"], 1.75: ["鑽石級"], 2.0: [] },
        currencySymbol: "NT$",
        rateUnit: "30元",
        spendUnit: 30,
        tooltips: {
            'tooltip-current-status': `<strong>【如何確認目前的等級】</strong><ol><li>開啟 Google Play 商店。</li><li>點擊右上角的個人資料圖示。</li><li>選擇「Play Points」。</li></ol><hr><p>※系統會根據您的等級自動填入基本回饋率。</p>`,
            'tooltip-target-status': `<strong>【各等級達成條件】</strong><ul><li><strong>銀級:</strong> 250 pt 以上</li><li><strong>金級:</strong> 1,000 pt 以上</li><li><strong>白金級:</strong> 4,000 pt 以上</li><li><strong>鑽石級:</strong> 15,000 pt 以上</li></ul><hr><p>※點數於每年1月1日至12月31日期間累積，達到目標點數時將立即升級（有效期限至翌年末）。</p>`,
            'tooltip-needed-points': `<strong>【如何確認所需點數】</strong><ol><li>在 Google Play 商店開啟 Play Points。</li><li>輸入畫面顯示的下一等級所需點數。</li></ol><hr><p>月、週、日金額是以今年12月31日前維持相同進度的估算。達到的新等級會維持到下一個日曆年年底，並可能在每年年初依前一年的累積點數重新判定。</p>`,
            'tooltip-base-rate': `<strong>【直接輸入回饋率】</strong><p>系統會先填入目前等級的基本回饋率。只有官方活動畫面顯示「每 NT$30 可得 3 點」等回饋率時，才改成該數值。</p><hr><p>若活動顯示「3 倍」，請使用活動倍率。計算器無法確認資格、啟用狀態或上限。</p>`,
            'tooltip-multiplier': `<strong>【輸入倍率】</strong><p>官方活動畫面顯示「3 倍」等倍率時使用。</p><p>例如：金級（1.5pt/NT$30）× <strong>3 倍</strong> = 4.5pt/NT$30</p><hr><p>這與直接輸入回饋率是不同方式。若兩者都有值，計算器採用較高估算值，但不代表活動可疊加。</p>`,
            'tooltip-amount-yen': `<strong>【計算獲得點數】</strong><p>模擬輸入金額可獲得的預估點數。</p>`,
            'tooltip-reverse-status': `<strong>各等級基本回饋率:</strong><ul><li><strong>銅級:</strong> 1.0 pt / 30元</li><li><strong>銀級:</strong> 1.25 pt / 30元</li><li><strong>金級:</strong> 1.5 pt / 30元</li><li><strong>白金級:</strong> 1.75 pt / 30元</li><li><strong>鑽石級:</strong> 2.0 pt / 30元</li></ul>`
        },
        uiText: {
            title: "Google Play Points 計算器｜距離升級還差多少？", mainTitle: "Google Play Points 計算器",
            closeAria: "關閉", showHelpAria: "顯示說明", shareResultAria: "分享計算結果", prevYearAria: "上一年", nextYearAria: "下一年",
            siteAlias: "別稱: Google Play 點數計算器 / 非官方工具",
            siteDescription: "請先輸入目前等級、目標等級，以及距離目標還需要的點數。<br>此工具會估算達成等級所需消費金額，以及消費金額可獲得的點數。",
            tabMain: "一般計算", tabReverse: "逆算模式", tabDiary: "每週獎勵日記",
            firstStepTitle: "先輸入3個項目", firstStepCurrent: "目前等級", firstStepTarget: "目標等級", firstStepNeeded: "距離目標還需要的點數",
            sectionTitleStatus: "輸入等級", labelCurrentStatus: "目前等級",
            labelTargetStatus: "目標等級", labelNeededPoints: "距離目標所需點數",
            neededPointsPlaceholder: "例如：125", sectionTitleRate: "回饋設定",
            labelBaseRate: "每 NT$30 回饋率（直接輸入）", labelMultiplier: "活動倍率（另一種輸入方式）", labelMultiplierReverse: "活動倍率（另一種輸入方式）",
            warningRate: "計算器會使用直接輸入回饋率與等級基本回饋率×倍率中較高的估算值。兩者是不同輸入方式；實際資格、啟用與上限請查看官方活動畫面。",
            calculateButton: "計算消費金額", copyButton: "複製", tweetButton: "分享至 X",
            sectionTitleReverse: "逆算模式", labelAmountYen: "消費金額 (NT$)",
            amountYenPlaceholder: "例如：1500", reverseCalculateButton: "計算點數",
            nextTargetNone: "無下一目標等級", statusKeep: "維持", statusUp: "升級", packAmountLabel: "單筆平均購買禮包金額 (選填)", packAmountPlaceholder: "例：300", packUnit: "包", resultLabelRequiredPacks: "所需購買禮包數", resultLabelFreeClear: "無需消費", errorInput: "請輸入有效數值並選擇目標等級",
            errorNeededPoints: "請在距離目標所需點數中輸入有效數值",
            errorTargetStatus: "請選擇目標等級",
            errorRate: "用於計算的回饋率必須大於0", errorMonth: "計算今年剩餘月份失敗",
            errorInputReverse: "請輸入有效數值", errorRateReverse: "用於計算的回饋率必須大於0",
            errorTargetConsistency: "輸入的所需點數與選擇的目標等級不符，請確認數值。",
            resultLabelNeededPoints: "距離目標所需點數", resultLabelTotalYen: "預估總消費金額",
            resultLabelMonthlyYen: "月平均參考", resultLabelWeeklyYen: "週平均參考", resultLabelDailyYen: "每日參考", resultLabelRemainingDays: "距年底剩餘天數", resultLabelPaceSummary: "達成節奏參考", resultRelatedTitle: "相關文章", resultLabelMonths: "個月",
            resultComparisonTitle: "與一般回饋率比較", resultComparisonBase: "一般回饋率", resultComparisonSelected: "目前回饋條件", resultComparisonSaved: "預估差額", resultComparisonSamePack: "以此購買單位計算時，所需套組數相同，因此沒有差額。",
            resultLabelRate: "套用回饋率", resultLabelEarnedPoints: "預估獲得點數", resultRateSourceDirect: "使用直接輸入回饋率", resultRateSourceMultiplier: "使用等級回饋率×倍率", resultRateSourceSame: "兩種輸入的回饋率相同",
            perMonth: "/月", perWeek: "/週", perDay: "/日", daysUnit: "天",
            approxLabel: "約",
            descriptionSectionTitle: "Google Play 點數計算器可以做什麼？",
            articleDrawerTitle: "從常見問題尋找指南",
            articleDrawerSubtitle: "開啟各類別指南",
            articleCount: "{count}篇指南",
            faqSectionTitle: "❓ 常見問題 (FAQ)",
            tweetHashtags: "#GooglePlay點數計算器\n#PlayPoints",
            calculationNote: "*以今年12月31日前剩餘的 <b>{months}個月</b> 維持相同進度時的估算值。實際回饋率、適用消費與入帳時間請以 Google Play 官方畫面為準。",
            yearSuffix: "年", monthNames: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
            weekLabel: "第", weekSuffix: "週", pointsPlaceholder: "點數", prizeLabel: "獲得的獎品", saveButton: "儲存",
            monthlySummaryTitle: "月度統計", yearlySummaryTitle: "年度統計",
            yearlyChartTitle: "年度記錄圖表", yearlyChartDescription: "只在此裝置上比較每月記錄的點數。",
            totalLabel: "合計:", averageLabel: "平均:", pointsUnit: "pt", perWeekUnit: "pt/週",
            guestNotice: "[!] 日記資料只儲存在此瀏覽器的本機儲存空間。清除網站資料、結束無痕瀏覽或改用其他裝置與瀏覽器時不會自動移轉；如有需要請保留匯出資料。",
            prizeOptions: ["無獎品", "滑鼠", "耳機", "其他"],
            noWeeksMessage: "此月份無適用週數。",
            backupTitle: "資料備份與還原",
            exportBtn: "匯出資料 (複製)",
            importBtn: "匯入資料 (還原)",
            confirmImportBtn: "執行還原",
            backupPlaceholder: "請將匯出的資料貼至此處",
            exportSuccess: "已將日記資料複製到剪貼簿！請妥善保存。",
            importSuccess: "日記資料已順利還原！",
            importError: "資料匯入失敗，請檢查格式是否正確。",
            reminderTitle: "週五獎勵提醒 (日曆)",
            reminderDesc: "若帳號顯示一般每週獎勵，可設定每週五檢查獎勵頁面的提醒。",
            btnGoogleCal: "新增至 Google 日曆",
            btnICal: "新增至日曆 App (iCal)",
            linkLatest: { text: "🆕 最新資訊中心 (日文)", href: "latest/" },
            linkArticles: { text: "📝 指南列表", href: "articles/" },
            linkKatakata: { text: "🧪 KatakataLab (日文)", href: "https://katakatalab.com/" },
            linkPrivacy: { text: "隱私權政策 (日文)", href: "privacy.html" },
            linkTerms: { text: "服務條款 (日文)", href: "terms.html" },
            linkQA: { text: "Q&A 與後記 (日文)", href: "info.html" },
            linkFeedback: { text: "意見回饋", href: "https://docs.google.com/forms/d/e/1FAIpQLSe0HDPLt-jfNXuiGmJ3gxlxUtgeGJ5-AM16Bz2yNw5bk3irNw/viewform?usp=dialog" },
            linkAbout: { text: "什麼是 Play Points？", href: "about-playpoints.html" },
            linkWidget: { text: "免費小工具", href: "embed.html" },
            linkDiscount: { text: "💡 優惠儲值指南", href: "articles/2026-06-20-discount-gift-cards.html" },
            linkAuthor: { text: "營運者與政策 (日文)", href: "author/katakata.html" },
            linkAttention: { text: "⚠️ 國家別差異", href: "attention.html" },
            toastCopySuccess: "已複製至剪貼簿！",
            toastCopyError: "複製失敗。",
            copyResultTemplate: "▼Play Points 計算結果▼\n目標等級： {status}\n預估消費金額： 約{yen}{symbol}\n\n計算來源：Play Points 計算器 ( {url} )",
            tweetTextMain: "【Google Play 點數計算器】\n距離我的目標「{status}」還需要【{yen}{symbol}】！💰",
            tweetTextReverse: "【Google Play 點數計算器】\n消費 {yen}{symbol} 大約可以獲得 {points} 點！✨",
            calSubject: "【GooglePlay】領取每週獎勵的日子！",
            calDetails: "領取您的 Google Play Points 每週獎勵並記錄在日記中！\nhttps://playpoint-sim.com/tw/",
            icsFilename: "play-point-reward-reminder-tw.ics",
            toastDiarySaveSuccess: "日記已儲存！",
            toastDiaryLoadError: "無法載入日記資料。",
            toastDiarySaveError: "無法儲存日記資料。",
            toastCopyError: "複製失敗。",
            errorEmptyBackup: "還原資料為空。"
        }
    }
};

CONFIGS.JP.tooltips['tooltip-reverse-base-rate'] = CONFIGS.JP.tooltips['tooltip-base-rate'];
CONFIGS.JP.tooltips['tooltip-reverse-multiplier'] = CONFIGS.JP.tooltips['tooltip-multiplier'];
CONFIGS.US.tooltips['tooltip-reverse-base-rate'] = CONFIGS.US.tooltips['tooltip-base-rate'];
CONFIGS.US.tooltips['tooltip-reverse-multiplier'] = CONFIGS.US.tooltips['tooltip-multiplier'];
CONFIGS.KR.tooltips['tooltip-reverse-base-rate'] = CONFIGS.KR.tooltips['tooltip-base-rate'];
CONFIGS.KR.tooltips['tooltip-reverse-multiplier'] = CONFIGS.KR.tooltips['tooltip-multiplier'];
CONFIGS.TW.tooltips['tooltip-reverse-base-rate'] = CONFIGS.TW.tooltips['tooltip-base-rate'];
CONFIGS.TW.tooltips['tooltip-reverse-multiplier'] = CONFIGS.TW.tooltips['tooltip-multiplier'];

export const STATE = {
    currentRegion: 'JP',
    dom: {},
    diaryState: {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth() + 1,
    }
};

// 互換性マウント
if (typeof window !== 'undefined') {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.ANALYTICS = ANALYTICS;
    if (window.__TEST_ENV__) {
        window.PP_APP.CONSTANTS = CONSTANTS;
        window.PP_APP.CONFIGS = CONFIGS;
        window.PP_APP.STATE = STATE;
    }
}
