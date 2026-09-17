'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  NAVIGATION_SOURCE_REGISTRY,
  SNAPSHOT_JSON,
  buildNavigationInventory,
  buildPublicUrlIndex,
  classifyTransition,
  collectPublicFiles,
  renderMarkdown,
  resolveReference
} = require('./navigation-provenance-audit.cjs');
const { evidenceDir } = require('../.github/scripts/ci-evidence.cjs');

const CODE_EXTENSIONS = ['.cjs', '.js', '.mjs'];
const SOURCE_SCAN_ENTRYPOINTS = Object.freeze([
  'scripts/build-html.js',
  ...NAVIGATION_SOURCE_REGISTRY.map(entry => entry.file)
]);
const RUNTIME_DESTINATION_CONTRACTS = Object.freeze([
  {
    sourceFile: 'js/region-navigation.js',
    expression: 'window.location.href = nextUrl',
    type: 'play-country-router',
    destinations: ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']
  },
  {
    sourceFile: 'pwa-launch.html',
    expression: "window.location.replace(regionPaths[preferredRegion] || '/')",
    type: 'pwa-play-country-router',
    destinations: ['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']
  },
  {
    sourceFile: 'blog/script.js',
    expression: 'history state URL',
    type: 'same-document-query-state',
    destinations: ['same-document']
  },
  {
    sourceFile: 'js/points-cost.js',
    expression: 'history state URL',
    type: 'same-document-query-state',
    destinations: ['same-document']
  },
  {
    sourceFile: 'js/share.js',
    expression: 'window.open(url)',
    type: 'external-share-target',
    destinations: ['dynamic-external']
  },
  {
    sourceFile: 'js/calculator.js',
    expression: 'window.open(twitter intent)',
    type: 'external-share-target',
    destinations: ['https://twitter.com/intent/tweet']
  },
  {
    sourceFile: 'games/game-sim.js',
    expression: 'window.open(twitterIntent)',
    type: 'external-share-target',
    destinations: ['https://twitter.com/intent/tweet']
  }
]);

const NAVIGATION_SIGNALS = Object.freeze([
  ['anchor-html', /<a\b[^>]*\bhref\s*=|href=["']/i],
  ['canonical', /\bcanonical\b/i],
  ['hreflang', /\bhreflang\b/i],
  ['region-switch', /region-(?:switch|selector)|data-region|play country/i],
  ['breadcrumb', /breadcrumb/i],
  ['related-navigation', /related-(?:links|guides)|contextual-(?:guide|link)|popular-guides/i],
  ['runtime-location', /(?:window\.|document\.)?location(?:\.href|\.pathname|\.assign|\.replace|\s*=)/i],
  ['window-open', /window\.open\s*\(/i],
  ['history-navigation', /history\.(?:pushState|replaceState)\s*\(/i],
  ['form-navigation', /\bformaction\s*=|<form\b[^>]*\baction\s*=/i],
  ['html-navigation-mutation', /(?:insertAdjacentHTML|innerHTML|writeFileSync|writeFile)\b[\s\S]{0,1000}(?:href|canonical|hreflang|breadcrumb|region-switch)/i]
]);

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function publicIndexAliases(publicFiles) {
  const index = buildPublicUrlIndex(publicFiles);
  for (const relativePath of publicFiles) {
    const normalized = toPosix(relativePath);
    if (!normalized.endsWith('index.html')) continue;
    index.set('/' + normalized, normalized);
  }
  return index;
}

function normalizeManualLocaleOwner(page) {
  if (/^(?:en|ko|tw)\/author\/katakata\.html$/.test(page.file)) return 'intl-author-generator';
  if (page.primaryOwner) return page.primaryOwner;
  if (/^(?:en|ko|tw)\/(?:amount|campaign|compare|maintenance|points-cost|status|latest|embed)\//.test(page.file)) {
    return 'tracked-locale-manual-lp';
  }
  return null;
}

function issueSort(a, b) {
  const rank = { high: 0, medium: 1, low: 2 };
  return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)
    || a.sourceFile.localeCompare(b.sourceFile)
    || (a.line || 0) - (b.line || 0)
    || String(a.pathname || a.rawHref || '').localeCompare(String(b.pathname || b.rawHref || ''));
}

function manifestNavigation(rootDir, publicUrlIndex) {
  const manifestFile = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestFile)) return [];
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); }
  catch (error) {
    return [{ sourceFile: 'manifest.json', sourcePath: '/manifest.json', sourceRegion: 'JP', kind: 'manifest-parse', role: 'pwa', scope: 'invalid', rawHref: '', disposition: 'invalid-manifest', severity: 'high', issue: `manifest-json-invalid:${error.message}` }];
  }
  const values = [];
  if (typeof manifest.start_url === 'string') values.push(['manifest-start-url', manifest.start_url]);
  for (const shortcut of Array.isArray(manifest.shortcuts) ? manifest.shortcuts : []) {
    if (shortcut && typeof shortcut.url === 'string') values.push(['manifest-shortcut', shortcut.url]);
  }
  return values.map(([kind, rawHref]) => {
    const record = {
      sourceFile: 'manifest.json',
      sourcePath: '/manifest.json',
      sourceRegion: 'JP',
      kind,
      role: 'pwa',
      line: null,
      rawHref,
      ...resolveReference(rawHref, 'https://playpoint-sim.com/manifest.json')
    };
    return { ...record, ...classifyTransition(record, publicUrlIndex) };
  });
}

