'use strict';

import { STATE, CONSTANTS } from './config.js';
import {
    isHongKongPath,
    isIndiaPath,
    isUnitedStatesPath,
    isTaiwanRegionPath,
    isKoreanPath,
    switchRegion
} from './region-navigation.js';

const FIRST_VIEW_STYLE_ID = 'playpoint-first-view-style';
const ADVANCED_SETTINGS_ID = 'calculator-advanced-settings';
const ADVANCED_BODY_ID = 'calculator-advanced-settings-body';
const MOBILE_QUERY = '(max-width: 640px)';

const FIRST_VIEW_COPY = Object.freeze({
    ja: {
        advanced: '獲得率・キャンペーンを調整（任意）',
        recommendation: 'ブラウザの言語設定からおすすめ'
    },
    en: {
        advanced: 'Adjust earn rates & promotion (optional)',
        recommendation: 'Suggested from your browser locale'
    },
    ko: {
        advanced: '적립률·프로모션 조정 (선택)',
        recommendation: '브라우저 언어 설정 기준 추천'
    },
    tw: {
        advanced: '調整獲點率與活動（選填）',
        recommendation: '依瀏覽器語言設定推薦'
    },
    hk: {
        advanced: '調整獲點率與活動（選填）',
        recommendation: '依瀏覽器語言設定推薦'
    }
});

function getLocaleKey() {
    const lang = (document.documentElement?.lang || 'ja').toLowerCase();
    if (lang === 'zh-hk' || lang.startsWith('zh-hant-hk')) return 'hk';
    if (lang.startsWith('zh')) return 'tw';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('en')) return 'en';
    return 'ja';
}

function getFirstViewCopy() {
    return FIRST_VIEW_COPY[getLocaleKey()] || FIRST_VIEW_COPY.ja;
}

