'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS, getNextFridayCalendarWindow } from './config.js';
import { UI } from './ui.js';
import { DIARY } from './diary.js';
import { SHARE } from './share.js';
import { CALC } from './calculator.js';

export const isEnglishPath = () => /\/en(\/|$)/.test(window.location.pathname);
export const isKoreanPath = () => /\/ko(\/|$)/.test(window.location.pathname);
export const isTaiwanPath = () => /\/tw(\/|$)/.test(window.location.pathname);

function runWhenIdle(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout });
        return;
    }
    window.setTimeout(callback, Math.min(timeout, 1200));
}

// 言語テキスト更新後に、記事一覧の実件数をテンプレートへ反映する
function updateArticleCount() {
    const countEl = document.querySelector('.article-count');
    const listEl = document.querySelector('.article-link-list');
    if (!countEl || !listEl) return;

    const count = listEl.querySelectorAll('li').length;
    const config = CONFIGS[STATE.currentRegion];
    const template = config.uiText.articleCount || '{count}記事';
    countEl.textContent = template.replace('{count}', count);
}

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
    const isKo = isKoreanPath();
    const isTw = isTaiwanPath();
    const prefix = (isEn || isKo || isTw) ? '../' : './';
    
    let nextUrl = '';
    if (newRegion === 'JP') {
        nextUrl = (isEn || isKo || isTw) ? '../' : './';
    } else if (newRegion === 'US') {
        nextUrl = prefix + 'en/';
    } else if (newRegion === 'KR') {
        nextUrl = prefix + 'ko/';
    } else if (newRegion === 'TW') {
        nextUrl = prefix + 'tw/';
    }
    
    if (nextUrl) {
        window.location.href = nextUrl;
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
        'neededPoints', 'pack-amount', 'multiplier', 'calculateButton', 'result', 'result-actions', 'copyButton',
        'tweetButton', 'amountYen', 'reverseStatus', 'reverseBaseRate',
        'reverseMultiplier', 'reverseCalculateButton', 'reverseResult', 'share-twitter-reverse',
        'copyright-year',
        'tab-diary', 'diaryMode', 'prevYearBtn', 'currentYear', 'nextYearBtn',
        'monthSelector', 'selectedMonth', 'weekInputs', 'monthlyTotal', 'monthlyAverage',
        'yearlyTotal', 'yearlyAverage', 'diary-guest-notice',
        'exportDiaryBtn', 'importDiaryBtn', 'backup-input-wrapper', 'diaryBackupData', 'confirmImportBtn',
        'friday-reminder', 'close-reminder-btn',
        'language-suggestion-banner', 'switch-to-en-btn', 'close-lang-banner-btn',
        'register-google-cal-btn', 'download-ical-btn'
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
    if (STATE.dom.closeLangBannerBtn) STATE.dom.closeLangBannerBtn.addEventListener('click', () => {
        if (STATE.dom.languageSuggestionBanner) {
            STATE.dom.languageSuggestionBanner.classList.add(CONSTANTS.CLASS_HIDDEN);
        }
        try {
            sessionStorage.setItem('playpointLangBannerClosed', 'true');
        } catch (e) {
            console.error("セッションストレージの書き込みに失敗しました:", e);
        }
    });
    if (STATE.dom.downloadIcalBtn) STATE.dom.downloadIcalBtn.addEventListener('click', () => downloadICS());

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

    document.addEventListener('click', (event) => {
        const link = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('[data-result-related-link]')
            : null;
        if (!link) return;
        const targetUrl = new URL(link.href, window.location.href);
        ANALYTICS.track('result_related_article_clicked', {
            source_path: window.location.pathname,
            target_path: targetUrl.pathname,
            target_status: STATE.dom.result?.dataset?.targetStatusLabel || '',
            calculation_mode: 'rank_up',
            link_position: link.dataset.linkPosition
        });
    });

    document.addEventListener('click', (event) => {
        const link = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('[data-result-decision-link]')
            : null;
        if (!link) return;
        const targetUrl = new URL(link.href, window.location.href);
        ANALYTICS.track('result_decision_link_clicked', {
            source_path: window.location.pathname,
            target_path: targetUrl.pathname,
            target_status: STATE.dom.result?.dataset?.targetStatusLabel || '',
            calculation_mode: 'rank_up',
            link_position: link.dataset.linkPosition
        });
    });
    
    // ツールチップを閉じるグローバルリスナー
    document.addEventListener('click', (e) => { if (!e.target.closest(CONSTANTS.SELECTOR_INFO_BTN) && !e.target.closest(CONSTANTS.SELECTOR_TOOLTIP_BOX)) UI.closeAllTooltips(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeAllTooltips(); });

    // アワード日記の年・週変更
    if (STATE.dom.prevYearBtn) STATE.dom.prevYearBtn.addEventListener('click', () => { if (STATE.diaryState.currentYear > 2023) { STATE.diaryState.currentYear--; DIARY.renderDiary(); } });
    if (STATE.dom.nextYearBtn) STATE.dom.nextYearBtn.addEventListener('click', () => { STATE.diaryState.currentYear++; DIARY.renderDiary(); });
    if (STATE.dom.weekInputs) STATE.dom.weekInputs.addEventListener('click', (e) => DIARY.handleDiarySave(e));

    if (STATE.dom.copyrightYear) STATE.dom.copyrightYear.textContent = new Date().getFullYear();

    try {
        if (isEnglishPath()) {
            STATE.currentRegion = 'US';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'US');
        } else if (isKoreanPath()) {
            STATE.currentRegion = 'KR';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'KR');
        } else if (isTaiwanPath()) {
            STATE.currentRegion = 'TW';
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, 'TW');
        } else {
            // URLと表示言語を一致させるため、ルートは常に日本語として扱う。
            STATE.currentRegion = 'JP';
        }
    } catch (e) {
        console.error("地域設定の読み込みに失敗しました:", e);
    }

    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === STATE.currentRegion);
    });

    UI.switchMode(CONSTANTS.MODE_MAIN);
    updateUIForRegion();
    updateArticleCount();
    SHARE.applyFromUrl();
    checkFridayReminder();
    checkLanguageSuggestion();

    // PWAサービスワーカーの登録
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            runWhenIdle(() => {
                const swPath = (isEnglishPath() || isKoreanPath() || isTaiwanPath()) ? '../sw.js' : './sw.js';
                navigator.serviceWorker.register(swPath)
                    .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))
                    .catch(err => console.error('ServiceWorker registration failed:', err));
            });
        });
    }
}

