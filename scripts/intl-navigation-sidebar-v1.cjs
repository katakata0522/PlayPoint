'use strict';

const fs = require('node:fs');
const path = require('node:path');
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
    '<header class="site-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',
    '    <div class="site-header-tools">',
    '      <a class="site-about-link" href="' + policyHref + '">' + escapeHtml(copy.about) + '</a>',
    ...renderRegionSwitcher(localeKey, copy),
    '    </div>',
    '  </div>',
    '</header>',
    '<nav class="global-nav intl-global-nav" aria-label="' + escapeHtml(copy.primary) + '">',
    '  <div class="global-nav-inner">',
    ...SECTION_ORDER.map(key => {
      const [href, label, sub] = navLinks[key];
      const active = section === key ? ' active' : '';
      return '    <a class="nav-item' + active + '" href="' + href + '"><span>' + escapeHtml(label) + '</span><span class="nav-sub">' + escapeHtml(sub) + '</span></a>';
    }),
    '  </div>',
    '</nav>',
    ...renderBreadcrumbs(localeKey, title, section, variant, copy),
    CHROME_END
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

function renderPopularWidget(localeKey, currentPath, newline) {
  const copy = COPY[localeKey];
  const popular = getPopularGuides(localeKey, currentPath, 5);
  return [
    '  <section class="sidebar-widget sidebar-widget--popular" data-popular-snapshot="' + escapeHtml(POPULAR_GUIDES_SNAPSHOT) + '">',
    '    <h2 class="sidebar-widget-title">🔥 ' + escapeHtml(copy.popularTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <p class="sidebar-widget-note">' + escapeHtml(copy.popularNote) + '</p>',
    '      <ol class="sidebar-popular-list">',
    ...popular.map(item => {
      const rank = String(item.rank).padStart(2, '0');
      if (item.isCurrent) return '        <li class="sidebar-popular-item is-current"><span class="sidebar-popular-rank">' + rank + '</span><div><span class="sidebar-popular-current-title">' + escapeHtml(item.label) + '</span><span class="sidebar-popular-reading">' + escapeHtml(copy.reading) + '</span></div></li>';
      return '        <li class="sidebar-popular-item"><span class="sidebar-popular-rank">' + rank + '</span><a class="sidebar-popular-link" href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + '</a></li>';
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
    '    <h2 class="sidebar-widget-title">🔗 ' + escapeHtml(copy.relatedTitle) + '</h2>',
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
    '    <h2 class="sidebar-widget-title">👤 ' + escapeHtml(copy.authorTitle) + '</h2>',
    '    <div class="sidebar-widget-body sidebar-author-card">',
    '      <div class="sidebar-author-avatar" aria-hidden="true">K</div>',
    '      <div><p class="sidebar-author-name">Katakata</p><p class="sidebar-author-role">' + escapeHtml(copy.authorRole) + '</p></div>',
    '      <p class="sidebar-author-trust">' + escapeHtml(copy.authorTrust) + '</p>',
    '      <div class="sidebar-author-links">',
    '        <a href="' + policyHref + '">' + escapeHtml(copy.authorCta) + '</a>',
    '        <a href="https://katakatalab.com/who-is-katakata.html" target="_blank" rel="me noopener noreferrer">' + escapeHtml(copy.labCta) + '</a>',
    '      </div>',
    '    </div>',
    '  </section>'
  ].join(newline);
}

function renderBrowseWidget(localeKey, section, newline) {
  const copy = COPY[localeKey];
  const items = ['account', 'earn', 'levels', 'troubleshooting'];
  return [
    '  <section class="sidebar-widget sidebar-widget--browse">',
    '    <h2 class="sidebar-widget-title">📁 ' + escapeHtml(copy.browseTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><div class="sidebar-browse-grid">',
    ...items.map(key => '      <a class="sidebar-browse-link' + (section === key ? ' is-current' : '') + '" href="' + categoryHref(localeKey, key) + '">' + escapeHtml(copy.nav[key]) + '</a>'),
    '    </div></div>',
    '  </section>'
  ].join(newline);
}

function renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, newline) {
  const copy = COPY[localeKey];
  const widgets = [];
  const next = renderNextWidget(localeKey, role, variant, newline);
  if (next) widgets.push(next);
  widgets.push(renderPopularWidget(localeKey, '/' + String(relativePath).replace(/^\//, ''), newline));
  if (variant === 'article') {
    const related = renderRelatedWidget(localeKey, relatedArticles, newline);
    if (related) widgets.push(related);
  }
  if (variant !== 'policy') widgets.push(renderAuthorWidget(localeKey, newline));
  widgets.push(renderBrowseWidget(localeKey, section, newline));
  return ['<aside class="sidebar-column intl-article-sidebar" aria-label="' + escapeHtml(copy.sidebar) + '">', ...widgets, '</aside>'].join(newline);
}

function ensureStylesheet(html, newline) {
  if (String(html).includes(SHELL_STYLESHEET)) return html;
  const intlCss = /<link\b[^>]*href=["'][^"']*\/articles\/intl-article\.css(?:\?[^"']*)?["'][^>]*>/i;
  if (intlCss.test(html)) return String(html).replace(intlCss, match => match + newline + '<link rel="stylesheet" href="' + SHELL_STYLESHEET + '">');
  return String(html).replace(/<\/head>/i, '<link rel="stylesheet" href="' + SHELL_STYLESHEET + '">' + newline + '</head>');
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
  const pattern = /<aside\b[^>]*class=["'][^"']*\bsidebar-column\b[^"']*\bintl-article-sidebar\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/i;
  if (!pattern.test(html)) throw new Error('international shell sidebar is missing');
  return String(html).replace(pattern, rendered);
}

function syncPage({ rootDir, localeKey, relativePath, section, role = null, relatedArticles = null, variant }) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return false;
  const before = fs.readFileSync(absolutePath, 'utf8');
  const newline = before.includes('\r\n') ? '\r\n' : '\n';
  const title = extractTitle(before, relativePath);
  let after = ensureStylesheet(before, newline);
  after = replaceChrome(after, renderChrome(localeKey, title, section, variant, newline));
  after = upsertBreadcrumbSchema(after, localeKey, title, section, variant, relativePath, newline);
  after = replaceSidebar(after, renderSidebar(localeKey, relativePath, section, role, relatedArticles, variant, newline));
  after = ensureMainTarget(after);
  if (variant === 'article') after = enhanceAuthorBox(after, localeKey);
  if (after === before) return false;
  fs.writeFileSync(absolutePath, after, 'utf8');
  return true;
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
      return { path: relativePath, href: '/' + relativePath, label: extractTitle(html, relativePath) };
    });
}

function syncIntlNavigationSidebarV1(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const localeKey of Object.keys(COPY)) {
    const catalog = buildCatalog(rootDir, localeKey);
    for (const article of catalog) {
      const relatedArticles = selectRelatedArticles(catalog, article.path, 3);
      const section = getIntlGuideCategory(article.path) || 'guides';
      const role = classifyArticleRole(article.path) || 'reference';
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: article.path, section, role, relatedArticles, variant: 'article' })) summary.changed++;
    }

    const hubPath = path.posix.join(localeKey, 'articles', 'index.html');
    if (fs.existsSync(path.join(rootDir, hubPath))) {
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: hubPath, section: 'guides', variant: 'hub' })) summary.changed++;
    }

    const policyPath = path.posix.join(localeKey, 'author', 'katakata.html');
    if (fs.existsSync(path.join(rootDir, policyPath))) {
      summary.checked++;
      if (syncPage({ rootDir, localeKey, relativePath: policyPath, section: 'policy', variant: 'policy' })) summary.changed++;
    }
  }
  return summary;
}

module.exports = { COPY, SHELL_STYLESHEET, renderChrome, renderSidebar, syncIntlNavigationSidebarV1 };
