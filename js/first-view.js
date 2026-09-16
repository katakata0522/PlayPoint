'use strict';

import { CONFIGS, STATE, CONSTANTS } from './config.js';

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

function regionConfig(region) {
    return typeof CONFIGS === 'object' ? CONFIGS?.[region] : null;
}

function normalizeLastCalculation(value) {
    const points = Number(value?.neededPoints);
    if (!value || typeof value.region !== 'string'
        || typeof value.currentStatus !== 'string'
        || typeof value.targetStatus !== 'string'
        || !Number.isSafeInteger(points) || points < 0) return null;
    return {
        region: value.region,
        currentStatus: value.currentStatus,
        targetStatus: value.targetStatus,
        neededPoints: String(points)
    };
}

export function readLastMainCalculationStore(storage = localStorage) {
    try {
        const parsed = JSON.parse(storage.getItem(LAST_MAIN_CALCULATION_KEY) || 'null');
        if (!parsed || parsed.version !== 1 || typeof parsed.mainByRegion !== 'object') {
            return { version: 1, mainByRegion: {} };
        }
        const mainByRegion = {};
        for (const [region, value] of Object.entries(parsed.mainByRegion)) {
            const snapshot = normalizeLastCalculation(value);
            if (snapshot?.region === region) mainByRegion[region] = snapshot;
        }
        return { version: 1, mainByRegion };
    } catch {
        return { version: 1, mainByRegion: {} };
    }
}

export function getLastMainCalculationForRegion(region, storage = localStorage) {
    return readLastMainCalculationStore(storage).mainByRegion[String(region || '')] || null;
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
    return Number(value).toLocaleString(regionConfig(region)?.lang || 'en');
}

function statusLabel(region, snapshot, kind) {
    const explicit = snapshot?.[`${kind}StatusLabel`];
    if (explicit) return String(explicit).trim();
    const config = regionConfig(region);
    const source = kind === 'current' ? config?.statuses : config?.thresholds;
    const value = kind === 'current' ? snapshot?.currentStatus : snapshot?.targetStatus;
    return Object.entries(source || {}).find(([, candidate]) => String(candidate) === String(value))?.[0] || '';
}

export function formatLastCalculationText(region, currentSnapshot, previousSnapshot = null) {
    const current = formatPoints(currentSnapshot?.neededPoints, region);
    if (previousSnapshot && sameCalculationContext(previousSnapshot, currentSnapshot)) {
        const previous = Number(previousSnapshot.neededPoints);
        const now = Number(currentSnapshot.neededPoints);
        const delta = previous - now;
        const before = formatPoints(previous, region);
        const difference = formatPoints(Math.abs(delta), region);
        if (region === 'JP') {
            if (delta > 0) return `前回 ${before}pt → 今回 ${current}pt（${difference}pt減）`;
            if (delta < 0) return `前回 ${before}pt → 今回 ${current}pt（${difference}pt増）`;
            return `前回と同じ：${current}pt`;
        }
        if (region === 'KR') {
            if (delta > 0) return `지난번 ${before}pt → 이번 ${current}pt (${difference}pt 감소)`;
            if (delta < 0) return `지난번 ${before}pt → 이번 ${current}pt (${difference}pt 증가)`;
            return `지난번과 동일: ${current}pt`;
        }
        if (region === 'TW' || region === 'HK') {
            const thisTime = region === 'HK' ? '今次' : '這次';
            if (delta > 0) return `上次 ${before}點 → ${thisTime} ${current}點（減少 ${difference}點）`;
            if (delta < 0) return `上次 ${before}點 → ${thisTime} ${current}點（增加 ${difference}點）`;
            return `和上次相同：${current}點`;
        }
        if (delta > 0) return `Last ${before} → now ${current} pts (${difference} fewer)`;
        if (delta < 0) return `Last ${before} → now ${current} pts (${difference} more)`;
        return `Same as last time: ${current} pts`;
    }

    const from = statusLabel(region, currentSnapshot, 'current');
    const to = statusLabel(region, currentSnapshot, 'target');
    if (region === 'JP') return `前回：${current}pt${from && to ? `（${from} → ${to}）` : ''}`;
    if (region === 'KR') return `지난번: ${current}pt${from && to ? ` (${from} → ${to})` : ''}`;
    if (region === 'TW' || region === 'HK') return `上次：${current}點${from && to ? `（${from} → ${to}）` : ''}`;
    return `Last time: ${current} pts${from && to ? ` (${from} → ${to})` : ''}`;
}

