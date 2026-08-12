'use strict';

import { CONFIGS, STATE, CONSTANTS, getNextFridayCalendarWindow } from './config.js';

const HTML_TEXT_KEYS = new Set(['siteDescription', 'warningRate', 'guestNotice']);
const LOCALIZED_PAGE_PREFIXES = ['/en/', '/ko/', '/tw/'];

function isLocalizedSubdirectory(pathname) {
    return LOCALIZED_PAGE_PREFIXES.some(prefix => pathname.includes(prefix));
}

function updateLocalizedLink(element, value, isSubDir) {
    element.textContent = value.text;
    if (!value.href) return;

    const rawHref = value.href;
    const isExternal = rawHref.startsWith('http') || rawHref.startsWith('//');
    const isLocalizedFile = rawHref.startsWith('articles/');
    const prefix = (isSubDir && !isLocalizedFile) ? '../' : './';
    element.href = isExternal ? rawHref : (prefix + rawHref.replace(/^\.\//, ''));
}

function setElementVisibility(element, isVisible) {
    if (!element) return;
    element.classList.toggle(CONSTANTS.CLASS_HIDDEN, !isVisible);
    element.hidden = !isVisible;
}

function setPanelVisibility(element, isVisible) {
    if (!element) return;
    setElementVisibility(element, isVisible);
    element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
}

function setResultActionsVisibility(targetElement, isVisible) {
    if (targetElement === STATE.dom.result) {
        setElementVisibility(STATE.dom.resultActions, isVisible);
        setElementVisibility(STATE.dom.tweetButton, isVisible);
        setElementVisibility(STATE.dom.copyButton, isVisible);
    } else if (targetElement === STATE.dom.reverseResult) {
        setElementVisibility(STATE.dom.shareTwitterReverse, isVisible);
    }
}

export const UI = {
    toastTimerId: null,
    
    // トースト通知を表示するメソッド
    showToast(message, type = 'normal') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') {
            toast.classList.add('error');
        }

        if (this.toastTimerId) {
            clearTimeout(this.toastTimerId);
        }

        this.toastTimerId = setTimeout(() => {
            toast.className = 'toast';
            this.toastTimerId = null;
        }, 3000);
    },

    // 数値を 0 から目標値までスムーズにカウントアップするアニメーションメソッド
    animateValue(obj, start, end, duration, formatLang = 'ja') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // イージング関数（滑らかに減速する Quadratic ease-out）を適用
            const easeOutQuad = progress * (2 - progress);
            const value = Math.floor(easeOutQuad * (end - start) + start);
            obj.textContent = value.toLocaleString(formatLang);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end.toLocaleString(formatLang);
            }
        };
        window.requestAnimationFrame(step);
    },

    // UIテキストを現在の言語設定でアップデートするメソッド
    updateUIText() {
        const config = CONFIGS[STATE.currentRegion];
        const texts = config.uiText;
        document.documentElement.lang = config.lang;
        document.title = texts.title;
        const isSubDir = isLocalizedSubdirectory(window.location.pathname);

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (!texts[key]) return;

            if (el.tagName === 'A' && typeof texts[key] === 'object' && texts[key].text) {
                updateLocalizedLink(el, texts[key], isSubDir);
                return;
            }

            if (HTML_TEXT_KEYS.has(key)) {
                el.innerHTML = texts[key];
            } else {
                el.textContent = texts[key];
            }
        });

        document.querySelectorAll('[data-lang-aria]').forEach(el => {
            const key = el.dataset.langAria;
            if (texts[key]) {
                el.setAttribute('aria-label', texts[key]);
            }
        });

        document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
            const key = el.dataset.langPlaceholder;
            if (texts[key]) {
                el.placeholder = texts[key];
            }
        });

        document.querySelectorAll('.tooltip-box').forEach(box => {
            if (config.tooltips[box.id]) {
                box.innerHTML = config.tooltips[box.id];
            }
        });

        const gcalBtn = document.getElementById('register-google-cal-btn');
        if (gcalBtn) {
            const text = texts.calSubject;
            const details = texts.calDetails;
            const calendarWindow = getNextFridayCalendarWindow(STATE.currentRegion === 'US');
            const dates = `${calendarWindow.start}/${calendarWindow.end}`;
            const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dates}&recur=RRULE:FREQ=WEEKLY;BYDAY=FR&details=${encodeURIComponent(details)}`;
            gcalBtn.href = gcalUrl;
        }
    },

    // 結果要素に残った前回計算の共有用データを破棄
    clearResultData(targetElement) {
        if (!targetElement) return;
        for (const key of Object.keys(targetElement.dataset)) {
            delete targetElement.dataset[key];
        }
    },

    // 通常計算の補足情報を、共有ボタンより後ろの折りたたみ領域へ表示する
    displayResultDetails(content) {
        const targetElement = STATE.dom.resultDetails;
        if (!targetElement) return;

        targetElement.innerHTML = content || '';
        setElementVisibility(targetElement, Boolean(content));

        if (!content) return;
        const config = CONFIGS[STATE.currentRegion];
        targetElement.querySelectorAll('.count-target').forEach(element => {
            const endValue = parseFloat(element.dataset.value);
            if (!Number.isNaN(endValue)) {
                this.animateValue(element, 0, endValue, 800, config.lang);
            }
        });
    },

    clearResultDetails() {
        const targetElement = STATE.dom.resultDetails;
        if (!targetElement) return;
        targetElement.innerHTML = '';
        setElementVisibility(targetElement, false);
    },

    // 結果表示メソッド（カウントアップアニメーション発火）
    displayResult(targetElement, content, isError = false) {
        if (!targetElement) return;
        this.clearResultData(targetElement);
        if (isError) {
            // エラーは安全にDOM要素で生成（innerHTML 不使用）
            targetElement.innerHTML = '';
            const span = document.createElement('span');
            span.className = 'error-text';
            span.textContent = content;
            targetElement.appendChild(span);
            if (targetElement === STATE.dom.result) this.clearResultDetails();
        } else {
            targetElement.innerHTML = content;
        }
        targetElement.classList.add(CONSTANTS.CLASS_HAS_RESULT);
        
        // 正常な計算結果表示時のアニメーション処理
        if (!isError) {
            const targets = targetElement.querySelectorAll('.count-target');
            const config = CONFIGS[STATE.currentRegion];
            targets.forEach(el => {
                const endValue = parseFloat(el.dataset.value);
                if (!isNaN(endValue)) {
                    this.animateValue(el, 0, endValue, 800, config.lang);
                }
            });
        }

        setResultActionsVisibility(targetElement, !isError);
    },

    // 結果のクリアメソッド
    clearResult(targetElement) {
        if (!targetElement) return;
        this.clearResultData(targetElement);
        targetElement.innerHTML = "";
        targetElement.classList.remove(CONSTANTS.CLASS_HAS_RESULT);
        if (targetElement === STATE.dom.result) this.clearResultDetails();
        setResultActionsVisibility(targetElement, false);
    },

    // モード（タブ）の切替メソッド
    switchMode(mode) {
        setPanelVisibility(STATE.dom.mainMode, mode === CONSTANTS.MODE_MAIN);
        setPanelVisibility(STATE.dom.reverseMode, mode === CONSTANTS.MODE_REVERSE);
        setPanelVisibility(STATE.dom.diaryMode, mode === CONSTANTS.MODE_DIARY);
        document.querySelectorAll(".tab-switch button").forEach(button => {
            const isActive = button.dataset.mode === mode;
            button.classList.toggle(CONSTANTS.CLASS_ACTIVE, isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.tabIndex = isActive ? 0 : -1;
        });
        if (STATE.dom.result) this.clearResult(STATE.dom.result);
        if (STATE.dom.reverseResult) this.clearResult(STATE.dom.reverseResult);
    },

    // ツールチップを閉じるメソッド
    closeAllTooltips() {
        document.querySelectorAll(`${CONSTANTS.SELECTOR_TOOLTIP_BOX}.${CONSTANTS.CLASS_VISIBLE}`).forEach(box => {
            box.classList.remove(CONSTANTS.CLASS_VISIBLE);
            box.hidden = true;
            const btn = box.parentElement.querySelector(CONSTANTS.SELECTOR_INFO_BTN);
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    },

    // ツールチップのトグルメソッド
    toggleTooltip(event) {
        event.preventDefault();
        event.stopPropagation();
        const btn = event.currentTarget;
        const tooltip = btn.parentElement.querySelector(CONSTANTS.SELECTOR_TOOLTIP_BOX);
        if (!tooltip) return;
        const isVisible = tooltip.classList.contains(CONSTANTS.CLASS_VISIBLE);
        this.closeAllTooltips();
        if (!isVisible) {
            tooltip.hidden = false;
            tooltip.classList.add(CONSTANTS.CLASS_VISIBLE);
            btn.setAttribute('aria-expanded', 'true');
        }
    }
};

// グローバルエラーハンドラ
window.onerror = function(message, source, lineno, colno, error) {
    console.error("予期せぬエラーが発生しました:", { message, source, lineno, colno, error });
    if (UI && typeof UI.showToast === 'function') {
        UI.showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", 'error');
    }
    return true; 
};

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.UI = UI;
}
