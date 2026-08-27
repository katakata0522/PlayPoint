'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
const layoutHrefPattern = /<link\b[^>]*\bhref=["'][^"']*\/articles\/ja-article-layout\.css(?:\?v=[a-zA-Z0-9_-]+)?["'][^>]*>/gi;

test('公開中の日本語記事は国際版ベースの共通レイアウトCSSを1回だけ読み込む', () => {
  const japaneseArticles = registry
    .map(article => article && article.file)
    .filter(file => typeof file === 'string' && /^\.\.\/articles\/[^/]+\.html$/.test(file));

  assert.ok(japaneseArticles.length > 0, '日本語記事が記事台帳から取得できること');

  for (const file of japaneseArticles) {
    const relativePath = file.replace(/^\.\.\//, '');
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const matches = [...html.matchAll(layoutHrefPattern)];
    assert.equal(matches.length, 1, `${relativePath} は共通レイアウトCSSを1回だけ読むこと`);
  }
});

test('国際版記事へ日本語専用レイアウトCSSを混入させない', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const directory = path.join(root, locale, 'articles');
    if (!fs.existsSync(directory)) continue;

    for (const name of fs.readdirSync(directory).filter(file => file.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(directory, name), 'utf8');
      assert.equal(layoutHrefPattern.test(html), false, `${locale}/articles/${name} に日本語専用CSSを入れないこと`);
      layoutHrefPattern.lastIndex = 0;
    }
  }
});

test('先に結論ボックスへ誤挿入された自動目次はレイアウトを動かさない', () => {
  const css = fs.readFileSync(path.join(root, 'articles', 'ja-article-layout.css'), 'utf8');
  assert.match(css, /\.answer-box\s*>\s*\.inpage-toc[\s\S]*?display:\s*none\s*;/,
    '結論ボックス内へ後挿入された目次を非表示にしてCLSを防ぐこと');
});
