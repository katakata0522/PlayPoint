(function (root) {
  'use strict';
  // 地域ごとの同義語をまとめ、ローカルの見出し・本文インデックスを検索する。
  const groups = {
    ja: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', 'プレイポイント', 'プレイ ポイント', 'playポイント', 'play ポイント', 'google play ポイント', 'googleplayポイント', 'グーグルプレイポイント', 'グーグル プレイ ポイント'], ['期限', '有効期限', '期限切れ', '失効'], ['反映', '反映されない', '反映されません', '付与されない', '付かない', 'つかない', '未付与'], ['残高', '残りポイント'], ['ウィークリー', 'ウイークリー', '週次'], ['クーポン', 'coupon']],
    en: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points'], ['expiry', 'expiration', 'expire', 'expired'], ['missing', 'not received', 'not showing'], ['weekly', 'weekly prize', 'weekly reward']],
    ko: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', '플레이 포인트', '플레이포인트', '구글플레이 포인트', '구글 플레이 포인트', '구글 플레이포인트'], ['만료', '유효기간', '유효 기간', '소멸'], ['미지급', '적립 안됨', '적립 안 됨'], ['주간', '위클리']],
    tw: [['playpoints', 'googleplaypoints', 'google playpoints', 'googleplay points', 'google play points', 'play points', 'play 點數', 'play點數', 'google play 點數', 'google play點數', 'googleplay點數'], ['到期', '有效期限', '過期', '失效'], ['未入帳', '沒有入帳', '沒收到', '未收到'], ['每週', '每周', '週獎勵']]
  };
  function normalize(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function canonical(value, locale = 'ja') {
    let result = normalize(value);
    const replacements = (groups[locale] || groups.en).flatMap((group, index) => group.map(word => [normalize(word), 'zzalias' + index + 'zz'])).sort((a, b) => b[0].length - a[0].length);
    for (const [word, replacement] of replacements) result = result.split(word).join(replacement);
    return result;
  }
  function tokens(query, locale) { return [...new Set(canonical(query, locale).split(' ').filter(Boolean))].slice(0, 12); }
  function sections(article) { return Array.isArray(article.sections) ? article.sections : []; }
  function searchable(article) { return [article.title, article.description, article.category, ...(article.tags || []), ...sections(article).map(s => s.heading + ' ' + s.text)].join(' '); }
  function matches(article, query, locale) { const haystack = canonical(searchable(article), locale); return tokens(query, locale).every(token => haystack.includes(token)); }
  function score(article, query, locale) {
    const terms = tokens(query, locale);
    const title = canonical(article.title, locale);
    const headings = canonical(sections(article).map(s => s.heading).join(' '), locale);
    return terms.reduce((sum, token) => sum + (title.includes(token) ? 5 : 0) + (headings.includes(token) ? 2 : 0), 0);
  }
  function excerpt(article, query, locale) {
    if (!normalize(query)) return { text: article.description || '', id: '', heading: '' };
    const terms = tokens(query, locale);
    let best = null, bestScore = 0;
    for (const section of sections(article)) {
      const text = canonical(section.heading + ' ' + section.text, locale);
      const count = terms.filter(t => text.includes(t)).length;
      if (count > bestScore) { best = section; bestScore = count; }
    }
    if (!best) return { text: article.description || '', id: '', heading: '' };
    const text = String(best.text || best.heading);
    const literal = normalize(query).split(' ').filter(Boolean).map(t => normalize(text).indexOf(t)).filter(i => i >= 0);
    const start = Math.max(0, (literal.length ? Math.min(...literal) : 0) - 40);
    return { text: (start ? '…' : '') + text.slice(start, start + 180) + (text.length > start + 180 ? '…' : ''), id: best.id || '', heading: best.heading || '' };
  }
  function suggest(articles, query, locale) {
    const terms = tokens(query, locale);
    if (!terms.length) return [];
    return articles.map(article => ({ article, count: terms.filter(t => canonical(searchable(article), locale).includes(t)).length }))
      .filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3).map(item => item.article);
  }
  const api = { normalize, canonical, tokens, matches, score, excerpt, suggest };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayPointSearch = api;
})(typeof globalThis === 'object' ? globalThis : this);
