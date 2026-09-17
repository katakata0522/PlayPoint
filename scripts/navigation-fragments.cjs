'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { audit, SITE_ORIGIN } = require('./navigation-source-map.cjs');

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (all, entity) => {
    if (entity[0] !== '#') return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[entity.toLowerCase()];
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : all;
  });
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/\b([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}

function inspectHtml(html) {
  const ids = new Set();
  const hrefs = [];
  // 除去後の断片を連結せず、元HTMLのtokenを一度ずつ読む。
  const tokens = /<!--[\s\S]*?(?:-->|$)|<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)|<([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  for (const match of html.matchAll(tokens)) {
    if (!match[2]) continue;
    const tag = match[2].toLowerCase();
    const attrs = attributes(match[0]);
    if (attrs.id) ids.add(attrs.id);
    if (tag === 'a' && attrs.name) ids.add(attrs.name);
    if (tag === 'a' && attrs.href) hrefs.push(attrs.href);
  }
  return { ids, hrefs };
}

function checkFragments(pages) {
  const parsed = new Map(pages.map(page => [page.publicPath, inspectHtml(page.html)]));
  const issues = [];
  let checked = 0;
  for (const [source, page] of parsed) {
    for (const href of page.hrefs) {
      let url;
      try { url = new URL(href, SITE_ORIGIN + source); } catch { continue; }
      if (![SITE_ORIGIN, 'https://www.playpoint-sim.com'].includes(url.origin) || !url.hash) continue;
      const raw = url.hash.slice(1).split(':~:')[0];
      if (!raw) continue; // Empty/top and text-fragment directives have no element target.
      const target = url.pathname.replace(/\/index\.html$/, '/');
      const destination = parsed.get(target) || parsed.get(target + '/');
      if (!destination) continue; // Non-HTML and missing files belong to the target-existence owner.
      checked += 1;
      let fragment;
      try { fragment = decodeURIComponent(raw); } catch {
        issues.push({ source, href, target, reason: 'invalid-fragment-encoding' });
        continue;
      }
      if (!destination.ids.has(fragment)) issues.push({ source, href, target, fragment, reason: 'missing-fragment' });
    }
  }
  return { checked, issues };
}

function auditFragments(root, pages = audit(root).pages) {
  return checkFragments(pages.map(page => ({ publicPath: page.publicPath, html: fs.readFileSync(path.join(root, page.file), 'utf8') })));
}

module.exports = { auditFragments, checkFragments, inspectHtml };
