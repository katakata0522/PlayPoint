'use strict';

const fs = require('fs');
const path = require('path');

const FEED_TITLE = 'Google Play Points攻略・使い方ブログ | Playポイント計算機';
const FEED_DESCRIPTION = 'Play Pointsの反映タイミング、使い道、ランク維持、キャンペーン確認、トラブル対処をまとめたPlayポイント計算機の攻略ブログです。';
const SITE_ORIGIN = 'https://playpoint-sim.com';

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toArticleUrl(file) {
  return `${SITE_ORIGIN}/${String(file || '').replace(/^\.\.\//, '')}`;
}

function toRssDate(date) {
  return new Date(`${date}T12:00:00+09:00`).toUTCString();
}

function toAtomDate(date) {
  return `${date}T12:00:00+09:00`;
}

function getArticleUpdatedDate(article) {
  return article.modified || article.date;
}

const TOPIC_CATEGORIES = Object.freeze(['ランク', 'トラブル', '使い方', 'キャンペーン']);
const LATEST_STATIC_ARTICLE_COUNT = 3;

function isListedArticle(article) {
  return article && article.listed !== false;
}

function isJapaneseArticleFile(file) {
  return /^\.\.\/articles\/[^/]+\.html$/.test(String(file || ''));
}

function listedJapaneseArticles(articles) {
  return normalizeFeedArticles(articles).filter(article => isJapaneseArticleFile(article.file));
}

function detectNewline(text) {
  return String(text).includes('\r\n') ? '\r\n' : '\n';
}

function sectionRange(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const end = html.indexOf('</section>', start);
  if (end < 0) return null;
  return { start, end: end + '</section>'.length };
}

function replaceFirstListInRange(html, rangeStart, rangeEnd, items, itemIndent, closeIndent) {
  const ulStart = html.indexOf('<ul>', rangeStart);
  if (ulStart < 0 || ulStart >= rangeEnd) return html;
  const innerStart = ulStart + 4;
  const ulClose = html.indexOf('</ul>', innerStart);
  if (ulClose < 0 || ulClose > rangeEnd) return html;
  const newline = detectNewline(html);
  const inner = items.length === 0
    ? `${newline}${closeIndent}`
    : `${newline}${items.map(item => `${itemIndent}${item}`).join(newline)}${newline}${closeIndent}`;
  return html.slice(0, innerStart) + inner + html.slice(ulClose);
}

function articleListItem(article) {
  return `<li><a href="${escapeHtml(article.file)}">${escapeHtml(article.title)}</a></li>`;
}

function syncBlogStaticArticleIndex(rootDir, articles) {
  const blogIndexPath = path.join(rootDir, 'blog', 'index.html');
  if (!fs.existsSync(blogIndexPath)) {
    return { changed: false, latest: 0, listed: 0 };
  }

  const listed = listedJapaneseArticles(articles);
  for (const article of listed) {
    if (!TOPIC_CATEGORIES.includes(article.category)) {
      throw new Error(`記事台帳のカテゴリが不正です: ${article.file} (${article.category || '未設定'})`);
    }
  }

  const latest = listed.slice(0, LATEST_STATIC_ARTICLE_COUNT);
  const grouped = Object.fromEntries(TOPIC_CATEGORIES.map(category => [category, []]));
  for (const article of listed) grouped[article.category].push(article);

  let html = fs.readFileSync(blogIndexPath, 'utf8');
  const original = html;
  const fallback = sectionRange(html, 'class="static-article-fallback"');
  if (listed.length > 0 && !fallback) {
    throw new Error('blog/index.html に静的新着欄 (static-article-fallback) がありません');
  }
  if (fallback) {
    html = replaceFirstListInRange(
      html,
      fallback.start,
      fallback.end,
      latest.map(articleListItem),
      '                    ',
      '                '
    );
  }

  for (const category of TOPIC_CATEGORIES) {
    const range = sectionRange(html, `data-topic-cluster="${category}"`);
    if (grouped[category].length > 0 && !range) {
      throw new Error(`blog/index.html にカテゴリ「${category}」の静的欄がありません`);
    }
    if (!range) continue;
    html = replaceFirstListInRange(
      html,
      range.start,
      range.end,
      grouped[category].map(articleListItem),
      '                        ',
      '                    '
    );
  }

  if (html !== original) fs.writeFileSync(blogIndexPath, html, 'utf8');
  return {
    changed: html !== original,
    latest: latest.length,
    listed: listed.length
  };
}

