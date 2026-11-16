'use strict';

(() => {
    if (window.PlayPointAdPrivacy) return;

    const Url = window.URL;
    let paused = false;
    let monitoring = false;

    function hasPrivateContext(raw, allowEmpty = false) {
        if (allowEmpty && raw === '') return false;
        if (typeof raw !== 'string' || typeof Url !== 'function') return true;
        try {
            const url = new Url(raw);
            return !['http:', 'https:'].includes(url.protocol)
                || Boolean(url.username || url.password || url.search || url.hash);
        } catch {
            return true;
        }
    }

    function protect(nextUrl) {
        try {
            paused = paused || hasPrivateContext(window.location.href)
                || hasPrivateContext(document.referrer, true);
            if (nextUrl != null) {
                // native historyへ渡す値を二重に文字列化しない。未知の型は広告だけ保留する。
                paused = paused || typeof nextUrl !== 'string'
                    || hasPrivateContext(new Url(nextUrl, window.location.href).href);
            }
        } catch {
            paused = true;
        }
        if (!paused) return true;
        try {
            // Google公式API。入力をURLに残すページでは、このdocument中は再開しない。
            // https://support.google.com/adsense/answer/7670312
            (window.adsbygoogle = window.adsbygoogle || []).pauseAdRequests = 1;
            return true;
        } catch {
            return false;
        }
    }

    try {
        for (const name of ['pushState', 'replaceState']) {
            const original = window.history[name];
            if (typeof original !== 'function') throw new Error('history unavailable');
            const wrapped = function (state, title, url) {
                // Google側のhistory監視へ生のURLが渡る前に保留する。
                if (!protect(url)) throw new Error('広告URLを保護できないため履歴更新を中止しました。');
                return original.apply(this, arguments);
            };
            window.history[name] = wrapped;
            if (window.history[name] !== wrapped) throw new Error('history unavailable');
        }
        for (const name of ['popstate', 'pageshow', 'hashchange']) {
            window.addEventListener(name, () => protect());
        }
        for (const name of ['playpoint:consent-ready', 'playpoint:consent-updated']) {
            document.addEventListener(name, () => protect());
        }
        monitoring = true;
    } catch {
        // URL遷移を監視できない環境でも、CMP用ライブラリは保留状態で起動できる。
        paused = true;
    }

    protect();
    window.PlayPointAdPrivacy = Object.freeze({
        protect,
        getState() { return { paused, monitoring }; }
    });
})();
