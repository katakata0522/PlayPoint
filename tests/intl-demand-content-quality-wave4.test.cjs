'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

for (const [locale, file] of [
  ['KO', 'ko/articles/google-play-points-expiration.html'],
  ['TW', 'tw/articles/google-play-points-expiration.html']
]) {
  test(`${locale} expiration gives the direct answer before calculator without a broad rewrite`, () => {
    const html = read(file);
    const intro = html.indexOf('class="intro"');
    const calc = html.indexOf('data-generated-intl-article-prompt="true"');
    assert.notEqual(intro, -1, `${locale} intro`);
    assert.notEqual(calc, -1, `${locale} calculator`);
    assert.ok(intro < calc, `${locale} answer must precede calculator`);
    assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
    assert.match(html, /9077192/);
    if (locale === 'KO') assert.match(html, /마지막으로 포인트를 적립하거나 사용한 날부터 1년 후 소멸/);
    if (locale === 'TW') assert.match(html, /最後一次獲得或使用點數後一年到期/);
  });
}

test('wave4 reclassifies answer-first expiration pages to observation, not repeated rewrite', () => {
  const report = read('docs/INTL_CONTENT_AUDIT_2026-09-03.md');
  assert.match(report, /\| A \| KO \| `\/ko\/articles\/google-play-points-expiration\.html`[^\n]*observe-after-wave4-answer-first/);
  assert.match(report, /\| A \| TW \| `\/tw\/articles\/google-play-points-expiration\.html`[^\n]*observe-after-wave4-answer-first/);
});
