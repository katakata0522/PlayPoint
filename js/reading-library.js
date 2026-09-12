(function (root) {
  'use strict';
  const KEY = 'playpoint_reading_library_v1';
  function safePath(value) { return typeof value === 'string' && /^\/(?:en\/|ko\/|tw\/)?articles\/[a-z0-9-]+\.html$/.test(value) && !value.endsWith('/index.html'); }
  function cleanItems(items, limit) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter(item => item && safePath(item.path) && typeof item.title === 'string' && !seen.has(item.path) && seen.add(item.path))
      .slice(0, limit).map(item => ({ path: item.path, title: item.title.slice(0, 240) }));
  }
  function makeStore(storage) {
    function read() {
      const raw = JSON.parse(storage.getItem(KEY) || '{}');
      return { saved: cleanItems(raw?.saved, 100), recent: cleanItems(raw?.recent, 20), historyEnabled: raw?.historyEnabled !== false };
    }
    function change(callback) { const state = read(); callback(state); storage.setItem(KEY, JSON.stringify(state)); return state; }
    return {
      read,
      toggle(item) { if (!safePath(item.path)) throw Error('Invalid article'); return change(s => {
        if (s.saved.some(x => x.path === item.path)) s.saved = s.saved.filter(x => x.path !== item.path);
        else { if (s.saved.length >= 100) throw Object.assign(Error('Saved list full'), { code: 'saved_limit' }); s.saved = cleanItems([item, ...s.saved], 100); }
      }); },
      visit(item) { if (!safePath(item.path)) return read(); return change(s => { if (s.historyEnabled) s.recent = cleanItems([item, ...s.recent.filter(x => x.path !== item.path)], 20); }); },
      clear(type) { if (!['saved', 'recent'].includes(type)) throw Error('Invalid list'); return change(s => { s[type] = []; }); },
      remove(type, articlePath) { if (!['saved', 'recent'].includes(type)) throw Error('Invalid list'); return change(s => { s[type] = s[type].filter(x => x.path !== articlePath); }); },
      history(enabled) { return change(s => { s.historyEnabled = Boolean(enabled); if (!enabled) s.recent = []; }); }
    };
  }
  const COPY = {
    ja: ['あとで読む', '保存済み', '保存した記事・閲覧履歴', 'あとで読む', '最近読んだ記事', 'この記事をリストから削除', 'すべて削除', 'まだ記事はありません。', 'この端末だけに保存します（保存100件・履歴20件まで）。ブラウザのデータ削除で消えます。', '閲覧履歴を残す', '保存領域を利用できません。ブラウザの設定をご確認ください。', '保存しました。', '保存を解除しました。'],
    en: ['Read later', 'Saved', 'Saved articles & reading history', 'Read later', 'Recently read', 'Remove this article', 'Clear list', 'No articles yet.', 'Stored only on this device: up to 100 saved articles and 20 recent articles. Clearing browser data removes these lists.', 'Keep reading history', 'Storage is unavailable. Check your browser settings.', 'Article saved.', 'Article removed from saved.'],
    ko: ['나중에 읽기', '저장됨', '저장한 글·최근 읽은 글', '나중에 읽기', '최근 읽은 글', '목록에서 삭제', '목록 비우기', '아직 글이 없습니다.', '이 기기에만 저장됩니다. 저장한 글은 최대 100개, 최근 읽은 글은 20개까지이며 브라우저 데이터를 삭제하면 사라집니다.', '읽은 글 기록하기', '저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인해 주세요.', '글을 저장했습니다.', '저장을 해제했습니다.'],
    tw: ['稍後閱讀', '已儲存', '已儲存文章與閱讀紀錄', '稍後閱讀', '最近閱讀', '從清單移除', '清空清單', '目前沒有文章。', '只儲存在此裝置：最多 100 篇收藏、20 篇閱讀紀錄。清除瀏覽器資料後，清單也會刪除。', '保留閱讀紀錄', '無法使用儲存空間，請檢查瀏覽器設定。', '已儲存文章。', '已取消儲存。']
  };
  const api = { KEY, safePath, cleanItems, makeStore };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root?.document) return;
  root.PlayPointReading = api;
  function init() {
    const document = root.document, pathname = root.location.pathname;
    const locale = pathname.match(/^\/(en|ko|tw)\//)?.[1] || 'ja', copy = COPY[locale];
    const hub = locale === 'ja' ? '/blog/' : `/${locale}/articles/`;
    const isHub = pathname === hub || pathname === hub + 'index.html';
    const article = document.querySelector('article.content, article'), h1 = document.querySelector('main h1, h1');
    if (!isHub && (!safePath(pathname) || !h1)) return;
    let store; try { store = makeStore(root.localStorage); store.read(); } catch { store = null; }
    const element = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
    const status = element('span'); status.setAttribute('role', 'status');
    function attempt(action) { try { if (!store) throw Error('No storage'); action(); } catch (error) { status.textContent = error.code === 'saved_limit' ? { ja: '保存は100件までです。不要な記事を削除してから保存してください。', en: 'You can save up to 100 articles. Remove one before saving another.', ko: '최대 100개까지 저장할 수 있습니다. 기존 글을 삭제한 뒤 저장해 주세요.', tw: '最多可儲存100篇，請先移除不需要的文章再儲存。' }[locale] : copy[10]; } }
    let button, current;
    if (!isHub) {
      current = { path: pathname, title: h1.textContent.trim() };
      const tools = element('div'); tools.className = 'reading-tools';
      button = element('button', copy[0]); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
      function updateButton() { const saved = store.read().saved.some(item => item.path === pathname); button.textContent = copy[saved ? 1 : 0]; button.setAttribute('aria-pressed', String(saved)); }
      button.addEventListener('click', () => attempt(() => { store.toggle(current); updateButton(); status.textContent = copy[button.getAttribute('aria-pressed') === 'true' ? 11 : 12]; }));
      const link = element('a', copy[2]); link.href = hub + '#reading-library';
      tools.append(button, link, status);
      const header = h1.closest('header'); (header && !header.classList.contains('site-header') ? header : h1).after(tools);
      attempt(() => { store.visit(current); updateButton(); });
      root.addEventListener('storage', event => { if (event.key === KEY || event.key === null) attempt(updateButton); });
      return;
    }
    const panel = element('details'); panel.id = 'reading-library'; panel.className = 'reading-library';
    panel.append(element('summary', copy[2]), element('p', copy[8]));
    const controls = element('div'); panel.append(controls, status);
    const mount = document.querySelector('[data-intl-guide-controls], #article-grid, #articles-grid, #blog-grid, .articles-grid');
    if (mount) mount.before(panel); else (document.querySelector('main') || document.body).append(panel);
    function render() {
      controls.replaceChildren(); const state = store.read();
      const label = element('label'), checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = state.historyEnabled;
      checkbox.addEventListener('change', () => attempt(() => { store.history(checkbox.checked); render(); }));
      label.append(checkbox, document.createTextNode(' ' + copy[9])); controls.append(label);
      ['saved', 'recent'].forEach((type, index) => {
        controls.append(element('h3', copy[3 + index])); const list = element('ul');
        if (!state[type].length) controls.append(element('p', copy[7]));
        for (const item of state[type]) {
          const row = element('li'), link = element('a', item.title); link.href = item.path;
          const remove = element('button', copy[5]); remove.type = 'button'; remove.setAttribute('aria-label', copy[5] + ': ' + item.title);
          remove.addEventListener('click', () => attempt(() => { store.remove(type, item.path); render(); })); row.append(link, remove); list.append(row);
        }
        controls.append(list);
        if (state[type].length) { const clear = element('button', copy[6]); clear.type = 'button'; clear.addEventListener('click', () => attempt(() => { store.clear(type); render(); })); controls.append(clear); }
      });
    }
    function openFromHash() { if (root.location.hash === '#reading-library') { panel.open = true; panel.scrollIntoView({ block: 'start' }); } }
    attempt(render); openFromHash(); root.addEventListener('hashchange', openFromHash);
    root.addEventListener('storage', event => { if (event.key === KEY || event.key === null) attempt(render); });
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init); else init();
})(typeof globalThis === 'object' ? globalThis : this);
