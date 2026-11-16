'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { ensureAnalyticsCoreScript, ensureAdPrivacyScript } = require('../scripts/analytics-runtime-sync.cjs');
const { listPublicHtmlFiles } = require('../scripts/article-asset-versioning.cjs');
const { parseAttributes } = require('./helpers/markup-contract.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const scripts = html => [...html.matchAll(/<!--[\s\S]*?(?:-->|$)|<(script|style)\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)(?:<\/\1(?=[\s/>])[^>]*>|$)/gi)]
  .filter(match => match[1]?.toLowerCase() === 'script')
  .map(match => ({ attrs: parseAttributes('script ' + match[2]), index: match.index }));

test('広告URL保護は本文の偽タグを変更せずhead先頭へ一度だけ同期する', () => {
  for (const nl of ['\n', '\r\n']) {
    const literal = `<textarea><script src="/js/ad-url-privacy.js"></script></textarea><!-- <script src="/js/ad-url-privacy.js"></script> --><script>const sample = '<script src="/js/ad-url-privacy.js"><\\/script>';</script>`;
    const input = ['<html><head><meta charset="utf-8">', '</head><body>', literal, '<script src="/blog/components.js"></script></body></html>'].join(nl);
    const once = ensureAdPrivacyScript(input);
    assert.ok(once.includes(literal), 'RCDATA/コメント/script本文を変えている');
    assert.equal(ensureAdPrivacyScript(once), once);
    const late = input.replace('</head>', `    <script src="/js/ad-url-privacy.js?v=old" defer></script>  ${nl}</head>`);
    assert.equal(ensureAdPrivacyScript(late), once, '遅い・インデント付き旧タグの移動で本文や空白を変えている');
    const actual = scripts(once);
    assert.match(actual[0].attrs.src, /ad-url-privacy\.js/);
    assert.equal(actual[0].attrs.defer, undefined);
    assert.equal(actual[0].attrs.async, undefined);
  }
  const noAds = '<html><head><meta charset="utf-8"></head><body><!-- /blog/components.js --></body></html>';
  assert.equal(ensureAdPrivacyScript(noAds), noAds);
  const relativeBlog = '<html><head><meta charset="utf-8"></head><body><script src="components.js?v=current"></script></body></html>';
  assert.match(ensureAdPrivacyScript(relativeBlog), /ad-url-privacy\.js/);
});

test('広告対象の公開HTMLはinline queueより前に広告URL保護を読み込む', () => {
  for (const htmlFile of listPublicHtmlFiles(root)) {
    const actual = scripts(fs.readFileSync(htmlFile, 'utf8'));
    const pageUrl = 'https://playpoint-sim.com/' + path.relative(root, htmlFile).split(path.sep).join('/');
    if (!actual.some(node => node.attrs.src && ['/js/third-party.js', '/blog/components.js', '/blog/article.js'].includes(new URL(node.attrs.src, pageUrl).pathname))) continue;
    const guards = actual.filter(node => /js\/ad-url-privacy\.js(?:[?#]|$)/.test(node.attrs.src || ''));
    assert.equal(guards.length, 1, path.relative(root, htmlFile));
    assert.equal(guards[0].index, actual[0].index, path.relative(root, htmlFile));
  }
});

// T0451: tests/http-cache-contract.test.cjs + tests/helpers/apache-cache-contract.cjs へ統合。監査IDと理由は履歴台帳へ保持。

test('計測コアは対象HTMLへ実行スクリプトより前に一度だけ挿入する', () => {
  const input = '<body>\n    <script defer src="../blog/article.js?v=old"></script>\n</body>';
  const once = ensureAnalyticsCoreScript(input);
  const twice = ensureAnalyticsCoreScript(once);
  assert.equal(once, twice, '同期処理が冪等ではありません');
  const actual = scripts(once);
  const core = actual.filter(node => node.attrs.src?.split('?')[0] === '/js/analytics-core.js');
  assert.equal(core.length, 1);
  assert.ok(core[0].index < actual.find(node => node.attrs.src?.startsWith('../blog/article.js')).index);
});

test('計測対象の公開HTMLは共通コアを実行スクリプトより先に読み込む', () => {
  for (const htmlFile of listPublicHtmlFiles(root)) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const actual = scripts(html);
    const runtime = actual.find(node => /(?:js\/intent-tracking|blog\/article|blog\/script)\.js(?:[?#]|$)/.test(node.attrs.src || ''));
    if (!runtime) continue;
    const core = actual.filter(node => /js\/analytics-core\.js(?:[?#]|$)/.test(node.attrs.src || ''));
    assert.equal(core.length, 1, path.relative(root, htmlFile));
    assert.ok(core[0].index < runtime.index, path.relative(root, htmlFile));
  }
});

test('計算機系モジュールは同期scriptを増やさず計測コアを依存読込する', () => {
  const config = read('js/config.js');
  const pointsCost = read('js/points-cost.js');
  assert.match(config, /^import '\.\/analytics-core\.js\?v=[a-f0-9]{10}';/m);
  assert.match(pointsCost, /^import '\.\/analytics-core\.js\?v=[a-f0-9]{10}';/m);
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /<script\b[^>]*src=["'][^"']*analytics-core\.js/);
    assert.match(html, /<link rel="modulepreload" href="(?:\.\.\/)?js\/analytics-core\.js\?v=[a-f0-9]{10}">/);
  }
});

// T0455: .github/scripts/ui-contract-browser.cjs へ統合。監査IDと理由は履歴台帳へ保持。

// T0456: tests/runtime-module-guards.test.cjs へ統合。監査IDと理由は履歴台帳へ保持。
