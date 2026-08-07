'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HEADER_MARKER = 'article-static-header';
const PROMPT_MARKER = 'article-calculator-prompt';
const EDITORIAL_END_MARKER = '<!-- editorial-summary:end -->';
const PROMPT_PATTERN = /\s*<aside\b[^>]*class=["'][^"']*\barticle-calculator-prompt\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/i;

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
  if (html.includes(HEADER_MARKER)) return html;
  const mainIndex = html.search(/<main\b/i);
  if (mainIndex < 0) return html;
  return `${html.slice(0, mainIndex)}${HEADER_HTML}${html.slice(mainIndex)}`;
}

function findSectionEnd(html, pattern, startIndex, articleEnd) {
  pattern.lastIndex = startIndex;
  const sectionMatch = pattern.exec(html);
  if (!sectionMatch || sectionMatch.index >= articleEnd) return -1;
  const sectionEnd = html.indexOf('</section>', sectionMatch.index + sectionMatch[0].length);
  if (sectionEnd < 0 || sectionEnd >= articleEnd) return -1;
  return sectionEnd + '</section>'.length;
}

function findPromptAnchorEnd(html) {
  const articleMatch = /<article\b[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>/i.exec(html);
  if (!articleMatch) return -1;
  const articleStart = articleMatch.index + articleMatch[0].length;
  const articleEnd = html.indexOf('</article>', articleStart);
  const boundedArticleEnd = articleEnd < 0 ? html.length : articleEnd;

  const editorialEnd = html.indexOf(EDITORIAL_END_MARKER, articleStart);
  if (editorialEnd >= articleStart && editorialEnd < boundedArticleEnd) {
    return editorialEnd + EDITORIAL_END_MARKER.length;
  }

  const knowledgeBoundaryEnd = findSectionEnd(
    html,
    /<section\b[^>]*class=["'][^"']*\bknowledge-boundary\b[^"']*["'][^>]*>/gi,
    articleStart,
    boundedArticleEnd
  );
  if (knowledgeBoundaryEnd >= 0) return knowledgeBoundaryEnd;

  const introductorySectionEnd = findSectionEnd(
    html,
    /<section\b[^>]*class=["'][^"']*\b(?:answer-box|summary-box|intro)\b[^"']*["'][^>]*>/gi,
    articleStart,
    boundedArticleEnd
  );
  return introductorySectionEnd >= 0 ? introductorySectionEnd : articleStart;
}

function removeStaticPrompt(html) {
  return html.replace(PROMPT_PATTERN, '');
}

function insertStaticPrompt(html) {
  const withoutPrompt = removeStaticPrompt(html);
  const anchorEnd = findPromptAnchorEnd(withoutPrompt);
  if (anchorEnd < 0) return html;
  return `${withoutPrompt.slice(0, anchorEnd)}${PROMPT_HTML}${withoutPrompt.slice(anchorEnd)}`;
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
  EDITORIAL_END_MARKER,
  HEADER_HTML,
  PROMPT_HTML,
  PROMPT_PATTERN,
  findPromptAnchorEnd,
  insertStaticHeader,
  insertStaticPrompt,
  japaneseArticlePaths,
  removeStaticPrompt,
  synchronizeArticleStaticUsability
};
