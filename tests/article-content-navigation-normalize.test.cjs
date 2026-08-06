'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  normalizeHtml,
  run,
  validateArticle
} = require('../scripts/article-content-navigation-normalize.cjs');

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-content-nav-'));
  for (const dir of ['articles', 'en/articles', 'ko/articles', 'tw/articles']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  return root;
}

function article(body = '') {
  return `<!doctype html><html><body><article class="content">${body}</article></body></html>`;
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createTargets(root, targets) {
  for (const target of targets) {
    const peers = targets.filter(item => item !== target).slice(0, 2);
    const links = peers.map(peer => `<a href="./${path.posix.basename(peer)}">peer</a>`).join('');
    write(root, target, article(`<section class="related-links-section"><h2>関連記事</h2>${links}</section>`));
  }
}

test('missing mapped related section is inserted before article end', () => {
  const result = normalizeHtml('articles/2025-12-25-campaign.html', article('<section><h2>本文</h2></section>'));
  assert.equal(result.relatedAdded, true);
  assert.match(result.html, /article-related-guides/);
  assert.match(result.html, /2025-12-25-new-year-campaign\.html/);
  assert.ok(result.html.indexOf('article-related-guides') < result.html.indexOf('</article>'));
});

test('existing related section is preserved without duplication', () => {
  const html = article('<section class="section related-links-section"><h2>Related guides</h2><a href="./a.html">A</a><a href="./b.html">B</a></section>');
  const result = normalizeHtml('ko/articles/sample.html', html);
  assert.equal(result.changed, false);
  assert.equal((result.html.match(/related-links-section/g) || []).length, 1);
});

test('scope note is inserted after the lead answer and links to the paired page', () => {
  const html = article('<section class="answer-box"><h2>結論</h2><p>本文</p></section><section class="related-links-section"><h2>関連記事</h2><a href="./a.html">A</a><a href="./b.html">B</a></section>');
  const result = normalizeHtml('articles/2026-07-24-play-points-100-value.html', html);
  assert.equal(result.scopeAdded, true);
  assert.match(result.html, /article-scope-note/);
  assert.match(result.html, /2026-07-24-play-points-500-1000-value\.html/);
  assert.ok(result.html.indexOf('answer-box') < result.html.indexOf('article-scope-note'));
});

test('check mode detects required changes and does not write', () => {
  const root = tempRoot();
  const target = 'articles/2025-12-25-campaign.html';
  const original = article('<section><h2>本文</h2></section>');
  write(root, target, original);
  createTargets(root, [
    'articles/2025-12-25-new-year-campaign.html',
    'articles/2026-08-05-play-points-multiplier-stacking.html',
    'articles/2026-03-10-play-points-reflection-timing.html'
  ]);
  const result = run({ root, check: true });
  assert.ok(result.stats.changed >= 1);
  assert.equal(fs.readFileSync(path.join(root, target), 'utf8'), original);
  assert.ok(result.failures.some(message => message.includes('正規化が必要')));
});

test('normalization is idempotent and validates related targets', () => {
  const root = tempRoot();
  const target = 'articles/2025-12-25-campaign.html';
  write(root, target, article('<section><h2>本文</h2></section>'));
  createTargets(root, [
    'articles/2025-12-25-new-year-campaign.html',
    'articles/2026-08-05-play-points-multiplier-stacking.html',
    'articles/2026-03-10-play-points-reflection-timing.html'
  ]);

  const first = run({ root, check: false });
  assert.equal(first.failures.length, 0);
  const second = run({ root, check: true });
  assert.equal(second.stats.changed, 0);
  assert.equal(second.failures.length, 0);
});

test('validator rejects too few links, self links and missing targets', () => {
  const root = tempRoot();
  const file = 'en/articles/sample.html';
  const html = article('<section class="related-links-section"><h2>Related guides</h2><a href="./sample.html">Self</a></section>');
  write(root, file, html);
  const problems = validateArticle(root, file, html, new Set([file]));
  assert.ok(problems.some(message => message.includes('2〜4本')));
  assert.ok(problems.some(message => message.includes('自己リンク')));
});
