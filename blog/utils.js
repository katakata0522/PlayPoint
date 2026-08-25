(function (root) {
    'use strict';

    // Constant for placeholder image (centralized)
    const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/e0e0e0/999999?text=No+Image';

    // 記事一覧のゲーム名絞り込み（articles.json に第5カテゴリを足さない）
    const GAME_TITLE_FILTERS = Object.freeze(['ウマ娘', 'ドッカン', 'パズドラ']);

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
        let page = parseInt(normalized, 10);
        if (!Number.isFinite(page) || page < 1) page = 1;
        const maxPage = Math.max(1, Number(totalPages) || 1);
        if (page > maxPage) page = maxPage;
        return page;
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
            img.alt = 'Image not found';
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
        GAME_TITLE_FILTERS: GAME_TITLE_FILTERS
    };

    const api = Object.assign({}, BlogUtils, {
        buildArticleSearchIndex: buildArticleSearchIndex,
        articleMatchesSearch: articleMatchesSearch,
        articleMatchesGameTitle: articleMatchesGameTitle,
        clampPageJump: clampPageJump,
        GAME_TITLE_FILTERS: GAME_TITLE_FILTERS
    });

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.BlogUtils = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
