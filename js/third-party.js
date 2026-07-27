'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';

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
            await loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
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
                `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
                { crossorigin: 'anonymous' }
            );
            adsLoaded = true;
        } catch (error) {
            console.error('AdSense load failed:', error);
        }
    }

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        if (!consentManagerPromise) {
            const currentScript = document.currentScript;
            let prefix = './';
            if (currentScript && currentScript.src) {
                const src = currentScript.getAttribute('src') || '';
                const idx = src.indexOf('js/third-party.js');
                if (idx !== -1) {
                    prefix = src.substring(0, idx);
                }
            } else {
                // Fallback for cases where document.currentScript is null
                if (/\/en(\/|$)/.test(window.location.pathname) || 
                    /\/ko(\/|$)/.test(window.location.pathname) || 
                    /\/tw(\/|$)/.test(window.location.pathname)) {
                    prefix = '../';
                }
            }
            consentManagerPromise = loadScript(`${prefix}js/consent.js?v=20260727a`)
                .then(() => window.PlayPointConsent);
        }
        return consentManagerPromise;
    }

    function runAfterConsent(callback) {
        return ensureConsentManager()
            .then(() => window.PlayPointConsent.whenGranted(callback))
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    // AdSenseタグはGoogle認定CMPの表示にも使われるため、同意モード設定後に読み込む。
    function loadConsentAndAdsense() {
        ensureConsentManager()
            .then(loadAdsense)
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    function scheduleThirdPartyLoad() {
        if (thirdPartyScheduled) return;
        thirdPartyScheduled = true;

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                void runAfterConsent(loadAnalytics);
            }, { timeout: 2500 });
            return;
        }

        setTimeout(() => {
            void runAfterConsent(loadAnalytics);
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadConsentAndAdsense();
            scheduleThirdPartyLoad();
        }, { once: true });
    } else {
        loadConsentAndAdsense();
        scheduleThirdPartyLoad();
    }
})();
