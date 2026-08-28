'use strict';

const GENERATED_PROMPT_ATTRIBUTE = 'data-generated-intl-article-prompt="true"';
const GENERATED_PROMPT_PATTERN = /\s*<aside\b(?=[^>]*\bdata-generated-intl-article-prompt=["']true["'])[^>]*>[\s\S]*?<\/aside>/i;
const LEGACY_PROMPT_PATTERN = /\s*<aside\b[^>]*class=["'][^"']*\barticle-calculator-prompt\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/i;

const INTL_PROMPT_COPY = Object.freeze({
  en: Object.freeze({
    aria: 'Estimate the remaining cost for your case',
    label: 'Apply this guide to your account',
    heading: 'How much would you need?',
    body: 'Use the points you still need and the final earn rate shown for the account that will make the purchase. This is an estimate; eligibility and credited points are determined by Google Play.',
    cta: 'Estimate my remaining cost'
  }),
  ko: Object.freeze({
    aria: '내 경우의 남은 필요 금액 계산',
    label: '이 가이드를 내 조건에 적용',
    heading: '내 경우에는 얼마가 필요할까요?',
    body: '실제로 결제할 계정의 남은 포인트와 Google Play에 표시된 최종 적립률로 예상 금액을 계산하세요. 대상 여부와 실제 적립 포인트는 Google Play 표시가 최종 기준입니다.',
    cta: '내 남은 필요 금액 계산'
  }),
  tw: Object.freeze({
    aria: '估算自己情況的剩餘所需金額',
    label: '把指南套用到自己的條件',
    heading: '我的情況還需要多少？',
    body: '請用實際付款帳號還差的點數，以及 Google Play 顯示的最終積點率估算。是否符合資格與實際入帳點數，仍以 Google Play 畫面為準。',
    cta: '估算我的剩餘所需金額'
  })
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findSectionEnd(html, pattern, startIndex, articleEnd) {
  pattern.lastIndex = startIndex;
  const match = pattern.exec(html);
  if (!match || match.index >= articleEnd) return -1;
  const end = html.indexOf('</section>', match.index + match[0].length);
  if (end < 0 || end >= articleEnd) return -1;
  return end + '</section>'.length;
}

function findPromptAnchorEnd(mainHtml) {
  const articleMatch = /<article\b[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>/i.exec(mainHtml);
  if (!articleMatch) return -1;
  const articleStart = articleMatch.index + articleMatch[0].length;
  const articleEndIndex = mainHtml.indexOf('</article>', articleStart);
  const articleEnd = articleEndIndex < 0 ? mainHtml.length : articleEndIndex;

  const knowledgeBoundaryEnd = findSectionEnd(
    mainHtml,
    /<section\b[^>]*class=["'][^"']*\bknowledge-boundary\b[^"']*["'][^>]*>/gi,
    articleStart,
    articleEnd
  );
  if (knowledgeBoundaryEnd >= 0) return knowledgeBoundaryEnd;

  const introductorySectionEnd = findSectionEnd(
    mainHtml,
    /<section\b[^>]*class=["'][^"']*\b(?:answer-box|summary-box|intro)\b[^"']*["'][^>]*>/gi,
    articleStart,
    articleEnd
  );
  return introductorySectionEnd >= 0 ? introductorySectionEnd : articleStart;
}

function renderIntlArticlePrompt(localeKey) {
  const copy = INTL_PROMPT_COPY[localeKey];
  if (!copy) throw new Error('unsupported international article locale: ' + localeKey);
  const homeHref = '/' + localeKey + '/';
  return [
    '',
    '    <aside class="article-calculator-prompt cta-box intl-article-calculator-prompt" ' + GENERATED_PROMPT_ATTRIBUTE + ' aria-label="' + escapeHtml(copy.aria) + '">',
    '      <p class="article-calculator-prompt__label">' + escapeHtml(copy.label) + '</p>',
    '      <h2>' + escapeHtml(copy.heading) + '</h2>',
    '      <p>' + escapeHtml(copy.body) + '</p>',
    '      <a class="article-calculator-prompt__button" href="' + homeHref + '">' + escapeHtml(copy.cta) + '</a>',
    '    </aside>'
  ].join('\n');
}

function insertIntlArticlePrompt(mainHtml, localeKey) {
  const withoutPrompt = String(mainHtml)
    .replace(GENERATED_PROMPT_PATTERN, '')
    .replace(LEGACY_PROMPT_PATTERN, '');
  const anchorEnd = findPromptAnchorEnd(withoutPrompt);
  if (anchorEnd < 0) return withoutPrompt;
  return withoutPrompt.slice(0, anchorEnd)
    + renderIntlArticlePrompt(localeKey)
    + withoutPrompt.slice(anchorEnd);
}

module.exports = {
  GENERATED_PROMPT_ATTRIBUTE,
  GENERATED_PROMPT_PATTERN,
  INTL_PROMPT_COPY,
  LEGACY_PROMPT_PATTERN,
  findPromptAnchorEnd,
  insertIntlArticlePrompt,
  renderIntlArticlePrompt
};
