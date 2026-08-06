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
            Object.entries(attrs).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    async function loadAnalytics() {
        if (gaLoaded) return;
        try {
            await loadScript(
                ANALYTICS_SCRIPT_SRC,
                { fetchpriority: 'low' }
            );
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag() {
                window.dataLayer.push(arguments);
            };
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);
            if (window.PP_APP && window.PP_APP.ANALYTICS) {
                window.PP_APP.ANALYTICS.flushPending();
            }
            gaLoaded = true;
        } catch (error) {
            console.error('Analytics load failed:', error);
        }
    }

    async function loadAdsense() {
        if (adsLoaded) return;
        try {
            await loadScript(
                ADSENSE_SCRIPT_SRC,
                { crossorigin: 'anonymous', fetchpriority: 'low' }
            );
            adsLoaded = true;
        } catch (error) {
            console.error('AdSense load failed:', error);
        }
    }

    function getCurrentAssetPrefix() {
        let prefix = '/';
        const currentScript = document.currentScript ||
            document.querySelector('script[src*="js/third-party.js"]');
        if (!currentScript || !currentScript.src) return prefix;

        const src = currentScript.getAttribute('src') || '';
        const index = src.indexOf('js/third-party.js');
        if (index !== -1) prefix = src.substring(0, index);
        return prefix;
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
        return ensureConsentManager()
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
        window.setTimeout(() => {
            runWhenIdle(callback);
        }, delay);
    }

    function scheduleThirdPartyLoad() {
        if (thirdPartyScheduled) return;
        thirdPartyScheduled = true;

        const scheduleAfterLoad = () => {
            // 初期表示と最初の操作を優先し、計測と広告は別々に遅延する。
            scheduleDelayedIdleTask(() => {
                void runAfterConsent(loadAnalytics);
            }, ANALYTICS_DELAY_MS);

            // AdSenseタグはGoogle認定CMPにも使われるため読み込み自体は維持する。
            scheduleDelayedIdleTask(() => {
                void loadAdsense();
            }, ADSENSE_DELAY_MS);
        };

        if (document.readyState === 'complete') {
            scheduleAfterLoad();
        } else {
            window.addEventListener('load', scheduleAfterLoad, { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void ensureConsentManager();
            scheduleThirdPartyLoad();
        }, { once: true });
    } else {
        void ensureConsentManager();
        scheduleThirdPartyLoad();
    }
})();
