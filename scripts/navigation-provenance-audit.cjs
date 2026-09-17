'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_TOP_LEVEL_DIRECTORIES
} = require('../.github/scripts/public-paths.cjs');
const { evidenceDir } = require('../.github/scripts/ci-evidence.cjs');
const { SITE_ORIGIN } = require('./site-click-depth.cjs');

const REPORT_DATE = '2026-09-17';
const SNAPSHOT_JSON = `docs/NAVIGATION_PROVENANCE_INVENTORY_${REPORT_DATE}.json`;
const SNAPSHOT_MD = `docs/NAVIGATION_PROVENANCE_INVENTORY_${REPORT_DATE}.md`;
const RUNTIME_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const PUBLIC_REGION_PREFIX = Object.freeze({ en: 'US', ko: 'KR', tw: 'TW', hk: 'HK', in: 'IN' });
const REGION_INFO = Object.freeze({
  JP: Object.freeze({ id: 'JP', locale: 'ja', prefix: '', contentFallback: null }),
  US: Object.freeze({ id: 'US', locale: 'en', prefix: 'en', contentFallback: null }),
  KR: Object.freeze({ id: 'KR', locale: 'ko', prefix: 'ko', contentFallback: null }),
  TW: Object.freeze({ id: 'TW', locale: 'zh-TW', prefix: 'tw', contentFallback: null }),
  HK: Object.freeze({ id: 'HK', locale: 'zh-HK', prefix: 'hk', contentFallback: 'TW' }),
  IN: Object.freeze({ id: 'IN', locale: 'en-IN', prefix: 'in', contentFallback: 'US' })
});

const NAVIGATION_SOURCE_REGISTRY = Object.freeze([
  { id: 'build-orchestrator', kind: 'orchestrator', file: 'scripts/build-html.js', targets: 'all generated/synchronized public HTML' },
  { id: 'locale-home-generator', kind: 'primary-generator', file: 'scripts/language-page-builder.cjs', targets: 'en/index.html, ko/index.html, tw/index.html' },
  { id: 'region-home-generator', kind: 'primary-generator', file: 'scripts/region-page-sync.cjs', targets: 'hk/index.html, in/index.html + calculator hreflang additions' },
  { id: 'intl-seo-generator', kind: 'primary-generator', file: 'scripts/intl-seo-pages.cjs', targets: 'getIntlSeoFiles() international guide/author/hub outputs' },
  { id: 'intl-content-expansion', kind: 'primary-generator', file: 'scripts/intl-content-expansion.cjs', targets: 'getIntlContentExpansionFiles() international expansion outputs' },
  { id: 'intl-game-guide-generator', kind: 'primary-generator', file: 'scripts/intl-game-guide-expansion.cjs', targets: 'EN/KO/TW localized game guide articles' },
  { id: 'game-simulator-generator', kind: 'primary-generator', file: 'scripts/generate-game-simulators.cjs', targets: 'games/**/index.html and EN/KO/TW game simulator mirrors' },
  { id: 'calculator-header-sync', kind: 'navigation-mutator', file: 'scripts/calculator-header-sync.cjs', targets: 'calculator home Site Shell navigation' },
  { id: 'region-hreflang-sync', kind: 'metadata-mutator', file: 'scripts/region-hreflang-sync.cjs', targets: 'calculator canonical/hreflang region graph' },
  { id: 'intl-layout-sync', kind: 'navigation-mutator', file: 'scripts/intl-article-layout.cjs', targets: 'EN/KO/TW article shell/header/breadcrumb/sidebar' },
  { id: 'intl-navigation-sidebar-v1', kind: 'navigation-mutator', file: 'scripts/intl-navigation-sidebar-v1.cjs', targets: 'EN/KO/TW task navigation, region switcher, next action, related/sidebar links' },
  { id: 'intl-hub-discovery', kind: 'navigation-mutator', file: 'scripts/intl-hub-discovery.cjs', targets: 'EN/KO/TW guide hub discovery links' },
  { id: 'intl-article-hreflang', kind: 'metadata-mutator', file: 'scripts/intl-article-hreflang-sync.cjs', targets: 'international article JA/EN/KO/TW reciprocal hreflang' },
  { id: 'japanese-navigation-sidebar', kind: 'navigation-mutator', file: 'scripts/japanese-navigation-sidebar.cjs', targets: 'Japanese article navigation/sidebar' },
  { id: 'article-content-navigation', kind: 'navigation-mutator', file: 'scripts/article-content-navigation-normalize.cjs', targets: 'published article CTA/related/search-intent navigation' },
  { id: 'article-discovery', kind: 'navigation-mutator', file: 'scripts/article-discovery-sync.cjs', targets: 'article discovery/search/reading links' },
  { id: 'fixed-page-header-sync', kind: 'navigation-mutator', file: 'scripts/fixed-page-header-sync.cjs', targets: 'fixed public page Site Shell navigation' },
  { id: 'legal-language-nav', kind: 'navigation-mutator', file: 'scripts/legal-page-lang-nav-sync.cjs', targets: 'privacy/terms locale navigation' },
  { id: 'manual-lp-hreflang', kind: 'metadata-mutator', file: 'scripts/manual-lp-hreflang-sync.cjs', targets: 'manual LP canonical/hreflang graph' },
  { id: 'author-hreflang', kind: 'metadata-mutator', file: 'scripts/author-hreflang-sync.cjs', targets: 'operator profile reciprocal hreflang' },
  { id: 'game-article-hub', kind: 'navigation-mutator', file: 'scripts/game-guide-article-hub-sync.cjs', targets: 'Japanese game guide article header/hub/CTA links' },
  { id: 'runtime-region-navigation', kind: 'runtime-navigation', file: 'js/region-navigation.js', targets: 'calculator Play country switching at runtime' },
  { id: 'runtime-article-navigation', kind: 'runtime-navigation', file: 'blog/article.js', targets: 'Japanese article runtime contextual navigation' }
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function recurseFiles(rootDir, currentDir, files) {
  if (!fs.existsSync(currentDir)) return files;
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) recurseFiles(rootDir, absolute, files);
    else if (entry.isFile()) files.push(toPosix(path.relative(rootDir, absolute)));
  }
  return files;
}

