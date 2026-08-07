'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HEADER_MARKER = 'article-static-header';
const PROMPT_MARKER = 'article-calculator-prompt';

const HEADER_HTML = `    <header class="header article-static-header">
        <div class="header-inner">
            <a class="logo" href="../index.html">🎮 Playポイント計算機</a>
            <nav class="nav" aria-label="記事サイト">
                <a href="../blog/">📝 記事一覧</a>
                <a href="https://katakatalab.com/">🧪 KatakataLab</a>
            </nav>
        </div>
    </header>

`;

const PROMPT_HTML = `
            <aside class="article-calculator-prompt cta-box" aria-label="あなたの場合の必要額を計算">
                <p class="article-calculator-prompt__label">記事の条件を自分の数字で確認</p>
                <h2>あなたの場合はいくら必要？</h2>
                <p>先に概算を出してから本文を読むと、一般条件と自分の状況を分けて確認できます。</p>
                <a class="article-calculator-prompt__button" href="../">計算機で自分の必要額を見る</a>
            </aside>`;

function japaneseArticlePaths(rootDir) {
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const articles = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return [...new Set(articles
    .map(article => article && article.file)
    .filter(file => typeof file === 'string' && /^\.\.\/articles\/[^/]+\.html$/.test(file))
    .map(file => path.join(rootDir, file.replace(/^\.\.\//, ''))))];
}

function insertStaticHeader(html) {
  if (html.includes(HEADER_MARKER) || /<header\b/i.test(html)) return html;
  const mainIndex = html.search(/<main\b/i);
  if (mainIndex < 0) return html;
  return `${html.slice(0, mainIndex)}${HEADER_HTML}${html.slice(mainIndex)}`;
}

function findPromptAnchorEnd(html) {
  const articleMatch = /<article\b[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>/i.exec(html);
  if (!articleMatch) return -1;
  const articleStart = articleMatch.index + articleMatch[0].length;
  const sectionPattern = /<section\b[^>]*class=["'][^"']*\b(?:answer-box|summary-box|intro)\b[^"']*["'][^>]*>/gi;
  sectionPattern.lastIndex = articleStart;
  const sectionMatch = sectionPattern.exec(html);
  if (!sectionMatch) return articleStart;
  const sectionEnd = html.indexOf('</section>', sectionMatch.index + sectionMatch[0].length);
  return sectionEnd < 0 ? articleStart : sectionEnd + '</section>'.length;
}

function insertStaticPrompt(html) {
  if (html.includes(PROMPT_MARKER)) return html;
  const anchorEnd = findPromptAnchorEnd(html);
  if (anchorEnd < 0) return html;
  return `${html.slice(0, anchorEnd)}${PROMPT_HTML}${html.slice(anchorEnd)}`;
}

function synchronizeArticleStaticUsability(rootDir) {
  let updated = 0;
  for (const articlePath of japaneseArticlePaths(rootDir)) {
    if (!fs.existsSync(articlePath)) {
      throw new Error(`記事一覧にあるHTMLが見つかりません: ${path.relative(rootDir, articlePath)}`);
    }
    const original = fs.readFileSync(articlePath, 'utf8');
    const next = insertStaticPrompt(insertStaticHeader(original));
    if (next === original) continue;
    fs.writeFileSync(articlePath, next, 'utf8');
    updated += 1;
  }
  console.log(`[article-static-usability] synchronized: ${updated}`);
  return updated;
}

if (require.main === module) {
  synchronizeArticleStaticUsability(path.join(__dirname, '..'));
}

module.exports = {
  HEADER_HTML,
  PROMPT_HTML,
  findPromptAnchorEnd,
  insertStaticHeader,
  insertStaticPrompt,
  japaneseArticlePaths,
  synchronizeArticleStaticUsability
};
