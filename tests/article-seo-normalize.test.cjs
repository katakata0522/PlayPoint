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

test('海外Articleのheadlineは表示見出しへ同期し、本文と他の構造化データを保持する', () => {
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: 'Earlier title', datePublished: '2026-10-01' },
    { '@type': 'WebPage', name: 'Search title', headline: 'Different metadata' }
  ] });
  const body = '<body><h1>Play Points &amp; rewards</h1><p>Keep this reader copy.</p></body>';
  const before = `<html lang="en"><head><meta name="robots" content="index, follow, max-image-preview:large"><script type="application/ld+json">${schema}</script></head>${body}</html>`;
  const result = normalizeArticleHtml(before);
  const nodes = JSON.parse(result.html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(nodes[0].headline, 'Play Points & rewards');
  assert.equal(nodes[0].datePublished, '2026-10-01');
  assert.equal(nodes[1].headline, 'Different metadata');
  assert.ok(result.html.includes(body));
  assert.equal(normalizeArticleHtml(result.html).changed, false);
});

function htmlTemplate({ body = '', robots = 'index, follow', jsonLd = '' } = {}) {
  return `<!doctype html><html><head><meta name="robots" content="${robots}">${jsonLd}</head><body>${body}</body></html>`;
}

test('可視本文と一致するFAQPageは保持する', () => {
  const html = htmlTemplate({
    body: '<div class="faq-item"><h3>Q. ポイントは送れますか？</h3><p>A. 別のアカウントには送れません。</p></div>',
    jsonLd: `<script type="application/ld+json">${faqJson('ポイントは送れますか？', '別のアカウントには送れません。')}</script>`
  });

  const result = normalizeArticleHtml(html);
  assert.equal(result.removedFaqPageCount, 0);
  assert.equal(result.synchronizedFaqPageCount, 0);
  assert.match(result.html, /FAQPage/);
  assert.equal(findHiddenFaqItems(result.html).length, 0);
});

test('本文と文言がずれたFAQPageは可視FAQへ同期する', () => {
  const html = htmlTemplate({
    body: '<div class="faq-item"><h3>Q. ポイントは送れますか？</h3><p>A. 別のアカウントには送れません。</p></div>',
    jsonLd: `<script type="application/ld+json">${faqJson('ポイントを送れる？', '他の人には送れません。')}</script>`
  });

  const result = normalizeArticleHtml(html);
  assert.equal(result.synchronizedFaqPageCount, 1);
  assert.match(result.html, /ポイントは送れますか？/);
  assert.match(result.html, /別のアカウントには送れません。/);
  assert.doesNotMatch(result.html, /ポイントを送れる？/);
  assert.equal(findHiddenFaqItems(result.html).length, 0);
});

test('可視FAQが無いFAQPageだけを除去しArticleは残す', () => {
  const html = htmlTemplate({
    body: '<article><h1>ポイントの使い方</h1><p>本文です。</p></article>',
    jsonLd: `<script type="application/ld+json">${faqJson('ポイントは送れますか？', '別のアカウントには送れません。')}</script>`
  });

  const result = normalizeArticleHtml(html);
  assert.equal(result.removedFaqPageCount, 1);
  assert.doesNotMatch(result.html, /FAQPage/);
  assert.match(result.html, /"@type": "Article"/);
});

test('本文の公式FAQリンクから後続の計算機CTAをFAQにしない', () => {
  const body = '<section><h2>パスの選び方</h2><p><a href="https://example.com/faq.html">公式FAQ</a>で条件を確認できます。</p></section>'
    + '<h2>ポイントを比べる</h2><p>対象価格から計算します。</p>'
    + '<div class="article-next-step-cta"><h3>購入分を試算する</h3><p>計算機を使えます。</p></div>'
    + '<section><h2>関連記事</h2><p>次に読む記事です。</p></section>';

  for (const jsonLd of ['', `<script type="application/ld+json">${faqJson('購入分を試算する', '計算機を使えます。')}</script>`]) {
    const result = normalizeArticleHtml(htmlTemplate({ body, jsonLd }));
    assert.doesNotMatch(result.html, /FAQPage/);
    assert.ok(result.html.includes(body), 'visible copy and CTA must be preserved');
    assert.equal(normalizeArticleHtml(result.html).changed, false);
  }
});

test('装飾や「よくある疑問」のFAQ見出しから可視質問だけを構造化する', () => {
  for (const heading of ['<span>よくある質問</span>', 'サービスのよくある疑問']) {
    const body = '<section><h2>概要</h2><p>通常の本文です。</p></section>'
      + `<section><h2>${heading}</h2><h3>Q. 解約はどこからできますか？</h3><p>A. 契約画面から手続きできます。</p></section>`
      + '<section><h2>次の行動</h2><h3>計算機を使う</h3><p>予算を試算します。</p></section>';
    const result = normalizeArticleHtml(htmlTemplate({ body }));
    const schema = JSON.parse(result.html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(schema.mainEntity.map(item => [item.name, item.acceptedAnswer.text]), [
      ['解約はどこからできますか?', '契約画面から手続きできます。']
    ]);
    assert.equal(normalizeArticleHtml(result.html).changed, false);
  }
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
  assert.equal(writeSummary.faqPagesSynchronized, 0);
  assert.equal(writeSummary.largePreviewUpdated, 4);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'articles/sample.html'), 'utf8'), /FAQPage/);
  assert.equal(hasLargeImagePreview(fs.readFileSync(path.join(root, 'tw/articles/sample.html'), 'utf8')), true);
});
