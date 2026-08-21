'use strict';

const fs = require('fs');
const path = require('path');
const {
  ARTICLE_HUB_CONTENT,
  ARTICLE_LABELS,
  INTL_ARTICLES,
  INTL_ARTICLE_CSS,
  LOCALES,
  MANUAL_MAINTENANCE_PAGES,
  PAGE_TYPES
} = require('./intl-seo-content.cjs');
const { GENERATED_INTL_PAGE_CONTENT_DATE } = require('./content-dates.cjs');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

function renderParagraphs(body) {
  const paragraphs = Array.isArray(body) ? body : [body];
  return paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
}

function articleSectionId(index) {
  return `section-${index + 1}`;
}

function renderArticleToc(article) {
  const labels = article.labels || ARTICLE_LABELS.en;
  return `<nav class="intl-article-toc" aria-label="${escapeHtml(labels.toc)}">
            <h2>${escapeHtml(labels.toc)}</h2>
            <ol>
                ${article.sections.map(([heading], index) => `<li><a href="#${articleSectionId(index)}">${escapeHtml(heading)}</a></li>`).join('\n                ')}
            </ol>
        </nav>`;
}

function pageUrl(locale, slug) {
  return `https://playpoint-sim.com/${locale}/${slug}/`;
}

function renderSeoPage(localeKey, pageKey, assetVersions, contentModifiedAt = GENERATED_INTL_PAGE_CONTENT_DATE) {
  const locale = LOCALES[localeKey];
  const page = PAGE_TYPES[pageKey];
  const content = page[localeKey];
  const canonical = pageUrl(localeKey, page.slug);
  const calcQuery = content.query || page.query;
  const calcHref = `/${localeKey}/?mode=${page.mode}&${calcQuery}`;
  const related = [
    [page.jaPath, locale.referenceLabel],
    ...locale.articles,
    ['/author/katakata.html', locale.policyLabel]
  ];
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: content.title,
      description: content.description,
      url: canonical,
      inLanguage: locale.lang,
      dateModified: contentModifiedAt,
      author: { '@type': 'Person', name: locale.author, url: 'https://playpoint-sim.com/author/katakata.html' },
      isPartOf: { '@type': 'WebSite', name: locale.siteName, url: `https://playpoint-sim.com/${localeKey}/` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale.siteName, item: `https://playpoint-sim.com/${localeKey}/` },
        { '@type': 'ListItem', position: 2, name: content.h1, item: canonical }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer }
      }))
    }
  ];

  return `<!DOCTYPE html>
<html lang="${locale.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(content.title)}</title>
    <meta name="description" content="${escapeHtml(content.description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="${escapeHtml(locale.author)}">
    <meta name="last-modified" content="${contentModifiedAt}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeHtml(locale.siteName)}">
    <meta property="og:title" content="${escapeHtml(content.title)}">
    <meta property="og:description" content="${escapeHtml(content.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(content.title)}">
    <meta name="twitter:description" content="${escapeHtml(content.description)}">
    <meta name="twitter:image" content="https://playpoint-sim.com/ogp.png">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com${page.jaPath}">
    <link rel="alternate" hreflang="en" href="${pageUrl('en', page.slug)}">
    <link rel="alternate" hreflang="ko" href="${pageUrl('ko', page.slug)}">
    <link rel="alternate" hreflang="zh-TW" href="${pageUrl('tw', page.slug)}">
    <link rel="alternate" hreflang="x-default" href="${pageUrl('en', page.slug)}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/style.css?v=${assetVersions.cssVersion}">
    ${schemas.map(schema => `<script type="application/ld+json">\n${jsonLd(schema)}\n    </script>`).join('\n    ')}
</head>
<body>
<main class="calculator-wrapper lp-wrapper">
    <nav class="top-bar" aria-label="Site links">
        <a href="/${localeKey}/">${escapeHtml(locale.back)}</a>
        <a href="/${localeKey}/articles/">${escapeHtml(locale.blog)}</a>
    </nav>
    <section class="lp-hero">
        <p class="lp-eyebrow">${escapeHtml(content.eyebrow)}</p>
        <h1>${escapeHtml(content.h1)}</h1>
        <p class="lp-lead">${escapeHtml(content.lead)}</p>
        <div class="lp-trust-line">
            <span>${escapeHtml(locale.lastUpdatedLabel)}: ${contentModifiedAt}</span>
            <span>${escapeHtml(locale.siteName)}</span>
            <span>${escapeHtml(locale.author)}</span>
        </div>
        <div class="lp-hero-panel">
            <p class="lp-note">${escapeHtml(locale.disclaimer)}</p>
            <div class="lp-jp-summary" aria-label="Page summary">
                ${content.summary.map(item => `<div><span class="lp-summary-value">${escapeHtml(item)}</span></div>`).join('\n                ')}
            </div>
            <div class="lp-action-row">
                <a class="lp-primary-link" href="${calcHref}">${escapeHtml(content.cta)}</a>
                <a class="lp-secondary-link" href="${content.secondaryHref}">${escapeHtml(content.secondary)}</a>
            </div>
        </div>
    </section>
    ${content.sections.map(([heading, body]) => `<section class="section">
        <h2>${escapeHtml(heading)}</h2>
        ${renderParagraphs(body)}
    </section>`).join('\n    ')}
    <section class="section">
        <h2>${escapeHtml(locale.estimateTitle)}</h2>
        <p>${escapeHtml(locale.estimateBody)}</p>
    </section>
    <section class="section">
        <h2>${escapeHtml(locale.relatedTitle)}</h2>
        <ul class="lp-related-list">
            ${related.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('\n            ')}
        </ul>
    </section>
    <section class="section lp-faq">
        <h2>FAQ</h2>
        ${content.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('\n        ')}
    </section>
    <footer class="page-footer">
        <p class="footer-nav-links">
            <a href="/${localeKey}/">${escapeHtml(locale.home)}</a>
            <span class="footer-separator">|</span>
            <a href="/${localeKey}/articles/">${escapeHtml(locale.blog)}</a>
            <span class="footer-separator">|</span>
            <a href="/author/katakata.html">${escapeHtml(locale.policyLabel)}</a>
            <span class="footer-separator">|</span>
            <a href="/privacy.html">${escapeHtml(locale.privacyLabel)}</a>
            <span class="footer-separator">|</span>
            <a href="/terms.html">${escapeHtml(locale.termsLabel)}</a>
        </p>
        <p class="site-footer-trademark">${escapeHtml(locale.trademarkNotice)}</p>
        <p class="copyright">© 2026 PlayPoint Simulation Tool</p>
    </footer>
</main>
<script src="/js/intent-tracking.js?v=${assetVersions.intentTrackingVersion}"></script>
<script src="/js/third-party.js?v=${assetVersions.thirdPartyVersion}"></script>
</body>
</html>
`;
}

