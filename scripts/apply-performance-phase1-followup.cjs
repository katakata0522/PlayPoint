'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(rootDir, relativePath), content, 'utf8');
}

function replaceOnce(content, pattern, replacement, label) {
  const matches = typeof pattern === 'string'
    ? content.split(pattern).length - 1
    : [...content.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))].length;
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`);
  return typeof pattern === 'string'
    ? content.replace(pattern, replacement)
    : content.replace(pattern, () => replacement);
}

function appendOnce(content, marker, addition) {
  return content.includes(marker) ? content : `${content.trimEnd()}\n\n${addition.trim()}\n`;
}

function patchBlogScript() {
  const relativePath = 'blog/script.js';
  let content = read(relativePath);

  if (!content.includes('function shouldRenderArticleThumbnails()')) {
    content = replaceOnce(
      content,
      '    // Create AdSense ad element',
      [
        '    function shouldRenderArticleThumbnails() {',
        "        return !(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);",
        '    }',
        '',
        '    // Create AdSense ad element'
      ].join('\n'),
      'thumbnail rendering helper'
    );
  }

  if (!content.includes('const renderThumbnails = shouldRenderArticleThumbnails();')) {
    content = replaceOnce(
      content,
      '        let articleIndex = 0;\n\n        pageItems.forEach((article, idx) => {',
      '        let articleIndex = 0;\n        const renderThumbnails = shouldRenderArticleThumbnails();\n\n        pageItems.forEach((article, idx) => {',
      'mobile thumbnail decision'
    );
  }

  if (!content.includes('card-thumb--text-only')) {
    const cardPattern = /            card\.innerHTML = `\n                <div class="card-thumb">[\s\S]*?            `;\n\n            \/\/ Attach error handler/;
    const replacement = [
      '            const thumbnailMarkup = renderThumbnails',
      '                ? `<img src="${safeThumbnail}" alt="${safeTitle}" width="600" height="400" loading="lazy" decoding="async" fetchpriority="low">`',
      "                : '';",
      "            const thumbnailClass = renderThumbnails ? 'card-thumb' : 'card-thumb card-thumb--text-only';",
      "            const thumbnailStyle = renderThumbnails ? '' : ` style=\"background: linear-gradient(135deg, ${categoryColor}55, var(--bg-secondary));\"`;",
      '',
      '            card.innerHTML = `',
      '                <div class="${thumbnailClass}"${thumbnailStyle}>',
      '                    ${thumbnailMarkup}',
      '                    <span class="card-category badge" style="background: ${categoryColor};">${safeCategory}</span>',
      '                    ${newBadge}',
      '                </div>',
      '                <div class="card-content">',
      '                    <time datetime="${article.date}">${BlogUtils.formatDate(article.date)}</time>',
      '                    <h3>${safeTitle}</h3>',
      '                    <p class="card-desc">${safeDesc}</p>',
      '                    <div class="card-tags">',
      "                        ${article.tags.map(t => `#${BlogUtils.escapeHtml(t)}`).join(' ')}",
      '                    </div>',
      '                </div>',
      '            `;',
      '',
      '            // Attach error handler'
    ].join('\n');
    content = replaceOnce(content, cardPattern, replacement, 'article card thumbnail markup');
  }

  write(relativePath, content);
}

function patchBlogCss() {
  const relativePath = 'blog/index-compact.css';
  const addition = `
/* MOBILE_TEXT_THUMBNAIL_START */
body.blog-index-compact .card-thumb--text-only {
    position: relative;
    isolation: isolate;
}

body.blog-index-compact .card-thumb--text-only::after {
    content: 'P';
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.38);
    font-size: 2rem;
    font-weight: 900;
    pointer-events: none;
}

body.blog-index-compact .card-thumb--text-only .badge {
    z-index: 1;
}
/* MOBILE_TEXT_THUMBNAIL_END */`;
  write(relativePath, appendOnce(read(relativePath), 'MOBILE_TEXT_THUMBNAIL_START', addition));
}

