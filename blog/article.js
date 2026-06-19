(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        articlesUrl: '../blog/articles.json',
        recommendedCount: 3,
        placeholderImage: 'https://placehold.co/300x200/e0e0e0/999999?text=No+Image',
        officialHelpUrl: 'https://support.google.com/googleplay/answer/9077312'
    };

    // Flags
    let scrollListenerAdded = false;
    let articleAdsenseLoaded = false;
    let articleAdsenseScheduled = false;

    // Local fallback utilities (in case BlogUtils is not loaded)
    const fallbackUtils = {
        escapeHtml: function (text) {
            if (!text) return '';
            return text.replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        },
        formatDate: function (dateStr) {
            if (!dateStr) return '';
            return dateStr.replace(/-/g, '.');
        }
    };

    // Use BlogUtils if available, otherwise fallback
    function getUtils() {
        return window.BlogUtils || fallbackUtils;
    }

    // 全記事に共通の公式情報導線を追加し、制度変更時の確認先を明確にする
    function setupOfficialSourceNotice() {
        if (document.querySelector('.official-source-note')) return;
        const article = document.querySelector('article');
        if (!article) return;

        if (!document.querySelector('link[data-article-source-style]')) {
            const stylesheet = document.createElement('link');
            stylesheet.rel = 'stylesheet';
            stylesheet.href = '../articles/source-notice.css';
            stylesheet.dataset.articleSourceStyle = 'true';
            document.head.appendChild(stylesheet);
        }

        const notice = document.createElement('aside');
        notice.className = 'official-source-note';
        notice.setAttribute('aria-label', '公式情報の確認先');
        notice.innerHTML = `
            <strong>公式情報の確認先</strong>
            <p>Play Pointsの条件や特典は、地域や時期によって変更される場合があります。最新情報はGoogle Play公式ヘルプをご確認ください。</p>
            <a href="${CONFIG.officialHelpUrl}" target="_blank" rel="noopener noreferrer">Google Play公式ヘルプを確認する</a>
        `;
        article.appendChild(notice);
    }

    // 記事が計算機の利用につながったかだけを計測し、入力値は送信しない
    function setupCalculatorLinkTracking() {
        document.addEventListener('click', (event) => {
            const link = event.target && typeof event.target.closest === 'function'
                ? event.target.closest('a[href]')
                : null;
            if (!link) return;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname !== '/') return;

            url.searchParams.set('mode', 'main');
            url.searchParams.set('utm_source', 'article');
            url.searchParams.set('utm_medium', 'internal');
            url.searchParams.set('utm_campaign', 'article_cta');
            link.href = url.toString();

            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function gtag() {
                window.dataLayer.push(arguments);
            };
            window.gtag('event', 'article_to_calculator_clicked', {
                source_path: window.location.pathname
            });
        });
    }

    // 記事本文を読み始める前に自動広告を挿入せず、十分なスクロール後に一度だけ読み込む
    function loadArticleAdsense() {
        if (articleAdsenseLoaded) return;
        articleAdsenseLoaded = true;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3845885843809455';
        script.crossOrigin = 'anonymous';
        script.onerror = () => console.error('AdSense load failed');
        document.head.appendChild(script);
    }

    function handleArticleAdsenseScroll() {
        if (window.scrollY < 600 || articleAdsenseScheduled || !window.PlayPointConsent) return;
        articleAdsenseScheduled = true;
        window.removeEventListener('scroll', handleArticleAdsenseScroll);
        document.removeEventListener('playpoint:consent-ready', handleArticleAdsenseScroll);
        window.PlayPointConsent.whenGranted(loadArticleAdsense);
    }

    function setupArticleAdsense() {
        window.addEventListener('scroll', handleArticleAdsenseScroll, { passive: true });
        document.addEventListener('playpoint:consent-ready', handleArticleAdsenseScroll);
    }

    function sanitizeArticleFile(value) {
        if (typeof value !== 'string') return '#';
        if (!value.startsWith('../articles/')) return '#';
        if (!value.endsWith('.html')) return '#';
        if (/[<>"']/.test(value)) return '#';
        return value.replace('../articles/', './');
    }

    function sanitizeArticleThumbnail(value) {
        if (typeof value !== 'string') return CONFIG.placeholderImage;
        if (!value.startsWith('../articles/ogp/')) return CONFIG.placeholderImage;
        if (!value.endsWith('.png')) return CONFIG.placeholderImage;
        if (/[<>"']/.test(value)) return CONFIG.placeholderImage;
        return value.replace('../articles/', './');
    }

    // 記事JSONの値を描画前に正規化する
    function normalizeArticle(article) {
        article = article && typeof article === 'object' ? article : {};
        return {
            title: typeof article.title === 'string' ? article.title : '',
            date: typeof article.date === 'string' ? article.date : '',
            category: typeof article.category === 'string' ? article.category : '',
            file: sanitizeArticleFile(article.file),
            thumbnail: sanitizeArticleThumbnail(article.thumbnail)
        };
    }

    // Get current article's category from meta tag or data attribute
    function getCurrentCategory() {
        const metaCategory = document.querySelector('meta[name="article:category"]');
        if (metaCategory) return metaCategory.content;

        const categoryBadge = document.querySelector('.badge, .hero-badge');
        if (categoryBadge) {
            const text = categoryBadge.textContent.trim();
            // Extract category from badge text (e.g., "🏷️ 入門" -> "入門")
            const match = text.match(/入門|攻略|活用術|検証|トラブル対処/);
            if (match) return match[0];
        }
        return null;
    }

    async function init() {
        setupOfficialSourceNotice();
        setupCalculatorLinkTracking();
        setupArticleAdsense();
        if (window.BlogUtils) {
            BlogUtils.updateFooterYear();
            BlogUtils.setupShareButton();
        }

        // Reading Progress Bar Setup (only add once)
        if (!scrollListenerAdded) {
            scrollListenerAdded = true;
            window.addEventListener('scroll', () => {
                const progressBar = document.getElementById('reading-progress');
                if (!progressBar) return;

                const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                if (scrollHeight <= 0) return; // Prevent division by zero
                const scrolled = (scrollTop / scrollHeight) * 100;

                progressBar.style.width = scrolled + '%';
            });
        }

        try {
            const response = await fetch(CONFIG.articlesUrl);
            if (!response.ok) throw new Error('Failed to load articles for recommendation');
            const articles = await response.json();
            const allArticles = Array.isArray(articles) ? articles.map(normalizeArticle) : [];

            // Get current article info
            const currentPath = window.location.pathname;
            const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
            const currentCategory = getCurrentCategory();

            setupPrevNextNav(allArticles);

            // Related Articles
            const container = document.getElementById('recommended-grid') || document.getElementById('related-articles');
            if (!container) return;

            // Filter out current article
            const others = allArticles.filter(a => !a.file.includes(currentFilename));

            // Prioritize same category articles
            let recommended = [];
            if (currentCategory) {
                const sameCategory = others.filter(a => a.category === currentCategory);
                const differentCategory = others.filter(a => a.category !== currentCategory);

                // Shuffle both arrays
                sameCategory.sort(() => 0.5 - Math.random());
                differentCategory.sort(() => 0.5 - Math.random());

                // Take from same category first, then fill with others
                recommended = [...sameCategory, ...differentCategory].slice(0, CONFIG.recommendedCount);
            } else {
                // Random if no category info
                const shuffled = others.sort(() => 0.5 - Math.random());
                recommended = shuffled.slice(0, CONFIG.recommendedCount);
            }

            if (container && recommended.length > 0) {
                // Clear loading state
                container.innerHTML = '';

                recommended.forEach(article => {
                const utils = getUtils();
                const safeTitle = utils.escapeHtml(article.title);
                const safeCategory = utils.escapeHtml(article.category);
                const formattedDate = utils.formatDate(article.date);

                const card = document.createElement('a');
                card.href = article.file;
                card.className = 'related-card';
                card.innerHTML = `
                    <div class="related-card-thumb">
                        <img src="${article.thumbnail}" alt="${safeTitle}" loading="lazy">
                        <span class="related-card-category">${safeCategory}</span>
                    </div>
                    <div class="related-card-content">
                        <time>${formattedDate}</time>
                        <h4>${safeTitle}</h4>
                    </div>
                `;
                const img = card.querySelector('img');
                if (img) {
                    img.addEventListener('error', () => {
                        img.src = CONFIG.placeholderImage;
                    }, { once: true });
                }
                container.appendChild(card);
                });
            }

        } catch (e) {
            console.error('Related Articles Error:', e);
            if (container) {
                container.innerHTML = '<p style="text-align: center; color: #999;">関連記事の読み込みに失敗しました。</p>';
            }
        }
    }

    // Previous / Next Article Navigation
    function setupPrevNextNav(articles) {
        const navContainer = document.getElementById('article-nav');
        if (!navContainer) return;

        const currentPath = window.location.pathname;
        const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        // Sort articles by date (newest first)
        const sorted = [...articles].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Find current article index
        const currentIndex = sorted.findIndex(a => a.file.includes(currentFilename));
        if (currentIndex === -1) return;

        const utils = getUtils();
        const prevArticle = currentIndex > 0 ? sorted[currentIndex - 1] : null;
        const nextArticle = currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

        navContainer.innerHTML = `
            ${prevArticle ? `
                <a href="${prevArticle.file.replace('../articles/', './')}" class="article-nav-link prev">
                    <span class="article-nav-label">← 前の記事</span>
                    <span class="article-nav-title">${utils.escapeHtml(prevArticle.title)}</span>
                </a>
            ` : '<div class="article-nav-link disabled"><span class="article-nav-label">前の記事はありません</span></div>'}
            ${nextArticle ? `
                <a href="${nextArticle.file.replace('../articles/', './')}" class="article-nav-link next">
                    <span class="article-nav-label">次の記事 →</span>
                    <span class="article-nav-title">${utils.escapeHtml(nextArticle.title)}</span>
                </a>
            ` : '<div class="article-nav-link disabled next"><span class="article-nav-label">次の記事はありません</span></div>'}
        `;
    }

    document.addEventListener('DOMContentLoaded', init);

})();
