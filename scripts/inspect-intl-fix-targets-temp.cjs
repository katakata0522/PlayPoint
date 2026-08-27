'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const roots = ['scripts', 'js', 'tw', 'ko', 'en'];
const needles = ['金級', '累積率', '累積條件', 'Google Play 퀘스트가 표시되거나 완료되지 않을 때'];
const matches = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.(?:html|js|cjs|json|xml|md)$/.test(entry.name)) inspect(abs);
  }
}

function inspect(abs) {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const needle of needles) {
      if (line.includes(needle)) matches.push({ path: rel, line: index + 1, needle, text: line.trim() });
    }
  });
}

for (const name of roots) {
  const dir = path.join(root, name);
  if (fs.existsSync(dir)) walk(dir);
}

const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
const japanese = registry.map(article => ({ id: article.id, title: article.title, file: String(article.file || '').replace(/^\.\.\//, '') }));
const report = { generatedAt: new Date().toISOString(), matches, japanese };
fs.mkdirSync(path.join(root, 'audit'), { recursive: true });
fs.writeFileSync(path.join(root, 'audit', 'intl-fix-targets.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ matchCount: matches.length, paths: [...new Set(matches.map(x => x.path))] }, null, 2));
