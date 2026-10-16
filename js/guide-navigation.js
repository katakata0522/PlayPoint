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

/* 注目記事は期限付きの1件。本文の追従案内はPCの長い記事だけで使う。 */
(function () {
  'use strict';
  function init() {
    const doc = document;
    const locale = ({ja:'ja',en:'en',ko:'ko','zh-TW':'tw'})[doc.documentElement.lang];
    if (!locale) return;
    const pick = doc.querySelector('[data-reader-spotlight]');
    if (pick) {
      const params = new URLSearchParams(location.search);
      const initialFilter = ['q','game','topic','category'].some(key => params.get(key) && params.get(key) !== 'all');
      if (initialFilter) doc.body.classList.add('reader-initial-filter');
      const update = () => { pick.hidden = !(Date.now() < Date.parse(pick.dataset.expires)) || Number(doc.body.dataset.blogPage || 1) > 1; };
      update();
      doc.addEventListener('visibilitychange', update);
      // 開いたまま期限を越えた場合も、古いおすすめを固定し続けない。
      const remaining = Date.parse(pick.dataset.expires) - Date.now();
      if (remaining > 0 && remaining < 2147483647) setTimeout(update, remaining + 1);
    }
    doc.addEventListener('click', event => {
      const link = event.target.closest('[data-reader-popular]');
      const target = link && doc.getElementById('reader-popular');
      if (!target) return;
      event.preventDefault();
      link.closest('details').open = false;
      for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
      const title = target.querySelector('h2');
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
      title.scrollIntoView({ block: 'start' });
    });
    const article = doc.querySelector('article.content, article.main-content-column');
    const sidebar = doc.querySelector('aside.sidebar-column');
    if (!article || !sidebar || sidebar.querySelector('.reader-follow')) return;
    const headings = [...article.querySelectorAll('h2')].filter(h => !h.closest('.related-links-section,.article-related-guides,.contextual-guide-links,.reader-followthrough,.author-profile-box,.faq,aside,.article-next-step-cta'));
    if (headings.length < 3 || article.scrollHeight < innerHeight * 2) return;
    const labels = {ja:['主な見出し','次に読む'],en:['Key sections','Read next'],ko:['주요 내용','다음 글'],tw:['重點章節','接著閱讀']}[locale];
    const nav = doc.createElement('nav'); nav.className = 'reader-follow'; nav.setAttribute('aria-label', labels[0]);
    const title = doc.createElement('p'); title.className = 'reader-follow-title'; title.textContent = labels[0]; nav.append(title);
    const list = doc.createElement('ol');
    for (const [index, heading] of headings.slice(0, 5).entries()) {
      if (!heading.id) {
        let id = 'reader-section-' + (index + 1);
        while (doc.getElementById(id)) id += '-toc';
        heading.id = id;
      }
      const li = doc.createElement('li'), link = doc.createElement('a');
      link.href = '#' + heading.id; link.textContent = heading.textContent.trim(); li.append(link); list.append(li);
    }
    nav.append(list);
    const next = sidebar.querySelector('.sidebar-related-link:not([aria-current])') || sidebar.querySelector('.sidebar-next-link[href]');
    if (next) {
      const link = next.cloneNode(true); link.className = 'reader-follow-next';
      link.textContent = labels[1] + '：' + next.textContent.trim(); nav.append(link);
    }
    sidebar.append(nav); sidebar.classList.add('reader-has-follow');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => queueMicrotask(init), { once:true }); else queueMicrotask(init);
})();

