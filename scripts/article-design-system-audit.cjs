'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { articleCorpus } = require('./article-role-next-action-audit.cjs');
const { classifyArticleRole, ROLE_DEFINITIONS } = require('./article-role-registry.cjs');

const SHARED_CSS = /<link\b[^>]*href=["'][^"']*article-shared\.css(?:\?[^"']*)?["'][^>]*>/gi;
function count(regex, value) { return (String(value).match(regex) || []).length; }
function hasClass(html, name) { return new RegExp('class=["\\\'][^"\\\']*\\b' + name + '\\b[^"\\\']*["\\\']', 'i').test(html); }

function auditArticleDesignSystem(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const corpus = articleCorpus(root);
  const roleCounts = Object.fromEntries(Object.keys(ROLE_DEFINITIONS).map(role => [role, 0]));
  const components = { answer: 0, intro: 0, summary: 0, stackedLead: 0, markers: 0, related: 0 };
  const failures = [];
  const warnings = [];

  for (const record of corpus) {
    const file = path.join(root, record.relativePath);
    if (!fs.existsSync(file)) {
      failures.push(record.relativePath + ': article file missing');
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const role = classifyArticleRole(record.relativePath, { listed: record.listed });
    if (!role) {
      failures.push(record.relativePath + ': Article Role is unclassified');
      continue;
    }
    roleCounts[role] += 1;

    const sharedCount = count(SHARED_CSS, html);
    if (sharedCount !== 1) failures.push(record.relativePath + ': article-shared.css link count=' + sharedCount);

    const answer = hasClass(html, 'answer-box') || hasClass(html, 'editorial-answer');
    const intro = hasClass(html, 'intro');
    const summary = hasClass(html, 'summary-box');
    const markerCount = count(/class=["'][^"']*\bmarker-(?:yellow|blue|red)\b[^"']*["']/gi, html);
    const related = /class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["']/i.test(html);

    if (answer) components.answer += 1;
    if (intro) components.intro += 1;
    if (summary) components.summary += 1;
    if (answer && intro && summary) components.stackedLead += 1;
    components.markers += markerCount;
    if (related) components.related += 1;
  }

  if (components.stackedLead > 0) failures.push('legacy answer + intro + summary stacks are not allowed: ' + components.stackedLead);
  if (components.markers === 0) warnings.push('no explicit editorial marker classes remain in article corpus');
  return { articleCount: corpus.length, roleCounts, components, failures, warnings };
}

function print(result) {
  console.log('Article Design System Audit: articles=' + result.articleCount);
  console.log('roles=' + Object.entries(result.roleCounts).map(([role, n]) => role + ':' + n).join(', '));
  console.log('components=' + Object.entries(result.components).map(([name, n]) => name + ':' + n).join(', '));
  console.log('errors=' + result.failures.length + ', warnings=' + result.warnings.length);
  result.failures.forEach(message => console.error('- ERROR: ' + message));
  result.warnings.forEach(message => console.warn('- WARN: ' + message));
}

if (require.main === module) {
  const result = auditArticleDesignSystem(process.cwd());
  print(result);
  if (result.failures.length) process.exitCode = 1;
}
module.exports = { auditArticleDesignSystem, print };
