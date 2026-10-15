'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listPublicHtmlFiles } = require('./article-asset-versioning.cjs');
const { normalizeText } = require('./seo-head-audit.cjs');

const ARTICLE_TABLE_OVERFLOW_PATHS = Object.freeze([
  'articles/2026-06-20-discount-gift-cards.html',
  'en/articles/google-play-points-join-eligibility.html',
  'ko/articles/google-play-points-join-eligibility.html',
  'tw/articles/google-play-points-join-eligibility.html'
]);
const WRAPPED_TABLE_PREFIX = /<(?:div|figure)\b[^>]*class=["'][^"']*(?:table-wrap|table-card|pack-table-wrap|lp-table-wrap|comparison-reference-table-wrap)[^"']*["'][^>]*>\s*$/i;

function wrapUnwrappedTables(html) {
  return String(html).replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 320), offset);
    if (WRAPPED_TABLE_PREFIX.test(prefix)) return table;
    return '<div class="table-wrap">' + table + '</div>';
  });
}

function syncArticleTableOverflow(rootDir, { checkOnly = false } = {}) {
  const summary = { checked: 0, changed: 0, changedFiles: [] };
  for (const relativePath of ARTICLE_TABLE_OVERFLOW_PATHS) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) throw new Error('Table overflow target missing: ' + relativePath);
    summary.checked += 1;
    const current = fs.readFileSync(absolutePath, 'utf8');
    const next = wrapUnwrappedTables(current);
    if (next === current) continue;
    summary.changed += 1;
    summary.changedFiles.push(relativePath);
    if (!checkOnly) fs.writeFileSync(absolutePath, next, 'utf8');
  }
  return summary;
}

// 生成済みの全テンプレートに同じ操作契約を適用する。既存の表・見出しは保持する。
const SCROLL_WRAPPER = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:div|figure)\b[^>]*class=["']([^"']*)["'][^>]*>/gi;
const SCROLL_CLASSES = new Set(["lp-table-wrap", "pack-table-wrap", "comparison-reference-table-wrap", "table-wrap", "table-card", "table-wrapper"]);
const SCROLL_NAMES = {
  ja: '比較表（左右矢印キーでスクロール）',
  en: 'Comparison table (scroll with the left and right arrow keys)',
  ko: '비교표 (왼쪽 및 오른쪽 화살표 키로 스크롤)',
  zh: '比較表（使用左右方向鍵捲動）'
};

function makeScrollableRegionsAccessible(html) {
  const locale = (html.match(/<html\b[^>]*lang=["']([^"']+)/i)?.[1] || 'ja').split('-')[0];
  const label = SCROLL_NAMES[locale] || SCROLL_NAMES.en;
  return html.replace(SCROLL_WRAPPER, (tag, protectedTag, classes, offset, source) => {
    if (!classes || !classes.split(/\s+/).some(name => SCROLL_CLASSES.has(name))) return tag;
    let next = tag;
    if (!/\btabindex=/.test(next)) next = next.replace(/>$/, ' tabindex="0">');
    if (!/\brole=/.test(next)) next = next.replace(/>$/, ' role="region">');
    if (!/\baria-label(?:ledby)?=/.test(next)) {
      const headings = [...source.slice(0, offset).matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
      const headingMarkup = headings.at(-1)?.[1] || '';
      const textNodes = [...headingMarkup.matchAll(/(?:^|>)([^<>]*)(?=<|$)/g)].map(match => match[1]);
      const heading = normalizeText(textNodes.join(' ')).slice(0, 120);
      const name = (heading ? heading + ': ' : '') + label;
      const escapedName = name.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
      next = next.replace(/>$/, ' aria-label="' + escapedName + '">');
    }
    return next;
  });
}

function syncScrollableRegions(rootDir) {
  const summary = { checked: 0, changed: 0 };
  for (const file of listPublicHtmlFiles(rootDir)) {
    const current = fs.readFileSync(file, 'utf8');
    summary.checked += 1;
    const readingPage = /intl-layout-container|main-content-column|lp-wrapper|maintenance-shell/.test(current);
    const next = makeScrollableRegionsAccessible(readingPage ? markResponsiveTables(current) : current);
    if (next === current) continue;
    fs.writeFileSync(file, next, 'utf8');
    summary.changed += 1;
  }
  return summary;
}

// 単純な2・3列表だけを縦読みへ。結合セルや複雑な表は既存の横スクロールを保つ。
function markResponsiveTables(html) {
  const attribute = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => {
    if (/reading-responsive-table/.test(table)) return table.replace(/(<th\b[^>]*\brole=)"cell"/gi, '$1"rowheader"');
    if (/\b(?:rowspan|colspan)\s*=/i.test(table)) return table;
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rows.length < 2) return table;
    const headers = [...rows[0][1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)];
    if (headers.length < 2 || headers.length > 3 || /<td\b/i.test(rows[0][1])) return table;
    if (!rows.slice(1).every(row => [...row[1].matchAll(/<t[dh]\b/gi)].length === headers.length)) return table;
    const labels = headers.map(h => normalizeText(h[1].replace(/<[^>]*>/g, ' ')));
    let rowIndex = 0;
    table = table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, row => {
      const header = rowIndex++ === 0;
      let cellIndex = 0;
      return row.replace(/<tr\b([^>]*)>/i, (all, attrs) => '<tr' + attrs + (/\brole=/.test(attrs) ? '' : ' role="row"') + '>').replace(/<(t[dh])\b([^>]*)>/gi, (all, tag, attrs) => {
        const label = labels[cellIndex++];
        const role = /\brole=/.test(attrs) ? '' : ' role="' + (header ? 'columnheader' : tag.toLowerCase() === 'th' ? 'rowheader' : 'cell') + '"';
        return '<' + tag + attrs + role + (header ? '' : ' data-column-label="' + attribute(label) + '"') + '>';
      });
    });
    return table.replace(/<table\b([^>]*)>/i, (all, attrs) => '<table' + (/\bclass=/.test(attrs) ? attrs.replace(/class=(["'])(.*?)\1/, (_all, quote, classes) => 'class=' + quote + classes + ' reading-responsive-table' + quote) : attrs + ' class="reading-responsive-table"') + (/\brole=/.test(attrs) ? '' : ' role="table"') + '>');
  });
}

module.exports = { ARTICLE_TABLE_OVERFLOW_PATHS, WRAPPED_TABLE_PREFIX, wrapUnwrappedTables, syncArticleTableOverflow, makeScrollableRegionsAccessible, syncScrollableRegions, markResponsiveTables };
