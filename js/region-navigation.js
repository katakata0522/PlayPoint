'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';
import { UI } from './ui.js';
import { CALC } from './calculator.js';
import { createExpansionConfigs } from './region-expansion-config.js';
import { installExpandedRegionResultNavigation } from './region-result-navigation.js';

Object.assign(CONFIGS, createExpansionConfigs(CONFIGS));
installExpandedRegionResultNavigation(CALC, STATE);

const REGION_PATHS = Object.freeze({
    JP: '',
    US: 'en/',
    KR: 'ko/',
    TW: 'tw/',
    HK: 'hk/',
    IN: 'in/'
});

export const isHongKongPath = () => /\/hk(\/|$)/.test(window.location.pathname);
export const isIndiaPath = () => /\/in(\/|$)/.test(window.location.pathname);
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

function ensureRegionSelectorStylesheet() {
    if (document.querySelector('link[data-region-selector-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${getRootPrefix()}region-selector.css`;
    link.dataset.regionSelectorStyle = 'true';
    document.head.appendChild(link);
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
    const expandedRegion = STATE.currentRegion === 'HK' || STATE.currentRegion === 'IN';
    wrapper.querySelector('[data-region-menu-toggle]')?.classList.toggle(CONSTANTS.CLASS_ACTIVE, expandedRegion);
    wrapper.querySelectorAll('[data-region]').forEach(button => {
        button.classList.toggle(CONSTANTS.CLASS_ACTIVE, button.dataset.region === STATE.currentRegion);
    });
}

export function ensureRegionSelector() {
    const switcher = document.querySelector('.region-switch');
    if (!switcher || switcher.querySelector('[data-region-more]')) return;

    ensureRegionSelectorStylesheet();

    const wrapper = document.createElement('div');
    wrapper.className = 'region-more';
    wrapper.dataset.regionMore = 'true';
    wrapper.innerHTML = `
        <button type="button" class="region-more-toggle" data-region-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-label="More regions" title="More regions">🌐</button>
        <div class="region-more-menu" data-region-menu role="menu" aria-label="More Play Points regions" hidden>
            <p class="region-more-menu__title">More regions</p>
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
        isKoreanPath,
        isTaiwanPath,
        switchRegion
    };
}
