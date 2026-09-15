const fs = require('fs');
const path = require('path');
const { getLpFooterProfile, renderPageFooter } = require('./site-shell.cjs');

const root = path.resolve(__dirname, '..');
const LEGACY_FOOTER_CLASS_PATTERN = /<footer class="(?:points-cost-footer|maintenance-footer)">[\s\S]*?<\/footer>\s*/g;

function getLocale(file) {
  if (file.startsWith('en/')) return 'en';
  if (file.startsWith('ko/')) return 'ko';
  if (file.startsWith('tw/')) return 'tw';
  return 'ja';
}

function buildFooterHtml(locKey) {
  return `\n${renderPageFooter(getLpFooterProfile(locKey))}`;
}

function stripLegacyFamilyFooters(content) {
  return content.replace(LEGACY_FOOTER_CLASS_PATTERN, '');
}

function normalizeLpFooter(content, locKey) {
  const withoutLegacy = stripLegacyFamilyFooters(content);
  const footerHtml = buildFooterHtml(locKey);

  if (withoutLegacy.includes('<footer class="page-footer">')) {
    return withoutLegacy.replace(/<footer class="page-footer">[\s\S]*?<\/footer>/, footerHtml.trim());
  }
  if (withoutLegacy.includes('</main>')) {
    return withoutLegacy.replace('</main>', `</main>\n${footerHtml}`);
  }
  return withoutLegacy;
}

function processDirectory(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'games') {
        processDirectory(fullPath);
      }
    } else if (file === 'index.html') {
      const rel = path.relative(root, fullPath).replace(/\\/g, '/');
      if (rel !== 'index.html' && rel !== 'en/index.html' && rel !== 'ko/index.html' && rel !== 'tw/index.html' && !rel.includes('/games/')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const loc = getLocale(rel);
        const normalized = normalizeLpFooter(content, loc);

        if (normalized !== content) {
          fs.writeFileSync(fullPath, normalized, 'utf8');
          console.log(`Updated footer in LP: ${rel}`);
        }
      }
    }
  });
}

if (require.main === module) {
  processDirectory(root);
}

module.exports = {
  LEGACY_FOOTER_CLASS_PATTERN,
  buildFooterHtml,
  getLocale,
  normalizeLpFooter,
  processDirectory,
  stripLegacyFamilyFooters
};
