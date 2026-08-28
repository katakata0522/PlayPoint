'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CATEGORY_KEYS,
  getCategoryLabels,
  getIntlGuideCategory,
  getStartHereHrefs
} = require('./intl-guide-taxonomy.cjs');

const HUB_COPY = Object.freeze({
  en: {
    start: 'Start here',
    startLead: 'Five common questions to get you to the right rule quickly.',
    browse: 'Browse all guides',
    searchLabel: 'Search guides',
    searchPlaceholder: 'Search by topic or keyword',
    all: 'All guides',
    result: count => `${count} guide${count === 1 ? '' : 's'} shown`,
    empty: 'No guides match this search. Try another keyword or category.'
  },
  ko: {
    start: '먼저 볼 가이드',
    startLead: '자주 찾는 질문 5개에서 필요한 규칙으로 빠르게 이동하세요.',
    browse: '전체 가이드 찾아보기',
    searchLabel: '가이드 검색',
    searchPlaceholder: '주제 또는 키워드 검색',
    all: '전체',
    result: count => `${count}개 가이드 표시`,
    empty: '검색 조건에 맞는 가이드가 없습니다. 다른 키워드나 분류를 선택해 보세요.'
  },
  tw: {
    start: '先從這裡開始',
    startLead: '先從 5 個常見問題快速找到最符合目前情況的規則。',
    browse: '瀏覽所有指南',
    searchLabel: '搜尋指南',
    searchPlaceholder: '依主題或關鍵字搜尋',
    all: '全部',
    result: count => `顯示 ${count} 篇指南`,
    empty: '找不到符合條件的指南，請改用其他關鍵字或分類。'
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeHtmlText(value) {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function extractHubLinks(articleHtml) {
  const seen = new Set();
  const links = [];
  const linkPattern = /<li><a href="([^"]+)">([\s\S]*?)<\/a><\/li>/g;
  for (const match of articleHtml.matchAll(linkPattern)) {
    const href = match[1];
    if (!/^\/(?:en|ko|tw)\/(?:articles|maintenance)\//.test(href) || seen.has(href)) continue;
    const title = decodeHtmlText(match[2].replace(/<[^>]+>/g, '').trim());
    if (!title) continue;
    seen.add(href);
    links.push({ href, title, category: getIntlGuideCategory(href) });
  }
  return links;
}

function renderCard(link, labels, featured = false) {
  const categoryLabel = labels[link.category];
  const search = `${link.title} ${categoryLabel}`.toLocaleLowerCase();
  return `<a class="intl-guide-card${featured ? ' intl-guide-card--featured' : ''}" href="${escapeHtml(link.href)}" data-guide-card data-category="${escapeHtml(link.category)}" data-search="${escapeHtml(search)}">
        <span class="intl-guide-card__category">${escapeHtml(categoryLabel)}</span>
        <span class="intl-guide-card__title">${escapeHtml(link.title)}</span>
      </a>`;
}

function renderHubBody(localeKey, links) {
  const copy = HUB_COPY[localeKey] || HUB_COPY.en;
  const labels = getCategoryLabels(localeKey);
  const byHref = new Map(links.map(link => [link.href, link]));
  const start = getStartHereHrefs(localeKey).map(href => byHref.get(href)).filter(Boolean).slice(0, 5);
  for (const link of links) {
    if (start.length >= 5) break;
    if (!start.some(item => item.href === link.href)) start.push(link);
  }

  const counts = Object.fromEntries(CATEGORY_KEYS.map(key => [key, links.filter(link => link.category === key).length]));
  const filterButtons = [
    `<button type="button" class="intl-guide-filter is-active" data-guide-filter="all" aria-pressed="true">${escapeHtml(copy.all)} <span>${links.length}</span></button>`,
    ...CATEGORY_KEYS.map(key => {
      const anchorId = key === 'troubleshooting' ? 'intl-hub-trouble' : `intl-hub-${key}`;
      return `<button id="${anchorId}" type="button" class="intl-guide-filter" data-guide-filter="${key}" aria-pressed="false">${escapeHtml(labels[key])} <span>${counts[key]}</span></button>`;
    })
  ].join('\n        ');

  return `<section class="intl-hub-start" aria-labelledby="intl-hub-start">
      <div class="intl-hub-section-heading">
        <div><h2 id="intl-hub-start">${escapeHtml(copy.start)}</h2><p>${escapeHtml(copy.startLead)}</p></div>
      </div>
      <div class="intl-guide-start-grid">
        ${start.map(link => renderCard(link, labels, true)).join('\n        ')}
      </div>
    </section>
    <section class="intl-hub-browser" aria-labelledby="intl-hub-browse">
      <div class="intl-hub-section-heading"><h2 id="intl-hub-browse">${escapeHtml(copy.browse)}</h2></div>
      <div class="intl-guide-controls" data-intl-guide-controls>
        <label for="intl-guide-search">${escapeHtml(copy.searchLabel)}</label>
        <input id="intl-guide-search" type="search" autocomplete="off" placeholder="${escapeHtml(copy.searchPlaceholder)}" data-guide-search>
        <div class="intl-guide-filters" role="group" aria-label="${escapeHtml(copy.browse)}">
          ${filterButtons}
        </div>
      </div>
      <p class="intl-guide-result" data-guide-result aria-live="polite">${escapeHtml(copy.result(links.length))}</p>
      <div class="intl-guide-grid" data-guide-grid data-result-template="${escapeHtml(copy.result('{count}'))}">
        ${links.map(link => renderCard(link, labels)).join('\n        ')}
      </div>
      <p class="intl-guide-empty" data-guide-empty hidden>${escapeHtml(copy.empty)}</p>
    </section>`;
}

function synchronizeHubFile(rootDir, localeKey) {
  const file = path.join(rootDir, localeKey, 'articles', 'index.html');
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<article class="content">([\s\S]*?)<\/article>/);
  if (!match) throw new Error(`international hub content not found: ${localeKey}`);
  const links = extractHubLinks(match[1]);
  if (links.length < 10) throw new Error(`international hub link catalog unexpectedly small: ${localeKey} (${links.length})`);

  const introMatch = match[1].match(/<div class="intl-hub-intro">[\s\S]*?<\/div>/);
  if (!introMatch) throw new Error(`international hub intro not found: ${localeKey}`);
  const body = `${introMatch[0]}\n    ${renderHubBody(localeKey, links)}`;
  html = html.replace(match[0], `<article class="content">\n      ${body}\n    </article>`);

  if (!html.includes('data-intl-hub-discovery-style')) {
    html = html.replace('</head>', '    <link rel="stylesheet" href="/articles/intl-hub.css?v=1" data-intl-hub-discovery-style>\n</head>');
  }
  if (!html.includes('data-intl-hub-discovery-script')) {
    html = html.replace('</body>', '<script src="/js/intl-guide-hub.js?v=1" defer data-intl-hub-discovery-script></script>\n</body>');
  }

  const previous = fs.readFileSync(file, 'utf8');
  if (previous === html) return false;
  fs.writeFileSync(file, html, 'utf8');
  return true;
}

function syncIntlHubDiscovery(rootDir) {
  let changed = 0;
  for (const localeKey of ['en', 'ko', 'tw']) {
    if (synchronizeHubFile(rootDir, localeKey)) changed += 1;
  }
  return { checked: 3, changed };
}

module.exports = {
  HUB_COPY,
  extractHubLinks,
  renderHubBody,
  syncIntlHubDiscovery
};
