'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    const MANAGED_ADSENSE_SLOT = '8250492620';
    const ANALYTICS_DELAY_MS = 1200;
    const ADSENSE_DELAY_MS = 3000;
    const ANALYTICS_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

    let gaLoaded = false;
    let adsLoaded = false;
    let adsRetryAttempted = false;
    let thirdPartyScheduled = false;
    let consentManagerPromise = null;
    let analyticsCorePromise = null;

    function loadScript(src, attrs = {}) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve(existing);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    function getDisplayMode() {
        if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
        if (window.navigator && window.navigator.standalone === true) return 'standalone';
        return 'browser';
    }

    async function loadAnalytics() {
        if (gaLoaded) return;
        try {
            await ensureAnalyticsCore();
            await loadScript(ANALYTICS_SCRIPT_SRC, { fetchpriority: 'low' });
            window.PlayPointAnalytics.installGtagBridge();
            window.gtag('js', new Date());
            window.gtag('set', { app_display_mode: getDisplayMode() });
            window.gtag('config', GA_MEASUREMENT_ID);
            gaLoaded = true;
            window.PlayPointAnalytics.markAnalyticsReady();
        } catch (error) {
            console.error('Analytics load failed:', error);
        }
    }

    function initializeManagedAds() {
        document.querySelectorAll('.lp-ad-container ins.adsbygoogle, .game-ad-container ins.adsbygoogle').forEach((ad) => {
            if (!ad.dataset.adSlot) ad.dataset.adSlot = MANAGED_ADSENSE_SLOT;
            if (ad.dataset.playpointAdRequested === 'true' || ad.dataset.adsbygoogleStatus) return;
            ad.dataset.playpointAdRequested = 'true';
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
                delete ad.dataset.playpointAdRequested;
                console.error('AdSense slot initialization failed:', error);
            }
        });
    }

    async function loadAdsense() {
        if (adsLoaded) return;
        try {
            await loadScript(ADSENSE_SCRIPT_SRC, { crossorigin: 'anonymous' });
            adsLoaded = true;
        } catch (error) {
            console.error('AdSense load failed:', error);
            if (!adsRetryAttempted) {
                adsRetryAttempted = true;
                window.setTimeout(() => void loadAdsense(), ADSENSE_DELAY_MS);
            }
        }
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
            analyticsCorePromise = loadScript(`${prefix}js/analytics-core.js?v=01921e4cd4`).then(() => window.PlayPointAnalytics);
        }
        return analyticsCorePromise;
    }

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        if (!consentManagerPromise) {
            const prefix = getCurrentAssetPrefix();
            consentManagerPromise = loadScript(`${prefix}js/consent.js?v=782a530308`).then(() => window.PlayPointConsent);
        }
        return consentManagerPromise;
    }

    function runAfterConsent(callback, purpose = 'analytics') {
        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])
            .then(() => {
                const consent = window.PlayPointConsent;
                if (purpose === 'ads' && typeof consent.whenAdsAllowed === 'function') {
                    consent.whenAdsAllowed(callback);
                    return;
                }
                if (typeof consent.whenAnalyticsGranted === 'function') {
                    consent.whenAnalyticsGranted(callback);
                    return;
                }
                consent.whenGranted(callback);
            })
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

        // Load the async AdSense library early so Google Privacy & Messaging / TCF can initialize.
        // Manual ad-slot requests remain gated by ad_storage consent below.
        void loadAdsense();
        void runAfterConsent(initializeManagedAds, 'ads');

        const scheduleAfterLoad = () => {
            scheduleDelayedIdleTask(() => void runAfterConsent(loadAnalytics, 'analytics'), ANALYTICS_DELAY_MS);
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
