const fs = require('fs');
const path = require('path');
const { getLpFooterProfile, renderPageFooter } = require('./site-shell.cjs');

const root = path.resolve(__dirname, '..');
const LEGACY_FOOTER_CLASS_PATTERN = /<footer class="(?:points-cost-footer|maintenance-footer)">[\s\S]*?<\/footer>\s*/g;
const LEGACY_FOOTER_CLASS_TEST = /<footer class="(?:points-cost-footer|maintenance-footer)">/;

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
  if (!LEGACY_FOOTER_CLASS_TEST.test(content)) return content;

  const withoutLegacy = stripLegacyFamilyFooters(content);
  if (withoutLegacy.includes('<footer class="page-footer">')) {
    return withoutLegacy;
  }

  const footerHtml = buildFooterHtml(locKey);
  if (withoutLegacy.includes('</main>')) {
    return withoutLegacy.replace('</main>', `</main>\n${footerHtml}`);
  }
  return withoutLegacy;
}

// 旧フッターの一度限りの移行とは分け、手書き海外LPを共通プロフィールへ継続同期する。
function syncIntlManualLpFooters(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const locale of ['en', 'ko', 'tw']) {
    for (const slug of ['maintenance/diamond', 'maintenance/platinum', 'points-cost']) {
      const file = path.join(rootDir, locale, slug, 'index.html');
      if (!fs.existsSync(file)) continue;
      const before = fs.readFileSync(file, 'utf8');
      const footerPattern = /<footer class="page-footer">[\s\S]*?<\/footer>/g;
      const matches = [...before.matchAll(footerPattern)];
      if (matches.length !== 1) throw new Error(`Expected one managed footer: ${locale}/${slug}`);
      const after = before.replace(footerPattern, () => renderPageFooter(getLpFooterProfile(locale)).trimStart());
      summary.checked += 1;
      if (after === before) continue;
      fs.writeFileSync(file, after, 'utf8');
      summary.changed += 1;
    }
  }
  return summary;
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
          console.log(`Removed legacy duplicate footer in LP: ${rel}`);
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
  LEGACY_FOOTER_CLASS_TEST,
  buildFooterHtml,
  getLocale,
  normalizeLpFooter,
  processDirectory,
  stripLegacyFamilyFooters,
  syncIntlManualLpFooters
};
