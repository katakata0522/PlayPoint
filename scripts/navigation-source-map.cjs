'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const LOCALE_PREFIXES = new Set(['en', 'ko', 'tw', 'hk', 'in']);
const CONTENT_LOCALES = new Set(['en', 'ko', 'tw']);
const EXCLUDED_DIRS = new Set(['.git', '.playwright-cli', 'node_modules', '.ci-evidence']);
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.html', '.md', '.yml', '.yaml']);

const GENERATOR_GROUPS = Object.freeze([
  {
    id: 'calculator-locale-top',
    match: p => /^\/(?:en|ko|tw)\/$/.test(p),
    sources: ['scripts/language-page-builder.cjs', 'scripts/calculator-header-sync.cjs', 'scripts/region-hreflang-sync.cjs']
  },
  {
    id: 'expanded-region-top',
    match: p => /^\/(?:hk|in)\/$/.test(p),
    sources: ['scripts/region-page-sync.cjs', 'scripts/region-hreflang-sync.cjs', 'scripts/calculator-header-sync.cjs']
  },
  {
    id: 'intl-article',
    match: p => /^\/(?:en|ko|tw)\/articles\//.test(p),
    sources: [
      'scripts/intl-seo-pages.cjs',
      'scripts/intl-content-expansion.cjs',
      'scripts/intl-article-layout.cjs',
      'scripts/intl-navigation-sidebar-v1.cjs',
      'scripts/intl-article-hreflang-sync.cjs',
      'scripts/intl-hub-discovery.cjs',
      'scripts/intl-localization-normalize.cjs'
    ]
  },
  {
    id: 'intl-author',
    match: p => /^\/(?:en|ko|tw)\/author\//.test(p),
    sources: ['scripts/intl-author-pages.cjs', 'scripts/intl-navigation-sidebar-v1.cjs', 'scripts/author-hreflang-sync.cjs']
  },
  {
    id: 'intl-game-guide',
    match: p => /^\/(?:en|ko|tw)\/games\//.test(p),
    sources: ['scripts/intl-game-guide-publish-normalize.cjs', 'scripts/intl-navigation-sidebar-v1.cjs']
  },
  {
    id: 'japanese-article',
    match: p => /^\/(?:articles|blog)\//.test(p),
    sources: [
      'scripts/article-content-navigation-normalize.cjs',
      'scripts/japanese-navigation-sidebar.cjs',
      'scripts/article-discovery-sync.cjs',
      'scripts/article-seo-normalize.cjs'
    ]
  },
  {
    id: 'japanese-game-guide',
    match: p => /^\/games\//.test(p),
    sources: [
      'scripts/generate-game-simulators.cjs',
      'scripts/game-guide-article-hub-sync.cjs',
      'scripts/game-seo-sync.cjs',
      'scripts/game-seo-safety-sync.cjs',
      'scripts/game-seo-expanded-sync.cjs',
      'scripts/game-seo-wave3-sync.cjs',
      'scripts/game-seo-wave4-sync.cjs',
      'scripts/game-seo-wave5-sync.cjs'
    ]
  },
  {
    id: 'fixed-page',
    match: p => !/^\/(?:en|ko|tw|hk|in|articles|blog|games)\//.test(p),
    sources: ['scripts/fixed-page-header-sync.cjs', 'scripts/html-sync.cjs', 'scripts/internal-link-attribution.cjs']
  }
]);

function walk(rootDir, currentDir = rootDir, out = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) walk(rootDir, absolute, out);
    else if (entry.isFile()) out.push(path.relative(rootDir, absolute).replace(/\\/g, '/'));
  }
  return out;
}

