'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SITE_ORIGIN = 'https://playpoint-sim.com';
const LOCALE_PREFIXES = new Set(['en', 'ko', 'tw', 'hk', 'in']);
const CONTENT_LOCALES = new Set(['en', 'ko', 'tw']);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const SOURCE_SCAN_DIRS = ['scripts', 'js', 'blog', '.github/scripts'];
const SOURCE_SIGNAL_PATTERN = /(?:href|canonical|hreflang|breadcrumb|region|locale|articles|blog|navigation|author|related)/i;

function posix(value) {
  return String(value).replace(/\\/g, '/');
}

function walkFiles(rootDir, start = '.') {
  const out = [];
  const base = path.join(rootDir, start);
  if (!fs.existsSync(base)) return out;
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const rel = posix(path.join(start, entry.name));
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || rel.startsWith('.github/ci-runtime/')) continue;
      out.push(...walkFiles(rootDir, rel));
    } else if (entry.isFile()) {
      out.push(rel.replace(/^\.\//, ''));
    }
  }
  return out.sort();
}

function pageLocale(relativePath) {
  const first = posix(relativePath).split('/')[0];
  return LOCALE_PREFIXES.has(first) ? first : 'ja';
}

function routeForFile(relativePath) {
  const rel = '/' + posix(relativePath).replace(/^\/+/, '');
  if (rel === '/index.html') return '/';
  if (rel.endsWith('/index.html')) return rel.slice(0, -'index.html'.length);
  return rel;
}

function localeForRoute(route) {
  const first = route.split('/').filter(Boolean)[0];
  return LOCALE_PREFIXES.has(first) ? first : 'ja';
}

function stripQueryHash(value) {
  return value.split('#', 1)[0].split('?', 1)[0];
}

function normalizeInternalHref(sourceFile, href) {
  const value = String(href || '').trim();
  if (!value || value.startsWith('#')) return { kind: 'anchor' };
  if (/^(?:mailto:|tel:|javascript:|data:)/i.test(value)) return { kind: 'ignored' };

  let url;
  try {
    if (/^https?:\/\//i.test(value)) {
      url = new URL(value);
      if (url.origin !== SITE_ORIGIN) return { kind: 'external', href: value };
    } else {
      const sourceUrl = new URL(routeForFile(sourceFile), SITE_ORIGIN);
      url = new URL(value, sourceUrl);
    }
  } catch {
    return { kind: 'invalid', href: value };
  }

  return {
    kind: 'internal',
    href: value,
    route: stripQueryHash(url.pathname) || '/',
    hash: url.hash || '',
    query: url.search || ''
  };
}

function targetCandidates(route) {
  const clean = decodeURIComponent(route).replace(/^\/+/, '');
  if (!clean) return ['index.html'];
  if (clean.endsWith('/')) return [clean + 'index.html'];
  const ext = path.posix.extname(clean);
  if (ext) return [clean];
  return [clean, clean + '.html', clean + '/index.html'];
}

function resolveTarget(rootDir, route) {
  const candidates = targetCandidates(route);
  const match = candidates.find(rel => fs.existsSync(path.join(rootDir, rel)) && fs.statSync(path.join(rootDir, rel)).isFile());
  return { exists: Boolean(match), matchedFile: match || null, candidates };
}

function extractAttr(tag, attr) {
  const m = tag.match(new RegExp('\\b' + attr + '\\s*=\\s*(["\'])(.*?)\\1', 'i'));
  return m ? m[2] : null;
}

function nearbyContext(html, index) {
  const start = Math.max(0, index - 450);
  const end = Math.min(html.length, index + 450);
  return html.slice(start, end);
}

function classifyComponent(tag, context) {
  const haystack = `${tag}\n${context}`.toLowerCase();
  if (/site-region-switcher|region-switch|play country|data-region/.test(haystack)) return 'region-switcher';
  if (/breadcrumb/.test(haystack)) return 'breadcrumb';
  if (/author-box|sidebar-author-card|operator/.test(haystack)) return 'author';
  if (/related-links|contextual-guide|article-related|related guides|popular-guides/.test(haystack)) return 'related';
  if (/cta-box|article-next-step|calculator-prompt|next-step/.test(haystack)) return 'cta';
  if (/site-header|site-nav|navigation|nav\b/.test(haystack)) return 'navigation';
  if (/footer/.test(haystack)) return 'footer';
  return 'content';
}

function localizedEquivalent(rootDir, sourceLocale, targetRoute) {
  if (!CONTENT_LOCALES.has(sourceLocale) || localeForRoute(targetRoute) !== 'ja') return null;
  const base = targetRoute === '/' ? '/' : targetRoute;
  const localizedRoute = `/${sourceLocale}${base.startsWith('/') ? base : '/' + base}`.replace(/\/+/g, '/');
  const resolved = resolveTarget(rootDir, localizedRoute);
  return resolved.exists ? { route: localizedRoute, file: resolved.matchedFile } : null;
}

