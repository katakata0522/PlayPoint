/**
 * GravityTodo — ConsentManager
 * Google Analytics / AdSense を同意後のみ読み込む安全な仕組み。
 *
 * 設計方針:
 *   - 初回訪問時はバナーを表示し、同意前はGA/AdSenseを一切読み込まない
 *   - 「同意する」クリック後、初めてスクリプトを動的に読み込む
 *   - 「拒否する」またはEscキーで閉じた場合はスクリプトを読み込まない
 *   - 選択内容はlocalStorageに保存し、次回訪問時はバナーを表示しない
 */
(function (global) {
    'use strict';

    const CONSENT_KEY = 'gravityTodo:consent:v1';
    // GA4を使う場合だけ実IDを設定する。未設定時はAdSenseのみ読み込む。
    const GA_MEASUREMENT_ID = '';
    const ADSENSE_CLIENT_ID = 'ca-pub-3845885843809455';

    function isConfiguredGaId(id) {
        return /^G-[A-Z0-9]+$/.test(id);
    }

    // ============================================================
    // スクリプトローダ
    // ============================================================
    function createScriptLoader(timeoutMs) {
        const registry = new Map();

        return function loadScript(key, src, options) {
            options = options || {};
            const existing = registry.get(key);
            if (existing && existing.status === 'loaded') {
                return Promise.resolve();
            }
            if (existing && existing.status === 'loading') {
                return existing.promise;
            }

            const record = { status: 'loading', promise: null };

            record.promise = new Promise(function (resolve, reject) {
                const stale = document.querySelector('script[data-cm-key="' + key + '"]');
                if (stale) stale.remove();

                const script = document.createElement('script');
                let settled = false;

                script.src = src;
                script.async = true;
                script.dataset.cmKey = key;
                if (options.crossOrigin) script.crossOrigin = options.crossOrigin;

                function finalize(status, err) {
                    if (settled) return;
                    settled = true;
                    record.status = status;
                    if (status === 'loaded') {
                        resolve();
                    } else {
                        script.remove();
                        reject(err || new Error('load_failed:' + key));
                    }
                }

                script.addEventListener('load', function () { finalize('loaded'); }, { once: true });
                script.addEventListener('error', function () { finalize('error'); }, { once: true });
                setTimeout(function () { finalize('error', new Error('load_timeout:' + key)); }, timeoutMs);

                document.head.appendChild(script);
            }).catch(function (err) {
                record.status = 'error';
                throw err;
            });

            registry.set(key, record);
            return record.promise;
        };
    }

    const loadScript = createScriptLoader(12000);

    // ============================================================
    // ConsentManager 本体
    // ============================================================
    function ConsentManager(opts) {
        this.banner = opts.banner;
        this.acceptBtn = opts.acceptBtn;
        this.rejectBtn = opts.rejectBtn;
        this.settingsBtn = opts.settingsBtn;

        this._isOpen = false;
        this._prevFocus = null;
        this._gaConfigured = false;
        this._adsenseLoaded = false;
        this._loading = false;

        this._onKeydown = this._handleKeydown.bind(this);
    }

    /**
     * 初期化 — DOMContentLoaded後に呼ぶこと
     */
    ConsentManager.prototype.init = function () {
        // Consent Mode のデフォルトを「拒否」で設定
        this._initConsentDefaults();

        // ボタンのイベント登録
        var self = this;
        if (this.acceptBtn) {
            this.acceptBtn.addEventListener('click', function () { self._handleAccept(); });
        }
        if (this.rejectBtn) {
            this.rejectBtn.addEventListener('click', function () { self._handleReject(); });
        }
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', function () { self._openBanner(); });
        }

        // 保存済み選択を確認
        var saved = this._getSaved();
        if (saved === 'granted') {
            this._applyConsent('granted');
            this._loadMarketingScripts().catch(function (e) {
                console.warn('[ConsentManager] スクリプト読込失敗:', e);
            });
            return; // バナーを表示しない
        }
        if (saved === 'denied') {
            this._applyConsent('denied');
            return; // バナーを表示しない
        }

        // 初回訪問：バナーを表示
        this._openBanner();
    };

    ConsentManager.prototype._initConsentDefaults = function () {
        global.dataLayer = global.dataLayer || [];
        if (!global.gtag) {
            global.gtag = function () { global.dataLayer.push(arguments); };
        }
        global.gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
        });
    };

    ConsentManager.prototype._applyConsent = function (status) {
        var granted = status === 'granted';
        global.gtag('consent', 'update', {
            ad_storage: granted ? 'granted' : 'denied',
            analytics_storage: granted ? 'granted' : 'denied',
            ad_user_data: granted ? 'granted' : 'denied',
            ad_personalization: granted ? 'granted' : 'denied'
        });
        global.adsbygoogle = global.adsbygoogle || [];
        global.adsbygoogle.requestNonPersonalizedAds = granted ? 0 : 1;
    };

    ConsentManager.prototype._loadMarketingScripts = function () {
        if (this._loading) return Promise.resolve();
        this._loading = true;
        var self = this;

        var gaPromise = Promise.resolve();
        if (isConfiguredGaId(GA_MEASUREMENT_ID)) {
            gaPromise = loadScript('ga4', 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID);
        }

        return gaPromise
            .then(function () {
                if (!self._gaConfigured) {
                    if (isConfiguredGaId(GA_MEASUREMENT_ID)) {
                        global.gtag('js', new Date());
                        global.gtag('config', GA_MEASUREMENT_ID);
                    }
                    self._gaConfigured = true;
                }
                if (!self._adsenseLoaded) {
                    return loadScript(
                        'adsense',
                        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT_ID,
                        { crossOrigin: 'anonymous' }
                    ).then(function () {
                        self._adsenseLoaded = true;
                    });
                }
            })
            .finally(function () {
                self._loading = false;
            });
    };

    ConsentManager.prototype._handleAccept = function () {
        this._applyConsent('granted');
        this._save('granted');
        this._closeBanner();
        this._loadMarketingScripts().catch(function (e) {
            console.warn('[ConsentManager] スクリプト読込失敗:', e);
        });
    };

    ConsentManager.prototype._handleReject = function () {
        this._applyConsent('denied');
        this._save('denied');
        this._closeBanner();
    };

    ConsentManager.prototype._getSaved = function () {
        try {
            var raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (parsed && (parsed.status === 'granted' || parsed.status === 'denied')) {
                return parsed.status;
            }
        } catch (e) { /* 無視 */ }
        return null;
    };

    ConsentManager.prototype._save = function (status) {
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify({
                status: status,
                updatedAt: new Date().toISOString()
            }));
        } catch (e) { /* 無視 */ }
    };

    ConsentManager.prototype._openBanner = function () {
        if (!this.banner || this._isOpen) return;
        this._prevFocus = document.activeElement;
        this.banner.classList.remove('cm-banner--hidden');
        this.banner.setAttribute('aria-hidden', 'false');
        this._isOpen = true;
        document.addEventListener('keydown', this._onKeydown);
        if (this.acceptBtn) this.acceptBtn.focus();
    };

    ConsentManager.prototype._closeBanner = function () {
        if (!this.banner) return;
        this.banner.classList.add('cm-banner--hidden');
        this.banner.setAttribute('aria-hidden', 'true');
        var wasOpen = this._isOpen;
        this._isOpen = false;
        document.removeEventListener('keydown', this._onKeydown);
        if (wasOpen && this._prevFocus instanceof HTMLElement) {
            this._prevFocus.focus();
        }
    };

    ConsentManager.prototype._handleKeydown = function (e) {
        if (!this._isOpen || !this.banner) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            this._handleReject();
        }
    };

    // グローバルに公開
    global.ConsentManager = ConsentManager;

})(window);
