'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { GAME_EVIDENCE } = require('./intl-game-evidence.cjs');
const COPY = {
  ja: { search: 'ゲーム名で探す', placeholder: '例：ポケポケ、原神、FGO', result: '件のゲーム', clear: '検索をクリア', edition: '日本版の参考ページ', sources: '出典と確認情報', browse: '記事を探す・人気記事', rank: '0ptからの参考ランクを見る' },
  en: { search: 'Find your game', placeholder: 'e.g. Pocket, Genshin, FGO', result: 'games shown', clear: 'Clear search', edition: 'Japan-edition reference', sources: 'Sources and verification', browse: 'Browse and popular guides', rank: 'View level progress from zero points' },
  ko: { search: '게임 이름으로 찾기', placeholder: '예: Pocket, 원신, FGO', result: '개 게임 표시', clear: '검색 지우기', edition: '일본판 참고 페이지', sources: '출처와 확인 정보', browse: '가이드 찾기·인기 글', rank: '0포인트 기준 참고 등급 보기' },
  tw: { search: '依遊戲名稱尋找', placeholder: '例如 Pocket、原神、FGO', result: '款遊戲', clear: '清除搜尋', edition: '日版參考頁面', sources: '出處與確認資訊', browse: '尋找指南與熱門文章', rank: '查看從零點數開始的參考等級' }
};
function contentEnd(html, index) {
  const tokens = /<\/?article\b[^>]*>/gi;
  tokens.lastIndex = index;
  let depth = 0;
  for (let token; (token = tokens.exec(html));) {
    depth += /^<\/article/i.test(token[0]) ? -1 : 1;
    if (depth === 0) return tokens.lastIndex;
  }
  throw new Error('記事の閉じタグがありません');
}
function polishPage(html, file) {
  const locale = file.startsWith('en/') ? 'en' : file.startsWith('ko/') ? 'ko' : file.startsWith('tw/') ? 'tw' : 'ja';
  const copy = COPY[locale];
  const article = html.match(/<article\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>/i);
  if (article && !/<main\b|\brole="main"/i.test(html)) {
    const end = contentEnd(html, article.index);
    const inner = html.slice(article.index, end).replace(/class="content main-content-column"/, 'class="content"');
    html = html.slice(0, article.index) + '<main id="main-content" class="main-content-column">' + inner + '</main>' + html.slice(end);
    if (!/class="[^"]*skip-link/.test(html)) html = html.replace(/(<body\b[^>]*>)/, '$1\n<a class="skip-link" href="#main-content">本文へ移動</a>');
  }
  if (!html.includes('source-list-toggle')) html = html.replace(/(<section\b[^>]*class="[^"]*\bsource-list\b[^"]*"[^>]*>[\s\S]*?<\/section>)/, `<details class="source-list-toggle"><summary>${copy.sources}</summary>$1</details>`);
  let tools = false;
  if (html.includes('intl-article-sidebar') && !html.includes('sidebar-discovery')) {
    const blocks = [];
    html = html.replace(/<section\b[^>]*class="sidebar-widget sidebar-widget--(?:search|browse|popular)"[^>]*>[\s\S]*?<\/section>/g, block => { blocks.push(block); return ''; });
    if (blocks.length) html = html.replace(/(<aside\b[^>]*class="[^"]*intl-article-sidebar[^"]*"[^>]*>[\s\S]*?)(<\/aside>)/, '$1' + `<details class="sidebar-discovery" open data-mobile-discovery><summary>${copy.browse}</summary>${blocks.join('\n')}</details>` + '$2');
    tools = true;
  }
  if (/^(?:en\/|ko\/|tw\/)?games\/index\.html$/.test(file)) {
    if (!html.includes('data-game-directory-search')) {
      html = html.replace(/(<div class="games-grid">)/, `<div class="game-search" data-game-directory-search><label for="game-search">${copy.search}</label><input id="game-search" type="search" placeholder="${copy.placeholder}" autocomplete="off"><p class="game-search-count" aria-live="polite"></p><button type="button" data-game-search-clear hidden>${copy.clear}</button></div>$1`);
    }
    if (locale !== 'ja') html = html.replace(/(<a class="game-portal-card" href="\/games\/[^"#?]+\/">)(?!<span class="game-edition-badge")/g, '$1<span class="game-edition-badge">' + copy.edition + '</span>');
    html = html.replace(/<a class="game-portal-card" href="([^"]+)">[\s\S]*?<\/a>/g, (card, href) => {
      const id = href.split('/').filter(Boolean).at(-1);
      return card.replace(/(<p class="game-card-desc">)([\s\S]*?)(<\/p>)/, (_match, before, description, after) => {
        let brief = description;
        if (locale === 'ja') brief = description.split('。')[0] + '。';
        else {
          const names = (GAME_EVIDENCE[id]?.offers?.[locale] || []).map(offer => offer.names[locale]).filter(Boolean).join(' / ');
          const reference = href.startsWith('/games/');
          brief = {
            en: reference ? 'Japanese products and prices for reference.' : names ? `Compare ${names}, then calculate points from your Android purchase amount.` : 'Calculate points from your Android purchase amount.',
            ko: reference ? '일본판 상품·가격을 참고하는 페이지입니다.' : names ? `${names} 비교 후 Android 구매 금액으로 포인트를 계산합니다.` : 'Android 구매 금액으로 포인트를 계산합니다.',
            tw: reference ? '日本版商品與價格的參考頁面。' : names ? `比較${names}，再依Android購買金額計算點數。` : '依Android購買金額計算點數。'
          }[locale].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        }
        return before + brief + after;
      });
    });
    tools = true;
  }
  if (/^(?:en\/|ko\/|tw\/)?games\//.test(file)) html = html.replace(/(<span class="site-logo-text">)(?!PlayPoint)/, '$1PlayPoint · ');
  if (html.includes('res-earned-points')) tools = true;
  if (tools && !html.includes('data-site-reader-tools')) html = html.replace('</body>', '<script src="/js/site-reader-tools.js" defer data-site-reader-tools></script>\n</body>');
  if (/^(?:en\/|ko\/|tw\/|hk\/|in\/)?index\.html$/.test(file)) {
    if (!html.includes('calculator-brand')) html = html.replace(/(<h1 id="main-title")/, '<span class="calculator-brand">PlayPoint</span>\n$1');
    // Google公式が案内する通常アンカーの下部限定設定を、操作のある主計算機へ適用する。
    if (!html.includes('name="playpoint:anchor-ads"')) html = html.replace('</head>', '<meta name="playpoint:anchor-ads" content="collapsed-bottom">\n</head>');
  }
  return html.replace(/^[\t ]+(?=\r?$)/gm, '');
}
function syncSiteReaderPolish(root) {
  const files = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];
  const walk = dir => { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name.endsWith('.html')) files.push(path.relative(root, file).replaceAll('\\', '/')); } };
  for (const dir of ['articles', 'games', 'en/articles', 'ko/articles', 'tw/articles', 'en/games', 'ko/games', 'tw/games']) walk(path.join(root, dir));
  let changed = 0;
  for (const file of files) { const absolute = path.join(root, file), before = fs.readFileSync(absolute, 'utf8'), after = polishPage(before, file); if (before !== after) { fs.writeFileSync(absolute, after); changed++; } }
  return { checked: files.length, changed };
}
module.exports = { COPY, polishPage, syncSiteReaderPolish };
