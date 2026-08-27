'use strict';

const fs = require('node:fs');
const path = require('node:path');

const GUIDE_BRAND = 'Google Play Points 完全攻略ガイド';
const GUIDE_PAGE_TITLE = `${GUIDE_BRAND} | Playポイント計算機`;
const GUIDE_DESCRIPTION = 'Google Play Pointsのランク、使い方、キャンペーン、反映トラブル、ゲーム別攻略を、公式情報と計算例で整理した完全攻略ガイドです。';
const GUIDE_HERO_TEXT = 'ランク攻略・ポイントの使い方・キャンペーン・トラブル解決・ゲーム別課金まで。Google Play Pointsを使いこなすための攻略情報を、公式情報と計算例でまとめています。';

const LEGACY_BLOG_TITLES = Object.freeze([
  'Google Play Points攻略・使い方ブログ | Playポイント計算機',
  'Google Play Points 攻略・使い方記事 | Playポイント計算機'
]);

const LEGACY_BLOG_NAMES = Object.freeze([
  'Google Play Points攻略・使い方ブログ',
  'Google Play Points 攻略・使い方記事',
  'Playポイント攻略'
]);

const LEGACY_BLOG_DESCRIPTIONS = Object.freeze([
  'Play Pointsの反映タイミング、使い道、ランク維持、キャンペーン確認、トラブル対処をまとめたPlayポイント計算機の攻略ブログです。'
]);

const LEGACY_HERO_TEXTS = Object.freeze([
  '反映されない時の確認、100ポイントの目安、ランク維持、キャンペーン条件を、公式情報と計算例をもとに整理しています。'
]);