function localeKeyForArticle(article) {
  if (article.lang === 'ko') return 'ko';
  if (article.lang === 'zh-TW') return 'tw';
  return 'en';
}

function getPublishedIntlArticles() {
  return INTL_ARTICLES.filter(article => !article.retired);
}

function getArticleAlternates(article) {
  const slug = path.posix.basename(article.file);
  const alternates = getPublishedIntlArticles()
    .filter(candidate => path.posix.basename(candidate.file) === slug)
    .map(candidate => ({
      localeKey: localeKeyForArticle(candidate),
      lang: candidate.lang || 'en',
      url: `https://playpoint-sim.com/${candidate.file}`
    }));
  if (article.jaAlternate) {
    alternates.unshift({ localeKey: 'ja', lang: 'ja', url: `https://playpoint-sim.com${article.jaAlternate}` });
  }
  return alternates;
}

function renderArticle(article, assetVersions) {
  const canonical = `https://playpoint-sim.com/${article.file}`;
  const publishedAt = article.publishedAt;
  const modifiedAt = article.modifiedAt;
  const articleCssVersion = assetVersions.articleSharedCssVersion || assetVersions.cssVersion;
  const lang = article.lang || 'en';
  const localeKey = localeKeyForArticle(article);
  const labels = article.labels || ARTICLE_LABELS.en;
  const authorName = article.author || 'Katakata';
  const siteName = article.siteName || 'Google Play Points Calculator';
  const ctaHref = article.ctaHref || '/en/';
  const nextLinks = article.nextLinks || [
    ['/en/status/diamond/', 'Diamond cost calculator'],
    ['/en/campaign/2x/', '2x promotion calculator'],
    ['/en/amount/10000/', '10,000 yen reverse estimate'],
    ['/author/katakata.html', 'Editorial policy']
  ];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: canonical,
    inLanguage: lang,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    image: 'https://playpoint-sim.com/ogp.png',
    author: { '@type': 'Person', name: authorName, url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: siteName, url: 'https://playpoint-sim.com/', logo: { '@type': 'ImageObject', url: 'https://playpoint-sim.com/favicon.svg' } }
  };
  const faqSchema = article.faqStructuredData !== false && Array.isArray(article.faq) && article.faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer }
    }))
  } : null;
  const alternateLinks = getArticleAlternates(article);
  const defaultAlternate = alternateLinks.find(alternate => alternate.localeKey === 'en') || alternateLinks[0];

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(localeKey === 'en' ? article.title : `${article.title} | ${siteName}`)}</title>
    <meta name="description" content="${escapeHtml(article.description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="${escapeHtml(authorName)}">
    <meta name="last-modified" content="${modifiedAt}">
    <link rel="canonical" href="${canonical}">
    ${alternateLinks.map(alternate => `<link rel="alternate" hreflang="${alternate.lang}" href="${alternate.url}">`).join('\n    ')}
    <link rel="alternate" hreflang="x-default" href="${defaultAlternate.url}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/articles/article-shared.css?v=${articleCssVersion}">
    <link rel="stylesheet" href="/en/articles/intl-article.css?v=${assetVersions.cssVersion}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${escapeHtml(siteName)}">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(article.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
${jsonLd(schema)}
    </script>${faqSchema ? `
    <script type="application/ld+json">
${jsonLd(faqSchema)}
    </script>` : ""}
</head>
<body>
<main class="main-card">
    <div class="hero">
        <span class="hero-badge">${escapeHtml(article.badge || 'International guide')}</span>
        <h1>${escapeHtml(article.h1)}</h1>
        <p class="hero-meta">${escapeHtml(labels.updatedPrefix)} ${modifiedAt} ・ ${escapeHtml(labels.guideSuffix)}</p>
    </div>

    <article class="content">
        <div class="intro">
            ${escapeHtml(article.intro || article.lead)}
        </div>

        ${renderArticleToc(article)}

        ${article.sections.map(([heading, body], index) => `<section class="section">
            <h2 id="${articleSectionId(index)}">${escapeHtml(heading)}</h2>
            ${renderParagraphs(body)}
        </section>`).join('\n        ')}

        <div class="cta-box">
            <h3>${escapeHtml(labels.ctaTitle)}</h3>
            <p>${escapeHtml(labels.ctaBody)}</p>
            <a class="cta-btn" href="${escapeHtml(ctaHref)}">${escapeHtml(labels.ctaLabel)}</a>
        </div>

        <aside class="official-source-note">
            <h2>${escapeHtml(article.officialSourceTitle || LOCALES[lang === 'ko' ? 'ko' : (lang === 'zh-TW' ? 'tw' : 'en')].officialSourceTitle)}</h2>
            <p>${escapeHtml(article.officialSourceBody || LOCALES[lang === 'ko' ? 'ko' : (lang === 'zh-TW' ? 'tw' : 'en')].officialSourceBody)}</p>
            <a href="${escapeHtml(article.officialSourceHref || 'https://support.google.com/googleplay/answer/9077312')}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.officialSourceLink || LOCALES[lang === 'ko' ? 'ko' : (lang === 'zh-TW' ? 'tw' : 'en')].officialSourceLink)}</a>${article.officialProgramLink ? `\n            <p><a href="https://support.google.com/googleplay/answer/9077312" target="_blank" rel="noopener noreferrer">${escapeHtml(article.officialProgramLink)}</a></p>` : ''}
        </aside>

        <section class="section">
            <h2>${escapeHtml(labels.faq)}</h2>
            ${article.faq.map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join('\n            ')}
        </section>

        <section class="section related-links-section">
            <h2>${escapeHtml(labels.nextStep)}</h2>
            <ul>
                ${nextLinks.map(([href, text]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></li>`).join('\n                ')}
            </ul>
        </section>
    </article>

    <aside class="author-box" aria-label="${escapeHtml(labels.authorAria)}">
        <p class="author-box-label">${escapeHtml(labels.authorLabel)}</p>
        <p class="author-box-name"><a href="/author/katakata.html" rel="author">${escapeHtml(authorName)}</a> - ${escapeHtml(labels.authorNameSuffix)}</p>
        <p>${escapeHtml(labels.authorBody)}</p>
    </aside>

    <nav id="article-nav" class="article-nav"></nav>
    <footer class="article-footer">
        <p><a href="/${localeKey}/articles/">${escapeHtml(labels.backToGuides)}</a> | <a href="${escapeHtml(ctaHref.replace(/\?.*$/, ''))}">${escapeHtml(labels.calculatorTop)}</a></p>
        <p class="site-footer-trademark">${escapeHtml(LOCALES[localeKey].trademarkNotice)}</p>
        <p class="small article-note-spacing">${escapeHtml(labels.footerNote)}</p>
    </footer>
</main>
<script src="/js/intent-tracking.js?v=${assetVersions.intentTrackingVersion}"></script>
<script src="/js/third-party.js?v=${assetVersions.thirdPartyVersion}"></script>
</body>
</html>
`;
}

function renderArticleHub(localeKey, assetVersions) {
  const locale = LOCALES[localeKey];
  const content = ARTICLE_HUB_CONTENT[localeKey];
  const articles = getPublishedIntlArticles().filter(article => localeKeyForArticle(article) === localeKey);
  const hubLinks = [
    ...(content.priorityArticles || []),
    ...articles.map(article => [`/${article.file}`, article.title]),
    ...(content.extraArticles || [])
  ];
  const canonical = `https://playpoint-sim.com/${localeKey}/articles/`;
  const generatedModifiedAt = articles.reduce((latest, article) => latest > article.modifiedAt ? latest : article.modifiedAt, '');
  const modifiedAt = content.extraModifiedAt > generatedModifiedAt ? content.extraModifiedAt : generatedModifiedAt;
  const articleCssVersion = assetVersions.articleSharedCssVersion || assetVersions.cssVersion;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: content.title,
    description: content.description,
    url: canonical,
    inLanguage: locale.lang
  };

  return `<!DOCTYPE html>
<html lang="${locale.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(content.title)} | ${escapeHtml(locale.siteName)}</title>
    <meta name="description" content="${escapeHtml(content.description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="last-modified" content="${modifiedAt}">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/articles/">
    <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/articles/">
    <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/articles/">
    <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/en/articles/">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/articles/article-shared.css?v=${articleCssVersion}">
    <link rel="stylesheet" href="/en/articles/intl-article.css?v=${assetVersions.cssVersion}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${escapeHtml(locale.siteName)}">
    <meta property="og:title" content="${escapeHtml(content.title)}">
    <meta property="og:description" content="${escapeHtml(content.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">
${jsonLd(schema)}
    </script>
</head>
<body>
<main class="main-card">
    <div class="hero">
        <span class="hero-badge">${escapeHtml(content.eyebrow)}</span>
        <h1>${escapeHtml(content.title)}</h1>
        <p class="hero-meta">${escapeHtml(locale.lastUpdatedLabel)} ${modifiedAt}</p>
    </div>
    <article class="content">
        <div class="intro">${escapeHtml(content.intro)}</div>
        <section class="section related-links-section">
            <ul>
                ${hubLinks.map(([href, title]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></li>`).join('\n                ')}
            </ul>
        </section>
    </article>
    <aside class="official-source-note">
        <h2>${escapeHtml(locale.officialSourceTitle)}</h2>
        <p>${escapeHtml(locale.officialSourceBody)}</p>
        <a href="https://support.google.com/googleplay/answer/9077312" target="_blank" rel="noopener noreferrer">${escapeHtml(locale.officialSourceLink)}</a>
    </aside>
    <footer class="article-footer">
        <p><a href="/${localeKey}/">${escapeHtml(locale.back)}</a></p>
        <p class="site-footer-trademark">${escapeHtml(locale.trademarkNotice)}</p>
    </footer>
</main>
<script src="/js/intent-tracking.js?v=${assetVersions.intentTrackingVersion}"></script>
<script src="/js/third-party.js?v=${assetVersions.thirdPartyVersion}"></script>
</body>
</html>
`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(rootDir, file, content) {
  const filePath = path.join(rootDir, file);
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

function getIntlSeoFiles() {
  const pages = [];
  for (const localeKey of Object.keys(LOCALES)) {
    for (const pageKey of Object.keys(PAGE_TYPES)) {
      pages.push(`${localeKey}/${PAGE_TYPES[pageKey].slug}/index.html`);
    }
  }
  return [
    ...pages,
    ...Object.keys(LOCALES).map(localeKey => `${localeKey}/articles/index.html`),
    ...getPublishedIntlArticles().map(article => article.file),
    ...MANUAL_MAINTENANCE_PAGES.map(page => page.file)
  ];
}

function getIntlSitemapEntries() {
  const entries = [];
  for (const localeKey of Object.keys(LOCALES)) {
    for (const pageKey of Object.keys(PAGE_TYPES)) {
      entries.push({ url: pageUrl(localeKey, PAGE_TYPES[pageKey].slug), lastmod: GENERATED_INTL_PAGE_CONTENT_DATE });
    }
    const hubArticles = getPublishedIntlArticles().filter(article => localeKeyForArticle(article) === localeKey);
    entries.push({
      url: `https://playpoint-sim.com/${localeKey}/articles/`,
      lastmod: hubArticles.reduce((latest, article) => latest > article.modifiedAt ? latest : article.modifiedAt, GENERATED_INTL_PAGE_CONTENT_DATE)
    });
  }
  for (const article of getPublishedIntlArticles()) {
    entries.push({ url: `https://playpoint-sim.com/${article.file}`, lastmod: article.modifiedAt });
  }
  for (const page of MANUAL_MAINTENANCE_PAGES) {
    entries.push({
      url: `https://playpoint-sim.com/${page.file.replace(/index\.html$/, '')}`,
      lastmod: page.modifiedAt
    });
  }
  return entries;
}

function writeIntlSeoPages(rootDir, assetVersions) {
  for (const localeKey of Object.keys(LOCALES)) {
    for (const pageKey of Object.keys(PAGE_TYPES)) {
      const file = `${localeKey}/${PAGE_TYPES[pageKey].slug}/index.html`;
      writeFile(rootDir, file, renderSeoPage(localeKey, pageKey, assetVersions));
    }
  }
  const { minifyCSS } = require('../.github/scripts/minify.cjs');
  writeFile(rootDir, 'en/articles/intl-article.css', minifyCSS(INTL_ARTICLE_CSS));
  for (const localeKey of Object.keys(LOCALES)) {
    writeFile(rootDir, `${localeKey}/articles/index.html`, renderArticleHub(localeKey, assetVersions));
  }
  for (const article of getPublishedIntlArticles()) {
    if (article.manual) continue;
    writeFile(rootDir, article.file, renderArticle(article, assetVersions));
  }
  console.log(`Generated international SEO pages (${getIntlSeoFiles().length} files).`);
}

module.exports = {
  getPublishedIntlArticles,
  getIntlSeoFiles,
  getIntlSitemapEntries,
  writeIntlSeoPages
};
