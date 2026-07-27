'use strict';

(() => {
    if (window.PlayPointConsent) return;

    const callbacks = new Set();
    const EEA_UK_CH_REGIONS = [
        'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
        'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT',
        'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];
    let status = 'granted';
    let tcfListenerAttached = false;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };

    // 対象地域外では通常動作、EEA・英国・スイスではCMPの回答まで保存を拒否する。
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
            try {
                callback();
            } catch (error) {
                console.error('同意後の処理に失敗しました。', error);
            }
        }
        callbacks.clear();
    }

    function applyStatus(nextStatus) {
        status = nextStatus === 'granted' ? 'granted' : 'denied';
        const value = status;
        window.gtag('consent', 'update', {
            analytics_storage: value,
            ad_storage: value,
            ad_user_data: value,
            ad_personalization: value
        });
        flushCallbacks();
        document.dispatchEvent(new CustomEvent('playpoint:consent-updated', {
            detail: { status }
        }));
    }

    function handleTcfData(tcData, success) {
        if (!success || !tcData) return;
        if (!['tcloaded', 'useractioncomplete'].includes(tcData.eventStatus)) return;

        const purposeOneAllowed = tcData.purpose?.consents?.[1] === true;
        const gdprApplies = tcData.gdprApplies !== false;
        applyStatus(!gdprApplies || purposeOneAllowed ? 'granted' : 'denied');
    }

    function attachTcfListener() {
        if (tcfListenerAttached || typeof window.__tcfapi !== 'function') return false;
        tcfListenerAttached = true;
        window.__tcfapi('addEventListener', 2, handleTcfData);
        return true;
    }

    function waitForTcfApi() {
        if (attachTcfListener()) return;
        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            if (attachTcfListener() || attempts >= 40) {
                window.clearInterval(timer);
            }
        }, 250);
    }

    function showSettings() {
        window.googlefc = window.googlefc || {};
        window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push({
            CONSENT_API_READY() {
                if (typeof window.googlefc.showRevocationMessage === 'function') {
                    window.googlefc.showRevocationMessage();
                }
            }
        });
        if (typeof window.googlefc.showRevocationMessage === 'function') {
            window.googlefc.showRevocationMessage();
        }
    }

    window.PlayPointConsent = {
        whenGranted(callback) {
            if (typeof callback !== 'function') return;
            if (status === 'granted') callback();
            else callbacks.add(callback);
        },
        getStatus() {
            return status;
        },
        showSettings
    };

    document.dispatchEvent(new CustomEvent('playpoint:consent-ready'));
    flushCallbacks();
    waitForTcfApi();
})();
