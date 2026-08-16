'use strict';

import { isEnglishPath, isKoreanPath, isTaiwanPath } from './region-navigation.js';

function runWhenIdle(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(callback, { timeout });
        return;
    }
    window.setTimeout(callback, Math.min(timeout, 1200));
}

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        runWhenIdle(() => {
            const swPath = (isEnglishPath() || isKoreanPath() || isTaiwanPath()) ? '../sw.js' : './sw.js';
            navigator.serviceWorker.register(swPath, { updateViaCache: 'none' })
                .then((reg) => {
                    console.log('ServiceWorker registered successfully:', reg.scope);
                    void reg.update().catch(err => console.warn('ServiceWorker update check failed:', err));
                })
                .catch(err => console.error('ServiceWorker registration failed:', err));
        });
    });
}