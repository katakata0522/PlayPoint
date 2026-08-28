'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  extractArticleStructuredData,
  getArticleFiles
} = require('./article-date-contract.cjs');

const rootDir = path.resolve(__dirname, '..');
const registryPath = path.join(rootDir, 'scripts/article-official-verification-dates.json');
const buildPath = path.join(rootDir, 'scripts/build-html.js');

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractExplicitOfficialVerificationDate(html) {
  const patterns = [
    /最終公式確認日：(?<year>\d{4})年(?<month>\d{1,2})月(?<day>\d{1,2})日/,
    /(?:Last official(?: source)? check|Official sources checked):?\s*(?<monthName>[A-Z][a-z]+)\s+(?<day>\d{1,2}),\s+(?<year>\d{4})/,
    /(?:공식 정보 최종 확인|공식 정보 확인|공식 확인일)\s*[:：]?\s*(?<year>\d{4})년\s*(?<month>\d{1,2})월\s*(?<day>\d{1,2})일/,
    /(?:官方資訊最後確認|官方資訊確認|官方確認日)\s*[:：]?\s*(?<year>\d{4})年(?<month>\d{1,2})月(?<day>\d{1,2})日/
  ];
  const months = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
  };

  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (!match?.groups) continue;
    const month = match.groups.monthName ? months[match.groups.monthName] : Number(match.groups.month);
    return isoDate(Number(match.groups.year), month, Number(match.groups.day));
  }
  return null;
}

function buildRegistry() {
  const registry = {};
  let explicitCount = 0;
  let inheritedCount = 0;

  for (const relativePath of getArticleFiles(rootDir)) {
    const html = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
    const article = extractArticleStructuredData(html);
    if (!article?.dateModified) throw new Error(`dateModified がありません: ${relativePath}`);

    const explicit = extractExplicitOfficialVerificationDate(html);
    const modified = String(article.dateModified).slice(0, 10);
    registry[relativePath] = explicit || modified;
    if (explicit) explicitCount += 1;
    else inheritedCount += 1;
  }

  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  console.log(`[one-shot] 公式情報確認日SSOT: ${Object.keys(registry).length}件`);
  console.log(`[one-shot] 既存の明示確認日を継承: ${explicitCount}件`);
  console.log(`[one-shot] 明示日なしの初期値を既存dateModifiedから固定: ${inheritedCount}件`);
}

function patchBuild() {
  let source = fs.readFileSync(buildPath, 'utf8');

  if (!source.includes("require('./article-date-contract.cjs')")) {
    source = source.replace(
      "const { normalizeArticleFiles } = require('./article-seo-normalize.cjs');\n",
      "const { normalizeArticleFiles } = require('./article-seo-normalize.cjs');\nconst { syncArticleDateContract } = require('./article-date-contract.cjs');\n"
    );
  }

  if (!source.includes('[build-html] synchronized article dates:')) {
    const anchor = "const guideBrandSummary = syncJapaneseGuideBrand(rootDir);\nconsole.log(`[build-html] synchronized Japanese complete-guide brand: ${guideBrandSummary.changedFiles.length}/${guideBrandSummary.articleCount + 1} updated`);\n";
    const replacement = `${anchor}\nconst articleDateSummary = syncArticleDateContract(rootDir);\nconsole.log(\`[build-html] synchronized article dates: \${articleDateSummary.changed}/\${articleDateSummary.checked} updated\`);\n`;
    if (!source.includes(anchor)) throw new Error('build-html.js の挿入位置が見つかりません。');
    source = source.replace(anchor, replacement);
  }

  fs.writeFileSync(buildPath, source, 'utf8');
  console.log('[one-shot] build-html.js に記事日付同期を統合');
}

buildRegistry();
patchBuild();
