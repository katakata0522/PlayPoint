/* 記事の表だけを拡張する。表の値や見出し・リンクは変更しない。 */
(function (root) {
  'use strict';
  if (!root?.document) return;
  const doc = root.document;
  const locale = root.location.pathname.match(/^\/(en|ko|tw)\//)?.[1] || 'ja';
  const copy = { ja: ['比較表', '表は横にスクロールできます'], en: ['Comparison table', 'Scroll horizontally to see the full table'], ko: ['비교표', '표를 좌우로 스크롤할 수 있습니다'], tw: ['比較表', '可左右捲動查看完整表格'] }[locale];
  let wrappers = [], observer, visibilityObserver;
  const visible = new Set(), groups = new Map();
  function refreshTables() {
    // 画面外のcontent-visibility領域をサイズ取得で強制描画しない。
    // 表示範囲の読み取りをまとめ、表ごとの再レイアウトも避ける。
    const measurements = wrappers.filter(entry => !visibilityObserver || visible.has(entry))
      .map(entry => ({ ...entry, overflow: entry.wrapper.scrollWidth > entry.wrapper.clientWidth + 2 }));
    measurements.forEach(({ wrapper, hint, overflow }) => {
      hint.hidden = !overflow;
      wrapper.classList.toggle('reading-table-overflow', overflow);
      if (overflow) { wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', copy[0] + ' — ' + copy[1]); }
      else { wrapper.removeAttribute('tabindex'); wrapper.removeAttribute('role'); wrapper.removeAttribute('aria-label'); }
    });
  }
  function init() {
    doc.querySelectorAll('article table, .main-content-column table').forEach(table => {
      if (table.closest('[data-reading-table]')) return;
      let wrapper = table.parentElement;
      if (!wrapper.matches('.table-wrap,.table-card,.pack-table-wrap,.table-scroll,.comparison-table-wrap,.intl-table-wrap')) {
        wrapper = doc.createElement('div'); wrapper.className = 'table-wrap'; table.before(wrapper); wrapper.append(table);
      }
      wrapper.setAttribute('data-reading-table', '');
      // 列数だけでなく全行を確認する。colspanのある複雑な表は横スクロールを維持。
      const rows = Array.from(table.rows);
      const columns = Math.max(0, ...rows.map(row => Array.from(row.cells).reduce((n, cell) => n + cell.colSpan, 0)));
      if ((table.classList.contains('pack-table') && columns > 0 && columns <= 3) || (columns === 2 && rows.every(row => Array.from(row.cells).every(cell => cell.colSpan === 1)))) table.classList.add('reading-table-compact');
      const hint = doc.createElement('p'); hint.className = 'reading-table-hint'; hint.textContent = copy[1]; hint.hidden = true;
      wrapper.before(hint); wrappers.push({ wrapper, hint });
    });
    if (!wrappers.length) return;
    if (typeof root.ResizeObserver === 'function') observer = new root.ResizeObserver(refreshTables);
    else root.addEventListener('resize', refreshTables, { passive: true });
    if (typeof root.IntersectionObserver === 'function') {
      // サイズ観測も見える表だけへ限定する。画面の手前で横スクロール操作を準備。
      visibilityObserver = new root.IntersectionObserver(entries => {
        for (const { target, isIntersecting } of entries) for (const entry of groups.get(target)) {
          if (isIntersecting) { visible.add(entry); observer?.observe(entry.wrapper); }
          else { visible.delete(entry); observer?.unobserve(entry.wrapper); }
        }
        refreshTables();
      }, { rootMargin: '300px 0px' });
      for (const entry of wrappers) {
        const target = entry.wrapper.closest('.section, section') || entry.wrapper;
        if (!groups.has(target)) groups.set(target, []);
        groups.get(target).push(entry);
      }
      groups.forEach((_entries, target) => visibilityObserver.observe(target));
    } else { wrappers.forEach(({wrapper}) => observer?.observe(wrapper)); refreshTables(); }
  }
  root.PlayPointReadingExperience = { refreshTables };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  root.addEventListener('pagehide', () => { observer?.disconnect(); visibilityObserver?.disconnect(); visible.clear(); });
  root.addEventListener('pageshow', event => { if (event.persisted) {
    if (visibilityObserver) groups.forEach((_entries, target) => visibilityObserver.observe(target));
    else { wrappers.forEach(({wrapper}) => observer?.observe(wrapper)); refreshTables(); }
  } });
})(typeof globalThis === 'object' ? globalThis : this);
