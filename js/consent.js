'use strict';

(() => {
    if (window.PlayPointConsent) return;

    const STORAGE_KEY = 'playpoint:consent:v1';
    const callbacks = new Set();
    let status = null;
    let banner = null;
    let previousFocus = null;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });

    function readSavedStatus() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return saved?.status === 'granted' || saved?.status === 'denied' ? saved.status : null;
        } catch (error) {
            console.warn('同意設定を読み込めませんでした。', error);
            return null;
        }
    }

    function saveStatus(nextStatus) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                status: nextStatus,
                updatedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('同意設定を保存できませんでした。', error);
        }
    }

    function applyStatus(nextStatus) {
        status = nextStatus;
        const value = status === 'granted' ? 'granted' : 'denied';
        window.gtag('consent', 'update', {
            analytics_storage: value,
            ad_storage: value,
            ad_user_data: value,
            ad_personalization: value
        });

        if (status === 'granted') {
            for (const callback of callbacks) {
                try {
                    callback();
                } catch (error) {
                    console.error('同意後の処理に失敗しました。', error);
                }
            }
            callbacks.clear();
        }
    }

    function closeBanner() {
        if (!banner) return;
        banner.hidden = true;
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }

    function choose(nextStatus) {
        applyStatus(nextStatus);
        saveStatus(nextStatus);
        closeBanner();
    }

    function openBanner() {
        if (!banner) return;
        previousFocus = document.activeElement;
        banner.hidden = false;
        banner.querySelector('[data-consent-accept]')?.focus();
    }

    function mountUi() {
        if (document.getElementById('playpoint-consent-banner')) return;
        const lang = document.documentElement.lang.toLowerCase();
        let copy;
        if (lang.startsWith('en')) {
            copy = {
                settings: 'Privacy settings',
                title: 'Analytics and advertising settings',
                body: 'With your permission, we use Google Analytics and AdSense to improve this site and display ads. You can change this choice later.',
                reject: 'Reject',
                accept: 'Allow'
            };
        } else if (lang.startsWith('ko')) {
            copy = {
                settings: '개인정보 설정',
                title: '액세스 분석 및 광고 설정',
                body: '사이트 개선과 광고 표시를 위해, 동의하신 경우에만 Google Analytics와 AdSense를 사용합니다. 선택은 나중에 변경할 수 있습니다.',
                reject: '거부',
                accept: '동의'
            };
        } else if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk')) {
            copy = {
                settings: '隱私權設定',
                title: '流量分析與廣告設定',
                body: '為了改善網站與顯示廣告，僅在您同意的情況下使用 Google Analytics 和 AdSense。您可以在日後隨時更改此選擇。',
                reject: '拒絕',
                accept: '同意'
            };
        } else {
            copy = {
                settings: 'プライバシー設定',
                title: 'アクセス解析・広告の設定',
                body: 'サイト改善と広告表示のため、同意いただいた場合のみGoogle AnalyticsとAdSenseを使用します。選択は後から変更できます。',
                reject: '拒否する',
                accept: '同意する'
            };
        }

        const style = document.createElement('style');
        style.textContent = `
            .pp-consent-settings{position:fixed;left:12px;bottom:12px;z-index:9998;border:1px solid #64748b;border-radius:999px;padding:8px 12px;background:#111827;color:#f8fafc;font:600 12px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.24)}
            .pp-consent{position:fixed;inset:auto 12px 12px;z-index:9999;max-width:680px;margin:auto;padding:18px;border:1px solid #64748b;border-radius:14px;background:#111827;color:#f8fafc;box-shadow:0 12px 40px rgba(0,0,0,.45);font:14px/1.6 system-ui,sans-serif}
            .pp-consent[hidden]{display:none}.pp-consent h2{color:#f8fafc;margin:0 0 6px;font-size:17px}.pp-consent p{margin:0;color:#cbd5e1}.pp-consent__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.pp-consent button{min-height:44px;border-radius:9px;padding:8px 16px;font:700 14px/1 system-ui,sans-serif;cursor:pointer}.pp-consent__reject{border:1px solid #94a3b8;background:transparent;color:#f8fafc}.pp-consent__accept{border:1px solid #60a5fa;background:#2563eb;color:#fff}
            @media(max-width:480px){.pp-consent{inset:auto 8px 8px;padding:16px}.pp-consent__actions{display:grid;grid-template-columns:1fr 1fr}.pp-consent button{width:100%}}
        `;
        document.head.appendChild(style);

        const settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.className = 'pp-consent-settings';
        settingsButton.textContent = copy.settings;
        settingsButton.addEventListener('click', openBanner);

        banner = document.createElement('section');
        banner.id = 'playpoint-consent-banner';
        banner.className = 'pp-consent';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-modal', 'true');
        banner.setAttribute('aria-labelledby', 'playpoint-consent-title');
        banner.innerHTML = `<h2 id="playpoint-consent-title"></h2><p></p><div class="pp-consent__actions"><button type="button" class="pp-consent__reject" data-consent-reject></button><button type="button" class="pp-consent__accept" data-consent-accept></button></div>`;
        banner.querySelector('h2').textContent = copy.title;
        banner.querySelector('p').textContent = copy.body;
        banner.querySelector('[data-consent-reject]').textContent = copy.reject;
        banner.querySelector('[data-consent-accept]').textContent = copy.accept;
        banner.querySelector('[data-consent-reject]').addEventListener('click', () => choose('denied'));
        banner.querySelector('[data-consent-accept]').addEventListener('click', () => choose('granted'));
        banner.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') choose('denied');
            if (event.key === 'Tab') {
                const focusables = banner.querySelectorAll('button');
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (event.shiftKey) {
                    if (document.activeElement === first) {
                        last.focus();
                        event.preventDefault();
                    }
                } else {
                    if (document.activeElement === last) {
                        first.focus();
                        event.preventDefault();
                    }
                }
            }
        });

        document.body.append(settingsButton, banner);
        if (status === null) openBanner();
        else closeBanner();
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
        showSettings: openBanner
    };
    document.dispatchEvent(new CustomEvent('playpoint:consent-ready'));

    const savedStatus = readSavedStatus();
    if (savedStatus) applyStatus(savedStatus);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountUi, { once: true });
    } else {
        mountUi();
    }
})();
