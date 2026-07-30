'use strict';

import { ANALYTICS } from './config.js';

const THRESHOLDS = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25]
};

function getRating(name, value) {
    const thresholds = THRESHOLDS[name];
    if (!thresholds) return 'unknown';
    if (value <= thresholds[0]) return 'good';
    if (value <= thresholds[1]) return 'needs_improvement';
    return 'poor';
}

function getValueBucket(name, value) {
    if (name === 'LCP') {
        if (value <= 2500) return '0_2500';
        if (value <= 4000) return '2501_4000';
        return '4001_plus';
    }
    if (name === 'INP') {
        if (value <= 200) return '0_200';
        if (value <= 500) return '201_500';
        return '501_plus';
    }
    if (name === 'CLS') {
        if (value <= 0.1) return '0_010';
        if (value <= 0.25) return '011_025';
        return '026_plus';
    }
    return 'unknown';
}

function getPageGroup() {
    const path = window.location.pathname;
    if (/^\/(?:en|ko|tw)?\/?$/.test(path)) return 'calculator_home';
    if (path.includes('/articles/')) return 'article';
    if (/\/(?:status|maintenance|campaign|amount)\//.test(path)) return 'intent_landing';
    if (path.includes('/blog/')) return 'article_hub';
    return 'other';
}

function getReleaseVersion() {
    const mainScript = document.querySelector('script[src*="js/main.js?v="]');
    if (!mainScript) return 'unknown';
    try {
        return new URL(mainScript.src, window.location.href).searchParams.get('v') || 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

export function initWebVitalsMonitoring() {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    const values = new Map();
    const sent = new Set();

    const remember = (name, value) => {
        if (!Number.isFinite(value) || value < 0) return;
        values.set(name, value);
    };

    const observe = (type, callback, options = { type, buffered: true }) => {
        try {
            const observer = new PerformanceObserver(list => callback(list.getEntries()));
            observer.observe(options);
        } catch (error) {
            // 未対応ブラウザでは、その指標だけを静かに無効化する。
        }
    };

    observe('largest-contentful-paint', entries => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) remember('LCP', lastEntry.startTime);
    });

    let clsValue = 0;
    observe('layout-shift', entries => {
        for (const entry of entries) {
            if (!entry.hadRecentInput) clsValue += entry.value;
        }
        remember('CLS', clsValue);
    });

    observe('event', entries => {
        for (const entry of entries) {
            if (entry.interactionId && entry.duration > (values.get('INP') || 0)) {
                remember('INP', entry.duration);
            }
        }
    }, { type: 'event', buffered: true, durationThreshold: 40 });

    const send = () => {
        for (const [name, value] of values) {
            if (sent.has(name)) continue;
            sent.add(name);
            ANALYTICS.track('web_vital', {
                metric_name: name,
                metric_rating: getRating(name, value),
                metric_value_bucket: getValueBucket(name, value),
                page_group: getPageGroup(),
                release_version: getReleaseVersion()
            });
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') send();
    });
    window.addEventListener('pagehide', send, { once: true });
}
