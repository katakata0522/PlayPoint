'use strict';

import { CONFIGS, STATE, CONSTANTS, ANALYTICS } from './config.js';
import { UI } from './ui.js';
import { SHARE } from './share.js';
import { CALC } from './calculator.js';
import { simplifyMainCalculatorLayout, updateSimplifiedCalculatorCopy } from './main-calculator-ui.js?v=8f2f7d1cac';
import { initWebVitalsMonitoring } from './web-vitals.js';
import {
    applyRegionFromPath,
    isEnglishPath,
    isKoreanPath,
    isTaiwanPath,
    switchRegion as navigateToRegion
} from './region-navigation.js';
import { bindLanguageSuggestionDismiss, checkLanguageSuggestion } from './language-suggestion.js';
import { bindCalendarReminderEvents, downloadICS } from './calendar-reminder.js';
import { initPwaInstallPrompt } from './pwa-install.js';
import { trackWidgetReferral } from './widget-referral.js';
import { registerServiceWorker } from './service-worker-registration.js';

let diaryModulePromise = null;
const calculatorFunnelStartedModes = new Set();
const calculatorFunnelCompletedModes = new Set();
let activeCalculatorMode = CONSTANTS.MODE_MAIN;
let diaryTabOpenedThisPage = false;

function loadDiaryModule() {
    if (!diaryModulePromise) {
        diaryModulePromise = import('./diary.js').catch((error) => {
            diaryModulePromise = null;
            throw error;
        });
    }
    return diaryModulePromise;
}

function reportDiaryLoadError(error) {
    console.error('日記機能の読み込みに失敗しました:', error);
    const message = CONFIGS[STATE.currentRegion]?.uiText?.toastDiaryLoadError || '日記機能の読み込みに失敗しました。';
    UI.showToast(message, 'error');
}

function queueDiaryAction(action) {
    void loadDiaryModule()
        .then(({ DIARY }) => action(DIARY))
        .catch(reportDiaryLoadError);
}

// 早い段階から観測し、送信は既存の同意管理と匿名区分に限定する。
initWebVitalsMonitoring();
initPwaInstallPrompt();

export { isEnglishPath, isKoreanPath, isTaiwanPath };

function bindEvent(element, eventName, listener, options) {
    if (element) element.addEventListener(eventName, listener, options);
}

function bindEnterAction(elements, action) {
    for (const element of elements) {
        bindEvent(element, 'keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            action();
        });
    }
}

function getAnalyticsCalculationMode(mode) {
    return mode === CONSTANTS.MODE_REVERSE ? 'spend_to_points' : 'rank_up';
}

function canRecordCalculatorFunnel() {
    return window.PlayPointConsent?.getStatus?.() !== 'denied';
}

function trackCalculatorFormStarted(mode, startField) {
    if (mode !== CONSTANTS.MODE_MAIN && mode !== CONSTANTS.MODE_REVERSE) return;
    if (!canRecordCalculatorFunnel()) return;
    if (calculatorFunnelStartedModes.has(mode)) return;
    calculatorFunnelStartedModes.add(mode);
    ANALYTICS.track('calculator_form_started', {
        calculation_mode: getAnalyticsCalculationMode(mode),
        region: STATE.currentRegion,
        start_field: startField
    });
}

function getValidationErrorType(mode) {
    const target = mode === CONSTANTS.MODE_REVERSE ? STATE.dom.reverseResult : STATE.dom.result;
    const message = target?.querySelector('.error-text')?.textContent || '';
    if (!message) return null;

    const texts = CONFIGS[STATE.currentRegion]?.uiText || {};
    const candidates = mode === CONSTANTS.MODE_REVERSE
        ? [
            ['errorInputReverse', 'amount_or_rate_input'],
            ['errorRateReverse', 'rate']
        ]
        : [
            ['errorNeededPoints', 'needed_points'],
            ['errorTargetStatus', 'target_status'],
            ['errorRate', 'rate'],
            ['errorTargetConsistency', 'target_consistency'],
            ['errorInput', 'invalid_input']
        ];

    const matched = candidates.find(([key]) => texts[key] && texts[key] === message);
    return matched ? matched[1] : 'unknown';
}

function runTrackedCalculation(mode) {
    const calculationMode = getAnalyticsCalculationMode(mode);
    const target = mode === CONSTANTS.MODE_REVERSE ? STATE.dom.reverseResult : STATE.dom.result;
    trackCalculatorFormStarted(mode, 'submit');

    if (mode === CONSTANTS.MODE_REVERSE) {
        CALC.reverseCalculate();
    } else {
        CALC.calculate();
    }

    const errorType = getValidationErrorType(mode);
    if (errorType) {
        ANALYTICS.track('calculator_validation_error', {
            calculation_mode: calculationMode,
            region: STATE.currentRegion,
            error_type: errorType
        });
        return;
    }

    if (!target?.classList.contains(CONSTANTS.CLASS_HAS_RESULT) || calculatorFunnelCompletedModes.has(mode)) return;
    calculatorFunnelCompletedModes.add(mode);
    ANALYTICS.track('calculator_funnel_completed', {
        calculation_mode: calculationMode,
        region: STATE.currentRegion
    });
}

