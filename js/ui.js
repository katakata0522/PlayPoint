'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';

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

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (!texts[key]) return;

            if (el.tagName === 'A' && typeof texts[key] === 'object' && texts[key].text) {
                el.textContent = texts[key].text;
                if (texts[key].href) {
                    const isSubDir = ['/en/', '/ko/', '/tw/'].some(p => window.location.pathname.includes(p));
                    const prefix = isSubDir ? '../' : './';
                    const rawHref = texts[key].href;
                    const isExternal = rawHref.startsWith('http') || rawHref.startsWith('//');
                    el.href = isExternal ? rawHref : (prefix + rawHref.replace(/^\.\//, ''));
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
            const isGlobalTime = STATE.currentRegion === 'US';
            const dates = isGlobalTime ? '20260626T140000Z/20260626T150000Z' : '20260626T010000Z/20260626T020000Z';
            const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dates}&recur=RRULE:FREQ=WEEKLY;BYDAY=FR&details=${encodeURIComponent(details)}`;
            gcalBtn.href = gcalUrl;
        }
    },

    // 結果表示メソッド（カウントアップアニメーション発火）
    displayResult(targetElement, content, isError = false) {
        if (!targetElement) return;
        targetElement.innerHTML = isError ? `<span class="error-text">${content}</span>` : content;
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

        const showShareButtons = !isError;

        if (targetElement === STATE.dom.result) {
            if (STATE.dom.tweetButton) STATE.dom.tweetButton.classList.toggle(CONSTANTS.CLASS_HIDDEN, !showShareButtons);
            if (STATE.dom.copyButton) STATE.dom.copyButton.classList.toggle(CONSTANTS.CLASS_HIDDEN, !showShareButtons);
        } else if (targetElement === STATE.dom.reverseResult) {
            if (STATE.dom.shareTwitterReverse) STATE.dom.shareTwitterReverse.classList.toggle(CONSTANTS.CLASS_HIDDEN, !showShareButtons);
        }
    },

    // 結果のクリアメソッド
    clearResult(targetElement) {
        if (!targetElement) return;
        targetElement.innerHTML = "";
        targetElement.classList.remove(CONSTANTS.CLASS_HAS_RESULT);
        if (targetElement === STATE.dom.result) {
            if (STATE.dom.tweetButton) STATE.dom.tweetButton.classList.add(CONSTANTS.CLASS_HIDDEN);
            if (STATE.dom.copyButton) STATE.dom.copyButton.classList.add(CONSTANTS.CLASS_HIDDEN);
        } else if (targetElement === STATE.dom.reverseResult) {
            if (STATE.dom.shareTwitterReverse) STATE.dom.shareTwitterReverse.classList.add(CONSTANTS.CLASS_HIDDEN);
        }
    },

    // モード（タブ）の切替メソッド
    switchMode(mode) {
        STATE.dom.mainMode.classList.toggle(CONSTANTS.CLASS_HIDDEN, mode !== CONSTANTS.MODE_MAIN);
        STATE.dom.reverseMode.classList.toggle(CONSTANTS.CLASS_HIDDEN, mode !== CONSTANTS.MODE_REVERSE);
        if (STATE.dom.diaryMode) STATE.dom.diaryMode.classList.toggle(CONSTANTS.CLASS_HIDDEN, mode !== CONSTANTS.MODE_DIARY);
        document.querySelectorAll(".tab-switch button").forEach(button => {
            const isActive = button.dataset.mode === mode;
            button.classList.toggle(CONSTANTS.CLASS_ACTIVE, isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        if (STATE.dom.result) this.clearResult(STATE.dom.result);
        if (STATE.dom.reverseResult) this.clearResult(STATE.dom.reverseResult);
    },

    // ツールチップを閉じるメソッド
    closeAllTooltips() {
        document.querySelectorAll(`${CONSTANTS.SELECTOR_TOOLTIP_BOX}.${CONSTANTS.CLASS_VISIBLE}`).forEach(box => {
            box.classList.remove(CONSTANTS.CLASS_VISIBLE);
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
