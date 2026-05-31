'use strict';

PP_APP.UI = {
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
        const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
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
    },

    // 結果表示メソッド（カウントアップアニメーション発火）
    displayResult(targetElement, content, isError = false) {
        if (!targetElement) return;
        targetElement.innerHTML = isError ? `<span class="error-text">${content}</span>` : content;
        targetElement.classList.add(PP_APP.CONSTANTS.CLASS_HAS_RESULT);
        
        // 正常な計算結果表示時のアニメーション処理
        if (!isError) {
            const targets = targetElement.querySelectorAll('.count-target');
            const config = PP_APP.CONFIGS[PP_APP.STATE.currentRegion];
            targets.forEach(el => {
                const endValue = parseFloat(el.dataset.value);
                if (!isNaN(endValue)) {
                    this.animateValue(el, 0, endValue, 800, config.lang);
                }
            });
        }

        const showShareButtons = !isError;

        if (targetElement === PP_APP.STATE.dom.result) {
            if (PP_APP.STATE.dom.tweetButton) PP_APP.STATE.dom.tweetButton.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, !showShareButtons);
            if (PP_APP.STATE.dom.copyButton) PP_APP.STATE.dom.copyButton.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, !showShareButtons);
        } else if (targetElement === PP_APP.STATE.dom.reverseResult) {
            if(PP_APP.STATE.dom.shareTwitterReverse) PP_APP.STATE.dom.shareTwitterReverse.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, !showShareButtons);
        }
    },

    // 結果のクリアメソッド
    clearResult(targetElement) {
        if (!targetElement) return;
        targetElement.innerHTML = "";
        targetElement.classList.remove(PP_APP.CONSTANTS.CLASS_HAS_RESULT);
        if (targetElement === PP_APP.STATE.dom.result) {
            if(PP_APP.STATE.dom.tweetButton) PP_APP.STATE.dom.tweetButton.classList.add(PP_APP.CONSTANTS.CLASS_HIDDEN);
            if(PP_APP.STATE.dom.copyButton) PP_APP.STATE.dom.copyButton.classList.add(PP_APP.CONSTANTS.CLASS_HIDDEN);
        } else if (targetElement === PP_APP.STATE.dom.reverseResult) {
            if(PP_APP.STATE.dom.shareTwitterReverse) PP_APP.STATE.dom.shareTwitterReverse.classList.add(PP_APP.CONSTANTS.CLASS_HIDDEN);
        }
    },

    // モード（タブ）の切替メソッド
    switchMode(mode) {
        PP_APP.STATE.dom.mainMode.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, mode !== PP_APP.CONSTANTS.MODE_MAIN);
        PP_APP.STATE.dom.reverseMode.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, mode !== PP_APP.CONSTANTS.MODE_REVERSE);
        if (PP_APP.STATE.dom.diaryMode) PP_APP.STATE.dom.diaryMode.classList.toggle(PP_APP.CONSTANTS.CLASS_HIDDEN, mode !== PP_APP.CONSTANTS.MODE_DIARY);
        document.querySelectorAll(".tab-switch button").forEach(button => {
            button.classList.toggle(PP_APP.CONSTANTS.CLASS_ACTIVE, button.dataset.mode === mode);
        });
        if(PP_APP.STATE.dom.result) this.clearResult(PP_APP.STATE.dom.result);
        if(PP_APP.STATE.dom.reverseResult) this.clearResult(PP_APP.STATE.dom.reverseResult);
        if (mode === PP_APP.CONSTANTS.MODE_DIARY && typeof PP_APP.DIARY.renderDiary === 'function') PP_APP.DIARY.renderDiary();
    },

    // ツールチップを閉じるメソッド
    closeAllTooltips() {
        document.querySelectorAll(`${PP_APP.CONSTANTS.SELECTOR_TOOLTIP_BOX}.${PP_APP.CONSTANTS.CLASS_VISIBLE}`).forEach(box => {
            box.classList.remove(PP_APP.CONSTANTS.CLASS_VISIBLE);
            const btn = box.parentElement.querySelector(PP_APP.CONSTANTS.SELECTOR_INFO_BTN);
            if (btn) btn.setAttribute('aria-expanded', 'false');
        });
    },

    // ツールチップのトグルメソッド
    toggleTooltip(event) {
        event.preventDefault();
        event.stopPropagation();
        const btn = event.currentTarget;
        const tooltip = btn.parentElement.querySelector(PP_APP.CONSTANTS.SELECTOR_TOOLTIP_BOX);
        if (!tooltip) return;
        const isVisible = tooltip.classList.contains(PP_APP.CONSTANTS.CLASS_VISIBLE);
        PP_APP.UI.closeAllTooltips();
        if (!isVisible) {
            tooltip.classList.add(PP_APP.CONSTANTS.CLASS_VISIBLE);
            btn.setAttribute('aria-expanded', 'true');
        }
    }
};

// グローバルエラーハンドラ
window.onerror = function(message, source, lineno, colno, error) {
    console.error("予期せぬエラーが発生しました:", { message, source, lineno, colno, error });
    if (PP_APP.UI && typeof PP_APP.UI.showToast === 'function') {
        PP_APP.UI.showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", 'error');
    }
    return true; 
};