function recomputeReport(rootDir, rawReport) {
  const publicFiles = collectPublicFiles(rootDir);
  const publicUrlIndex = publicIndexAliases(publicFiles);
  const transitions = rawReport.transitions.map(record => ({
    ...record,
    ...classifyTransition(record, publicUrlIndex)
  }));
  const runtimeNavigation = rawReport.runtimeNavigation.map(record => ({
    ...record,
    ...classifyTransition(record, publicUrlIndex)
  }));
  const platformNavigation = manifestNavigation(rootDir, publicUrlIndex);

  const staticIssuesByFile = new Map();
  for (const record of transitions) {
    if (!record.issue) continue;
    staticIssuesByFile.set(record.sourceFile, (staticIssuesByFile.get(record.sourceFile) || 0) + 1);
  }

  const pages = rawReport.pages.map(page => ({
    ...page,
    primaryOwner: normalizeManualLocaleOwner(page),
    counts: {
      ...page.counts,
      reviewCandidates: staticIssuesByFile.get(page.file) || 0
    }
  }));

  const issues = [
    ...transitions.filter(record => record.issue).map(record => ({ source: 'static', ...record })),
    ...runtimeNavigation.filter(record => record.issue).map(record => ({ source: 'runtime', ...record })),
    ...platformNavigation.filter(record => record.issue).map(record => ({ source: 'platform', ...record }))
  ].sort(issueSort);

  const structuralErrors = [
    ...rawReport.structuralErrors.filter(error => !error.startsWith('public HTML has no provenance owner: ')),
    ...pages.filter(page => !page.primaryOwner).map(page => `public HTML has no provenance owner: ${page.file}`)
  ];
  const dispositions = {};
  for (const record of transitions) dispositions[record.disposition] = (dispositions[record.disposition] || 0) + 1;

  return {
    ...rawReport,
    schemaVersion: 3,
    generatedBy: 'scripts/navigation-provenance-baseline.cjs',
    coverage: {
      ...rawReport.coverage,
      classifiedHtmlFiles: pages.filter(page => page.primaryOwner).length,
      unclassifiedHtmlFiles: pages.filter(page => !page.primaryOwner).length,
      platformNavigationReferences: platformNavigation.length,
      brokenInternalTargets: issues.filter(record => record.issue === 'broken-internal-target').length,
      highReviewCandidates: issues.filter(record => record.severity === 'high').length,
      mediumReviewCandidates: issues.filter(record => record.severity === 'medium').length,
      structuralErrors: structuralErrors.length
    },
    dispositions: Object.fromEntries(Object.entries(dispositions).sort(([a], [b]) => a.localeCompare(b))),
    structuralErrors,
    pages,
    issues,
    runtimeNavigation,
    platformNavigation,
    runtimeDestinationContracts: RUNTIME_DESTINATION_CONTRACTS,
    transitions
  };
}

