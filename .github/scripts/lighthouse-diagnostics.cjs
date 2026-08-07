'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const reportPaths = [];
  let outputDir = 'performance-artifacts';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output-dir') {
      outputDir = argv[index + 1] || outputDir;
      index += 1;
      continue;
    }
    reportPaths.push(argv[index]);
  }
  return { reportPaths, outputDir };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function numericValue(report, auditId) {
  const value = report.audits?.[auditId]?.numericValue;
  return Number.isFinite(value) ? value : null;
}

function nodeDescription(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return node.value || '';
  return node.selector || node.nodeLabel || node.snippet || '';
}

function detailRows(details) {
  if (!details || !Array.isArray(details.items)) return [];
  if (details.type === 'table') return details.items;
  if (details.type === 'list') {
    return details.items.flatMap(item => {
      if (item?.type === 'table' && Array.isArray(item.items)) return item.items;
      return [];
    });
  }
  return [];
}

function layoutShiftCauses(item) {
  const subItems = item?.subItems?.items;
  if (!Array.isArray(subItems)) return [];
  return subItems.map(subItem => ({
    cause: String(subItem.cause || '').trim(),
    element: nodeDescription(subItem.extra || subItem.node || subItem.source)
  })).filter(cause => cause.cause || cause.element);
}

function layoutShiftItems(report) {
  const auditIds = ['layout-shifts', 'layout-shift-elements', 'cls-culprits-insight'];
  const found = new Map();

  for (const auditId of auditIds) {
    const rows = detailRows(report.audits?.[auditId]?.details);
    for (const item of rows) {
      const candidate = item.node || item.source || item;
      const description = nodeDescription(candidate);
      if (!description || description === 'Total') continue;
      const rawScore = item.score ?? item.value ?? item.cumulativeLayoutShiftScore;
      const score = rawScore === undefined ? null : Number(rawScore);
      const normalizedScore = Number.isFinite(score) ? score : null;
      const key = `${description}\u0000${normalizedScore ?? ''}`;
      if (found.has(key)) continue;
      found.set(key, {
        auditId,
        description,
        score: normalizedScore,
        causes: layoutShiftCauses(item)
      });
    }
  }

  return [...found.values()]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);
}

function longTaskItems(report) {
  const items = report.audits?.['long-tasks']?.details?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      durationMs: Number(item.duration) || 0,
      startTimeMs: Number(item.startTime) || 0,
      url: item.url || '(inline / unknown)'
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10);
}

function topOpportunities(report) {
  return Object.entries(report.audits || {})
    .map(([id, audit]) => ({
      id,
      title: audit.title || id,
      wastedMs: Number(audit.details?.overallSavingsMs || 0),
      wastedBytes: Number(audit.details?.overallSavingsBytes || 0),
      score: audit.score
    }))
    .filter(item => item.wastedMs > 0 || item.wastedBytes > 0)
    .sort((a, b) => (b.wastedMs - a.wastedMs) || (b.wastedBytes - a.wastedBytes))
    .slice(0, 10);
}

function summarize(reportPath) {
  const report = readJson(reportPath);
  return {
    file: reportPath,
    url: report.finalDisplayedUrl || report.finalUrl || '',
    fetchedAt: report.fetchTime || null,
    metrics: {
      performanceScore: report.categories?.performance?.score ?? null,
      firstContentfulPaintMs: numericValue(report, 'first-contentful-paint'),
      largestContentfulPaintMs: numericValue(report, 'largest-contentful-paint'),
      totalBlockingTimeMs: numericValue(report, 'total-blocking-time'),
      cumulativeLayoutShift: numericValue(report, 'cumulative-layout-shift'),
      speedIndexMs: numericValue(report, 'speed-index'),
      totalByteWeight: numericValue(report, 'total-byte-weight')
    },
    layoutShiftElements: layoutShiftItems(report),
    longTasks: longTaskItems(report),
    opportunities: topOpportunities(report)
  };
}

function toMarkdown(summaries) {
  const lines = ['# Low-end Android Lighthouse diagnostics', ''];
  for (const summary of summaries) {
    lines.push(`## ${summary.url || summary.file}`, '');
    lines.push('| Metric | Value |', '|---|---:|');
    for (const [name, value] of Object.entries(summary.metrics)) {
      lines.push(`| ${name} | ${value ?? 'n/a'} |`);
    }
    lines.push('', '### Layout shift elements');
    if (summary.layoutShiftElements.length === 0) {
      lines.push('- Lighthouse did not identify a specific layout-shift element.');
    } else {
      summary.layoutShiftElements.forEach(item => {
        lines.push(`- \`${item.description.replace(/`/g, '\\`')}\` — score: ${item.score ?? 'n/a'} (${item.auditId})`);
        item.causes.forEach(cause => {
          const element = cause.element ? ` — \`${cause.element.replace(/`/g, '\\`')}\`` : '';
          lines.push(`  - ${cause.cause || 'Related element'}${element}`);
        });
      });
    }
    lines.push('', '### Long tasks');
    if (summary.longTasks.length === 0) {
      lines.push('- No long-task details were reported.');
    } else {
      summary.longTasks.forEach(item => {
        lines.push(`- ${item.durationMs.toFixed(1)} ms at ${item.startTimeMs.toFixed(1)} ms — ${item.url}`);
      });
    }
    lines.push('', '### Highest-cost opportunities');
    if (summary.opportunities.length === 0) {
      lines.push('- No measurable opportunities were reported.');
    } else {
      summary.opportunities.forEach(item => {
        lines.push(`- ${item.title} (wastedMs: ${item.wastedMs.toFixed(1)}, wastedBytes: ${item.wastedBytes})`);
      });
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const { reportPaths, outputDir } = parseArgs(argv);
  if (reportPaths.length === 0) {
    console.error('診断するLighthouse JSONを指定してください。');
    return 1;
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const summaries = reportPaths.map(summarize);
  fs.writeFileSync(path.join(outputDir, 'lighthouse-diagnostics.json'), `${JSON.stringify(summaries, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'lighthouse-diagnostics.md'), toMarkdown(summaries));
  console.log(`Lighthouse診断結果を保存しました: ${outputDir}`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  detailRows,
  layoutShiftItems,
  longTaskItems,
  main,
  parseArgs,
  summarize,
  toMarkdown,
  topOpportunities
};