function bindCalculatorFunnelStart(element, mode, startField, eventName = 'input') {
    bindEvent(element, eventName, () => trackCalculatorFormStarted(mode, startField));
}

function trackCalculatorModeChange(nextMode) {
    const previousMode = activeCalculatorMode;
    if (!nextMode || previousMode === nextMode) return;

    ANALYTICS.track('calculator_mode_changed', {
        region: STATE.currentRegion,
        from_mode: previousMode,
        to_mode: nextMode
    });
    activeCalculatorMode = nextMode;

    if (nextMode === CONSTANTS.MODE_DIARY && !diaryTabOpenedThisPage) {
        diaryTabOpenedThisPage = true;
        ANALYTICS.track('diary_tab_opened', {
            region: STATE.currentRegion,
            open_surface: 'tab'
        });
    }
}

function resetFunnelDedupIfDenied() {
    const status = window.PlayPointConsent?.getStatus?.();
    if (status !== 'denied') return;
    calculatorFunnelStartedModes.clear();
    calculatorFunnelCompletedModes.clear();
    diaryTabOpenedThisPage = false;
}

function getResultLinkAnalyticsParams(link) {
    const targetUrl = new URL(link.href, window.location.href);
    return {
        source_path: window.location.pathname,
        target_path: targetUrl.pathname,
        target_status: STATE.dom.result?.dataset?.targetStatusLabel || '',
        calculation_mode: 'rank_up',
        link_position: link.dataset.linkPosition
    };
}

function trackResultLinkClicks(event) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const relatedLink = target.closest('[data-result-related-link]');
    if (relatedLink) {
        ANALYTICS.track('result_related_article_clicked', getResultLinkAnalyticsParams(relatedLink));
    }

    const decisionLink = target.closest('[data-result-decision-link]');
    if (decisionLink) {
        ANALYTICS.track('result_decision_link_clicked', getResultLinkAnalyticsParams(decisionLink));
    }
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
    updateSimplifiedCalculatorCopy(STATE.currentRegion);
    CALC.populateStatusSelects();
    CALC.updateBaseRateAndTarget();
    CALC.updateReverseBaseRate();
    if (STATE.dom.result) UI.clearResult(STATE.dom.result);
    if (STATE.dom.reverseResult) UI.clearResult(STATE.dom.reverseResult);
    if (STATE.dom.diaryMode && !STATE.dom.diaryMode.classList.contains(CONSTANTS.CLASS_HIDDEN)) {
        queueDiaryAction((DIARY) => DIARY.renderDiary());
    }
}

export function switchRegion(newRegion) {
    return navigateToRegion(newRegion, updateUIForRegion);
}