function resolveCodeFile(rootDir, fromFile, request) {
  if (!request.startsWith('.')) return null;
  const base = path.resolve(rootDir, path.dirname(fromFile), request);
  const attempts = [base, ...CODE_EXTENSIONS.map(ext => base + ext), ...CODE_EXTENSIONS.map(ext => path.join(base, 'index' + ext))];
  for (const absolute of attempts) {
    if (!absolute.startsWith(path.resolve(rootDir) + path.sep)) continue;
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return toPosix(path.relative(rootDir, absolute));
  }
  return null;
}

function localDependencies(rootDir, relativePath) {
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute)) return [];
  const text = fs.readFileSync(absolute, 'utf8');
  const requests = new Set();
  for (const match of text.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) requests.add(match[1]);
  for (const match of text.matchAll(/\b(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/g)) requests.add(match[1]);
  for (const match of text.matchAll(/\bimport\s*["']([^"']+)["']/g)) requests.add(match[1]);
  return [...requests].map(request => resolveCodeFile(rootDir, relativePath, request)).filter(Boolean).sort();
}

function dependencyClosure(rootDir, entrypoints) {
  const queue = [...new Set(entrypoints)].filter(file => fs.existsSync(path.join(rootDir, file)));
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const dependency of localDependencies(rootDir, current)) {
      if (!visited.has(dependency)) queue.push(dependency);
    }
  }
  return [...visited].sort();
}

function getAttribute(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2] ?? null;
}

