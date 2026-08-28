(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    let blogAdsenseLoaded = false;
    let consentManagerPromise = null;
    let analyticsCorePromise = null;

    const isArticlePageTop = window.location.pathname.includes('/articles/');
    const isBlogPage = window.location.pathname.includes('/blog');
    const isLatestPage = window.location.pathname.includes('/latest/');
    const rootPath = (isArticlePageTop || isBlogPage || isLatestPage) ? '../' : './';

    function ensureConsentManager() {
        if (window.PlayPointConsent) return Promise.resolve(window.PlayPointConsent);
        if (consentManagerPromise) return consentManagerPromise;

        consentManagerPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src*="/js/consent.js?v=8c5b4cd6f2"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.PlayPointConsent), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = rootPath + 'js/consent.js?v=8c5b4cd6f2';
            script.async = true;
            script.addEventListener('load', () => resolve(window.PlayPointConsent), { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.appendChild(script);
        });
        return consentManagerPromise;
    }

    function ensureAnalyticsCore() {
        if (window.PlayPointAnalytics) return Promise.resolve(window.PlayPointAnalytics);
        if (analyticsCorePromise) return analyticsCorePromise;

        analyticsCorePromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src*="/js/analytics-core.js?v=42b5e82926"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.PlayPointAnalytics), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = rootPath + 'js/analytics-core.js?v=42b5e82926';
            script.async = true;
            script.addEventListener('load', () => resolve(window.PlayPointAnalytics), { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.appendChild(script);
        });
        return analyticsCorePromise;
    }

    function runAfterConsent(callback, purpose = 'analytics') {
        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])
            .then(() => {
                const consent = window.PlayPointConsent;
                if (purpose === 'ads' && typeof consent.whenAdsAllowed === 'function') {
                    consent.whenAdsAllowed(callback);
                    return;
                }
                if (typeof consent.whenAnalyticsGranted === 'function') {
                    consent.whenAnalyticsGranted(callback);
                    return;
                }
                consent.whenGranted(callback);
            })
            .catch((error) => console.error('Consent manager load failed:', error));
    }

    function getDisplayMode() {
        if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
            return 'standalone';
        }
        if (window.navigator && window.navigator.standalone === true) {
            return 'standalone';
        }
        return 'browser';
    }

    // 記事ページにもブログで選んだテーマとカテゴリー配色を引き継ぐ
    function applyArticlePresentationSettings() {
        if (!window.location.pathname.includes('/articles/')) return;

        let theme = 'dark';
        try {
            const savedSettings = JSON.parse(localStorage.getItem('katakata_blog_settings') || '{}');
            if (savedSettings.theme === 'light' || savedSettings.theme === 'dark') {
                theme = savedSettings.theme;
            }
        } catch (error) {
            console.warn('ブログ設定を読み込めませんでした。既定テーマを使用します。', error);
        }

        const allowedCategories = ['ランク', 'トラブル', '使い方', 'キャンペーン'];
        const category = document.querySelector('meta[name="article:category"]')?.content;
        document.body.dataset.blogTheme = theme;
        document.body.dataset.articleCategory = allowedCategories.includes(category) ? category : '使い方';
    }

    // ブログと記事のイベントキューをGA4へ送れるよう、初期描画後に一度だけ読み込む
    function loadCommonAnalytics() {
        if (window.__playpointGaConfigured) return;
        window.__playpointGaConfigured = true;
        window.PlayPointAnalytics.installGtagBridge();
        window.gtag('js', new Date());
        window.gtag('set', { app_display_mode: getDisplayMode() });
        window.gtag('config', GA_MEASUREMENT_ID);
        window.PlayPointAnalytics.markAnalyticsReady();

        if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.onerror = () => console.error('Analytics load failed');
        document.head.appendChild(script);
    }

    function scheduleCommonAnalytics() {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => void runAfterConsent(loadCommonAnalytics), { timeout: 2500 });
            return;
        }
        window.setTimeout(() => void runAfterConsent(loadCommonAnalytics), 1500);
    }

    function loadBlogAdsense() {
        if (blogAdsenseLoaded) return;
        blogAdsenseLoaded = true;
        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
            blogAdsenseLoaded = false;
            console.error('AdSense load failed');
        };
        document.head.appendChild(script);
    }

    function setupBlogAdsense() {
        if (!(isBlogPage || isArticlePageTop)) return;
        // Google Privacy & Messaging / TCFの初期化に必要な非同期ライブラリは早期取得する。
        // 手動広告枠のpushはarticle.js側でad_storage許可後にだけ実行する。
        loadBlogAdsense();
    }

    function ensureCommonStyles() {
        if (document.querySelector('link[data-common-components-style]')) return;
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = rootPath + 'blog/common-components.css?v=bf40a1b867';
        stylesheet.dataset.commonComponentsStyle = 'true';
        document.head.appendChild(stylesheet);
    }

    // ===========================================
    // Common Header & Footer
    // ===========================================
    function renderCommonComponents() {
        // ページ固有のヘッダー・フッターがあれば、そのデザインを優先して重複生成しない
        const existingHeader = document.querySelector('header');
        const existingFooter = document.querySelector('footer');

        // Allow relative path adjustment if needed (default to absolute/root-relative for now based on file analysis)
        // Since files are in /articles/, links need to go up one level or use absolute URLs
        // The existing code used absolute URLs (https://playpoint-sim.com/), we will preserve that for consistency with current production
        // OR use relative paths if running locally. Let's stick to the existing absolute URLs as seen in the file,
        // BUT for local development, it might be better to handle relative paths.
        // Let's use relative paths for better local preview support, based on where the script is running.

        // --- Header Rendering ---
        if (!existingHeader) {
            const headerHTML = `
            <div class="header-inner">
                <a class="logo" href="${rootPath}index.html">🎮 Playポイント計算機</a>
                <nav class="nav">
                    <a href="${rootPath}blog/">📝 記事一覧</a>
                    <a href="https://katakatalab.com/">🧪 KatakataLab</a>
                </nav>
            </div>
            `;
            const header = document.createElement('header');
            header.className = 'header';
            header.innerHTML = headerHTML;
            document.body.insertBefore(header, document.body.firstChild);
        }

        // --- Footer Rendering ---
        if (!existingFooter) {
            const footerHTML = `
            <p style="margin-bottom: 0.5rem; font-size: 0.8rem;">
                <a href="${rootPath}privacy.html">プライバシーポリシー</a> ｜
                <a href="${rootPath}terms.html">利用規約</a>
            </p>
            <p>© <span class="copyright-year">2024-${new Date().getFullYear()}</span> Playポイント計算機</p>
            `;
            const footer = document.createElement('footer');
            footer.className = 'site-footer';
            footer.innerHTML = footerHTML;
            document.body.appendChild(footer);
        }
    }

    // ===========================================
    // Auto Table of Contents (TOC)
    // ===========================================
    function generateTableOfContents() {
        const content = document.querySelector('.content, .main-content-column');
        if (!content || content.querySelector('.toc-box, .inpage-toc, .intl-article-toc, .toc-container, .article-toc, [aria-label*="目次"], [aria-label*="Table of contents"]')) return;

        // 主題となるセクションだけに絞り、CTAや補足見出しで目次を膨らませない
        const headings = Array.from(content.querySelectorAll('.section > h2, article > section > h2'))
            .filter(heading => !heading.closest('.faq, .cta-box, .article-next-step-cta, .article-calculator-prompt, .cocoon-box-point'));
        if (headings.length < 3) return;

        const tocContainer = document.createElement('nav');
        tocContainer.className = 'inpage-toc';
        tocContainer.setAttribute('aria-label', 'この記事の目次');

        const tocTitle = document.createElement('div');
        tocTitle.className = 'inpage-toc-title';
        tocTitle.textContent = '📋 目次';

        const tocList = document.createElement('ol');

        headings.forEach((heading, index) => {
            if (!heading.id) heading.id = `section-${index + 1}`;

            const item = document.createElement('li');

            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            // 先頭の「1. 」「2. 」などの連番重複を取り除く
            let cleanText = heading.textContent.replace(/^\s*\d+[\.、．]\s*/u, '').trim();
            cleanText = cleanText.replace(/^[^\p{L}\p{N}【]+(?![】])/u, '').trim();
            link.textContent = cleanText || heading.textContent.trim();

            item.appendChild(link);
            tocList.appendChild(item);
        });

        tocContainer.append(tocTitle, tocList);

        const pointBox = content.querySelector('.cocoon-box-point');
        const badgeGrid = content.querySelector('.feature-badge-grid');
        const summaryBox = content.querySelector('.summary-box');
        const intro = content.querySelector('.intro');
        const anchor = badgeGrid || pointBox || summaryBox || intro;
        if (anchor) {
            anchor.insertAdjacentElement('afterend', tocContainer);
            return;
        }
        headings[0].insertAdjacentElement('beforebegin', tocContainer);
    }

    ensureCommonStyles();
    void ensureAnalyticsCore();
    applyArticlePresentationSettings();

    // components.js is loaded at the end of <body>, so article markup already exists here.
    // Build the TOC before DOMContentLoaded to avoid shifting visible article content after first paint.
    generateTableOfContents();

    // Execute functions
    document.addEventListener('DOMContentLoaded', () => {
        scheduleCommonAnalytics();
        setupBlogAdsense();
        renderCommonComponents();
        generateTableOfContents();
    });

})();