function installFirstViewStyles() {
    if (document.getElementById(FIRST_VIEW_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = FIRST_VIEW_STYLE_ID;
    style.textContent = `
.calculator-advanced-settings,
.calculator-advanced-settings__body {
  display: contents;
}
.calculator-advanced-settings__toggle {
  display: none;
}
.region-switch [data-region-recommended="true"] {
  outline: 2px solid var(--input-focus-border-color, #005fcc);
  outline-offset: 2px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--section-bg-color, #fff) 80%, transparent);
}
@media (max-width: 640px) {
  .calculator-advanced-settings {
    display: block;
    margin-top: 0.85em;
  }
  .calculator-advanced-settings__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75em;
    width: 100%;
    min-height: 46px;
    margin: 0;
    padding: 0.65em 0.8em;
    box-sizing: border-box;
    border: 1px solid rgba(11, 87, 208, 0.22);
    border-radius: 8px;
    background: rgba(11, 87, 208, 0.055);
    color: var(--text-color, #1f2937);
    box-shadow: none;
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .calculator-advanced-settings__toggle:hover {
    background: rgba(11, 87, 208, 0.1);
    box-shadow: none;
    transform: none;
  }
  .calculator-advanced-settings__toggle:focus-visible {
    outline: 3px solid var(--input-focus-border-color, #005fcc);
    outline-offset: 2px;
  }
  .calculator-advanced-settings__chevron {
    flex: 0 0 auto;
    font-size: 0.9em;
    transition: transform 0.18s ease;
  }
  .calculator-advanced-settings.is-open .calculator-advanced-settings__chevron {
    transform: rotate(180deg);
  }
  .calculator-advanced-settings__body {
    display: block;
    margin-top: 0.7em;
  }
  .calculator-advanced-settings:not(.is-open) .calculator-advanced-settings__body {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    margin: -1px !important;
    padding: 0 !important;
    overflow: hidden !important;
    clip: rect(0 0 0 0) !important;
    clip-path: inset(50%) !important;
    white-space: nowrap !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .calculator-advanced-settings__chevron {
    transition: none;
  }
}`;
    document.head.appendChild(style);
}

export function shouldAutoOpenAdvancedSettings(search = '') {
    const params = new URLSearchParams(search || '');
    if (params.get('mode') !== 'main') return false;
    const multiplier = Number(params.get('multiplier'));
    return Number.isFinite(multiplier) && multiplier > 1;
}

function setAdvancedSettingsAccessibility(container, body, toggle, mediaQuery) {
    const mobile = Boolean(mediaQuery?.matches);
    const expanded = container.classList.contains('is-open');
    const collapsedForUser = mobile && !expanded;

    toggle.setAttribute('aria-expanded', String(expanded));
    body.setAttribute('aria-hidden', String(collapsedForUser));
    if ('inert' in body) body.inert = collapsedForUser;
}

export function enhanceCalculatorAdvancedSettings() {
    const mainMode = document.getElementById('mainMode');
    if (!mainMode) return null;

    const existing = document.getElementById(ADVANCED_SETTINGS_ID);
    if (existing) return existing;

    const neededPoints = document.getElementById('neededPoints');
    const baseRateLabel = mainMode.querySelector('label[for="baseRate"]');
    const baseRate = document.getElementById('baseRate');
    const multiplierLabel = mainMode.querySelector('label[for="multiplier"]');
    const multiplier = document.getElementById('multiplier');
    const warning = mainMode.querySelector('[data-lang-key="warningRate"]');
    const section = neededPoints?.closest('.section');

    if (!neededPoints || !baseRateLabel || !baseRate || !multiplierLabel || !multiplier || !warning || !section) {
        return null;
    }

    installFirstViewStyles();

    const copy = getFirstViewCopy();
    const container = document.createElement('div');
    container.id = ADVANCED_SETTINGS_ID;
    container.className = 'calculator-advanced-settings';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'calculator-advanced-settings__toggle';
    toggle.setAttribute('aria-controls', ADVANCED_BODY_ID);
    toggle.innerHTML = `<span>${copy.advanced}</span><span class="calculator-advanced-settings__chevron" aria-hidden="true">⌄</span>`;

    const body = document.createElement('div');
    body.id = ADVANCED_BODY_ID;
    body.className = 'calculator-advanced-settings__body';
    body.setAttribute('role', 'group');
    body.setAttribute('aria-label', copy.advanced);

    neededPoints.insertAdjacentElement('afterend', container);
    container.append(toggle, body);
    body.append(baseRateLabel, baseRate, multiplierLabel, multiplier, warning);

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null;
    if (shouldAutoOpenAdvancedSettings(window.location.search)) {
        container.classList.add('is-open');
    }

    const sync = () => setAdvancedSettingsAccessibility(container, body, toggle, mediaQuery);
    toggle.addEventListener('click', () => {
        container.classList.toggle('is-open');
        sync();
    });
    mediaQuery?.addEventListener?.('change', sync);
    sync();

    return container;
}

function hideLegacyLanguageBanner() {
    if (STATE.dom.languageSuggestionBanner) {
        STATE.dom.languageSuggestionBanner.classList.add(CONSTANTS.CLASS_HIDDEN);
    }
}

function restoreRecommendationA11y(element) {
    if (!element) return;
    if (Object.prototype.hasOwnProperty.call(element.dataset, 'recommendationOriginalAria')) {
        const value = element.dataset.recommendationOriginalAria;
        if (value) element.setAttribute('aria-label', value);
        else element.removeAttribute('aria-label');
        delete element.dataset.recommendationOriginalAria;
    }
    if (Object.prototype.hasOwnProperty.call(element.dataset, 'recommendationOriginalTitle')) {
        const value = element.dataset.recommendationOriginalTitle;
        if (value) element.title = value;
        else element.removeAttribute('title');
        delete element.dataset.recommendationOriginalTitle;
    }
    delete element.dataset.regionRecommended;
}

function clearRegionRecommendation() {
    document.querySelectorAll('.region-switch [data-region-recommended="true"]').forEach(restoreRecommendationA11y);
}

function appendRecommendationA11y(element, message) {
    if (!element) return;
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'recommendationOriginalAria')) {
        element.dataset.recommendationOriginalAria = element.getAttribute('aria-label') || '';
    }
    if (!Object.prototype.hasOwnProperty.call(element.dataset, 'recommendationOriginalTitle')) {
        element.dataset.recommendationOriginalTitle = element.getAttribute('title') || '';
    }
    const baseAria = element.dataset.recommendationOriginalAria;
    const baseTitle = element.dataset.recommendationOriginalTitle;
    element.setAttribute('aria-label', [baseAria, message].filter(Boolean).join(' — '));
    element.title = [baseTitle, message].filter(Boolean).join(' — ');
    element.dataset.regionRecommended = 'true';
}

