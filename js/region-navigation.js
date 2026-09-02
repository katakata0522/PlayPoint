'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';
import { UI } from './ui.js';
import { createExpansionConfigs } from './region-expansion-config.js';

Object.assign(CONFIGS, createExpansionConfigs(CONFIGS));

const REGION_PATHS = Object.freeze({
    JP: '',
    US: 'en/',
    KR: 'ko/',
    TW: 'tw/',
    HK: 'hk/',
    IN: 'in/'
});

const PRIMARY_REGION_LABELS = Object.freeze({
    JP: { desktop: '🇯🇵 日本', mobile: '🇯🇵 JP' },
    US: { desktop: '🇺🇸 United States', mobile: '🇺🇸 US' },
    KR: { desktop: '🇰🇷 대한민국', mobile: '🇰🇷 KR' },
    TW: { desktop: '🇹🇼 台灣', mobile: '🇹🇼 TW' }
});

const EXPANDED_REGION_TOGGLE_LABELS = Object.freeze({
    HK: { short: '🇭🇰 HK' },
    IN: { short: '🇮🇳 IN' }
});

const REGION_ACCESSIBLE_NAMES = Object.freeze({
    en: { JP: 'Japan', US: 'United States', KR: 'South Korea', TW: 'Taiwan', HK: 'Hong Kong', IN: 'India' },
    ja: { JP: '日本', US: 'アメリカ合衆国', KR: '韓国', TW: '台湾', HK: '香港', IN: 'インド' },
    ko: { JP: '일본', US: '미국', KR: '대한민국', TW: '대만', HK: '홍콩', IN: '인도' },
    tw: { JP: '日本', US: '美國', KR: '韓國', TW: '台灣', HK: '香港', IN: '印度' },
    hk: { JP: '日本', US: '美國', KR: '韓國', TW: '台灣', HK: '香港', IN: '印度' }
});

const REGION_SELECTOR_COPY = Object.freeze({
    en: {
        regionSuffix: 'Google Play Points region',
        more: 'More regions',
        current: 'current region',
        menu: 'More Play Points regions'
    },
    ja: {
        regionSuffix: 'Google Play Points の国・地域',
        more: 'その他の地域',
        current: '現在の地域',
        menu: 'その他の Play Points 地域'
    },
    ko: {
        regionSuffix: 'Google Play Points 국가/지역',
        more: '다른 지역',
        current: '현재 지역',
        menu: '다른 Play Points 지역'
    },
    tw: {
        regionSuffix: 'Google Play Points 國家/地區',
        more: '更多地區',
        current: '目前地區',
        menu: '更多 Play Points 地區'
    },
    hk: {
        regionSuffix: 'Google Play Points 國家/地區',
        more: '更多地區',
        current: '目前地區',
        menu: '更多 Play Points 地區'
    }
});

const REGION_SELECTOR_CRITICAL_STYLE_ID = 'region-selector-critical-style';

export const isHongKongPath = () => /\/hk(\/|$)/.test(window.location.pathname);
export const isIndiaPath = () => /\/in(\/|$)/.test(window.location.pathname);
export const isUnitedStatesPath = () => /\/en(\/|$)/.test(window.location.pathname);
export const isTaiwanRegionPath = () => /\/tw(\/|$)/.test(window.location.pathname);
export const isEnglishPath = () => /\/(?:en|in)(\/|$)/.test(window.location.pathname);
export const isKoreanPath = () => /\/ko(\/|$)/.test(window.location.pathname);
export const isTaiwanPath = () => /\/(?:tw|hk)(\/|$)/.test(window.location.pathname);

function getRegionFromPath() {
    if (isHongKongPath()) return 'HK';
    if (isIndiaPath()) return 'IN';
    if (/\/en(\/|$)/.test(window.location.pathname)) return 'US';
    if (isKoreanPath()) return 'KR';
    if (/\/tw(\/|$)/.test(window.location.pathname)) return 'TW';
    return 'JP';
}

function isRegionalDirectoryPath() {
    return /\/(?:en|ko|tw|hk|in)(\/|$)/.test(window.location.pathname);
}

function getRootPrefix() {
    return isRegionalDirectoryPath() ? '../' : './';
}

function getSelectorLocale() {
    const lang = (document.documentElement?.lang || 'en').toLowerCase();
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang === 'zh-hk' || lang.startsWith('zh-hant-hk')) return 'hk';
    if (lang.startsWith('zh')) return 'tw';
    return 'en';
}

