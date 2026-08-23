'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VISITOR_THANKS_BY_LOCALE = Object.freeze({
  ko: {
    ariaLabel: '감사 메시지',
    lead: '한국에서 정말 많은 분들이 이 사이트를 찾아주고 계세요!',
    body: '찾아와 주셔서 정말 감사합니다.',
    signature: '일본에서, 사랑과 감사의 마음을 담아.',
    flagsAriaLabel: '일본과 한국',
    flags: '🇯🇵🇰🇷'
  },
  tw: {
    ariaLabel: '感謝訊息',
    lead: '真的有很多來自台灣的朋友造訪這個網站！',
    body: '真的非常謝謝大家的到來。',
    signature: '來自日本，帶著滿滿的愛與感謝。',
    flagsAriaLabel: '日本與台灣',
    flags: '🇯🇵🇹🇼'
  }
});

function buildVisitorThanksMarkup(config) {
  return `    <div class="visitor-thanks" role="note" aria-label="${config.ariaLabel}">\n` +
    `        <p class="visitor-thanks__lead">${config.lead}</p>\n` +
    `        <p class="visitor-thanks__body">${config.body}</p>\n` +
    `        <p class="visitor-thanks__signature">${config.signature} <span class="visitor-thanks__flags" aria-label="${config.flagsAriaLabel}">${config.flags}</span></p>\n` +
    '    </div>';
}

function applyVisitorThanksToHtml(html, config) {
  const stylesheetPattern = /(<link rel="stylesheet" href="\.\.\/style\.css[^\"]*">)/;
  if (!stylesheetPattern.test(html)) {
    throw new Error('visitor-thanks: shared stylesheet anchor was not found');
  }

  let output = html.replace(
    stylesheetPattern,
    '$1\n    <link rel="stylesheet" href="../visitor-thanks.css">'
  );

  const descriptionPattern = /(<p id="site-description"\b[^>]*>[\s\S]*?<\/p>)/;
  if (!descriptionPattern.test(output)) {
    throw new Error('visitor-thanks: site description anchor was not found');
  }

  output = output.replace(
    descriptionPattern,
    `$1\n\n${buildVisitorThanksMarkup(config)}`
  );

  return output;
}

function syncVisitorThanks(rootDir) {
  let updated = 0;

  for (const [locale, config] of Object.entries(VISITOR_THANKS_BY_LOCALE)) {
    const file = path.join(rootDir, locale, 'index.html');
    const original = fs.readFileSync(file, 'utf8');
    const next = applyVisitorThanksToHtml(original, config);
    if (next !== original) {
      fs.writeFileSync(file, next, 'utf8');
      updated += 1;
    }
  }

  console.log(`[visitor-thanks] synchronized localized messages: ${updated}`);
  return updated;
}

module.exports = {
  VISITOR_THANKS_BY_LOCALE,
  applyVisitorThanksToHtml,
  buildVisitorThanksMarkup,
  syncVisitorThanks
};
