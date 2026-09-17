'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  auditRepository,
  markdownReport: baseMarkdownReport
} = require('./intl-link-source-audit.cjs');

const OWNER_RULES = [
  {
    id: 'calculator-home',
    match: file => /^(?:index\.html|(?:en|ko|tw|hk|in)\/index\.html)$/.test(file),
    owners: [
      'scripts/language-page-builder.cjs',
      'scripts/region-page-sync.cjs',
      'scripts/region-hreflang-sync.cjs',
      'scripts/calculator-header-sync.cjs',
      'js/region-navigation.js'
    ]
  },
  {
    id: 'intl-article',
    match: file => /^(?:en|ko|tw)\/articles\//.test(file),
    owners: [
      'scripts/intl-content-expansion.cjs',
      'scripts/intl-manual-content-sync.cjs',
      'scripts/intl-article-layout.cjs',
      'scripts/intl-navigation-sidebar-v1.cjs',
      'scripts/intl-article-hreflang-sync.cjs',
      'scripts/article-content-navigation-normalize.cjs',
      'scripts/article-discovery-sync.cjs'
    ]
  },
  {
    id: 'intl-game',
    match: file => /^(?:en|ko|tw)\/games\//.test(file),
    owners: [
      'scripts/generate-game-simulators.cjs',
      'scripts/intl-game-guide-publish-normalize.cjs',
      'scripts/game-seo-common.cjs',
      'scripts/game-seo-wave5-sync.cjs',
      'scripts/game-seo-wave5-regional-sync.cjs',
      'scripts/game-guide-article-hub-sync.cjs'
    ]
  },
  {
    id: 'intl-seo-landing',
    match: file => /^(?:en|ko|tw)\/(?:amount|campaign|maintenance|points-cost|status)\//.test(file),
    owners: [
      'scripts/intl-seo-pages.cjs',
      'scripts/intl-seo-content.cjs',
      'scripts/fixed-page-header-sync.cjs',
      'scripts/manual-lp-hreflang-sync.cjs'
    ]
  },
  {
    id: 'intl-author',
    match: file => /^(?:en|ko|tw)\/author\//.test(file),
    owners: [
      'scripts/intl-author-pages.cjs',
      'scripts/author-hreflang-sync.cjs',
      'scripts/intl-navigation-sidebar-v1.cjs'
    ]
  },
  {
    id: 'ja-article',
    match: file => /^(?:articles|blog)\//.test(file),
    owners: [
      'scripts/article-static-usability.cjs',
      'scripts/japanese-navigation-sidebar.cjs',
      'scripts/article-content-navigation-normalize.cjs',
      'scripts/article-discovery-sync.cjs',
      'blog/article.js'
    ]
  }
];

function ownershipForFile(file) {
  const rule = OWNER_RULES.find(candidate => candidate.match(file));
  return rule ? { sourceFamily: rule.id, ownerCandidates: rule.owners } : {
    sourceFamily: 'other-public-page',
    ownerCandidates: ['scripts/build-html.js']
  };
}

function sameMaintenanceFamily(sourceFile, targetRoute) {
  const source = sourceFile.match(/^(?:en|ko|tw)\/maintenance\/(diamond|platinum)\/index\.html$/);
  if (!source) return false;
  const level = source[1];
  return new RegExp(`^/(?:en/|ko/|tw/)?maintenance/${level}/$`).test(targetRoute || '');
}

function classifyIntent(row) {
  if (sameMaintenanceFamily(row.sourceFile, row.targetRoute)) return 'INTENTIONAL_LOCALE_SWITCH';
  return null;
}

function refineProblematicLinks(rows) {
  const intentional = [];
  const actionable = [];
  for (const original of rows) {
    const row = { ...original, ...ownershipForFile(original.sourceFile) };
    const intent = classifyIntent(row);
    if (intent) {
      row.intent = intent;
      row.originalIssues = row.issues;
      row.issues = [];
      intentional.push(row);
    } else {
      actionable.push(row);
    }
  }
  return { actionable, intentional };
}

function runtimeRegionContract(rootDir) {
  const relative = 'js/region-navigation.js';
  const absolute = path.join(rootDir, relative);
  if (!fs.existsSync(absolute)) {
    return { file: relative, ok: false, missing: ['file'] };
  }
  const source = fs.readFileSync(absolute, 'utf8');
  const required = {
    JP: "JP: ''",
    US: "US: 'en/'",
    KR: "KR: 'ko/'",
    TW: "TW: 'tw/'",
    HK: "HK: 'hk/'",
    IN: "IN: 'in/'"
  };
  const missing = Object.entries(required)
    .filter(([, needle]) => !source.includes(needle))
    .map(([region]) => region);
  return { file: relative, ok: missing.length === 0, missing };
}

