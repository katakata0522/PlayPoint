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

function normalizeFeedArticles(articles) {
  return articles
    .filter(article => article && article.file && article.title && article.date)
    .sort((a, b) => String(getArticleUpdatedDate(b)).localeCompare(String(getArticleUpdatedDate(a))));
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

  const feeds = buildBlogFeeds(JSON.parse(fs.readFileSync(articlesPath, 'utf8')));
  if (!feeds) return;

  fs.writeFileSync(path.join(rootDir, 'feed.xml'), feeds.rss, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'atom.xml'), feeds.atom, 'utf8');
  console.log(`Generated blog feeds (${feeds.articleCount} articles).`);
}

module.exports = {
  buildBlogFeeds,
  escapeXml,
  generateBlogFeeds,
  getArticleUpdatedDate,
  normalizeFeedArticles,
  toArticleUrl,
  toAtomDate,
  toRssDate
};
