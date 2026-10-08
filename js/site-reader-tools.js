'use strict';
(() => {
  const media = matchMedia('(max-width: 760px)');
  const discovery = document.querySelectorAll('[data-mobile-discovery]');
  const layout = () => discovery.forEach(panel => { panel.open = !media.matches; });
  layout(); media.addEventListener('change', layout);
  const directory = document.querySelector('[data-game-directory-search]');
  if (directory) {
    const input = directory.querySelector('input');
    const cards = [...document.querySelectorAll('.games-grid .game-portal-card')];
    const count = directory.querySelector('[aria-live]');
    const clear = directory.querySelector('[data-game-search-clear]');
    const locale = document.documentElement.lang;
    const suffix = ({ ja: '件のゲーム', en: 'games shown', ko: '개 게임 표시', 'zh-TW': '款遊戲' })[locale] || 'games';
    const normalize = text => text.normalize('NFKC').toLocaleLowerCase().trim();
    function filter() {
      const query = normalize(input.value);
      for (const card of cards) card.hidden = !normalize(card.textContent + ' ' + card.getAttribute('href')).includes(query);
      count.textContent = cards.filter(card => !card.hidden).length + ' ' + suffix;
      clear.hidden = !query;
      const url = new URL(location.href); if (query) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
    input.value = new URLSearchParams(location.search).get('q') || '';
    input.addEventListener('input', filter);
    clear.addEventListener('click', () => { input.value = ''; filter(); input.focus(); }); filter();
  }
  const rank = document.getElementById('res-reached-rank');
  if (rank) {
    const box = rank.closest('.result-stat-box'), progress = document.querySelector('.rank-progress-wrapper');
    if (box && progress && !document.querySelector('.game-rank-reference')) {
      const details = document.createElement('details'); details.className = 'game-rank-reference';
      const summary = document.createElement('summary'); summary.textContent = box.querySelector('.result-stat-label').textContent;
      details.append(summary); progress.before(details); details.append(box, progress);
    }
  }
})();