function collectPublicFiles(rootDir) {
  const files = [];
  for (const name of [...PUBLIC_ROOT_FILES].sort()) {
    const absolute = path.join(rootDir, name);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) files.push(name);
  }
  for (const name of [...PUBLIC_TOP_LEVEL_DIRECTORIES].sort()) {
    recurseFiles(rootDir, path.join(rootDir, name), files);
  }
  return [...new Set(files)].sort();
}

function publicPathForFile(relativePath) {
  const normalized = toPosix(relativePath);
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized}`;
}

function buildPublicUrlIndex(publicFiles) {
  const index = new Map();
  for (const relativePath of publicFiles) {
    const publicPath = publicPathForFile(relativePath);
    index.set(publicPath, relativePath);
    if (publicPath !== '/' && publicPath.endsWith('/')) index.set(publicPath.slice(0, -1), relativePath);
  }
  return index;
}

function regionForPathname(pathname) {
  const first = String(pathname || '/').replace(/^\/+/, '').split('/')[0].toLowerCase();
  return PUBLIC_REGION_PREFIX[first] || 'JP';
}

function regionForRepositoryPath(relativePath) {
  return regionForPathname('/' + toPosix(relativePath));
}

function lineAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text.charCodeAt(index) === 10) line += 1;
  return line;
}

function decodeHtmlUrl(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#x26;/gi, '&')
    .trim();
}

function getAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] ?? null;
}

function getRelTokens(tag) {
  return String(getAttribute(tag, 'rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
}

function roleForAnchor(tag, html, offset) {
  const own = tag.toLowerCase();
  const local = `${own} ${html.slice(Math.max(0, offset - 1400), offset).toLowerCase()}`;
  if (/\bdata-region\b|site-region-switcher|region-switch|region-more/.test(local)) return 'region-switch';
  if (/breadcrumb/.test(local)) return 'breadcrumb';
  if (/author-box|sidebar-author|operator/.test(local)) return 'author';
  if (/related|contextual|popular-guides/.test(local)) return 'related';
  if (/article-next-step|calculator-prompt|\bcta\b|next-action/.test(local)) return 'cta';
  if (/site-header|site-logo|global-nav|header-links/.test(local)) return 'header';
  if (/site-footer|<footer\b/.test(local)) return 'footer';
  if (/<nav\b/.test(local)) return 'nav';
  return 'content';
}

function resolveReference(rawHref, sourceUrl, baseHref = null) {
  const raw = decodeHtmlUrl(rawHref);
  if (!raw) return { scope: 'empty', raw };
  if (raw.startsWith('#')) return { scope: 'fragment', raw, hash: raw };
  if (/^(?:mailto|tel|javascript|data|blob):/i.test(raw)) return { scope: 'special', raw };

  let base = sourceUrl;
  if (baseHref) {
    try { base = new URL(baseHref, sourceUrl).toString(); } catch { /* keep sourceUrl */ }
  }

  let url;
  try { url = new URL(raw, base); }
  catch { return { scope: 'invalid', raw }; }

  const scope = url.origin === SITE_ORIGIN ? 'internal' : 'external';
  return {
    scope,
    raw,
    url: url.toString(),
    origin: url.origin,
    pathname: url.pathname.replace(/\/{2,}/g, '/'),
    search: url.search,
    hash: url.hash,
    targetRegion: scope === 'internal' ? regionForPathname(url.pathname) : null
  };
}

function extractHtmlNavigation(relativePath, html) {
  const sourcePath = publicPathForFile(relativePath);
  const sourceUrl = new URL(sourcePath, SITE_ORIGIN).toString();
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0] || '';
  const baseHref = getAttribute(baseTag, 'href');
  const records = [];

  function push(kind, role, rawHref, tag, offset, extra = {}) {
    records.push({
      sourceFile: relativePath,
      sourcePath,
      sourceRegion: regionForRepositoryPath(relativePath),
      kind,
      role,
      line: lineAt(html, offset),
      rawHref: decodeHtmlUrl(rawHref),
      tag: tag.replace(/\s+/g, ' ').slice(0, 300),
      ...resolveReference(rawHref, sourceUrl, baseHref),
      ...extra
    });
  }

  for (const match of html.matchAll(/<(a|area)\b[^>]*>/gi)) {
    const href = getAttribute(match[0], 'href');
    if (href !== null) push('anchor', roleForAnchor(match[0], html, match.index), href, match[0], match.index);
  }

  for (const match of html.matchAll(/<form\b[^>]*>/gi)) {
    const action = getAttribute(match[0], 'action');
    if (action !== null) push('form-action', 'form', action, match[0], match.index);
  }

  for (const match of html.matchAll(/<(?:button|input)\b[^>]*>/gi)) {
    const action = getAttribute(match[0], 'formaction');
    if (action !== null) push('form-action', 'form', action, match[0], match.index);
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const href = getAttribute(match[0], 'href');
    if (href === null) continue;
    const rel = getRelTokens(match[0]);
    if (rel.includes('canonical')) push('canonical', 'canonical', href, match[0], match.index);
    if (rel.includes('alternate') && getAttribute(match[0], 'hreflang')) {
      push('hreflang', 'hreflang', href, match[0], match.index, { hreflang: getAttribute(match[0], 'hreflang') });
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (String(getAttribute(match[0], 'http-equiv') || '').toLowerCase() !== 'refresh') continue;
    const content = getAttribute(match[0], 'content') || '';
    const url = content.match(/(?:^|;)\s*url\s*=\s*(.+)$/i)?.[1]?.trim().replace(/^["']|["']$/g, '');
    if (url) push('meta-refresh', 'runtime', url, match[0], match.index);
  }

  return records;
}

const RUNTIME_PATTERNS = Object.freeze([
  ['location-href', /\b(?:window\.)?location\.href\s*=\s*([^;\n]+)/g],
  ['location-assign', /\b(?:window\.)?location\.(?:assign|replace)\s*\(([^)\n]+)\)/g],
  ['window-open', /\bwindow\.open\s*\(([^,\n)]+)/g],
  ['history-state', /\bhistory\.(?:pushState|replaceState)\s*\([^,]*,[^,]*,\s*([^)\n]+)\)/g]
]);

function literalFromExpression(expression) {
  const text = String(expression || '').trim();
  const quote = text[0];
  if (!['"', "'", '`'].includes(quote) || text[text.length - 1] !== quote) return null;
  const body = text.slice(1, -1);
  if (quote === '`' && body.includes('${')) return null;
  return body.replace(/\\([\\'"`])/g, '$1');
}

function extractRuntimeNavigationFromText(sourceFile, text, sourcePath = '/') {
  const sourceUrl = new URL(sourcePath, SITE_ORIGIN).toString();
  const records = [];
  for (const [kind, pattern] of RUNTIME_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const expression = match[1].trim();
      const literal = literalFromExpression(expression);
      const resolved = literal === null
        ? { scope: 'dynamic', raw: expression }
        : resolveReference(literal, sourceUrl);
      records.push({
        sourceFile,
        sourcePath,
        sourceRegion: regionForPathname(sourcePath),
        kind,
        role: 'runtime',
        line: lineAt(text, match.index),
        expression: expression.slice(0, 500),
        literal,
        ...resolved
      });
    }
  }
  return records;
}

function targetExists(record, publicUrlIndex) {
  if (record.scope !== 'internal') return null;
  const pathname = record.pathname || '/';
  if (publicUrlIndex.has(pathname)) return true;
  if (pathname !== '/' && pathname.endsWith('/') && publicUrlIndex.has(pathname.slice(0, -1))) return true;
  if (pathname !== '/' && !pathname.endsWith('/') && publicUrlIndex.has(`${pathname}/`)) return true;
  return false;
}

function fallbackRegionFor(sourceRegion) {
  return REGION_INFO[sourceRegion]?.contentFallback || null;
}

function isDeclaredContentFallback(sourceRegion, record) {
  if (record.scope !== 'internal') return false;
  const fallback = fallbackRegionFor(sourceRegion);
  if (!fallback || record.targetRegion !== fallback) return false;
  const pathname = record.pathname || '';
  if (sourceRegion === 'HK') return /^\/tw\/(?:articles|games)\//.test(pathname);
  if (sourceRegion === 'IN') return /^\/en\/(?:articles|games)\//.test(pathname);
  return false;
}

function equivalentCandidates(targetPathname, sourceRegion) {
  const fallback = fallbackRegionFor(sourceRegion);
  const effectiveRegion = fallback || sourceRegion;
  const prefix = REGION_INFO[effectiveRegion]?.prefix;
  if (!prefix || targetPathname === undefined) return [];
  const pathOnly = targetPathname || '/';
  if (pathOnly === '/') return [`/${prefix}/`];
  if (pathOnly === '/blog' || pathOnly === '/blog/') return [`/${prefix}/articles/`];
  if (pathOnly.startsWith(`/${prefix}/`)) return [pathOnly];
  return [`/${prefix}${pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`}`];
}

function findLocalizedEquivalent(record, publicUrlIndex) {
  if (record.scope !== 'internal' || record.targetRegion !== 'JP' || record.sourceRegion === 'JP') return null;
  for (const candidate of equivalentCandidates(record.pathname, record.sourceRegion)) {
    if (publicUrlIndex.has(candidate) || publicUrlIndex.has(candidate.replace(/\/$/, ''))) return candidate;
  }
  return null;
}

function classifyTransition(record, publicUrlIndex) {
  const exists = targetExists(record, publicUrlIndex);
  const base = { targetExists: exists, localizedEquivalent: null, disposition: record.scope, severity: null, issue: null };

  if (record.scope === 'invalid') return { ...base, disposition: 'invalid-url', severity: 'high', issue: 'invalid-navigation-url' };
  if (record.scope !== 'internal') return base;

  if (exists === false) return { ...base, disposition: 'broken-internal-target', severity: 'high', issue: 'broken-internal-target' };

  if (record.kind === 'canonical') {
    const same = record.pathname === record.sourcePath || (record.sourcePath.endsWith('/') && record.pathname === record.sourcePath.slice(0, -1));
    return same
      ? { ...base, disposition: 'self-canonical' }
      : { ...base, disposition: 'canonical-review', severity: 'high', issue: 'canonical-points-elsewhere' };
  }
  if (record.kind === 'hreflang') return { ...base, disposition: 'hreflang-cross-locale' };
  if (record.role === 'region-switch') return { ...base, disposition: 'declared-region-switch' };
  if (record.sourceRegion === record.targetRegion) return { ...base, disposition: 'same-region' };
  if (isDeclaredContentFallback(record.sourceRegion, record)) return { ...base, disposition: 'declared-content-fallback' };

  const equivalent = findLocalizedEquivalent(record, publicUrlIndex);
  if (record.sourceRegion !== 'JP' && record.targetRegion === 'JP') {
    if (equivalent) {
      return {
        ...base,
        localizedEquivalent: equivalent,
        disposition: 'likely-wrong-locale',
        severity: 'high',
        issue: 'localized-equivalent-exists'
      };
    }
    return { ...base, disposition: 'japanese-fallback-review', severity: 'medium', issue: 'unexpected-japanese-fallback' };
  }

  return { ...base, disposition: 'cross-region-review', severity: 'medium', issue: 'cross-region-user-navigation' };
}

function createGeneratorContext(rootDir) {
  const { getIntlSeoFiles } = require('./intl-seo-pages.cjs');
  const { getIntlContentExpansionFiles } = require('./intl-content-expansion.cjs');
  const { getIntlAuthorPageFiles } = require('./intl-author-pages.cjs');
  const { ALL_GUIDES } = require('./intl-game-guide-expansion.cjs');
  const { getGamePageHtmlFiles, GAME_GENERATOR_FILE } = require('./game-page-targets.cjs');

  const htmlSet = values => new Set(values.filter(value => String(value).endsWith('.html')).map(toPosix));
  return {
    intlSeo: htmlSet(getIntlSeoFiles()),
    intlExpansion: htmlSet(getIntlContentExpansionFiles()),
    intlAuthors: htmlSet(getIntlAuthorPageFiles()),
    intlGameGuides: htmlSet(['en', 'ko', 'tw'].flatMap(locale => ALL_GUIDES.map(guide => `${locale}/articles/${guide.slug}.html`))),
    gamePages: htmlSet(getGamePageHtmlFiles(rootDir)),
    gameGeneratorFile: GAME_GENERATOR_FILE
  };
}

function primaryOwnerFor(relativePath, generator) {
  const file = toPosix(relativePath);
  if (['en/index.html', 'ko/index.html', 'tw/index.html'].includes(file)) return 'locale-home-generator';
  if (['hk/index.html', 'in/index.html'].includes(file)) return 'region-home-generator';
  if (generator.intlGameGuides.has(file)) return 'intl-game-guide-generator';
  if (generator.intlExpansion.has(file)) return 'intl-content-expansion';
  if (generator.intlAuthors.has(file)) return 'intl-seo-generator';
  if (generator.intlSeo.has(file)) return 'intl-seo-generator';
  if (generator.gamePages.has(file)) return 'game-simulator-generator';
  if (file === 'index.html') return 'tracked-root-calculator';
  if (/^articles\/[^/]+\.html$/.test(file)) return 'tracked-japanese-article';
  if (/^blog\//.test(file)) return 'tracked-japanese-blog';
  if (/^author\//.test(file)) return 'tracked-japanese-author';
  if (/^(?:en|ko|tw)\/articles\//.test(file)) return 'tracked-international-article';
  if (/^(?:en|ko|tw)\/author\//.test(file)) return 'tracked-international-author';
  if (/^(?:amount|campaign|compare|maintenance|points-cost|status|latest|embed)\//.test(file)) return 'tracked-manual-lp';
  if (/^(?:en|ko|tw|hk|in)\/[^/]+\.html$/.test(file)) return 'tracked-locale-fixed-page';
  if (!file.includes('/')) return 'tracked-root-fixed-page';
  return null;
}

function mutatorsFor(relativePath) {
  const file = toPosix(relativePath);
  const ids = new Set();
  const intl = /^(?:en|ko|tw)\//.test(file);
  const article = /^(?:articles|(?:en|ko|tw)\/articles)\//.test(file);
  const intlArticleSurface = /^(?:en|ko|tw)\/(?:articles|author)\//.test(file);
  const game = /^(?:(?:en|ko|tw)\/)?games\//.test(file);
  const topCalculator = /^(?:index\.html|(?:en|ko|tw|hk|in)\/index\.html)$/.test(file);

  if (topCalculator) {
    ids.add('calculator-header-sync');
    ids.add('region-hreflang-sync');
  }
  if (['en/index.html', 'ko/index.html', 'tw/index.html'].includes(file)) ids.add('locale-home-generator');
  if (['hk/index.html', 'in/index.html'].includes(file)) ids.add('region-home-generator');
  if (intlArticleSurface) {
    ids.add('intl-layout-sync');
    ids.add('intl-navigation-sidebar-v1');
    ids.add('intl-article-hreflang');
  }
  if (intl && /\/articles\//.test(file)) ids.add('intl-hub-discovery');
  if (article) {
    ids.add('article-content-navigation');
    ids.add('article-discovery');
  }
  if (/^articles\//.test(file)) ids.add('japanese-navigation-sidebar');
  if (game) ids.add('game-article-hub');
  if (/^(?:amount|campaign|compare|maintenance|points-cost|status)\//.test(file)) ids.add('manual-lp-hreflang');
  if (/(?:^|\/)(?:privacy|terms)\.html$/.test(file)) ids.add('legal-language-nav');
  if (!article && !game && !topCalculator) ids.add('fixed-page-header-sync');
  if (/(?:^|\/)author\//.test(file)) ids.add('author-hreflang');
  return [...ids].sort();
}

function validateSourceRegistry(rootDir) {
  return NAVIGATION_SOURCE_REGISTRY
    .filter(entry => !fs.existsSync(path.join(rootDir, entry.file)))
    .map(entry => `navigation source file is missing: ${entry.id} -> ${entry.file}`);
}

function sortRecords(records) {
  return records.sort((a, b) => (
    a.sourceFile.localeCompare(b.sourceFile)
    || (a.line || 0) - (b.line || 0)
    || a.kind.localeCompare(b.kind)
    || String(a.rawHref || a.expression || '').localeCompare(String(b.rawHref || b.expression || ''))
  ));
}

function buildNavigationInventory(rootDir) {
  const publicFiles = collectPublicFiles(rootDir);
  const publicHtmlFiles = publicFiles.filter(file => file.endsWith('.html'));
  const publicRuntimeFiles = publicFiles.filter(file => RUNTIME_EXTENSIONS.has(path.extname(file)));
  const publicUrlIndex = buildPublicUrlIndex(publicFiles);
  const generator = createGeneratorContext(rootDir);
  const pages = [];
  const transitions = [];
  const runtimeNavigation = [];

  for (const relativePath of publicHtmlFiles) {
    const absolute = path.join(rootDir, relativePath);
    const html = fs.readFileSync(absolute, 'utf8');
    const owner = primaryOwnerFor(relativePath, generator);
    const extracted = extractHtmlNavigation(relativePath, html).map(record => ({
      ...record,
      ...classifyTransition(record, publicUrlIndex)
    }));
    transitions.push(...extracted);

    for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      const offset = script.index + script[0].indexOf(script[1]);
      const inline = extractRuntimeNavigationFromText(relativePath, script[1], publicPathForFile(relativePath))
        .map(record => ({ ...record, line: lineAt(html, offset) + record.line - 1 }))
        .map(record => ({ ...record, ...classifyTransition(record, publicUrlIndex) }));
      runtimeNavigation.push(...inline);
    }

    const issues = extracted.filter(record => record.issue);
    pages.push({
      file: relativePath,
      publicPath: publicPathForFile(relativePath),
      region: regionForRepositoryPath(relativePath),
      primaryOwner: owner,
      navigationMutators: mutatorsFor(relativePath),
      counts: {
        totalStaticReferences: extracted.length,
        internal: extracted.filter(record => record.scope === 'internal').length,
        external: extracted.filter(record => record.scope === 'external').length,
        fragments: extracted.filter(record => record.scope === 'fragment').length,
        reviewCandidates: issues.length
      }
    });
  }

  for (const relativePath of publicRuntimeFiles) {
    const text = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const sourcePath = relativePath.startsWith('blog/') ? '/blog/' : '/';
    runtimeNavigation.push(...extractRuntimeNavigationFromText(relativePath, text, sourcePath)
      .map(record => ({ ...record, ...classifyTransition(record, publicUrlIndex) })));
  }

  sortRecords(transitions);
  sortRecords(runtimeNavigation);
  pages.sort((a, b) => a.file.localeCompare(b.file));

  const issueRecords = [
    ...transitions.filter(record => record.issue).map(record => ({ source: 'static', ...record })),
    ...runtimeNavigation.filter(record => record.issue).map(record => ({ source: 'runtime', ...record }))
  ].sort((a, b) => (
    ({ high: 0, medium: 1, low: 2 }[a.severity] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.severity] ?? 3)
    || a.sourceFile.localeCompare(b.sourceFile)
    || (a.line || 0) - (b.line || 0)
  ));

  const structuralErrors = [
    ...validateSourceRegistry(rootDir),
    ...pages.filter(page => !page.primaryOwner).map(page => `public HTML has no provenance owner: ${page.file}`)
  ];

  const dispositions = {};
  for (const record of transitions) dispositions[record.disposition] = (dispositions[record.disposition] || 0) + 1;

  return {
    schemaVersion: 1,
    reportDate: REPORT_DATE,
    siteOrigin: SITE_ORIGIN,
    generatedBy: 'scripts/navigation-provenance-audit.cjs',
    coverage: {
      publicFiles: publicFiles.length,
      publicHtmlFiles: publicHtmlFiles.length,
      publicRuntimeFiles: publicRuntimeFiles.length,
      classifiedHtmlFiles: pages.filter(page => page.primaryOwner).length,
      unclassifiedHtmlFiles: pages.filter(page => !page.primaryOwner).length,
      staticNavigationReferences: transitions.length,
      internalStaticReferences: transitions.filter(record => record.scope === 'internal').length,
      externalStaticReferences: transitions.filter(record => record.scope === 'external').length,
      runtimeNavigationExpressions: runtimeNavigation.length,
      dynamicRuntimeExpressions: runtimeNavigation.filter(record => record.scope === 'dynamic').length,
      brokenInternalTargets: issueRecords.filter(record => record.issue === 'broken-internal-target').length,
      highReviewCandidates: issueRecords.filter(record => record.severity === 'high').length,
      mediumReviewCandidates: issueRecords.filter(record => record.severity === 'medium').length,
      structuralErrors: structuralErrors.length
    },
    dispositions: Object.fromEntries(Object.entries(dispositions).sort(([a], [b]) => a.localeCompare(b))),
    sourceRegistry: NAVIGATION_SOURCE_REGISTRY,
    structuralErrors,
    pages,
    issues: issueRecords,
    runtimeNavigation,
    transitions
  };
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(report) {
  const c = report.coverage;
  const lines = [
    '# PlayPoint ナビゲーション遷移・生成元インベントリ',
    '',
    `基準日: ${report.reportDate}`,
    '',
    '> このファイルは `node scripts/navigation-provenance-audit.cjs --write` で再生成するスナップショットです。',
    '> 第2章「リンク・地域・多言語整合性」の修正前ベースラインとして、公開HTML、内部遷移、runtime遷移、生成元・書換元を同じ監査モデルで追跡します。',
    '',
    '## 1. 網羅性',
    '',
    '| 項目 | 件数 |',
    '|---|---:|',
    `| 公開ファイル | ${c.publicFiles} |`,
    `| 公開HTML | ${c.publicHtmlFiles} |`,
    `| 生成元を分類できたHTML | ${c.classifiedHtmlFiles} |`,
    `| 未分類HTML | ${c.unclassifiedHtmlFiles} |`,
    `| 静的ナビゲーション参照 | ${c.staticNavigationReferences} |`,
    `| 内部静的参照 | ${c.internalStaticReferences} |`,
    `| 外部静的参照 | ${c.externalStaticReferences} |`,
    `| runtime遷移式 | ${c.runtimeNavigationExpressions} |`,
    `| runtime動的式（静的に行先未確定） | ${c.dynamicRuntimeExpressions} |`,
    `| 内部リンク切れ候補 | ${c.brokenInternalTargets} |`,
    `| 高優先レビュー候補 | ${c.highReviewCandidates} |`,
    `| 中優先レビュー候補 | ${c.mediumReviewCandidates} |`,
    `| 構造エラー | ${c.structuralErrors} |`,
    '',
    '### 判定の読み方',
    '',
    '- `same-region`: 同じPlay country/locale内の通常遷移。',
    '- `declared-region-switch`: Play country切替として意図した地域跨ぎ。',
    '- `declared-content-fallback`: HK→TW、IN→ENのように、計算機専用地域から既存コンテンツ地域へ明示したフォールバック。',
    '- `likely-wrong-locale`: 海外ページから日本語へ飛ぶ一方、同等のlocale内ページが実在する高確度の修正候補。',
    '- `japanese-fallback-review`: locale内の同等ページを機械的には確認できないため、仕様か誤遷移か人間確認が必要。',
    '- `cross-region-review`: region switch以外の別地域遷移。',
    '- `hreflang-cross-locale`: SEOメタデータとして意図した地域横断。',
    '',
    '完全な1件単位の遷移データは同名 `.json` に保存します。Markdownは人間がレビューしやすいよう、問題候補・ページ単位・生成元単位で要約します。',
    '',
    '## 2. 修正候補',
    ''
  ];

  if (report.issues.length === 0) {
    lines.push('現時点で自動分類された修正候補はありません。', '');
  } else {
    lines.push('| 優先 | 種別 | 元ページ | 行 | 役割 | 遷移先 | locale内候補 |', '|---|---|---|---:|---|---|---|');
    for (const issue of report.issues) {
      lines.push(`| ${markdownEscape(issue.severity)} | ${markdownEscape(issue.issue)} | ${markdownEscape(issue.sourceFile)} | ${issue.line || ''} | ${markdownEscape(issue.role)} | ${markdownEscape(issue.pathname || issue.rawHref || issue.expression)} | ${markdownEscape(issue.localizedEquivalent || '')} |`);
    }
    lines.push('');
  }

  lines.push('## 3. 公開ページ別の生成元・遷移概要', '', '| 公開HTML | 地域 | 主生成元/正本 | ナビ書換元 | 内部参照 | 要確認 |', '|---|---|---|---|---:|---:|');
  for (const page of report.pages) {
    lines.push(`| ${markdownEscape(page.file)} | ${page.region} | ${markdownEscape(page.primaryOwner || 'UNCLASSIFIED')} | ${markdownEscape(page.navigationMutators.join(', '))} | ${page.counts.internal} | ${page.counts.reviewCandidates} |`);
  }

  lines.push('', '## 4. 生成元・書換元レジストリ', '', '| ID | 種別 | 実装ファイル | 対象 |', '|---|---|---|---|');
  for (const source of report.sourceRegistry) {
    lines.push(`| ${source.id} | ${source.kind} | \`${source.file}\` | ${markdownEscape(source.targets)} |`);
  }

  lines.push('', '## 5. runtime遷移ソース', '');
  if (report.runtimeNavigation.length === 0) {
    lines.push('runtime遷移式は検出されませんでした。');
  } else {
    lines.push('| ソース | 行 | 種別 | 静的解決 | 式/行先 | 判定 |', '|---|---:|---|---|---|---|');
    for (const item of report.runtimeNavigation) {
      lines.push(`| ${markdownEscape(item.sourceFile)} | ${item.line || ''} | ${item.kind} | ${item.scope === 'dynamic' ? 'dynamic' : item.scope} | ${markdownEscape(item.pathname || item.literal || item.expression)} | ${markdownEscape(item.disposition)} |`);
    }
  }

  lines.push('', '## 6. 構造エラー', '');
  if (report.structuralErrors.length === 0) lines.push('なし。公開HTMLは全件、生成元/正本の分類対象に入っています。');
  else report.structuralErrors.forEach(error => lines.push(`- ${error}`));

  lines.push('', '## 7. 次工程での使い方', '',
    '1. `likely-wrong-locale` を最初に修正し、生成済みHTMLではなく `sourceRegistry` の生成元まで遡る。',
    '2. `japanese-fallback-review` と `cross-region-review` は、localized版の有無とUX意図を確認して「仕様」か「修正」に分類する。',
    '3. 修正後にこのインベントリを再生成し、意図した遷移だけが残ったことをPR Gateで比較する。',
    '4. runtimeの `dynamic` はブラウザテストと設定オブジェクトを対応付け、次のPRで行先契約を明示する。',
    ''
  );
  return lines.join('\n');
}