function patchArticleSharedCss() {
  const relativePath = 'articles/article-shared.css';
  const addition = `
/* ARTICLE_STATIC_HEADER_STABILITY_START */
.article-static-header {
    min-height: 64px;
    padding: 0.65rem 1.5rem;
    position: sticky;
    top: 0;
    z-index: 100;
    box-sizing: border-box;
    background: rgba(13, 17, 23, 0.94);
    border-bottom: 1px solid rgba(139, 148, 158, 0.28);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.article-static-header .header-inner {
    max-width: 800px;
    min-height: 44px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
}

.article-static-header .logo,
.article-static-header .nav a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    white-space: nowrap;
}

.article-static-header .logo {
    flex-shrink: 0;
    gap: 0.5rem;
    padding: 0 0.25rem;
    font-size: 1.1rem;
    font-weight: 800;
}

.article-static-header .nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.article-static-header .nav a {
    padding: 0 0.25rem;
    font-size: 0.9rem;
}

.article-static-header .logo:focus-visible,
.article-static-header .nav a:focus-visible {
    outline: 3px solid #58a6ff;
    outline-offset: 2px;
    border-radius: 6px;
}

@media (max-width: 600px) {
    .article-static-header {
        min-height: 52px;
        padding: 0.25rem 0.75rem;
    }

    .article-static-header .header-inner {
        gap: 0.35rem;
    }

    .article-static-header .logo {
        font-size: 0.95rem;
    }

    .article-static-header .nav {
        gap: 0.15rem;
    }

    .article-static-header .nav a {
        padding: 0 0.15rem;
        font-size: 0.7rem;
    }
}
/* ARTICLE_STATIC_HEADER_STABILITY_END */`;
  write(relativePath, appendOnce(read(relativePath), 'ARTICLE_STATIC_HEADER_STABILITY_START', addition));
}

function patchCalculatorCss() {
  const relativePath = 'style.css';
  const addition = `
/* CALCULATION_FLOW_LAYOUT_STABILITY_START */
.calculation-flow-figure img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 8 / 3;
}
/* CALCULATION_FLOW_LAYOUT_STABILITY_END */`;
  write(relativePath, appendOnce(read(relativePath), 'CALCULATION_FLOW_LAYOUT_STABILITY_START', addition));
}

function patchBrowserSmoke() {
  const relativePath = '.github/scripts/browser-smoke.cjs';
  let content = read(relativePath);
  if (!content.includes('textOnlyThumbnails')) {
    content = replaceOnce(
      content,
      "      sidebarHidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')\n    }));",
      [
        "      sidebarHidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden'),",
        "      thumbnailImages: document.querySelectorAll('.article-card .card-thumb img').length,",
        "      textOnlyThumbnails: document.querySelectorAll('.article-card .card-thumb--text-only').length",
        '    }));'
      ].join('\n'),
      'blog thumbnail smoke values'
    );
    content = replaceOnce(
      content,
      "    assert(initial.toggleExpanded === 'false' && initial.sidebarHidden === 'true', 'Blog sidebar initial ARIA state mismatch');",
      [
        "    assert(initial.toggleExpanded === 'false' && initial.sidebarHidden === 'true', 'Blog sidebar initial ARIA state mismatch');",
        "    assert(initial.thumbnailImages === 0, `Blog mobile cards loaded ${initial.thumbnailImages} heavy thumbnail images`);",
        "    assert(initial.textOnlyThumbnails === initial.cards, `Blog compact thumbnails mismatch: ${initial.textOnlyThumbnails}/${initial.cards}`);"
      ].join('\n'),
      'blog mobile thumbnail smoke assertions'
    );
  }
  write(relativePath, content);
}

patchBlogScript();
patchBlogCss();
patchArticleSharedCss();
patchCalculatorCss();
patchBrowserSmoke();
console.log('Applied phase 1 measured-performance fixes.');
