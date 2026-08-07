'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    const ANALYTICS_DELAY_MS = 1200;
    const ADSENSE_DELAY_MS = 3000;
    const ANALYTICS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

    let gaLoaded = false;
    let adsLoaded = false;
    let thirdPartyScheduled = false;
    let consentManagerPromise = null;
    let analyticsCorePromise = null;

    function loadScript(src, attrs = {}) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.dataset.loaded === 'true' || existing.src.includes('googletagmanager.com')) {
                    resolve(existing);
                    return;
                }
                existing.addEventListener('load', () => resolve(existing), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve(script);
            };
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    function getCurrentAssetPrefix() {
        let prefix = '/';
        const currentScript = document.currentScript || document.querySelector('script[src*="js/third-party.js"]');
        if (!currentScript || !currentScript.src) return prefix;
        const src = currentScript.getAttribute('src') || '';
        const index = src.indexOf('js/third-party.js');
        if (index !== -1) prefix = src.substring(0, index);
        return prefix;
    }

    function ensureAnalyticsCore() {
        if (window.PlayPointAnalytics) return Promise.resolve(window.PlayPointAnalytics);
        if (!analyticsCorePromise) {
            const prefix = getCurrentAssetPrefix();
            analyticsCorePromise = loadScript(`${prefix}js/analytics-core.js?v=20260807a`)
                .then(() => window.PlayPointAnalytics);
        }
        return analyticsCorePromise;
    }

    async function loadAnalytics() {
        if (gaLoaded) return;
        try {
            await ensureAnalyticsCore();
            window.PlayPointAnalytics.installGtagBridge();
            await loadScript(ANALYTICS_SCRIPT_SRC, { fetchpriority: 'low' });
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);
            if (window.PP_APP && window.PP_APP.ANALYTICS) window.PP_APP.ANALYTICS.flushPending();
            gaLoaded = true;
        } catch (error) {
            console.error('Analytics load failed:', error);
        }
    }

    async function loadAdsense() {
        if (adsLoaded) return;
        try {
            await loadScript(ADSENSE_SCRIPT_SRC, { crossorigin: 'anonymous', fetchpriority: 'low' });
            adsLoaded = true;
        } catch (error) {
            console.error('AdSense load failed:', error);
        }
    }

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        if (!consentManagerPromise) {
            const prefix = getCurrentAssetPrefix();
            consentManagerPromise = loadScript(`${prefix}js/consent.js?v=55813d3bcb`)
                .then(() => window.PlayPointConsent);
        }
        return consentManagerPromise;
    }

    function runAfterConsent(callback) {
        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])
            .then(() => window.PlayPointConsent.whenGranted(callback))
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    function runWhenIdle(callback, timeout = 2000) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout });
            return;
        }
        window.setTimeout(callback, Math.min(timeout, 1200));
    }

    function scheduleDelayedIdleTask(callback, delay) {
        window.setTimeout(() => runWhenIdle(callback), delay);
    }

    function scheduleThirdPartyLoad() {
        if (thirdPartyScheduled) return;
        thirdPartyScheduled = true;
        const scheduleAfterLoad = () => {
            scheduleDelayedIdleTask(() => void runAfterConsent(loadAnalytics), ANALYTICS_DELAY_MS);
            scheduleDelayedIdleTask(() => void loadAdsense(), ADSENSE_DELAY_MS);
        };
        if (document.readyState === 'complete') scheduleAfterLoad();
        else window.addEventListener('load', scheduleAfterLoad, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void ensureAnalyticsCore();
            void ensureConsentManager();
            scheduleThirdPartyLoad();
        }, { once: true });
    } else {
        void ensureAnalyticsCore();
        void ensureConsentManager();
        scheduleThirdPartyLoad();
    }
})();
