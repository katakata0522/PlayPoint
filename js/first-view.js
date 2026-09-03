'use strict';

import { STATE, CONSTANTS } from './config.js';

const SETTINGS_ID = 'calculator-advanced-settings';
const SETTINGS_BODY_ID = 'calculator-advanced-settings-body';
const MOBILE_QUERY = '(max-width: 640px)';

const RECOMMENDATION_COPY = Object.freeze({
    ja: 'ブラウザの言語設定からおすすめ',
    en: 'Suggested from your browser locale',
    ko: '브라우저 언어 설정 기준 추천',
    tw: '依瀏覽器語言設定推薦',
    hk: '依瀏覽器語言設定推薦'
});

function localeKey() {
    const lang = (document.documentElement?.lang || 'ja').toLowerCase();
    if (lang === 'zh-hk' || lang.startsWith('zh-hant-hk')) return 'hk';
    if (lang.startsWith('zh')) return 'tw';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    return 'ja';
}

export function shouldAutoOpenAdvancedSettings(search = '') {
    const params = new URLSearchParams(search || '');
    if (params.get('mode') !== 'main') return false;
    const multiplier = Number(params.get('multiplier'));
    return Number.isFinite(multiplier) && multiplier > 1;
}

function syncSettingsState(container, body, toggle, mediaQuery) {
    const expanded = container.classList.contains('is-open');
    const collapsed = Boolean(mediaQuery?.matches) && !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    body.setAttribute('aria-hidden', String(collapsed));
    if ('inert' in body) body.inert = collapsed;
}

export function enhanceCalculatorAdvancedSettings() {
    const container = document.getElementById(SETTINGS_ID);
    const body = document.getElementById(SETTINGS_BODY_ID);
    const toggle = container?.querySelector('.calculator-advanced-settings__toggle');
    if (!container || !body || !toggle) return null;
    if (container.dataset.playpointBound === 'true') return container;

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    const bootstrappedOpen = document.documentElement?.dataset?.playpointAdvancedSettings === 'open';
    if (bootstrappedOpen || shouldAutoOpenAdvancedSettings(window.location.search)) {
        container.classList.add('is-open');
    }
    if (document.documentElement?.dataset?.playpointAdvancedSettings) {
        delete document.documentElement.dataset.playpointAdvancedSettings;
    }

    const sync = () => syncSettingsState(container, body, toggle, mediaQuery);
    toggle.addEventListener('click', () => {
        container.classList.toggle('is-open');
        sync();
    });
    mediaQuery?.addEventListener?.('change', sync);
    container.dataset.playpointBound = 'true';
    sync();
    return container;
}

function hideLegacyBanner() {
    STATE.dom.languageSuggestionBanner?.classList.add(CONSTANTS.CLASS_HIDDEN);
}

function clearRegionRecommendation() {
    document.querySelectorAll('.region-switch [data-region-recommended="true"]').forEach((element) => {
        delete element.dataset.regionRecommended;
        element.removeAttribute('aria-description');
    });
}

function markRegionRecommended(region, description) {
    clearRegionRecommendation();
    const primary = document.querySelector(`.region-switch > button[data-region="${region}"]`);
    const expandedOption = document.querySelector(`.region-more-option[data-region="${region}"]`);
    const expandedToggle = document.querySelector('.region-more-toggle');
    for (const element of primary ? [primary] : [expandedToggle, expandedOption]) {
        if (!element) continue;
        element.dataset.regionRecommended = 'true';
        element.setAttribute('aria-description', description);
    }
}

export function getSuggestedRegionForBrowserLanguage(browserLanguage = '') {
    const browserLang = String(browserLanguage || '').toLowerCase();
    if (browserLang.startsWith('zh-hk')) return 'HK';
    if (browserLang.startsWith('en-in')) return 'IN';
    if (browserLang.startsWith('ko-kr')) return 'KR';
    if (browserLang.startsWith('ko')) return null;
    if (browserLang.startsWith('zh-tw')) return 'TW';
    if (browserLang.startsWith('zh')) return null;
    if (browserLang.startsWith('en-us')) return 'US';
    if (browserLang.startsWith('en')) return null;
    return null;
}

export function bindLanguageSuggestionDismiss() {
    STATE.dom.closeLangBannerBtn?.addEventListener('click', () => {
        hideLegacyBanner();
        clearRegionRecommendation();
        try {
            sessionStorage.setItem('playpointLangBannerClosed', 'true');
        } catch (error) {
            console.error('セッションストレージの書き込みに失敗しました:', error);
        }
    });
}

// Play国を断定せず、国まで明示されたブラウザロケールだけを既存の地域選択肢で推薦する。
export function checkLanguageSuggestion() {
    hideLegacyBanner();
    clearRegionRecommendation();
    try {
        if (sessionStorage.getItem('playpointLangBannerClosed') === 'true') return;
        if (localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY)) return;
    } catch (error) {
        console.error('地域推薦設定の読み込みに失敗しました:', error);
    }

    const region = getSuggestedRegionForBrowserLanguage(navigator.language || navigator.userLanguage || '');
    if (!region || STATE.currentRegion === region) return;
    const key = localeKey();
    markRegionRecommended(region, RECOMMENDATION_COPY[key] || RECOMMENDATION_COPY.ja);
}

function prepareFirstView() {
    enhanceCalculatorAdvancedSettings();
}

if (typeof document !== 'undefined') {
    if (document.getElementById('mainMode')) prepareFirstView();
    else document.addEventListener('DOMContentLoaded', prepareFirstView, { once: true });
}
