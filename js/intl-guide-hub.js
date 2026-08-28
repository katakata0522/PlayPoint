'use strict';

(() => {
  const grid = document.querySelector('[data-guide-grid]');
  const search = document.querySelector('[data-guide-search]');
  const buttons = Array.from(document.querySelectorAll('[data-guide-filter]'));
  const result = document.querySelector('[data-guide-result]');
  const empty = document.querySelector('[data-guide-empty]');
  if (!grid || !search || !buttons.length || !result || !empty) return;

  const cards = Array.from(grid.querySelectorAll('[data-guide-card]'));
  let activeCategory = 'all';

  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();

  function updateResult(count) {
    const template = grid.dataset.resultTemplate || '{count}';
    result.textContent = template.replace('{count}', String(count));
    empty.hidden = count !== 0;
  }

  function applyFilters() {
    const query = normalize(search.value);
    let visible = 0;
    for (const card of cards) {
      const categoryMatches = activeCategory === 'all' || card.dataset.category === activeCategory;
      const queryMatches = !query || normalize(card.dataset.search).includes(query);
      const show = categoryMatches && queryMatches;
      card.hidden = !show;
      if (show) visible += 1;
    }
    updateResult(visible);
  }

  function selectCategory(category, { focus = false } = {}) {
    activeCategory = category;
    for (const button of buttons) {
      const active = button.dataset.guideFilter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      if (active && focus) button.focus({ preventScroll: true });
    }
    applyFilters();
  }

  for (const button of buttons) {
    button.addEventListener('click', () => selectCategory(button.dataset.guideFilter));
  }
  search.addEventListener('input', applyFilters);

  function applyHash() {
    const map = {
      '#intl-hub-account': 'account',
      '#intl-hub-earn': 'earn',
      '#intl-hub-levels': 'levels',
      '#intl-hub-trouble': 'troubleshooting'
    };
    const category = map[window.location.hash];
    if (category) selectCategory(category);
  }

  window.addEventListener('hashchange', applyHash);
  applyHash();
  applyFilters();
})();