// 言語提案バナーの表示ロジック
export function checkLanguageSuggestion() {
    if (!STATE.dom.languageSuggestionBanner) return;

    let isClosed = false;
    try {
        isClosed = sessionStorage.getItem('playpointLangBannerClosed') === 'true';
    } catch (e) {
        console.error("セッションストレージの読み込みに失敗しました:", e);
    }
    if (isClosed) return;

    let preferredRegion = null;
    try {
        preferredRegion = localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY);
    } catch (e) {
        console.error("ローカルストレージの読み込みに失敗しました:", e);
    }

    if (preferredRegion) return;

    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    
    let targetRegion = null;
    let messageText = '';
    let buttonText = '';
    let isCurrentMatch = false;

    if (browserLang.startsWith('ko')) {
        targetRegion = 'KR';
        messageText = '한국어 버전이 있습니다!';
        buttonText = '한국어로 전환';
        isCurrentMatch = isKoreanPath();
    } else if (browserLang.startsWith('zh-tw') || browserLang.startsWith('zh-hk')) {
        targetRegion = 'TW';
        messageText = '提供繁體中文版本！';
        buttonText = '切換至繁體中文';
        isCurrentMatch = isTaiwanPath();
    } else if (browserLang.startsWith('en')) {
        targetRegion = 'US';
        messageText = 'English version is available!';
        buttonText = 'Switch to English';
        isCurrentMatch = isEnglishPath();
    }

    if (targetRegion && !isCurrentMatch) {
        const spanEl = STATE.dom.languageSuggestionBanner.querySelector('span');
        const btnEl = STATE.dom.switchToEnBtn;
        if (spanEl && btnEl) {
            spanEl.textContent = messageText;
            btnEl.textContent = buttonText;
            
            const newBtn = btnEl.cloneNode(true);
            btnEl.parentNode.replaceChild(newBtn, btnEl);
            STATE.dom.switchToEnBtn = newBtn;
            
            newBtn.addEventListener('click', () => {
                switchRegion(targetRegion);
            });
        }
        STATE.dom.languageSuggestionBanner.classList.remove(CONSTANTS.CLASS_HIDDEN);
    }
}

// ICSファイルのダウンロードロジック
export function downloadICS() {
    const config = CONFIGS[STATE.currentRegion];
    const texts = config.uiText;
    const summary = texts.calSubject;
    const description = texts.calDetails.replace(/\n/g, '\\n');
    
    const calendarWindow = getNextFridayCalendarWindow(STATE.currentRegion === 'US');
    
    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PlayPoint//NONSGML Calendar//EN',
        'BEGIN:VEVENT',
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `DTSTART:${calendarWindow.start}`,
        `DTEND:${calendarWindow.end}`,
        'RRULE:FREQ=WEEKLY;BYDAY=FR',
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
        'END:VCALENDAR'
    ];
    const icsString = icsLines.join('\r\n');
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = texts.icsFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    window.PP_APP.checkLanguageSuggestion = checkLanguageSuggestion;
    window.PP_APP.downloadICS = downloadICS;
}