function getSelectorCopy() {
    return REGION_SELECTOR_COPY[getSelectorLocale()] || REGION_SELECTOR_COPY.en;
}

function getAccessibleRegionName(region) {
    const localeNames = REGION_ACCESSIBLE_NAMES[getSelectorLocale()] || REGION_ACCESSIBLE_NAMES.en;
    return localeNames[region] || REGION_ACCESSIBLE_NAMES.en[region] || region;
}

function ensureRegionSelectorCriticalStyle() {
    if (document.getElementById(REGION_SELECTOR_CRITICAL_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = REGION_SELECTOR_CRITICAL_STYLE_ID;
    style.textContent = `
.region-switch button.active,
.region-switch .region-more-toggle[data-region-active="true"] {
  background: var(--input-focus-border-color, #005fcc) !important;
  color: var(--button-text-color, #fff) !important;
  border-color: var(--input-focus-border-color, #005fcc) !important;
}
@media (max-width: 520px) {
  .region-switch {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    width: 100%;
    gap: 0.25rem;
  }
  .region-switch > button {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0.45em 0.12em;
    border: 1px solid var(--input-border-color) !important;
    border-radius: 6px !important;
    font-size: 0;
    line-height: 1;
    white-space: nowrap;
  }
  .region-switch > button[data-region]::after {
    font-size: clamp(0.72rem, 3.5vw, 0.82rem);
  }
  .region-switch > button[data-region="JP"]::after { content: "🇯🇵 JP"; }
  .region-switch > button[data-region="US"]::after { content: "🇺🇸 US"; }
  .region-switch > button[data-region="KR"]::after { content: "🇰🇷 KR"; }
  .region-switch > button[data-region="TW"]::after { content: "🇹🇼 TW"; }
}`;
    document.head.appendChild(style);
}

function ensureRegionSelectorStylesheet() {
    if (document.querySelector('link[data-region-selector-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${getRootPrefix()}region-selector.css`;
    link.dataset.regionSelectorStyle = 'true';
    document.head.appendChild(link);
}

function applyResponsiveRegionLabel(button, region, label) {
    const desktop = document.createElement('span');
    desktop.className = 'region-label-desktop';
    desktop.textContent = label.desktop;

    const mobile = document.createElement('span');
    mobile.className = 'region-label-mobile';
    mobile.setAttribute('aria-hidden', 'true');
    mobile.textContent = label.mobile;

    const copy = getSelectorCopy();
    const accessibleName = getAccessibleRegionName(region);
    button.replaceChildren(desktop, mobile);
    button.setAttribute('aria-label', `${accessibleName} — ${copy.regionSuffix}`);
    button.title = accessibleName;
}

function decoratePrimaryRegionButtons(switcher) {
    [...switcher.children].forEach(child => {
        if (!(child instanceof HTMLButtonElement)) return;
        const region = child.dataset.region;
        const label = PRIMARY_REGION_LABELS[region];
        if (!label) return;
        applyResponsiveRegionLabel(child, region, label);
    });
}

function setMenuOpen(wrapper, open) {
    const toggle = wrapper.querySelector('[data-region-menu-toggle]');
    const menu = wrapper.querySelector('[data-region-menu]');
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
}

function updateExpandedRegionActiveState() {
    const wrapper = document.querySelector('[data-region-more]');
    if (!wrapper) return;

    const toggle = wrapper.querySelector('[data-region-menu-toggle]');
    const currentExpandedRegion = EXPANDED_REGION_TOGGLE_LABELS[STATE.currentRegion] || null;
    const copy = getSelectorCopy();
    if (toggle) {
        const activeExpandedRegion = Boolean(currentExpandedRegion);
        const currentName = activeExpandedRegion ? getAccessibleRegionName(STATE.currentRegion) : '';
        toggle.textContent = currentExpandedRegion?.short || '🌐';
        toggle.dataset.regionActive = activeExpandedRegion ? 'true' : 'false';
        toggle.classList.toggle(CONSTANTS.CLASS_ACTIVE, activeExpandedRegion);
        if (activeExpandedRegion) toggle.setAttribute('aria-current', 'true');
        else toggle.removeAttribute('aria-current');
        toggle.setAttribute(
            'aria-label',
            activeExpandedRegion
                ? `${copy.more}; ${copy.current}: ${currentName}`
                : copy.more
        );
        toggle.title = activeExpandedRegion
            ? `${currentName} — ${copy.more}`
            : copy.more;
    }

    wrapper.querySelectorAll('[data-region]').forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === STATE.currentRegion);
    });
}

export function ensureRegionSelector() {
    const switcher = document.querySelector('.region-switch');
    if (!switcher) return;

    ensureRegionSelectorCriticalStyle();
    ensureRegionSelectorStylesheet();
    decoratePrimaryRegionButtons(switcher);

    if (switcher.querySelector('[data-region-more]')) {
        updateExpandedRegionActiveState();
        return;
    }

    const copy = getSelectorCopy();
    const wrapper = document.createElement('div');
    wrapper.className = 'region-more';
    wrapper.dataset.regionMore = 'true';
    wrapper.innerHTML = `
        <button type="button" class="region-more-toggle" data-region-menu-toggle data-region-active="false" aria-haspopup="menu" aria-expanded="false" aria-label="${copy.more}" title="${copy.more}">🌐</button>
        <div class="region-more-menu" data-region-menu role="menu" aria-label="${copy.menu}" hidden>
            <p class="region-more-menu__title">${copy.more}</p>
            <button type="button" class="region-more-option" role="menuitem" data-region="HK">
                <span class="region-more-option__flag" aria-hidden="true">🇭🇰</span>
                <span class="region-more-option__copy"><span class="region-more-option__name">香港 Hong Kong</span><span class="region-more-option__detail">繁體中文 · HKD</span></span>
            </button>
            <button type="button" class="region-more-option" role="menuitem" data-region="IN">
                <span class="region-more-option__flag" aria-hidden="true">🇮🇳</span>
                <span class="region-more-option__copy"><span class="region-more-option__name">India</span><span class="region-more-option__detail">English · INR</span></span>
            </button>
        </div>`;
    switcher.appendChild(wrapper);

    const toggle = wrapper.querySelector('[data-region-menu-toggle]');
    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setMenuOpen(wrapper, toggle.getAttribute('aria-expanded') !== 'true');
    });

    wrapper.querySelectorAll('[data-region]').forEach(button => {
        button.addEventListener('click', () => setMenuOpen(wrapper, false));
    });

    document.addEventListener('click', (event) => {
        if (!wrapper.contains(event.target)) setMenuOpen(wrapper, false);
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            setMenuOpen(wrapper, false);
            toggle.focus();
        }
    });

    updateExpandedRegionActiveState();
}

