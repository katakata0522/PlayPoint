const fs = require('fs');
const path = require('path');
const { getLpFooterProfile, renderPageFooter } = require('./site-shell.cjs');

const root = path.resolve(__dirname, '..');

function getLocale(file) {
  if (file.startsWith('en/')) return 'en';
  if (file.startsWith('ko/')) return 'ko';
  if (file.startsWith('tw/')) return 'tw';
  return 'ja';
}

function buildFooterHtml(locKey) {
  return `\n${renderPageFooter(getLpFooterProfile(locKey))}`;
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
        let content = fs.readFileSync(fullPath, 'utf8');
        const loc = getLocale(rel);
        const footerHtml = buildFooterHtml(loc);

        if (content.includes('<footer class="page-footer">')) {
          content = content.replace(/<footer class="page-footer">[\s\S]*?<\/footer>/, footerHtml.trim());
        } else if (content.includes('</main>')) {
          content = content.replace('</main>', `</main>\n${footerHtml}`);
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated footer in LP: ${rel}`);
      }
    }
  });
}

processDirectory(root);