function auditAnchor(rootDir, sourceFile, html, tag, index) {
  const href = extractAttr(tag, 'href');
  if (href == null) return null;
  const sourceLocale = pageLocale(sourceFile);
  const component = classifyComponent(tag, nearbyContext(html, index));
  const normalized = normalizeInternalHref(sourceFile, href);
  const finding = {
    sourceFile,
    sourceLocale,
    component,
    href,
    kind: normalized.kind,
    targetRoute: normalized.route || null,
    targetLocale: normalized.route ? localeForRoute(normalized.route) : null,
    targetFile: null,
    issues: []
  };

  if (normalized.kind === 'invalid') finding.issues.push('INVALID_HREF');
  if (normalized.kind !== 'internal') return finding;

  const resolved = resolveTarget(rootDir, normalized.route);
  finding.targetFile = resolved.matchedFile;
  if (!resolved.exists) finding.issues.push('BROKEN_INTERNAL_TARGET');

  if (sourceLocale !== 'ja' && normalized.route === '/blog/') {
    finding.issues.push('NON_JA_TO_JA_BLOG');
  }

  if (sourceLocale !== 'ja' && finding.targetLocale === 'ja' && component !== 'region-switcher') {
    const equivalent = localizedEquivalent(rootDir, sourceLocale, normalized.route);
    if (equivalent) {
      finding.issues.push('LOCALIZED_EQUIVALENT_EXISTS');
      finding.localizedEquivalent = equivalent;
    }
  }

  if (
    sourceLocale !== 'ja' &&
    finding.targetLocale !== 'ja' &&
    finding.targetLocale !== sourceLocale &&
    component !== 'region-switcher'
  ) {
    finding.issues.push('CROSS_LOCALE_TARGET');
  }

  return finding;
}

function extractHeadLinks(html) {
  const results = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = (extractAttr(tag, 'rel') || '').toLowerCase();
    const href = extractAttr(tag, 'href');
    if (!href) continue;
    if (rel.split(/\s+/).includes('canonical')) {
      results.push({ type: 'canonical', href, hreflang: null, tag });
    }
    if (rel.split(/\s+/).includes('alternate') && extractAttr(tag, 'hreflang')) {
      results.push({ type: 'hreflang', href, hreflang: extractAttr(tag, 'hreflang'), tag });
    }
  }
  return results;
}

function expectedCanonical(sourceFile) {
  return SITE_ORIGIN + routeForFile(sourceFile);
}

function auditHead(rootDir, sourceFile, html) {
  const links = extractHeadLinks(html);
  const findings = [];
  const canonicals = links.filter(link => link.type === 'canonical');
  if (canonicals.length === 0) {
    findings.push({ sourceFile, type: 'canonical', issue: 'MISSING_CANONICAL' });
  } else if (canonicals.length > 1) {
    findings.push({ sourceFile, type: 'canonical', issue: 'MULTIPLE_CANONICALS', count: canonicals.length });
  }
  for (const canonical of canonicals) {
    if (canonical.href !== expectedCanonical(sourceFile)) {
      findings.push({ sourceFile, type: 'canonical', issue: 'CANONICAL_ROUTE_MISMATCH', actual: canonical.href, expected: expectedCanonical(sourceFile) });
    }
  }

  for (const alternate of links.filter(link => link.type === 'hreflang')) {
    const normalized = normalizeInternalHref(sourceFile, alternate.href);
    if (normalized.kind !== 'internal') continue;
    const resolved = resolveTarget(rootDir, normalized.route);
    if (!resolved.exists) {
      findings.push({ sourceFile, type: 'hreflang', issue: 'BROKEN_HREFLANG_TARGET', hreflang: alternate.hreflang, href: alternate.href });
    }
  }
  return { links, findings };
}

function regionSwitcherFindings(sourceFile, html) {
  if (!/site-region-switcher|region-switch/.test(html)) return [];
  const required = ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/'];
  const hrefs = new Set([...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)].map(m => m[2]));
  const missing = required.filter(route => !hrefs.has(route));
  return missing.length ? [{ sourceFile, type: 'region-switcher', issue: 'REGION_SWITCHER_MISSING_DESTINATIONS', missing }] : [];
}

function scanSourceGenerators(rootDir) {
  const files = walkFiles(rootDir).filter(file => SOURCE_SCAN_DIRS.some(dir => file === dir || file.startsWith(dir + '/')) && /\.(?:c?js|mjs|html)$/.test(file));
  const rows = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(rootDir, file), 'utf8');
    if (!SOURCE_SIGNAL_PATTERN.test(text)) continue;
    const signals = [];
    for (const [name, pattern] of [
      ['href', /href/i],
      ['canonical', /canonical/i],
      ['hreflang', /hreflang/i],
      ['breadcrumb', /breadcrumb/i],
      ['region', /region/i],
      ['locale', /locale/i],
      ['articles', /articles/i],
      ['blog', /blog/i],
      ['author', /author/i],
      ['related', /related/i]
    ]) {
      if (pattern.test(text)) signals.push(name);
    }
    const writeSignals = [];
    if (/writeFileSync|appendFileSync|fs\.writeFile|replace\(|replaceAll\(|split\([^)]*\)\.join\(/.test(text)) writeSignals.push('mutates-or-generates');
    if (/build|sync|normalize|publish|insert|upsert/i.test(path.basename(file))) writeSignals.push('generator-name');
    rows.push({ file, signals, writeSignals: [...new Set(writeSignals)] });
  }
  return rows.sort((a, b) => a.file.localeCompare(b.file));
}

