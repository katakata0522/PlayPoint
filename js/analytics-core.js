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
    const CALCULATOR_ENTRY_PARAMS = [
        'entry_source_path',
        'entry_link_context',
        'calculator_preset'
    ];
    const CALCULATOR_PATHS = new Set(['/', '/en/', '/ko/', '/tw/']);
    const ALLOWED_PARAMS = Object.freeze({
        calculation_completed: ['calculation_mode', 'region', 'target_status', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        calculator_form_started: ['calculation_mode', 'region', 'start_field'],
        calculator_funnel_completed: ['calculation_mode', 'region'],
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

    function hasConsent() {
        return Boolean(window.PlayPointConsent)
            && window.PlayPointConsent.getStatus() === 'granted';
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

    function sanitizeParams(eventName, params = {}) {
        const allowed = ALLOWED_PARAMS[eventName];
        if (!allowed || !params || typeof params !== 'object') return null;
        return allowed.reduce((clean, key) => {
            const value = sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    }

    function sanitizeCalculatorEntry(params = {}) {
        const clean = sanitizeParams('calculation_completed', params) || {};
        return CALCULATOR_ENTRY_PARAMS.reduce((entry, key) => {
            if (clean[key] !== undefined) entry[key] = clean[key];
            return entry;
        }, {});
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

    function clearCalculatorEntry() {
        try {
            window.sessionStorage.removeItem(ENTRY_STORAGE_KEY);
        } catch (error) {
            console.warn('計算機の流入情報を削除できませんでした。', error);
        }
    }

    function readCalculatorEntry() {
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
            return sanitizeCalculatorEntry(parsed);
        } catch (error) {
            clearCalculatorEntry();
            console.warn('計算機の流入情報を読み込めませんでした。', error);
            return null;
        }
    }

    function rememberCalculatorEntry(link, context = {}) {
        if (!hasConsent()) return false;
        try {
            const url = link instanceof URL ? link : new URL(link.href || link, window.location.href);
            if (url.origin !== window.location.origin || !CALCULATOR_PATHS.has(url.pathname)) return false;

            const entry = sanitizeCalculatorEntry({
                entry_source_path: context.source_path || window.location.pathname,
                entry_link_context: context.link_context || 'internal_link',
                calculator_preset: url.search ? 'preset' : 'blank'
            });
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

    function enrichCalculationParams(eventName, params) {
        const clean = sanitizeParams(eventName, params);
        if (!clean || !CALCULATION_EVENTS.has(eventName)) return clean;

        const entry = readCalculatorEntry();
        if (!entry) return clean;
        clearCalculatorEntry();
        return sanitizeParams(eventName, { ...clean, ...entry });
    }

    function installGtagBridge() {
        if (window.__playpointGtagBridgeInstalled) return;
        window.__playpointGtagBridgeInstalled = true;
        window.dataLayer = window.dataLayer || [];

        window.gtag = function gtag(command, eventName, params) {
            if (command === 'event' && typeof eventName === 'string') {
                const enrichedParams = enrichCalculationParams(eventName, params || {});
                if (enrichedParams === null) return;
                arguments[2] = enrichedParams;
            }
            window.dataLayer.push(arguments);
        };
    }

    function queue(eventName, params) {
        if (pendingEvents.length >= MAX_PENDING_EVENTS) pendingEvents.shift();
        pendingEvents.push({ eventName, params });
    }

    function send(eventName, params) {
        installGtagBridge();
        window.gtag('event', eventName, params);
    }

    function track(eventName, params = {}) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return false;
        const cleanParams = sanitizeParams(eventName, params);
        if (cleanParams === null) return false;

        if (!window.PlayPointConsent) {
            queue(eventName, cleanParams);
            return false;
        }
        const consentStatus = window.PlayPointConsent.getStatus();
        if (consentStatus === 'pending') {
            queue(eventName, cleanParams);
            return false;
        }
        if (consentStatus !== 'granted') {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return false;
        }
        if (!analyticsReady) {
            queue(eventName, cleanParams);
            return false;
        }

        send(eventName, cleanParams);
        return true;
    }

    function flushPending() {
        if (!window.PlayPointConsent) return;
        const consentStatus = window.PlayPointConsent.getStatus();
        if (consentStatus === 'pending') return;
        if (consentStatus !== 'granted') {
            pendingEvents.length = 0;
            clearCalculatorEntry();
            return;
        }
        if (!analyticsReady) return;

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
