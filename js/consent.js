'use strict';

(() => {
    if (window.PlayPointConsent) return;

    const callbacks = new Set();
    const EEA_UK_CH_REGIONS = [
        'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
        'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT',
        'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];
    let status = 'pending';
    let tcfListenerAttached = false;
    let tcfObserved = false;
    let consentState = Object.freeze({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
    });

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };

    // 対象地域外は通常動作。EEA・英国・スイスはCMP更新まで保存を拒否する。
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

    function flushCallbacks() {
        if (status !== 'granted') return;
        for (const callback of callbacks) {
            try { callback(); } catch (error) { console.error('同意後の処理に失敗しました。', error); }
        }
        callbacks.clear();
    }

    function dispatchStatus(source) {
        document.dispatchEvent(new CustomEvent('playpoint:consent-updated', {
            detail: { status, source, consent: { ...consentState } }
        }));
    }

    function applyConsentState(nextState, source) {
        consentState = Object.freeze({ ...nextState });
        status = consentState.analytics_storage === 'granted' ? 'granted' : 'denied';
        window.gtag('consent', 'update', consentState);
        flushCallbacks();
        dispatchStatus(source);
    }

    function buildTcfConsentState(tcData) {
        if (tcData.gdprApplies === false) {
            return {
                analytics_storage: 'granted', ad_storage: 'granted',
                ad_user_data: 'granted', ad_personalization: 'granted'
            };
        }
        const consents = tcData.purpose?.consents || {};
        const storageAllowed = consents[1] === true;
        const personalizedAdsAllowed = storageAllowed && consents[3] === true && consents[4] === true;
        return {
            analytics_storage: storageAllowed ? 'granted' : 'denied',
            ad_storage: storageAllowed ? 'granted' : 'denied',
            // Purpose 1だけで広告ユーザーデータ/パーソナライズまで許可しない。
            ad_user_data: personalizedAdsAllowed ? 'granted' : 'denied',
            ad_personalization: personalizedAdsAllowed ? 'granted' : 'denied'
        };
    }

    function handleTcfData(tcData, success) {
        if (!success || !tcData) return;
        if (!['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return;
        tcfObserved = true;
        applyConsentState(buildTcfConsentState(tcData), 'tcf');
    }

    function attachTcfListener() {
        if (tcfListenerAttached || typeof window.__tcfapi !== 'function') return false;
        tcfListenerAttached = true;
        window.__tcfapi('addEventListener', 2, handleTcfData);
        return true;
    }

    function settleWithoutTcf() {
        if (tcfObserved || tcfListenerAttached) return;
        // TCF APIがない地域では内部処理を許可するが、Consent Modeのupdateは送らない。
        // これによりGoogle側の地域別default（EEA等はdenied）を上書きしない。
        status = 'granted';
        consentState = Object.freeze({
            analytics_storage: 'granted', ad_storage: 'granted',
            ad_user_data: 'granted', ad_personalization: 'granted'
        });
        flushCallbacks();
        dispatchStatus('no-tcf');
    }

    function waitForTcfApi() {
        if (attachTcfListener()) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (attachTcfListener()) {
                window.clearInterval(timer);
                return;
            }
            if (attempts >= 8) {
                window.clearInterval(timer);
                settleWithoutTcf();
            }
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
        whenGranted(callback) {
            if (typeof callback !== 'function') return;
            if (status === 'granted') callback();
            else callbacks.add(callback);
        },
        getStatus() { return status; },
        getConsentState() { return { ...consentState }; },
        showSettings
    });

    document.dispatchEvent(new CustomEvent('playpoint:consent-ready', { detail: { status } }));
    waitForTcfApi();
})();
