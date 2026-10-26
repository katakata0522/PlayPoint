/* stgの試験3記事だけに適用するURL接続。保存データは変更しない。 */
(function (root) {
  'use strict';
  function url(value, config) {
    try { return new URL(value, 'https://playpoint-sim.com' + config.path); }
    catch (_) { return null; }
  }
  function local(value) { return value && ['playpoint-sim.com', 'stg.playpoint-sim.com'].includes(value.hostname); }
  function asset(value, config) {
    const target = url(value, config);
    return local(target) && config.assets[target.pathname] || value;
  }
  function link(value, config) {
    if (!value || value[0] === '#') return value;
    const target = url(value, config);
    if (!local(target)) return value;
    // 画像を開くリンクを公開CMSへ戻さず、stgの固定asset入口に保つ。
    if (target.pathname === '/cms/index.php' && target.searchParams.has('pp_batch_asset')) return value;
    if (/^\/blog\/(?:index\.html)?$/.test(target.pathname)) {
      target.hostname = 'stg.playpoint-sim.com';
      target.searchParams.set('pp_flow', 'normal'); target.searchParams.set('pp_catalog', 'live');
      return target.href;
    }
    if (/^\/+$/u.test(target.pathname)) return 'https://stg.playpoint-sim.com/points-cost/?pp_flow=normal';
    if (/^\/points-cost\/(?:index\.html)?$/u.test(target.pathname)) {
      target.hostname = 'stg.playpoint-sim.com'; target.pathname = '/points-cost/';
      target.searchParams.set('pp_flow', 'normal');
      return target.href;
    }
    target.hostname = config.paths.includes(target.pathname) ? 'stg.playpoint-sim.com' : 'playpoint-sim.com';
    return target.href;
  }
  if (typeof module === 'object' && module.exports) module.exports = { asset, link };
  if (!root.document) return;
  const document = root.document;
  const config = JSON.parse(document.getElementById('ppab-config').textContent);
  root.PlayPointArticleBatch = { asset: value => asset(value, config), link: value => link(value, config) };
  function rewrite(parent) {
    for (const node of parent.querySelectorAll('a[href]')) {
      const value = node.getAttribute('href'), next = link(value, config);
      if (value !== next) node.setAttribute('href', next);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    rewrite(document);
    new MutationObserver(changes => {
      for (const change of changes) for (const node of change.addedNodes) if (node.nodeType === 1) {
        if (node.matches('a[href]')) {
          const value = node.getAttribute('href'), next = link(value, config);
          if (value !== next) node.setAttribute('href', next);
        }
        rewrite(node);
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
})(typeof window === 'undefined' ? {} : window);
