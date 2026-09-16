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

const LAST_CALCULATION_COPY = Object.freeze({
    JP: Object.freeze({
        last: '前回：{points}pt{context}',
        context: '（{current} → {target}）',
        decreased: '前回 {previous}pt → 今回 {current}pt（{delta}pt減）',
        increased: '前回 {previous}pt → 今回 {current}pt（{delta}pt増）',
        same: '前回と同じ：{current}pt',
        reuse: '前回の条件を使う'
    }),
    US: Object.freeze({
        last: 'Last time: {points} pts{context}',
        context: ' ({current} → {target})',
        decreased: 'Last {previous} → now {current} pts ({delta} fewer)',
        increased: 'Last {previous} → now {current} pts ({delta} more)',
        same: 'Same as last time: {current} pts',
        reuse: 'Use last values'
    }),
    KR: Object.freeze({
        last: '지난번: {points}pt{context}',
        context: ' ({current} → {target})',
        decreased: '지난번 {previous}pt → 이번 {current}pt ({delta}pt 감소)',
        increased: '지난번 {previous}pt → 이번 {current}pt ({delta}pt 증가)',
        same: '지난번과 동일: {current}pt',
        reuse: '지난번 조건 사용'
    }),
    TW: Object.freeze({
        last: '上次：{points}點{context}',
        context: '（{current} → {target}）',
        decreased: '上次 {previous}點 → 這次 {current}點（減少 {delta}點）',
        increased: '上次 {previous}點 → 這次 {current}點（增加 {delta}點）',
        same: '和上次相同：{current}點',
        reuse: '使用上次條件'
    }),
    HK: Object.freeze({
        last: '上次：{points}點{context}',
        context: '（{current} → {target}）',
        decreased: '上次 {previous}點 → 今次 {current}點（減少 {delta}點）',
        increased: '上次 {previous}點 → 今次 {current}點（增加 {delta}點）',
        same: '和上次相同：{current}點',
        reuse: '使用上次條件'
    }),
    IN: Object.freeze({
        last: 'Last time: {points} pts{context}',
        context: ' ({current} → {target})',
        decreased: 'Last {previous} → now {current} pts ({delta} fewer)',
        increased: 'Last {previous} → now {current} pts ({delta} more)',
        same: 'Same as last time: {current} pts',
        reuse: 'Use last values'
    })
});

function emptyLastCalculationStore() {
    return { version: 1, mainByRegion: {} };
}

function isLastCalculationSnapshot(value) {
    if (!value || typeof value !== 'object') return false;
    const points = Number(value.neededPoints);
    return typeof value.region === 'string'
        && typeof value.currentStatus === 'string'
        && typeof value.targetStatus === 'string'
        && Number.isSafeInteger(points)
        && points >= 0;
}

export function readLastMainCalculationStore(storage = localStorage) {
    try {
        const parsed = JSON.parse(storage.getItem(LAST_MAIN_CALCULATION_KEY) || 'null');
        if (!parsed || parsed.version !== 1 || !parsed.mainByRegion || typeof parsed.mainByRegion !== 'object') {
            return emptyLastCalculationStore();
        }
        const mainByRegion = {};
        for (const [region, snapshot] of Object.entries(parsed.mainByRegion)) {
            if (isLastCalculationSnapshot(snapshot)) mainByRegion[region] = snapshot;
        }
        return { version: 1, mainByRegion };
    } catch {
        return emptyLastCalculationStore();
    }
}

export function getLastMainCalculationForRegion(region, storage = localStorage) {
    return readLastMainCalculationStore(storage).mainByRegion[String(region || '')] || null;
}

export function saveLastMainCalculationForRegion(region, snapshot, storage = localStorage) {
    if (!isLastCalculationSnapshot(snapshot) || snapshot.region !== region) return false;
    try {
        const store = readLastMainCalculationStore(storage);
        store.mainByRegion[region] = { ...snapshot };
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

function fillCopy(template, values) {
    return Object.entries(values).reduce(
        (text, [key, value]) => text.replaceAll('{' + key + '}', String(value ?? '')),
        template
    );
}

function formatPointValue(value, region) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value ?? '');
    const locale = typeof CONFIGS === 'object' && CONFIGS?.[region]?.lang ? CONFIGS[region].lang : 'en';
    return number.toLocaleString(locale);
}

export function formatLastCalculationText(region, currentSnapshot, previousSnapshot = null) {
    const copy = LAST_CALCULATION_COPY[region] || LAST_CALCULATION_COPY.US;
    const currentPoints = formatPointValue(currentSnapshot?.neededPoints, region);

    if (previousSnapshot && sameCalculationContext(previousSnapshot, currentSnapshot)) {
        const previousValue = Number(previousSnapshot.neededPoints);
        const currentValue = Number(currentSnapshot.neededPoints);
        const delta = previousValue - currentValue;
        const values = {
            previous: formatPointValue(previousValue, region),
            current: currentPoints,
            delta: formatPointValue(Math.abs(delta), region)
        };
        if (delta > 0) return fillCopy(copy.decreased, values);
        if (delta < 0) return fillCopy(copy.increased, values);
        return fillCopy(copy.same, values);
    }

    const hasContext = currentSnapshot?.currentStatusLabel && currentSnapshot?.targetStatusLabel;
    const context = hasContext
        ? fillCopy(copy.context, { current: currentSnapshot.currentStatusLabel, target: currentSnapshot.targetStatusLabel })
        : '';
    return fillCopy(copy.last, { points: currentPoints, context });
}