function summarizeLinkFindings(links) {
  const counts = {};
  for (const link of links) {
    for (const issue of link.issues || []) counts[issue] = (counts[issue] || 0) + 1;
  }
  return counts;
}

function auditRepository(rootDir) {
  const allFiles = walkFiles(rootDir);
  const htmlFiles = allFiles.filter(file => file.endsWith('.html'));
  const links = [];
  const headFindings = [];
  const regionFindings = [];
  const pagesByLocale = {};

  for (const file of htmlFiles) {
    const locale = pageLocale(file);
    pagesByLocale[locale] = (pagesByLocale[locale] || 0) + 1;
    const html = fs.readFileSync(path.join(rootDir, file), 'utf8');
    for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
      const row = auditAnchor(rootDir, file, html, match[0], match.index || 0);
      if (row) links.push(row);
    }
    const head = auditHead(rootDir, file, html);
    headFindings.push(...head.findings);
    regionFindings.push(...regionSwitcherFindings(file, html));
  }

  const problematicLinks = links.filter(row => row.issues && row.issues.length);
  const generatorInventory = scanSourceGenerators(rootDir);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      htmlFiles: htmlFiles.length,
      pagesByLocale,
      anchors: links.length,
      problematicLinks: problematicLinks.length,
      linkIssueCounts: summarizeLinkFindings(problematicLinks),
      headFindings: headFindings.length,
      regionFindings: regionFindings.length,
      generatorCandidates: generatorInventory.length
    },
    problematicLinks,
    headFindings,
    regionFindings,
    generatorInventory
  };
}

function markdownReport(report) {
  const lines = [
    '# International link / source inventory',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Coverage',
    '',
    `- HTML files: ${report.summary.htmlFiles}`,
    `- Anchors: ${report.summary.anchors}`,
    `- Problematic links: ${report.summary.problematicLinks}`,
    `- Head findings: ${report.summary.headFindings}`,
    `- Region findings: ${report.summary.regionFindings}`,
    `- Generator/source candidates: ${report.summary.generatorCandidates}`,
    '',
    '### Pages by locale',
    '',
    '| Locale | Pages |',
    '| --- | ---: |',
    ...Object.entries(report.summary.pagesByLocale).sort().map(([locale, count]) => `| ${locale} | ${count} |`),
    '',
    '## Link issue counts',
    '',
    '| Issue | Count |',
    '| --- | ---: |',
    ...Object.entries(report.summary.linkIssueCounts).sort().map(([issue, count]) => `| ${issue} | ${count} |`),
    '',
    '## Problematic links',
    '',
    '| Source | Locale | Component | href | Target | Issues |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.problematicLinks.map(row => `| ${row.sourceFile} | ${row.sourceLocale} | ${row.component} | ${String(row.href).replace(/\|/g, '\\|')} | ${row.targetRoute || ''} | ${(row.issues || []).join(', ')} |`),
    '',
    '## Head / hreflang findings',
    '',
    ...report.headFindings.map(row => `- ${row.sourceFile}: ${row.issue}${row.href ? ` (${row.href})` : ''}${row.actual ? ` actual=${row.actual}` : ''}${row.expected ? ` expected=${row.expected}` : ''}`),
    '',
    '## Region switcher findings',
    '',
    ...(report.regionFindings.length ? report.regionFindings.map(row => `- ${row.sourceFile}: ${row.issue} ${JSON.stringify(row.missing || [])}`) : ['- none']),
    '',
    '## Generator / source candidates',
    '',
    '| File | Signals | Mutation signal |',
    '| --- | --- | --- |',
    ...report.generatorInventory.map(row => `| ${row.file} | ${row.signals.join(', ')} | ${row.writeSignals.join(', ')} |`),
    ''
  ];
  return lines.join('\n');
}

function writeEvidence(rootDir, report) {
  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) return null;
  const dir = path.join(runnerTemp, 'playpoint-ci-evidence');
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, 'intl-link-source-audit.json');
  const mdPath = path.join(dir, 'intl-link-source-audit.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(mdPath, markdownReport(report) + '\n');
  return { jsonPath, mdPath };
}

if (require.main === module) {
  const rootDir = path.resolve(__dirname, '..');
  const report = auditRepository(rootDir);
  const evidence = writeEvidence(rootDir, report);
  console.log(JSON.stringify(report.summary, null, 2));
  if (evidence) console.log(`[intl-link-source-audit] evidence: ${evidence.jsonPath}, ${evidence.mdPath}`);
}

module.exports = {
  SITE_ORIGIN,
  auditRepository,
  classifyComponent,
  extractHeadLinks,
  localeForRoute,
  markdownReport,
  normalizeInternalHref,
  pageLocale,
  resolveTarget,
  routeForFile,
  scanSourceGenerators,
  targetCandidates
};
