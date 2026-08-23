'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EXCLUDED_PUBLIC_DIRECTORIES = new Set([
  '.git',
  '.github',
  'docs',
  'node_modules',
  'scripts',
  'tests'
]);

function getPublicHtmlFiles(rootDir, currentDir = rootDir) {
  return fs.readdirSync(currentDir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && EXCLUDED_PUBLIC_DIRECTORIES.has(entry.name)) return [];
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) return getPublicHtmlFiles(rootDir, absolutePath);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];
    return [absolutePath];
  });
}

function isDirectHrefMatchCondition(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === 1
    && typeof value.href_matches === 'string';
}

function normalizeConditionTree(value) {
  if (Array.isArray(value)) {
    let changed = false;
    const items = value.map(item => {
      const normalized = normalizeConditionTree(item);
      if (normalized.changed) changed = true;
      return normalized.value;
    });
    return { value: items, changed };
  }

  if (!value || typeof value !== 'object') {
    return { value, changed: false };
  }

  let changed = false;
  const normalizedObject = {};
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeConditionTree(child);
    normalizedObject[key] = normalized.value;
    if (normalized.changed) changed = true;
  }

  if (!Array.isArray(normalizedObject.and)) {
    return { value: normalizedObject, changed };
  }

  const hrefConditions = normalizedObject.and.filter(isDirectHrefMatchCondition);
  if (hrefConditions.length <= 1) {
    return { value: normalizedObject, changed };
  }

  const grouped = [];
  let insertedHrefGroup = false;
  for (const child of normalizedObject.and) {
    if (isDirectHrefMatchCondition(child)) {
      if (!insertedHrefGroup) {
        grouped.push({ or: hrefConditions });
        insertedHrefGroup = true;
      }
      continue;
    }
    grouped.push(child);
  }

  normalizedObject.and = grouped;
  return { value: normalizedObject, changed: true };
}

function normalizeAndBlocks(jsonText) {
  const parsed = JSON.parse(jsonText);
  const normalized = normalizeConditionTree(parsed);
  if (!normalized.changed) return jsonText;
  return JSON.stringify(normalized.value, null, 2);
}

function normalizeSpeculationRulesHtml(html) {
  return html.replace(
    /(<script type="speculationrules">\s*)(\{[\s\S]*?\})(\s*<\/script>)/g,
    (_match, prefix, jsonText, suffix) => `${prefix}${normalizeAndBlocks(jsonText)}${suffix}`
  );
}

function syncSpeculationRules(rootDir) {
  let changed = 0;

  for (const filePath of getPublicHtmlFiles(rootDir)) {
    const current = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizeSpeculationRulesHtml(current);
    if (normalized === current) continue;
    fs.writeFileSync(filePath, normalized, 'utf8');
    changed += 1;
  }

  return changed;
}

module.exports = {
  getPublicHtmlFiles,
  normalizeAndBlocks,
  normalizeSpeculationRulesHtml,
  syncSpeculationRules
};
