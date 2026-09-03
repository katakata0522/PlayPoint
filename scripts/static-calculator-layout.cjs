'use strict';

const STATIC_LABELS = Object.freeze({
  baseRate: '100円あたりの獲得率（自動入力・編集可）',
  multiplier: 'キャンペーン特別獲得率（例：3pt/100円）'
});

const ADVANCED_SETTINGS_ID = 'calculator-advanced-settings';
const ADVANCED_SETTINGS_BODY_ID = 'calculator-advanced-settings-body';
const ADVANCED_SETTINGS_STYLE_ID = 'playpoint-first-view-critical';
const ADVANCED_SETTINGS_STATE_SCRIPT_ID = 'playpoint-first-view-state';

const ADVANCED_SETTINGS_COPY = Object.freeze({
  ja: '獲得率・キャンペーンを調整（任意）',
  en: 'Adjust earn rates & promotion (optional)',
  ko: '적립률·프로모션 조정 (선택)',
  tw: '調整獲點率與活動（選填）',
  hk: '調整獲點率與活動（選填）'
});

const ADVANCED_SETTINGS_CRITICAL_STYLE = `<style id="${ADVANCED_SETTINGS_STYLE_ID}">
.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}
.calculator-advanced-settings__toggle{display:none}
.calculator-advanced-settings__copy{display:none}
html[lang="ja"] .calculator-advanced-settings__copy--ja{display:inline}
html[lang^="en"] .calculator-advanced-settings__copy--en{display:inline}
html[lang^="ko"] .calculator-advanced-settings__copy--ko{display:inline}
html[lang="zh-TW"] .calculator-advanced-settings__copy--tw{display:inline}
html[lang="zh-HK"] .calculator-advanced-settings__copy--hk{display:inline}
.region-switch [data-region-recommended="true"]{outline:2px solid var(--input-focus-border-color,#005fcc);outline-offset:2px;box-shadow:0 0 0 1px color-mix(in srgb,var(--section-bg-color,#fff) 80%,transparent)}
@media(max-width:640px){
.calculator-advanced-settings{display:block;margin-top:.85em}
.calculator-advanced-settings__toggle{display:flex;align-items:center;justify-content:space-between;gap:.75em;width:100%;min-height:46px;margin:0;padding:.65em .8em;box-sizing:border-box;border:1px solid rgba(11,87,208,.22);border-radius:8px;background:rgba(11,87,208,.055);color:var(--text-color,#1f2937);box-shadow:none;font:inherit;font-weight:700;text-align:left;cursor:pointer}
.calculator-advanced-settings__toggle:hover{background:rgba(11,87,208,.1);box-shadow:none;transform:none}
.calculator-advanced-settings__toggle:focus-visible{outline:3px solid var(--input-focus-border-color,#005fcc);outline-offset:2px}
.calculator-advanced-settings__chevron{flex:0 0 auto;font-size:.9em;transition:transform .18s ease}
.calculator-advanced-settings.is-open .calculator-advanced-settings__chevron,html[data-playpoint-advanced-settings="open"] .calculator-advanced-settings__chevron{transform:rotate(180deg)}
.calculator-advanced-settings__body{display:block;margin-top:.7em}
.calculator-advanced-settings:not(.is-open) .calculator-advanced-settings__body{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}
html[data-playpoint-advanced-settings="open"] .calculator-advanced-settings:not(.is-open) .calculator-advanced-settings__body{position:static!important;width:auto!important;height:auto!important;margin-top:.7em!important;padding:initial!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:normal!important}}
@media(prefers-reduced-motion:reduce){.calculator-advanced-settings__chevron{transition:none}}
</style>`;

const ADVANCED_SETTINGS_STATE_SCRIPT = `<script id="${ADVANCED_SETTINGS_STATE_SCRIPT_ID}">(function(){try{var p=new URLSearchParams(location.search);if(p.get('mode')==='main'&&Number(p.get('multiplier'))>1){document.documentElement.dataset.playpointAdvancedSettings='open';}}catch(e){}})();</script>`;

