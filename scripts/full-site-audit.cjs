const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 再帰的に全HTMLファイルを収集
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
console.log(`Found total ${allHtmls.length} HTML files.`);

const issues = [];

// 1. 商標免責の確認（Google LLC の商標表記があるか）
// 2. 内部リンクの到達性確認
// 3. 数値の矛盾チェック（例: 「シルバーは100円で1.5pt」などの誤記載がないか）
// 4. 重複タグや空のリンク

const existingFiles = new Set(allHtmls.map(f => path.normalize(f).toLowerCase()));

allHtmls.forEach(htmlPath => {
  const relPath = path.relative(root, htmlPath).replace(/\\/g, '/');
  const content = fs.readFileSync(htmlPath, 'utf8');

  // 商標免責チェック（フッター等にあるべき）
  if (!content.includes('Google') || (!content.includes('商標') && !content.includes('trademark') && !content.includes('商標') && !content.includes('상표') && !content.includes('Google LLC'))) {
    // 埋め込みや一部を除き警告
    if (!relPath.includes('embed.html')) {
      issues.push({ file: relPath, type: 'DISCLAIMER_MISSING', detail: 'Google商標免責表記が見当たらない' });
    }
  }

  // 誤った還元率の記載パターンを正規表現で検出
  // シルバーで1.5pt、ゴールドで1.75pt、プラチナで2.0pt等の間違い
  if (/シルバー[^\n]{0,30}1\.5\s*pt/i.test(content) || /ゴールド[^\n]{0,30}1\.75\s*pt/i.test(content) || /プラチナ[^\n]{0,30}2\.0\s*pt/i.test(content)) {
    issues.push({ file: relPath, type: 'INCORRECT_RATE', detail: 'シルバー/ゴールド/プラチナの還元率に誤記載の疑い' });
  }

  // 内部リンク到達性
  const hrefMatches = [...content.matchAll(/href=["']([^"']+)["']/gi)];
  hrefMatches.forEach(m => {
    const href = m[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;

    // クエリやハッシュを除去
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
      issues.push({ file: relPath, type: 'BROKEN_INTERNAL_LINK', detail: `壊れた内部リンク: ${href} -> ${cleanHref}` });
    }
  });
});

console.log(`\n=== Total issues detected: ${issues.length} ===`);
if (issues.length > 0) {
  console.log(JSON.stringify(issues.slice(0, 30), null, 2));
} else {
  console.log('No broken links, disclaimer issues, or rate contradictions found!');
}