function getCurrentMainCalculationSnapshot() {
    const currentStatus = document.getElementById('currentStatus');
    const targetStatus = document.getElementById('targetStatus');
    const points = Number(document.getElementById('neededPoints')?.value);
    if (!currentStatus || !targetStatus || !Number.isSafeInteger(points) || points < 0) return null;
    return {
        region: STATE.currentRegion,
        currentStatus: String(currentStatus.value),
        targetStatus: String(targetStatus.value),
        neededPoints: String(points)
    };
}

function renderLastCalculation(snapshot, previousSnapshot = null) {
    const container = document.getElementById('calculator-last-value');
    const text = document.getElementById('calculator-last-value-text');
    const reuse = document.getElementById('calculator-last-value-reuse');
    if (!container || !text || !reuse || !snapshot) return;
    text.textContent = formatLastCalculationText(STATE.currentRegion, snapshot, previousSnapshot);
    const reuseCopy = regionConfig(STATE.currentRegion)?.uiText?.lastCalculationReuse;
    if (reuseCopy) reuse.textContent = reuseCopy;
    container.hidden = false;
}

function hideLastCalculation() {
    const container = document.getElementById('calculator-last-value');
    if (container) container.hidden = true;
}

function restoreLastCalculation() {
    const snapshot = getLastMainCalculationForRegion(STATE.currentRegion);
    if (!snapshot) return;
    const currentStatus = document.getElementById('currentStatus');
    const targetStatus = document.getElementById('targetStatus');
    const neededPoints = document.getElementById('neededPoints');
    const restoreSelect = (select, value) => {
        if (!select || !Array.from(select.options || []).some(option => String(option.value) === value)) return;
        select.value = value;
        if (typeof Event === 'function') select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    restoreSelect(currentStatus, snapshot.currentStatus);
    restoreSelect(targetStatus, snapshot.targetStatus);
    if (neededPoints) {
        neededPoints.value = snapshot.neededPoints;
        if (typeof Event === 'function') neededPoints.dispatchEvent(new Event('input', { bubbles: true }));
        neededPoints.focus?.();
    }
}

function recordSuccessfulMainCalculation() {
    const result = document.getElementById('result');
    if (!result?.classList?.contains(CONSTANTS.CLASS_HAS_RESULT || 'has-result')) return;
    const current = getCurrentMainCalculationSnapshot();
    if (!current) return;
    const previous = getLastMainCalculationForRegion(STATE.currentRegion);
    if (!saveLastMainCalculationForRegion(STATE.currentRegion, current)) return;
    if (previous && sameCalculationContext(previous, current)) renderLastCalculation(current, previous);
    else hideLastCalculation();
}

function bindLastCalculationMemory() {
    const result = document.getElementById('result');
    const reuse = document.getElementById('calculator-last-value-reuse');
    if (!result || !reuse || result.dataset.playpointMemoryBound === 'true') return;
    reuse.addEventListener('click', restoreLastCalculation);
    const saved = getLastMainCalculationForRegion(STATE.currentRegion);
    if (saved) renderLastCalculation(saved);
    else hideLastCalculation();
    if (typeof MutationObserver === 'function') {
        const observer = new MutationObserver(recordSuccessfulMainCalculation);
        observer.observe(result, { childList: true, attributes: true, attributeFilter: ['class'] });
    }
    result.dataset.playpointMemoryBound = 'true';
}

function prepareFirstView() {
    enhanceCalculatorAdvancedSettings();
}

function preparePostInit() {
    if (typeof window?.setTimeout === 'function') window.setTimeout(bindLastCalculationMemory, 0);
    else bindLastCalculationMemory();
}

if (typeof document !== 'undefined') {
    if (document.getElementById('mainMode')) {
        prepareFirstView();
        document.addEventListener('DOMContentLoaded', preparePostInit, { once: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            prepareFirstView();
            preparePostInit();
        }, { once: true });
    }
}