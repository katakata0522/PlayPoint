'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function replaceOnce(relativePath, needle, replacement) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const count = source.split(needle).length - 1;
  if (count !== 1) {
    throw new Error(`${relativePath}: expected exactly one replacement target, found ${count}`);
  }
  fs.writeFileSync(filePath, source.replace(needle, replacement), 'utf8');
}

replaceOnce(
  'amount/10000/index.html',
  '    <link rel="canonical" href="https://playpoint-sim.com/amount/10000/">',
  `    <link rel="canonical" href="https://playpoint-sim.com/amount/10000/">
    <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/amount/10000/">
    <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/amount/10000/">
    <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/amount/10000/">
    <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/amount/10000/">
    <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/en/amount/10000/">`
);

replaceOnce(
  'author/katakata.html',
  '  <link rel="canonical" href="https://playpoint-sim.com/author/katakata.html">',
  `  <link rel="canonical" href="https://playpoint-sim.com/author/katakata.html">
  <link rel="alternate" hreflang="ja" href="https://playpoint-sim.com/author/katakata.html">
  <link rel="alternate" hreflang="en" href="https://playpoint-sim.com/en/author/katakata.html">
  <link rel="alternate" hreflang="ko" href="https://playpoint-sim.com/ko/author/katakata.html">
  <link rel="alternate" hreflang="zh-TW" href="https://playpoint-sim.com/tw/author/katakata.html">
  <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/en/author/katakata.html">`
);

replaceOnce(
  'embed.html',
  '  <link rel="canonical" href="https://playpoint-sim.com/embed.html">',
  `  <link rel="canonical" href="https://playpoint-sim.com/embed.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Playポイント計算機">
  <meta property="og:title" content="Playポイント計算機をブログに設置｜無料埋め込みウィジェットジェネレーター">
  <meta property="og:description" content="Google Play Pointsの簡易計算機ウィジェットを無料でブログや攻略サイトに設置できます。テーマやサイズをリアルタイムにカスタマイズして、コードを1クリックでコピーできます。">
  <meta property="og:url" content="https://playpoint-sim.com/embed.html">
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
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
  </script>`
);

console.log('Applied SEO head audit fixes to 3 files.');
