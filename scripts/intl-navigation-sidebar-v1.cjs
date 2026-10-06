'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { LOCALES } = require('./intl-seo-content.cjs');
const { getIntlGuideCategory } = require('./intl-guide-taxonomy.cjs');
const { selectRelatedArticles } = require('./intl-related-guides.cjs');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { getPopularGuides, POPULAR_GUIDES_SNAPSHOT } = require('./intl-popular-guides.cjs');
const { COPY } = require('./intl-shell-copy.cjs');

const CHROME_START = '<!-- INTL_ARTICLE_CHROME_START -->';
const CHROME_END = '<!-- INTL_ARTICLE_CHROME_END -->';
const SHELL_STYLESHEET = '/articles/intl-shell-v1.css';
const SECTION_ORDER = ['home', 'guides', 'troubleshooting', 'earn', 'levels', 'account'];
const SECTION_ANCHORS = Object.freeze({ account: 'intl-hub-account', earn: 'intl-hub-earn', levels: 'intl-hub-levels', troubleshooting: 'intl-hub-trouble' });
const REGION_PATHS = Object.freeze({ ja: '/', en: '/en/', ko: '/ko/', tw: '/tw/', hk: '/hk/', in: '/in/' });

function publicThumbnail(value, rootDir = path.resolve(__dirname, '..')) {
  const relative = String(value || '').replace(/^\.\.\//, '');
  if (!/^(?:articles\/ogp\/[^/?#]+\.png|articles\/thumbnails\/[a-z0-9-]+\.webp|images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp)|ogp\.png)$/i.test(relative)) return '';
  const original = '/' + relative;
  const sourcePath = path.join(rootDir, relative);
  if (!fs.existsSync(sourcePath)) return original;
  const digest = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 16);
  const thumbnail = `images/navigation-thumbnails/${digest}-186.webp`;
  return fs.existsSync(path.join(rootDir, thumbnail)) ? '/' + thumbnail : original;
}

function isSquareThumbnail(value) {
  const relative = String(value || '').replace(/^\.\.\//, '');
  return /^(?:articles\/thumbnails\/[a-z0-9-]+\.webp|images\/game-icons\/[a-z0-9-]+\.(?:png|jpe?g|webp))$/i.test(relative);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(amp|lt|gt|quot|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity]);
}

function extractTitle(html, relativePath) {
  const match = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) throw new Error(relativePath + ': h1 is missing');
  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function categoryHref(localeKey, section) {
  const anchor = SECTION_ANCHORS[section];
  return '/' + localeKey + '/articles/' + (anchor ? '#' + anchor : '');
}

function resolveTarget(localeKey, target) {
  if (target === 'calculator') return '/' + localeKey + '/';
  if (target === 'related') return '#related-guides';
  if (target === 'earn') return categoryHref(localeKey, 'earn');
  if (target === 'troubleshooting') return categoryHref(localeKey, 'troubleshooting');
  return '/' + localeKey + '/articles/';
}

function renderRegionSwitcher(localeKey, copy) {
  const options = Object.entries(REGION_PATHS).map(([key, href]) => {
    const label = copy.regionNames[key];
    if (key === localeKey) return '        <span class="site-region-current" aria-current="true">' + escapeHtml(label) + '</span>';
    return '        <a href="' + href + '">' + escapeHtml(label) + '</a>';
  });
  return [
    '    <details class="site-region-switcher">',
    '      <summary aria-label="' + escapeHtml(copy.regionLabel + ': ' + copy.regionNames[localeKey]) + '"><span aria-hidden="true">🌐</span><span>' + escapeHtml(copy.regionNames[localeKey]) + '</span></summary>',
    '      <div class="site-region-menu">',
    '        <p class="site-region-menu-label">' + escapeHtml(copy.regionLabel) + '</p>',
    ...options,
    '      </div>',
    '    </details>'
  ];
}

function renderBreadcrumbs(localeKey, title, section, variant, copy) {
  const locale = LOCALES[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const items = ['    <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a>'];

  if (variant === 'policy') {
    items.push('    <span aria-hidden="true">&gt;</span>', '    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>');
  } else if (variant === 'hub') {
    items.push('    <span aria-hidden="true">&gt;</span>', '    <span class="intl-breadcrumb-current">' + escapeHtml(locale.blog) + '</span>');
  } else {
    items.push('    <span aria-hidden="true">&gt;</span>', '    <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>');
    if (SECTION_ANCHORS[section] && copy.nav[section]) {
      items.push('    <span aria-hidden="true">&gt;</span>', '    <a class="intl-breadcrumb-category" href="' + categoryHref(localeKey, section) + '">' + escapeHtml(copy.nav[section]) + '</a>');
    }
    items.push('    <span aria-hidden="true">&gt;</span>', '    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>');
  }

  return ['<div class="breadcrumbs-wrapper intl-article-breadcrumbs">', '  <nav aria-label="' + escapeHtml(copy.breadcrumb) + '">', ...items, '  </nav>', '</div>'];
}


const SITE_ORIGIN = 'https://playpoint-sim.com';

function canonicalUrlForPath(relativePath) {
  let normalized = '/' + String(relativePath).replace(/^\/+/, '');
  if (normalized.endsWith('/index.html')) normalized = normalized.slice(0, -'index.html'.length);
  return SITE_ORIGIN + normalized;
}

function buildBreadcrumbItems(localeKey, title, section, variant, relativePath) {
  const locale = LOCALES[localeKey];
  const copy = COPY[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const items = [{ name: locale.home, item: SITE_ORIGIN + homeHref }];

  if (variant === 'hub') {
    items.push({ name: locale.blog, item: SITE_ORIGIN + guidesHref });
    return items;
  }

  if (variant === 'policy') {
    items.push({ name: title, item: canonicalUrlForPath(relativePath) });
    return items;
  }

  items.push({ name: locale.blog, item: SITE_ORIGIN + guidesHref });
  if (SECTION_ANCHORS[section] && copy.nav[section]) {
    items.push({ name: copy.nav[section], item: SITE_ORIGIN + categoryHref(localeKey, section) });
  }
  items.push({ name: title, item: canonicalUrlForPath(relativePath) });
  return items;
}

function renderBreadcrumbSchema(localeKey, title, section, variant, relativePath) {
  const itemListElement = buildBreadcrumbItems(localeKey, title, section, variant, relativePath)
    .map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.item }));
  const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement };
  return '<script type="application/ld+json" data-intl-breadcrumbs>' + JSON.stringify(schema) + '</script>';
}

function upsertBreadcrumbSchema(html, localeKey, title, section, variant, relativePath, newline) {
  const rendered = renderBreadcrumbSchema(localeKey, title, section, variant, relativePath);
  const managed = /<script\b[^>]*data-intl-breadcrumbs[^>]*>[\s\S]*?<\/script>/i;
  if (managed.test(html)) return String(html).replace(managed, rendered);
  if (/"@type"\s*:\s*"BreadcrumbList"/.test(html)) return html;
  return String(html).replace(/<\/head>/i, rendered + newline + '</head>');
}

function renderChrome(localeKey, title, section, variant, newline) {
  const locale = LOCALES[localeKey];
  const copy = COPY[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const policyHref = homeHref + 'author/katakata.html';
  const navLinks = {
    home: [homeHref, locale.home, copy.navSub.home],
    guides: [guidesHref, locale.blog, copy.navSub.guides],
    troubleshooting: [categoryHref(localeKey, 'troubleshooting'), copy.nav.troubleshooting, copy.navSub.troubleshooting],
    earn: [categoryHref(localeKey, 'earn'), copy.nav.earn, copy.navSub.earn],
    levels: [categoryHref(localeKey, 'levels'), copy.nav.levels, copy.navSub.levels],
    account: [categoryHref(localeKey, 'account'), copy.nav.account, copy.navSub.account]
  };

  return [
    CHROME_START,
    '<a class="skip-link" href="#main-content">' + escapeHtml(copy.skip) + '</a>',
    '<header class="site-header guide-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + guidesHref + '"><span class="guide-brand-full"><span class="guide-wordmark">PlayPoint<span class="guide-brand-points" aria-hidden="true"><i></i><i></i><i></i></span></span><span class="guide-brand-caption">' + escapeHtml(copy.brandCaption) + '</span></span><span class="guide-brand-short">PlayPoint<span>' + escapeHtml(locale.blog) + '</span></span></a>',
    '    <div class="site-header-links site-header-tools">',
    '      <a class="site-about-link" href="' + policyHref + '">' + escapeHtml(copy.about) + '</a>',
    ...renderRegionSwitcher(localeKey, copy),
    '      <button type="button" id="theme-toggle" class="reading-theme-toggle" aria-label="' + escapeHtml(copy.themeLabel) + '">☀️</button>',
    '    </div>',
    '  </div>',
    '</header>',
    '<nav class="global-nav intl-global-nav" aria-label="' + escapeHtml(copy.primary) + '">',
    '  <div class="global-nav-inner">',
    ...SECTION_ORDER.map(key => {
      const [href, label, sub] = navLinks[key];
      const active = section === key ? ' active' : '';
      const ariaCurrent = section === key ? ' aria-current="page"' : '';
      return '    <a class="nav-item' + active + '" href="' + href + '"' + ariaCurrent + '><span>' + escapeHtml(label) + '</span><span class="nav-sub">' + escapeHtml(sub) + '</span></a>';
    }),
    '  </div>',
    '</nav>',
    ...renderBreadcrumbs(localeKey, title, section, variant, copy),
    CHROME_END
  ].join(newline);
}

function renderSearchWidget(localeKey, newline) {
  const copy = COPY[localeKey];
  return [
    '  <section class="sidebar-widget sidebar-widget--search">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(copy.searchTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <form class="sidebar-search-form" action="/' + localeKey + '/articles/" method="get" role="search">',
    '        <input class="sidebar-search-input" type="search" name="q" aria-label="' + escapeHtml(copy.searchLabel) + '">',
    '        <button class="sidebar-search-button" type="submit">' + escapeHtml(copy.searchButton) + '</button>',
    '      </form>',
    '      <div class="sidebar-search-footer"><a class="sidebar-browse-link" href="/' + localeKey + '/articles/">' + escapeHtml(copy.allGuides) + '</a></div>',
    '    </div>',
    '  </section>'
  ].join(newline);
}

function renderNextWidget(localeKey, role, variant, newline) {
  const copy = COPY[localeKey];
  const config = variant === 'article' ? (copy.role[role] || copy.role.reference) : (variant === 'hub' ? copy.hub : null);
  if (!config) return '';
  const roleClass = variant === 'article' ? ' sidebar-widget--role-' + (role || 'reference') : '';
  return [
    '  <section class="sidebar-widget sidebar-widget--next' + roleClass + '">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(config.kicker) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <p class="sidebar-next-title">' + escapeHtml(config.title) + '</p>',
    '      <p class="sidebar-next-copy">' + escapeHtml(config.body) + '</p>',
    '      <a class="sidebar-next-link" href="' + escapeHtml(resolveTarget(localeKey, config.target)) + '">' + escapeHtml(config.cta) + '</a>',
    '    </div>',
    '  </section>'
  ].join(newline);
}

function renderPopularWidget(localeKey, currentPath, catalog = [], rootDir = path.resolve(__dirname, '..'), newline = '\n') {
  const copy = COPY[localeKey];
  const popular = getPopularGuides(localeKey, currentPath, 5);
  const byHref = new Map(catalog.map(item => [item.href, item]));
  return [
    '  <section class="sidebar-widget sidebar-widget--popular" data-popular-snapshot="' + escapeHtml(POPULAR_GUIDES_SNAPSHOT) + '">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(copy.popularTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <p class="sidebar-widget-note">' + escapeHtml(copy.popularNote) + '</p>',
    '      <ol class="sidebar-popular-list">',
    ...popular.map(item => {
      const rank = String(item.rank).padStart(2, '0');
      const meta = byHref.get(item.href);
      const featured = item.rank === 1;
      const thumbSrc = featured ? publicThumbnail(meta?.thumbnail, rootDir) : '';
      const square = thumbSrc && isSquareThumbnail(meta?.thumbnail);
      const isCurrentClass = item.isCurrent ? ' is-current' : '';
      const title = item.isCurrent
        ? '<span class="sidebar-popular-current-title">' + escapeHtml(item.label) + '</span><span class="sidebar-popular-reading">' + escapeHtml(copy.reading) + '</span>'
        : '<a class="sidebar-popular-link" href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + '</a>';
      if (featured && thumbSrc) {
        return '        <li class="sidebar-popular-item' + isCurrentClass + '"><span class="sidebar-popular-rank">' + rank + '</span><div class="sidebar-popular-thumb' + (square ? ' sidebar-popular-thumb--square' : '') + '"><img src="' + escapeHtml(thumbSrc) + '" alt="" loading="lazy" decoding="async"></div><div class="sidebar-popular-feature-copy">' + title + '</div></li>';
      }
      return '        <li class="sidebar-popular-item' + isCurrentClass + '"><span class="sidebar-popular-rank">' + rank + '</span><div>' + title + '</div></li>';
    }),
    '      </ol>',
    '    </div>',
    '  </section>'
  ].join(newline);
}

function renderRelatedWidget(localeKey, relatedArticles, newline) {
  if (!Array.isArray(relatedArticles) || relatedArticles.length === 0) return '';
  const copy = COPY[localeKey];
  return [
    '  <section class="sidebar-widget sidebar-widget--related" id="related-guides">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(copy.relatedTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><ul class="sidebar-related-list">',
    ...relatedArticles.map(([href, label]) => '      <li class="sidebar-related-item"><a class="sidebar-related-link" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></li>'),
    '    </ul></div>',
    '  </section>'
  ].join(newline);
}

function renderAuthorWidget(localeKey, newline) {
  const copy = COPY[localeKey];
  const policyHref = '/' + localeKey + '/author/katakata.html';
  return [
    '  <section class="sidebar-widget sidebar-widget--author">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(copy.authorTitle) + '</h2>',
    '    <div class="sidebar-widget-body sidebar-author-card">',
    '      <div class="sidebar-author-avatar" aria-hidden="true">K</div>',
    '      <div><p class="sidebar-author-name">Katakata</p><p class="sidebar-author-copy">' + escapeHtml(copy.authorTrust) + '</p></div>',
    '      <div class="sidebar-author-links">',
    '        <a href="' + policyHref + '">' + escapeHtml(copy.authorCta) + '</a>',
    '        <a href="https://katakatalab.com/who-is-katakata.html" target="_blank" rel="me noopener noreferrer">' + escapeHtml(copy.labCta) + '</a>',
    '      </div>',
    '    </div>',
    '  </section>'
  ].join(newline);
}

function renderBrowseWidget(localeKey, section, catalog = [], newline = '\n') {
  const copy = COPY[localeKey];
  const items = ['account', 'earn', 'levels', 'troubleshooting'];
  const counts = new Map(items.map(k => [k, 0]));
  for (const article of catalog) {
    const cat = article.section || 'account';
    if (counts.has(cat)) counts.set(cat, counts.get(cat) + 1);
  }
  return [
    '  <section class="sidebar-widget sidebar-widget--browse">',
    '    <h2 class="sidebar-widget-title">' + escapeHtml(copy.browseTitle) + '</h2>',
    '    <div class="sidebar-widget-body sidebar-browse-grid"><ul class="sidebar-browse-list">',
    ...items.map(key => {
      const count = counts.get(key) || 0;
      const isCurrent = section === key;
      return '      <li class="sidebar-browse-item' + (isCurrent ? ' is-current-topic' : '') + '"><a class="sidebar-browse-category" href="' + categoryHref(localeKey, key) + '"><span>' + escapeHtml(copy.nav[key]) + '</span><span class="sidebar-browse-count" aria-label="' + count + escapeHtml(copy.countUnit) + '">' + count + '</span></a></li>';
    }),
    '    </ul></div>',
    '  </section>'
  ].join(newline);
}

function renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, catalog = [], rootDir = path.resolve(__dirname, '..'), newline = '\n') {
  const copy = COPY[localeKey];
  const widgets = [];
  widgets.push(renderSearchWidget(localeKey, newline));
  widgets.push(renderBrowseWidget(localeKey, section, catalog, newline));
  if (variant === 'article') {
    const related = renderRelatedWidget(localeKey, relatedArticles, newline);
    if (related) widgets.push(related);
  }
  widgets.push(renderPopularWidget(localeKey, '/' + String(relativePath).replace(/^\//, ''), catalog, rootDir, newline));
  const next = renderNextWidget(localeKey, role, variant, newline);
  if (next) widgets.push(next);
  if (variant !== 'policy') widgets.push(renderAuthorWidget(localeKey, newline));
  return ['<aside class="sidebar-column intl-article-sidebar" aria-label="' + escapeHtml(copy.sidebar) + '" data-article-role="' + (role || 'reference') + '" data-article-category="' + section + '">', ...widgets, '</aside>'].join(newline);
}

function ensureStylesheet(html, newline) {
  let next = html;
  if (!next.includes(SHELL_STYLESHEET)) {
    const intlCss = /<link\b[^>]*href=["'][^"']*\/articles\/intl-article\.css(?:\?[^"']*)?["'][^>]*>/i;
    if (intlCss.test(next)) next = next.replace(intlCss, match => match + newline + '<link rel="stylesheet" href="' + SHELL_STYLESHEET + '">');
    else next = next.replace(/<\/head>/i, '<link rel="stylesheet" href="' + SHELL_STYLESHEET + '">' + newline + '</head>');
  }
  if (!next.includes('/articles/japanese-shell.css')) {
    next = next.replace(/<\/head>/i, '<link rel="stylesheet" href="/articles/japanese-shell.css">' + newline + '</head>');
  }
  if (!next.includes('/articles/guide-navigation.css')) {
    next = next.replace(/<\/head>/i, '<link rel="stylesheet" href="/articles/guide-navigation.css">' + newline + '</head>');
  }
  if (!next.includes('/articles/guide-editorial.css')) {
    next = next.replace(/<\/head>/i, '<link rel="stylesheet" href="/articles/guide-editorial.css">' + newline + '</head>');
  }
  return next;
}

function ensureMainTarget(html) {
  return String(html).replace(/<main\b([^>]*\bclass=["'][^"']*\bmain-card\b[^"']*["'][^>]*)>/i, (full, attrs) => {
    if (/\bid=["']main-content["']/i.test(full)) return full;
    return '<main id="main-content"' + attrs + '>';
  });
}

function enhanceAuthorBox(html, localeKey) {
  if (/class=["'][^"']*\bauthor-box-links\b/i.test(html)) return html;
  const copy = COPY[localeKey];
  const policyHref = '/' + localeKey + '/author/katakata.html';
  return String(html).replace(/(<aside\b[^>]*class=["'][^"']*\bauthor-box\b[^"']*["'][^>]*>[\s\S]*?)(<\/aside>)/i, (full, body, close) => {
    const links = '<p class="author-box-links"><a href="' + policyHref + '">' + escapeHtml(copy.authorCta) + '</a><span aria-hidden="true">·</span><a href="https://katakatalab.com/who-is-katakata.html" target="_blank" rel="me noopener noreferrer">' + escapeHtml(copy.labCta) + '</a></p>';
    return body + links + close;
  });
}

function replaceChrome(html, rendered) {
  const pattern = /<!-- INTL_ARTICLE_CHROME_START -->[\s\S]*?<!-- INTL_ARTICLE_CHROME_END -->/;
  if (!pattern.test(html)) throw new Error('international shell chrome marker is missing');
  return String(html).replace(pattern, rendered);
}

function replaceSidebar(html, rendered) {
  const pattern = /<aside\b[^>]*class=["'][^"']*\bsidebar-column\b[^"']*(?:intl-article-sidebar|ja-article-sidebar)[^"']*["'][^>]*>[\s\S]*?<\/aside>/i;
  if (!pattern.test(html)) throw new Error('sidebar column is missing');
  return String(html).replace(pattern, rendered);
}

function syncPage({ rootDir, localeKey, relativePath, section, role = null, relatedArticles = null, variant, catalog = [] }) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return false;
  const before = fs.readFileSync(absolutePath, 'utf8');
  const newline = before.includes('\r\n') ? '\r\n' : '\n';
  const title = extractTitle(before, relativePath);
  let after = ensureStylesheet(before, newline);
  after = replaceChrome(after, renderChrome(localeKey, title, section, variant, newline));
  after = upsertBreadcrumbSchema(after, localeKey, title, section, variant, relativePath, newline);
  after = replaceSidebar(after, renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, catalog, rootDir, newline));
  after = ensureMainTarget(after);
  if (variant === 'article') after = enhanceAuthorBox(after, localeKey);
  if (after === before) return false;
  fs.writeFileSync(absolutePath, after, 'utf8');
  return true;
}

function extractThumbnail(html) {
  const match = String(html).match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (!match) return '';
  const url = match[1];
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return url.replace(/^\//, '');
  }
}

function buildCatalog(rootDir, localeKey) {
  const articleDir = path.join(rootDir, localeKey, 'articles');
  if (!fs.existsSync(articleDir)) return [];
  return fs.readdirSync(articleDir)
    .filter(file => file.endsWith('.html') && file !== 'index.html')
    .sort()
    .map(file => {
      const relativePath = path.posix.join(localeKey, 'articles', file);
      const html = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
      return {
        path: relativePath,
        href: '/' + relativePath,
        label: extractTitle(html, relativePath),
        section: getIntlGuideCategory(relativePath) || 'guides',
        thumbnail: extractThumbnail(html)
      };
    });
}

function syncIntlNavigationSidebarV1(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const localeKey of Object.keys(COPY)) {
    const catalog = buildCatalog(rootDir, localeKey);
    for (const article of catalog) {
      const relatedArticles = selectRelatedArticles(catalog, article.path, 3);
      const section = article.section || 'guides';
      const role = classifyArticleRole(article.path) || 'reference';
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: article.path, section, role, relatedArticles, variant: 'article', catalog })) summary.changed++;
    }

    const hubPath = path.posix.join(localeKey, 'articles', 'index.html');
    if (fs.existsSync(path.join(rootDir, hubPath))) {
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: hubPath, section: 'guides', variant: 'hub', catalog })) summary.changed++;
    }

    const policyPath = path.posix.join(localeKey, 'author', 'katakata.html');
    if (fs.existsSync(path.join(rootDir, policyPath))) {
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: policyPath, section: 'policy', variant: 'policy', catalog })) summary.changed++;
    }
  }
  return summary;
}

module.exports = { COPY, SHELL_STYLESHEET, renderChrome, renderSidebar, syncIntlNavigationSidebarV1 };