function normalizeFeedArticles(articles) {
  return articles
    .filter(article => article && article.file && article.title && article.date && isListedArticle(article))
    .sort((a, b) => String(getArticleUpdatedDate(b)).localeCompare(String(getArticleUpdatedDate(a))));
}

function syncBlogStaticArticleTitles(rootDir, articles) {
  const blogIndexPath = path.join(rootDir, 'blog', 'index.html');
  if (!fs.existsSync(blogIndexPath)) return 0;

  const articleTitles = new Map(
    articles
      .filter(article => article && article.file && article.title)
      .map(article => [String(article.file), String(article.title)])
  );
  let updatedCount = 0;
  const html = fs.readFileSync(blogIndexPath, 'utf8');
  const synchronized = html.replace(
    /<a href="(\.\.\/articles\/[^"]+\.html)">[\s\S]*?<\/a>/g,
    (match, href) => {
      const title = articleTitles.get(href);
      if (!title) return match;
      const replacement = `<a href="${href}">${escapeHtml(title)}</a>`;
      if (replacement !== match) updatedCount += 1;
      return replacement;
    }
  );

  if (synchronized !== html) fs.writeFileSync(blogIndexPath, synchronized, 'utf8');
  return updatedCount;
}

function buildBlogFeeds(articles) {
  const normalizedArticles = normalizeFeedArticles(articles);
  if (normalizedArticles.length === 0) {
    return null;
  }

  const latestDate = getArticleUpdatedDate(normalizedArticles[0]);
  const rssItems = normalizedArticles.map(article => {
    const url = toArticleUrl(article.file);
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${toRssDate(article.date)}</pubDate>
      <description>${escapeXml(article.description || '')}</description>
    </item>`;
  }).join('\n');
  const atomEntries = normalizedArticles.map(article => {
    const url = toArticleUrl(article.file);
    return `  <entry>
    <title>${escapeXml(article.title)}</title>
    <link href="${escapeXml(url)}" rel="alternate" type="text/html" />
    <id>${escapeXml(url)}</id>
    <updated>${toAtomDate(getArticleUpdatedDate(article))}</updated>
    <summary>${escapeXml(article.description || '')}</summary>
  </entry>`;
  }).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_ORIGIN}/blog/</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>ja</language>
    <lastBuildDate>${toRssDate(latestDate)}</lastBuildDate>
    <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>
`;
  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(FEED_TITLE)}</title>
  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>
  <link href="${SITE_ORIGIN}/blog/" rel="alternate" type="text/html" />
  <link href="${SITE_ORIGIN}/atom.xml" rel="self" type="application/atom+xml" />
  <id>${SITE_ORIGIN}/blog/</id>
  <updated>${toAtomDate(latestDate)}</updated>
  <author>
    <name>かたかた</name>
    <uri>${SITE_ORIGIN}/author/katakata.html</uri>
  </author>
${atomEntries}
</feed>
`;

  return {
    articleCount: normalizedArticles.length,
    atom,
    rss
  };
}

function generateBlogFeeds(rootDir) {
  const articlesPath = path.join(rootDir, 'blog/articles.json');
  if (!fs.existsSync(articlesPath)) return;

  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  const feeds = buildBlogFeeds(articles);
  if (!feeds) return;

  fs.writeFileSync(path.join(rootDir, 'feed.xml'), feeds.rss, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'atom.xml'), feeds.atom, 'utf8');
  const indexSync = syncBlogStaticArticleIndex(rootDir, articles);
  const synchronizedTitles = syncBlogStaticArticleTitles(rootDir, articles);
  console.log(`Generated blog feeds (${feeds.articleCount} articles).`);
  console.log(`[blog-index] synchronized static article index: listed=${indexSync.listed} latest=${indexSync.latest} changed=${indexSync.changed}`);
  console.log(`[blog-index] synchronized static article titles: ${synchronizedTitles}`);
}

module.exports = {
  LATEST_STATIC_ARTICLE_COUNT,
  TOPIC_CATEGORIES,
  buildBlogFeeds,
  escapeHtml,
  escapeXml,
  generateBlogFeeds,
  getArticleUpdatedDate,
  isJapaneseArticleFile,
  isListedArticle,
  listedJapaneseArticles,
  normalizeFeedArticles,
  syncBlogStaticArticleIndex,
  syncBlogStaticArticleTitles,
  toArticleUrl,
  toAtomDate,
  toRssDate
};
