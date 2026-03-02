'use strict';

(() => {
    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';

    let gaLoaded = false;
    let adsLoaded = false;

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

    function onFirstInteraction() {
        // ユーザー操作後に広告系を読み込んで初期表示を高速化
        loadAdsense();
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
        window.removeEventListener('touchstart', onFirstInteraction);
        window.removeEventListener('scroll', onFirstInteraction);
    }

    // 計測は軽量なのでアイドル時に先行ロード
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
            loadAnalytics();
        }, { timeout: 3000 });
    } else {
        setTimeout(() => {
            loadAnalytics();
        }, 3000);
    }

    // 広告は操作後ロード。無操作でも一定時間後に遅延ロード。
    window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
    window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });

    setTimeout(() => {
        if (!adsLoaded) loadAdsense();
    }, 15000);
})();

