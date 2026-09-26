/* スマホでは既存の入口をメニューへ移す。複製せず、保存状態や操作を引き継ぐ。 */
(function () {
  'use strict';
  const doc = document;
  function init() {
    if (doc.documentElement.lang !== 'ja' || typeof window.HTMLDialogElement?.prototype.showModal !== 'function') return;
    let header = doc.querySelector('.guide-header');
    const home = !header && /^\/(?:index\.html)?$/.test(location.pathname) && doc.querySelector('.calculator-wrapper > .top-bar');
    if (!header && !home) return;
    const el = (tag, className, text) => {
      const node = doc.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node;
    };
    if (home) {
      header = el('header', 'guide-header guide-calculator-header');
      const inner = el('div', 'site-header-inner'), brand = el('a', 'site-logo');
      brand.href = '/'; brand.append(el('span', 'guide-brand-short', 'PlayPoint'));
      brand.firstChild.append(el('span', '', 'ポイント計算機')); inner.append(brand); header.append(inner); doc.body.prepend(header);
    }
    const inner = header.querySelector('.site-header-inner');
    if (!home) {
      const brand = inner.querySelector('.brand,.site-logo'), full = el('span', 'guide-brand-full', brand.textContent), short = el('span', 'guide-brand-short', 'PlayPoint');
      short.append(el('span', '', '記事ガイド')); brand.replaceChildren(full, short);
    }
    const button = (text, id) => {
      const node = el('button', 'guide-nav-button', text); node.type = 'button'; node.setAttribute('aria-controls', id); node.setAttribute('aria-expanded', 'false'); node.setAttribute('aria-haspopup', 'dialog'); return node;
    };
    const menuButton = button('メニュー', 'guide-menu'); menuButton.prepend(el('span', 'guide-menu-icon')); menuButton.firstChild.setAttribute('aria-hidden', 'true'); inner.prepend(menuButton);
    const makeDialog = (id, title, trigger) => {
      const dialog = el('dialog', 'guide-dialog'); dialog.id = id; dialog.setAttribute('aria-labelledby', id + '-title');
      const top = el('div', 'guide-dialog-header'), heading = el('h2', '', title), close = el('button', 'guide-close', '閉じる ×');
      heading.id = id + '-title'; close.type = 'button'; close.autofocus = true; close.setAttribute('aria-label', title + 'を閉じる'); top.append(heading, close); dialog.append(top); doc.body.append(dialog);
      const finish = () => { trigger.setAttribute('aria-expanded', String(dialog.open)); if (!doc.querySelector('.guide-dialog[open]')) doc.documentElement.classList.remove('guide-dialog-open'); };
      const open = () => { if (dialog.open) return; dialog.showModal(); dialog.scrollTop = 0; trigger.setAttribute('aria-expanded', 'true'); doc.documentElement.classList.add('guide-dialog-open'); };
      trigger.addEventListener('click', open); close.addEventListener('click', () => dialog.close()); dialog.addEventListener('close', finish);
      dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
      return { dialog, open };
    };
    const menu = makeDialog('guide-menu', 'メニュー', menuButton), menuBody = el('div', 'guide-menu-body ja-article-sidebar'); menu.dialog.append(menuBody);
    const sidebar = doc.querySelector('aside.ja-article-sidebar');
    const moves = [];
    function moveLater(node, label) {
      if (!node) return;
      const marker = doc.createComment('スマホメニューから戻す位置'); node.before(marker);
      const target = el(label ? 'details' : 'div', label ? 'guide-menu-group' : 'guide-menu-slot');
      if (label) target.append(el('summary', '', label));
      menuBody.append(target);
      moves.push({ node, marker, target });
    }
    moveLater(sidebar?.querySelector('.sidebar-widget--search'));
    moveLater(doc.querySelector('.ja-global-nav'));
    moveLater(sidebar?.querySelector('.sidebar-widget--browse'));
    moveLater(sidebar?.querySelector('.sidebar-widget--games'), 'ゲーム別に探す');
    moveLater(doc.getElementById('reading-library'));
    // 一覧には人気記事を残す。本文では読書を遮らない位置で呼び出す。
    if (sidebar) for (const widget of sidebar.querySelectorAll(':scope > .sidebar-widget')) {
      if (moves.some(item => item.node === widget)) continue;
      if (widget.matches('.sidebar-widget--popular') && doc.body.classList.contains('blog-index-compact')) continue;
      moveLater(widget, widget.querySelector('h2')?.textContent || '関連リンク');
    }
    const settings = header.querySelector('.site-header-links');
    moveLater(settings, '表示・運営者情報');
    if (home) { moveLater(home); const articles = el('a', 'guide-header-articles', '記事一覧'); articles.href = '/blog/'; inner.append(articles); }

    const article = doc.querySelector('article.content, article.main-content-column');
    let toc;
    if (article) {
      const headings = [...article.querySelectorAll('h2[id]')].filter(h => !h.closest('.author-profile-box,.related-links-section,.article-ad-container'));
      if (headings.length) {
        const trigger = button('目次', 'guide-toc'); inner.append(trigger); toc = makeDialog('guide-toc', 'この記事の目次', trigger);
        const nav = el('nav', 'guide-toc-links'); nav.setAttribute('aria-label', 'この記事の目次');
        for (const heading of headings) {
          const a = el('a', '', heading.textContent.trim()); a.href = '#' + heading.id;
          a.addEventListener('click', () => { toc.dialog.close(); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }); nav.append(a);
        }
        toc.dialog.append(nav);
      }
    }
    if (!home && !toc) inner.append(el('span', 'guide-header-spacer'));
    const media = matchMedia('(max-width: 760px)');
    function layout() {
      menu.dialog.close(); toc?.dialog.close();
      for (const { node, marker, target } of moves) { if (media.matches) target.append(node); else marker.after(node); }
      doc.documentElement.classList.add('guide-navigation-ready');
    }
    function libraryFromHash() {
      if (media.matches && location.hash === '#reading-library') { const panel = doc.getElementById('reading-library'); if (panel) { menu.open(); panel.open = true; panel.scrollIntoView({ block: 'start' }); } }
    }
    layout(); media.addEventListener('change', () => { layout(); libraryFromHash(); });
    libraryFromHash(); window.addEventListener('hashchange', libraryFromHash);
    doc.addEventListener('click', event => { if (event.target.closest('a[href="#reading-library"]') && media.matches) { event.preventDefault(); const panel = doc.getElementById('reading-library'); menu.open(); panel.open = true; panel.scrollIntoView({ block: 'start' }); } });
    window.addEventListener('pagehide', () => { menu.dialog.close(); toc?.dialog.close(); });
  }
  // 保存リストなど既存の初期化が終わってから移動する。
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => queueMicrotask(init)); else queueMicrotask(init);
})();
