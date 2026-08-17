const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === '.system_generated' || file === 'test-results') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allHtmls = getAllHtmlFiles(root);
const existingFiles = new Set(allHtmls.map(f => path.normalize(f).toLowerCase()));

const brokenLinks = [];
const rateContradictions = [];

allHtmls.forEach(htmlPath => {
  const relPath = path.relative(root, htmlPath).replace(/\\/g, '/');
  const content = fs.readFileSync(htmlPath, 'utf8');

  // 還元率矛盾
  if (/シルバー[^\n]{0,20}1\.5\s*pt/i.test(content) || /ゴールド[^\n]{0,20}1\.75\s*pt/i.test(content) || /プラチナ[^\n]{0,20}2\.0\s*pt/i.test(content)) {
    rateContradictions.push({ file: relPath });
  }

  // 内部リンク
  const hrefMatches = [...content.matchAll(/href=["']([^"']+)["']/gi)];
  hrefMatches.forEach(m => {
    const href = m[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;

    const cleanHref = href.split('?')[0].split('#')[0];
    if (!cleanHref) return;

    let targetPath;
    if (cleanHref.startsWith('/')) {
      targetPath = path.join(root, cleanHref);
    } else {
      targetPath = path.join(path.dirname(htmlPath), cleanHref);
    }

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }

    const normTarget = path.normalize(targetPath).toLowerCase();
    if (!existingFiles.has(normTarget) && !fs.existsSync(targetPath)) {
      brokenLinks.push({ file: relPath, href, targetPath: path.relative(root, targetPath) });
    }
  });
});

console.log(`Broken links: ${brokenLinks.length}`);
if (brokenLinks.length > 0) {
  console.log('Broken link details:', JSON.stringify(brokenLinks, null, 2));
}

console.log(`Rate contradictions: ${rateContradictions.length}`);
if (rateContradictions.length > 0) {
  console.log('Rate contradiction details:', JSON.stringify(rateContradictions, null, 2));
}
