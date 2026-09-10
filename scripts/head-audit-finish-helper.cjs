'use strict';

const fs = require('node:fs');

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  return source.replace(before, after);
}

const auditPath = 'scripts/seo-head-audit.cjs';
let audit = fs.readFileSync(auditPath, 'utf8');

audit = replaceOnce(
  audit,
  `  const sitemapFiles = sitemapFilesFromRobots(rootDir);\n  const urlSources = new Map();\n\n  for (const sitemapFile of sitemapFiles) {`,
  `  const sitemapFiles = sitemapFilesFromRobots(rootDir);\n  const urlSources = new Map();\n\n  if (sitemapFiles.length === 0) {\n    errors.push(createIssue('submitted-sitemap-missing'));\n  }\n\n  for (const sitemapFile of sitemapFiles) {`,
  'submitted sitemap guard'
);

audit = replaceOnce(
  audit,
  `    for (const url of sitemapUrls(read(sitemapFile, rootDir))) {\n      const sources = urlSources.get(url) || [];\n      sources.push(sitemapFile);\n      urlSources.set(url, sources);\n    }`,
  `    const urls = sitemapUrls(read(sitemapFile, rootDir));\n    if (urls.length === 0) {\n      errors.push(createIssue('submitted-sitemap-empty', { file: sitemapFile }));\n      continue;\n    }\n    for (const url of urls) {\n      const sources = urlSources.get(url) || [];\n      sources.push(sitemapFile);\n      urlSources.set(url, sources);\n    }`,
  'empty sitemap guard'
);

audit = replaceOnce(
  audit,
  `  const alternates = linkTags\n    .filter(attributes => relTokens(attributes.rel).includes('alternate') && attributes.hreflang && attributes.href)\n    .map(attributes => ({ hreflang: attributes.hreflang, href: normalizeText(attributes.href) }));\n  if (alternates.length > 0 && !alternates.some(item => item.href === url)) {`,
  `  const alternates = linkTags\n    .filter(attributes => relTokens(attributes.rel).includes('alternate') && attributes.hreflang && attributes.href)\n    .map(attributes => ({ hreflang: attributes.hreflang, href: normalizeText(attributes.href) }));\n  const hreflangCounts = new Map();\n  for (const alternate of alternates) {\n    hreflangCounts.set(alternate.hreflang, (hreflangCounts.get(alternate.hreflang) || 0) + 1);\n  }\n  for (const [hreflang, count] of hreflangCounts) {\n    if (count > 1) {\n      errors.push(createIssue('hreflang-duplicate', { url, file, detail: hreflang + ': count=' + count }));\n    }\n  }\n  if (alternates.length > 0 && !alternates.some(item => item.href === url)) {`,
  'duplicate hreflang guard'
);

fs.writeFileSync(auditPath, audit, 'utf8');

const embedPath = 'embed.html';
let embed = fs.readFileSync(embedPath, 'utf8');
const canonical = '  <link rel="canonical" href="https://playpoint-sim.com/embed.html">';
const enrichedHead = `  <link rel="canonical" href="https://playpoint-sim.com/embed.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Playポイント計算機">
  <meta property="og:title" content="Playポイント計算機をブログに設置｜無料埋め込みウィジェットジェネレーター">
  <meta property="og:description" content="Google Play Pointsの簡易計算機ウィジェットを無料でブログや攻略サイトに設置できます。テーマやサイズをリアルタイムにカスタマイズして、コードを1クリックでコピーできます。">
  <meta property="og:url" content="https://playpoint-sim.com/embed.html">
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Playポイント計算機をブログに設置｜無料埋め込みウィジェットジェネレーター">
  <meta name="twitter:description" content="Google Play Pointsの簡易計算機ウィジェットを無料でブログや攻略サイトに設置できます。">
  <meta name="twitter:image" content="https://playpoint-sim.com/ogp.png">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Playポイント計算機をブログに設置｜無料埋め込みウィジェットジェネレーター",
    "description": "Google Play Pointsの簡易計算機ウィジェットを無料でブログや攻略サイトに設置し、テーマやサイズを調整して埋め込みコードを作成できるページです。",
    "url": "https://playpoint-sim.com/embed.html",
    "inLanguage": "ja",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Playポイント計算機",
      "url": "https://playpoint-sim.com/"
    }
  }
  </script>`;

if (!embed.includes('property="og:url" content="https://playpoint-sim.com/embed.html"')) {
  embed = replaceOnce(embed, canonical, enrichedHead, 'embed canonical');
}
fs.writeFileSync(embedPath, embed, 'utf8');
