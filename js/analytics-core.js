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
    const ENUM_PARAM_VALUES = Object.freeze({
        component: new Set(['site_identity', 'global_nav', 'breadcrumb', 'region_switch', 'next_step', 'popular', 'related', 'author', 'katakatalab', 'browse']),
        locale: new Set(['en', 'ko', 'tw']),
        article_role: new Set(['calculator_bridge', 'decision_support', 'troubleshooting', 'retention', 'game_decision', 'reference', 'hold']),
        article_category: new Set(['account', 'earn', 'levels', 'troubleshooting', 'guides']),
        destination_type: new Set(['calculator', 'article', 'guide_hub', 'category', 'operator_profile', 'external_profile', 'region_home', 'section', 'internal', 'official_google_support'])
    });
    const REQUIRED_PARAMS = Object.freeze({
        article_navigation_click: Object.freeze(['source_path', 'component', 'locale', 'article_role', 'article_category', 'destination_type'])
    });
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
        article_navigation_click: ['source_path', 'target_path', 'component', 'locale', 'article_role', 'article_category', 'destination_type', 'link_position'],
        lp_to_calculator_clicked: ['source_path', 'source_surface', 'entry_campaign', 'link_context'],
        lp_related_link_clicked: ['source_path', 'target_path', 'link_context'],
        result_related_article_clicked: ['source_path', 'target_path', 'destination_type', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'destination_type', 'target_status', 'calculation_mode', 'link_position'],
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
        const enumValues = ENUM_PARAM_VALUES[key];
        if (enumValues && !enumValues.has(text)) return null;
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
        const clean = sanitizeAllowedParams(allowed, params);
        const required = REQUIRED_PARAMS[eventName];
        if (required && required.some(key => clean[key] === undefined)) return null;
        return clean;
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


    const INTL_ARTICLE_PATH_PATTERN = /^\/(en|ko|tw)\/articles\/[^/]+\.html$/;
    const ARTICLE_CATEGORY_BY_ANCHOR = Object.freeze({
        'intl-hub-account': 'account',
        'intl-hub-earn': 'earn',
        'intl-hub-levels': 'levels',
        'intl-hub-trouble': 'troubleshooting'
    });

    function getArticleJourneyContext() {
        const pathname = window.location && window.location.pathname ? String(window.location.pathname) : '';
        const localeMatch = pathname.match(INTL_ARTICLE_PATH_PATTERN);
        if (!localeMatch || !window.document || typeof window.document.querySelector !== 'function') return null;

        const roleWidget = window.document.querySelector('.intl-article-sidebar .sidebar-widget--next');
        const roleMatch = String(roleWidget && roleWidget.className || '').match(/\bsidebar-widget--role-([a-z_]+)\b/);
        if (!roleMatch) return null;

        let articleCategory = 'guides';
        const categoryLink = window.document.querySelector('.intl-breadcrumb-category');
        const categoryHref = categoryLink && typeof categoryLink.getAttribute === 'function'
            ? String(categoryLink.getAttribute('href') || '')
            : '';
        for (const [anchor, category] of Object.entries(ARTICLE_CATEGORY_BY_ANCHOR)) {
            if (categoryHref.includes('#' + anchor)) {
                articleCategory = category;
                break;
            }
        }

        return {
            locale: localeMatch[1],
            article_role: roleMatch[1],
            article_category: articleCategory
        };
    }

    function getSelectorPosition(link, selector) {
        if (!window.document || typeof window.document.querySelectorAll !== 'function') return null;
        const links = Array.from(window.document.querySelectorAll(selector));
        const index = links.indexOf(link);
        return index >= 0 && index < 10 ? index + 1 : null;
    }

    function getPopularPosition(link) {
        const item = link && typeof link.closest === 'function' ? link.closest('.sidebar-popular-item') : null;
        const rank = item && typeof item.querySelector === 'function' ? item.querySelector('.sidebar-popular-rank') : null;
        const position = Number.parseInt(rank && rank.textContent || '', 10);
        return Number.isInteger(position) && position >= 1 && position <= 10 ? position : null;
    }

    function classifyArticleNavigationLink(link, url) {
        if (!link || !url) return null;
        const hasClass = name => Boolean(link.classList && typeof link.classList.contains === 'function' && link.classList.contains(name));
        const closest = selector => typeof link.closest === 'function' ? link.closest(selector) : null;

        if (hasClass('site-logo')) return { component: 'site_identity', link_position: 1 };
        if (hasClass('nav-item') && closest('.intl-global-nav')) return { component: 'global_nav', link_position: getSelectorPosition(link, '.intl-global-nav .nav-item') };
        if (closest('.intl-article-breadcrumbs')) return { component: 'breadcrumb', link_position: getSelectorPosition(link, '.intl-article-breadcrumbs a') };
        if (closest('.site-region-menu')) return { component: 'region_switch', link_position: getSelectorPosition(link, '.site-region-menu a') };
        if (hasClass('sidebar-next-link')) return { component: 'next_step', link_position: 1 };
        if (hasClass('sidebar-popular-link')) return { component: 'popular', link_position: getPopularPosition(link) };
        if (hasClass('sidebar-related-link')) return { component: 'related', link_position: getSelectorPosition(link, '.sidebar-related-link') };
        if (hasClass('sidebar-browse-link')) return { component: 'browse', link_position: getSelectorPosition(link, '.sidebar-browse-link') };
        if (hasClass('site-about-link') || closest('.sidebar-author-links, .author-box-links')) {
            const hostname = String(url.hostname || '').toLowerCase();
            const isKatakataLab = hostname === 'katakatalab.com' || hostname.endsWith('.katakatalab.com');
            return {
                component: isKatakataLab ? 'katakatalab' : 'author',
                link_position: getSelectorPosition(link, '.sidebar-author-links a, .author-box-links a, .site-about-link')
            };
        }
        return null;
    }

    function classifyArticleDestination(url, component) {
        if (url.origin !== window.location.origin) return component === 'katakatalab' ? 'external_profile' : 'internal';
        if (isCalculatorDestination(url)) return component === 'region_switch' ? 'region_home' : 'calculator';
        if (component === 'author') return 'operator_profile';
        if (/\/(?:en|ko|tw)\/articles\/[^/]+\.html$/.test(url.pathname)) return 'article';
        if (/\/(?:en|ko|tw)\/articles\/$/.test(url.pathname)) return url.hash ? 'category' : 'guide_hub';
        if (url.pathname === window.location.pathname && url.hash) return 'section';
        return 'internal';
    }

    function installArticleJourneyTracking() {
        if (!window.document || typeof window.document.addEventListener !== 'function') return;
        const pathname = window.location && window.location.pathname ? String(window.location.pathname) : '';
        if (!INTL_ARTICLE_PATH_PATTERN.test(pathname)) return;

        window.document.addEventListener('click', event => {
            const link = event && event.target && typeof event.target.closest === 'function'
                ? event.target.closest('a[href]')
                : null;
            if (!link) return;

            let url;
            try {
                url = resolveUrl(link);
            } catch (error) {
                return;
            }

            const journey = classifyArticleNavigationLink(link, url);
            const context = getArticleJourneyContext();
            if (!journey || !context) return;

            const params = {
                source_path: pathname,
                component: journey.component,
                locale: context.locale,
                article_role: context.article_role,
                article_category: context.article_category,
                destination_type: classifyArticleDestination(url, journey.component)
            };
            if (journey.link_position !== null) params.link_position = journey.link_position;
            if (url.origin === window.location.origin) params.target_path = url.pathname;
            track('article_navigation_click', params);
        });
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
    installArticleJourneyTracking();
    if (window.document && typeof window.document.addEventListener === 'function') {
        window.document.addEventListener('playpoint:consent-ready', flushPending);
        window.document.addEventListener('playpoint:consent-updated', flushPending);
    }
})();