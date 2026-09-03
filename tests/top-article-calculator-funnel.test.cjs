'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('日本語クエスト記事は回答と条件境界の後に文脈化した計算機CTAを置く', () => {
  const html = read('articles/2026-07-31-google-play-quests.html');
  const answerIndex = html.indexOf('id="quick-answer"');
  const boundaryIndex = html.indexOf('class="knowledge-boundary"');
  const boundaryEnd = html.indexOf('</section>', boundaryIndex) + '</section>'.length;
  const promptIndex = html.indexOf('data-generated-article-prompt="true"');

  assert.ok(answerIndex >= 0, 'quick answer is missing');
  assert.ok(boundaryIndex >= 0, 'knowledge boundary is missing');
  assert.ok(promptIndex > boundaryEnd, 'calculator CTA must follow the answer and knowledge boundary');
  assert.ok(html.includes('クエスト条件を確認できたら'));
  assert.ok(html.includes('次のランクまで、あといくら必要？'));
  assert.ok(html.includes('次のランクまでの必要額を計算'));
  assert.equal((html.match(/data-generated-article-prompt="true"/g) || []).length, 1);
});

test('台湾クーポン記事は問題排解を完了してから反推モードへ送る', () => {
  const html = read('tw/articles/google-play-points-coupon-not-applied.html');
  const resolutionIndex = html.indexOf('id="section-5"');
  const resolutionEnd = html.indexOf('</section>', resolutionIndex) + '</section>'.length;
  const promptIndex = html.indexOf('data-generated-intl-article-prompt="true"');

  assert.ok(promptIndex > resolutionEnd, 'troubleshooting must finish before the calculator CTA');
  assert.ok(html.includes('問題排解完成後的下一步'));
  assert.ok(html.includes('原本預計消費，可以累積多少點？'));
  assert.ok(html.includes('href="/tw/?mode=reverse"'));
  assert.ok(!html.includes('再次購買前先確認條件'), 'duplicate CTA remains');
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
  assert.ok(html.includes('距離白金／鑽石，我還需要多少？'));
  assert.ok(html.includes('用我的不足點數估算'));
  assert.ok(!html.includes('用自己的不足點數計算'), 'duplicate lower CTA remains');
  assert.ok(!html.includes('href="/tw/status/platinum/"'), 'article should not bounce through another LP');
  assert.equal((html.match(/data-generated-intl-article-prompt="true"/g) || []).length, 1);
});