function replaceKnownValue(text, legacyValues, nextValue) {
  let output = text;
  for (const legacyValue of legacyValues) output = output.replaceAll(legacyValue, nextValue);
  return output;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncBlogIndexBrand(html) {
  let next = html;

  next = replaceKnownValue(next, LEGACY_BLOG_TITLES, GUIDE_PAGE_TITLE);
  next = replaceKnownValue(next, LEGACY_BLOG_DESCRIPTIONS, GUIDE_DESCRIPTION);
  next = replaceKnownValue(next, LEGACY_BLOG_NAMES, GUIDE_BRAND);
  next = replaceKnownValue(next, LEGACY_HERO_TEXTS, GUIDE_HERO_TEXT);

  next = next.replace(
    /(<meta\s+property=["']og:site_name["']\s+content=["'])(?:PlayPoint Lab\.|Playポイント計算機)(["'][^>]*>)/i,
    `$1${GUIDE_BRAND}$2`
  );
  next = next.replace(
    /(<link\s+rel=["']alternate["']\s+type=["']application\/rss\+xml["']\s+title=["'])[^"']*(["'])/i,
    `$1${GUIDE_BRAND} RSS$2`
  );
  next = next.replace(
    /(<link\s+rel=["']alternate["']\s+type=["']application\/atom\+xml["']\s+title=["'])[^"']*(["'])/i,
    `$1${GUIDE_BRAND} Atom$2`
  );

  if (!next.includes(`<title>${GUIDE_PAGE_TITLE}</title>`)) {
    throw new Error('blog/index.html: 完全攻略ガイドのtitleを同期できませんでした');
  }
  if (!next.includes(`<h1 class="hero-title">${GUIDE_BRAND}</h1>`)) {
    throw new Error('blog/index.html: 完全攻略ガイドのH1を同期できませんでした');
  }
  if (!next.includes(`<p class="hero-text">${GUIDE_HERO_TEXT}</p>`)) {
    throw new Error('blog/index.html: 完全攻略ガイドの導入文を同期できませんでした');
  }
  if (!next.includes(`class="brand">${GUIDE_BRAND}</a>`)) {
    throw new Error('blog/index.html: 完全攻略ガイドのヘッダーブランドを同期できませんでした');
  }
  if (!next.includes(`property="og:site_name" content="${GUIDE_BRAND}"`)) {
    throw new Error('blog/index.html: og:site_nameを同期できませんでした');
  }

  return next;
}

function syncArticleHeaderBrand(html, relativePath) {
  const logoPattern = /(<a\b(?=[^>]*\bclass=["'][^"']*\b(?:site-logo|logo)\b[^"']*["'])[^>]*>)[\s\S]*?(<\/a>)/i;
  if (!logoPattern.test(html)) {
    throw new Error(`${relativePath}: 記事ヘッダーのロゴリンクが見つかりません`);
  }
  return html.replace(logoPattern, `$1🎮 ${GUIDE_BRAND}$2`);
}

function syncArticleOgSiteName(html) {
  const existingPattern = /<meta\s+property=["']og:site_name["']\s+content=["'][^"']*["'][^>]*\/?\s*>/i;
  if (existingPattern.test(html)) {
    return html.replace(existingPattern, `<meta property="og:site_name" content="${GUIDE_BRAND}" />`);
  }

  const ogTypePattern = /(<meta\s+property=["']og:type["'][^>]*\/?\s*>)/i;
  if (ogTypePattern.test(html)) {
    return html.replace(ogTypePattern, `$1\n    <meta property="og:site_name" content="${GUIDE_BRAND}" />`);
  }

  const ogTitlePattern = /(<meta\s+property=["']og:title["'][^>]*\/?\s*>)/i;
  if (ogTitlePattern.test(html)) {
    return html.replace(ogTitlePattern, `$1\n    <meta property="og:site_name" content="${GUIDE_BRAND}" />`);
  }

  throw new Error('og:site_nameを挿入するOpen Graph基準タグが見つかりません');
}

function syncArticleBrand(html, relativePath) {
  let next = syncArticleHeaderBrand(html, relativePath);
  next = next.replaceAll('<span class="nav-sub">全攻略ガイド</span>', '<span class="nav-sub">完全攻略ガイド</span>');
  next = syncArticleOgSiteName(next);

  const guidePattern = new RegExp(`<a\\b(?=[^>]*\\bclass=["'][^"']*\\b(?:site-logo|logo)\\b[^"']*["'])[^>]*>🎮\\s*${escapeRegExp(GUIDE_BRAND)}<\\/a>`, 'i');
  if (!guidePattern.test(next)) {
    throw new Error(`${relativePath}: 記事ヘッダーを「${GUIDE_BRAND}」へ同期できませんでした`);
  }
  if (!new RegExp(`property=["']og:site_name["']\\s+content=["']${escapeRegExp(GUIDE_BRAND)}["']`, 'i').test(next)) {
    throw new Error(`${relativePath}: og:site_nameを「${GUIDE_BRAND}」へ同期できませんでした`);
  }

  return next;
}

function japaneseArticleFiles(rootDir) {
  const manifestPath = path.join(rootDir, 'blog', 'articles.json');
  const articles = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return [...new Set(articles
    .map(article => article && article.file)
    .filter(file => typeof file === 'string' && /^\.\.\/articles\/[^/]+\.html$/.test(file))
    .map(file => file.replace(/^\.\.\//, '')))];
}

function syncJapaneseGuideBrand(rootDir) {
  const changedFiles = [];
  const blogIndexPath = path.join(rootDir, 'blog', 'index.html');
  const blogOriginal = fs.readFileSync(blogIndexPath, 'utf8');
  const blogNext = syncBlogIndexBrand(blogOriginal);
  if (blogNext !== blogOriginal) {
    fs.writeFileSync(blogIndexPath, blogNext, 'utf8');
    changedFiles.push('blog/index.html');
  }

  const articleFiles = japaneseArticleFiles(rootDir);
  for (const relativePath of articleFiles) {
    const articlePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(articlePath)) {
      throw new Error(`${relativePath}: 記事台帳にあるHTMLが見つかりません`);
    }
    const original = fs.readFileSync(articlePath, 'utf8');
    const next = syncArticleBrand(original, relativePath);
    if (next === original) continue;
    fs.writeFileSync(articlePath, next, 'utf8');
    changedFiles.push(relativePath);
  }

  return {
    articleCount: articleFiles.length,
    changedFiles
  };
}

if (require.main === module) {
  const result = syncJapaneseGuideBrand(path.join(__dirname, '..'));
  console.log(`[japanese-guide-brand] checked=${result.articleCount} changed=${result.changedFiles.length}`);
}

module.exports = {
  GUIDE_BRAND,
  GUIDE_DESCRIPTION,
  GUIDE_HERO_TEXT,
  GUIDE_PAGE_TITLE,
  japaneseArticleFiles,
  syncArticleBrand,
  syncArticleHeaderBrand,
  syncArticleOgSiteName,
  syncBlogIndexBrand,
  syncJapaneseGuideBrand
};
