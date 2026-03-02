(function (window) {
    'use strict';

    // Constant for placeholder image (centralized)
    const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400/e0e0e0/999999?text=No+Image';

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
            if (shareX) {
                const title = encodeURIComponent(document.title);
                const url = encodeURIComponent(window.location.href);
                shareX.href = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
            }
        }
    };

    // Expose to window
    window.BlogUtils = BlogUtils;

})(window);