/* スマホでは既存の入口をメニューへ移す。複製せず、保存状態や操作を引き継ぐ。 */
(function () {
  'use strict';
  const doc = document;
  const locale = ({ja:'ja',en:'en',ko:'ko','zh-TW':'tw'})[doc.documentElement.lang];
  if (!locale || typeof window.HTMLDialogElement?.prototype.showModal !== 'function') return;
  const intl = locale !== 'ja';
  // headで同期実行し、最初の描画からスマホ用の配置を確保する。
  if (!intl) doc.documentElement.classList.add('guide-navigation-enabled');
  function init() {
    const header = doc.querySelector('.guide-header');
    if (!header) return;
    const article = doc.querySelector('article.content, article.main-content-column');
    const compactArticle = Boolean(article);
    if (compactArticle && !intl) doc.documentElement.classList.add('guide-article-header');
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
    const menuButton = button('メニュー', 'guide-menu');
    if (!intl) {
      menuButton.prepend(el('span', 'guide-menu-icon')); menuButton.firstChild.setAttribute('aria-hidden', 'true');
      if (compactArticle) inner.append(menuButton); else inner.prepend(menuButton);
    }
    const makeDialog = (id, title, trigger) => {
      const dialog = el('dialog', 'guide-dialog'); dialog.id = id; dialog.setAttribute('aria-labelledby', id + '-title');
      const closeText = {ja:'閉じる',en:'Close',ko:'닫기',tw:'關閉'}[locale];
      const top = el('div', 'guide-dialog-header'), heading = el('h2', '', title), close = el('button', 'guide-close', closeText + ' ×');
      heading.id = id + '-title'; close.type = 'button'; close.autofocus = true; close.setAttribute('aria-label', intl ? closeText : title + 'を閉じる'); top.append(heading, close); dialog.append(top); doc.body.append(dialog);
      const finish = () => { trigger.setAttribute('aria-expanded', String(dialog.open)); if (!doc.querySelector('.guide-dialog[open]')) doc.documentElement.classList.remove('guide-dialog-open'); };
      const open = () => { if (dialog.open) return; dialog.showModal(); dialog.scrollTop = 0; trigger.setAttribute('aria-expanded', 'true'); doc.documentElement.classList.add('guide-dialog-open'); };
      trigger.addEventListener('click', open); close.addEventListener('click', () => dialog.close()); dialog.addEventListener('close', finish);
      dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
      dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dialog.close(); } });
      return { dialog, open };
    };
    if (intl) {
      if (!/^\/(?:en|ko|tw)\/articles\/[^/]+\.html$/.test(location.pathname)) return;
      const search = articleSearch(inner.querySelector('.site-header-tools'), button, makeDialog, null, el, locale);
      const trigger = header.querySelector('[aria-controls="guide-search"]'); trigger.classList.add('intl-search-trigger');
      // 検索の追加で見出しを折り返さないよう、表示設定は既存メニュー内へ移す。
      const theme = header.querySelector('#theme-toggle'), nav = header.querySelector('.intl-mobile-menu nav');
      if (theme && nav) {
        const marker = doc.createComment('表示設定を戻す位置'); theme.before(marker);
        const media = matchMedia('(max-width:760px)');
        const layout = () => { if (media.matches) nav.append(theme); else marker.after(theme); };
        layout(); media.addEventListener('change', layout);
      }
      trigger.addEventListener('click', () => { for (const panel of header.querySelectorAll('details[open]')) panel.open = false; });
      window.addEventListener('pagehide', () => search.dialog.close());
      return;
    }
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
    moveLater(sidebar?.querySelector('.sidebar-widget--popular'), 'よく読まれている記事');
    moveLater(sidebar?.querySelector('.sidebar-widget--browse'), 'すべてのカテゴリー');
    moveLater(sidebar?.querySelector('.sidebar-widget--games'), 'ゲーム別に探す');
    const libraryInline = doc.body.classList.contains('blog-index-compact');
    if (!libraryInline) moveLater(doc.getElementById('reading-library'));
    // 一覧には人気記事を残す。本文では読書を遮らない位置で呼び出す。
    if (sidebar) for (const widget of sidebar.querySelectorAll(':scope > .sidebar-widget')) {
      if (moves.some(item => item.node === widget)) continue;
      if (widget.matches('.sidebar-widget--author')) continue;
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
  function articleSearch(inner, button, makeDialog, menu, el, locale = 'ja') {
    const searchModule = doc.querySelector('script[src*="/js/guide-navigation.js"]')?.dataset.searchModule || '/js/article-search.js';
    const copy = {
      ja: ['記事を検索','キーワード','原神、支払い方法、ポイントなど','検索','もう一度読み込む','記事一覧で探す →','ゲーム名や気になる言葉で探せます。','記事を読み込んでいます…','検索を読み込めませんでした。再読み込みするか、記事一覧から探せます。','該当する記事がありません。別の言葉でも試してみてください。'],
      en: ['Search guides','Keyword','Game, payment method, points…','Search','Try again','Browse all guides →','Search by game or topic.','Loading guides…','Search is unavailable. Try again or browse all guides.','No matching guides. Try another keyword.'],
      ko: ['가이드 검색','키워드','게임, 결제 수단, 포인트…','검색','다시 시도','전체 가이드 보기 →','게임 이름이나 주제로 검색하세요.','가이드를 불러오는 중…','검색을 불러오지 못했습니다. 다시 시도하거나 전체 가이드를 확인하세요.','일치하는 가이드가 없습니다. 다른 키워드로 검색해 보세요.'],
      tw: ['搜尋指南','關鍵字','遊戲、付款方式、點數…','搜尋','重試','瀏覽所有指南 →','依遊戲名稱或主題搜尋。','正在載入指南…','無法載入搜尋，請重試或瀏覽所有指南。','找不到符合的指南，請試試其他關鍵字。']
    }[locale];
    const hub = locale === 'ja' ? '/blog/' : `/${locale}/articles/`;
    const trigger = button('', 'guide-search'); trigger.setAttribute('aria-label', copy[0]);
    trigger.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
    inner.prepend(trigger);
    const search = makeDialog('guide-search', copy[0], trigger);
    if (locale === 'ja') search.dialog.querySelector('.guide-close').setAttribute('aria-label', '検索を閉じる');
    const body = el('div', 'guide-search-body');
    body.innerHTML = `<form action="${hub}" method="get" role="search"><label for="guide-search-input">${copy[1]}</label><div class="guide-search-line"><input id="guide-search-input" type="search" name="q" placeholder="${copy[2]}" autocomplete="off"><button type="submit">${copy[3]}</button></div></form><p class="guide-search-status" role="status" aria-live="polite"></p><div class="guide-search-results"></div><button type="button" class="guide-search-retry" hidden>${copy[4]}</button><a class="guide-search-all" href="${hub}">${copy[5]}</a>`;
    search.dialog.append(body);
    const input = body.querySelector('input'), status = body.querySelector('[role="status"]'), results = body.querySelector('.guide-search-results'), retry = body.querySelector('.guide-search-retry'), all = body.querySelector('.guide-search-all');
    if (locale !== 'ja') {
      body.classList.add('guide-search-body--intl');
      status.after(all);
    }
    let articles, pending;
    function render() {
      const query = input.value.trim(); results.replaceChildren();
      all.href = hub + (query ? '?q=' + encodeURIComponent(query) : '');
      if (locale !== 'ja') all.textContent = query ? ({en:'See all results →',ko:'전체 검색 결과 보기 →',tw:'查看所有搜尋結果 →'})[locale] : copy[5];
      if (!articles) return;
      if (!query) { status.textContent = copy[6]; return; }
      const engine = window.PlayPointSearch;
      const matches = articles.filter(a => engine.matches(a, query, locale)).sort((a,b) => engine.score(b, query, locale) - engine.score(a, query, locale));
      const count = matches.length, limit = count > 20;
      status.textContent = count ? ({ja:`${count}件の記事が見つかりました${limit ? '（上位20件を表示）' : ''}`,en:`${count} guides found${limit ? ' (top 20 shown)' : ''}`,ko:`가이드 ${count}개${limit ? ' (상위 20개 표시)' : ''}`,tw:`找到 ${count} 篇指南${limit ? '（顯示前20篇）' : ''}`})[locale] : copy[9];
      for (const article of matches.slice(0,20)) {
        const link = el('a', 'guide-search-result'); link.href = article.path.replace(/index\.html$/, '');
        link.append(el('strong', '', article.title), el('span', '', engine.excerpt(article, query, locale).text)); results.append(link);
      }
    }
    function load() {
      if (articles || pending) return;
      retry.hidden = true; status.textContent = copy[7];
      pending = Promise.all([
        window.PlayPointSearch ? Promise.resolve() : import(searchModule),
        fetch(hub + 'article-search-index.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); })
      ]).then(([,index]) => {
        if (!Array.isArray(index.articles) || !window.PlayPointSearch) throw Error('Invalid search index');
        articles = index.articles.filter(a => locale === 'ja' ? /^\/(?:articles\/[^/]+\.html|games\/[a-z0-9-]+\/[a-z0-9-]+\/(?:index\.html)?)$/.test(a.path) : a.path.startsWith(hub) && a.path.endsWith('.html'));
        render();
      }).catch(() => { status.textContent = copy[8]; retry.hidden = false; }).finally(() => { pending = null; });
    }
    trigger.addEventListener('click', () => { if (menu?.dialog.open) menu.dialog.close(); input.focus(); render(); load(); });
    input.addEventListener('input', render);
    body.querySelector('form').addEventListener('submit', event => { event.preventDefault(); render(); load(); });
    retry.addEventListener('click', load);
    search.dialog.addEventListener('close', () => { if (trigger.getClientRects().length) trigger.focus(); });
    return search;
  }
  // 保存リストなど既存の初期化が終わってから移動する。
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => queueMicrotask(init)); else queueMicrotask(init);
})();
