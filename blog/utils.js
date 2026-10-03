(function (root) {
    'use strict';

    // Constant for placeholder image (centralized)
    const PLACEHOLDER_IMAGE = '/images/article-placeholder.svg';

    // 記事一覧のゲーム名絞り込み（articles.json に第5カテゴリを足さない）
    const GAME_TITLE_FILTERS = Object.freeze(['FGO', '原神', 'モンスト', 'スタレ', 'ゼンゼロ', 'ウマ娘', 'プロセカ', 'ポケポケ', 'パズドラ', 'アークナイツ', 'ドッカン', 'ヘブバン', '崩壊3rd', 'ファンパレ', 'プロスピA', 'Pokémon GO', 'eFootball', 'ポケスリ', '学マス', 'ブルアカ', 'NIKKE']);

    function gameTitleFilters(articles) {
        return [...new Set([...GAME_TITLE_FILTERS, ...(articles || []).map(a => a.gameTitle).filter(Boolean)])];
    }

    function relatedGameCalculators(calculators, query, gameTitle) {
        const search = root.PlayPointSearch || (typeof require === 'function' ? require('../js/article-search.js') : null);
        const normalize = value => search ? search.canonical(value, 'ja') : String(value || '').toLowerCase();
        const selected = normalize(gameTitle), input = normalize(query);
        if (!selected && !input) return [];
        return (calculators || []).filter(game => {
            if (!/^\/games\/[a-z0-9-]+\/$/.test(game.href)) return false;
            const names = [game.title, ...String(game.title).split(/[()]/), game.id].map(normalize).filter(Boolean);
            const terms = search ? search.tokens(query, 'ja') : input.split(/\s+/);
            return selected ? names.some(name => name.includes(selected) || selected.includes(name))
                : names.some(name => input.includes(name) || terms.some(term => name.includes(term)));
        }).slice(0, 3);
    }

    /**
     * タイトル・説明・タグ・カテゴリを小文字化してメモリ内検索用インデックスにする
     * @param {{title?: string, description?: string, tags?: string[], category?: string}} article
     * @returns {string}
     */
    function buildArticleSearchIndex(article) {
        const source = article && typeof article === 'object' ? article : {};
        const tags = Array.isArray(source.tags) ? source.tags.filter(tag => typeof tag === 'string').join(' ') : '';
        return [
            typeof source.title === 'string' ? source.title : '',
            typeof source.description === 'string' ? source.description : '',
            tags,
            typeof source.category === 'string' ? source.category : ''
        ].join(' ').toLowerCase();
    }

    /**
     * 空白区切りキーワードをすべて含む記事だけ残す（AND検索）
     * @param {object} article
     * @param {string} query
     * @returns {boolean}
     */
    function articleMatchesSearch(article, query) {
        const search = root.PlayPointSearch || (typeof require === 'function' ? require('../js/article-search.js') : null);
        if (search) return search.matches(article, query, 'ja');
        const keywords = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
        if (keywords.length === 0) return true;
        const index = buildArticleSearchIndex(article);
        return keywords.every(keyword => index.includes(keyword));
    }

    /**
     * タイトルまたはタグにゲーム名が含まれるか
     * @param {{title?: string, tags?: string[]}} article
     * @param {string} gameTitle
     * @returns {boolean}
     */
    function articleMatchesGameTitle(article, gameTitle) {
        if (!gameTitle) return true;
        const source = article && typeof article === 'object' ? article : {};
        if (source.gameTitle === gameTitle) return true;
        const title = typeof source.title === 'string' ? source.title : '';
        const tags = Array.isArray(source.tags) ? source.tags : [];
        if (title.includes(gameTitle)) return true;
        return tags.some(tag => typeof tag === 'string' && tag.includes(gameTitle));
    }

    /**
     * ページ番号ジャンプ入力を 1〜最終ページへ丸める（全角数字対応）
     * @param {string|number} raw
     * @param {number} totalPages
     * @returns {number}
     */
    function clampPageJump(raw, totalPages) {
        const normalized = String(raw ?? '').replace(/[０-９]/g, function (digit) {
            return String.fromCharCode(digit.charCodeAt(0) - 0xFEE0);
        });
        let page = /^\d+$/.test(normalized.trim()) ? Number(normalized) : 1;
        if (!Number.isSafeInteger(page) || page < 1) page = 1;
        const maxPage = Math.max(1, Number(totalPages) || 1);
        if (page > maxPage) page = maxPage;
        return page;
    }

    /**
     * 一覧表示用フィルタ。カテゴリ・AND検索・ゲーム名を同じ経路でかける
     * @param {object[]} articles
     * @param {{category?: string, browseCategory?: string, search?: string, gameTitle?: string}} state
     * @returns {object[]}
     */
    function filterListedArticles(articles, state) {
        const list = Array.isArray(articles) ? articles : [];
        const filters = state && typeof state === 'object' ? state : {};
        const category = typeof filters.category === 'string' ? filters.category : 'all';
        const browseCategory = typeof filters.browseCategory === 'string' ? filters.browseCategory : '';
        const search = typeof filters.search === 'string' ? filters.search : '';
        const gameTitle = typeof filters.gameTitle === 'string' ? filters.gameTitle : '';
        return list.filter(article => {
            if (category && category !== 'all' && article.category !== category) return false;
            if (browseCategory && article.browseCategory !== browseCategory) return false;
            if (search && !articleMatchesSearch(article, search)) return false;
            if (gameTitle && !articleMatchesGameTitle(article, gameTitle)) return false;
            return true;
        });
    }

    function validArticleDate(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
        const time = Date.parse(value + 'T00:00:00Z');
        return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? value : '';
    }

    function sortListedArticles(articles, { mode = 'newest', search = '' } = {}) {
        const scorer = root.PlayPointSearch || (typeof require === 'function' ? require('../js/article-search.js') : null);
        // 比較関数内で同じ記事の本文評価や日付解析を繰り返さない。順位・同点順は維持する。
        return articles.map((article, index) => {
            const published = validArticleDate(article.date);
            const modified = mode === 'updated' ? validArticleDate(article.modified) : '';
            return { article, index, date: modified > published ? modified : published,
                score: mode === 'relevance' && search && scorer ? scorer.score(article, search, 'ja') : 0 };
        }).sort((a, b) => {
            const difference = b.score - a.score;
            if (difference) return difference;
            const left = a.date, right = b.date;
            if (!left || !right) return left ? -1 : right ? 1 : a.index - b.index;
            return (mode === 'oldest' ? left.localeCompare(right) : right.localeCompare(left)) || a.index - b.index;
        }).map(item => item.article);
    }

    // Global Utilities for Katakata Blog
    function sanitizeArticleFile(value) {
        if (typeof value !== 'string') return '#';
        const standardArticle = /^\.\.\/articles\/[^/]+\.html$/.test(value);
        const gameGuideArticle = /^\.\.\/games\/[a-z0-9-]+\/[a-z0-9-]+\/index\.html$/.test(value);
        if (!standardArticle && !gameGuideArticle) return '#';
        if (/[<>"']/.test(value)) return '#';
        return value;
    }

    function sanitizeArticleThumbnail(value) {
        if (typeof value !== 'string') return BlogUtils.getPlaceholderImage();
        const standardThumbnail = /^\.\.\/articles\/ogp\/[^/]+\.png$/.test(value);
        const editorialThumbnail = /^\.\.\/articles\/thumbnails\/[a-z0-9-]+\.webp$/.test(value);
        const gameIcon = /^\.\.\/images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(value);
        const sharedSiteOgp = value === '../ogp.png';
        if (!standardThumbnail && !editorialThumbnail && !gameIcon && !sharedSiteOgp) return BlogUtils.getPlaceholderImage();
        if (/[<>"']/.test(value)) return BlogUtils.getPlaceholderImage();
        return value;
    }

    function sanitizeArticleThumbnailKind(value) {
        return ['generic', 'app-icon', 'event-visual'].includes(value) ? value : 'generic';
    }

    function sanitizeArticleThumbnailPosition(value) {
        return ['left', 'center', 'right'].includes(value) ? value : 'center';
    }

    // 記事JSONの値を描画前に正規化する
    function normalizeArticle(article) {
        article = article && typeof article === 'object' ? article : {};
        const tags = Array.isArray(article.tags) ? article.tags.filter(tag => typeof tag === 'string') : [];
        const title = typeof article.title === 'string' ? article.title : '';
        const description = typeof article.description === 'string' ? article.description : '';
        const category = typeof article.category === 'string' ? article.category : '';

        return {
            id: typeof article.id === 'string' ? article.id : '',
            title,
            listTitle: typeof article.listTitle === 'string' && article.listTitle.trim() ? article.listTitle.trim() : title,
            date: BlogUtils.validArticleDate(article.date),
            modified: BlogUtils.validArticleDate(article.modified),
            category,
            gameTitle: typeof article.gameTitle === 'string' ? article.gameTitle : '',
            browseCategory: typeof article.browseCategory === 'string' ? article.browseCategory : '',
            tags,
            description,
            listDescription: typeof article.listDescription === 'string' ? article.listDescription : description,
            file: sanitizeArticleFile(article.file),
            thumbnail: sanitizeArticleThumbnail(article.thumbnail),
            thumbnailKind: sanitizeArticleThumbnailKind(article.thumbnailKind),
            thumbnailPosition: sanitizeArticleThumbnailPosition(article.thumbnailPosition),
            listed: article.listed !== false,
            searchIndex: BlogUtils.buildArticleSearchIndex({
                title,
                description,
                tags,
                category
            })
        };
    }


    // 静的な初期カードと検索後のカードは同じ正規化・描画経路を使う。
    function articleCardIdentity(article) {
        return JSON.stringify([article.title, article.listTitle, article.date, article.modified, article.category, article.tags, article.listDescription, article.file, article.thumbnail, article.thumbnailKind, article.thumbnailPosition]);
    }
    function articleThumbnailDimensions(article) {
        if (article?.thumbnailKind === 'app-icon') return { width: 96, height: 96 };
        if (/^\.\.\/articles\/thumbnails\/[a-z0-9-]+-square-v1\.webp$/i.test(String(article?.thumbnail || ''))) {
            return { width: 256, height: 256 };
        }
        return { width: 1200, height: 630 };
    }
    function articleCardMarkup(article, { search = '', snippet = null, isNew = false, compact = false, first = false, staticCard = false } = {}) {
        const safeTitle = BlogUtils.escapeHtml(article.listTitle);
        const safeDesc = BlogUtils.escapeHtml(search ? (snippet?.text || article.description) : article.listDescription);
        const safeCategory = BlogUtils.escapeHtml(article.category);
        const updated = article.modified && article.modified > article.date ? article.modified : '';
        const dateMarkup = '<time datetime="' + (updated || article.date) + '">' + (updated ? '更新 ' : '') + BlogUtils.formatDate(updated || article.date) + '</time>';
        const newBadge = isNew ? '<span class="badge-new">NEW</span>' : '';
        const kind = article.thumbnailKind, position = article.thumbnailPosition;
        const dimensions = articleThumbnailDimensions(article);
        const deferThumbnail = compact && !first;
        const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        const source = BlogUtils.escapeHtml(article.thumbnail);
        const image = '<img src="' + (deferThumbnail ? placeholder : source) + '"' + (deferThumbnail || (staticCard && !first) ? ' data-src="' + source + '"' : '') + ' alt="" width="' + dimensions.width + '" height="' + dimensions.height + '" loading="' + (first ? 'eager' : 'lazy') + '" decoding="async" fetchpriority="' + (first ? 'high' : 'low') + '">';
        // 画面外画像はスマホの初回描画と競合させず、PCはnative lazy loadingを使う。
        const thumbnail = staticCard && !first ? '<picture><source media="(max-width:760px)" srcset="' + PLACEHOLDER_IMAGE + '">' + image + '</picture>' : image;
        return '<div class="card-thumb card-thumb--' + kind + ' card-thumb--focus-' + position + '">' + thumbnail + '</div><div class="card-content"><div class="card-meta"><span class="card-topic">' + safeCategory + '</span>' + newBadge + dateMarkup + '</div><div class="card-main"><h3>' + safeTitle + '</h3>' + (search && snippet?.heading ? '<span class="search-snippet-heading">' + BlogUtils.escapeHtml(snippet.heading) + '</span>' : '') + '<p class="card-desc">' + safeDesc + '</p><div class="card-tags">' + article.tags.map(t => '#' + BlogUtils.escapeHtml(t)).join(' ') + '</div></div></div>';
    }

    const BlogUtils = {

        /**
         * Get placeholder image URL
         * @returns {string}
         */
        getPlaceholderImage: function () {
            return PLACEHOLDER_IMAGE;
        },

        /**
         * Escape HTML characters to prevent XSS
         * @param {string} text
         * @returns {string}
         */
        escapeHtml: function (text) {
            if (!text) return '';
            return text.replace(/[&<>"']/g, function (m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                }[m];
            });
        },

        /**
         * Format date string from YYYY-MM-DD to YYYY.MM.DD
         * @param {string} dateStr
         * @returns {string}
         */
        formatDate: function (dateStr) {
            if (!dateStr) return '';
            return dateStr.replace(/-/g, '.');
        },

        /**
         * Handle image loading errors by setting a fallback placeholder
         * @param {HTMLImageElement} img
         */
        handleImageError: function (img) {
            img.onerror = null; // Prevent infinite loop
            img.src = PLACEHOLDER_IMAGE;
            img.alt = '';
            img.closest?.('.card-thumb')?.classList.add('card-thumb--fallback');
        },

        /**
         * Update the footer year dynamically
         */
        updateFooterYear: function () {
            const footerYear = document.querySelector('.blog-footer .copyright-year');
            if (footerYear) {
                const currentYear = new Date().getFullYear();
                footerYear.textContent = `2024-${currentYear}`;
            }
        },

        /**
         * Setup X (Twitter) Share Button
         */
        setupShareButton: function () {
            const shareX = document.getElementById('share-x');
            if (shareX && typeof window !== 'undefined' && window.location) {
                const title = encodeURIComponent(document.title);
                const url = encodeURIComponent(window.location.href);
                shareX.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
            }
        },

        buildArticleSearchIndex: buildArticleSearchIndex,
        articleMatchesSearch: articleMatchesSearch,
        articleMatchesGameTitle: articleMatchesGameTitle,
        clampPageJump: clampPageJump,
        filterListedArticles: filterListedArticles,
        GAME_TITLE_FILTERS: GAME_TITLE_FILTERS,
        validArticleDate, sortListedArticles, gameTitleFilters, relatedGameCalculators, normalizeArticle, articleCardMarkup, articleCardIdentity, articleThumbnailDimensions
    };

    const api = Object.assign({}, BlogUtils, {
        buildArticleSearchIndex: buildArticleSearchIndex,
        articleMatchesSearch: articleMatchesSearch,
        articleMatchesGameTitle: articleMatchesGameTitle,
        clampPageJump: clampPageJump,
        filterListedArticles: filterListedArticles,
        GAME_TITLE_FILTERS: GAME_TITLE_FILTERS,
        validArticleDate, sortListedArticles, gameTitleFilters, relatedGameCalculators, normalizeArticle, articleCardMarkup, articleCardIdentity, articleThumbnailDimensions
    });

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.BlogUtils = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
