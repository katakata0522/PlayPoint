'use strict';

(() => {
    if (window.PlayPointConsent) return;

    const analyticsCallbacks = new Set();
    const adCallbacks = new Set();
    const EEA_UK_CH_REGIONS = [
        'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
        'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT',
        'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];
    const PURPOSE_STATUS = Object.freeze({ UNKNOWN: 0, GRANTED: 1, DENIED: 2, NOT_APPLICABLE: 3, NOT_CONFIGURED: 4 });
    const DENIED_STATE = Object.freeze({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });

    let analyticsStatus = 'pending';
    let adStatus = 'pending';
    let source = 'pending';
    let consentState = DENIED_STATE;
    let tcfListenerAttached = false;
    let timeoutId = null;

    // Google tags should read the CMP's TC string directly. This must be set before gtag calls.
    window.gtag_enable_tcf_support = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };

    // Outside regulated regions, keep the existing granted default. In EEA/UK/CH, default to denied
    // until Google Privacy & Messaging / TCF provides the user's choice.
    window.gtag('consent', 'default', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
    });
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        region: EEA_UK_CH_REGIONS,
        wait_for_update: 500
    });

    function flush(callbacks, allowed) {
        if (!allowed) return;
        for (const callback of callbacks) {
            try { callback(); } catch (error) { console.error('同意後の処理に失敗しました。', error); }
        }
        callbacks.clear();
    }

    function dispatchStatus() {
        document.dispatchEvent(new CustomEvent('playpoint:consent-updated', {
            detail: {
                status: analyticsStatus,
                adStatus,
                source,
                consent: { ...consentState }
            }
        }));
    }

    function normalizePurposeStatus(value) {
        if (value === PURPOSE_STATUS.GRANTED || value === PURPOSE_STATUS.NOT_APPLICABLE || value === PURPOSE_STATUS.NOT_CONFIGURED) {
            return 'granted';
        }
        if (value === PURPOSE_STATUS.DENIED) return 'denied';
        return 'pending';
    }

    function hasPendingConsentState(state = consentState) {
        return Object.values(state).some(value => value === 'pending');
    }

    function hasUnresolvedConsent() {
        return analyticsStatus === 'pending'
            || adStatus === 'pending'
            || hasPendingConsentState(consentState);
    }

    function resolvePendingAsDenied(state) {
        return Object.fromEntries(
            Object.entries(state).map(([key, value]) => [key, value === 'pending' ? 'denied' : value])
        );
    }

    function applyConsentState(nextState, nextSource) {
        consentState = Object.freeze({ ...DENIED_STATE, ...nextState });
        source = nextSource;
        analyticsStatus = consentState.analytics_storage === 'granted'
            ? 'granted'
            : (consentState.analytics_storage === 'pending' ? 'pending' : 'denied');
        adStatus = consentState.ad_storage === 'granted'
            ? 'granted'
            : (consentState.ad_storage === 'pending' ? 'pending' : 'denied');
        // UNKNOWN may exist for only one Consent Mode purpose. Keep the safety timer alive
        // until every purpose is resolved so a partial UNKNOWN cannot remain pending forever.
        if (!hasPendingConsentState(consentState)) {
            if (timeoutId !== null) window.clearTimeout(timeoutId);
            timeoutId = null;
        }
        flush(analyticsCallbacks, analyticsStatus === 'granted');
        flush(adCallbacks, adStatus === 'granted');
        dispatchStatus();
    }

    function readGoogleFcConsentMode() {
        if (!window.googlefc || typeof window.googlefc.getGoogleConsentModeValues !== 'function') return false;
        let values;
        try {
            values = window.googlefc.getGoogleConsentModeValues();
        } catch (error) {
            console.warn('Google consent mode values could not be read.', error);
            return false;
        }
        if (!values) return false;
        applyConsentState({
            analytics_storage: normalizePurposeStatus(values.analyticsStoragePurposeConsentStatus),
            ad_storage: normalizePurposeStatus(values.adStoragePurposeConsentStatus),
            ad_user_data: normalizePurposeStatus(values.adUserDataPurposeConsentStatus),
            ad_personalization: normalizePurposeStatus(values.adPersonalizationPurposeConsentStatus)
        }, 'googlefc');
        return true;
    }

    function buildTcfFallbackState(tcData) {
        if (tcData.gdprApplies === false) {
            return {
                analytics_storage: 'granted',
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
            };
        }
        const consents = tcData.purpose?.consents || {};
        const purpose1 = consents[1] === true;
        const purpose3 = consents[3] === true;
        const purpose4 = consents[4] === true;
        const purpose7 = consents[7] === true;
        return {
            analytics_storage: purpose1 ? 'granted' : 'denied',
            ad_storage: purpose1 ? 'granted' : 'denied',
            ad_user_data: purpose1 && purpose7 ? 'granted' : 'denied',
            ad_personalization: purpose1 && purpose3 && purpose4 ? 'granted' : 'denied'
        };
    }

    function handleTcfData(tcData, success) {
        if (!success || !tcData) return;
        if (!['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return;
        // Google Privacy & Messaging values are the preferred source because they already map
        // the CMP decision to Consent Mode purposes. TCF is a conservative fallback only.
        if (readGoogleFcConsentMode()) return;
        applyConsentState(buildTcfFallbackState(tcData), 'tcf-fallback');
    }

    function attachTcfListener() {
        if (tcfListenerAttached || typeof window.__tcfapi !== 'function') return false;
        tcfListenerAttached = true;
        window.__tcfapi('addEventListener', 2, handleTcfData);
        return true;
    }

    function registerGoogleFcListener() {
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push({
            CONSENT_MODE_DATA_READY() {
                readGoogleFcConsentMode();
            }
        });
    }

    function waitForTcfApi() {
        if (attachTcfListener()) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (attachTcfListener() || attempts >= 20) window.clearInterval(timer);
        }, 250);
    }

    function showSettings() {
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push({
            CONSENT_API_READY() {
                if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
            }
        });
        if (typeof window.googlefc.showRevocationMessage === 'function') window.googlefc.showRevocationMessage();
    }

    window.PlayPointConsent = Object.freeze({
        whenAnalyticsGranted(callback) {
            if (typeof callback !== 'function') return;
            if (analyticsStatus === 'granted') callback();
            else analyticsCallbacks.add(callback);
        },
        whenAdsAllowed(callback) {
            if (typeof callback !== 'function') return;
            if (adStatus === 'granted') callback();
            else adCallbacks.add(callback);
        },
        // Backward-compatible alias for analytics callers.
        whenGranted(callback) { this.whenAnalyticsGranted(callback); },
        getStatus() { return analyticsStatus; },
        getAdStatus() { return adStatus; },
        getConsentState() { return { ...consentState }; },
        getSource() { return source; },
        showSettings
    });

    registerGoogleFcListener();
    waitForTcfApi();
    // If GoogleFC/TCF is silent or leaves any purpose UNKNOWN, fail closed only for unresolved
    // internal state after the grace period while preserving already resolved decisions.
    timeoutId = window.setTimeout(() => {
        if (!hasUnresolvedConsent()) return;
        const timeoutSource = source === 'pending' ? 'timeout' : `${source}-timeout`;
        applyConsentState(resolvePendingAsDenied(consentState), timeoutSource);
    }, 5000);

    document.dispatchEvent(new CustomEvent('playpoint:consent-ready', {
        detail: { status: analyticsStatus, adStatus }
    }));
})();
