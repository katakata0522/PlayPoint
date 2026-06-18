'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';

    let gaLoaded = false;
    let adsLoaded = false;
    let thirdPartyScheduled = false;
    let adsenseScheduled = false;

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

    // 主機能より先に自動広告を挿入しない。利用開始または十分なスクロール後に一度だけ読み込む。
    function scheduleAdsenseLoad() {
        if (adsenseScheduled) return;
        adsenseScheduled = true;
        window.removeEventListener('scroll', handleAdsenseScroll);
        loadAdsense();
    }

    function handleAdsenseScroll() {
        if (window.scrollY < 600) return;
        scheduleAdsenseLoad();
    }

    function setupAdsenseTriggers() {
        window.addEventListener('playpoint:engaged', scheduleAdsenseLoad, { once: true });
        window.addEventListener('scroll', handleAdsenseScroll, { passive: true });
    }

    function scheduleThirdPartyLoad() {
        if (thirdPartyScheduled) return;
        thirdPartyScheduled = true;

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                loadAnalytics();
            }, { timeout: 2500 });
            return;
        }

        setTimeout(() => {
            loadAnalytics();
        }, 1500);
    }

    setupAdsenseTriggers();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleThirdPartyLoad, { once: true });
    } else {
        scheduleThirdPartyLoad();
    }
})();
