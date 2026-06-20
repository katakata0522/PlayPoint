'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { DIARY } from './diary.js';
import { SHARE } from './share.js';
import { CALC } from './calculator.js';

export const isEnglishPath = () => window.location.pathname.includes('/en/');

export function updateUIForRegion() {
    UI.updateUIText();
    CALC.populateStatusSelects();
    CALC.updateBaseRateAndTarget();
    CALC.updateReverseBaseRate();
    if (STATE.dom.result) UI.clearResult(STATE.dom.result);
    if (STATE.dom.reverseResult) UI.clearResult(STATE.dom.reverseResult);
    if (STATE.dom.diaryMode && !STATE.dom.diaryMode.classList.contains(CONSTANTS.CLASS_HIDDEN)) DIARY.renderDiary();
}

export function switchRegion(newRegion) {
    if (!CONFIGS[newRegion] || STATE.currentRegion === newRegion) return;
    STATE.currentRegion = newRegion;
    try {
        localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, newRegion);
    } catch (e) {
        console.error("地域設定の保存に失敗しました:", e);
        UI.showToast("地域設定の保存に失敗しました。", 'error');
    }
    
    // URLのディレクトリ構成に基づいて静的ページ間を相互遷移させる
    const isEn = isEnglishPath();
    if (newRegion === 'US' && !isEn) {
        window.location.href = './en/';
    } else if (newRegion === 'JP' && isEn) {
        window.location.href = '../';
    } else {
        document.querySelectorAll(".region-switch button").forEach(button => {
            button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === newRegion);
        });
        updateUIForRegion();
    }
}

// DOM要素のバインドとイベントリスナーの登録（初期化処理）
export function init() {
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
        if (element) STATE.dom[key] = element;
    });

    // アクションボタンのイベントバインド
    if (STATE.dom.calculateButton) STATE.dom.calculateButton.addEventListener('click', () => CALC.calculate());
    if (STATE.dom.copyButton) STATE.dom.copyButton.addEventListener('click', () => CALC.copyResult());
    if (STATE.dom.tweetButton) STATE.dom.tweetButton.addEventListener('click', () => CALC.handleTweet());
    if (STATE.dom.reverseCalculateButton) STATE.dom.reverseCalculateButton.addEventListener('click', () => CALC.reverseCalculate());
    if (STATE.dom.shareTwitterReverse) STATE.dom.shareTwitterReverse.addEventListener('click', () => CALC.handleTweetReverse());
    if (STATE.dom.currentStatus) STATE.dom.currentStatus.addEventListener('change', () => CALC.updateBaseRateAndTarget());
    if (STATE.dom.targetStatus) STATE.dom.targetStatus.addEventListener('change', () => CALC.updateNeededPointsConstraint());
    if (STATE.dom.reverseStatus) STATE.dom.reverseStatus.addEventListener('change', () => CALC.updateReverseBaseRate());
    if (STATE.dom.exportDiaryBtn) STATE.dom.exportDiaryBtn.addEventListener('click', () => DIARY.exportDiary());
    if (STATE.dom.importDiaryBtn) STATE.dom.importDiaryBtn.addEventListener('click', () => DIARY.toggleImportArea());
    if (STATE.dom.confirmImportBtn) STATE.dom.confirmImportBtn.addEventListener('click', () => DIARY.executeImport());

    // Enterキー押下での計算実行
    [STATE.dom.neededPoints, STATE.dom.baseRate, STATE.dom.multiplier].forEach(el => {
        if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); CALC.calculate(); } });
    });
    [STATE.dom.amountYen, STATE.dom.reverseBaseRate, STATE.dom.reverseMultiplier].forEach(el => {
        if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); CALC.reverseCalculate(); } });
    });

    // タブ切り替え
    document.querySelectorAll(".tab-switch button").forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            UI.switchMode(mode);
            if (mode === CONSTANTS.MODE_DIARY) {
                DIARY.renderDiary();
            }
        });
    });
    
    // ヘルプツールチップ
    document.querySelectorAll(CONSTANTS.SELECTOR_INFO_BTN).forEach(button => {
        button.addEventListener('click', (e) => UI.toggleTooltip(e));
        button.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.toggleTooltip(e); } });
    });
    
    // 言語切り替え
    document.querySelectorAll(".region-switch button").forEach(button => button.addEventListener('click', (e) => switchRegion(e.currentTarget.dataset.region)));
    
    // ツールチップを閉じるグローバルリスナー
    document.addEventListener('click', (e) => { if (!e.target.closest(CONSTANTS.SELECTOR_INFO_BTN) && !e.target.closest(CONSTANTS.SELECTOR_TOOLTIP_BOX)) UI.closeAllTooltips(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeAllTooltips(); });

    // アワード日記の年・週変更
    if (STATE.dom.prevYearBtn) STATE.dom.prevYearBtn.addEventListener('click', () => { if (STATE.diaryState.currentYear > 2023) { STATE.diaryState.currentYear--; DIARY.renderDiary(); } });
    if (STATE.dom.nextYearBtn) STATE.dom.nextYearBtn.addEventListener('click', () => { STATE.diaryState.currentYear++; DIARY.renderDiary(); });
    if (STATE.dom.weekInputs) STATE.dom.weekInputs.addEventListener('click', (e) => DIARY.handleDiarySave(e));

    if (STATE.dom.copyrightYear) STATE.dom.copyrightYear.textContent = new Date().getFullYear();

    // 記事数の動的カウントと反映
    const countEl = document.querySelector('.article-count');
    const listEl = document.querySelector('.article-link-list');
    if (countEl && listEl) {
        const count = listEl.querySelectorAll('li').length;
        const isEn = isEnglishPath();
        countEl.textContent = isEn ? `${count} Guides` : `${count}記事`;
    }


    try {
        if (isEnglishPath()) {
            // en/ ディレクトリ配下では強制的に英語（US）を設定
            STATE.currentRegion = 'US';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'US');
        } else {
            // 通常ルートでは保存された地域を読み込み（初期値はJP）
            const savedRegion = localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY);
            if (savedRegion && CONFIGS[savedRegion]) {
                STATE.currentRegion = savedRegion;
            } else {
                STATE.currentRegion = 'JP';
            }
        }
    } catch (e) {
        console.error("地域設定の読み込みに失敗しました:", e);
    }

    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === STATE.currentRegion);
    });

    UI.switchMode(CONSTANTS.MODE_MAIN);
    updateUIForRegion();
    SHARE.applyFromUrl();
    checkFridayReminder();

    // PWAサービスワーカーの登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swPath = isEnglishPath() ? '../sw.js' : './sw.js';
            navigator.serviceWorker.register(swPath)
                .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))
                .catch(err => console.error('ServiceWorker registration failed:', err));
        });
    }
}

