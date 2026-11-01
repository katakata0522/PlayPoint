/* stg一覧だけのURL変換。公開側のURL・保存データは書き換えない。 */
(function () {
  'use strict';
  function link(value, config) {
    if (!value || /^(?:#|data:|mailto:|tel:|javascript:)/i.test(value)) return value;
    let url;
    try { url = new URL(value, 'https://playpoint-sim.com/blog/'); } catch (_) { return value; }
    if (!['https://playpoint-sim.com', config.origin].includes(url.origin)) return value;
    const page = url.pathname.match(/^\/blog\/(?:index\.html|page\/(\d+)\/)?$/);
    if (page) {
      url = new URL('/blog/' + url.search + url.hash, config.origin);
      url.searchParams.set('pp_flow', 'normal'); url.searchParams.set('pp_catalog', 'live');
      if (page[1]) url.searchParams.set('page', page[1]);
      return url.href;
    }
    if (config.paths.includes(url.pathname)) return config.origin + url.pathname + url.search + url.hash;
    return 'https://playpoint-sim.com' + url.pathname + url.search + url.hash;
  }
  function image(value, config) {
    if (!value || /^data:/i.test(value)) return value;
    try {
      const url = new URL(value, 'https://playpoint-sim.com/blog/');
      if (!['https://playpoint-sim.com', config.origin].includes(url.origin)) return value;
      const key = config.images[url.pathname.slice(1)];
      return key ? '/cms/index.php?pp_blog_image=' + encodeURIComponent(key) : value;
    } catch (_) { return value; }
  }
  if (typeof module === 'object' && module.exports) module.exports = { link, image };
  if (typeof document === 'undefined') return;
  let config;
  window.PlayPointStagingLink = value => {
    config ||= JSON.parse(document.getElementById('pp-blog-config').textContent);
    return link(value, config);
  };
  window.PlayPointStagingImage = value => {
    config ||= JSON.parse(document.getElementById('pp-blog-config').textContent);
    return image(value, config);
  };
})();
