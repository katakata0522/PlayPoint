'use strict';

import { STATE, CONSTANTS } from './config.js';
import {
    isEnglishPath,
    isKoreanPath,
    isTaiwanPath,
    switchRegion
} from './region-navigation.js';

export function bindLanguageSuggestionDismiss() {
    if (!STATE.dom.closeLangBannerBtn) return;

    STATE.dom.closeLangBannerBtn.addEventListener('click', () => {
        if (STATE.dom.languageSuggestionBanner) {
            STATE.dom.languageSuggestionBanner.classList.add(CONSTANTS.CLASS_HIDDEN);
        }
        try {
            sessionStorage.setItem('playpointLangBannerClosed', 'true');
        } catch (e) {
            console.error("セッションストレージの書き込みに失敗しました:", e);
        }
    });
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