// 金曜日リマインダーバーの表示ロジック
export function checkFridayReminder() {
    const isFriday = new Date().getDay() === 5;
    
    // 日記タブ最上部のヒントカードを金曜日のときだけ強調
    const hintCard = document.getElementById('diary-hint-card');
    if (hintCard) {
        hintCard.classList.toggle('is-friday', isFriday);
    }

    if (!STATE.dom.fridayReminder) return;
    const isClosed = sessionStorage.getItem('playpointFridayReminderClosed') === 'true';
    
    if (isFriday && !isClosed) {
        STATE.dom.fridayReminder.classList.remove(CONSTANTS.CLASS_HIDDEN);
        if (STATE.dom.closeReminderBtn) {
            STATE.dom.closeReminderBtn.addEventListener('click', (e) => closeFridayReminder(e));
        }
        const textEl = STATE.dom.fridayReminder.querySelector('.reminder-text');
        if (textEl) {
            textEl.addEventListener('click', () => {
                UI.switchMode(CONSTANTS.MODE_DIARY);
                if (STATE.dom.diaryMode) {
                    STATE.dom.diaryMode.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
}

// リマインダーを閉じる処理
export function closeFridayReminder(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (STATE.dom.fridayReminder) {
        STATE.dom.fridayReminder.classList.add(CONSTANTS.CLASS_HIDDEN);
    }
    try {
        sessionStorage.setItem('playpointFridayReminderClosed', 'true');
    } catch (err) {
        console.error("セッションストレージの書き込みに失敗しました:", err);
    }
}

// 初期ロード完了時の発火
document.addEventListener('DOMContentLoaded', () => {
    init();
});

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.isEnglishPath = isEnglishPath;
    window.PP_APP.updateUIForRegion = updateUIForRegion;
    window.PP_APP.switchRegion = switchRegion;
    window.PP_APP.init = init;
    window.PP_APP.checkFridayReminder = checkFridayReminder;
    window.PP_APP.closeFridayReminder = closeFridayReminder;
}
