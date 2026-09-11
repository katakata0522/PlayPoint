'use strict';

const fs = require('node:fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, source) { fs.writeFileSync(file, source); }
function replaceOnce(source, before, after, label) {
  if (after && source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Expected source not found: ${label}`);
  return source.replace(before, after);
}

{
  const file = 'js/region-navigation.js';
  let source = read(file);
  source = replaceOnce(source, "import { createExpansionConfigs } from './region-expansion-config.js';\n", '', 'remove static expansion config import');
  source = replaceOnce(source, "\nObject.assign(CONFIGS, createExpansionConfigs(CONFIGS));\nassertResultNavigationCoverage(Object.keys(CONFIGS));\n", '\n', 'remove eager expansion config initialization');
  const pathsBlock = `const REGION_PATHS = Object.freeze({\n    JP: '',\n    US: 'en/',\n    KR: 'ko/',\n    TW: 'tw/',\n    HK: 'hk/',\n    IN: 'in/'\n});`;
  source = replaceOnce(source, pathsBlock, `${pathsBlock}\n\nconst EXPANSION_REGIONS = new Set(['HK', 'IN']);\nlet expansionConfigPromise = null;\nassertResultNavigationCoverage(Object.keys(REGION_PATHS));`, 'add expansion region lazy state');
  const regionFunction = `function getRegionFromPath() {\n    if (isHongKongPath()) return 'HK';\n    if (isIndiaPath()) return 'IN';\n    if (/\\/en(\\/|$)/.test(window.location.pathname)) return 'US';\n    if (isKoreanPath()) return 'KR';\n    if (/\\/tw(\\/|$)/.test(window.location.pathname)) return 'TW';\n    return 'JP';\n}`;
  source = replaceOnce(source, regionFunction, `${regionFunction}\n\nexport async function prepareRegionConfigForPath() {\n    const region = getRegionFromPath();\n    if (!EXPANSION_REGIONS.has(region) || CONFIGS[region]) return true;\n    if (!expansionConfigPromise) {\n        expansionConfigPromise = import('./region-expansion-config.js')\n            .then(({ createExpansionConfigs }) => {\n                Object.assign(CONFIGS, createExpansionConfigs(CONFIGS));\n                return true;\n            })\n            .catch((error) => {\n                expansionConfigPromise = null;\n                throw error;\n            });\n    }\n    await expansionConfigPromise;\n    return Boolean(CONFIGS[region]);\n}`, 'add expansion config lazy loader');
  source = replaceOnce(source, "    if (!CONFIGS[newRegion] || STATE.currentRegion === newRegion) return;", "    if (STATE.currentRegion === newRegion || REGION_PATHS[newRegion] === undefined) return;\n    if (!CONFIGS[newRegion] && !EXPANSION_REGIONS.has(newRegion)) return;", 'allow navigation to lazy expansion regions');
  write(file, source);
}

{
  const file = 'js/main.js';
  let source = read(file);
  source = replaceOnce(source, "    isTaiwanPath,\n    switchRegion as navigateToRegion", "    isTaiwanPath,\n    prepareRegionConfigForPath,\n    switchRegion as navigateToRegion", 'import prepareRegionConfigForPath');
  source = replaceOnce(source, "document.addEventListener('DOMContentLoaded', () => {\n    init();\n});", "document.addEventListener('DOMContentLoaded', () => {\n    void prepareRegionConfigForPath()\n        .then(() => init())\n        .catch((error) => console.error('地域別設定の読み込みに失敗しました:', error));\n});", 'prepare expansion config before init');
  write(file, source);
}

{
  const file = 'blog/article.js';
  let source = read(file);
  source = replaceOnce(source, "        if (document.querySelector('.reading-time-badge')) return;", "        const existingBadge = document.querySelector('.reading-time-badge');", 'reuse prerendered reading time badge');
  source = replaceOnce(source, "        const badge = document.createElement('span');", "        const badge = existingBadge || document.createElement('span');", 'reuse existing reading time node');
  source = replaceOnce(source, "        if (targetMeta) {\n            targetMeta.appendChild(badge);\n        } else {", "        if (targetMeta) {\n            if (!existingBadge) targetMeta.appendChild(badge);\n        } else if (!existingBadge) {", 'avoid late reading time insertion');
  write(file, source);
}

const readingBadges = [
  ['en/articles/google-play-points-join-eligibility.html', ' · United States guide · 2026-09-11</p>', ' · United States guide · 2026-09-11 <span class="reading-time-badge">⏱️ Approx. 3 min read</span></p>'],
  ['ko/articles/google-play-points-join-eligibility.html', ' · 한국 계정 가이드 · 2026-09-11</p>', ' · 한국 계정 가이드 · 2026-09-11 <span class="reading-time-badge">⏱️ 약 3분 소요</span></p>'],
  ['tw/articles/google-play-points-join-eligibility.html', ' · 台灣帳號指南 · 2026-09-11</p>', ' · 台灣帳號指南 · 2026-09-11 <span class="reading-time-badge">⏱️ 約需 2 分鐘閱讀</span></p>']
];
for (const [file, before, after] of readingBadges) {
  write(file, replaceOnce(read(file), before, after, `prerender reading time badge: ${file}`));
}

{
  const file = 'blog/index.html';
  let source = read(file);
  for (const script of ['utils.js?v=4c76104fa9', 'components.js?v=fcf9eecb18', 'script.js?v=6a19fa50bc']) {
    source = replaceOnce(source, `<script src="${script}"></script>`, `<script src="${script}" defer></script>`, `defer ${script}`);
  }
  write(file, source);
}

{
  const file = 'tests/region-runtime-wiring.test.cjs';
  let source = read(file);
  source = replaceOnce(source, "assert.match(regionNavigation, /assertResultNavigationCoverage\\(Object\\.keys\\(CONFIGS\\)\\)/);", "assert.doesNotMatch(regionNavigation, /import \\{ createExpansionConfigs \\} from '\\.\\/region-expansion-config\\.js';/);\nassert.match(regionNavigation, /import\\('\\.\\/region-expansion-config\\.js'\\)/);\nassert.match(regionNavigation, /export async function prepareRegionConfigForPath\\(\\)/);\nassert.match(regionNavigation, /assertResultNavigationCoverage\\(Object\\.keys\\(REGION_PATHS\\)\\)/);\nassert.match(main, /prepareRegionConfigForPath/);", 'update lazy expansion wiring guard');
  write(file, source);
}
