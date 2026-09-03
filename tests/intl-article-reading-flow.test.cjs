'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const {
  INTL_PROMPT_COPY,
  TW_CONTEXTUAL_PROMPT_COPY,
  insertIntlArticlePrompt
} = require(path.join(root, 'scripts', 'intl-article-reading-flow.cjs'));

const locales = ['en', 'ko', 'tw'];

test('international article prompt is localized, idempotent, and placed after the quick answer', () => {
  for (const locale of locales) {
    const input = '<main class="main-card"><article class="content"><section class="answer-box"><h2>Answer</h2><p>Summary.</p></section><section class="section"><h2>Details</h2></section></article></main>';
    const first = insertIntlArticlePrompt(input, locale);
    const second = insertIntlArticlePrompt(first, locale);
    const copy = INTL_PROMPT_COPY[locale];

    assert.equal(second, first, locale + ': prompt insertion must be idempotent');
    assert.equal((first.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1, locale + ': exactly one generated prompt');
    assert.ok(first.indexOf('</section>') < first.indexOf('data-generated-intl-article-prompt="true"'), locale + ': prompt follows the quick answer');
    assert.ok(first.indexOf('data-generated-intl-article-prompt="true"') < first.indexOf('<section class="section">'), locale + ': prompt precedes the detailed article body');
    assert.ok(first.includes(copy.heading), locale + ': localized heading');
    assert.ok(first.includes(copy.cta), locale + ': localized CTA copy');
    assert.ok(first.includes('href="/' + locale + '/"'), locale + ': CTA returns to the locale calculator');
  }
});

test('international article prompt respects a knowledge boundary when one is present', () => {
  const input = '<main class="main-card"><article class="content"><section class="answer-box"><p>Answer.</p></section><section class="knowledge-boundary"><h2>Known</h2></section><section class="section"><h2>Details</h2></section></article></main>';
  const output = insertIntlArticlePrompt(input, 'en');
  const knowledgeEnd = output.indexOf('</section>', output.indexOf('knowledge-boundary')) + '</section>'.length;
  const promptIndex = output.indexOf('data-generated-intl-article-prompt="true"');
  assert.ok(promptIndex > knowledgeEnd, 'prompt must follow the article-specific knowledge boundary');
});

function assertCashConversionPromptOrder({ input, locale, label }) {
  const output = insertIntlArticlePrompt(input, locale);
  const alternativeEnd = output.indexOf('</section>', output.indexOf('id="alternatives"')) + '</section>'.length;
  const promptIndex = output.indexOf('data-generated-intl-article-prompt="true"');
  const creditIndex = output.indexOf('id="credit"');

  assert.ok(promptIndex > alternativeEnd, label + ': calculator prompt must follow the practical alternatives');
  assert.ok(promptIndex < creditIndex, label + ': calculator prompt should stay near the answer, before secondary detail');
  assert.equal((output.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1, label + ': exactly one generated prompt');
}

test('English cash-conversion article answers and shows alternatives before the calculator prompt', () => {
  const input = '<main class="main-card"><div class="hero"><h1>Can You Redeem Google Play Points for Cash?</h1></div><article class="content"><div class="intro"><strong>No cash-out.</strong> Supported rewards can still reduce planned Google Play spending.</div><section class="section"><h2 id="answer">What you can and cannot do</h2></section><section class="section"><h2 id="alternatives">What to do instead of cashing out</h2><p>Alternatives.</p></section><section class="section"><h2 id="credit">Why Play credit is not cash</h2></section></article></main>';
  assertCashConversionPromptOrder({ input, locale: 'en', label: 'English cash-conversion' });
});

test('Korean cash-conversion article answers and shows alternatives before the calculator prompt', () => {
  const input = '<main class="main-card"><div class="hero"><h1>구글 플레이 포인트 현금화 가능할까?</h1></div><article class="content"><div class="intro"><strong>현금화는 불가합니다.</strong> 대신 공식 리워드로 사용할 수 있습니다.</div><section class="section"><h2 id="answer">가능한 것과 불가능한 것</h2></section><section class="section"><h2 id="alternatives">현금화 대신 이렇게 쓰는 것이 현실적입니다</h2><p>대안.</p></section><section class="section"><h2 id="credit">Play 크레딧은 현금이 아니다</h2></section></article></main>';
  assertCashConversionPromptOrder({ input, locale: 'ko', label: 'Korean cash-conversion' });
});

test('Taiwan coupon troubleshooting waits until the resolution steps are complete, then opens reverse mode', () => {
  const input = '<main class="main-card"><div class="hero"><h1>Google Play Points 折價券沒有自動套用時</h1></div><article class="content"><aside class="article-calculator-prompt cta-box" data-generated-intl-article-prompt="true"><h2>old</h2></aside><div class="intro">先確認折價券條件。</div><section class="section"><h2 id="section-1">第一步</h2></section><section class="section"><h2 id="section-5">條件都符合仍未套用</h2><p>完成問題排解。</p></section><div class="cta-box"><h3>再次購買前先確認條件</h3><p>duplicate</p><a href="/tw/">開啟計算器</a></div><aside class="official-source-note"></aside></article></main>';
  const output = insertIntlArticlePrompt(input, 'tw');
  const resolutionEnd = output.indexOf('</section>', output.indexOf('id="section-5"')) + '</section>'.length;
  const promptIndex = output.indexOf('data-generated-intl-article-prompt="true"');
  const sourceIndex = output.indexOf('official-source-note');
  const copy = TW_CONTEXTUAL_PROMPT_COPY.couponNotApplied;

  assert.ok(promptIndex > resolutionEnd, 'coupon prompt must not interrupt troubleshooting');
  assert.ok(promptIndex < sourceIndex, 'coupon prompt should be the next action after troubleshooting');
  assert.ok(output.includes(copy.heading));
  assert.ok(output.includes(copy.cta));
  assert.ok(output.includes('href="/tw/?mode=reverse"'));
  assert.ok(!output.includes('再次購買前先確認條件'), 'duplicate lower CTA must be removed');
  assert.equal((output.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1);
});

test('Taiwan platinum/diamond article gives the threshold answer before one calculator CTA', () => {
  const input = '<main class="main-card"><div class="hero"><h1>台灣 Play Points：白金 4,000 點，鑽石 15,000 點起</h1></div><article class="content"><aside class="article-calculator-prompt cta-box" data-generated-intl-article-prompt="true"><h2>old</h2></aside><div class="intro"><strong>白金 4,000，鑽石 15,000。</strong></div><section class="section"><h2>台灣官方門檻與積點率</h2></section><div class="cta-box"><h3>用自己的不足點數計算</h3><p>duplicate</p><a href="/tw/status/platinum/">舊導線</a></div></article></main>';
  const output = insertIntlArticlePrompt(input, 'tw');
  const introEnd = output.indexOf('</div>', output.indexOf('class="intro"')) + '</div>'.length;
  const promptIndex = output.indexOf('data-generated-intl-article-prompt="true"');
  const detailIndex = output.indexOf('<section class="section">');
  const copy = TW_CONTEXTUAL_PROMPT_COPY.platinumDiamond;

  assert.ok(promptIndex > introEnd, 'rank-cost prompt must follow the direct threshold answer');
  assert.ok(promptIndex < detailIndex, 'rank-cost prompt should remain before secondary detail');
  assert.ok(output.includes(copy.heading));
  assert.ok(output.includes(copy.cta));
  assert.ok(output.includes('href="/tw/"'));
  assert.ok(!output.includes('用自己的不足點數計算'), 'duplicate lower CTA must be removed');
  assert.ok(!output.includes('/tw/status/platinum/'), 'article should go directly to the calculator instead of another LP');
  assert.equal((output.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1);
});

const contextualPublishedPrompts = Object.freeze({
  'tw/google-play-points-coupon-not-applied.html': TW_CONTEXTUAL_PROMPT_COPY.couponNotApplied,
  'tw/google-play-points-platinum-diamond-cost.html': TW_CONTEXTUAL_PROMPT_COPY.platinumDiamond
});

test('all published international article pages contain one localized reading-flow prompt', () => {
  for (const locale of locales) {
    const articleDir = path.join(root, locale, 'articles');
    const files = fs.readdirSync(articleDir).filter(file => file.endsWith('.html') && file !== 'index.html');
    assert.ok(files.length > 0, locale + ': article pages are missing');

    for (const file of files) {
      const html = fs.readFileSync(path.join(articleDir, file), 'utf8');
      const contextualCopy = contextualPublishedPrompts[locale + '/' + file];
      const expectedCopy = contextualCopy || INTL_PROMPT_COPY[locale];
      const expectedHref = contextualCopy?.href || '/' + locale + '/';
      assert.equal((html.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1, locale + '/' + file + ': exactly one generated prompt');
      assert.ok(html.includes(expectedCopy.cta), locale + '/' + file + ': localized/contextual CTA copy');
      assert.ok(html.includes('href="' + expectedHref + '"'), locale + '/' + file + ': calculator target');
    }
  }
});