(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        articlesUrl: '../blog/articles.json',
        recommendedCount: 3,
        placeholderImage: 'https://placehold.co/300x200/e0e0e0/999999?text=No+Image',
        officialSources: {
            default: [
                { label: 'Play Pointsを貯める・管理する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            'play-games': [
                { label: 'Google PlayとPlay Gamesの最新機能（Google公式ブログ）', url: 'https://blog.google/intl/ja-jp/products/android-chrome-play/google-play-curation-update-september-2025/' },
                { label: 'Play Pointsを貯める・管理する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            weekly: [
                { label: '通常のウィークリーリワード（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' },
                { label: 'Play Pass加入者向け週次特典（Google公式）', url: 'https://support.google.com/googleplay/answer/16507543?hl=ja' }
            ],
            family: [
                { label: 'Play Pointsのアカウント間移動について（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' },
                { label: 'ファミリーライブラリの対象と設定（Google公式）', url: 'https://support.google.com/googleplay/answer/7007852?hl=ja' }
            ],
            rank: [
                { label: 'ステータス・獲得率・特典（Google公式）', url: 'https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            refund: [
                { label: '返金時のPlay Pointsの扱い（Google公式）', url: 'https://support.google.com/googleplay/answer/15576539?hl=ja' }
            ],
            gift: [
                { label: 'Google Playギフトカードの仕組み（Google公式）', url: 'https://support.google.com/googleplay/answer/3422734?hl=ja' },
                { label: 'Play Pointsの獲得対象（Google公式）', url: 'https://support.google.com/googleplay/answer/9077192?co=GENIE.CountryCode%3DJP&hl=ja' }
            ],
            trouble: [
                { label: 'Play Pointsの問題を解決する（Google公式）', url: 'https://support.google.com/googleplay/answer/9077247?hl=ja' }
            ]
        }
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

    function getOfficialSources() {
        const path = window.location.pathname;
        if (path.includes('play-games')) return CONFIG.officialSources['play-games'];
        if (path.includes('weekly-reward')) return CONFIG.officialSources.weekly;
        if (path.includes('family-sharing') || path.includes('multiple-accounts')) return CONFIG.officialSources.family;
        if (path.includes('diamond') || path.includes('rank-maintenance')) return CONFIG.officialSources.rank;
        if (path.includes('refund')) return CONFIG.officialSources.refund;
        if (path.includes('gift-card')) return CONFIG.officialSources.gift;
        if (path.includes('not-reflected') || path.includes('reflection-timing')) return CONFIG.officialSources.trouble;
        return CONFIG.officialSources.default;
    }

    // 記事のテーマに対応する一次情報を示し、読者が根拠を確認できるようにする
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
        const sources = getOfficialSources();
        notice.innerHTML = `
            <strong>この記事の確認に使った公式情報</strong>
            <p>Play Pointsの条件や特典は、国・時期・アカウントによって変わることがあります。購入や交換の直前は、Playストアに表示された条件を優先してください。</p>
            <ul>
                ${sources.map(source => `<li><a href="${fallbackUtils.escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${fallbackUtils.escapeHtml(source.label)}</a></li>`).join('')}
            </ul>
        `;
        article.appendChild(notice);
    }

    function setupCalculatorPrompt() {
        if (document.querySelector('.article-calculator-prompt')) return;
        const content = document.querySelector('.content');
        if (!content) return;
        if (content.querySelector('.cta-box, .cta-banner')) return;

        const prompt = document.createElement('aside');
        prompt.className = 'article-calculator-prompt cta-box';
        prompt.setAttribute('aria-label', 'あなたの場合の必要額を計算');
        prompt.innerHTML = `
            <p class="article-calculator-prompt__label">読んだあとに確認</p>
            <h2>あなたの場合はいくら必要？</h2>
            <p>現在のステータス、目標ランク、あと必要なポイントを入れると、ランク達成までの課金目安をすぐ確認できます。</p>
            <a class="article-calculator-prompt__button" href="../?utm_source=article&amp;utm_medium=internal&amp;utm_campaign=article_cta_prompt">計算機で自分の必要額を見る</a>
        `;

        const toc = content.querySelector('.toc-box');
        const summary = content.querySelector('.summary-box');
        const anchor = toc || summary;
        if (anchor && anchor.nextSibling) {
            anchor.parentNode.insertBefore(prompt, anchor.nextSibling);
            return;
        }
        content.insertBefore(prompt, content.firstChild);
    }


    function getContextualGuides() {
        const path = window.location.pathname;
        const groups = {
            start: [
                { href: './2025-12-25-check-balance.html', text: '残高・履歴・有効期限の確認方法' },
                { href: './2025-12-25-playpoints-not-reflected.html', text: 'ポイントが反映されない時の確認手順' },
                { href: './2025-12-25-expiration.html', text: 'Play Pointsの有効期限と失効対策' }
            ],
            earn: [
                { href: './2025-12-25-movies-books.html', text: '本・アプリ・定期購入の獲得条件' },
                { href: './2025-12-25-campaign.html', text: 'ポイント増量キャンペーンの確認方法' },
                { href: './2025-12-25-gift-card.html', text: 'ギフトカードのチャージと付与タイミング' }
            ],
            rank: [
                { href: './2025-12-25-playpoints-rank-maintenance.html', text: 'ランク維持期間と翌年の再判定' },
                { href: './2025-12-25-weekly-reward.html', text: 'ウィークリーリワードの受け取り方' },
                { href: './2025-12-25-diamond-worth-it.html', text: 'ダイヤモンドとプラチナの費用比較' }
            ],
            use: [
                { href: './2025-12-25-best-use.html', text: 'クーポン・アイテム・クレジットの選び方' },
                { href: './2025-12-25-expiration.html', text: '交換前に確認したい有効期限' },
                { href: './2025-12-25-refund.html', text: '返金時の残高・ランクへの影響' }
            ]
        };
        let selected = groups.start;
        if (/movies-books|subscription|campaign|promo-code|gift-card|discount-gift-cards/.test(path)) selected = groups.earn;
        if (/rank-maintenance|weekly-reward|diamond/.test(path)) selected = groups.rank;
        if (/best-use|expiration|refund|family-sharing/.test(path)) selected = groups.use;

        const currentFile = path.substring(path.lastIndexOf('/') + 1);
        return selected.filter(item => !item.href.endsWith(currentFile)).slice(0, 3);
    }

    function setupContextualGuideLinks() {
        if (document.querySelector('.contextual-guide-links')) return;
        const content = document.querySelector('.content');
        if (!content) return;
        const guides = getContextualGuides();
        if (!guides.length) return;

        const box = document.createElement('aside');
        box.className = 'contextual-guide-links';
        box.setAttribute('aria-label', '次に確認したい関連記事');
        box.innerHTML = `
            <h2>次に確認したいこと</h2>
            <ul>
                ${guides.map(guide => `<li><a href="${fallbackUtils.escapeHtml(guide.href)}">${fallbackUtils.escapeHtml(guide.text)}</a></li>`).join('')}
            </ul>
        `;
        content.appendChild(box);
    }

    function setupBreadcrumbStructuredData() {
        if (document.querySelector('script[data-article-breadcrumbs]')) return;
        const title = document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim() || document.title;
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.articleBreadcrumbs = 'true';
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Playポイント計算機', item: 'https://playpoint-sim.com/' },
                { '@type': 'ListItem', position: 2, name: '記事一覧', item: 'https://playpoint-sim.com/blog/' },
                { '@type': 'ListItem', position: 3, name: title, item: window.location.href.split('#')[0] }
            ]
        });
        document.head.appendChild(script);
    }

    function getArticleNextStepCta() {
        const path = window.location.pathname;
        if (path.includes('2025-12-25-campaign') || path.includes('2025-12-25-new-year-campaign')) {
            return {
                label: 'キャンペーン判断',
                title: '今課金するか、待つかを比較する',
                body: '通常時・2倍・3倍で必要額を比べて、キャンペーンを待つ価値があるか確認できます。',
                links: [
                    { href: '../campaign/wait/', text: 'キャンペーン待ちを判断' },
                    { href: '../campaign/2x/', text: '2倍で計算' },
                    { href: '../campaign/3x/', text: '3倍で計算' }
                ]
            };
        }
        if (path.includes('2026-06-20-discount-gift-cards.html') || path.includes('2025-12-25-gift-card')) {
            return {
                label: '購入前チェック',
                title: '買う前に必要額と還元上限を確認する',
                body: 'ギフトコードやキャンペーンを使う前に、目標ランクまでの不足額と買いすぎのリスクを確認できます。',
                links: [
                    { href: '../amount/10000/', text: '1万円で何ポイント？' },
                    { href: '../status/gold/', text: 'ゴールド到達を見る' },
                    { href: '../campaign/wait/', text: 'キャンペーン待ちを見る' }
                ]
            };
        }
        if (path.includes('playpoints-not-reflected') || path.includes('reflection-timing')) {
            return {
                label: '反映後の次アクション',
                title: '反映後に不足ポイントを再計算する',
                body: 'ポイント履歴を確認したら、あと何ポイント必要かを入れて次の判断に進めます。',
                links: [
                    { href: '../?utm_source=article_next_step&utm_medium=internal&utm_campaign=not_reflected', text: '計算機で不足分を見る' },
                    { href: '../status/silver/', text: 'シルバー到達を見る' },
                    { href: '../status/gold/', text: 'ゴールド到達を見る' }
                ]
            };
        }
        return {
            label: '次に確認',
            title: 'あなたの条件で必要額を確認する',
            body: '記事の内容を読んだら、現在ステータスと不足ポイントで実際の目安を確認できます。',
            links: [
                { href: '../?utm_source=article_next_step&utm_medium=internal&utm_campaign=generic', text: '計算機で見る' },
                { href: '../status/silver/', text: 'シルバー到達' },
                { href: '../status/gold/', text: 'ゴールド到達' }
            ]
        };
    }

    function setupArticleNextStepCta() {
        if (document.querySelector('.article-next-step-cta')) return;
        const content = document.querySelector('.content');
        if (!content) return;

        const cta = getArticleNextStepCta();
        const box = document.createElement('aside');
        box.className = 'article-next-step-cta';
        box.setAttribute('aria-label', '記事を読んだ後の次アクション');
        box.innerHTML = `
            <p class="article-next-step-cta__label">${fallbackUtils.escapeHtml(cta.label)}</p>
            <h2>${fallbackUtils.escapeHtml(cta.title)}</h2>
            <p>${fallbackUtils.escapeHtml(cta.body)}</p>
            <div class="article-next-step-cta__links">
                ${cta.links.map(link => `<a href="${fallbackUtils.escapeHtml(link.href)}">${fallbackUtils.escapeHtml(link.text)}</a>`).join('')}
            </div>
        `;

        const authorBox = content.querySelector('.author-box');
        if (authorBox) {
            content.insertBefore(box, authorBox);
            return;
        }
        content.appendChild(box);
    }

    // 記事が計算機の利用につながったかだけを計測し、入力値は送信しない
    function setupCalculatorLinkTracking() {
        const eventCommand = 'event';
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

            if (window.PlayPointConsent && window.PlayPointConsent.getStatus() === 'granted' && typeof window.gtag === 'function') {
                window.gtag(eventCommand, 'article_to_calculator_clicked', {
                    source_path: window.location.pathname,
                    link_context: link.closest('.article-calculator-prompt') ? 'article_calculator_prompt' : (link.closest('.cta-box, .cta-banner') ? 'article_cta' : 'article_link'),
                    destination_path: url.pathname
                });
            }
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
        setupCalculatorPrompt();
        setupContextualGuideLinks();
        setupArticleNextStepCta();
        setupOfficialSourceNotice();
        setupBreadcrumbStructuredData();
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

                const byNewest = (a, b) => new Date(b.date) - new Date(a.date) || a.title.localeCompare(b.title, 'ja');
                sameCategory.sort(byNewest);
                differentCategory.sort(byNewest);

                // 同じカテゴリーを優先し、毎回同じ関連リンクを表示する
                recommended = [...sameCategory, ...differentCategory].slice(0, CONFIG.recommendedCount);
            } else {
                recommended = others
                    .sort((a, b) => new Date(b.date) - new Date(a.date) || a.title.localeCompare(b.title, 'ja'))
                    .slice(0, CONFIG.recommendedCount);
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