function getSelectedOption(select) {
    if (!select || !select.options || select.selectedIndex < 0) return null;
    return select.options[select.selectedIndex] || null;
}

function getCurrentMainCalculationSnapshot() {
    const currentStatus = document.getElementById('currentStatus');
    const targetStatus = document.getElementById('targetStatus');
    const neededPoints = document.getElementById('neededPoints');
    const points = Number(neededPoints?.value);
    if (!currentStatus || !targetStatus || !Number.isSafeInteger(points) || points < 0) return null;

    const currentOption = getSelectedOption(currentStatus);
    const targetOption = getSelectedOption(targetStatus);
    return {
        region: STATE.currentRegion,
        currentStatus: String(currentStatus.value),
        currentStatusLabel: String(currentOption?.textContent || '').trim(),
        targetStatus: String(targetStatus.value),
        targetStatusLabel: String(targetOption?.dataset?.statusLabel || targetOption?.textContent || '').trim(),
        neededPoints: String(points)
    };
}

function renderLastCalculation(snapshot, previousSnapshot = null) {
    const container = document.getElementById('calculator-last-value');
    const text = document.getElementById('calculator-last-value-text');
    const reuse = document.getElementById('calculator-last-value-reuse');
    if (!container || !text || !reuse || !snapshot) return;

    const copy = LAST_CALCULATION_COPY[STATE.currentRegion] || LAST_CALCULATION_COPY.US;
    text.textContent = formatLastCalculationText(STATE.currentRegion, snapshot, previousSnapshot);
    reuse.textContent = copy.reuse;
    container.hidden = false;
}

function hideLastCalculation() {
    const container = document.getElementById('calculator-last-value');
    if (container) container.hidden = true;
}

function dispatchInputEvent(element, type) {
    if (!element || typeof Event !== 'function') return;
    element.dispatchEvent(new Event(type, { bubbles: true }));
}

function restoreLastCalculation() {
    const snapshot = getLastMainCalculationForRegion(STATE.currentRegion);
    if (!snapshot) return;

    const currentStatus = document.getElementById('currentStatus');
    const targetStatus = document.getElementById('targetStatus');
    const neededPoints = document.getElementById('neededPoints');

    if (currentStatus && Array.from(currentStatus.options || []).some(option => String(option.value) === snapshot.currentStatus)) {
        currentStatus.value = snapshot.currentStatus;
        dispatchInputEvent(currentStatus, 'change');
    }
    if (targetStatus && Array.from(targetStatus.options || []).some(option => String(option.value) === snapshot.targetStatus)) {
        targetStatus.value = snapshot.targetStatus;
        dispatchInputEvent(targetStatus, 'change');
    }
    if (neededPoints) {
        neededPoints.value = snapshot.neededPoints;
        dispatchInputEvent(neededPoints, 'input');
        neededPoints.focus?.();
    }
}

function bindLastCalculationReuse() {
    const reuse = document.getElementById('calculator-last-value-reuse');
    if (!reuse || reuse.dataset.playpointBound === 'true') return;
    reuse.addEventListener('click', restoreLastCalculation);
    reuse.dataset.playpointBound = 'true';
}

function recordSuccessfulMainCalculation() {
    const result = document.getElementById('result');
    if (!result?.classList?.contains(CONSTANTS.CLASS_HAS_RESULT || 'has-result')) return;
    const currentSnapshot = getCurrentMainCalculationSnapshot();
    if (!currentSnapshot) return;

    const previousSnapshot = getLastMainCalculationForRegion(STATE.currentRegion);
    if (!saveLastMainCalculationForRegion(STATE.currentRegion, currentSnapshot)) return;

    if (previousSnapshot && sameCalculationContext(previousSnapshot, currentSnapshot)) {
        renderLastCalculation(currentSnapshot, previousSnapshot);
    } else {
        hideLastCalculation();
    }
}

function bindLastCalculationMemory() {
    const result = document.getElementById('result');
    if (!result) return;

    bindLastCalculationReuse();
    const saved = getLastMainCalculationForRegion(STATE.currentRegion);
    if (saved) renderLastCalculation(saved);
    else hideLastCalculation();

    if (typeof MutationObserver !== 'function' || result.dataset.playpointMemoryBound === 'true') return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            recordSuccessfulMainCalculation();
        });
    });
    observer.observe(result, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
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
