'use strict';

(() => {
    if (window.PlayPointAnalytics) return;

    const ENTRY_STORAGE_KEY = 'playpointCalculatorEntryContext';
    const MAX_TEXT_LENGTH = 120;
    const CALCULATION_EVENTS = new Set([
        'calculation_completed',
        'reverse_calculation_completed'
    ]);
    const CALCULATOR_PATHS = new Set(['/', '/en/', '/ko/', '/tw/']);
    const ALLOWED_PARAMS = Object.freeze({
        calculation_completed: ['calculation_mode', 'region', 'target_status', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'calculator_preset'],
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
        theme_change: ['theme_mode']
    });

    function sanitizeValue(key, value) {
        if (value === undefined || value === null || value === '') return null;
        if (key === 'link_position' || key === 'results_count') {
            const numberValue = Number(value);
            return Number.isFinite(numberValue) ? numberValue : null;
        }

        let text = String(value).trim();
        if (!text) return null;
        if (key.endsWith('_path')) {
            try {
                text = new URL(text, window.location.origin).pathname;
            } catch (error) {
                return null;
            }
        }
        return text.replace(/[<>"']/g, '').slice(0, MAX_TEXT_LENGTH);
    }

    function sanitizeParams(eventName, params = {}) {
        const allowed = ALLOWED_PARAMS[eventName];
        if (!allowed) return params && typeof params === 'object' ? params : {};
        return allowed.reduce((clean, key) => {
            const value = sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    }

    function hasConsent() {
        return Boolean(window.PlayPointConsent)
            && window.PlayPointConsent.getStatus() === 'granted';
    }

    function readEntryContext() {
        try {
            const raw = sessionStorage.getItem(ENTRY_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return sanitizeParams('calculation_completed', parsed);
        } catch (error) {
            console.warn('計算機の流入情報を読み込めませんでした。', error);
            return null;
        }
    }

    function clearEntryContext() {
        try {
            sessionStorage.removeItem(ENTRY_STORAGE_KEY);
        } catch (error) {
            console.warn('計算機の流入情報を削除できませんでした。', error);
        }
    }

    function rememberCalculatorEntry(link, context = {}) {
        try {
            const url = link instanceof URL ? link : new URL(link.href || link, window.location.href);
            if (url.origin !== window.location.origin || !CALCULATOR_PATHS.has(url.pathname)) return false;

            const entry = sanitizeParams('calculation_completed', {
                entry_source_path: context.source_path || window.location.pathname,
                entry_link_context: context.link_context || 'internal_link',
                calculator_preset: url.searchParams.toString() ? 'preset' : 'blank'
            });
            sessionStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entry));
            return true;
        } catch (error) {
            console.warn('計算機の流入情報を保存できませんでした。', error);
            return false;
        }
    }

    function enrichCalculationParams(eventName, params) {
        const clean = sanitizeParams(eventName, params);
        if (!CALCULATION_EVENTS.has(eventName)) return clean;

        const entry = readEntryContext();
        if (!entry) return clean;
        clearEntryContext();
        return sanitizeParams(eventName, { ...clean, ...entry });
    }

    function installGtagBridge() {
        if (window.__playpointGtagBridgeInstalled) return;
        window.__playpointGtagBridgeInstalled = true;
        window.dataLayer = window.dataLayer || [];

        window.gtag = function gtag(command, eventName, params) {
            if (command === 'event' && typeof eventName === 'string') {
                window.dataLayer.push(arguments.length >= 3
                    ? [command, eventName, enrichCalculationParams(eventName, params || {})]
                    : [command, eventName]);
                return;
            }
            window.dataLayer.push(arguments);
        };
    }

    function track(eventName, params = {}) {
        if (!hasConsent()) return false;
        installGtagBridge();
        window.gtag('event', eventName, sanitizeParams(eventName, params));
        return true;
    }

    window.PlayPointAnalytics = Object.freeze({
        hasConsent,
        installGtagBridge,
        rememberCalculatorEntry,
        sanitizeParams,
        track
    });

    installGtagBridge();
})();