function stableJson(report) {
  return JSON.stringify(report, null, 2) + '\n';
}

function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeEvidence(report) {
  const dir = evidenceDir();
  writeFileEnsured(path.join(dir, 'navigation-provenance-inventory.json'), stableJson(report));
  writeFileEnsured(path.join(dir, 'navigation-provenance-inventory.md'), renderMarkdown(report) + '\n');
  return dir;
}

function writeSnapshots(rootDir, report) {
  writeFileEnsured(path.join(rootDir, SNAPSHOT_JSON), stableJson(report));
  writeFileEnsured(path.join(rootDir, SNAPSHOT_MD), renderMarkdown(report) + '\n');
}

function checkSnapshots(rootDir, report) {
  const expected = [
    [SNAPSHOT_JSON, stableJson(report)],
    [SNAPSHOT_MD, renderMarkdown(report) + '\n']
  ];
  const failures = [];
  for (const [relativePath, content] of expected) {
    const absolute = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolute)) {
      failures.push(`snapshot is missing: ${relativePath}`);
      continue;
    }
    if (fs.readFileSync(absolute, 'utf8') !== content) failures.push(`snapshot is stale: ${relativePath}`);
  }
  return failures;
}

function printSummary(report, evidencePath) {
  const c = report.coverage;
  console.log(`[navigation-provenance] public HTML ${c.classifiedHtmlFiles}/${c.publicHtmlFiles} classified; static refs ${c.staticNavigationReferences}; runtime refs ${c.runtimeNavigationExpressions}`);
  console.log(`[navigation-provenance] review candidates high=${c.highReviewCandidates}, medium=${c.mediumReviewCandidates}, broken=${c.brokenInternalTargets}, structural=${c.structuralErrors}`);
  console.log(`[navigation-provenance] evidence: ${evidencePath}`);
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const args = new Set(process.argv.slice(2));
  const report = buildNavigationInventory(rootDir);
  const evidencePath = writeEvidence(report);
  printSummary(report, evidencePath);

  const failures = [...report.structuralErrors];
  if (args.has('--write')) writeSnapshots(rootDir, report);
  if (args.has('--check')) failures.push(...checkSnapshots(rootDir, report));

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[navigation-provenance] ${failure}`);
    console.error('[navigation-provenance] 更新が意図したものなら --write で一覧を再生成し、差分をレビューしてください。');
    process.exitCode = 1;
  }
}

if (require.main === module) runCli();

module.exports = {
  NAVIGATION_SOURCE_REGISTRY,
  REGION_INFO,
  REPORT_DATE,
  SNAPSHOT_JSON,
  SNAPSHOT_MD,
  buildNavigationInventory,
  buildPublicUrlIndex,
  classifyTransition,
  collectPublicFiles,
  equivalentCandidates,
  extractHtmlNavigation,
  extractRuntimeNavigationFromText,
  findLocalizedEquivalent,
  isDeclaredContentFallback,
  literalFromExpression,
  primaryOwnerFor,
  publicPathForFile,
  regionForPathname,
  regionForRepositoryPath,
  renderMarkdown,
  resolveReference
};
