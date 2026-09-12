'use strict';
(() => {
  const grid = document.querySelector('[data-guide-grid]');
  const search = document.querySelector('[data-guide-search]');
  const buttons = Array.from(document.querySelectorAll('[data-guide-filter]'));
  const result = document.querySelector('[data-guide-result]');
  const empty = document.querySelector('[data-guide-empty]');
  if (!grid || !search || !buttons.length || !result || !empty) return;
  const locale = location.pathname.split('/')[1];
  const copy = {
    en: ['Search all categories', 'Reset search and filters', 'Related to some of your keywords', 'Start with these guides', 'Full-text search is unavailable. You can still search titles.'],
    ko: ['모든 분류에서 검색', '검색·분류 초기화', '입력한 일부 키워드와 관련된 글', '먼저 볼 가이드', '본문 검색을 불러오지 못했습니다. 제목으로 검색할 수 있습니다.'],
    tw: ['搜尋所有分類', '清除搜尋與篩選', '與部分關鍵字相關的文章', '可以先看這些指南', '無法載入全文搜尋，目前仍可搜尋標題。']
  }[locale];
  const cards = Array.from(grid.querySelectorAll('[data-guide-card]'));
  const originalHrefs = new Map(cards.map(card => [card, card.getAttribute('href')]));
  let articles = cards.map(card => ({ path: new URL(card.href).pathname, title: card.querySelector('.intl-guide-card__title')?.textContent || '', description: '', sections: [] }));
  let activeCategory = 'all';
  const recovery = document.createElement('div'); recovery.className = 'search-recovery'; recovery.hidden = true; empty.after(recovery);
  function updateResult(count) {
    result.textContent = (grid.dataset.resultTemplate || '{count}').replace('{count}', String(count));
    empty.hidden = count !== 0; recovery.hidden = count !== 0;
  }
  function addButton(label, action) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); recovery.append(button); }
  function recover() {
    recovery.replaceChildren();
    if (activeCategory !== 'all') addButton(copy[0], () => selectCategory('all'));
    addButton(copy[1], () => { search.value = ''; selectCategory('all'); search.focus(); });
    const suggestions = window.PlayPointSearch?.suggest(articles, search.value, locale) || [];
    const heading = document.createElement('p'); heading.textContent = copy[suggestions.length ? 2 : 3]; recovery.append(heading);
    const list = document.createElement('ul');
    const choices = suggestions.length ? suggestions : articles.slice(0, 3);
    choices.forEach(article => { const li = document.createElement('li'), link = document.createElement('a'); link.href = article.path; link.textContent = article.title; li.append(link); list.append(li); });
    recovery.append(list);
  }
  function applyFilters() {
    const query = search.value.trim(), engine = window.PlayPointSearch; let visible = 0;
    const byPath = new Map(articles.map(article => [article.path, article]));
    const ordered = cards.slice();
    if (query && engine) ordered.sort((a, b) => engine.score(byPath.get(new URL(b.href).pathname), query, locale) - engine.score(byPath.get(new URL(a.href).pathname), query, locale));
    for (const card of ordered) {
      const article = byPath.get(new URL(card.href).pathname);
      const categoryMatches = activeCategory === 'all' || card.dataset.category === activeCategory;
      const queryMatches = !query || (engine ? engine.matches(article, query, locale) : card.dataset.search.toLowerCase().includes(query.toLowerCase()));
      card.hidden = !(categoryMatches && queryMatches);
      card.setAttribute('href', originalHrefs.get(card)); card.querySelector('.intl-guide-card__excerpt')?.remove();
      if (!card.hidden) {
        visible++;
        if (query && engine) {
          const snippet = engine.excerpt(article, query, locale);
          const paragraph = document.createElement('span'); paragraph.className = 'intl-guide-card__excerpt';
          paragraph.textContent = (snippet.heading ? snippet.heading + ' — ' : '') + snippet.text; card.append(paragraph);
          if (snippet.id) card.href = article.path + '#' + encodeURIComponent(snippet.id);
        }
      }
      grid.append(card);
    }
    updateResult(visible); if (!visible) recover();
  }
  function selectCategory(category, { focus = false } = {}) {
    activeCategory = category;
    for (const button of buttons) { const active = button.dataset.guideFilter === category; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); if (active && focus) button.focus({ preventScroll: true }); }
    applyFilters();
  }
  buttons.forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.guideFilter)));
  search.addEventListener('input', applyFilters);
  function applyHash() {
    const map = { '#intl-hub-account': 'account', '#intl-hub-earn': 'earn', '#intl-hub-levels': 'levels', '#intl-hub-trouble': 'troubleshooting' };
    if (map[location.hash]) selectCategory(map[location.hash]);
  }
  window.addEventListener('hashchange', applyHash); applyHash(); applyFilters();
  fetch('article-search-index.json', { cache: 'no-cache' }).then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); }).then(index => {
    const byPath = new Map(index.articles.map(article => [article.path, article]));
    articles = articles.map(article => byPath.get(article.path) || article); applyFilters();
  }).catch(() => { const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.textContent = copy[4]; search.after(notice); });
})();