function findBalancedElementRange(content, openingIndex, tagName) {
  if (openingIndex < 0) return null;
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = openingIndex;
  let depth = 0;
  let first = true;

  for (let match = tagPattern.exec(content); match; match = tagPattern.exec(content)) {
    if (first && match.index !== openingIndex) return null;
    first = false;

    const isClosingTag = /^<\//.test(match[0]);
    const isSelfClosingTag = /\/>$/.test(match[0]);
    if (isClosingTag) {
      depth -= 1;
    } else if (!isSelfClosingTag) {
      depth += 1;
    }

    if (depth === 0) {
      return { start: openingIndex, end: tagPattern.lastIndex };
    }
  }

  return null;
}

function findLabelRange(content, inputId) {
  const labelPattern = new RegExp(`<label\\b[^>]*\\bfor=["']${inputId}["'][^>]*>`, 'i');
  const match = labelPattern.exec(content);
  return match ? findBalancedElementRange(content, match.index, 'label') : null;
}

function findInputRange(content, inputId) {
  const inputPattern = new RegExp(`<input\\b[^>]*\\bid=["']${inputId}["'][^>]*>`, 'i');
  const match = inputPattern.exec(content);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

function findWarningRange(content) {
  const warningPattern = /<div\b[^>]*\bdata-lang-key=["']warningRate["'][^>]*>/i;
  const match = warningPattern.exec(content);
  return match ? findBalancedElementRange(content, match.index, 'div') : null;
}

function findContainingSectionRange(content, childIndex) {
  const sectionOpening = '<div class="section">';
  const openingIndex = content.lastIndexOf(sectionOpening, childIndex);
  return findBalancedElementRange(content, openingIndex, 'div');
}

function normalizeIndent(fragment, spaces = 12) {
  const lines = fragment.trim().split('\n');
  const prefix = ' '.repeat(spaces);
  if (lines.length === 1) return `${prefix}${lines[0]}`;

  const trailingIndents = lines
    .slice(1)
    .filter(line => line.trim())
    .map(line => line.match(/^\s*/)[0].length);
  const commonTrailingIndent = trailingIndents.length ? Math.min(...trailingIndents) : 0;

  return lines
    .map((line, index) => {
      if (!line.trim()) return '';
      if (index === 0) return `${prefix}${line}`;
      const leadingIndent = line.match(/^\s*/)[0].length;
      return `${prefix}${line.slice(Math.min(commonTrailingIndent, leadingIndent))}`;
    })
    .join('\n');
}

function removeWhitespaceOnlyLines(content) {
  return content.replace(/^[ \t]+$/gm, '');
}

function decorateStaticLabels(content) {
  return content
    .replace(
      /<span\b[^>]*(?:\bdata-lang-key=["']labelBaseRate["']|\bdata-simplified-calculator-copy=["']baseRateLabel["'])[^>]*>[\s\S]*?<\/span>/i,
      `<span data-simplified-calculator-copy="baseRateLabel">${STATIC_LABELS.baseRate}</span>`
    )
    .replace(
      /<span\b[^>]*(?:\bdata-lang-key=["']labelMultiplier["']|\bdata-simplified-calculator-copy=["']multiplierLabel["'])[^>]*>[\s\S]*?<\/span>/i,
      `<span data-simplified-calculator-copy="multiplierLabel">${STATIC_LABELS.multiplier}</span>`
    );
}

function normalizeStaticCalculatorFormatting(content) {
  const ranges = [
    findLabelRange(content, 'baseRate'),
    findInputRange(content, 'baseRate'),
    findLabelRange(content, 'multiplier'),
    findInputRange(content, 'multiplier'),
    findWarningRange(content)
  ].filter(Boolean).sort((a, b) => b.start - a.start);

  for (const range of ranges) {
    const lineStart = content.lastIndexOf('\n', range.start - 1) + 1;
    const normalized = normalizeIndent(content.slice(range.start, range.end));
    content = `${content.slice(0, lineStart)}${normalized}${content.slice(range.end)}`;
  }

  const baseRateRange = findInputRange(content, 'baseRate');
  const statusSectionRange = baseRateRange && findContainingSectionRange(content, baseRateRange.start);
  if (statusSectionRange) {
    const closingTagStart = content.lastIndexOf('</div>', statusSectionRange.end - 1);
    const closingLineStart = content.lastIndexOf('\n', closingTagStart) + 1;
    if (closingTagStart >= closingLineStart) {
      content = `${content.slice(0, closingLineStart)}        ${content.slice(closingTagStart)}`;
    }
  }

  return removeWhitespaceOnlyLines(content);
}

function markStaticLayout(content) {
  return content.replace(
    /<div id="mainMode"([^>]*)>/,
    (match, attributes) => attributes.includes('data-visible-base-rate-layout=')
      ? match
      : `<div id="mainMode"${attributes} data-visible-base-rate-layout="true">`
  );
}

function buildAdvancedSettingsToggle() {
  const copies = Object.entries(ADVANCED_SETTINGS_COPY)
    .map(([key, value]) => `<span class="calculator-advanced-settings__copy calculator-advanced-settings__copy--${key}">${value}</span>`)
    .join('');
  return `<button type="button" class="calculator-advanced-settings__toggle" aria-controls="${ADVANCED_SETTINGS_BODY_ID}" aria-expanded="false"><span>${copies}</span><span class="calculator-advanced-settings__chevron" aria-hidden="true">⌄</span></button>`;
}

function ensureCriticalFirstViewAssets(content) {
  if (!content.includes(`id="${ADVANCED_SETTINGS_STYLE_ID}"`)) {
    content = content.replace('</head>', `    ${ADVANCED_SETTINGS_CRITICAL_STYLE}\n    ${ADVANCED_SETTINGS_STATE_SCRIPT}\n</head>`);
  } else if (!content.includes(`id="${ADVANCED_SETTINGS_STATE_SCRIPT_ID}"`)) {
    content = content.replace('</head>', `    ${ADVANCED_SETTINGS_STATE_SCRIPT}\n</head>`);
  }
  return content;
}

function ensureStaticAdvancedSettings(content) {
  if (content.includes(`id="${ADVANCED_SETTINGS_ID}"`)) return ensureCriticalFirstViewAssets(content);

  const baseRateLabelRange = findLabelRange(content, 'baseRate');
  const warningRange = findWarningRange(content);
  if (!baseRateLabelRange || !warningRange || warningRange.end <= baseRateLabelRange.start) {
    throw new Error('詳細設定の静的化に必要な範囲を取得できません。');
  }

  const fields = content.slice(baseRateLabelRange.start, warningRange.end).trim();
  const wrapper = [
    `<div id="${ADVANCED_SETTINGS_ID}" class="calculator-advanced-settings">`,
    `  ${buildAdvancedSettingsToggle()}`,
    `  <div id="${ADVANCED_SETTINGS_BODY_ID}" class="calculator-advanced-settings__body" role="group">`,
    normalizeIndent(fields, 4),
    '  </div>',
    '</div>'
  ].join('\n');

  content = `${content.slice(0, baseRateLabelRange.start)}${wrapper}${content.slice(warningRange.end)}`;
  return ensureCriticalFirstViewAssets(content);
}

function validateStaticLayout(content) {
  const requiredTokens = [
    'data-visible-base-rate-layout="true"',
    'id="currentStatus"',
    'id="targetStatus"',
    'id="neededPoints"',
    'id="baseRate"',
    'id="multiplier"',
    'data-simplified-calculator-copy="baseRateLabel"',
    'data-simplified-calculator-copy="multiplierLabel"',
    `id="${ADVANCED_SETTINGS_ID}"`,
    `id="${ADVANCED_SETTINGS_BODY_ID}"`,
    'calculator-advanced-settings__toggle',
    `id="${ADVANCED_SETTINGS_STYLE_ID}"`,
    `id="${ADVANCED_SETTINGS_STATE_SCRIPT_ID}"`
  ];

  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      throw new Error(`通常計算の静的レイアウトに必要な要素がありません: ${token}`);
    }
  }

  if (content.includes('id="pack-amount"')) {
    throw new Error('通常計算に平均パック額の入力欄が残っています。');
  }

  const positions = [
    'id="currentStatus"',
    'id="targetStatus"',
    'id="neededPoints"',
    `id="${ADVANCED_SETTINGS_ID}"`,
    'id="baseRate"',
    'id="multiplier"',
    'id="calculateButton"'
  ].map(token => content.indexOf(token));

  if (positions.some(position => position < 0)
      || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
    throw new Error('通常計算の入力順序が想定どおりではありません。');
  }
}

function ensureStaticCalculatorLayout(indexHtml) {
  let content = markStaticLayout(indexHtml);

  if (indexHtml.includes('data-visible-base-rate-layout="true"')) {
    content = normalizeStaticCalculatorFormatting(decorateStaticLabels(content));
    content = ensureStaticAdvancedSettings(content);
    validateStaticLayout(content);
    return content;
  }

  const neededPointsRange = findInputRange(content, 'neededPoints');
  const baseRateLabelRange = findLabelRange(content, 'baseRate');
  const baseRateInputRange = findInputRange(content, 'baseRate');
  const multiplierLabelRange = findLabelRange(content, 'multiplier');
  const multiplierInputRange = findInputRange(content, 'multiplier');
  const warningRange = findWarningRange(content);

  const requiredRanges = {
    neededPointsRange,
    baseRateLabelRange,
    baseRateInputRange,
    multiplierLabelRange,
    multiplierInputRange,
    warningRange
  };
  for (const [name, range] of Object.entries(requiredRanges)) {
    if (!range) throw new Error(`通常計算の静的化に必要な範囲を取得できません: ${name}`);
  }

  const rateSectionRange = findContainingSectionRange(content, baseRateLabelRange.start);
  if (!rateSectionRange) throw new Error('還元設定セクションを取得できません。');

  const packInputRange = findInputRange(content, 'pack-amount');
  let packSettingsRange = null;
  if (packInputRange) {
    const packSettingsOpening = content.lastIndexOf('<div class="option-settings">', packInputRange.start);
    packSettingsRange = findBalancedElementRange(content, packSettingsOpening, 'div');
    if (!packSettingsRange) throw new Error('平均パック額の設定範囲を取得できません。');
  }

  const baseRateLabel = decorateStaticLabels(content.slice(baseRateLabelRange.start, baseRateLabelRange.end));
  const multiplierLabel = decorateStaticLabels(content.slice(multiplierLabelRange.start, multiplierLabelRange.end));
  const insertedFields = [
    baseRateLabel,
    content.slice(baseRateInputRange.start, baseRateInputRange.end),
    multiplierLabel,
    content.slice(multiplierInputRange.start, multiplierInputRange.end),
    content.slice(warningRange.start, warningRange.end)
  ].map(fragment => normalizeIndent(fragment)).join('\n\n');

  const removalRanges = [rateSectionRange, packSettingsRange]
    .filter(Boolean)
    .sort((a, b) => b.start - a.start);
  for (const range of removalRanges) {
    content = `${content.slice(0, range.start)}${content.slice(range.end)}`;
  }

  content = content.replace(/^[ \t]*<!-- オプション設定（平均パック額） -->[ \t]*\r?\n?/gm, '');

  const refreshedNeededPointsRange = findInputRange(content, 'neededPoints');
  if (!refreshedNeededPointsRange) throw new Error('必要ポイント入力欄を再取得できません。');
  content = `${content.slice(0, refreshedNeededPointsRange.end)}\n\n${insertedFields}${content.slice(refreshedNeededPointsRange.end)}`;
  content = normalizeStaticCalculatorFormatting(decorateStaticLabels(content));
  content = ensureStaticAdvancedSettings(content);

  validateStaticLayout(content);
  return content;
}

module.exports = {
  ADVANCED_SETTINGS_BODY_ID,
  ADVANCED_SETTINGS_ID,
  ADVANCED_SETTINGS_STYLE_ID,
  STATIC_LABELS,
  decorateStaticLabels,
  ensureStaticAdvancedSettings,
  ensureStaticCalculatorLayout,
  findBalancedElementRange,
  validateStaticLayout
};