function fileToPublicPath(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

function localeOf(publicPath) {
  const first = publicPath.split('/').filter(Boolean)[0];
  return LOCALE_PREFIXES.has(first) ? first : 'ja';
}

function areaOf(publicPath) {
  const p = publicPath.replace(/^\/(?:en|ko|tw|hk|in)(?=\/)/, '');
  if (p === '/' || p === '') return 'calculator';
  if (p.startsWith('/articles/')) return 'articles';
  if (p.startsWith('/author/')) return 'author';
  if (p.startsWith('/games/')) return 'games';
  if (p.startsWith('/blog/')) return 'blog';
  return 'fixed';
}

function resolveInternalHref(href, basePath) {
  if (!href || href.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return null;
  try {
    const url = new URL(href, `${SITE_ORIGIN}${basePath}`);
    if (url.origin !== SITE_ORIGIN) return null;
    let pathname = url.pathname.replace(/\/+/g, '/');
    if (pathname.endsWith('/index.html')) pathname = pathname.slice(0, -'index.html'.length);
    return pathname || '/';
  } catch {
    return null;
  }
}

function surfaceOf(context) {
  const text = context.toLowerCase();
  if (/site-region-switcher|region-switch|play country|data-region/.test(text)) return 'region-switcher';
  if (/breadcrumb/.test(text)) return 'breadcrumb';
  if (/sidebar/.test(text)) return 'sidebar';
  if (/author-box|operator|katakata/.test(text)) return 'author';
  if (/related|contextual/.test(text)) return 'related';
  if (/article-next-step|calculator-prompt|cta/.test(text)) return 'cta';
  if (/site-header|global-nav|site-logo/.test(text)) return 'header';
  if (/footer/.test(text)) return 'footer';
  return 'body';
}

function extractAnchors(html, publicPath) {
  const anchors = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) {
    const rawHref = match[1];
    const target = resolveInternalHref(rawHref, publicPath);
    if (!target) continue;
    const start = Math.max(0, match.index - 500);
    const end = Math.min(html.length, match.index + match[0].length + 500);
    anchors.push({ rawHref, target, surface: surfaceOf(html.slice(start, end)) });
  }
  return anchors;
}

function extractHeadMetadata(html, publicPath) {
  const rows = [];
  for (const match of html.matchAll(/<link\b([^>]*\b(?:canonical|alternate)[^>]*)>/gi)) {
    const attrs = match[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const target = resolveInternalHref(href, publicPath);
    if (!target) continue;
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    const hreflang = attrs.match(/\bhreflang=["']([^"']+)["']/i)?.[1] || '';
    rows.push({ rel, hreflang, target });
  }
  return rows;
}

function candidateGenerators(publicPath) {
  const group = GENERATOR_GROUPS.find(item => item.match(publicPath));
  return group ? { group: group.id, sources: group.sources } : { group: 'unclassified', sources: [] };
}

function isExpectedLocaleCrossing(edge) {
  if (edge.surface === 'region-switcher') return true;
  if (edge.sourceLocale === 'ja') return false;
  if (edge.target === '/') return edge.surface === 'header';
  return false;
}

function classifyEdge(edge, publicPaths) {
  const issues = [];
  if (!publicPaths.has(edge.target) && ![...publicPaths].some(p => p.startsWith(edge.target.endsWith('/') ? edge.target : `${edge.target}/`))) {
    issues.push('target-not-found');
  }
  if (edge.sourceLocale !== edge.targetLocale && !isExpectedLocaleCrossing(edge)) {
    issues.push('cross-locale');
  }
  if (CONTENT_LOCALES.has(edge.sourceLocale) && edge.targetLocale === 'ja' && /\/(?:articles|blog)\//.test(edge.target)) {
    issues.push('intl-to-ja-content');
  }
  return issues;
}

function sourceNavigationSignals(rootDir, files) {
  const sourceFiles = files.filter(file => {
    const ext = path.extname(file);
    return SOURCE_EXTENSIONS.has(ext) && /^(?:scripts|js|tests|\.github\/scripts|docs)\//.test(file);
  });
  const rows = [];
  for (const file of sourceFiles) {
    const text = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const signals = {
      href: (text.match(/href/gi) || []).length,
      locale: (text.match(/locale/gi) || []).length,
      region: (text.match(/region/gi) || []).length,
      hreflang: (text.match(/hreflang/gi) || []).length,
      breadcrumb: (text.match(/breadcrumb/gi) || []).length,
      navigation: (text.match(/navigation|navlinks?|sidebar/gi) || []).length
    };
    const total = Object.values(signals).reduce((sum, value) => sum + value, 0);
    if (total) rows.push({ file, total, ...signals });
  }
  return rows.sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));
}

function buildPipeline(rootDir) {
  const buildFile = path.join(rootDir, 'scripts', 'build-html.js');
  if (!fs.existsSync(buildFile)) return [];
  const text = fs.readFileSync(buildFile, 'utf8');
  const requires = new Map();
  for (const m of text.matchAll(/const\s+([^=]+?)\s*=\s*require\(['"](\.\/[^'"]+)['"]\)/g)) {
    const names = [...m[1].matchAll(/[A-Za-z_$][\w$]*/g)].map(x => x[0]);
    const source = `scripts/${m[2].replace(/^\.\//, '')}`.replace(/\.cjs$|\.js$/, match => match);
    for (const name of names) requires.set(name, source);
  }
  const calls = [];
  let order = 0;
  for (const m of text.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*\(/gm)) {
    const fn = m[1];
    if (!requires.has(fn)) continue;
    order += 1;
    calls.push({ order, function: fn, source: requires.get(fn) });
  }
  return calls;
}

