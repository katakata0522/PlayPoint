'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function replace(file, before, after) {
  const absolute = path.join(root, file);
  const source = fs.readFileSync(absolute, 'utf8');
  if (!source.includes(before)) throw new Error(file + ': 修正対象が見つかりません');
  fs.writeFileSync(absolute, source.replace(before, after));
}
replace('scripts/game-guide-article-catalog.cjs',
  "  return String(value || '').replaceAll('\\\\', '/').replace(/^\\.\\//, '').replace(/^\\.\\.\\//, '');",
  "  const normalized = String(value || '').replaceAll('\\\\', '/').replace(/^\\.\\//, '').replace(/^\\.\\.\\//, '').replace(/^\\/(?!\\/)/, '');\n  return /^games\\/[a-z0-9-]+\\/[a-z0-9-]+\\/$/.test(normalized) ? normalized + 'index.html' : normalized;");
replace('scripts/game-guide-article-hub-sync.cjs',
  '    node.datePublished = article.date || PUBLISHED_AT;',
  "    node.image ||= new URL(article.thumbnail || '../ogp.png', 'https://playpoint-sim.com/blog/').href;\n    node.datePublished = article.date || PUBLISHED_AT;");
replace('scripts/game-guide-article-hub-sync.cjs',
  `  if (/data-game-guide-article=["']true["']/.test(original)) return false;
  const headMatch = original.match(/<head>[\\s\\S]*?<\\/head>/i);
  if (!headMatch) throw new Error(\`\${relativePath}: head not found\`);
  const head = standardizeHead(headMatch[0], article);`,
  `  const headMatch = original.match(/<head>[\\s\\S]*?<\\/head>/i);
  if (!headMatch) throw new Error(\`\${relativePath}: head not found\`);
  const head = standardizeHead(headMatch[0], article);
  if (/data-game-guide-article=["']true["']/.test(original)) {
    const repaired = original.replace(headMatch[0], () => head);
    if (repaired === original) return false;
    fs.writeFileSync(absolutePath, repaired, 'utf8');
    return true;
  }`);
replace('tests/ci-guardrails.test.cjs',
  '  assert.match(qualityWorkflow, /run: node \\.github\\/scripts\\/preflight\\.cjs\\s*$/m);',
  `  assert.match(qualityWorkflow, /shell: bash/);
  assert.match(qualityWorkflow, /set -euo pipefail/);
  assert.match(qualityWorkflow, /^\\s+node \\.github\\/scripts\\/preflight\\.cjs 2>&1 \\| tee "\\$RUNNER_TEMP\\/playpoint-preflight\\.log"\\s*$/m);
  assert.doesNotMatch(qualityWorkflow, /continue-on-error|\\|\\|\\s*true/);
  assert.match(qualityWorkflow, /if: always\\(\\)/);
  assert.match(qualityWorkflow, /retention-days: 7/);`);
fs.appendFileSync(path.join(root, 'tests/game-guide-article-hub.test.cjs'), `

test('公開URL・正規URL・リポジトリパスを同じ登録ゲーム記事として扱う', () => {
  const { articleForPath } = require('../scripts/game-guide-article-catalog.cjs');
  for (const article of GAME_GUIDE_ARTICLES) {
    const file = repoPath(article);
    for (const candidate of [file, article.file, '/' + file, '/' + file.replace(/index\\.html$/, '')]) {
      assert.equal(isGameGuideArticlePath(candidate), true, candidate);
      assert.equal(articleForPath(candidate)?.id, article.id, candidate);
      assert.equal(classifyArticleRole(candidate), 'game_decision', candidate);
    }
  }
  for (const candidate of ['//games/fgo/pity-cost/', '/games/fgo/../', '/games/fgo/random/', '/games/fgo/pity-cost/?x=1', 'https://evil.example/games/fgo/pity-cost/']) {
    assert.equal(isGameGuideArticlePath(candidate), false, candidate);
  }
});

test('統合済み記事の欠損画像も本文を変えずに修復し再実行で差分を増やさない', () => {
  const os = require('node:os');
  const { transformGameGuide } = require('../scripts/game-guide-article-hub-sync.cjs');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-guide-metadata-'));
  try {
    for (const article of GAME_GUIDE_ARTICLES) {
      const file = repoPath(article);
      const target = path.join(temporary, file);
      const original = read(file).replace(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g, (full, body) => {
        const data = JSON.parse(body);
        if (data['@type'] !== 'Article') return full;
        delete data.image;
        return '<script type="application/ld+json">' + JSON.stringify(data) + '</script>';
      });
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, original);
      assert.equal(transformGameGuide(temporary, article), true);
      const repaired = fs.readFileSync(target, 'utf8');
      const schemas = [...repaired.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)].map(match => JSON.parse(match[1]));
      assert.equal(schemas.find(node => node['@type'] === 'Article').image, 'https://playpoint-sim.com/ogp.png');
      assert.equal(repaired.slice(repaired.indexOf('<body')), original.slice(original.indexOf('<body')), file + ': 本文を保持する');
      assert.equal(transformGameGuide(temporary, article), false, file + ': 冪等性');
      assert.equal(fs.readFileSync(target, 'utf8'), repaired);
    }
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
`);
console.log('構造化画像・URL役割判定・検証の終了コード契約を修正しました。');
