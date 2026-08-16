'use strict';

(() => {
    function track(eventName, params) {
        if (!window.PlayPointAnalytics) return;
        window.PlayPointAnalytics.track(eventName, params || {});
    }

    function getLinkContext(link) {
        if (link.closest('.lp-mid-cta')) return 'mid_cta';
        if (link.closest('.lp-action-row')) return 'hero_cta';
        if (link.closest('.lp-related-list')) return 'related_link';
        return 'inline_link';
    }

    function getSourceSurface() {
        const segments = window.location.pathname.split('/').filter(Boolean);
        return segments.slice(-2).join('_') || 'home';
    }

    function isCalculatorDestination(url) {
        return ['/', '/en/', '/ko/', '/tw/'].includes(url.pathname);
    }

    document.addEventListener('click', (event) => {
        const link = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('a[href]')
            : null;
        if (!link) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const linkContext = getLinkContext(link);
        if (isCalculatorDestination(url) && linkContext !== 'related_link') {
            const context = {
                source_path: window.location.pathname,
                source_surface: getSourceSurface(),
                link_context: linkContext
            };
            if (window.PlayPointAnalytics) {
                window.PlayPointAnalytics.rememberCalculatorEntry(url, context);
            }
            track('lp_to_calculator_clicked', context);
            return;
        }

        if (linkContext === 'related_link') {
            track('lp_related_link_clicked', {
                source_path: window.location.pathname,
                target_path: url.pathname,
                link_context: linkContext
            });
        }
    });
})();