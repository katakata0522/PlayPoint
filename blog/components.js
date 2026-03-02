(function () {
    'use strict';

    // ===========================================
    // Common Styles Injection
    // ===========================================
    function injectStyles() {
        const styleId = 'common-components-style';
        if (document.getElementById(styleId)) return;

        const css = `
            /* Header */
            .header {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                padding: 1rem 1.5rem;
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
            }
            .nav a {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: none;
                margin-left: 1rem;
                font-size: 0.9rem;
                transition: opacity 0.2s;
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
            }
            .site-footer a:hover {
                color: #22c55e;
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
                .header { padding: 0.8rem 1rem; }
                .header-inner { flex-direction: column; gap: 0.5rem; }
                .nav { margin-top: 0.2rem; }
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
        // Find existing header/footer to ensure we don't duplicate or to verify placement
        const existingHeader = document.querySelector('header.header');
        const existingFooter = document.querySelector('footer.site-footer');

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
                    <a href="${rootPath}blog/index.html">📝 記事一覧</a>
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

    // Execute functions
    document.addEventListener('DOMContentLoaded', () => {
        injectStyles();
        renderCommonComponents();
        generateTableOfContents();
    });

})();
