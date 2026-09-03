'use strict';

import { STATE, CONSTANTS } from './config.js';

const STYLE_ID = 'playpoint-first-view-style';
const SETTINGS_ID = 'calculator-advanced-settings';
const SETTINGS_BODY_ID = 'calculator-advanced-settings-body';
const MOBILE_QUERY = '(max-width: 640px)';

const ADVANCED_COPY = Object.freeze({
    ja: '獲得率・キャンペーンを調整（任意）',
    en: 'Adjust earn rates & promotion (optional)',
    ko: '적립률·프로모션 조정 (선택)',
    tw: '調整獲點率與活動（選填）',
    hk: '調整獲點率與活動（選填）'
});

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

function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}
.calculator-advanced-settings__toggle{display:none}
.region-switch [data-region-recommended="true"]{outline:2px solid var(--input-focus-border-color,#005fcc);outline-offset:2px;box-shadow:0 0 0 1px color-mix(in srgb,var(--section-bg-color,#fff) 80%,transparent)}
@media(max-width:640px){
.calculator-advanced-settings{display:block;margin-top:.85em}
.calculator-advanced-settings__toggle{display:flex;align-items:center;justify-content:space-between;gap:.75em;width:100%;min-height:46px;margin:0;padding:.65em .8em;box-sizing:border-box;border:1px solid rgba(11,87,208,.22);border-radius:8px;background:rgba(11,87,208,.055);color:var(--text-color,#1f2937);box-shadow:none;font:inherit;font-weight:700;text-align:left;cursor:pointer}
.calculator-advanced-settings__toggle:hover{background:rgba(11,87,208,.1);box-shadow:none;transform:none}
.calculator-advanced-settings__toggle:focus-visible{outline:3px solid var(--input-focus-border-color,#005fcc);outline-offset:2px}
.calculator-advanced-settings__chevron{flex:0 0 auto;font-size:.9em;transition:transform .18s ease}
.calculator-advanced-settings.is-open .calculator-advanced-settings__chevron{transform:rotate(180deg)}
.calculator-advanced-settings__body{display:block;margin-top:.7em}
.calculator-advanced-settings:not(.is-open) .calculator-advanced-settings__body{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}}
@media(prefers-reduced-motion:reduce){.calculator-advanced-settings__chevron{transition:none}}`;
    document.head.appendChild(style);
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
    const mainMode = document.getElementById('mainMode');
    const existing = document.getElementById(SETTINGS_ID);
    if (!mainMode || existing) return existing;

    const neededPoints = document.getElementById('neededPoints');
    const baseRateLabel = mainMode.querySelector('label[for="baseRate"]');
    const baseRate = document.getElementById('baseRate');
    const multiplierLabel = mainMode.querySelector('label[for="multiplier"]');
    const multiplier = document.getElementById('multiplier');
    const warning = mainMode.querySelector('[data-lang-key="warningRate"]');
    if (![neededPoints, baseRateLabel, baseRate, multiplierLabel, multiplier, warning].every(Boolean)) return null;

    installStyles();
    const copy = ADVANCED_COPY[localeKey()] || ADVANCED_COPY.ja;
    const container = document.createElement('div');
    const toggle = document.createElement('button');
    const body = document.createElement('div');

    container.id = SETTINGS_ID;
    container.className = 'calculator-advanced-settings';
    toggle.type = 'button';
    toggle.className = 'calculator-advanced-settings__toggle';
    toggle.setAttribute('aria-controls', SETTINGS_BODY_ID);
    toggle.innerHTML = `<span>${copy}</span><span class="calculator-advanced-settings__chevron" aria-hidden="true">⌄</span>`;
    body.id = SETTINGS_BODY_ID;
    body.className = 'calculator-advanced-settings__body';
    body.setAttribute('role', 'group');
    body.setAttribute('aria-label', copy);

    neededPoints.insertAdjacentElement('afterend', container);
    container.append(toggle, body);
    body.append(baseRateLabel, baseRate, multiplierLabel, multiplier, warning);

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    if (shouldAutoOpenAdvancedSettings(window.location.search)) container.classList.add('is-open');
    const sync = () => syncSettingsState(container, body, toggle, mediaQuery);
    toggle.addEventListener('click', () => {
        container.classList.toggle('is-open');
        sync();
    });
    mediaQuery?.addEventListener?.('change', sync);
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
    installStyles();
    enhanceCalculatorAdvancedSettings();
}

if (typeof document !== 'undefined') {
    if (document.getElementById('mainMode')) prepareFirstView();
    else document.addEventListener('DOMContentLoaded', prepareFirstView, { once: true });
}
