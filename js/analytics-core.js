'use strict';

(() => {
    if (window.PlayPointAnalytics) return;

    const ENTRY_STORAGE_KEY = 'playpointCalculatorEntryContext';
    const ENTRY_MAX_AGE_MS = 30 * 60 * 1000;
    const MAX_PENDING_EVENTS = 20;
    const MAX_TEXT_LENGTH = 120;
    const CALCULATION_EVENTS = new Set([
        'calculation_completed',
        'reverse_calculation_completed'
    ]);
    const CALCULATOR_ATTRIBUTION_EVENTS = new Set([
        ...CALCULATION_EVENTS,
        'calculator_form_started',
        'calculator_funnel_completed'
    ]);
    const CALCULATOR_ENTRY_PARAMS = [
        'entry_source_path',
        'entry_link_context',
        'calculator_preset'
    ];
    const CALCULATOR_PATHS = new Set(['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']);
    const ALLOWED_PARAMS = Object.freeze({
        page_view: [],
        calculation_completed: ['calculation_mode', 'region', 'target_status', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        calculator_form_started: ['calculation_mode', 'region', 'start_field', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        calculator_funnel_completed: ['calculation_mode', 'region', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        calculator_validation_error: ['calculation_mode', 'region', 'error_type'],
        calculator_mode_changed: ['region', 'from_mode', 'to_mode'],
        diary_tab_opened: ['region', 'open_surface'],
        diary_entry_saved: ['region', 'entry_type'],
        article_to_calculator_clicked: ['source_path', 'link_context', 'destination_path'],
        lp_to_calculator_clicked: ['source_path', 'source_surface', 'entry_campaign', 'link_context'],
        lp_related_link_clicked: ['source_path', 'target_path', 'link_context'],
        result_related_article_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        share_url_copied: ['calculation_mode', 'region', 'target_status'],
        share_x_clicked: ['calculation_mode', 'region', 'target_status'],
        calendar_reminder_added: ['region', 'calendar_type'],
        pwa_install_accepted: ['region', 'install_surface'],
        widget_referral_landed: ['region', 'entry_surface'],
        widget_code_copied: ['theme', 'language', 'mode'],
        web_vital: ['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version'],
        article_click: ['article_title', 'article_category'],
        search: ['search_term', 'results_count'],
        category_filter: ['category_name'],
        theme_change: ['theme_mode'],
        points_cost_calculation_completed: ['region', 'status', 'point_bucket']
    });

    const pendingEvents = [];
    let analyticsReady = false;
    let initialPageViewSent = false;
    let activeCalculatorEntry = null;
    let calculationEntryConsumed = false;
    let gtagBridge = null;

    function getConsentStatus() {
        if (!window.PlayPointConsent || typeof window.PlayPointConsent.getStatus !== 'function') return null;
        return window.PlayPointConsent.getStatus();
    }

    function hasConsent() {
        return getConsentStatus() === 'granted';
    }

    function sanitizeValue(key, value) {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'link_position') {
            const numberValue = Number(value);
            return Number.isInteger(numberValue) && numberValue >= 1 && numberValue <= 10
                ? numberValue
                : null;
        }
        if (key === 'results_count') {
            const numberValue = Number(value);
            return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null;
        }

        let text = String(value).trim();
        if (!text) return null;
        if (key.endsWith('_path')) {
            try {
                const url = new URL(text, window.location.origin);
                if (url.origin !== window.location.origin) return null;
                text = url.pathname;
            } catch (error) {
                return null;
            }
        }
        return text.replace(/[<>"']/g, '').slice(0, MAX_TEXT_LENGTH);
    }

    function sanitizeAllowedParams(allowed, params = {}) {
        if (!Array.isArray(allowed) || !params || typeof params !== 'object') return null;
        return allowed.reduce((clean, key) => {
            const value = sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    }

    function sanitizeParams(eventName, params = {}) {
        const allowed = ALLOWED_PARAMS[eventName];
        if (!allowed) return null;
        return sanitizeAllowedParams(allowed, params);
    }

    function sanitizeCalculatorEntry(params = {}) {
        return sanitizeAllowedParams(CALCULATOR_ENTRY_PARAMS, params) || {};
    }

    function getEntryContext() {
        if (typeof URLSearchParams === 'undefined' || !window.location) return {};
        const params = new URLSearchParams(window.location.search);
        return {
            entry_source: params.get('utm_source') || undefined,
            entry_medium: params.get('utm_medium') || undefined,
            entry_campaign: params.get('utm_campaign') || undefined
        };
    }

    function resolveUrl(link) {
        return link instanceof URL ? link : new URL(link.href || link, window.location.href);
    }

    function isCalculatorDestination(link) {
        try {
            const url = resolveUrl(link);
            return url.origin === window.location.origin && CALCULATOR_PATHS.has(url.pathname);
        } catch (error) {
            return false;
        }
    }

    function clearStoredCalculatorEntry() {
        try {
            window.sessionStorage.removeItem(ENTRY_STORAGE_KEY);
        } catch (error) {
            console.warn('計算機の流入情報を削除できませんでした。', error);
        }
    }

    function clearCalculatorEntry() {
        activeCalculatorEntry = null;
        calculationEntryConsumed = false;
        clearStoredCalculatorEntry();
    }

    function readCalculatorEntry() {
        if (activeCalculatorEntry) return activeCalculatorEntry;
        try {
            const raw = window.sessionStorage.getItem(ENTRY_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const recordedAt = Number(parsed && parsed.recorded_at);
            if (!parsed || typeof parsed !== 'object' || !Number.isFinite(recordedAt)
                || recordedAt > Date.now() + 60 * 1000
                || Date.now() - recordedAt > ENTRY_MAX_AGE_MS) {
                clearCalculatorEntry();
                return null;
            }
            activeCalculatorEntry = sanitizeCalculatorEntry(parsed);
            clearStoredCalculatorEntry();
            return activeCalculatorEntry;
        } catch (error) {
            clearCalculatorEntry();
            console.warn('計算機の流入情報を読み込めませんでした。', error);
            return null;
        }
    }

    function rememberCalculatorEntry(link, context = {}) {
        if (!hasConsent()) return false;
        try {
            const url = resolveUrl(link);
            if (!isCalculatorDestination(url)) return false;

            const entry = sanitizeCalculatorEntry({
                entry_source_path: context.source_path || window.location.pathname,
                entry_link_context: context.link_context || 'internal_link',
                calculator_preset: url.search ? 'preset' : 'blank'
            });
            activeCalculatorEntry = null;
            calculationEntryConsumed = false;
            window.sessionStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify({
                ...entry,
                recorded_at: Date.now()
            }));
            return true;
        } catch (error) {
            console.warn('計算機の流入情報を保存できませんでした。', error);
            return false;
        }
    }

    function enrichSanitizedCalculationParams(eventName, cleanParams) {
        if (!CALCULATOR_ATTRIBUTION_EVENTS.has(eventName)) return cleanParams;

        const entry = readCalculatorEntry();
        if (!entry) return cleanParams;
        if (CALCULATION_EVENTS.has(eventName)) {
            if (calculationEntryConsumed) return cleanParams;
            calculationEntryConsumed = true;
        }
        return sanitizeParams(eventName, { ...cleanParams, ...entry });
    }

    function sanitizeAndEnrichCalculationParams(eventName, params) {
        const cleanParams = sanitizeParams(eventName, params);
        if (cleanParams === null) return null;
        return enrichSanitizedCalculationParams(eventName, cleanParams);
    }

    function installGtagBridge() {
        if (window.__playpointGtagBridgeInstalled) return;
        window.__playpointGtagBridgeInstalled = true;
        window.dataLayer = window.dataLayer || [];

        gtagBridge = function gtag(command, eventName, params) {
            if (command === 'event' && typeof eventName === 'string') {
                const enrichedParams = sanitizeAndEnrichCalculationParams(eventName, params || {});
                if (enrichedParams === null) return;
                arguments[2] = enrichedParams;
            }
            window.dataLayer.push(arguments);
        };
        window.gtag = gtagBridge;
    }

    function queue(eventName, params) {
        if (pendingEvents.length >= MAX_PENDING_EVENTS) pendingEvents.shift();
        pendingEvents.push({ eventName, params });
    }

    function discardPendingAnalytics() {
        pendingEvents.length = 0;
        clearCalculatorEntry();
    }

    function send(eventName, cleanParams) {
        installGtagBridge();
        if (window.gtag === gtagBridge) {
            window.gtag('event', eventName, cleanParams);
            return true;
        }

        const enrichedParams = enrichSanitizedCalculationParams(eventName, cleanParams);
        if (enrichedParams === null) return false;
        window.gtag('event', eventName, enrichedParams);
        return true;
    }

    function track(eventName, params = {}) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return false;
        const cleanParams = sanitizeParams(eventName, params);
        if (cleanParams === null) return false;

        const consentStatus = getConsentStatus();
        if (consentStatus === null || consentStatus === 'pending') {
            queue(eventName, cleanParams);
            return false;
        }
        if (consentStatus !== 'granted') {
            discardPendingAnalytics();
            return false;
        }
        if (!analyticsReady) {
            queue(eventName, cleanParams);
            return false;
        }

        return send(eventName, cleanParams);
    }

    function sendInitialPageView() {
        if (initialPageViewSent || !analyticsReady || !hasConsent()) return false;
        initialPageViewSent = true;
        send('page_view', {});
        return true;
    }

    function flushPending() {
        const consentStatus = getConsentStatus();
        if (consentStatus === null || consentStatus === 'pending') return;
        if (consentStatus !== 'granted') {
            discardPendingAnalytics();
            return;
        }
        if (!analyticsReady) return;

        if (window.__playpointManualPageView === true) sendInitialPageView();
        while (pendingEvents.length) {
            const { eventName, params } = pendingEvents.shift();
            send(eventName, params);
        }
    }

    function markAnalyticsReady() {
        if (analyticsReady) return;
        analyticsReady = true;
        flushPending();
    }

    function markEngaged() {
        if (typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('playpoint:engaged'));
        }
    }

    window.PlayPointAnalytics = Object.freeze({
        clearCalculatorEntry,
        flushPending,
        getEntryContext,
        hasConsent,
        installGtagBridge,
        isCalculatorDestination,
        markAnalyticsReady,
        markEngaged,
        rememberCalculatorEntry,
        sanitizeParams,
        track
    });

    installGtagBridge();
    if (window.document && typeof window.document.addEventListener === 'function') {
        window.document.addEventListener('playpoint:consent-ready', flushPending);
        window.document.addEventListener('playpoint:consent-updated', flushPending);
    }
})();