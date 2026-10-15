'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { GAME_EVIDENCE } = require('./intl-game-evidence.cjs');
const { regionFlowExample, syncRegionFlows } = require('./region-calculation-flow.cjs');
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
  if (locale === 'ja') html = html.replace(/<nav class="article-toc"([^>]*)><h2([^>]*)>([\s\S]*?)<\/h2>([\s\S]*?)<\/nav>/g,
    '<details class="inpage-toc reader-toc"><summary class="inpage-toc-title"$2>$3</summary><nav class="article-toc"$1>$4</nav></details>');
  if (locale !== 'ja' && /\/articles\/[^/]+\.html$/.test(file)) {
    // 題名に含まれる主題の繰り返しだけを省く。固有の開催時期などは残す。
    const title = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]*>/g, '').toLowerCase();
    html = html.replace(/<span class="hero-badge">([^<]+)<\/span>/g, (tag, label) => title?.includes(label.toLowerCase()) ? '' : tag);
  }
  if (locale !== 'ja' && /\/articles\/[^/]+\.html$/.test(file)) html = compactIntlToc(addPracticalToc(html, file, locale));
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
    if (!html.includes('class="game-directory-notes"')) html = html.replace(/(<p class="game-portal-lead">[\s\S]*?<\/p>)/, '<details class="game-directory-notes"><summary>' + ({ja:'この計算機について',en:'About these calculators',ko:'계산기 이용 안내',tw:'關於這些計算器'})[locale] + '</summary>$1</details>');
    if (!html.includes('data-game-directory-search')) {
      html = html.replace(/(<div class="games-grid">)/, `<div class="game-search" data-game-directory-search><label for="game-search">${copy.search}</label><input id="game-search" type="search" placeholder="${copy.placeholder}" autocomplete="off"><p class="game-search-count" aria-live="polite"></p><button type="button" data-game-search-clear hidden>${copy.clear}</button></div>$1`);
    }
    if (locale !== 'ja') html = html.replace(/(<a class="game-portal-card" href="\/games\/[^"#?]+\/">)(?!<span class="game-edition-badge")/g, '$1<span class="game-edition-badge">' + copy.edition + '</span>');
    html = html.replace(/<a class="game-portal-card" href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g, (card, href) => {
      const id = href.split('/').filter(Boolean).at(-1);
      if (locale !== 'ja' && href.startsWith('/games/')) card = card.replace(/(<div class="game-card-action">)[\s\S]*?(<\/div>)/, '$1' + ({en:'Japan calculator ➔',ko:'일본판 계산기 ➔',tw:'日版計算器 ➔'})[locale] + '$2');
      return card.replace(/(<p class="game-card-desc">)([\s\S]*?)(<\/p>)/, (_match, before, description, after) => {
        let brief = description;
        if (locale === 'ja') brief = description.split('。')[0] + '。';
        else {
          const names = (GAME_EVIDENCE[id]?.offers?.[locale] || []).map(offer => offer.names[locale]).filter(Boolean).join(' / ');
          const reference = href.startsWith('/games/');
          if (reference) return before + description + after;
          brief = {
            en: names ? `Compare ${names}` : '',
            ko: names ? `${names} 비교` : '',
            tw: names ? `比較${names}` : ''
          }[locale].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        }
        return brief ? before + brief + after : '';
      });
    });
    tools = true;
  }
  if (/^(?:en\/|ko\/|tw\/)?games\//.test(file)) html = html.replace(/<span class="site-logo-text">[\s\S]*?<\/span>/, '<span class="site-logo-text">PlayPoint</span>');
  if (html.includes('res-earned-points')) tools = true;
  if (tools && !html.includes('data-site-reader-tools')) html = html.replace('</body>', '<script src="/js/site-reader-tools.js" defer data-site-reader-tools></script>\n</body>');
  if (/^(?:en\/|ko\/|tw\/|hk\/|in\/)?index\.html$/.test(file)) {
    const region = file.split('/')[0];
    if (region !== 'index.html') html = html.replace(/<img\b[^>]*src="[^"<>]*images\/calculation-flow(?:-[a-z]+)?\.svg"[^>]*>/, image => image
      .replace(/images\/calculation-flow(?:-[a-z]+)?\.svg/, `images/calculation-flow-${region}.svg`)
      .replace(/alt="[^"]*"/, `alt="${regionFlowExample(region).description}"`));
    if (!html.includes('calculator-brand')) html = html.replace(/(<h1 id="main-title")/, '<span class="calculator-brand">PlayPoint</span>\n$1');
    // Google公式が案内する通常アンカーの下部限定設定を、操作のある主計算機へ適用する。
    if (!html.includes('name="playpoint:anchor-ads"')) html = html.replace('</head>', '<meta name="playpoint:anchor-ads" content="collapsed-bottom">\n</head>');
  }
  return html.replace(/^[\t ]+(?=\r?$)/gm, '');
}
function syncSiteReaderPolish(root) {
  syncRegionFlows(root);
  const files = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];
  const walk = dir => { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name.endsWith('.html')) files.push(path.relative(root, file).replaceAll('\\', '/')); } };
  for (const dir of ['articles', 'games', 'en/articles', 'ko/articles', 'tw/articles', 'en/games', 'ko/games', 'tw/games']) walk(path.join(root, dir));
  let changed = 0;
  for (const file of files) { const absolute = path.join(root, file), before = fs.readFileSync(absolute, 'utf8'), after = polishPage(before, file); if (before !== after) { fs.writeFileSync(absolute, after); changed++; } }
  return { checked: files.length, changed };
}
// 長い実用記事だけに補う。短い開催ニュースの導入は押し下げない。
const PRACTICAL_TOC_SLUGS = new Set([
  'google-play-points-earn-free', 'google-play-points-install-offer-not-received',
  '2026-06-20-discount-gift-cards', 'google-play-points-balance-history-progress',
  'google-play-points-500-1000-cost', 'google-play-points-discounts-promo-codes',
  'google-play-balance-combine-payment', 'google-play-games-vs-play-points',
  'google-play-points-apps-books-purchases', 'google-play-points-device-change'
]);
function addPracticalToc(html, file, locale) {
  if (!PRACTICAL_TOC_SLUGS.has(path.basename(file, '.html'))) return html;
  html = html.replace(/<details class="intl-article-toc reader-toc">[\s\S]*?<\/details>\n?/, '');
  if (/\b(?:reader-toc|intl-article-toc)\b/.test(html)) return html;
  const match = html.match(/<article\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>/);
  if (!match) return html;
  const end = contentEnd(html, match.index), body = html.slice(match.index, end);
  const headings = [...body.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)]
    .filter(h => !/^(?:related|author|reading|article-next|intl-hub)/.test(h[1]));
  if (headings.length < 5) return html;
  const label = {en:'On this page',ko:'이 글의 목차',tw:'本頁目錄'}[locale];
  const toc = `<details class="intl-article-toc reader-toc"><summary>${label}</summary><nav aria-label="${label}"><ol>${headings.map(h => `<li><a href="#${h[1]}">${h[2].replace(/<[^>]+>/g, '')}</a></li>`).join('')}</ol></nav></details>`;
  const headingStart = body.indexOf(headings[0][0]), prefix = body.slice(0, headingStart);
  const section = prefix.lastIndexOf('<section');
  const first = section > prefix.lastIndexOf('</section>') ? section : headingStart;
  // 最初の本文見出しの直前に置き、冒頭の短い回答を先に読めるようにする。
  return html.slice(0, match.index + first) + toc + '\n' + html.slice(match.index + first);
}
function compactIntlToc(html) {
  // 既に折りたたまれた目次には、開閉をもう一段重ねない。
  const wrapped = /(<details\b[^>]*class="[^"]*\breader-toc--intl\b[^"]*"[^>]*>\s*<summary\b[^>]*>[\s\S]*?<\/summary>\s*)<(nav|details)\b([^>]*class="[^"]*\bintl-article-toc\b[^"]*"[^>]*>)([\s\S]*?)<\/\2>(\s*<\/details>)/;
  if (wrapped.test(html)) return html.replace(wrapped, (whole, outer, tag, attributes, body, end) => {
    if (tag === 'nav') return whole;
    return outer + '<nav' + attributes + body.replace(/<summary>(<h2\b[^>]*>[\s\S]*?<\/h2>)<\/summary>/, '$1') + '</nav>' + end;
  });
  const toc = html.match(/<nav\b[^>]*class="[^"]*\bintl-article-toc\b[^"]*"[^>]*>[\s\S]*?<\/nav>/);
  if (!toc) return html;
  const compact = toc[0].replace(/^<nav/, '<details').replace(/<\/nav>$/, '</details>')
    .replace(/(<h2\b[^>]*>[\s\S]*?<\/h2>)/, '<summary>$1</summary>');
  const before = html.slice(0, toc.index);
  // 長い早見表を通らずに、既存の目次から必要な項目へ進める。
  const answer = before.match(/<(?:section|div)\b[^>]*class="[^"]*\banswer-box\b[^"]*"[^>]*>/);
  if (answer && /<table\b/.test(before.slice(answer.index))) {
    const intro = before.match(/<(?:div|p)\b[^>]*class="[^"]*\bintro\b[^"]*"[^>]*>/);
    const anchor = intro ? intro.index : answer.index;
    return html.slice(0, anchor) + '\n' + compact + html.slice(anchor, toc.index) + html.slice(toc.index + toc[0].length);
  }
  return html.replace(toc[0], compact);
}
module.exports = { COPY, addPracticalToc, compactIntlToc, polishPage, syncSiteReaderPolish };
