'use strict';

// 英語ページ配下にいるかどうかの判定ユーティリティ
PP_APP.isEnglishPath = () => window.location.pathname.includes('/en/');

// 現在の地域/言語に合わせてUI全体を更新する
PP_APP.updateUIForRegion = function() {
    this.UI.updateUIText();
    this.CALC.populateStatusSelects();
    this.CALC.updateBaseRateAndTarget();
    this.CALC.updateReverseBaseRate();
    if(this.STATE.dom.result) this.UI.clearResult(this.STATE.dom.result);
    if(this.STATE.dom.reverseResult) this.UI.clearResult(this.STATE.dom.reverseResult);
    if (this.STATE.dom.diaryMode && !this.STATE.dom.diaryMode.classList.contains(this.CONSTANTS.CLASS_HIDDEN)) this.DIARY.renderDiary();
};

// 地域（JP/US）を切り替え、静的HTMLページ間のリダイレクトまたは表示更新を行う
PP_APP.switchRegion = function(newRegion) {
    if (!this.CONFIGS[newRegion] || this.STATE.currentRegion === newRegion) return;
    this.STATE.currentRegion = newRegion;
    try {
        localStorage.setItem(this.CONSTANTS.STORAGE_REGION_KEY, newRegion);
    } catch (e) {
        console.error("地域設定の保存に失敗しました:", e);
        this.UI.showToast("地域設定の保存に失敗しました。", 'error');
    }
    
    // URLのディレクトリ構成に基づいて静的ページ間を相互遷移させる
    const isEn = this.isEnglishPath();
    if (newRegion === 'US' && !isEn) {
        window.location.href = './en/';
    } else if (newRegion === 'JP' && isEn) {
        window.location.href = '../';
    } else {
        document.querySelectorAll(".region-switch button").forEach(button => {
            button.classList.toggle(this.CONSTANTS.CLASS_ACTIVE, button.dataset.region === newRegion);
        });
        this.updateUIForRegion();
    }
};

