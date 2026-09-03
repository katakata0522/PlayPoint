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

const TW_CONTEXTUAL_PROMPT_COPY = Object.freeze({
  couponNotApplied: Object.freeze({
    aria: '問題排解後反推原定消費可獲得的點數',
    label: '問題排解完成後的下一步',
    heading: '原本預計消費，可以累積多少點？',
    body: '先完成折價券條件檢查；如果仍要進行原本的購買，再用實際預計消費金額與 Google Play 顯示的最終獲點率反推可獲得點數。',
    cta: '用預計消費金額反推點數',
    href: '/tw/?mode=reverse'
  }),
  platinumDiamond: Object.freeze({
    aria: '估算距離白金或鑽石的剩餘所需金額',
    label: '把官方門檻換成自己的剩餘進度',
    heading: '距離白金／鑽石，我還需要多少？',
    body: '用實際付款帳號目前還差的點數、目前等級，以及 Google Play 顯示的最終獲點率估算，不要直接把全部不足點數套用目標等級的獲點率。',
    cta: '用我的不足點數估算',
    href: '/tw/'
  })
});

const CASH_CONVERSION_H1_PATTERNS = Object.freeze({
  en: /<h1>\s*Can You (?:Convert|Redeem) Google Play Points (?:to|for) Cash\?\s*<\/h1>/i,
  ko: /<h1>\s*구글 플레이 포인트 현금화 가능할까\?\s*<\/h1>/i
});

const TW_CONTEXTUAL_H1_PATTERNS = Object.freeze({
  couponNotApplied: /<h1>\s*Google Play Points 折價券沒有自動套用時\s*<\/h1>/i,
  platinumDiamond: /<h1>\s*台灣 Play Points：白金 4,000 點，鑽石 15,000 點起\s*<\/h1>/i
});

