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

function normalizeAndBlocks(jsonText) {
  const lines = jsonText.split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const andMatch = line.match(/^(\s*)"and": \[$/);
    if (!andMatch) {
      output.push(line);
      continue;
    }

    const indent = andMatch[1];
    const hrefLinePattern = new RegExp(`^${indent}  \\{ "href_matches": "[^"]+" \\},$`);
    const hrefLines = [];
    let cursor = index + 1;

    while (cursor < lines.length && hrefLinePattern.test(lines[cursor])) {
      hrefLines.push(lines[cursor]);
      cursor += 1;
    }

    output.push(line);
    if (hrefLines.length <= 1) continue;

    output.push(`${indent}  {`);
    output.push(`${indent}    "or": [`);
    hrefLines.forEach((hrefLine, hrefIndex) => {
      const item = hrefLine.trim().replace(/,$/, '');
      output.push(`${indent}      ${item}${hrefIndex < hrefLines.length - 1 ? ',' : ''}`);
    });
    output.push(`${indent}    ]`);
    output.push(`${indent}  },`);
    index = cursor - 1;
  }

  return output.join('\n');
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
