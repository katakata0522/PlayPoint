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
    const next = makeScrollableRegionsAccessible(current);
    if (next === current) continue;
    fs.writeFileSync(file, next, 'utf8');
    summary.changed += 1;
  }
  return summary;
}

module.exports = { ARTICLE_TABLE_OVERFLOW_PATHS, WRAPPED_TABLE_PREFIX, wrapUnwrappedTables, syncArticleTableOverflow, makeScrollableRegionsAccessible, syncScrollableRegions };
