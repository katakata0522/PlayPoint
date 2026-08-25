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

test('記事のローカルCSSは内容ハッシュ付きURLで参照する', () => {
  for (const file of articleFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const links = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
      .map(match => match[1])
      .filter(href => !/^(?:https?:)?\/\//i.test(href));
    assert.ok(links.length > 0, path.relative(root, file));
    links.forEach(href => assert.match(href, /\.css\?v=[a-f0-9]{10}$/i, `${path.relative(root, file)}: ${href}`));
  }
});

test('記事のローカルJavaScriptも内容ハッシュ付きURLで参照する', () => {
  for (const file of articleFiles()) {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+\.js(?:\?v=[^"']+)?)["']/gi)]
      .map(match => match[1])
      .filter(src => !/^(?:https?:)?\/\//i.test(src));
    scripts.forEach(src => assert.match(src, /\.js\?v=[a-f0-9]{10}$/i, `${path.relative(root, file)}: ${src}`));
  }
});

test('公開HTMLのローカルCSS・JavaScriptは実ファイルと一致する内容ハッシュを使う', () => {
  const {
    createRevision,
    listPublicHtmlFiles,
    resolveLocalAsset
  } = require(path.join(root, 'scripts/article-asset-versioning.cjs'));

  for (const file of listPublicHtmlFiles(root)) {
    const html = fs.readFileSync(file, 'utf8');
    const references = [
      ...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css)(?:\?v=([a-f0-9]{10}))?["']/gi)
    ].map(match => ({ extension: '.css', path: match[1], version: match[2] }));
    references.push(...[
      ...html.matchAll(/<script\b[^>]*src=["']([^"']+\.js)(?:\?v=([a-f0-9]{10}))?["']/gi)
    ].map(match => ({ extension: '.js', path: match[1], version: match[2] })));

    for (const reference of references) {
      const asset = resolveLocalAsset(root, file, reference.path, reference.extension);
      if (!asset) continue;
      assert.ok(reference.version, `${path.relative(root, file)}: ${reference.path}`);
      assert.equal(reference.version, createRevision(asset), `${path.relative(root, file)}: ${reference.path}`);
    }
  }
});

test('画面外描画の最適化は長文下部だけに限定し、印刷時に解除する', () => {
  const css = fs.readFileSync(path.join(root, 'articles/article-shared.css'), 'utf8');
  assert.match(css, /@supports\s*\(content-visibility:\s*auto\)/);
  assert.match(css, /\.content\s*>\s*\.section:nth-of-type\(n\s*\+\s*3\)/);
  assert.match(css, /contain-intrinsic-size:\s*auto\s+480px/);
  assert.match(css, /@media\s+print[\s\S]*content-visibility:\s*visible/);
});

test('バージョン付き資産だけを1年間immutableでキャッシュする', () => {
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  assert.match(htaccess, /max-age=31536000,\s*immutable/);
  assert.match(htaccess, /QUERY_STRING[\s\S]*\bv=/);
  assert.match(htaccess, /text\/css "access plus 7 days"/);
});

test('未参照だった旧共通CSSを公開物に残さない', () => {
  assert.equal(fs.existsSync(path.join(root, 'articles/article-common.css')), false);
});
