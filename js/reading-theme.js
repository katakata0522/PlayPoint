/* 記事サイト共通のテーマ。保存済みの選択 > OS設定。破損設定は上書きしない。 */
(function (root) {
  'use strict';
  const KEY = 'katakata_blog_settings';
  const valid = value => value === 'light' || value === 'dark';
  function resolveTheme(settings, systemDark) { return valid(settings?.theme) ? settings.theme : systemDark ? 'dark' : 'light'; }
  const api = { KEY, resolveTheme };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root?.document) return;
  const doc = root.document, media = root.matchMedia('(prefers-color-scheme: dark)');
  let storage, readRaw, explicit = false, current;
  try { storage = root.localStorage; readRaw = storage.getItem.bind(storage); } catch { /* 保存拒否でも表示は可能。 */ }
  function settings() { try { const value = JSON.parse(readRaw?.(KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) && !(value.version > 1) ? value : {}; } catch { return {}; } }
  function labels() {
    return ({ ja: ['ライトモードに切替', 'ダークモードに切替', 'テーマはこのページだけ変更しました。保存設定を確認してください。'],
      en: ['Switch to light mode', 'Switch to dark mode', 'Theme changed for this page only. Check storage settings.'],
      ko: ['라이트 모드로 전환', '다크 모드로 전환', '이 페이지에서만 테마가 변경되었습니다. 저장 설정을 확인해 주세요.'],
      tw: ['切換為淺色模式', '切換為深色模式', '只變更此頁面的主題，請檢查儲存設定。'] })[root.location.pathname.match(/^\/(en|ko|tw)\//)?.[1] || 'ja'];
  }
  function refreshButtons() {
    doc.querySelectorAll('[data-reading-theme-toggle]').forEach(button => {
      const label = labels()[current === 'dark' ? 0 : 1];
      button.textContent = current === 'dark' ? '☀️' : '🌙';
      button.setAttribute('aria-label', label); button.title = label;
    });
  }
  function apply(theme) {
    current = theme;
    doc.documentElement.dataset.readingTheme = theme;
    if (doc.body) doc.body.dataset.theme = theme;
    refreshButtons();
  }
  function refresh() { const saved = settings(); explicit = valid(saved.theme); apply(resolveTheme(saved, media.matches)); }
  function toggle() {
    const next = current === 'dark' ? 'light' : 'dark';
    explicit = true; apply(next);
    let saved = false;
    try {
      const value = JSON.parse(readRaw?.(KEY) || '{}');
      if (!storage || !value || typeof value !== 'object' || Array.isArray(value) || value.version > 1) throw Error('Protected settings');
      storage.setItem(KEY, JSON.stringify({ ...value, theme: next })); saved = true;
    } catch { /* 元データを捨てず、このページのみ切り替える。 */ }
    let notice = doc.getElementById('reading-theme-notice');
    if (!saved && !notice) { notice = doc.createElement('span'); notice.id = 'reading-theme-notice'; notice.setAttribute('role', 'status'); doc.querySelector('[data-reading-theme-toggle]')?.after(notice); }
    if (notice) notice.textContent = saved ? '' : labels()[2];
    root.PlayPointAnalytics?.track('theme_change', { theme_mode: next });
  }
  function mount() {
    let button = doc.getElementById('theme-toggle') || doc.querySelector('[data-reading-theme-toggle]');
    if (!button) {
      const header = doc.querySelector('.site-header-tools') || doc.querySelector('.site-header-links') || doc.querySelector('.header-right') || doc.querySelector('.site-header-inner');
      if (!header) return;
      button = doc.createElement('button'); button.type = 'button'; button.className = 'reading-theme-toggle'; header.append(button);
    }
    if (!button.hasAttribute('data-reading-theme-toggle')) { button.setAttribute('data-reading-theme-toggle', ''); button.addEventListener('click', toggle); }
    refreshButtons();
  }
  root.PlayPointReadingTheme = { ...api, get: () => current, refresh, mount };
  refresh();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => { apply(current); mount(); }); else mount();
  media.addEventListener('change', () => { if (!explicit) apply(resolveTheme({}, media.matches)); });
  root.addEventListener('storage', event => { if (event.key === KEY || event.key === null) refresh(); });
})(typeof globalThis === 'object' ? globalThis : this);
