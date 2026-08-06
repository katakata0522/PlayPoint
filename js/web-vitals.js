'use strict';

import { ANALYTICS } from './config.js';

const METRIC_DEFINITIONS = Object.freeze({
    LCP: Object.freeze({ thresholds: Object.freeze([2500, 4000]), buckets: Object.freeze(['0_2500', '2501_4000', '4001_plus']) }),
    INP: Object.freeze({ thresholds: Object.freeze([200, 500]), buckets: Object.freeze(['0_200', '201_500', '501_plus']) }),
    CLS: Object.freeze({ thresholds: Object.freeze([0.1, 0.25]), buckets: Object.freeze(['0_010', '011_025', '026_plus']) })
});

function getMetricDefinition(name) {
    return METRIC_DEFINITIONS[name] || null;
}

function getRating(name, value) {
    const definition = getMetricDefinition(name);
    if (!definition) return 'unknown';
    if (value <= definition.thresholds[0]) return 'good';
    if (value <= definition.thresholds[1]) return 'needs_improvement';
    return 'poor';
}

function getValueBucket(name, value) {
    const definition = getMetricDefinition(name);
    if (!definition) return 'unknown';
    if (value <= definition.thresholds[0]) return definition.buckets[0];
    if (value <= definition.thresholds[1]) return definition.buckets[1];
    return definition.buckets[2];
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
        const pageGroup = getPageGroup();
        const releaseVersion = getReleaseVersion();
        for (const [name, value] of values) {
            if (sent.has(name)) continue;
            sent.add(name);
            ANALYTICS.track('web_vital', {
                metric_name: name,
                metric_rating: getRating(name, value),
                metric_value_bucket: getValueBucket(name, value),
                page_group: pageGroup,
                release_version: releaseVersion
            });
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') send();
    });
    window.addEventListener('pagehide', send, { once: true });
}
