'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isPublicRepositoryPath } = require('../.github/scripts/public-paths.cjs');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const LOCALE_PREFIXES = new Set(['en', 'ko', 'tw', 'hk', 'in']);
const CONTENT_LOCALES = new Set(['en', 'ko', 'tw']);
const EXCLUDED_DIRS = new Set(['.git', '.playwright-cli', 'node_modules', '.ci-evidence']);
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.html', '.md', '.yml', '.yaml']);
const EXPLICIT_TARGET_MARKERS = Object.freeze({
  ja: /(?:\bJapanese\b|\bJapan\b|日本語|日本|일본어|日文)/i,
  en: /(?:\bEnglish\b|\bU\.?S\.?\b|United States|영문|英文|英語)/i,
  ko: /(?:\bKorean\b|\bKorea\b|한국어|대한민국|韓國|韩国|韓国)/i,
  tw: /(?:Traditional Chinese|\bTaiwan\b|繁體中文|繁体中文|台灣|台湾)/i,
  hk: /(?:Hong Kong|香港)/i,
  in: /(?:\bIndia\b|인도|印度)/i
});

const GENERATOR_GROUPS = Object.freeze([
  {
    id: 'calculator-ja-top',
    match: p => p === '/',
    ownership: 'manual+canonical-sync',
    sources: ['scripts/build-metadata.cjs', 'scripts/calculator-header-sync.cjs', 'scripts/html-sync.cjs', 'scripts/region-hreflang-sync.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'calculator-locale-top',
    match: p => /^\/(?:en|ko|tw)\/$/.test(p),
    ownership: 'generated+canonical-sync',
    sources: ['scripts/language-page-builder.cjs', 'scripts/calculator-header-sync.cjs', 'scripts/region-hreflang-sync.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'expanded-region-top',
    match: p => /^\/(?:hk|in)\/$/.test(p),
    ownership: 'generated+canonical-sync',
    sources: ['scripts/region-page-sync.cjs', 'scripts/region-hreflang-sync.cjs', 'scripts/calculator-header-sync.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'intl-article',
    match: p => /^\/(?:en|ko|tw)\/articles\//.test(p),
    ownership: 'generated-or-manual+intl-finalizers',
    sources: ['scripts/intl-seo-pages.cjs', 'scripts/intl-content-expansion.cjs', 'scripts/intl-article-layout.cjs', 'scripts/intl-navigation-sidebar-v1.cjs', 'scripts/intl-article-hreflang-sync.cjs', 'scripts/intl-hub-discovery.cjs', 'scripts/intl-localization-normalize.cjs']
  },
  {
    id: 'intl-author',
    match: p => /^\/(?:en|ko|tw)\/author\//.test(p),
    ownership: 'generated+intl-finalizers',
    sources: ['scripts/intl-author-pages.cjs', 'scripts/intl-navigation-sidebar-v1.cjs', 'scripts/author-hreflang-sync.cjs']
  },
  {
    id: 'intl-game-guide',
    match: p => /^\/(?:en|ko|tw)\/games\//.test(p),
    ownership: 'generated+intl-finalizers',
    sources: ['scripts/intl-game-guide-publish-normalize.cjs', 'scripts/intl-navigation-sidebar-v1.cjs', 'scripts/generate-game-simulators.cjs']
  },
  {
    id: 'intl-seo-lp',
    match: p => /^\/(?:en|ko|tw)\/(?:status|campaign|amount|compare|maintenance|points-cost)\//.test(p),
    ownership: 'generated-or-manual+lp-finalizers',
    sources: ['scripts/intl-seo-pages.cjs', 'scripts/insert-lp-footers.cjs', 'scripts/html-sync.cjs', 'scripts/manual-lp-hreflang-sync.cjs', 'scripts/intl-localization-normalize.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'japanese-article',
    match: p => /^\/(?:articles|blog)\//.test(p),
    ownership: 'manual+article-finalizers',
    sources: ['scripts/article-content-navigation-normalize.cjs', 'scripts/japanese-navigation-sidebar.cjs', 'scripts/article-discovery-sync.cjs', 'scripts/article-seo-normalize.cjs']
  },
  {
    id: 'japanese-author',
    match: p => /^\/author\//.test(p),
    ownership: 'manual+canonical-sync',
    sources: ['scripts/author-hreflang-sync.cjs', 'scripts/html-sync.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'japanese-game-guide',
    match: p => /^\/games\//.test(p),
    ownership: 'generated-or-manual+game-finalizers',
    sources: ['scripts/generate-game-simulators.cjs', 'scripts/game-guide-article-hub-sync.cjs', 'scripts/game-seo-sync.cjs', 'scripts/game-seo-safety-sync.cjs', 'scripts/game-seo-expanded-sync.cjs', 'scripts/game-seo-wave3-sync.cjs', 'scripts/game-seo-wave4-sync.cjs', 'scripts/game-seo-wave5-sync.cjs']
  },
  {
    id: 'japanese-seo-lp',
    match: p => /^\/(?:status|campaign|amount|compare|maintenance|points-cost)\//.test(p),
    ownership: 'manual+lp-finalizers',
    sources: ['scripts/html-sync.cjs', 'scripts/insert-lp-monetization.cjs', 'scripts/lp-faq-sync.cjs', 'scripts/manual-lp-hreflang-sync.cjs', 'scripts/site-shell.cjs']
  },
  {
    id: 'fixed-page',
    match: () => true,
    ownership: 'manual+fixed-page-finalizers',
    sources: ['scripts/fixed-page-header-sync.cjs', 'scripts/legal-page-lang-nav-sync.cjs', 'scripts/html-sync.cjs', 'scripts/internal-link-attribution.cjs', 'scripts/site-shell.cjs']
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

function visibleText(fragment) {
  return String(fragment).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function surfaceOf(context) {
  const text = context.toLowerCase();
  if (/site-region-switcher|region-switch|play country|data-region/.test(text)) return 'region-switcher';
  if (/lang-nav|language[-_ ](?:nav|switch)|locale[-_ ](?:nav|switch)|article-language|他の言語で読む|\bhreflang=/.test(text)) return 'locale-switcher';
  if (/breadcrumb/.test(text)) return 'breadcrumb';
  if (/sidebar/.test(text)) return 'sidebar';
  if (/related|contextual/.test(text)) return 'related';
  if (/article-next-step|calculator-prompt|\bcta\b/.test(text)) return 'cta';
  if (/site-header|global-nav|site-logo/.test(text)) return 'header';
  if (/footer/.test(text)) return 'footer';
  if (/author-box|author-profile|operator|katakata/.test(text)) return 'author';
  return 'body';
}

function hasExplicitTargetMarker(label, targetLocale) {
  return EXPLICIT_TARGET_MARKERS[targetLocale]?.test(String(label || '')) || false;
}

function extractAnchors(html, publicPath) {
  const anchors = [];
  for (const match of html.matchAll(/<a\b([^>]*?)\bhref=["']([^"']+)["']([^>]*)>/gi)) {
    const rawHref = match[2];
    const target = resolveInternalHref(rawHref, publicPath);
    if (!target) continue;
    const attrs = `${match[1]} ${match[3]}`;
    const contentStart = match.index + match[0].length;
    const closeIndex = html.indexOf('</a>', contentStart);
    const contentEnd = closeIndex >= 0 && closeIndex - contentStart <= 1200 ? closeIndex : contentStart;
    const label = visibleText(html.slice(contentStart, contentEnd));
    const start = Math.max(0, match.index - 450);
    const end = Math.min(html.length, Math.max(contentEnd, contentStart) + 450);
    anchors.push({
      rawHref,
      target,
      label,
      hasHreflang: /\bhreflang\s*=/.test(attrs),
      explicitLocaleFallback: hasExplicitTargetMarker(label, localeOf(target)),
      surface: surfaceOf(html.slice(start, end))
    });
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
    rows.push({
      rel: attrs.match(/\brel=["']([^"']+)["']/i)?.[1] || '',
      hreflang: attrs.match(/\bhreflang=["']([^"']+)["']/i)?.[1] || '',
      target
    });
  }
  return rows;
}

function candidateGenerators(publicPath) {
  const group = GENERATOR_GROUPS.find(item => item.match(publicPath));
  return group
    ? { group: group.id, ownership: group.ownership, sources: group.sources }
    : { group: 'unclassified', ownership: 'unknown', sources: [] };
}

function transitionKind(edge) {
  if (edge.sourceLocale === edge.targetLocale) return 'same-locale';
  if (edge.surface === 'region-switcher') return 'region-switch';
  if (edge.surface === 'locale-switcher' || edge.hasHreflang) return 'locale-switch';
  if (edge.explicitLocaleFallback) return 'explicit-locale-fallback';
  return 'cross-locale-candidate';
}

function targetExists(target, publicTargets) {
  if (publicTargets.has(target)) return true;
  const prefix = target.endsWith('/') ? target : `${target}/`;
  for (const candidate of publicTargets) if (candidate.startsWith(prefix)) return true;
  return false;
}

function classifyEdge(edge, publicTargets) {
  const issues = [];
  if (!targetExists(edge.target, publicTargets)) issues.push('target-not-found');
  if (edge.transitionKind === 'cross-locale-candidate') issues.push('cross-locale');
  if (edge.transitionKind === 'cross-locale-candidate'
    && CONTENT_LOCALES.has(edge.sourceLocale)
    && edge.targetLocale === 'ja'
    && /\/(?:articles|blog)\//.test(edge.target)) {
    issues.push('intl-to-ja-content');
  }
  return issues;
}

function sourceNavigationSignals(rootDir, files) {
  const rows = [];
  for (const file of files) {
    const ext = path.extname(file);
    if (!SOURCE_EXTENSIONS.has(ext) || !/^(?:scripts|js|tests|\.github\/scripts|docs)\//.test(file)) continue;
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
    if (!total) continue;
    const kind = /^(?:scripts|js)\//.test(file) ? 'production-source'
      : file.startsWith('tests/') || file.startsWith('.github/scripts/') ? 'verification'
        : 'documentation';
    rows.push({ file, kind, total, ...signals });
  }
  return rows.sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));
}

function requireLocalNames(lhs) {
  const value = lhs.trim();
  if (/^[A-Za-z_$][\w$]*$/.test(value)) return [value];
  if (!value.startsWith('{') || !value.endsWith('}')) return [];
  return value.slice(1, -1).split(',').map(part => {
    const cleaned = part.trim();
    if (!cleaned) return null;
    const alias = cleaned.split(':').map(token => token.trim()).filter(Boolean);
    const local = alias.at(-1)?.replace(/\s*=.*$/, '').trim();
    return /^[A-Za-z_$][\w$]*$/.test(local || '') ? local : null;
  }).filter(Boolean);
}

function isIdentifierChar(char) {
  return typeof char === 'string' && /[A-Za-z0-9_$]/.test(char);
}

function findCallColumn(line, fn) {
  let from = 0;
  while (from < line.length) {
    const index = line.indexOf(fn, from);
    if (index < 0) return -1;
    const before = index > 0 ? line[index - 1] : '';
    const after = line[index + fn.length] || '';
    if (!isIdentifierChar(before) && !isIdentifierChar(after)) {
      let cursor = index + fn.length;
      while (cursor < line.length && /\s/.test(line[cursor])) cursor += 1;
      if (line[cursor] === '(') return index;
    }
    from = index + fn.length;
  }
  return -1;
}

function buildPipeline(rootDir) {
  const buildFile = path.join(rootDir, 'scripts', 'build-html.js');
  if (!fs.existsSync(buildFile)) return [];
  const text = fs.readFileSync(buildFile, 'utf8');
  const requires = new Map();
  for (const m of text.matchAll(/const\s+([^;=]+?)\s*=\s*require\(['"](\.\/[^'"]+)['"]\)\s*;?/g)) {
    const source = `scripts/${m[2].replace(/^\.\//, '')}`;
    for (const name of requireLocalNames(m[1])) requires.set(name, source);
  }

  const calls = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmed = line.trimStart();
    if (trimmed.startsWith('//') || /^(?:async\s+)?function\b/.test(trimmed)) continue;
    const found = [];
    for (const [fn, source] of requires) {
      const column = findCallColumn(line, fn);
      if (column >= 0) found.push({ column, function: fn, source });
    }
    const sideEffect = /require\(['"]\.\/generate-game-simulators\.cjs['"]\)/.exec(line);
    if (sideEffect) found.push({ column: sideEffect.index, function: '[side-effect require]', source: 'scripts/generate-game-simulators.cjs' });
    found.sort((a, b) => a.column - b.column);
    for (const item of found) calls.push({ order: calls.length + 1, line: lineIndex + 1, function: item.function, source: item.source });
  }
  return calls;
}

function increment(object, key) {
  object[key] = (object[key] || 0) + 1;
}

function audit(rootDir) {
  const files = walk(rootDir).sort();
  const htmlFiles = files.filter(file => file.endsWith('.html') && isPublicRepositoryPath(file));
  const publicTargets = new Set(files.filter(isPublicRepositoryPath).map(fileToPublicPath));
  const pages = [];
  const edges = [];
  const metadata = [];

  for (const file of htmlFiles) {
    const publicPath = fileToPublicPath(file);
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const sourceLocale = localeOf(publicPath);
    const generators = candidateGenerators(publicPath);
    pages.push({ file, publicPath, locale: sourceLocale, area: areaOf(publicPath), generatorGroup: generators.group, ownership: generators.ownership, generatorSources: generators.sources });
    for (const anchor of extractAnchors(html, publicPath)) {
      const edge = {
        sourceFile: file,
        source: publicPath,
        sourceLocale,
        target: anchor.target,
        targetLocale: localeOf(anchor.target),
        rawHref: anchor.rawHref,
        label: anchor.label,
        surface: anchor.surface,
        hasHreflang: anchor.hasHreflang,
        explicitLocaleFallback: anchor.explicitLocaleFallback,
        generatorGroup: generators.group,
        generatorSources: generators.sources
      };
      edge.transitionKind = transitionKind(edge);
      edge.issues = classifyEdge(edge, publicTargets);
      edges.push(edge);
    }
    for (const head of extractHeadMetadata(html, publicPath)) {
      metadata.push({ sourceFile: file, source: publicPath, sourceLocale, ...head, targetLocale: localeOf(head.target) });
    }
  }

  const byLocale = {};
  const byArea = {};
  const issueCounts = {};
  const transitionKinds = {};
  const suspiciousBySurface = {};
  const suspiciousByGeneratorGroup = {};
  const localeTransitions = {};
  for (const page of pages) {
    increment(byLocale, page.locale);
    increment(byArea, page.area);
  }
  for (const edge of edges) {
    increment(transitionKinds, edge.transitionKind);
    increment(localeTransitions, `${edge.sourceLocale}->${edge.targetLocale}`);
    for (const issue of edge.issues) increment(issueCounts, issue);
    if (edge.issues.length) {
      increment(suspiciousBySurface, edge.surface);
      increment(suspiciousByGeneratorGroup, edge.generatorGroup);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      files: files.length,
      htmlPages: pages.length,
      internalAnchorEdges: edges.length,
      headMetadataLinks: metadata.length,
      publicTargets: publicTargets.size,
      byLocale,
      byArea,
      issueCounts,
      transitionKinds,
      suspiciousBySurface,
      suspiciousByGeneratorGroup,
      localeTransitions,
      unclassifiedGeneratorPages: pages.filter(page => page.generatorGroup === 'unclassified').length
    },
    generatorGroups: GENERATOR_GROUPS.map(({ id, ownership, sources }) => ({ id, ownership, sources })),
    pages,
    edges,
    suspiciousEdges: edges.filter(edge => edge.issues.length),
    headMetadata: metadata,
    buildPipeline: buildPipeline(rootDir),
    sourceSignals: sourceNavigationSignals(rootDir, files)
  };
}

function keyValueList(object) {
  return Object.entries(object).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
}

function markdown(report) {
  const lines = [];
  lines.push('# PlayPoint navigation / generation source map', '');
  lines.push('Inventory-first report. Findings are Chapter 2 review candidates, not automatic bug verdicts.', '');
  lines.push('## Coverage', '');
  lines.push(`- HTML pages: ${report.stats.htmlPages}`);
  lines.push(`- Internal anchor transitions: ${report.stats.internalAnchorEdges}`);
  lines.push(`- canonical / hreflang metadata links: ${report.stats.headMetadataLinks}`);
  lines.push(`- Public target paths: ${report.stats.publicTargets}`);
  lines.push(`- Repository files scanned: ${report.stats.files}`);
  lines.push(`- Locale pages: ${keyValueList(report.stats.byLocale)}`);
  lines.push(`- Areas: ${keyValueList(report.stats.byArea)}`);
  lines.push(`- Pages without generator ownership candidates: ${report.stats.unclassifiedGeneratorPages}`, '');

  lines.push('## Transition classification', '');
  lines.push(`- ${keyValueList(report.stats.transitionKinds)}`);
  lines.push(`- Locale matrix: ${keyValueList(report.stats.localeTransitions)}`, '');

  lines.push('## Candidate findings', '');
  const issues = Object.entries(report.stats.issueCounts);
  if (!issues.length) lines.push('- none');
  else issues.forEach(([key, value]) => lines.push(`- ${key}: ${value}`));
  lines.push(`- By surface: ${keyValueList(report.stats.suspiciousBySurface)}`);
  lines.push(`- By generator group: ${keyValueList(report.stats.suspiciousByGeneratorGroup)}`, '');

  lines.push('### Suspicious transition sample', '');
  lines.push('| source | surface | target | label | issues | generator candidates |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  const priority = { 'target-not-found': 0, 'intl-to-ja-content': 1, 'cross-locale': 2 };
  const suspicious = [...report.suspiciousEdges].sort((a, b) => {
    const aRank = Math.min(...a.issues.map(issue => priority[issue] ?? 9));
    const bRank = Math.min(...b.issues.map(issue => priority[issue] ?? 9));
    return aRank - bRank || a.source.localeCompare(b.source) || a.target.localeCompare(b.target);
  });
  for (const edge of suspicious.slice(0, 200)) {
    const label = edge.label.replaceAll('|', '\\|').slice(0, 90);
    lines.push(`| \`${edge.source}\` | ${edge.surface} | \`${edge.target}\` | ${label} | ${edge.issues.join(', ')} | ${edge.generatorSources.map(s => `\`${s}\``).join('<br>')} |`);
  }
  if (suspicious.length > 200) lines.push(`\n> ${suspicious.length - 200} additional findings are retained in the JSON evidence.`);
  lines.push('');

  lines.push('## Generator ownership groups', '');
  lines.push('| group | ownership | source / finalizer candidates |');
  lines.push('| --- | --- | --- |');
  for (const group of report.generatorGroups) {
    lines.push(`| \`${group.id}\` | ${group.ownership} | ${group.sources.map(source => `\`${source}\``).join('<br>')} |`);
  }
  lines.push('');

  lines.push('## Generation pipeline order', '');
  lines.push('| order | build-html line | function | source |');
  lines.push('| ---: | ---: | --- | --- |');
  report.buildPipeline.forEach(row => lines.push(`| ${row.order} | ${row.line} | \`${row.function}\` | \`${row.source}\` |`));
  lines.push('');

  lines.push('## Navigation-sensitive production sources', '');
  lines.push('| file | total signals | href | locale | region | hreflang | breadcrumb | navigation/sidebar |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  report.sourceSignals.filter(row => row.kind === 'production-source').slice(0, 100)
    .forEach(row => lines.push(`| \`${row.file}\` | ${row.total} | ${row.href} | ${row.locale} | ${row.region} | ${row.hreflang} | ${row.breadcrumb} | ${row.navigation} |`));
  lines.push('');

  lines.push('## Verification / documentation sources', '');
  lines.push('| file | kind | total signals |');
  lines.push('| --- | --- | ---: |');
  report.sourceSignals.filter(row => row.kind !== 'production-source').slice(0, 80)
    .forEach(row => lines.push(`| \`${row.file}\` | ${row.kind} | ${row.total} |`));
  lines.push('');

  lines.push('## Interpretation rules', '');
  lines.push('- `region-switch` and `locale-switch` are explicit user-controlled crossings and are not issue candidates.');
  lines.push('- `explicit-locale-fallback` requires the visible label to name the destination locale/region (for example `Japanese`, `일본어`, `日文`, `English`, `United States`, or `Hong Kong`).');
  lines.push('- `target-not-found` checks the production allowlist, not HTML files only, so RSS/XML/assets do not become false positives.');
  lines.push('- `intl-to-ja-content` is only raised for unmarked EN/KO/TW -> Japanese article/blog transitions.');
  lines.push('- Generator candidates identify likely ownership. Fixes belong in the actual writer/finalizer, never blindly in generated HTML.', '');
  return `${lines.join('\n')}\n`;
}

function writeEvidence(evidenceDirectory, report) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  fs.writeFileSync(path.join(evidenceDirectory, 'navigation-source-map.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDirectory, 'navigation-source-map.md'), markdown(report));
}

function cliOption(name) {
  const exact = `--${name}`;
  const prefixed = `${exact}=`;
  const inline = process.argv.find(arg => arg.startsWith(prefixed));
  if (inline) return inline.slice(prefixed.length);
  const index = process.argv.indexOf(exact);
  return index >= 0 ? process.argv[index + 1] : null;
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const report = audit(rootDir);
  if (process.argv.includes('--write-evidence')) {
    const requested = cliOption('evidence-dir');
    if (!requested || requested.startsWith('--')) throw new Error('--write-evidence requires --evidence-dir <path>');
    writeEvidence(path.resolve(requested), report);
  }
  process.stdout.write(markdown(report));
}

if (require.main === module) runCli();

module.exports = {
  SITE_ORIGIN,
  audit,
  areaOf,
  buildPipeline,
  candidateGenerators,
  classifyEdge,
  extractAnchors,
  fileToPublicPath,
  findCallColumn,
  hasExplicitTargetMarker,
  localeOf,
  markdown,
  resolveInternalHref,
  surfaceOf,
  targetExists,
  transitionKind
};
