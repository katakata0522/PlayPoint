'use strict';

function showToast(message, type = 'normal') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    if (type === 'error') {
        toast.classList.add('error');
    }

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

window.onerror = function(message, source, lineno, colno, error) {
    console.error("予期せぬエラーが発生しました:", { message, source, lineno, colno, error });
    showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", 'error');
    return true; 
};

function updateUIText() {
    const config = PP_REGION_CONFIGS[PP_STATE.currentRegion];
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

    if (PP_STATE.dom.neededPoints) PP_STATE.dom.neededPoints.placeholder = texts.neededPointsPlaceholder;
    if (PP_STATE.dom.amountYen) PP_STATE.dom.amountYen.placeholder = texts.amountYenPlaceholder;

    document.querySelectorAll('.tooltip-box').forEach(box => {
        if (config.tooltips[box.id]) {
            box.innerHTML = config.tooltips[box.id];
        }
    });
}

function displayResult(targetElement, content, isError = false) {
    if (!targetElement) return;
    targetElement.innerHTML = isError ? `<span class="error-text">${content}</span>` : content;
    targetElement.classList.add(PP_CONSTANTS.CLASS_HAS_RESULT);
    const showShareButtons = !isError;

    if (targetElement === PP_STATE.dom.result) {
        if (PP_STATE.dom.tweetButton) PP_STATE.dom.tweetButton.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, !showShareButtons);
        if (PP_STATE.dom.copyButton) PP_STATE.dom.copyButton.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, !showShareButtons);
    } else if (targetElement === PP_STATE.dom.reverseResult) {
        if(PP_STATE.dom.shareTwitterReverse) PP_STATE.dom.shareTwitterReverse.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, !showShareButtons);
    }
}

function clearResult(targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = "";
    targetElement.classList.remove(PP_CONSTANTS.CLASS_HAS_RESULT);
    if (targetElement === PP_STATE.dom.result) {
        if(PP_STATE.dom.tweetButton) PP_STATE.dom.tweetButton.classList.add(PP_CONSTANTS.CLASS_HIDDEN);
        if(PP_STATE.dom.copyButton) PP_STATE.dom.copyButton.classList.add(PP_CONSTANTS.CLASS_HIDDEN);
    } else if (targetElement === PP_STATE.dom.reverseResult) {
        if(PP_STATE.dom.shareTwitterReverse) PP_STATE.dom.shareTwitterReverse.classList.add(PP_CONSTANTS.CLASS_HIDDEN);
    }
}

function switchMode(mode) {
    PP_STATE.dom.mainMode.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, mode !== PP_CONSTANTS.MODE_MAIN);
    PP_STATE.dom.reverseMode.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, mode !== PP_CONSTANTS.MODE_REVERSE);
    if (PP_STATE.dom.diaryMode) PP_STATE.dom.diaryMode.classList.toggle(PP_CONSTANTS.CLASS_HIDDEN, mode !== PP_CONSTANTS.MODE_DIARY);
    document.querySelectorAll(".tab-switch button").forEach(button => {
        button.classList.toggle(PP_CONSTANTS.CLASS_ACTIVE, button.dataset.mode === mode);
    });
    if(PP_STATE.dom.result) clearResult(PP_STATE.dom.result);
    if(PP_STATE.dom.reverseResult) clearResult(PP_STATE.dom.reverseResult);
    if (mode === PP_CONSTANTS.MODE_DIARY && typeof renderDiary === 'function') renderDiary();
}

function closeAllTooltips() {
    document.querySelectorAll(`${PP_CONSTANTS.SELECTOR_TOOLTIP_BOX}.${PP_CONSTANTS.CLASS_VISIBLE}`).forEach(box => {
        box.classList.remove(PP_CONSTANTS.CLASS_VISIBLE);
        const btn = box.parentElement.querySelector(PP_CONSTANTS.SELECTOR_INFO_BTN);
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });
}

function toggleTooltip(event) {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    const tooltip = btn.parentElement.querySelector(PP_CONSTANTS.SELECTOR_TOOLTIP_BOX);
    if (!tooltip) return;
    const isVisible = tooltip.classList.contains(PP_CONSTANTS.CLASS_VISIBLE);
    closeAllTooltips();
    if (!isVisible) {
        tooltip.classList.add(PP_CONSTANTS.CLASS_VISIBLE);
        btn.setAttribute('aria-expanded', 'true');
    }
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    let storedTheme;

    try {
        storedTheme = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (e) {
        console.error("テーマ設定の読み込みに失敗しました:", e);
        storedTheme = "light";
    }

    const updateIcon = (theme) => {
         if (themeToggle) {
             themeToggle.innerHTML = theme === 'dark' ? PP_CONSTANTS.ICON_SUN : PP_CONSTANTS.ICON_MOON;
             themeToggle.setAttribute('aria-label', theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
         }
    };

    if (storedTheme) {
        document.documentElement.setAttribute('data-theme', storedTheme);
        updateIcon(storedTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            try {
                let currentTheme = document.documentElement.getAttribute('data-theme');
                let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateIcon(newTheme);
            } catch (e) {
                console.error("テーマ設定の保存に失敗しました:", e);
                showToast("テーマ設定の保存に失敗しました。", 'error');
            }
        });
    }
}
