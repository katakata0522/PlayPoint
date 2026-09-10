'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { GUIDE_BRAND } = require('./japanese-guide-brand.cjs');
const { shouldGenerateGenericCalculatorPrompt } = require('./article-role-registry.cjs');

const HEADER_MARKER = 'article-static-header';
const PROMPT_MARKER = 'article-calculator-prompt';
const EDITORIAL_END_MARKER = '<!-- editorial-summary:end -->';
const GENERATED_PROMPT_ATTRIBUTE = 'data-generated-article-prompt="true"';
const GENERATED_PROMPT_PATTERN = /\s*<aside\b(?=[^>]*\bdata-generated-article-prompt=["']true["'])[^>]*>[\s\S]*?<\/aside>/i;
const LEGACY_GENERATED_PROMPT_PATTERN = /\s*<aside\b[^>]*class=["']article-calculator-prompt cta-box["'][^>]*>[\s\S]*?<\/aside>/i;
const ARTICLE_PROMPT_PATTERN = /<aside\b[^>]*class=["'][^"']*\barticle-calculator-prompt\b[^"']*["'][^>]*>/i;

const HEADER_HTML = `    <header class="header article-static-header">
        <div class="header-inner">
            <a class="logo" href="../index.html">🎮 ${GUIDE_BRAND}</a>
            <nav class="nav" aria-label="記事サイト">
                <a href="../blog/">📝 記事一覧</a>
                <a href="https://katakatalab.com/">🧪 KatakataLab</a>
            </nav>
        </div>
    </header>

`;

const DEFAULT_PROMPT_COPY = Object.freeze({
  aria: 'あなたの場合の必要額を計算',
  label: '記事の条件を自分の数字で確認',
  heading: 'あなたの場合はいくら必要？',
  body: '先に概算を出してから本文を読むと、一般条件と自分の状況を分けて確認できます。',
  cta: '計算機で自分の必要額を見る',
  href: '../'
});

function renderPromptHtml(copy) {
  return `
            <aside class="article-calculator-prompt cta-box" ${GENERATED_PROMPT_ATTRIBUTE} aria-label="${copy.aria}">
                <p class="article-calculator-prompt__label">${copy.label}</p>
                <h2>${copy.heading}</h2>
                <p>${copy.body}</p>
                <a class="article-calculator-prompt__button" href="${copy.href}">${copy.cta}</a>
            </aside>`;
}

const PROMPT_HTML = renderPromptHtml(DEFAULT_PROMPT_COPY);

function japaneseArticleEntries(rootDir) {
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const articles = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const seen = new Set();
  return articles
    .filter(article => article && typeof article.file === 'string' && /^\.\.\/articles\/[^/]+\.html$/.test(article.file))
    .map(article => {
      const relativePath = article.file.replace(/^\.\.\//, '');
      return {
        absolutePath: path.join(rootDir, relativePath),
        relativePath,
        listed: article.listed !== false
      };
    })
    .filter(entry => {
      if (seen.has(entry.relativePath)) return false;
      seen.add(entry.relativePath);
      return true;
    });
}

function japaneseArticlePaths(rootDir) {
  return japaneseArticleEntries(rootDir).map(entry => entry.absolutePath);
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
  return html
    .replace(GENERATED_PROMPT_PATTERN, '')
    .replace(LEGACY_GENERATED_PROMPT_PATTERN, '');
}

function insertStaticPrompt(html, options = {}) {
  const withoutGeneratedPrompt = removeStaticPrompt(html);
  if (ARTICLE_PROMPT_PATTERN.test(withoutGeneratedPrompt)) {
    return withoutGeneratedPrompt;
  }

  if (options.relativePath && !shouldGenerateGenericCalculatorPrompt(options.relativePath, { listed: options.listed !== false })) {
    return withoutGeneratedPrompt;
  }

  const anchorEnd = findPromptAnchorEnd(withoutGeneratedPrompt);
  if (anchorEnd < 0) return html;
  return `${withoutGeneratedPrompt.slice(0, anchorEnd)}${PROMPT_HTML}${withoutGeneratedPrompt.slice(anchorEnd)}`;
}

function normalizeSharedArticleCopy(html) {
  return html
    .replaceAll('不足ポイントとキャンペーン倍率から、目標ランクまでの必要課金額を即シミュレーション！', '不足ポイントとGoogle Playに表示されたキャンペーン特別獲得率から、目標ランクまでの必要課金額をシミュレーションできます。')
    .replaceAll('<span class="sidebar-event-tag">5と0の日</span>\n                        <span><strong>楽天市場 5と0のつく日！</strong> ギフトコード認定店でポイント還元UP</span>', '<span class="sidebar-event-tag">購入前確認</span>\n                        <span><strong>ギフトコードの還元条件を確認</strong> 付与率・上限・エントリー要否は購入時の表示を確認</span>')
    .replaceAll('Playポイントは、ゲーム内アイテムクーポンに交換すると「1pt = 最大2円〜3円相当」の価値になることがあります！', 'Play Pointsの交換先や必要ポイント数は時期・国・アカウントで変わります。「使う」画面に表示された現在の条件を確認してください。');
}

function synchronizeArticleStaticUsability(rootDir) {
  let updated = 0;
  for (const entry of japaneseArticleEntries(rootDir)) {
    if (!fs.existsSync(entry.absolutePath)) {
      throw new Error(`記事一覧にあるHTMLが見つかりません: ${entry.relativePath}`);
    }
    const original = fs.readFileSync(entry.absolutePath, 'utf8');
    const next = normalizeSharedArticleCopy(insertStaticPrompt(insertStaticHeader(original), entry));
    if (next === original) continue;
    fs.writeFileSync(entry.absolutePath, next, 'utf8');
    updated += 1;
  }
  console.log(`[article-static-usability] synchronized: ${updated}`);
  return updated;
}

if (require.main === module) {
  synchronizeArticleStaticUsability(path.join(__dirname, '..'));
}

module.exports = {
  ARTICLE_PROMPT_PATTERN,
  DEFAULT_PROMPT_COPY,
  EDITORIAL_END_MARKER,
  GENERATED_PROMPT_ATTRIBUTE,
  GENERATED_PROMPT_PATTERN,
  HEADER_HTML,
  LEGACY_GENERATED_PROMPT_PATTERN,
  PROMPT_HTML,
  findPromptAnchorEnd,
  insertStaticHeader,
  insertStaticPrompt,
  japaneseArticleEntries,
  japaneseArticlePaths,
  normalizeSharedArticleCopy,
  removeStaticPrompt,
  renderPromptHtml,
  synchronizeArticleStaticUsability
};