function markRegionRecommended(region, message) {
    clearRegionRecommendation();

    const primary = document.querySelector(`.region-switch > button[data-region="${region}"]`);
    const expandedOption = document.querySelector(`.region-more-option[data-region="${region}"]`);
    const expandedToggle = document.querySelector('.region-more-toggle');

    if (primary) {
        appendRecommendationA11y(primary, message);
        return;
    }

    if (expandedOption && expandedToggle) {
        appendRecommendationA11y(expandedToggle, message);
        appendRecommendationA11y(expandedOption, message);
    }
}

export function getSuggestedRegionForBrowserLanguage(browserLanguage = '') {
    const browserLang = String(browserLanguage || '').toLowerCase();
    const recommendation = getFirstViewCopy().recommendation;

    if (browserLang.startsWith('zh-hk')) return { region: 'HK', recommendation };
    if (browserLang.startsWith('en-in')) return { region: 'IN', recommendation };
    if (browserLang.startsWith('ko-kr')) return { region: 'KR', recommendation };
    if (browserLang.startsWith('ko')) return null;
    if (browserLang.startsWith('zh-tw')) return { region: 'TW', recommendation };
    if (browserLang.startsWith('zh')) return null;
    if (browserLang.startsWith('en-us')) return { region: 'US', recommendation };
    if (browserLang.startsWith('en')) return null;
    return null;
}

function isCurrentRegionMatch(region) {
    if (region === 'HK') return isHongKongPath();
    if (region === 'IN') return isIndiaPath();
    if (region === 'KR') return isKoreanPath();
    if (region === 'TW') return isTaiwanRegionPath();
    if (region === 'US') return isUnitedStatesPath();
    return false;
}

export function bindLanguageSuggestionDismiss() {
    if (!STATE.dom.closeLangBannerBtn) return;

    STATE.dom.closeLangBannerBtn.addEventListener('click', () => {
        hideLegacyLanguageBanner();
        clearRegionRecommendation();
        try {
            sessionStorage.setItem('playpointLangBannerClosed', 'true');
        } catch (e) {
            console.error('セッションストレージの書き込みに失敗しました:', e);
        }
    });
}

// 地域の推測は画面上部へ大きなバナーを差し込まず、既存の地域選択肢を控えめに強調する。
// ブラウザ言語は実際のPlay国を断定しないため、言語だけのko/zh/enでは推薦しない。
export function checkLanguageSuggestion() {
    hideLegacyLanguageBanner();
    clearRegionRecommendation();

    let isClosed = false;
    try {
        isClosed = sessionStorage.getItem('playpointLangBannerClosed') === 'true';
    } catch (e) {
        console.error('セッションストレージの読み込みに失敗しました:', e);
    }
    if (isClosed) return;

    let preferredRegion = null;
    try {
        preferredRegion = localStorage.getItem(CONSTANTS.STORAGE_REGION_KEY);
    } catch (e) {
        console.error('ローカルストレージの読み込みに失敗しました:', e);
    }
    if (preferredRegion) return;

    const suggestion = getSuggestedRegionForBrowserLanguage(navigator.language || navigator.userLanguage || '');
    if (!suggestion || isCurrentRegionMatch(suggestion.region)) return;

    markRegionRecommended(suggestion.region, suggestion.recommendation);
}

export function switchToSuggestedRegion(region) {
    if (!region) return;
    switchRegion(region);
}

function prepareFirstView() {
    installFirstViewStyles();
    enhanceCalculatorAdvancedSettings();
}

if (typeof document !== 'undefined') {
    if (document.getElementById('mainMode')) {
        prepareFirstView();
    } else {
        document.addEventListener('DOMContentLoaded', prepareFirstView, { once: true });
    }
}
