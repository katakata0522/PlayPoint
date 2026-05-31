'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';

    let gaLoaded = false;
    let adsLoaded = false;
    let interactionHandled = false;
    let analyticsScheduled = false;

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

    function scheduleAnalyticsLoad() {
        if (analyticsScheduled || gaLoaded) return;
        analyticsScheduled = true;

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

    function loadThirdPartyAfterInteraction() {
        if (interactionHandled) return;
        interactionHandled = true;

        // 初回操作後に第三者スクリプトを段階的に読み込み、初期描画への影響を抑える
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                loadAnalytics();
            }, { timeout: 1500 });
            window.requestIdleCallback(() => {
                loadAdsense();
            }, { timeout: 3000 });
            return;
        }

        setTimeout(() => {
            loadAnalytics();
        }, 800);
        setTimeout(() => {
            loadAdsense();
        }, 1800);
    }

    // Analytics は離脱前の取りこぼしを減らすため、待機時にも読み込む
    scheduleAnalyticsLoad();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            loadAnalytics();
        }
    }, { once: true });

    // AdSense は操作が見えてから読み込む
    window.addEventListener('pointerdown', loadThirdPartyAfterInteraction, { once: true, passive: true });
    window.addEventListener('keydown', loadThirdPartyAfterInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', loadThirdPartyAfterInteraction, { once: true, passive: true });
    window.addEventListener('wheel', loadThirdPartyAfterInteraction, { once: true, passive: true });
    window.addEventListener('scroll', loadThirdPartyAfterInteraction, { once: true, passive: true });
})();
