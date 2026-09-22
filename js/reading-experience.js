/* 記事の表だけを拡張する。表の値や見出し・リンクは変更しない。 */
(function (root) {
  'use strict';
  if (!root?.document) return;
  const doc = root.document;
  const locale = root.location.pathname.match(/^\/(en|ko|tw)\//)?.[1] || 'ja';
  const copy = { ja: ['比較表', '表は横にスクロールできます'], en: ['Comparison table', 'Scroll horizontally to see the full table'], ko: ['비교표', '표를 좌우로 스크롤할 수 있습니다'], tw: ['比較表', '可左右捲動查看完整表格'] }[locale];
  let wrappers = [], observer;
  function refreshTables() {
    // 先に全表を測ってから属性を書き込み、表ごとの再レイアウトを避ける。
    const measurements = wrappers.map(entry => ({ ...entry, overflow: entry.wrapper.scrollWidth > entry.wrapper.clientWidth + 2 }));
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
      if (table.classList.contains('pack-table') && columns > 0 && columns <= 3) table.classList.add('reading-table-compact');
      const hint = doc.createElement('p'); hint.className = 'reading-table-hint'; hint.textContent = copy[1]; hint.hidden = true;
      wrapper.before(hint); wrappers.push({ wrapper, hint });
    });
    refreshTables();
    if (!wrappers.length) return;
    if ('ResizeObserver' in root) { observer = new root.ResizeObserver(refreshTables); wrappers.forEach(({ wrapper }) => observer.observe(wrapper)); }
    else root.addEventListener('resize', refreshTables, { passive: true });
  }
  root.PlayPointReadingExperience = { refreshTables };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
  root.addEventListener('pagehide', () => observer?.disconnect());
  root.addEventListener('pageshow', event => { if (event.persisted) { wrappers.forEach(({wrapper}) => observer?.observe(wrapper)); refreshTables(); } });
})(typeof globalThis === 'object' ? globalThis : this);
