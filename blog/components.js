(function () {
    'use strict';

    const GA_MEASUREMENT_ID = 'G-HED6D0FR4L';
    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';
    let blogAdsenseLoaded = false;

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

        const allowedCategories = ['入門', '攻略', '活用術', '検証', 'トラブル対処'];
        const category = document.querySelector('meta[name="article:category"]')?.content;
        document.body.dataset.blogTheme = theme;
        document.body.dataset.articleCategory = allowedCategories.includes(category) ? category : '入門';
    }

    // ブログと記事のイベントキューをGA4へ送れるよう、初期描画後に一度だけ読み込む
    function loadCommonAnalytics() {
        if (window.__playpointGaConfigured) return;
        window.__playpointGaConfigured = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag() {
            window.dataLayer.push(arguments);
        };
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
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(loadCommonAnalytics, { timeout: 2500 });
            return;
        }
        window.setTimeout(loadCommonAnalytics, 1500);
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
        loadBlogAdsense();
    }

    function setupBlogAdsense() {
        if (!window.location.pathname.includes('/blog')) return;
        window.addEventListener('scroll', handleBlogAdsenseScroll, { passive: true });
    }

    // ===========================================
    // Common Styles Injection
    // ===========================================
    function injectStyles() {
        const styleId = 'common-components-style';
        if (document.getElementById(styleId)) return;

        const css = `
            /* Header */
            .header {
                background: rgba(13, 17, 23, 0.94);
                border-bottom: 1px solid rgba(139, 148, 158, 0.28);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                padding: 0.65rem 1.5rem;
                position: sticky;
                top: 0;
                z-index: 100;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header-inner {
                max-width: 800px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .logo {
                color: #fff;
                text-decoration: none;
                font-weight: 800;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                min-height: 44px;
                padding: 0 0.25rem;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .nav {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .nav a {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: none;
                margin-left: 0;
                font-size: 0.9rem;
                transition: opacity 0.2s;
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                padding: 0 0.25rem;
                white-space: nowrap;
            }
            .nav a:hover {
                opacity: 0.7;
            }

            /* Footer */
            .site-footer {
                text-align: center;
                padding: 2rem;
                color: #666;
                font-size: 0.85rem;
                background: #f8f9fa;
                margin-top: auto;
            }
            .site-footer a {
                color: #666;
                text-decoration: none;
                transition: color 0.2s;
                display: inline-flex;
                align-items: center;
                min-height: 44px;
            }
            .site-footer a:hover {
                color: #22c55e;
            }
            .logo:focus-visible,
            .nav a:focus-visible,
            .site-footer a:focus-visible {
                outline: 3px solid #58a6ff;
                outline-offset: 2px;
                border-radius: 6px;
            }

            /* Table of Contents (TOC) */
            .toc-box {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 16px;
                padding: 1.5rem;
                margin: 2rem 0;
            }
            .toc-title {
                font-weight: 700;
                margin-bottom: 1rem;
                color: #333;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .toc-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .toc-item {
                margin-bottom: 0.5rem;
                line-height: 1.5;
            }
            .toc-item a {
                text-decoration: none;
                color: #555;
                transition: color 0.2s;
                font-size: 0.95rem;
                display: block;
                padding: 0.2rem 0;
            }
            .toc-item a:hover {
                color: #22c55e;
                text-decoration: underline;
            }
            .toc-h3 {
                padding-left: 1.5rem;
                font-size: 0.9rem;
            }
            .toc-h3::before {
                content: "└";
                margin-right: 0.5rem;
                color: #ccc;
            }

            @media (max-width: 600px) {
                .header { padding: 0.35rem 0.75rem; }
                .header-inner { gap: 0.35rem; }
                .logo { font-size: 1rem; }
                .nav { gap: 0.2rem; min-width: 0; }
                .nav a { font-size: 0.7rem; padding: 0 0.15rem; }
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);
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

        const isArticlePage = window.location.pathname.includes('/articles/');
        const rootPath = isArticlePage ? '../' : './';

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
        const content = document.querySelector('.content');
        if (!content) return;

        // Find headings
        const headings = content.querySelectorAll('h2, h3');
        if (headings.length < 2) return; // Don't show TOC for very short articles

        // Create TOC Container
        const tocContainer = document.createElement('div');
        tocContainer.className = 'toc-box';
        tocContainer.innerHTML = '<div class="toc-title">📖 目次</div>';

        const tocList = document.createElement('ul');
        tocList.className = 'toc-list';

        let currentId = 0;

        headings.forEach(heading => {
            // Skip "Using this article" or similar non-content headings if any
            if (heading.closest('.summary-box') || heading.closest('.callout') || heading.closest('.faq-item')) return;

            // Assign ID if not present
            if (!heading.id) {
                heading.id = `toc-${currentId++}`;
            }

            const li = document.createElement('li');
            li.className = `toc-item toc-${heading.tagName.toLowerCase()}`;

            const link = document.createElement('a');
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent;

            // Smooth scroll
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(heading.id);
                if (target) {
                    const headerOffset = 80; // Buffer for sticky header
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });

            li.appendChild(link);
            tocList.appendChild(li);
        });

        tocContainer.appendChild(tocList);

        // Insert TOC: After the summary-box, or before the first h2 if no summary
        const summaryBox = content.querySelector('.summary-box');
        if (summaryBox) {
            summaryBox.parentNode.insertBefore(tocContainer, summaryBox.nextSibling);
        } else {
            const firstHeading = content.querySelector('h2');
            if (firstHeading) {
                firstHeading.parentNode.insertBefore(tocContainer, firstHeading);
            } else {
                content.insertBefore(tocContainer, content.firstChild);
            }
        }
    }

    applyArticlePresentationSettings();

    // Execute functions
    document.addEventListener('DOMContentLoaded', () => {
        scheduleCommonAnalytics();
        setupBlogAdsense();
        injectStyles();
        renderCommonComponents();
        generateTableOfContents();
    });

})();
