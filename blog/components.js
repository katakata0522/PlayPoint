(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    let blogAdsenseLoaded = false;
    let consentManagerPromise = null;
    let analyticsCorePromise = null;

    const isArticlePageTop = window.location.pathname.includes('/articles/');
    const isBlogPage = window.location.pathname.includes('/blog');
    const rootPath = (isArticlePageTop || isBlogPage) ? '../' : './';

    function loadScriptOnce(src) {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') return Promise.resolve(existing);
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
        if (!analyticsCorePromise) {
            analyticsCorePromise = loadScriptOnce(rootPath + 'js/analytics-core.js?v=20260807a')
                .then(() => window.PlayPointAnalytics);
        }
        return analyticsCorePromise;
    }

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        if (!consentManagerPromise) {
            consentManagerPromise = loadScriptOnce(rootPath + 'js/consent.js?v=20260727a')
                .then(() => window.PlayPointConsent);
        }
        return consentManagerPromise;
    }

    function runAfterConsent(callback) {
        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])
            .then(() => window.PlayPointConsent.whenGranted(callback))
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    function applyArticlePresentationSettings() {
        if (!isArticlePageTop) return;
        let theme = 'dark';
        try {
            const savedSettings = JSON.parse(localStorage.getItem('katakata_blog_settings') || '{}');
            if (savedSettings.theme === 'light' || savedSettings.theme === 'dark') theme = savedSettings.theme;
        } catch (error) {
            console.warn('ブログ設定を読み込めませんでした。既定テーマを使用します。', error);
        }
        const allowedCategories = ['ランク', 'トラブル', '使い方', 'キャンペーン'];
        const category = document.querySelector('meta[name="article:category"]')?.content;
        document.body.dataset.blogTheme = theme;
        document.body.dataset.articleCategory = allowedCategories.includes(category) ? category : '使い方';
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
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout: 2500 });
            return;
        }
        window.setTimeout(callback, 1500);
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
        if (window.scrollY < 600) return;
        void runAfterConsent(loadBlogAdsense);
    }

    function setupBlogAdsense() {
        if (!isBlogPage) return;
        window.addEventListener('scroll', handleBlogAdsenseScroll, { passive: true });
    }

    function renderCommonComponents() {
        const existingHeader = document.querySelector('header');
        const existingFooter = document.querySelector('footer');
        if (!existingHeader) {
            const header = document.createElement('header');
            header.className = 'header';
            header.innerHTML = `<div class="header-inner"><a class="logo" href="${rootPath}index.html">🎮 Playポイント計算機</a><nav class="nav"><a href="${rootPath}blog/">📝 記事一覧</a><a href="https://katakatalab.com/">🧪 KatakataLab</a></nav></div>`;
            document.body.insertBefore(header, document.body.firstChild);
        }
        if (!existingFooter) {
            const footer = document.createElement('footer');
            footer.className = 'site-footer';
            footer.innerHTML = `<p style="margin-bottom:0.5rem;font-size:0.8rem;"><a href="${rootPath}privacy.html">プライバシーポリシー</a> ｜ <a href="${rootPath}terms.html">利用規約</a></p><p>© <span class="copyright-year">2024-${new Date().getFullYear()}</span> Playポイント計算機</p>`;
            document.body.appendChild(footer);
        }
    }

    function generateTableOfContents() {
        const content = document.querySelector('.content');
        if (!content || content.querySelector('.toc-box')) return;
        const headings = Array.from(content.querySelectorAll('.section > h2'))
            .filter((heading) => !heading.closest('.faq, .cta-box, .article-next-step-cta, .article-calculator-prompt'));
        if (headings.length < 3) return;
        const tocContainer = document.createElement('nav');
        tocContainer.className = 'toc-box';
        tocContainer.setAttribute('aria-label', 'この記事の目次');
        const tocTitle = document.createElement('p');
        tocTitle.className = 'toc-title';
        tocTitle.textContent = 'この記事の内容';
        const tocList = document.createElement('ol');
        tocList.className = 'toc-list';
        headings.forEach((heading, index) => {
            if (!heading.id) heading.id = `section-${index + 1}`;
            const item = document.createElement('li');
            item.className = 'toc-item';
            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim();
            item.appendChild(link);
            tocList.appendChild(item);
        });
        tocContainer.append(tocTitle, tocList);
        const anchor = content.querySelector('.summary-box, .intro');
        if (anchor) anchor.insertAdjacentElement('afterend', tocContainer);
        else headings[0].insertAdjacentElement('beforebegin', tocContainer);
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
        if (!isArticlePageTop) return;
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
    ensureStylesheet(rootPath + 'blog/common-components.css?v=20260807a', 'playpointCommonComponents');

    document.addEventListener('DOMContentLoaded', () => {
        void ensureAnalyticsCore().then(() => setupCalculatorEntryContext());
        scheduleCommonAnalytics();
        setupBlogAdsense();
        renderCommonComponents();
        generateTableOfContents();
        window.setTimeout(removeRedundantArticleCtas, 0);
    });
})();
