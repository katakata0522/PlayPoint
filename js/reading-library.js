(function (root) {
  'use strict';
  const KEY = 'playpoint_reading_library_v1';
  const RECOVERY_KEY = 'playpointReadingLibraryRecoveryV1';
  const BLOG_KEY = 'katakata_blog_settings';
  const BLOG_RECOVERY_KEY = 'katakataBlogSettingsRecoveryV1';
  function normalizeArticlePath(value) {
    if (typeof value !== 'string') return null;
    if (/^\/(?:en\/|ko\/|tw\/)?articles\/[a-z0-9-]+\.html$/.test(value) && !value.endsWith('/index.html')) return value;
    if (/^\/games\/[a-z0-9-]+\/[a-z0-9-]+\/(?:index\.html)?$/.test(value)) return value.replace(/index\.html$/, '');
    return null;
  }
  function safePath(value) { return normalizeArticlePath(value) !== null; }
  function cleanItems(items, limit) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map(item => item && ({ ...item, path: normalizeArticlePath(item.path) }))
      .filter(item => item && safePath(item.path) && typeof item.title === 'string' && !seen.has(item.path) && seen.add(item.path))
      .slice(0, limit).map(item => ({ path: item.path, title: item.title.slice(0, 240) }));
  }
  const plainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  function validateReadingStore(value) {
    if (!plainObject(value) || !Object.keys(value).every(key => ['saved', 'recent', 'historyEnabled'].includes(key))) return false;
    if ('historyEnabled' in value && typeof value.historyEnabled !== 'boolean') return false;
    for (const [key, limit] of [['saved', 100], ['recent', 20]]) {
      if (!(key in value)) continue;
      if (!Array.isArray(value[key]) || value[key].length > limit) return false;
      const seen = new Set();
      for (const item of value[key]) {
        if (!plainObject(item) || !Object.keys(item).every(name => name === 'path' || name === 'title') || typeof item.title !== 'string' || item.title.length > 240) return false;
        const articlePath = normalizeArticlePath(item.path);
        if (articlePath === null || articlePath !== item.path || seen.has(articlePath)) return false;
        seen.add(articlePath);
      }
    }
    return true;
  }
  function validateBlogSettings(value) {
    return plainObject(value)
      && (!('theme' in value) || value.theme === 'light' || value.theme === 'dark')
      && (!('sortNewestFirst' in value) || typeof value.sortNewestFirst === 'boolean')
      && (!('sortMode' in value) || ['newest', 'oldest', 'updated'].includes(value.sortMode));
  }
  const SAFETY = {
    [KEY]: [RECOVERY_KEY, validateReadingStore],
    [BLOG_KEY]: [BLOG_RECOVERY_KEY, validateBlogSettings]
  };
  const SAFETY_MARK = Symbol.for('pp.articleStorageSafety.v1');
  const rawReaders = new WeakMap();
  function storageValueKind(key, raw) {
    if (raw === null) return 0;
    let value;
    try { value = JSON.parse(raw); } catch { return 'malformed-json'; }
    if (Number.isInteger(value?.version) && value.version > 1) return 'future-version';
    return SAFETY[key][1](value) ? 1 : 'invalid-schema';
  }
  function sameRecovery(text, key, raw) {
    try { const value = JSON.parse(text); return value?.sourceKey === key && value?.raw === raw; } catch { return false; }
  }
  function installArticleStorageSafety(target = root, now = () => new Date().toISOString()) {
    let storage, prototype;
    try { storage = target?.localStorage; prototype = target?.Storage?.prototype; } catch { return false; }
    if (!storage || !prototype) return false;
    if (prototype[SAFETY_MARK]) return true;
    const originalGet = prototype.getItem, originalSet = prototype.setItem;
    if (typeof originalGet !== 'function' || typeof originalSet !== 'function') return false;
    try {
      rawReaders.set(storage, key => originalGet.call(storage, key));
      prototype.getItem = function (key) {
        key = String(key);
        const raw = originalGet.call(this, key), owned = SAFETY[key];
        if (this !== storage || !owned) return raw;
        const kind = storageValueKind(key, raw);
        if ((key === BLOG_KEY && kind !== 0 && kind !== 1) || kind === 'future-version') return null;
        return raw;
      };
      prototype.setItem = function (key, value) {
        key = String(key);
        const owned = SAFETY[key];
        if (this !== storage || !owned) return originalSet.call(this, key, value);
        value = String(value);
        if (storageValueKind(key, value) !== 1) throw new TypeError('refused to write invalid data');
        const raw = originalGet.call(this, key), reason = storageValueKind(key, raw);
        if (reason !== 0 && reason !== 1) {
          const recoveryKey = owned[0], recovery = originalGet.call(this, recoveryKey);
          if (recovery === null) originalSet.call(this, recoveryKey, JSON.stringify({ version: 1, sourceKey: key, reason, capturedAt: now(), raw }));
          else if (!sameRecovery(recovery, key, raw)) throw new Error('different recovery copy already exists');
        }
        return originalSet.call(this, key, value);
      };
      prototype[SAFETY_MARK] = true;
    } catch { return false; }
    return true;
  }
  function inspectStore(storage) {
    const raw = rawReaders.get(storage)?.(KEY) ?? storage.getItem(KEY);
    return { raw, kind: storageValueKind(KEY, raw) };
  }
  function recoverStore(storage, now = () => new Date().toISOString()) {
    const { raw, kind } = inspectStore(storage);
    if (kind === 0 || kind === 1) return false;
    if (kind === 'future-version') throw Object.assign(Error('Newer version is protected'), { code: 'future_version' });
    const existing = storage.getItem(RECOVERY_KEY);
    if (existing !== null && !sameRecovery(existing, KEY, raw)) throw Object.assign(Error('Existing recovery is protected'), { code: 'recovery_conflict' });
    if (existing === null) storage.setItem(RECOVERY_KEY, JSON.stringify({ version: 1, sourceKey: KEY, reason: kind, capturedAt: now(), raw }));
    // 退避の書込成功後だけ初期化。容量/権限エラーは元データを維持する。
    storage.setItem(KEY, JSON.stringify({ saved: [], recent: [], historyEnabled: true }));
    return true;
  }
  function makeStore(storage) {
    function read() {
      const inspected = inspectStore(storage);
      if (inspected.kind === 'future-version') throw Object.assign(Error('Newer version is protected'), { code: 'future_version' });
      const raw = JSON.parse(inspected.raw || '{}');
      return { saved: cleanItems(raw?.saved, 100), recent: cleanItems(raw?.recent, 20), historyEnabled: raw?.historyEnabled !== false };
    }
    function change(callback) { const state = read(); callback(state); storage.setItem(KEY, JSON.stringify(state)); return state; }
    return {
      read,
      toggle(item) { if (!safePath(item?.path)) throw Error('Invalid article'); item = { ...item, path: normalizeArticlePath(item.path) }; return change(s => {
        if (s.saved.some(x => x.path === item.path)) s.saved = s.saved.filter(x => x.path !== item.path);
        else { if (s.saved.length >= 100) throw Object.assign(Error('Saved list full'), { code: 'saved_limit' }); s.saved = cleanItems([item, ...s.saved], 100); }
      }); },
      visit(item) { if (!safePath(item?.path)) return read(); item = { ...item, path: normalizeArticlePath(item.path) }; return change(s => { if (s.historyEnabled) s.recent = cleanItems([item, ...s.recent.filter(x => x.path !== item.path)], 20); }); },
      clear(type) { if (!['saved', 'recent'].includes(type)) throw Error('Invalid list'); return change(s => { s[type] = []; }); },
      remove(type, articlePath) { if (!['saved', 'recent'].includes(type)) throw Error('Invalid list'); return change(s => { s[type] = s[type].filter(x => x.path !== normalizeArticlePath(articlePath)); }); },
      history(enabled) { return change(s => { s.historyEnabled = Boolean(enabled); }); }
    };
  }
  const COPY = {
    ja: ['あとで読む', '保存済み', '保存した記事・閲覧履歴', 'あとで読む', '最近読んだ記事', 'この記事をリストから削除', 'すべて削除', 'まだ記事はありません。', 'この端末だけに保存します（保存100件・履歴20件まで）。ブラウザのデータ削除で消えます。', '閲覧履歴を残す', '保存領域を利用できません。ブラウザの設定をご確認ください。', '保存しました。', '保存を解除しました。'],
    en: ['Read later', 'Saved', 'Saved articles & reading history', 'Read later', 'Recently read', 'Remove this article', 'Clear list', 'No articles yet.', 'Stored only on this device: up to 100 saved articles and 20 recent articles. Clearing browser data removes these lists.', 'Keep reading history', 'Storage is unavailable. Check your browser settings.', 'Article saved.', 'Article removed from saved.'],
    ko: ['나중에 읽기', '저장됨', '저장한 글·최근 읽은 글', '나중에 읽기', '최근 읽은 글', '목록에서 삭제', '목록 비우기', '아직 글이 없습니다.', '이 기기에만 저장됩니다. 저장한 글은 최대 100개, 최근 읽은 글은 20개까지이며 브라우저 데이터를 삭제하면 사라집니다.', '읽은 글 기록하기', '저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인해 주세요.', '글을 저장했습니다.', '저장을 해제했습니다.'],
    tw: ['稍後閱讀', '已儲存', '已儲存文章與閱讀紀錄', '稍後閱讀', '最近閱讀', '從清單移除', '清空清單', '目前沒有文章。', '只儲存在此裝置：最多 100 篇收藏、20 篇閱讀紀錄。清除瀏覽器資料後，清單也會刪除。', '保留閱讀紀錄', '無法使用儲存空間，請檢查瀏覽器設定。', '已儲存文章。', '已取消儲存。']
  };
  const RECOVERY_COPY = {
    ja: ['保存データを読み取れません。元のデータは変更していません。', '退避して保存機能を初期化', '現在の保存・履歴を退避して、空のリストで再開しますか？', '元データを退避し、保存機能を初期化しました。', '新しいバージョンの保存データです。上書きせず保護しています。', '別の退避データがあるため初期化できません。データを確認してください。', 'このリストをすべて削除しますか？もう一方のリストは残ります。', '削除しました。', '容量不足のため保存できません。不要な保存記事を整理してください。'],
    en: ['Saved data could not be read. The original is unchanged.', 'Back up and reset reading lists', 'Back up current reading data and start with empty lists?', 'Original data backed up; reading lists reset.', 'Data from a newer version is protected from overwrite.', 'A different backup already exists. Review your saved data before resetting.', 'Clear this entire list? The other list will be kept.', 'List cleared.', 'Storage is full. Remove unneeded saved articles.'],
    ko: ['저장 데이터를 읽을 수 없습니다. 원본은 변경하지 않았습니다.', '백업 후 읽기 목록 초기화', '현재 데이터를 백업하고 빈 목록으로 시작할까요?', '원본을 백업하고 목록을 초기화했습니다.', '새 버전의 데이터는 덮어쓰지 않고 보호합니다.', '다른 백업이 있습니다. 초기화 전에 데이터를 확인해 주세요.', '이 목록을 모두 지울까요? 다른 목록은 유지됩니다.', '목록을 비웠습니다.', '저장 공간이 부족합니다. 불필요한 저장 글을 정리해 주세요.'],
    tw: ['無法讀取儲存資料，原始資料未變更。', '備份並重設閱讀清單', '備份目前的資料，並以空白清單重新開始？', '已備份原始資料並重設清單。', '這是較新版本的資料，已保護而不覆寫。', '已有不同的備份，請先檢查資料再重設。', '清除此清單的所有項目？另一份清單會保留。', '已清除清單。', '儲存空間不足，請移除不需要的已儲存文章。']
  };
  const api = { KEY, RECOVERY_KEY, BLOG_KEY, BLOG_RECOVERY_KEY, safePath, normalizeArticlePath, cleanItems, validateReadingStore, validateBlogSettings, installArticleStorageSafety, makeStore, inspectStore, recoverStore, COPY };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root?.document) return;
  installArticleStorageSafety(root);
  root.PlayPointReading = api;
  function init() {
    const document = root.document, pathname = normalizeArticlePath(root.location.pathname) || root.location.pathname;
    const locale = pathname.match(/^\/(en|ko|tw)\//)?.[1] || 'ja', copy = COPY[locale];
    const hub = locale === 'ja' ? '/blog/' : `/${locale}/articles/`;
    const isHub = pathname === hub || pathname === hub + 'index.html';
    const article = document.querySelector('article.content, article'), h1 = document.querySelector('main h1, h1');
    if (!isHub && (!safePath(pathname) || !h1)) return;
    let store, storeError; try { store = makeStore(root.localStorage); store.read(); } catch (error) { store = null; storeError = error; }
    const element = (tag, text) => { const el = document.createElement(tag); if (text) el.textContent = text; return el; };
    const status = element('span'); status.setAttribute('role', 'status');
    const recoveryCopy = RECOVERY_COPY[locale];
    function describeError(error) {
      if (error?.code === 'future_version') return recoveryCopy[4];
      if (error?.code === 'recovery_conflict') return recoveryCopy[5];
      if (error?.name === 'SyntaxError') return recoveryCopy[0];
      if (error?.name === 'QuotaExceededError') return recoveryCopy[8];
      if (error?.code === 'saved_limit') return { ja: '保存は100件までです。不要な記事を削除してから保存してください。', en: 'You can save up to 100 articles. Remove one before saving another.', ko: '최대 100개까지 저장할 수 있습니다. 기존 글을 삭제한 뒤 저장해 주세요.', tw: '最多可儲存100篇，請先移除不需要的文章再儲存。' }[locale];
      return copy[10];
    }
    let buttonStatus;
    function attempt(action) { try { if (!store) throw storeError || Error('No storage'); action(); } catch (error) { status.textContent = describeError(error); if (buttonStatus) buttonStatus.textContent = status.textContent; } }
    let button, current, updateButton;
    const localLibrary = locale === 'ja' && document.querySelector('.guide-header');
    if (!isHub) {
      current = { path: pathname, title: h1.textContent.trim() };
      const tools = document.querySelector('[data-reading-tools]') || element('div'); tools.className = 'reading-tools';
      button = element('button', copy[0]); button.type = 'button'; button.setAttribute('aria-pressed', 'false');
      updateButton = () => { const saved = store.read().saved.some(item => item.path === pathname); button.textContent = copy[saved ? 1 : 0]; button.setAttribute('aria-pressed', String(saved)); };
      buttonStatus = element('span'); buttonStatus.setAttribute('role', 'status');
      button.addEventListener('click', () => attempt(() => { store.toggle(current); updateButton(); buttonStatus.textContent = copy[button.getAttribute('aria-pressed') === 'true' ? 11 : 12]; if (localLibrary) render(); }));
      const link = element('a', copy[2]); link.href = (localLibrary ? '' : hub) + '#reading-library';
      tools.replaceChildren(button, link, buttonStatus);
      if (!tools.isConnected) { const header = h1.closest('header'); (header && !header.classList.contains('site-header') ? header : h1).after(tools); }
      attempt(() => { store.visit(current); updateButton(); });
      root.addEventListener('storage', event => { if (event.key === KEY || event.key === null) attempt(updateButton); });
      if (!localLibrary) return;
    }
    const panel = document.getElementById('reading-library') || element('details'); panel.id = 'reading-library'; panel.className = 'reading-library';
    panel.replaceChildren(element('summary', copy[2]), element('p', copy[8]));
    const controls = element('div'); panel.append(controls, status);
    const mount = document.querySelector('[data-intl-guide-controls], #article-grid, #articles-grid, #blog-grid, .articles-grid');
    if (!panel.isConnected) { if (!isHub && localLibrary) document.querySelector('aside.ja-article-sidebar').append(panel); else if (mount) mount.before(panel); else (document.querySelector('main') || document.body).append(panel); }
    function render() {
      updateButton?.();
      const focused = controls.querySelector(':focus');
      const restoreKey = focused?.dataset.readingFocus;
      controls.replaceChildren(); const state = store.read();
      const label = element('label'), checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.dataset.readingFocus = 'history'; checkbox.checked = state.historyEnabled;
      checkbox.addEventListener('change', () => attempt(() => { store.history(checkbox.checked); render(); }));
      label.append(checkbox, document.createTextNode(' ' + copy[9])); controls.append(label);
      ['saved', 'recent'].forEach((type, index) => {
        controls.append(element('h3', copy[3 + index])); const list = element('ul');
        if (!state[type].length) controls.append(element('p', copy[7]));
        for (const item of state[type]) {
          const row = element('li'), link = element('a', item.title); link.href = item.path;
          const remove = element('button', copy[5]); remove.type = 'button'; remove.dataset.readingFocus = type + ':' + item.path; remove.setAttribute('aria-label', copy[5] + ': ' + item.title);
          remove.addEventListener('click', () => attempt(() => { store.remove(type, item.path); render(); })); row.append(link, remove); list.append(row);
        }
        controls.append(list);
        if (state[type].length) { const clear = element('button', copy[6]); clear.type = 'button'; clear.dataset.readingFocus = 'clear:' + type; clear.addEventListener('click', () => { if (root.confirm(recoveryCopy[6])) attempt(() => { store.clear(type); render(); status.textContent = recoveryCopy[7]; }); }); controls.append(clear); }
      });
      if (restoreKey) (Array.from(controls.querySelectorAll('[data-reading-focus]')).find(el => el.dataset.readingFocus === restoreKey) || controls.querySelector('input'))?.focus({ preventScroll: true });
    }
    function openFromHash() { if (root.location.hash === '#reading-library') { panel.open = true; panel.scrollIntoView({ block: 'start' }); } }
    if (store) attempt(render);
    else {
      status.textContent = describeError(storeError);
      try {
        const kind = inspectStore(root.localStorage).kind;
        if (kind === 'malformed-json' || kind === 'invalid-schema') {
          const recover = element('button', recoveryCopy[1]); recover.type = 'button';
          recover.addEventListener('click', () => {
            if (!root.confirm(recoveryCopy[2])) return;
            try { recoverStore(root.localStorage); store = makeStore(root.localStorage); render(); status.textContent = recoveryCopy[3]; controls.querySelector('input')?.focus(); }
            catch (error) { status.textContent = describeError(error); }
          });
          controls.append(recover);
        }
      } catch { /* 権限拒否時は初期化ボタンを出さない。 */ }
    }
    openFromHash(); root.addEventListener('hashchange', openFromHash);
    root.addEventListener('storage', event => { if (event.key === KEY || event.key === null) { try { store = makeStore(root.localStorage); store.read(); } catch (error) { store = null; storeError = error; } attempt(render); } });
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', init); else init();
})(typeof globalThis === 'object' ? globalThis : this);
