'use strict';

(() => {
    const eventCommand = 'event';
    const allowedParams = {
        lp_to_calculator_clicked: ['source_path', 'entry_campaign', 'link_context'],
        lp_related_link_clicked: ['source_path', 'target_path', 'link_context']
    };

    function sanitizeValue(key, value) {
        if (value === undefined || value === null || value === '') return null;
        let text = String(value).trim();
        if (!text) return null;
        if (key.endsWith('_path')) {
            try {
                text = new URL(text, window.location.origin).pathname;
            } catch (error) {
                return null;
            }
        }
        return text.replace(/[<>"']/g, '').slice(0, 120);
    }

    function sanitizeParams(eventName, params) {
        const allowed = allowedParams[eventName];
        if (!allowed) return null;
        return allowed.reduce((clean, key) => {
            const value = sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    }

    function track(eventName, params) {
        if (!window.PlayPointConsent || window.PlayPointConsent.getStatus() !== 'granted') return;
        if (typeof window.gtag !== 'function') return;
        const cleanParams = sanitizeParams(eventName, params || {});
        if (!cleanParams) return;
        window.gtag(eventCommand, eventName, cleanParams);
    }

    function getLinkContext(link, url) {
        const campaign = url.searchParams.get('utm_campaign') || '';
        if (campaign.endsWith('_mid')) return 'mid_cta';
        if (link.closest('.lp-action-row')) return 'hero_cta';
        if (link.closest('.lp-related-list')) return 'related_link';
        return 'inline_link';
    }

    document.addEventListener('click', (event) => {
        const link = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('a[href]')
            : null;
        if (!link) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const linkContext = getLinkContext(link, url);
        if (url.pathname === '/' && url.searchParams.get('utm_source') === 'lp') {
            track('lp_to_calculator_clicked', {
                source_path: window.location.pathname,
                entry_campaign: url.searchParams.get('utm_campaign') || '',
                link_context: linkContext
            });
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
