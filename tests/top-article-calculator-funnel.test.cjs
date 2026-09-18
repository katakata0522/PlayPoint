'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('日本語クエスト記事はRetention回答と条件境界の後に文脈CTAだけを置く', () => {
  const html = read('articles/2026-07-31-google-play-quests.html');
  const answerIndex = html.indexOf('id="quick-answer"');
  const boundaryIndex = html.indexOf('class="knowledge-boundary"');
  const boundaryEnd = html.indexOf('</section>', boundaryIndex) + '</section>'.length;
  const contextualCtaIndex = html.indexOf('aria-labelledby="next-action" class="cta-box"');

  assert.ok(answerIndex >= 0, 'quick answer is missing');
  assert.ok(boundaryIndex >= 0, 'knowledge boundary is missing');
  assert.ok(contextualCtaIndex > boundaryEnd, 'contextual CTA must follow the answer and knowledge boundary');
  const contextualCtaEnd = html.indexOf('</section>', contextualCtaIndex);
  const contextualCta = html.slice(contextualCtaIndex, contextualCtaEnd);
  assert.match(contextualCta, /<a\b[^>]*class=["'][^"']*cta-btn[^"']*["'][^>]*href=["']\.\.\/["']/i);
  assert.equal((html.match(/data-generated-article-prompt="true"/g) || []).length, 0, 'retention article must not regain the generic calculator prompt');
});

test('台湾クーポン記事は問題排解を完了してから反推モードへ送る', () => {
  const html = read('tw/articles/google-play-points-coupon-not-applied.html');
  const resolutionIndex = html.indexOf('id="section-5"');
  const resolutionEnd = html.indexOf('</section>', resolutionIndex) + '</section>'.length;
  const promptIndex = html.indexOf('data-generated-intl-article-prompt="true"');

  assert.ok(promptIndex > resolutionEnd, 'troubleshooting must finish before the calculator CTA');
  const promptEnd = html.indexOf('</aside>', promptIndex);
  const prompt = html.slice(promptIndex, promptEnd);
  assert.match(prompt, /href=["']\/tw\/\?mode=reverse["']/);
  assert.equal((html.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1);
});

test('台湾白金・鑽石記事は門檻を即答してから直接計算機へ送る', () => {
  const html = read('tw/articles/google-play-points-platinum-diamond-cost.html');
  const introIndex = html.indexOf('class="intro"');
  const introEnd = html.indexOf('</div>', introIndex) + '</div>'.length;
  const promptIndex = html.indexOf('data-generated-intl-article-prompt="true"');
  const detailIndex = html.indexOf('<section class="section">', introEnd);

  assert.ok(promptIndex > introEnd, 'threshold answer must come before the calculator CTA');
  assert.ok(promptIndex < detailIndex, 'calculator CTA should stay close to the direct answer');
  const promptEnd = html.indexOf('</aside>', promptIndex);
  const prompt = html.slice(promptIndex, promptEnd);
  assert.match(prompt, /href=["']\/tw\/["']/);
  assert.doesNotMatch(prompt, /\/tw\/status\//, 'calculator CTA should go directly to the calculator');
  assert.equal((html.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1);
});