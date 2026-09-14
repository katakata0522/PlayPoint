'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getGamePageHtmlFiles } = require('./game-page-targets.cjs');
const { articleForPath } = require('./game-guide-article-catalog.cjs');

function read(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function writeIfChanged(rootDir, relativePath, content) {
  const filePath = path.join(rootDir, relativePath);
  const normalized = content.replace(/\r\n/g, '\n');
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (previous === normalized) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

// 各ゲーム固有の補正条件は呼び出し側が持ち、共通処理だけを共有する。
function createRequiredEdits(namespace) {
  const missing = (label, kind) => new Error(`[${namespace}] ${label}: ${kind} was not found`);
  return {
    replaceRequired(source, before, after, label) {
      if (source.includes(after)) return source;
      if (!source.includes(before)) throw missing(label, 'expected source text');
      return source.replace(before, after);
    },
    replaceAllRequired(source, before, after, label) {
      if (!source.includes(before)) {
        if (source.includes(after)) return source;
        throw missing(label, 'expected source text');
      }
      return source.replaceAll(before, after);
    },
    replaceRegexRequired(source, pattern, after, marker, label) {
      if (marker && source.includes(marker)) return source;
      // RegExpインスタンスの直前の利用状態を引き継がない。
      pattern.lastIndex = 0;
      const matches = pattern.test(source);
      pattern.lastIndex = 0;
      if (!matches) throw missing(label, 'expected source pattern');
      return source.replace(pattern, after);
    },
    insertBeforeRequired(source, needle, block, marker, label) {
      if (source.includes(marker)) return source;
      const index = source.indexOf(needle);
      if (index < 0) throw missing(label, 'insertion point');
      return `${source.slice(0, index)}${block}\n\n          ${source.slice(index)}`;
    }
  };
}

// 同じ記事集合を説明文の数だけ再走査しない。置換順と対象地域は保持する。
function replaceDescriptionsAcrossGamePages(rootDir, replacements, { japaneseOnly = true } = {}) {
  const changedFiles = [];
  for (const relativePath of getGamePageHtmlFiles(rootDir)) {
    if (japaneseOnly && !relativePath.startsWith('games/')) continue;
    const filePath = path.join(rootDir, relativePath);
    const previous = fs.readFileSync(filePath, 'utf8');
    let next = previous;
    for (const [before, after] of replacements) next = next.replaceAll(before, after);
    if (next !== previous) {
      fs.writeFileSync(filePath, next, 'utf8');
      changedFiles.push(relativePath);
    }
  }
  return changedFiles;
}

// 同一のタイトル・説明は台帳を共有する。検索結果用の独自説明は明示して保持する。
function requireGuideMetadata(gameId, slug, pageDescription) {
  const article = articleForPath(`games/${gameId}/${slug}/index.html`);
  if (!article) throw new Error(`未登録のゲーム記事です: ${gameId}/${slug}`);
  return { title: article.title, description: pageDescription ?? article.description };
}

function renderGuideShell({ gameId, slug, lead, body, faq = [], pageDescription }, { verifiedAt, badge, verificationPolicy }) {
  const { title, description } = requireGuideMetadata(gameId, slug, pageDescription);
  const canonical = `https://playpoint-sim.com/games/${gameId}/${slug}/`;
  const faqJson = faq.length ? `\n  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } }))
  }, null, 2)}\n  </script>` : '';
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="last-modified" content="${verifiedAt}" />
  <meta name="author" content="かたかた" />
  <link rel="icon" href="../../../favicon.svg" type="image/svg+xml" />
  <title>${title} | Playポイント計算機</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Playポイント計算機" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="../../../articles/article-shared.css?v=1f3377e639" />
  <link rel="stylesheet" href="../../games.css?v=09016b3c58" />
  <script type="application/ld+json">\n${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    dateModified: verifiedAt,
    author: { '@type': 'Person', name: 'かたかた', url: 'https://playpoint-sim.com/author/katakata.html' },
    publisher: { '@type': 'Organization', name: 'Playポイント計算機', url: 'https://playpoint-sim.com/' },
    mainEntityOfPage: canonical
  }, null, 2)}\n  </script>${faqJson}
</head>
<body>
  <header class="site-header"><div class="site-header-inner"><a class="site-logo" href="../../../"><span class="site-logo-icon">🎮</span><span class="site-logo-text">Playポイント計算機</span></a></div></header>
  <nav class="global-nav" aria-label="メインナビゲーション"><div class="global-nav-inner"><a class="nav-item" href="../../../"><span>ホーム</span></a><a class="nav-item active" href="../../"><span>ゲーム別計算</span></a><a class="nav-item" href="../../../blog/"><span>記事一覧</span></a><a class="nav-item" href="../../../author/katakata.html"><span>運営者</span></a></div></nav>
  <div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="../../../">ホーム</a> <span>&gt;</span> <a href="../../">ゲーム別計算</a> <span>&gt;</span> <a href="../">ゲーム本体</a> <span>&gt;</span> <span>${title}</span></nav></div>
  <div class="game-page-container"><main class="game-main-content">
    <header class="game-header"><span class="game-badge">${badge}</span><h1 class="game-title">${title}</h1><p class="game-meta">最終確認：${verifiedAt}</p></header>
    <p>${lead}</p>
    ${body}
    <section class="section"><h2>このページの確認方針</h2><p>${verificationPolicy}</p></section>
  </main></div>
  <footer class="site-footer"><p>© Playポイント計算機 / 非公式の独立した計算・解説サイトです。</p></footer>
</body>
</html>\n`;
}

function createGuideShell(editorialPolicy) {
  return options => renderGuideShell(options, editorialPolicy);
}

module.exports = {
  read, writeIfChanged, createRequiredEdits,
  replaceDescriptionsAcrossGamePages, requireGuideMetadata, createGuideShell
};
