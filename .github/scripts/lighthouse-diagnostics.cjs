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
  return node.selector || node.nodeLabel || node.snippet || '';
}

function layoutShiftItems(report) {
  const auditIds = ['layout-shift-elements', 'cls-culprits-insight'];
  const items = [];
  for (const auditId of auditIds) {
    const auditItems = report.audits?.[auditId]?.details?.items;
    if (!Array.isArray(auditItems)) continue;
    for (const item of auditItems) {
      const candidate = item.node || item.source || item;
      const description = nodeDescription(candidate);
      const score = Number(item.score ?? item.value ?? item.cumulativeLayoutShiftScore ?? 0);
      if (!description && !Number.isFinite(score)) continue;
      items.push({
        auditId,
        description: description || '(要素情報なし)',
        score: Number.isFinite(score) ? score : null
      });
    }
  }
  return items
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
      wastedMs: Number(audit.details?.overallSavingsMs ?? audit.numericValue ?? 0),
      wastedBytes: Number(audit.details?.overallSavingsBytes ?? 0),
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

const { reportPaths, outputDir } = parseArgs(process.argv.slice(2));
if (reportPaths.length === 0) {
  console.error('診断するLighthouse JSONを指定してください。');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
const summaries = reportPaths.map(summarize);
fs.writeFileSync(path.join(outputDir, 'lighthouse-diagnostics.json'), `${JSON.stringify(summaries, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'lighthouse-diagnostics.md'), toMarkdown(summaries));
console.log(`Lighthouse診断結果を保存しました: ${outputDir}`);

module.exports = {
  layoutShiftItems,
  longTaskItems,
  parseArgs,
  summarize,
  toMarkdown,
  topOpportunities
};