// DOM要素のバインドとイベントリスナーの登録（初期化処理）
PP_APP.init = function() {
    const ids = [
        'mainMode', 'reverseMode', 'currentStatus', 'baseRate', 'targetStatus',
        'neededPoints', 'multiplier', 'calculateButton', 'result', 'copyButton',
        'tweetButton', 'amountYen', 'reverseStatus', 'reverseBaseRate',
        'reverseMultiplier', 'reverseCalculateButton', 'reverseResult', 'share-twitter-reverse',
        'copyright-year',
        'tab-diary', 'diaryMode', 'prevYearBtn', 'currentYear', 'nextYearBtn',
        'monthSelector', 'selectedMonth', 'weekInputs', 'monthlyTotal', 'monthlyAverage',
        'yearlyTotal', 'yearlyAverage', 'diary-guest-notice',
        'exportDiaryBtn', 'importDiaryBtn', 'backup-input-wrapper', 'diaryBackupData', 'confirmImportBtn',
        'friday-reminder', 'close-reminder-btn'
    ];
    
    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        const element = document.getElementById(id);
        if (element) this.STATE.dom[key] = element;
    });

    // アクションボタンのイベントバインド
    if (this.STATE.dom.calculateButton) this.STATE.dom.calculateButton.addEventListener('click', () => this.CALC.calculate());
    if (this.STATE.dom.copyButton) this.STATE.dom.copyButton.addEventListener('click', () => this.CALC.copyResult());
    if (this.STATE.dom.tweetButton) this.STATE.dom.tweetButton.addEventListener('click', () => this.CALC.handleTweet());
    if (this.STATE.dom.reverseCalculateButton) this.STATE.dom.reverseCalculateButton.addEventListener('click', () => this.CALC.reverseCalculate());
    if (this.STATE.dom.shareTwitterReverse) this.STATE.dom.shareTwitterReverse.addEventListener('click', () => this.CALC.handleTweetReverse());
    if (this.STATE.dom.currentStatus) this.STATE.dom.currentStatus.addEventListener('change', () => this.CALC.updateBaseRateAndTarget());
    if (this.STATE.dom.targetStatus) this.STATE.dom.targetStatus.addEventListener('change', () => this.CALC.updateNeededPointsConstraint());
    if (this.STATE.dom.reverseStatus) this.STATE.dom.reverseStatus.addEventListener('change', () => this.CALC.updateReverseBaseRate());
    if (this.STATE.dom.exportDiaryBtn) this.STATE.dom.exportDiaryBtn.addEventListener('click', () => this.DIARY.exportDiary());
    if (this.STATE.dom.importDiaryBtn) this.STATE.dom.importDiaryBtn.addEventListener('click', () => this.DIARY.toggleImportArea());
    if (this.STATE.dom.confirmImportBtn) this.STATE.dom.confirmImportBtn.addEventListener('click', () => this.DIARY.executeImport());

    // Enterキー押下での計算実行
    [this.STATE.dom.neededPoints, this.STATE.dom.baseRate, this.STATE.dom.multiplier].forEach(el => {
        if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); this.CALC.calculate();} });
    });
    [this.STATE.dom.amountYen, this.STATE.dom.reverseBaseRate, this.STATE.dom.reverseMultiplier].forEach(el => {
        if(el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); this.CALC.reverseCalculate();} });
    });

    // タブ切り替え
    document.querySelectorAll(".tab-switch button").forEach(button => button.addEventListener('click', () => this.UI.switchMode(button.dataset.mode)));
    
    // ヘルプツールチップ
    document.querySelectorAll(this.CONSTANTS.SELECTOR_INFO_BTN).forEach(button => {
        button.addEventListener('click', (e) => this.UI.toggleTooltip(e));
        button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.UI.toggleTooltip(e); } });
    });
    
    // 言語切り替え
    document.querySelectorAll(".region-switch button").forEach(button => button.addEventListener('click', (e) => this.switchRegion(e.currentTarget.dataset.region)));
    
    // ツールチップを閉じるグローバルリスナー
    document.addEventListener('click', (e) => { if (!e.target.closest(this.CONSTANTS.SELECTOR_INFO_BTN) && !e.target.closest(this.CONSTANTS.SELECTOR_TOOLTIP_BOX)) this.UI.closeAllTooltips(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.UI.closeAllTooltips(); });

    // アワード日記の年・週変更
    if (this.STATE.dom.prevYearBtn) this.STATE.dom.prevYearBtn.addEventListener('click', () => { if (this.STATE.diaryState.currentYear > 2023) { this.STATE.diaryState.currentYear--; this.DIARY.renderDiary(); } });
    if (this.STATE.dom.nextYearBtn) this.STATE.dom.nextYearBtn.addEventListener('click', () => { this.STATE.diaryState.currentYear++; this.DIARY.renderDiary(); });
    if (this.STATE.dom.weekInputs) this.STATE.dom.weekInputs.addEventListener('click', (e) => this.DIARY.handleDiarySave(e));

    if (this.STATE.dom.copyrightYear) this.STATE.dom.copyrightYear.textContent = new Date().getFullYear();

    try {
        if (this.isEnglishPath()) {
            // en/ ディレクトリ配下では強制的に英語（US）を設定
            this.STATE.currentRegion = 'US';
            localStorage.setItem(this.CONSTANTS.STORAGE_REGION_KEY, 'US');
        } else {
            // 通常ルートでは保存された地域を読み込み（初期値はJP）
            const savedRegion = localStorage.getItem(this.CONSTANTS.STORAGE_REGION_KEY);
            if (savedRegion && this.CONFIGS[savedRegion]) {
                this.STATE.currentRegion = savedRegion;
            } else {
                this.STATE.currentRegion = 'JP';
            }
        }
    } catch (e) {
        console.error("地域設定の読み込みに失敗しました:", e);
    }

    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(this.CONSTANTS.CLASS_ACTIVE, button.dataset.region === this.STATE.currentRegion);
    });

    this.UI.switchMode(this.CONSTANTS.MODE_MAIN);
    this.updateUIForRegion();
    this.SHARE.applyFromUrl();
    this.checkFridayReminder();

    // PWAサービスワーカーの登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))
                .catch(err => console.error('ServiceWorker registration failed:', err));
        });
    }
};

// 金曜日リマインダーバーの表示ロジック
PP_APP.checkFridayReminder = function() {
    if (!this.STATE.dom.fridayReminder) return;
    const isFriday = new Date().getDay() === 5;
    const isClosed = sessionStorage.getItem('playpointFridayReminderClosed') === 'true';
    
    if (isFriday && !isClosed) {
        this.STATE.dom.fridayReminder.classList.remove(this.CONSTANTS.CLASS_HIDDEN);
        if (this.STATE.dom.closeReminderBtn) {
            this.STATE.dom.closeReminderBtn.addEventListener('click', (e) => this.closeFridayReminder(e));
        }
        const textEl = this.STATE.dom.fridayReminder.querySelector('.reminder-text');
        if (textEl) {
            textEl.addEventListener('click', () => {
                this.UI.switchMode(this.CONSTANTS.MODE_DIARY);
                if (this.STATE.dom.diaryMode) {
                    this.STATE.dom.diaryMode.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
};

// リマインダーを閉じる処理
PP_APP.closeFridayReminder = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (this.STATE.dom.fridayReminder) {
        this.STATE.dom.fridayReminder.classList.add(this.CONSTANTS.CLASS_HIDDEN);
    }
    try {
        sessionStorage.setItem('playpointFridayReminderClosed', 'true');
    } catch (err) {
        console.error("セッションストレージの書き込みに失敗しました:", err);
    }
};

// 初期ロード完了時の発火
document.addEventListener('DOMContentLoaded', () => {
    PP_APP.init();
});
