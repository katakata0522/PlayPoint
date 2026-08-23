'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REGION_ALTERNATES = Object.freeze([
  ['ja', 'https://playpoint-sim.com/'],
  ['en', 'https://playpoint-sim.com/en/'],
  ['ko', 'https://playpoint-sim.com/ko/'],
  ['zh-TW', 'https://playpoint-sim.com/tw/'],
  ['zh-HK', 'https://playpoint-sim.com/hk/'],
  ['en-IN', 'https://playpoint-sim.com/in/']
]);

function normalizeTopPageHreflang(html) {
  let next = html;
  for (const [hreflang] of REGION_ALTERNATES) {
    next = next.replace(new RegExp(`\\s*<link rel="alternate" hreflang="${hreflang}"[^>]*>`, 'g'), '');
  }
  next = next.replace(/\s*<link rel="alternate" hreflang="x-default"[^>]*>/g, '');

  const canonicalMatch = next.match(/<link rel="canonical" href="[^"]+">/);
  if (!canonicalMatch) throw new Error('Top page canonical link is missing.');

  const block = REGION_ALTERNATES
    .map(([hreflang, href]) => `    <link rel="alternate" hreflang="${hreflang}" href="${href}">`)
    .concat('    <link rel="alternate" hreflang="x-default" href="https://playpoint-sim.com/">')
    .join('\n');

  return next.replace(canonicalMatch[0], `${canonicalMatch[0]}\n${block}`);
}

function syncRegionHreflang(rootDir) {
  const targets = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html'];
  let changed = 0;
  for (const target of targets) {
    const filePath = path.join(rootDir, target);
    if (!fs.existsSync(filePath)) continue;
    const original = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizeTopPageHreflang(original).replace(/\r\n/g, '\n');
    if (normalized !== original.replace(/\r\n/g, '\n')) {
      fs.writeFileSync(filePath, normalized, 'utf8');
      changed += 1;
    }
  }
  console.log(`[region-hreflang] synchronized ${changed} top pages`);
  return changed;
}

module.exports = {
  REGION_ALTERNATES,
  normalizeTopPageHreflang,
  syncRegionHreflang
};