export function applyRegionFromPath() {
    try {
        STATE.currentRegion = getRegionFromPath();
        if (STATE.currentRegion !== 'JP') {
            localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, STATE.currentRegion);
        }
        updateExpandedRegionActiveState();
    } catch (e) {
        console.error('地域設定の読み込みに失敗しました:', e);
    }
}

export function switchRegion(newRegion, updateUIForRegion = () => {}) {
    if (!CONFIGS[newRegion] || STATE.currentRegion === newRegion) return;
    STATE.currentRegion = newRegion;
    try {
        localStorage.setItem(CONSTANTS.STORAGE_REGION_KEY, newRegion);
    } catch (e) {
        console.error('地域設定の保存に失敗しました:', e);
        UI.showToast('地域設定の保存に失敗しました。', 'error');
    }

    const nextPath = REGION_PATHS[newRegion];
    if (nextPath === undefined) return;
    const nextUrl = newRegion === 'JP'
        ? (isRegionalDirectoryPath() ? '../' : './')
        : `${getRootPrefix()}${nextPath}`;

    if (nextUrl) {
        window.location.href = nextUrl;
        return;
    }

    document.querySelectorAll('.region-switch button[data-region]').forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === newRegion);
    });
    updateExpandedRegionActiveState();
    updateUIForRegion();
}

if (typeof document !== 'undefined') {
    ensureRegionSelectorCriticalStyle();
    const bootRegionSelector = () => ensureRegionSelector();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootRegionSelector, { once: true });
    } else {
        bootRegionSelector();
    }
}

if (typeof window !== 'undefined' && window.__TEST_ENV__) {
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.REGION_NAVIGATION = {
        applyRegionFromPath,
        ensureRegionSelector,
        isEnglishPath,
        isHongKongPath,
        isIndiaPath,
        isUnitedStatesPath,
        isTaiwanRegionPath,
        isKoreanPath,
        isTaiwanPath,
        switchRegion
    };
}
