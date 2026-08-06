'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  findHiddenFaqItems,
  hasLargeImagePreview,
  normalizeArticleFiles,
  normalizeArticleHtml
} = require('../scripts/article-seo-normalize.cjs');

function faqJson(question, answer) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: 'テスト記事'
      },
      {
        '@type': 'FAQPage',
        mainEntity: [{
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer
          }
        }]
      }
    ]
  });
}

function htmlTemplate({ body = '', robots = 'index, follow', jsonLd = '' } = {}) {
  return `<!doctype html><html><head><meta name="robots" content="${robots}">${jsonLd}</head><body>${body}</body></html>`;
}

test('可視本文と一致するFAQPageは保持する', () => {
  const html = htmlTemplate({
    body: '<h2>よくある質問</h2><h3>ポイントは送れますか？</h3><p>別のアカウントには送れません。</p>',
    jsonLd: `<script type="application/ld+json">${faqJson('ポイントは送れますか？', '別のアカウントには送れません。')}</script>`
  });

  const result = normalizeArticleHtml(html);
  assert.equal(result.removedFaqPage, false);
  assert.match(result.html, /FAQPage/);
  assert.equal(findHiddenFaqItems(result.html).length, 0);
});

test('本文に表示されていないFAQPageだけを除去しArticleは残す', () => {
  const html = htmlTemplate({
    body: '<article><h1>ポイントの使い方</h1><p>本文です。</p></article>',
    jsonLd: `<script type="application/ld+json">${faqJson('ポイントは送れますか？', '別のアカウントには送れません。')}</script>`
  });

  const result = normalizeArticleHtml(html);
  assert.equal(result.removedFaqPage, true);
  assert.doesNotMatch(result.html, /FAQPage/);
  assert.match(result.html, /"@type": "Article"/);
});

test('既存robots指示を保ったままmax-image-previewをlargeへ統一する', () => {
  const html = htmlTemplate({ robots: 'index, follow, max-image-preview:standard' });
  const result = normalizeArticleHtml(html);
  assert.match(result.html, /content="index, follow, max-image-preview:large"/);
  assert.equal(hasLargeImagePreview(result.html), true);
});

test('robots metaが無い場合もhead内へ安全に追加する', () => {
  const html = '<!doctype html><html><head><title>記事</title></head><body>本文</body></html>';
  const result = normalizeArticleHtml(html);
  assert.match(result.html, /<meta name="robots" content="index, follow, max-image-preview:large">/);
  assert.equal(hasLargeImagePreview(result.html), true);
});

test('4言語の記事ディレクトリだけを処理し、checkモードでは書き換えない', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-seo-'));
  for (const directory of ['articles', 'en/articles', 'ko/articles', 'tw/articles']) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
    fs.writeFileSync(path.join(root, directory, 'sample.html'), htmlTemplate({
      body: '<p>本文</p>',
      jsonLd: `<script type="application/ld+json">${faqJson('非表示の質問', '非表示の回答')}</script>`
    }));
  }
  fs.writeFileSync(path.join(root, 'index.html'), '<html><head></head><body></body></html>');

  const checkSummary = normalizeArticleFiles(root, { checkOnly: true });
  assert.equal(checkSummary.scanned, 4);
  assert.equal(checkSummary.changed, 4);
  assert.match(fs.readFileSync(path.join(root, 'articles/sample.html'), 'utf8'), /FAQPage/);

  const writeSummary = normalizeArticleFiles(root);
  assert.equal(writeSummary.faqPagesRemoved, 4);
  assert.equal(writeSummary.largePreviewUpdated, 4);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'articles/sample.html'), 'utf8'), /FAQPage/);
  assert.equal(hasLargeImagePreview(fs.readFileSync(path.join(root, 'tw/articles/sample.html'), 'utf8')), true);
});
