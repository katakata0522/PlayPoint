'use strict';

(() => {
  const SOON_MS = 7 * 24 * 60 * 60 * 1000;
  // 終了時刻は排他的な境界。地域や端末のタイムゾーンには依存しない。
  function classifyBenefit(offer, now = Date.now()) {
    const start = offer.start ? Date.parse(offer.start) : null;
    const end = offer.end ? Date.parse(offer.end) : null;
    if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return 'unknown';
    if (end !== null && now >= end) return 'ended';
    if (start !== null && now < start) return 'upcoming';
    if (end !== null && end - now <= SOON_MS) return 'soon';
    return 'active';
  }
  const RANKS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  function matchesAudience(offer, rank = '', pass = '') {
    const selectedRank = RANKS.indexOf(rank), minimum = RANKS.indexOf(offer.minRank);
    if (selectedRank >= 0 && minimum >= 0 && selectedRank < minimum) return false;
    return !(offer.requiresPass === 'true' && pass === 'no');
  }
  function matchesFilter(offer, state, category = 'active', period = 'active') {
    if (state === 'ended') return false;
    const matchesCategory = category === 'active' || offer.category === category;
    const matchesPeriod = period === 'active' ? state !== 'upcoming' : state === period;
    return matchesCategory && matchesPeriod;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { classifyBenefit, matchesAudience, matchesFilter };
  if (typeof document === 'undefined') return;
  const board = document.querySelector('.benefit-board');
  if (!board) return;
  const tabs = [...board.querySelectorAll('[role="tab"]')];
  const cards = [...board.querySelectorAll('[data-benefit-id]')];
  const grid = board.querySelector('#benefit-panel .benefit-grid');
  const panel = board.querySelector('#benefit-panel');
  const ended = board.querySelector('.benefit-ended');
  const endedList = board.querySelector('[data-ended-list]');
  const count = board.querySelector('.benefit-count');
  const empty = board.querySelector('.benefit-empty');
  const note = board.querySelector('[data-filter-note]');
  const audience = board.querySelector('.benefit-audience');
  const rankSelect = board.querySelector('#benefit-rank');
  const passSelect = board.querySelector('#benefit-pass');
  const periodSelect = board.querySelector('#benefit-period');
  const audienceSummary = board.querySelector('[data-audience-summary]');
  const clearAudience = board.querySelector('[data-clear-audience]');
  const descriptions = {
    active: '期間限定・毎週・アカウント別の特典をまとめています。配布報告や未確認の条件は、各カードに区別して記載しています。',
    points: 'Play Pointsの獲得・交換や、毎週・アカウント別の特典です。',
    gift: 'ギフトコードの購入・応募などで還元を受ける企画です。Play Pointsの増量とは異なります。',
    other: 'Pixel・ゲーミング製品などの割引です。自分に表示される対象条件を確認してください。'
  };
  const emptyMessages = {
    active: '掲載中の特典はありません。次の情報を確認でき次第、ご案内します。',
    points: '掲載中のポイント特典はありません。',
    gift: '掲載中のコード還元企画はありません。',
    other: '掲載中の製品割引はありません。'
  };
  // 以前の「終了間近・開始予定」へのリンクは、時期の絞り込みへ引き継ぐ。
  const initial = /(?:^|[?&])filter=(active|points|gift|soon|upcoming|other)(?:&|$)/.exec(window.location?.search || '')?.[1] || 'active';
  let selected = ['soon', 'upcoming'].includes(initial) ? 'active' : initial;
  if (periodSelect && ['soon', 'upcoming'].includes(initial)) periodSelect.value = initial;
  let lastRender = '';
  function render(filter, focus = false) {
    selected = filter;
    const now = Date.now();
    const states = cards.map(card => classifyBenefit(card.dataset, now));
    const rank = rankSelect?.value || '', pass = passSelect?.value || '';
    const period = periodSelect?.value || (['soon', 'upcoming'].includes(initial) ? initial : 'active');
    const signature = JSON.stringify([filter, states, rank, pass, period, cards.map(card => card.dataset.kind)]);
    // 定期確認は続けるが、期限・タブが変わらなければDOMと読み上げ領域を更新しない。
    if (signature === lastRender) {
      if (focus) tabs.find(tab => tab.dataset.filter === filter)?.focus();
      return;
    }
    lastRender = signature;
    let visible = 0;
    let expired = 0;
    tabs.forEach(tab => {
      const current = tab.dataset.filter === filter;
      tab.setAttribute('aria-selected', String(current));
      tab.tabIndex = current ? 0 : -1;
      if (current && focus) tab.focus();
    });
    cards.forEach((card, index) => {
      const state = states[index];
      const badge = card.querySelector('[data-benefit-status]');
      if (state === 'ended') {
        badge.textContent = '終了';
        card.hidden = false;
        if (card.parentElement !== endedList) endedList.append(card);
        expired++;
        return;
      }
      if (card.parentElement !== grid) grid.append(card);
      const shown = matchesFilter(card.dataset, state, filter, period) && matchesAudience(card.dataset, rank, pass);
      card.hidden = !shown;
      if (shown) visible++;
      badge.textContent = card.dataset.kind === 'report' ? '配布報告・条件は個別確認' : card.dataset.category === 'other' ? '個別の対象を確認' : state === 'soon' ? 'まもなく終了' : state === 'upcoming' ? '開始予定' : state === 'unknown' ? '日時を確認中' : card.dataset.kind === 'weekly' ? '毎週チェック' : card.dataset.kind === 'account' ? 'アカウント別' : '開催中';
    });
    ended.hidden = expired === 0;
    note.textContent = descriptions[filter];
    count.textContent = visible + '件の情報';
    empty.hidden = visible !== 0;
    const unfilteredCount = cards.filter((card, index) => matchesFilter(card.dataset, states[index], filter, period)).length;
    empty.querySelector('[data-empty-message]').textContent = unfilteredCount && (rank || pass)
      ? 'このランク・加入状況に合う掲載情報はありません。「条件を解除」で、この種類の全件を確認できます。'
      : period === 'soon' ? '終了まで7日以内と確認できた企画は、この種類には掲載していません。'
      : period === 'upcoming' ? '開始日時が確認できた新しい企画は、この種類には掲載していません。' : emptyMessages[filter];
    if (audienceSummary) audienceSummary.textContent = rank || pass || period !== 'active' ? '絞り込み中' : '';
    panel.setAttribute('aria-labelledby', 'benefit-tab-' + filter);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => render(tab.dataset.filter));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      render(tabs[next].dataset.filter, true);
    });
  });
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  function changeAudience() {
    render(selected);
    window.PlayPointAnalytics?.track('benefit_filter_changed', { rank_filter: rankSelect.value || 'all', pass_filter: passSelect.value || 'all', benefit_tab: selected,
      results_count: cards.filter(card => !card.hidden && card.parentElement === grid).length });
  }
  [rankSelect, passSelect, periodSelect].forEach(control => control?.addEventListener('change', changeAudience));
  clearAudience?.addEventListener('click', () => { rankSelect.value = ''; passSelect.value = ''; periodSelect.value = 'active'; changeAudience(); });
  if (audience) audience.hidden = false;
  render(selected);
  board.querySelector('[role="tablist"]').hidden = false;
  note.hidden = false;
  count.hidden = false;
  // 開いたままのタブでも期限を過ぎた企画を開催中に残さない。
  window.setInterval(() => { if (!document.hidden) render(selected); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(selected); });

  // 折りたたんだ情報への従来のアンカーも、対象を開いてから案内する。
  function revealHash() {
    let target;
    try { target = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch { return; }
    if (!target) return;
    let parent = target.closest('details');
    while (parent) { parent.open = true; parent = parent.parentElement?.closest('details'); }
    target.scrollIntoView({ block: 'start' });
  }
  if (window.location?.hash) revealHash();
  window.addEventListener?.('hashchange', revealHash);
})();
