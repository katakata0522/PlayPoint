/* 記事の移動は全画面広告で遮らない。広告のアカウント設定や計算機トップは変更しない。 */
(function () {
  'use strict';
  const doc = document;
  if (doc.documentElement.lang !== 'ja') return;
  // Google公式: https://support.google.com/adsense/answer/17016693
  const protectLinks = node => {
    if (node.nodeType !== 1) return;
    const links = [...node.querySelectorAll('a[href]')];
    if (node.matches('a[href]')) links.unshift(node);
    for (const link of links) {
      try {
        if (new URL(link.getAttribute('href'), doc.baseURI).origin === location.origin) {
          link.setAttribute('data-google-vignette', 'false');
        }
      } catch { /* 解釈できないリンクは既存のまま残す。 */ }
    }
  };
  const init = () => {
    if (!doc.querySelector('.guide-header')) return;
    protectLinks(doc.body);
    // 検索結果・保存記事・履歴は後から作られるため、追加された要素だけを扱う。
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) protectLinks(node);
    }).observe(doc.body, { childList: true, subtree: true });
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();

/* スマホでは既存の入口をメニューへ移す。複製せず、保存状態や操作を引き継ぐ。 */
(function () {
  'use strict';
  const doc = document;
  if (doc.documentElement.lang !== 'ja' || typeof window.HTMLDialogElement?.prototype.showModal !== 'function') return;
  // headで同期実行し、最初の描画からスマホ用の配置を確保する。
  doc.documentElement.classList.add('guide-navigation-enabled');
  function init() {
    const header = doc.querySelector('.guide-header');
    if (!header) return;
    const article = doc.querySelector('article.content, article.main-content-column');
    const compactArticle = Boolean(article);
    if (compactArticle) doc.documentElement.classList.add('guide-article-header');
    const el = (tag, className, text) => {
      const node = doc.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
    };
    const inner = header.querySelector('.site-header-inner');
    if (!inner.querySelector('.guide-brand-short')) {
      const brand = inner.querySelector('.brand,.site-logo'), full = el('span', 'guide-brand-full', brand.textContent), short = el('span', 'guide-brand-short', 'PlayPoint');
      short.append(el('span', '', '記事ガイド')); brand.replaceChildren(full, short);
    }
    const button = (text, id) => {
      const node = el('button', 'guide-nav-button', text); node.type = 'button'; node.setAttribute('aria-controls', id); node.setAttribute('aria-expanded', 'false'); node.setAttribute('aria-haspopup', 'dialog'); return node;
    };
    const menuButton = button('メニュー', 'guide-menu'); menuButton.prepend(el('span', 'guide-menu-icon')); menuButton.firstChild.setAttribute('aria-hidden', 'true');
    if (compactArticle) inner.append(menuButton); else inner.prepend(menuButton);
    const makeDialog = (id, title, trigger) => {
      const dialog = el('dialog', 'guide-dialog'); dialog.id = id; dialog.setAttribute('aria-labelledby', id + '-title');
      const top = el('div', 'guide-dialog-header'), heading = el('h2', '', title), close = el('button', 'guide-close', '閉じる ×');
      heading.id = id + '-title'; close.type = 'button'; close.autofocus = true; close.setAttribute('aria-label', title + 'を閉じる'); top.append(heading, close); dialog.append(top); doc.body.append(dialog);
      const finish = () => { trigger.setAttribute('aria-expanded', String(dialog.open)); if (!doc.querySelector('.guide-dialog[open]')) doc.documentElement.classList.remove('guide-dialog-open'); };
      const open = () => { if (dialog.open) return; dialog.showModal(); dialog.scrollTop = 0; trigger.setAttribute('aria-expanded', 'true'); doc.documentElement.classList.add('guide-dialog-open'); };
      trigger.addEventListener('click', open); close.addEventListener('click', () => dialog.close()); dialog.addEventListener('close', finish);
      dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
      dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dialog.close(); } });
      return { dialog, open };
    };
    const menu = makeDialog('guide-menu', 'メニュー', menuButton), menuBody = el('div', 'guide-menu-body ja-article-sidebar'); menu.dialog.append(menuBody);
    const sidebar = doc.querySelector('aside.ja-article-sidebar');
    const moves = [];
    function moveLater(node, label, sharedTarget) {
      if (!node) return;
      const marker = doc.createComment('スマホメニューから戻す位置'); node.before(marker);
      const target = sharedTarget || el(label ? 'details' : 'div', label ? 'guide-menu-group' : 'guide-menu-slot');
      if (label) target.append(el('summary', '', label));
      if (!sharedTarget) menuBody.append(target);
      moves.push({ node, marker, target });
      return target;
    }
    moveLater(sidebar?.querySelector('.sidebar-widget--search'));
    moveLater(doc.querySelector('.ja-global-nav'));
    moveLater(sidebar?.querySelector('.sidebar-widget--browse'), 'すべてのカテゴリー');
    moveLater(sidebar?.querySelector('.sidebar-widget--games'), 'ゲーム別に探す');
    const libraryInline = doc.body.classList.contains('blog-index-compact');
    if (!libraryInline) moveLater(doc.getElementById('reading-library'));
    // 一覧には人気記事を残す。本文では読書を遮らない位置で呼び出す。
    if (sidebar) for (const widget of sidebar.querySelectorAll(':scope > .sidebar-widget')) {
      if (moves.some(item => item.node === widget)) continue;
      if (widget.matches('.sidebar-widget--author')) continue;
      if (widget.matches('.sidebar-widget--popular') && doc.body.classList.contains('blog-index-compact')) continue;
      moveLater(widget, widget.querySelector('h2')?.textContent || '関連リンク');
    }
    const settings = header.querySelector('.site-header-links');
    const settingsGroup = moveLater(settings, '表示設定・運営者情報');
    moveLater(sidebar?.querySelector('.sidebar-widget--author'), null, settingsGroup);

    if (article) {
      const headings = [...article.querySelectorAll('h2[id]')].filter(h => !h.closest('.author-profile-box,.related-links-section,.article-ad-container,.faq,.contextual-guide-links,.article-calculator-prompt,.article-next-step-cta'));
      if (headings.length) {
          let details = article.querySelector('.reader-toc');
          if (!details) {
            details = el('details', 'inpage-toc reader-toc'); details.append(el('summary', 'inpage-toc-title', '目次を開く'));
            const list = el('ol', ''), nav = el('nav', ''); nav.setAttribute('aria-label', 'この記事の目次');
            for (const heading of headings) {
              const item = el('li', ''), link = el('a', '', heading.textContent.trim()); link.href = '#' + heading.id; item.append(link); list.append(item);
            }
            nav.append(list); details.append(nav);
            const answer = article.querySelector('.answer-box,.editorial-answer');
            if (answer) answer.after(details); else article.prepend(details);
          }
          details.addEventListener('click', event => {
            const link = event.target.closest('a[href^="#"]'), heading = link && doc.getElementById(link.hash.slice(1));
            if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
          });
      }
    }
    let search;
    if (compactArticle) search = articleSearch(inner, button, makeDialog, menu, el);
    else inner.append(el('span', 'guide-header-spacer'));
    const media = matchMedia(compactArticle ? '(max-width: 950px)' : '(max-width: 760px)');
    function layout() {
      menu.dialog.close(); search?.dialog.close();
      for (const { node, marker, target } of moves) { if (media.matches) target.append(node); else marker.after(node); }
      doc.documentElement.classList.add('guide-navigation-ready');
    }
    function libraryFromHash() {
      if (!libraryInline && media.matches && location.hash === '#reading-library') { const panel = doc.getElementById('reading-library'); if (panel) { menu.open(); panel.open = true; panel.scrollIntoView({ block: 'start' }); } }
    }
    layout(); media.addEventListener('change', () => { layout(); libraryFromHash(); });
    // ページ内案内でも、移動した見出しからキーボードで読み進められるようにする。
    doc.querySelector('.reader-guide-order')?.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      const section = link && doc.getElementById(link.hash.slice(1));
      if (section) { section.tabIndex = -1; section.focus({ preventScroll: true }); }
    });
    libraryFromHash(); window.addEventListener('hashchange', libraryFromHash);
    doc.addEventListener('click', event => { if (event.target.closest('a[href="#reading-library"]') && !libraryInline && media.matches) { event.preventDefault(); const panel = doc.getElementById('reading-library'); menu.open(); panel.open = true; panel.scrollIntoView({ block: 'start' }); } });
    window.addEventListener('pagehide', () => { menu.dialog.close(); search?.dialog.close(); });
  }
  // 検索を開いたときだけ、一覧と同じ検索エンジン・本文索引を読み込む。
  function articleSearch(inner, button, makeDialog, menu, el) {
    const trigger = button('', 'guide-search'); trigger.setAttribute('aria-label', '記事を検索');
    trigger.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
    inner.prepend(trigger);
    const search = makeDialog('guide-search', '記事を検索', trigger);
    search.dialog.querySelector('.guide-close').setAttribute('aria-label', '検索を閉じる');
    const body = el('div', 'guide-search-body');
    body.innerHTML = '<form action="/blog/" method="get" role="search"><label for="guide-search-input">キーワード</label><div class="guide-search-line"><input id="guide-search-input" type="search" name="q" placeholder="原神、支払い方法、ポイントなど" autocomplete="off"><button type="submit">検索</button></div></form><p class="guide-search-status" role="status" aria-live="polite"></p><div class="guide-search-results"></div><button type="button" class="guide-search-retry" hidden>もう一度読み込む</button><a class="guide-search-all" href="/blog/">記事一覧で探す →</a>';
    search.dialog.append(body);
    const input = body.querySelector('input'), status = body.querySelector('[role="status"]'), results = body.querySelector('.guide-search-results'), retry = body.querySelector('.guide-search-retry'), all = body.querySelector('.guide-search-all');
    let articles, pending;
    function render() {
      const query = input.value.trim(); results.replaceChildren();
      all.href = '/blog/' + (query ? '?q=' + encodeURIComponent(query) : '');
      if (!articles) return;
      if (!query) { status.textContent = 'ゲーム名や気になる言葉で探せます。'; return; }
      const engine = window.PlayPointSearch;
      const matches = articles.filter(a => engine.matches(a, query, 'ja')).sort((a,b) => engine.score(b, query, 'ja') - engine.score(a, query, 'ja'));
      status.textContent = matches.length ? matches.length + '件の記事が見つかりました' + (matches.length > 20 ? '（上位20件を表示）' : '') : '該当する記事がありません。別の言葉でも試してみてください。';
      for (const article of matches.slice(0,20)) {
        const link = el('a', 'guide-search-result'); link.href = article.path.replace(/index\.html$/, '');
        link.append(el('strong', '', article.title), el('span', '', engine.excerpt(article, query, 'ja').text)); results.append(link);
      }
    }
    function load() {
      if (articles || pending) return;
      retry.hidden = true; status.textContent = '記事を読み込んでいます…';
      pending = Promise.all([
        window.PlayPointSearch ? Promise.resolve() : import('/js/article-search.js'),
        fetch('/blog/article-search-index.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); })
      ]).then(([,index]) => {
        if (!Array.isArray(index.articles) || !window.PlayPointSearch) throw Error('Invalid search index');
        articles = index.articles.filter(a => /^\/(?:articles\/[^/]+\.html|games\/[a-z0-9-]+\/[a-z0-9-]+\/(?:index\.html)?)$/.test(a.path));
        render();
      }).catch(() => { status.textContent = '検索を読み込めませんでした。再読み込みするか、記事一覧から探せます。'; retry.hidden = false; }).finally(() => { pending = null; });
    }
    trigger.addEventListener('click', () => { if (menu.dialog.open) menu.dialog.close(); input.focus(); render(); load(); });
    input.addEventListener('input', render);
    body.querySelector('form').addEventListener('submit', event => { event.preventDefault(); render(); load(); });
    retry.addEventListener('click', load);
    search.dialog.addEventListener('close', () => { if (trigger.getClientRects().length) trigger.focus(); });
    return search;
  }
  // 保存リストなど既存の初期化が終わってから移動する。
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => queueMicrotask(init)); else queueMicrotask(init);
})();