// DOM要素のバインドとイベントリスナーの登録（初期化処理）
export function init() {
    simplifyMainCalculatorLayout(STATE.currentRegion);

    const ids = [
        'mainMode', 'reverseMode', 'currentStatus', 'baseRate', 'targetStatus',
        'neededPoints', 'multiplier', 'calculateButton', 'result', 'result-actions', 'result-details', 'copyButton',
        'tweetButton', 'amountYen', 'reverseStatus', 'reverseBaseRate',
        'reverseMultiplier', 'reverseCalculateButton', 'reverseResult', 'share-twitter-reverse',
        'copyright-year',
        'tab-diary', 'diaryMode', 'prevYearBtn', 'currentYear', 'nextYearBtn',
        'monthSelector', 'selectedMonth', 'weekInputs', 'monthlyTotal', 'monthlyAverage',
        'yearlyTotal', 'yearlyAverage', 'diary-year-chart', 'diary-guest-notice',
        'exportDiaryBtn', 'importDiaryBtn', 'backup-input-wrapper', 'diaryBackupData', 'confirmImportBtn',
        'language-suggestion-banner', 'switch-to-en-btn', 'close-lang-banner-btn',
        'register-google-cal-btn', 'download-ical-btn'
    ];

    ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        const element = document.getElementById(id);
        if (element) STATE.dom[key] = element;
    });

    // アクションボタンのイベントバインド
    bindEvent(STATE.dom.calculateButton, 'click', () => runTrackedCalculation(CONSTANTS.MODE_MAIN));
    bindEvent(STATE.dom.copyButton, 'click', () => CALC.copyResult());
    bindEvent(STATE.dom.tweetButton, 'click', () => CALC.handleTweet());
    bindEvent(STATE.dom.reverseCalculateButton, 'click', () => runTrackedCalculation(CONSTANTS.MODE_REVERSE));
    bindEvent(STATE.dom.shareTwitterReverse, 'click', () => CALC.handleTweetReverse());
    bindEvent(STATE.dom.currentStatus, 'change', () => {
        trackCalculatorFormStarted(CONSTANTS.MODE_MAIN, 'current_status');
        CALC.updateBaseRateAndTarget();
    });
    bindEvent(STATE.dom.targetStatus, 'change', () => {
        trackCalculatorFormStarted(CONSTANTS.MODE_MAIN, 'target_status');
        CALC.updateNeededPointsConstraint();
    });
    bindEvent(STATE.dom.reverseStatus, 'change', () => {
        trackCalculatorFormStarted(CONSTANTS.MODE_REVERSE, 'status');
        CALC.updateReverseBaseRate();
    });
    bindEvent(STATE.dom.exportDiaryBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.exportDiary()));
    bindEvent(STATE.dom.importDiaryBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.toggleImportArea()));
    bindEvent(STATE.dom.confirmImportBtn, 'click', () => queueDiaryAction((DIARY) => DIARY.executeImport()));
    bindLanguageSuggestionDismiss();
    bindCalendarReminderEvents();

    bindCalculatorFunnelStart(STATE.dom.neededPoints, CONSTANTS.MODE_MAIN, 'needed_points');
    bindCalculatorFunnelStart(STATE.dom.baseRate, CONSTANTS.MODE_MAIN, 'base_rate');
    bindCalculatorFunnelStart(STATE.dom.multiplier, CONSTANTS.MODE_MAIN, 'promotion_rate');
    bindCalculatorFunnelStart(STATE.dom.amountYen, CONSTANTS.MODE_REVERSE, 'amount');
    bindCalculatorFunnelStart(STATE.dom.reverseBaseRate, CONSTANTS.MODE_REVERSE, 'base_rate');
    bindCalculatorFunnelStart(STATE.dom.reverseMultiplier, CONSTANTS.MODE_REVERSE, 'promotion_rate');
    document.addEventListener('playpoint:consent-ready', resetFunnelDedupIfDenied);
    document.addEventListener('playpoint:consent-updated', resetFunnelDedupIfDenied);

    // Enterキー押下での計算実行
    bindEnterAction([STATE.dom.neededPoints, STATE.dom.baseRate, STATE.dom.multiplier], () => runTrackedCalculation(CONSTANTS.MODE_MAIN));
    bindEnterAction([STATE.dom.amountYen, STATE.dom.reverseBaseRate, STATE.dom.reverseMultiplier], () => runTrackedCalculation(CONSTANTS.MODE_REVERSE));

    // タブ切り替え
    document.querySelectorAll(".tab-switch button").forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            trackCalculatorModeChange(mode);
            UI.switchMode(mode);
            if (mode === CONSTANTS.MODE_DIARY) {
                queueDiaryAction((DIARY) => DIARY.renderDiary());
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

    document.addEventListener('click', trackResultLinkClicks);

    // ツールチップを閉じるグローバルリスナー
    document.addEventListener('click', (e) => { if (!e.target.closest(CONSTANTS.SELECTOR_INFO_BTN) && !e.target.closest(CONSTANTS.SELECTOR_TOOLTIP_BOX)) UI.closeAllTooltips(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeAllTooltips(); });

    // アワード日記の年・週変更
    if (STATE.dom.prevYearBtn) STATE.dom.prevYearBtn.addEventListener('click', () => {
        if (STATE.diaryState.currentYear > 2023) {
            STATE.diaryState.currentYear--;
            queueDiaryAction((DIARY) => DIARY.renderDiary());
        }
    });
    if (STATE.dom.nextYearBtn) STATE.dom.nextYearBtn.addEventListener('click', () => {
        STATE.diaryState.currentYear++;
        queueDiaryAction((DIARY) => DIARY.renderDiary());
    });
    if (STATE.dom.weekInputs) STATE.dom.weekInputs.addEventListener('click', (e) => queueDiaryAction((DIARY) => DIARY.handleDiarySave(e)));

    if (STATE.dom.copyrightYear) STATE.dom.copyrightYear.textContent = new Date().getFullYear();

    applyRegionFromPath();

    document.querySelectorAll(".region-switch button").forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === STATE.currentRegion);
    });

    UI.switchMode(CONSTANTS.MODE_MAIN);
    updateUIForRegion();
    updateArticleCount();
    SHARE.applyFromUrl();
    checkLanguageSuggestion();
    trackWidgetReferral();

    registerServiceWorker();
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
    window.PP_APP.checkLanguageSuggestion = checkLanguageSuggestion;
    window.PP_APP.downloadICS = downloadICS;
}