function refineRegionFindings(rootDir, baseFindings) {
  const findings = [];
  const runtimeOwned = [];
  for (const finding of baseFindings) {
    const absolute = path.join(rootDir, finding.sourceFile);
    const html = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
    if (/class=["'][^"']*\bregion-switch\b/.test(html) && !/site-region-switcher/.test(html)) {
      runtimeOwned.push({ ...finding, intent: 'RUNTIME_REGION_SWITCHER', owner: 'js/region-navigation.js' });
      continue;
    }
    findings.push(finding);
  }
  const runtimeContract = runtimeRegionContract(rootDir);
  if (!runtimeContract.ok) {
    findings.push({ sourceFile: runtimeContract.file, type: 'region-runtime', issue: 'REGION_RUNTIME_MAPPING_INCOMPLETE', missing: runtimeContract.missing });
  }
  return { findings, runtimeOwned, runtimeContract };
}

function classifyGeneratorRows(rootDir, rows) {
  const buildPath = path.join(rootDir, 'scripts/build-html.js');
  const buildSource = fs.existsSync(buildPath) ? fs.readFileSync(buildPath, 'utf8') : '';
  return rows.map(row => {
    let role;
    if (row.file === 'scripts/build-html.js') role = 'build-orchestrator';
    else if (row.file.startsWith('.github/scripts/')) role = 'ci-audit';
    else if (row.file.startsWith('js/') || row.file.startsWith('blog/')) role = 'runtime';
    else {
      const basename = path.basename(row.file).replace(/\.(?:c?js|mjs)$/, '');
      if (buildSource.includes(`./${basename}`)) role = 'build-pipeline';
      else if (/(?:audit|check|report|find|list|verify)/i.test(basename)) role = 'audit-tool';
      else role = 'source-support-or-manual';
    }
    return { ...row, role };
  });
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function buildBaseline(rootDir) {
  const base = auditRepository(rootDir);
  const refinedLinks = refineProblematicLinks(base.problematicLinks);
  const refinedRegion = refineRegionFindings(rootDir, base.regionFindings);
  const generatorInventory = classifyGeneratorRows(rootDir, base.generatorInventory);
  const report = {
    ...base,
    problematicLinks: refinedLinks.actionable,
    intentionalLocaleSwitches: refinedLinks.intentional,
    regionFindings: refinedRegion.findings,
    runtimeRegionSwitchers: refinedRegion.runtimeOwned,
    runtimeRegionContract: refinedRegion.runtimeContract,
    generatorInventory,
    rawSummary: base.summary
  };
  report.summary = {
    ...base.summary,
    problematicLinks: report.problematicLinks.length,
    intentionalLocaleSwitches: report.intentionalLocaleSwitches.length,
    regionFindings: report.regionFindings.length,
    runtimeRegionSwitchers: report.runtimeRegionSwitchers.length,
    linkIssueCounts: countBy(report.problematicLinks.flatMap(row => row.issues.map(issue => ({ issue }))), row => row.issue),
    findingsByLocale: countBy(report.problematicLinks, row => row.sourceLocale),
    findingsByComponent: countBy(report.problematicLinks, row => row.component),
    findingsBySourceFamily: countBy(report.problematicLinks, row => row.sourceFamily),
    findingsByTarget: countBy(report.problematicLinks, row => row.targetRoute || '(none)'),
    generatorsByRole: countBy(generatorInventory, row => row.role)
  };
  return report;
}

function markdownReport(report) {
  const base = baseMarkdownReport(report);
  const lines = [
    base,
    '',
    '## Precision classification',
    '',
    `- Actionable candidates after intentional-locale filtering: ${report.summary.problematicLinks}`,
    `- Intentional maintenance locale-switch links removed from actionable set: ${report.summary.intentionalLocaleSwitches}`,
    `- Runtime-owned calculator region switchers: ${report.summary.runtimeRegionSwitchers}`,
    `- Remaining region findings: ${report.summary.regionFindings}`,
    `- Runtime region map complete: ${report.runtimeRegionContract.ok ? 'yes' : 'no'}`,
    '',
    '### Findings by source family',
    '',
    '| Source family | Count |',
    '| --- | ---: |',
    ...Object.entries(report.summary.findingsBySourceFamily).map(([name, count]) => `| ${name} | ${count} |`),
    '',
    '### Findings by target',
    '',
    '| Target | Count |',
    '| --- | ---: |',
    ...Object.entries(report.summary.findingsByTarget).map(([name, count]) => `| ${name} | ${count} |`),
    '',
    '### Intentional locale switches',
    '',
    ...report.intentionalLocaleSwitches.map(row => `- ${row.sourceFile} -> ${row.targetRoute} (${row.intent})`),
    '',
    '## Generator roles',
    '',
    '| Role | Count |',
    '| --- | ---: |',
    ...Object.entries(report.summary.generatorsByRole).map(([name, count]) => `| ${name} | ${count} |`),
    '',
    '## Actionable candidates with likely owners',
    '',
    '| Source | Component | Target | Issues | Source family | Owner candidates |',
    '| --- | --- | --- | --- | --- | --- |',
    ...report.problematicLinks.map(row => `| ${row.sourceFile} | ${row.component} | ${row.targetRoute || ''} | ${row.issues.join(', ')} | ${row.sourceFamily} | ${row.ownerCandidates.join('<br>')} |`),
    ''
  ];
  return lines.join('\n');
}

module.exports = {
  OWNER_RULES,
  buildBaseline,
  classifyIntent,
  markdownReport,
  ownershipForFile,
  runtimeRegionContract,
  sameMaintenanceFamily
};