const TW_DUPLICATE_CTA_PATTERNS = Object.freeze({
  couponNotApplied: /\s*<div\b[^>]*class=["'][^"']*\bcta-box\b[^"']*["'][^>]*>\s*<h3>再次購買前先確認條件<\/h3>[\s\S]*?<\/div>/i,
  platinumDiamond: /\s*<div\b[^>]*class=["'][^"']*\bcta-box\b[^"']*["'][^>]*>\s*<h3>用自己的不足點數計算<\/h3>[\s\S]*?<\/div>/i
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findArticleBounds(html) {
  const articleMatch = /<article\b[^>]*class=["'][^"']*\bcontent\b[^"']*["'][^>]*>/i.exec(html);
  if (!articleMatch) return null;
  const start = articleMatch.index + articleMatch[0].length;
  const articleEndIndex = html.indexOf('</article>', start);
  return {
    start,
    end: articleEndIndex < 0 ? html.length : articleEndIndex
  };
}

function findSectionEnd(html, pattern, startIndex, articleEnd) {
  pattern.lastIndex = startIndex;
  const match = pattern.exec(html);
  if (!match || match.index >= articleEnd) return -1;
  const end = html.indexOf('</section>', match.index + match[0].length);
  if (end < 0 || end >= articleEnd) return -1;
  return end + '</section>'.length;
}

function findDivEnd(html, pattern, startIndex, articleEnd) {
  pattern.lastIndex = startIndex;
  const match = pattern.exec(html);
  if (!match || match.index >= articleEnd) return -1;
  const end = html.indexOf('</div>', match.index + match[0].length);
  if (end < 0 || end >= articleEnd) return -1;
  return end + '</div>'.length;
}

function findPromptAnchorEnd(mainHtml) {
  const bounds = findArticleBounds(mainHtml);
  if (!bounds) return -1;

  const knowledgeBoundaryEnd = findSectionEnd(
    mainHtml,
    /<section\b[^>]*class=["'][^"']*\bknowledge-boundary\b[^"']*["'][^>]*>/gi,
    bounds.start,
    bounds.end
  );
  if (knowledgeBoundaryEnd >= 0) return knowledgeBoundaryEnd;

  const introductorySectionEnd = findSectionEnd(
    mainHtml,
    /<section\b[^>]*class=["'][^"']*\b(?:answer-box|summary-box|intro)\b[^"']*["'][^>]*>/gi,
    bounds.start,
    bounds.end
  );
  return introductorySectionEnd >= 0 ? introductorySectionEnd : bounds.start;
}

function findCashConversionAlternativeEnd(mainHtml, localeKey) {
  const h1Pattern = CASH_CONVERSION_H1_PATTERNS[localeKey];
  if (!h1Pattern || !h1Pattern.test(mainHtml)) return -1;

  const bounds = findArticleBounds(mainHtml);
  if (!bounds) return -1;

  return findSectionEnd(
    mainHtml,
    /<section\b[^>]*>[\s\S]*?<h2\b[^>]*id=["']alternatives["'][^>]*>/gi,
    bounds.start,
    bounds.end
  );
}

function detectTwContext(mainHtml, localeKey) {
  if (localeKey !== 'tw') return null;
  for (const [key, pattern] of Object.entries(TW_CONTEXTUAL_H1_PATTERNS)) {
    if (pattern.test(mainHtml)) return key;
  }
  return null;
}

function removeContextualDuplicateCta(mainHtml, localeKey) {
  const contextKey = detectTwContext(mainHtml, localeKey);
  if (!contextKey) return mainHtml;
  const pattern = TW_DUPLICATE_CTA_PATTERNS[contextKey];
  return pattern ? String(mainHtml).replace(pattern, '') : mainHtml;
}

function findTwContextualAnchorEnd(mainHtml, contextKey) {
  const bounds = findArticleBounds(mainHtml);
  if (!bounds) return -1;

  if (contextKey === 'couponNotApplied') {
    return findSectionEnd(
      mainHtml,
      /<section\b[^>]*>[\s\S]*?<h2\b[^>]*id=["']section-5["'][^>]*>/gi,
      bounds.start,
      bounds.end
    );
  }

  if (contextKey === 'platinumDiamond') {
    return findDivEnd(
      mainHtml,
      /<div\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>/gi,
      bounds.start,
      bounds.end
    );
  }

  return -1;
}

function renderIntlArticlePrompt(localeKey, copyOverride = null) {
  const copy = copyOverride || INTL_PROMPT_COPY[localeKey];
  if (!copy) throw new Error('unsupported international article locale: ' + localeKey);
  const homeHref = copy.href || '/' + localeKey + '/';
  return [
    '',
    '    <aside class="article-calculator-prompt cta-box intl-article-calculator-prompt" ' + GENERATED_PROMPT_ATTRIBUTE + ' aria-label="' + escapeHtml(copy.aria) + '">',
    '      <p class="article-calculator-prompt__label">' + escapeHtml(copy.label) + '</p>',
    '      <h2>' + escapeHtml(copy.heading) + '</h2>',
    '      <p>' + escapeHtml(copy.body) + '</p>',
    '      <a class="article-calculator-prompt__button" href="' + escapeHtml(homeHref) + '">' + escapeHtml(copy.cta) + '</a>',
    '    </aside>'
  ].join('\n');
}

function insertIntlArticlePrompt(mainHtml, localeKey) {
  const strippedPrompt = String(mainHtml)
    .replace(GENERATED_PROMPT_PATTERN, '')
    .replace(LEGACY_PROMPT_PATTERN, '');
  const withoutPrompt = removeContextualDuplicateCta(strippedPrompt, localeKey);
  const twContextKey = detectTwContext(withoutPrompt, localeKey);
  const contextualAnchorEnd = twContextKey
    ? findTwContextualAnchorEnd(withoutPrompt, twContextKey)
    : -1;
  const cashConversionAnchorEnd = contextualAnchorEnd < 0
    ? findCashConversionAlternativeEnd(withoutPrompt, localeKey)
    : -1;
  const anchorEnd = contextualAnchorEnd >= 0
    ? contextualAnchorEnd
    : (cashConversionAnchorEnd >= 0 ? cashConversionAnchorEnd : findPromptAnchorEnd(withoutPrompt));
  if (anchorEnd < 0) return withoutPrompt;
  const copy = twContextKey ? TW_CONTEXTUAL_PROMPT_COPY[twContextKey] : null;
  return withoutPrompt.slice(0, anchorEnd)
    + renderIntlArticlePrompt(localeKey, copy)
    + withoutPrompt.slice(anchorEnd);
}

module.exports = {
  CASH_CONVERSION_H1_PATTERNS,
  GENERATED_PROMPT_ATTRIBUTE,
  GENERATED_PROMPT_PATTERN,
  INTL_PROMPT_COPY,
  LEGACY_PROMPT_PATTERN,
  TW_CONTEXTUAL_H1_PATTERNS,
  TW_CONTEXTUAL_PROMPT_COPY,
  detectTwContext,
  findCashConversionAlternativeEnd,
  findPromptAnchorEnd,
  findTwContextualAnchorEnd,
  insertIntlArticlePrompt,
  removeContextualDuplicateCta,
  renderIntlArticlePrompt
};