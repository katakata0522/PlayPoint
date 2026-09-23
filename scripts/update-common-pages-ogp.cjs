'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const COMMON_PAGES = [
  {
    file: 'index.html',
    title: 'Google Play Points 計算機',
    alt: 'Google Play Points 計算機 OGP画像'
  },
  {
    file: 'about-playpoints.html',
    title: 'Google Play Pointsの仕組みとルール',
    alt: 'Google Play Pointsの仕組みとルール OGP画像'
  },
  {
    file: 'attention.html',
    title: '利用上の注意点・免責事項',
    alt: '利用上の注意点・免責事項 OGP画像'
  },
  {
    file: 'changelog.html',
    title: '更新履歴・改訂情報',
    alt: 'Google Play Points 計算機 更新履歴 OGP画像'
  },
  {
    file: 'embed.html',
    title: '計算機埋め込みウィジェット',
    alt: 'Google Play Points 計算機 埋め込みウィジェット OGP画像'
  },
  {
    file: 'info.html',
    title: 'サイト情報・運営者案内',
    alt: 'Google Play Points 計算機 サイト情報 OGP画像'
  },
  {
    file: 'privacy.html',
    title: 'プライバシーポリシー',
    alt: 'Google Play Points 計算機 プライバシーポリシー OGP画像'
  },
  {
    file: 'terms.html',
    title: '利用規約',
    alt: 'Google Play Points 計算機 利用規約 OGP画像'
  },
  {
    file: 'sitemap.html',
    title: 'サイトマップ・全ページ一覧',
    alt: 'Google Play Points 計算機 サイトマップ OGP画像'
  },
  {
    file: 'author/katakata.html',
    title: '監修者・運営者 かたかた プロフィール',
    alt: 'かたかた プロフィール OGP画像'
  },
  {
    file: 'blog/index.html',
    title: 'Google Play Points ガイド・攻略記事一覧',
    alt: 'Google Play Points ガイド・攻略記事一覧 OGP画像'
  }
];

const ogUrl = 'https://playpoint-sim.com/ogp.png';

for (const entry of COMMON_PAGES) {
  const filePath = path.join(root, entry.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${entry.file}`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // og:image
  if (/<meta property=["']og:image["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:image["'] content=["'][^"']+["']\s*\/?>/i, `<meta property="og:image" content="${ogUrl}">`);
  } else {
    html = html.replace(/(<head\b[^>]*>)/i, `$1\n    <meta property="og:image" content="${ogUrl}">`);
  }

  // og:image:width
  if (/<meta property=["']og:image:width["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:image:width["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:width" content="1200">');
  } else {
    html = html.replace(/(<meta property=["']og:image["'][^>]*>)/i, '$1\n    <meta property="og:image:width" content="1200">');
  }

  // og:image:height
  if (/<meta property=["']og:image:height["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:image:height["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:height" content="630">');
  } else {
    html = html.replace(/(<meta property=["']og:image:width["'][^>]*>)/i, '$1\n    <meta property="og:image:height" content="630">');
  }

  // og:image:alt
  if (/<meta property=["']og:image:alt["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:image:alt["'] content=["'][^"']+["']\s*\/?>/i, `<meta property="og:image:alt" content="${entry.alt}">`);
  } else {
    html = html.replace(/(<meta property=["']og:image:height["'][^>]*>)/i, `$1\n    <meta property="og:image:alt" content="${entry.alt}">`);
  }

  // og:image:type
  if (/<meta property=["']og:image:type["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:image:type["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:image:type" content="image/png">');
  } else {
    html = html.replace(/(<meta property=["']og:image:alt["'][^>]*>)/i, '$1\n    <meta property="og:image:type" content="image/png">');
  }

  // og:locale
  if (/<meta property=["']og:locale["']/i.test(html)) {
    html = html.replace(/<meta property=["']og:locale["'] content=["'][^"']+["']\s*\/?>/i, '<meta property="og:locale" content="ja_JP">');
  } else {
    html = html.replace(/(<meta property=["']og:image:type["'][^>]*>)/i, '$1\n    <meta property="og:locale" content="ja_JP">');
  }

  // twitter:card
  if (!/<meta name=["']twitter:card["']/i.test(html)) {
    html = html.replace(/(<meta property=["']og:locale["'][^>]*>)/i, '$1\n    <meta name="twitter:card" content="summary_large_image">');
  }

  // twitter:image
  if (/<meta name=["']twitter:image["']/i.test(html)) {
    html = html.replace(/<meta name=["']twitter:image["'] content=["'][^"']+["']\s*\/?>/i, `<meta name="twitter:image" content="${ogUrl}">`);
  } else {
    html = html.replace(/(<meta name=["']twitter:card["'][^>]*>)/i, `$1\n    <meta name="twitter:image" content="${ogUrl}">`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Updated common page OGP: ${entry.file}`);
}

console.log('Common pages OGP meta tags updated successfully.');
