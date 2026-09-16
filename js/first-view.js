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

const LAST_MAIN_CALCULATION_KEY = 'playpointLastMainCalculationV1';

function normalizeLastCalculation(value) {
    const points = Number(value?.neededPoints);
    if (!value || typeof value.region !== 'string'
        || typeof value.currentStatus !== 'string'
        || typeof value.targetStatus !== 'string'
        || !Number.isSafeInteger(points) || points < 0) return null;
    return { region: value.region, currentStatus: value.currentStatus, targetStatus: value.targetStatus, neededPoints: String(points) };
}

function readLastMainCalculationStore(storage = localStorage) {
    try {
        const parsed = JSON.parse(storage.getItem(LAST_MAIN_CALCULATION_KEY) || 'null');
        if (parsed?.version === 1 && parsed.mainByRegion && typeof parsed.mainByRegion === 'object') return parsed;
    } catch {}
    return { version: 1, mainByRegion: {} };
}

export function getLastMainCalculationForRegion(region, storage = localStorage) {
    const snapshot = normalizeLastCalculation(readLastMainCalculationStore(storage).mainByRegion?.[region]);
    return snapshot?.region === region ? snapshot : null;
}

export function saveLastMainCalculationForRegion(region, snapshot, storage = localStorage) {
    const normalized = normalizeLastCalculation(snapshot);
    if (!normalized || normalized.region !== region) return false;
    try {
        const store = readLastMainCalculationStore(storage);
        store.mainByRegion[region] = normalized;
        storage.setItem(LAST_MAIN_CALCULATION_KEY, JSON.stringify(store));
        return true;
    } catch {
        return false;
    }
}

export function sameCalculationContext(left, right) {
    return Boolean(left && right
        && left.region === right.region
        && left.currentStatus === right.currentStatus
        && left.targetStatus === right.targetStatus);
}

function formatPoints(value, region) {
    const locale = region === 'JP' ? 'ja-JP' : region === 'KR' ? 'ko-KR' : region === 'TW' ? 'zh-TW' : region === 'HK' ? 'zh-HK' : 'en';
    return Number(value).toLocaleString(locale);
}

export function formatLastCalculationText(region, current, previous = null) {
    const now = formatPoints(current?.neededPoints, region);
    if (previous && sameCalculationContext(previous, current)) {
        const beforeValue = Number(previous.neededPoints);
        const delta = beforeValue - Number(current.neededPoints);
        const before = formatPoints(beforeValue, region);
        const difference = formatPoints(Math.abs(delta), region);
        if (region === 'JP') return delta > 0 ? `前回 ${before}pt → 今回 ${now}pt（${difference}pt減）` : delta < 0 ? `前回 ${before}pt → 今回 ${now}pt（${difference}pt増）` : `前回と同じ：${now}pt`;
        if (region === 'KR') return delta > 0 ? `지난번 ${before}pt → 이번 ${now}pt (${difference}pt 감소)` : delta < 0 ? `지난번 ${before}pt → 이번 ${now}pt (${difference}pt 증가)` : `지난번과 동일: ${now}pt`;
        if (region === 'TW' || region === 'HK') {
            const currentLabel = region === 'HK' ? '今次' : '這次';
            return delta > 0 ? `上次 ${before}點 → ${currentLabel} ${now}點（減少 ${difference}點）` : delta < 0 ? `上次 ${before}點 → ${currentLabel} ${now}點（增加 ${difference}點）` : `和上次相同：${now}點`;
        }
        return delta > 0 ? `Last ${before} → now ${now} pts (${difference} fewer)` : delta < 0 ? `Last ${before} → now ${now} pts (${difference} more)` : `Same as last time: ${now} pts`;
    }
    if (region === 'JP') return `前回：${now}pt`;
    if (region === 'KR') return `지난번: ${now}pt`;
    if (region === 'TW' || region === 'HK') return `上次：${now}點`;
    return `Last time: ${now} pts`;
}

function prepareFirstView() {
    enhanceCalculatorAdvancedSettings();
}

if (typeof document !== 'undefined') {
    if (document.getElementById('mainMode')) prepareFirstView();
    else document.addEventListener('DOMContentLoaded', prepareFirstView, { once: true });
}