function audit(rootDir) {
  const files = walk(rootDir).sort();
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const publicPaths = new Set(htmlFiles.map(fileToPublicPath));
  const pages = [];
  const edges = [];
  const metadata = [];

  for (const file of htmlFiles) {
    const publicPath = fileToPublicPath(file);
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const sourceLocale = localeOf(publicPath);
    const generators = candidateGenerators(publicPath);
    pages.push({ file, publicPath, locale: sourceLocale, area: areaOf(publicPath), generatorGroup: generators.group, generatorSources: generators.sources });
    for (const anchor of extractAnchors(html, publicPath)) {
      const edge = {
        sourceFile: file,
        source: publicPath,
        sourceLocale,
        target: anchor.target,
        targetLocale: localeOf(anchor.target),
        rawHref: anchor.rawHref,
        surface: anchor.surface,
        generatorGroup: generators.group,
        generatorSources: generators.sources
      };
      edge.issues = classifyEdge(edge, publicPaths);
      edges.push(edge);
    }
    for (const head of extractHeadMetadata(html, publicPath)) {
      metadata.push({ sourceFile: file, source: publicPath, sourceLocale, ...head, targetLocale: localeOf(head.target) });
    }
  }

  const byLocale = {};
  const byArea = {};
  for (const page of pages) {
    byLocale[page.locale] = (byLocale[page.locale] || 0) + 1;
    byArea[page.area] = (byArea[page.area] || 0) + 1;
  }
  const issueCounts = {};
  for (const edge of edges) for (const issue of edge.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;

  return {
    generatedAt: new Date().toISOString(),
    stats: { files: files.length, htmlPages: pages.length, internalAnchorEdges: edges.length, headMetadataLinks: metadata.length, byLocale, byArea, issueCounts },
    pages,
    edges,
    suspiciousEdges: edges.filter(edge => edge.issues.length),
    headMetadata: metadata,
    buildPipeline: buildPipeline(rootDir),
    sourceSignals: sourceNavigationSignals(rootDir, files)
  };
}

function markdown(report) {
  const lines = [];
  lines.push('# PlayPoint navigation / generation source map');
  lines.push('');
  lines.push('This report is inventory-first. Findings are candidates for Chapter 2 review, not automatic bug verdicts.');
  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push(`- HTML pages: ${report.stats.htmlPages}`);
  lines.push(`- Internal anchor transitions: ${report.stats.internalAnchorEdges}`);
  lines.push(`- canonical / hreflang metadata links: ${report.stats.headMetadataLinks}`);
  lines.push(`- Repository files scanned: ${report.stats.files}`);
  lines.push(`- Locale pages: ${Object.entries(report.stats.byLocale).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  lines.push(`- Areas: ${Object.entries(report.stats.byArea).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  lines.push('');
  lines.push('## Candidate findings');
  lines.push('');
  const issues = Object.entries(report.stats.issueCounts);
  if (!issues.length) lines.push('- none');
  else issues.forEach(([key, value]) => lines.push(`- ${key}: ${value}`));
  lines.push('');
  lines.push('### Suspicious transition sample');
  lines.push('');
  lines.push('| source | surface | target | issues | generator candidates |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const edge of report.suspiciousEdges.slice(0, 200)) {
    lines.push(`| \`${edge.source}\` | ${edge.surface} | \`${edge.target}\` | ${edge.issues.join(', ')} | ${edge.generatorSources.map(s => `\`${s}\``).join('<br>')} |`);
  }
  if (report.suspiciousEdges.length > 200) lines.push(`\n> ${report.suspiciousEdges.length - 200} additional findings are retained in the JSON evidence.`);
  lines.push('');
  lines.push('## Generation pipeline order');
  lines.push('');
  lines.push('| order | function | source |');
  lines.push('| ---: | --- | --- |');
  report.buildPipeline.forEach(row => lines.push(`| ${row.order} | \`${row.function}\` | \`${row.source}\` |`));
  lines.push('');
  lines.push('## Navigation-sensitive source files');
  lines.push('');
  lines.push('| file | total signals | href | locale | region | hreflang | breadcrumb | navigation/sidebar |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  report.sourceSignals.slice(0, 120).forEach(row => lines.push(`| \`${row.file}\` | ${row.total} | ${row.href} | ${row.locale} | ${row.region} | ${row.hreflang} | ${row.breadcrumb} | ${row.navigation} |`));
  lines.push('');
  lines.push('## Interpretation rules');
  lines.push('');
  lines.push('- `target-not-found`: resolved internal target is not represented by a checked HTML path/directory; inspect rewrites before declaring it broken.');
  lines.push('- `cross-locale`: user-facing anchor crosses locale outside recognized region switcher context.');
  lines.push('- `intl-to-ja-content`: EN/KO/TW page points into Japanese articles/blog content. This can be intentional only when no localized equivalent exists and the fallback is explicit.');
  lines.push('- Generator candidates are ownership hints derived from page family; fixes must be made at the actual generating source, not blindly in generated HTML.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeEvidence(rootDir, report) {
  const evidenceDir = path.join(rootDir, '.ci-evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'navigation-source-map.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDir, 'navigation-source-map.md'), markdown(report));
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const report = audit(rootDir);
  if (process.argv.includes('--write-evidence')) writeEvidence(rootDir, report);
  process.stdout.write(markdown(report));
}

if (require.main === module) runCli();

module.exports = {
  SITE_ORIGIN,
  audit,
  areaOf,
  candidateGenerators,
  classifyEdge,
  extractAnchors,
  fileToPublicPath,
  localeOf,
  markdown,
  resolveInternalHref,
  surfaceOf
};
