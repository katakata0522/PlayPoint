'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';
import { UI } from './ui.js';

export const isEnglishPath = () => /\/en(\/|$)/.test(window.location.pathname);
export const isKoreanPath = () => /\/ko(\/|$)/.test(window.location.pathname);
export const isTaiwanPath = () => /\/tw(\/|$)/.test(window.location.pathname);

export function applyRegionFromPath() {
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
}

export function switchRegion(newRegion, updateUIForRegion = () => {}) {
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

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.REGION_NAVIGATION = {
        applyRegionFromPath,
        isEnglishPath,
        isKoreanPath,
        isTaiwanPath,
        switchRegion
    };
}