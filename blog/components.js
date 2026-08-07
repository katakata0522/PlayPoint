(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    const ROOT_PATH = '/';
    const isArticlePage = window.location.pathname.includes('/articles/');
    const isBlogPage = window.location.pathname.includes('/blog');
    let analyticsCorePromise;
    let consentManagerPromise;
    let blogAdsenseLoaded = false;

    function loadScriptOnce(src) {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing && existing.dataset.loaded === 'true') return Promise.resolve(existing);
        if (existing) {
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', () => resolve(existing), { once: true });
                existing.addEventListener('error', reject, { once: true });
            });
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve(script);
            }, { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.appendChild(script);
        });
    }

    function ensureStylesheet(href, marker) {
        if (document.querySelector(`link[data-${marker}]`)) return;
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = href;
        stylesheet.dataset[marker] = 'true';
        document.head.appendChild(stylesheet);
    }

    function ensureAnalyticsCore() {
        if (window.PlayPointAnalytics) return Promise.resolve(window.PlayPointAnalytics);
        analyticsCorePromise ||= loadScriptOnce('/js/analytics-core.js?v=20260807a')
            .then(() => window.PlayPointAnalytics);
        return analyticsCorePromise;
    }

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        consentManagerPromise ||= loadScriptOnce('/js/consent.js?v=55813d3bcb')
            .then(() => window.PlayPointConsent);
        return consentManagerPromise;
    }

    function runAfterConsent(callback) {
        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])
            .then(() => window.PlayPointConsent.whenGranted(callback))
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    function applyArticlePresentationSettings() {
        if (!isArticlePage) return;
        let theme = 'dark';
        try {
            const settings = JSON.parse(localStorage.getItem('katakata_blog_settings') || '{}');
            if (settings.theme === 'light' || settings.theme === 'dark') theme = settings.theme;
        } catch (error) {
            console.warn('ブログ設定を読み込めませんでした。既定テーマを使用します。', error);
        }
        const categories = ['ランク', 'トラブル', '使い方', 'キャンペーン'];
        const category = document.querySelector('meta[name="article:category"]')?.content;
        document.body.dataset.blogTheme = theme;
        document.body.dataset.articleCategory = categories.includes(category) ? category : '使い方';
    }

    function loadCommonAnalytics() {
        if (window.__playpointGaConfigured) return;
        window.__playpointGaConfigured = true;
        window.PlayPointAnalytics.installGtagBridge();
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID);
        if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.onerror = () => console.error('Analytics load failed');
        document.head.appendChild(script);
    }

    function scheduleCommonAnalytics() {
        const callback = () => void runAfterConsent(loadCommonAnalytics);
        if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: 2500 });
        else window.setTimeout(callback, 1500);
    }

    function loadBlogAdsense() {
        if (blogAdsenseLoaded) return;
        blogAdsenseLoaded = true;
        window.removeEventListener('scroll', handleBlogAdsenseScroll);
        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
        script.crossOrigin = 'anonymous';
        script.onerror = () => console.error('AdSense load failed');
        document.head.appendChild(script);
    }

    function handleBlogAdsenseScroll() {
        if (window.scrollY >= 600) void runAfterConsent(loadBlogAdsense);
    }

    function renderCommonComponents() {
        if (!document.querySelector('header')) {
            const header = document.createElement('header');
            header.className = 'header';
            header.innerHTML = '<div class="header-inner"><a class="logo" href="/">🎮 Playポイント計算機</a><nav class="nav"><a href="/blog/">📝 記事一覧</a><a href="https://katakatalab.com/">🧪 KatakataLab</a></nav></div>';
            document.body.insertBefore(header, document.body.firstChild);
        }
        if (!document.querySelector('footer')) {
            const footer = document.createElement('footer');
            footer.className = 'site-footer';
            footer.innerHTML = `<p style="margin-bottom:0.5rem;font-size:0.8rem;"><a href="/privacy.html">プライバシーポリシー</a> ｜ <a href="/terms.html">利用規約</a></p><p>© <span class="copyright-year">2024-${new Date().getFullYear()}</span> Playポイント計算機</p>`;
            document.body.appendChild(footer);
        }
    }

    function generateTableOfContents() {
        const content = document.querySelector('.content');
        if (!content || content.querySelector('.toc-box')) return;
        const headings = Array.from(content.querySelectorAll('.section > h2'))
            .filter((heading) => !heading.closest('.faq, .cta-box, .article-next-step-cta, .article-calculator-prompt'));
        if (headings.length < 3) return;
        const toc = document.createElement('nav');
        toc.className = 'toc-box';
        toc.setAttribute('aria-label', 'この記事の目次');
        const title = document.createElement('p');
        title.className = 'toc-title';
        title.textContent = 'この記事の内容';
        const list = document.createElement('ol');
        list.className = 'toc-list';
        headings.forEach((heading, index) => {
            heading.id ||= `section-${index + 1}`;
            const item = document.createElement('li');
            item.className = 'toc-item';
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim();
            item.appendChild(link);
            list.appendChild(item);
        });
        toc.append(title, list);
        const anchor = content.querySelector('.summary-box, .intro');
        if (anchor) anchor.insertAdjacentElement('afterend', toc);
        else headings[0].insertAdjacentElement('beforebegin', toc);
    }

    function setupCalculatorEntryContext() {
        document.addEventListener('click', (event) => {
            const link = event.target && typeof event.target.closest === 'function' ? event.target.closest('a[href]') : null;
            if (!link || !window.PlayPointAnalytics) return;
            const context = link.closest('.article-calculator-prompt') ? 'article_calculator_prompt'
                : link.closest('.article-next-step-cta') ? 'article_next_step'
                    : link.closest('.cta-box, .cta-banner') ? 'article_cta' : 'article_link';
            window.PlayPointAnalytics.rememberCalculatorEntry(link, {
                source_path: window.location.pathname,
                link_context: context
            });
        }, { capture: true });
    }

    function removeRedundantArticleCtas() {
        if (!isArticlePage) return;
        const content = document.querySelector('.content');
        if (!content) return;
        const nativeCalculatorLink = content.querySelector('a[href*="mode=main"], a[href*="mode=reverse"], a[href^="../status/"], a[href^="/status/"], .cta-box:not(.article-calculator-prompt) a');
        if (nativeCalculatorLink) content.querySelector('.article-calculator-prompt')?.remove();
        if (content.querySelector('.related-links-section')) {
            content.querySelector('.contextual-guide-links')?.remove();
            content.querySelector('.article-next-step-cta')?.remove();
        }
    }

    applyArticlePresentationSettings();
    ensureStylesheet('/blog/common-components.css?v=20260807a', 'playpointCommonComponents');

    document.addEventListener('DOMContentLoaded', () => {
        void ensureAnalyticsCore().then(setupCalculatorEntryContext);
        scheduleCommonAnalytics();
        if (isBlogPage) window.addEventListener('scroll', handleBlogAdsenseScroll, { passive: true });
        renderCommonComponents();
        generateTableOfContents();
        window.setTimeout(removeRedundantArticleCtas, 0);
    });
})();
