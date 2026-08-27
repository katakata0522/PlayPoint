'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FOREIGN_TERMINOLOGY_PATTERN = /<span\b(?=[^>]*\bdata-foreign-terminology(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)[^>]*>[\s\S]*?<\/span>/gi;
const LEGACY_TAIWAN_TERMS = Object.freeze([
  { code: 'bare-gold-tier', pattern: /(?<![白黃])金級/g, replacement: '黃金級' },
  { code: 'legacy-earn-rate', pattern: /累積率/g, replacement: '積點率' },
  { code: 'legacy-earn-condition', pattern: /累積條件/g, replacement: '積點條件' }
]);
const TAIWAN_SOURCE_FILES = Object.freeze([
  'embed/playpoint-widget.js',
  'js/config.js',
  'js/points-cost.js',
  'games/game-sim.js',
  'scripts/generate-game-simulators.cjs',
  'scripts/locale-config.cjs',
  'scripts/intl-seo-content.cjs',
  'scripts/intl-manual-content-sync.cjs'
]);

function mapOutsideForeignTerminology(text, transform) {
  let cursor = 0;
  let output = '';
  for (const match of text.matchAll(FOREIGN_TERMINOLOGY_PATTERN)) {
    const index = match.index ?? 0;
    output += transform(text.slice(cursor, index));
    output += match[0];
    cursor = index + match[0].length;
  }
  output += transform(text.slice(cursor));
  return output;
}

function findTaiwanTerminologyViolations(text, relativePath = '') {
  const searchable = text.replace(FOREIGN_TERMINOLOGY_PATTERN, match => ' '.repeat(match.length));
  const violations = [];
  for (const rule of LEGACY_TAIWAN_TERMS) {
    rule.pattern.lastIndex = 0;
    for (const match of searchable.matchAll(rule.pattern)) {
      const before = searchable.slice(0, match.index ?? 0);
      const line = before.split('\n').length;
      violations.push({
        code: rule.code,
        term: match[0],
        replacement: rule.replacement,
        path: relativePath,
        line
      });
    }
  }
  return violations;
}

function assertTaiwanTerminology(rootDir) {
  const twRoot = path.join(rootDir, 'tw');
  let htmlFilesChecked = 0;
  let sourceFilesChecked = 0;
  const violations = [];

  function inspectFile(file, relativePath) {
    const current = fs.readFileSync(file, 'utf8');
    violations.push(...findTaiwanTerminologyViolations(current, relativePath));
  }

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) {
        htmlFilesChecked += 1;
        const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
        inspectFile(file, relativePath);
      }
    }
  }

  if (fs.existsSync(twRoot)) visit(twRoot);

  for (const relativePath of TAIWAN_SOURCE_FILES) {
    const file = path.join(rootDir, relativePath);
    if (!fs.existsSync(file)) {
      throw new Error(`Taiwan terminology contract source is missing: ${relativePath}`);
    }
    sourceFilesChecked += 1;
    inspectFile(file, relativePath);
  }

  if (violations.length) {
    const details = violations
      .map(item => `${item.path}:${item.line} ${item.term} -> ${item.replacement} (${item.code})`)
      .join('\n');
    throw new Error(`Taiwan terminology contract failed with ${violations.length} violation(s):\n${details}\nFor an intentional foreign-region quote in HTML, wrap only that text in <span data-foreign-terminology>...</span>. For source-only regional comparisons, update the contract deliberately instead of bypassing it silently.`);
  }

  return { htmlFilesChecked, sourceFilesChecked, violations: 0 };
}

module.exports = {
  FOREIGN_TERMINOLOGY_PATTERN,
  LEGACY_TAIWAN_TERMS,
  TAIWAN_SOURCE_FILES,
  assertTaiwanTerminology,
  findTaiwanTerminologyViolations,
  mapOutsideForeignTerminology
};
