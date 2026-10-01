'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const articleDirectories = ['articles', 'en/articles', 'ko/articles', 'tw/articles'];

function articleFiles() {
  return articleDirectories.flatMap(directory => {
    const absoluteDirectory = path.join(root, directory);
    return fs.readdirSync(absoluteDirectory)
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(absoluteDirectory, file));
  });
}

test('記事CSSは外部化され、AdSense以外のinline styleを残さない', () => {
  for (const file of articleFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /<style(?:\s|>)/i, path.relative(root, file));

    const inlineStyles = [...html.matchAll(/<[^>]+\sstyle=["']([^"']*)["'][^>]*>/gi)];
    for (const match of inlineStyles) {
      assert.match(match[0], /class=["'][^"']*\badsbygoogle\b[^"']*["']/i, path.relative(root, file));
      assert.equal(match[1].replace(/\s+/g, '').toLowerCase(), 'display:block');
    }
  }
});

// CSS/JSのURL形式と実内容の一致はruntime-module-guardsへ集約し、圧縮後も検証する。

test('画面外描画の最適化は長文下部だけに限定し、印刷時に解除する', () => {
  const css = fs.readFileSync(path.join(root, 'articles/article-shared.css'), 'utf8');
  assert.match(css, /@supports\s*\(content-visibility:\s*auto\)/);
  const threshold = css.match(/\.content\s*>\s*\.section:nth-of-type\(n\s*\+\s*(\d+)\)/);
  assert.ok(threshold, 'lower article sections must own content-visibility');
  assert.ok(Number(threshold[1]) >= 2, 'first article section must not be deferred');
  assert.match(css, /contain-intrinsic-size:\s*auto\s+\d+px/);
  assert.match(css, /@media\s+print[\s\S]*content-visibility:\s*visible/);
});

test('バージョン付き資産だけを長期immutableでキャッシュする', () => {
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  const immutable = htaccess.match(/max-age=(\d+),\s*immutable/);
  const cssDefault = htaccess.match(/text\/css "access plus (\d+) days"/);
  assert.ok(immutable, 'versioned immutable cache policy is missing');
  assert.ok(cssDefault, 'unversioned CSS cache policy is missing');
  const immutableSeconds = Number(immutable[1]);
  const cssDefaultSeconds = Number(cssDefault[1]) * 86400;
  assert.ok(immutableSeconds > cssDefaultSeconds, 'versioned assets must outlive unversioned CSS cache');
  assert.ok(immutableSeconds <= 63_072_000, 'immutable cache lifetime must stay finite');
  assert.match(htaccess, /QUERY_STRING[\s\S]*\bv=/);
});

test('未参照だった旧共通CSSを公開物に残さない', () => {
  assert.equal(fs.existsSync(path.join(root, 'articles/article-common.css')), false);
});