function publicRuntimeSources(rootDir, publicHtmlFiles) {
  const sources = new Set();
  for (const relativePath of publicHtmlFiles) {
    const text = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    for (const match of text.matchAll(/<script\b[^>]*>/gi)) {
      const src = getAttribute(match[0], 'src');
      if (!src || /^(?:https?:)?\/\//i.test(src) || /^(?:data|blob):/i.test(src)) continue;
      let pathname;
      try {
        const sourceUrl = new URL(relativePath.endsWith('index.html') ? '/' + relativePath.slice(0, -'index.html'.length) : '/' + relativePath, 'https://playpoint-sim.com/');
        pathname = new URL(src, sourceUrl).pathname.replace(/^\//, '');
      } catch {
        continue;
      }
      if (CODE_EXTENSIONS.includes(path.extname(pathname)) && fs.existsSync(path.join(rootDir, pathname))) sources.add(pathname);
    }
  }
  return [...sources].sort();
}

function navigationSignals(text) {
  return NAVIGATION_SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function discoverNavigationSources(rootDir, report) {
  const htmlFiles = report.pages.map(page => page.file);
  const runtimeSources = publicRuntimeSources(rootDir, htmlFiles);
  const graphFiles = dependencyClosure(rootDir, [...SOURCE_SCAN_ENTRYPOINTS, ...runtimeSources]);
  const registered = new Map(NAVIGATION_SOURCE_REGISTRY.map(entry => [entry.file, entry]));
  const candidates = [];

  for (const relativePath of graphFiles) {
    const absolute = path.join(rootDir, relativePath);
    const signals = navigationSignals(fs.readFileSync(absolute, 'utf8'));
    if (signals.length === 0) continue;
    const entry = registered.get(relativePath) || null;
    candidates.push({
      file: relativePath,
      provenance: runtimeSources.includes(relativePath) ? 'public-runtime-or-build-graph' : 'build-source-graph',
      signals,
      catalogOrigin: entry ? 'known-registry' : 'auto-discovered',
      registryId: entry?.id || null,
      registryKind: entry?.kind || null
    });
  }

  return {
    entrypoints: [...new Set([...SOURCE_SCAN_ENTRYPOINTS, ...runtimeSources])].sort(),
    graphFilesScanned: graphFiles.length,
    publicRuntimeSources: runtimeSources,
    candidates: candidates.sort((a, b) => a.file.localeCompare(b.file)),
    autoDiscoveredCandidates: candidates.filter(candidate => candidate.catalogOrigin === 'auto-discovered')
  };
}

function appendSourceCoverageMarkdown(markdown, sourceCoverage, platformNavigation) {
  const lines = [
    markdown.trimEnd(),
    '',
    '## 8. 生成元の自動探索カバレッジ',
    '',
    `- build/runtime依存グラフの走査ファイル: **${sourceCoverage.graphFilesScanned}**`,
    `- 公開HTMLから確認できたruntime script: **${sourceCoverage.publicRuntimeSources.length}**`,
    `- ナビゲーション信号を持つ候補: **${sourceCoverage.candidates.length}**`,
    `- 既知レジストリ外でも自動探索で捕捉した候補: **${sourceCoverage.autoDiscoveredCandidates.length}**`,
    '',
    '> 「自動探索」は未処理という意味ではありません。build-html依存グラフまたは実際の公開HTMLから読み込まれるruntime scriptを辿り、既知レジストリに無い候補も一覧へ強制的に載せるための漏れ防止層です。',
    '',
    '### 自動探索で追加捕捉した候補',
    ''
  ];
  if (sourceCoverage.autoDiscoveredCandidates.length === 0) {
    lines.push('なし。');
  } else {
    lines.push('| ファイル | 検出シグナル | 経路 |', '|---|---|---|');
    for (const candidate of sourceCoverage.autoDiscoveredCandidates) {
      lines.push(`| \`${candidate.file}\` | ${candidate.signals.join(', ')} | ${candidate.provenance} |`);
    }
  }
  lines.push('', '### 全候補', '', '| ファイル | 由来 | レジストリID | シグナル |', '|---|---|---|---|');
  for (const candidate of sourceCoverage.candidates) {
    lines.push(`| \`${candidate.file}\` | ${candidate.catalogOrigin} | ${candidate.registryId || ''} | ${candidate.signals.join(', ')} |`);
  }
  lines.push('', '## 9. PWA / runtime動的遷移の補完', '');
  if (platformNavigation.length > 0) {
    lines.push('| ソース | 種別 | 行先 | 判定 |', '|---|---|---|---|');
    for (const item of platformNavigation) lines.push(`| ${item.sourceFile} | ${item.kind} | ${item.pathname || item.rawHref} | ${item.disposition} |`);
    lines.push('');
  }
  lines.push('runtimeで行先が式になっている箇所は、静的解析で無理に推測せず契約として列挙します。', '');
  for (const contract of RUNTIME_DESTINATION_CONTRACTS) {
    lines.push(`- \`${contract.sourceFile}\` — ${contract.type}: ${contract.destinations.join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function digestRows(rows) {
  return crypto.createHash('sha256').update(rows.slice().sort().join('\n')).digest('hex');
}

function countBy(values, keyFn) {
  const counts = new Map();
  for (const value of values) {
    const key = keyFn(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function compactSnapshot(report) {
  const edgeRows = report.transitions.map(item => [
    item.sourceFile, item.kind, item.role, item.rawHref, item.pathname, item.search, item.hash,
    item.sourceRegion, item.targetRegion, item.disposition, item.issue, item.localizedEquivalent
  ].map(value => value ?? '').join('|'));
  const pageRows = report.pages.map(page => [page.file, page.region, page.primaryOwner, page.navigationMutators.join(',')].join('|'));
  const issueRows = report.issues.map(item => [item.source, item.sourceFile, item.kind, item.role, item.rawHref, item.pathname, item.issue, item.localizedEquivalent].map(value => value ?? '').join('|'));
  const sourceRows = report.sourceCoverage.candidates.map(item => [item.file, item.catalogOrigin, item.registryId, item.signals.join(',')].map(value => value ?? '').join('|'));
  const runtimeRows = report.runtimeNavigation.map(item => [item.sourceFile, item.kind, item.expression, item.scope, item.pathname, item.disposition].map(value => value ?? '').join('|'));

  return {
    schemaVersion: 1,
    reportDate: report.reportDate,
    generatedBy: report.generatedBy,
    coverage: report.coverage,
    dispositions: report.dispositions,
    issueCounts: countBy(report.issues, item => `${item.severity || 'none'}|${item.issue || 'none'}|${item.sourceRegion || 'none'}>${item.targetRegion || 'none'}|${item.role || 'none'}`),
    ownerCounts: countBy(report.pages, page => page.primaryOwner || 'UNCLASSIFIED'),
    sourceCatalog: report.sourceCoverage.candidates,
    runtimeDestinationContracts: report.runtimeDestinationContracts,
    platformNavigation: report.platformNavigation,
    fingerprints: {
      staticTransitions: digestRows(edgeRows),
      pageProvenance: digestRows(pageRows),
      reviewCandidates: digestRows(issueRows),
      sourceCatalog: digestRows(sourceRows),
      runtimeExpressions: digestRows(runtimeRows)
    }
  };
}

function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function buildBaseline(rootDir) {
  const report = recomputeReport(rootDir, buildNavigationInventory(rootDir));
  const sourceCoverage = discoverNavigationSources(rootDir, report);
  report.sourceCoverage = sourceCoverage;
  report.coverage.sourceGraphFilesScanned = sourceCoverage.graphFilesScanned;
  report.coverage.navigationSourceCandidates = sourceCoverage.candidates.length;
  report.coverage.autoDiscoveredNavigationSourceCandidates = sourceCoverage.autoDiscoveredCandidates.length;
  return report;
}

function reportMarkdown(report) {
  return appendSourceCoverageMarkdown(renderMarkdown(report), report.sourceCoverage, report.platformNavigation) + '\n';
}

function writeEvidence(report) {
  const dir = evidenceDir();
  writeFileEnsured(path.join(dir, 'navigation-provenance-inventory.json'), stableJson(report));
  writeFileEnsured(path.join(dir, 'navigation-provenance-inventory.md'), reportMarkdown(report));
  writeFileEnsured(path.join(dir, 'navigation-provenance-baseline.json'), stableJson(compactSnapshot(report)));
  return dir;
}

function writeSnapshot(rootDir, report) {
  writeFileEnsured(path.join(rootDir, SNAPSHOT_JSON), stableJson(compactSnapshot(report)));
}

function checkSnapshot(rootDir, report) {
  const absolute = path.join(rootDir, SNAPSHOT_JSON);
  if (!fs.existsSync(absolute)) return [`snapshot is missing: ${SNAPSHOT_JSON}`];
  return fs.readFileSync(absolute, 'utf8') === stableJson(compactSnapshot(report))
    ? []
    : [`snapshot is stale: ${SNAPSHOT_JSON}`];
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const args = new Set(process.argv.slice(2));
  const report = buildBaseline(rootDir);
  const dir = writeEvidence(report);
  const c = report.coverage;
  console.log(`[navigation-baseline] public HTML ${c.classifiedHtmlFiles}/${c.publicHtmlFiles}; static refs=${c.staticNavigationReferences}; runtime refs=${c.runtimeNavigationExpressions}; platform refs=${c.platformNavigationReferences}`);
  console.log(`[navigation-baseline] high=${c.highReviewCandidates}; medium=${c.mediumReviewCandidates}; broken=${c.brokenInternalTargets}; structural=${c.structuralErrors}`);
  console.log(`[navigation-baseline] source candidates=${c.navigationSourceCandidates}; auto-discovered=${c.autoDiscoveredNavigationSourceCandidates}; graph files=${c.sourceGraphFilesScanned}`);
  console.log(`[navigation-baseline] evidence: ${dir}`);

  const failures = [...report.structuralErrors];
  if (args.has('--write')) writeSnapshot(rootDir, report);
  if (args.has('--check')) failures.push(...checkSnapshot(rootDir, report));

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[navigation-baseline] ${failure}`);
    process.exitCode = 1;
  }
}

if (require.main === module) runCli();

module.exports = {
  NAVIGATION_SIGNALS,
  RUNTIME_DESTINATION_CONTRACTS,
  SOURCE_SCAN_ENTRYPOINTS,
  appendSourceCoverageMarkdown,
  buildBaseline,
  compactSnapshot,
  dependencyClosure,
  discoverNavigationSources,
  localDependencies,
  manifestNavigation,
  normalizeManualLocaleOwner,
  publicIndexAliases,
  publicRuntimeSources,
  recomputeReport,
  reportMarkdown
};
