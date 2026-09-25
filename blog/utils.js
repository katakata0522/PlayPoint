(function (root) {
    'use strict';

    // Constant for placeholder image (centralized)
    const PLACEHOLDER_IMAGE = '/images/article-placeholder.svg';

    // 記事一覧のゲーム名絞り込み（articles.json に第5カテゴリを足さない）
    const GAME_TITLE_FILTERS = Object.freeze(['FGO', '原神', 'モンスト', 'スタレ', 'ゼンゼロ', 'ウマ娘', 'プロセカ', 'ポケポケ', 'パズドラ', 'アークナイツ', 'ドッカン', 'ヘブバン', '崩壊3rd', 'ファンパレ', 'プロスピA', 'Pokémon GO', 'eFootball']);

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
        validArticleDate, sortListedArticles
    };

    const api = Object.assign({}, BlogUtils, {
        buildArticleSearchIndex: buildArticleSearchIndex,
        articleMatchesSearch: articleMatchesSearch,
        articleMatchesGameTitle: articleMatchesGameTitle,
        clampPageJump: clampPageJump,
        filterListedArticles: filterListedArticles,
        GAME_TITLE_FILTERS: GAME_TITLE_FILTERS,
        validArticleDate, sortListedArticles
    });

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.BlogUtils = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
