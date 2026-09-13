'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { stripHtml, renderShell } = require('../scripts/game-guide-article-hub-sync.cjs');

// 文字抽出はHTMLサニタイザーではない。HTMLへ戻す境界でも別途エスケープする。
test('ゲーム記事のタイトルとバッジはHTMLではなく文字列として出力する', () => {
  const title = '<img src=x onerror=alert(1)> & "比較"';
  const article = {
    gameTitle: '<候補ゲーム>', date: '2026-09-13', modified: '2026-09-13',
    related: [['/articles/example.html', '<svg onload=alert(2)>']]
  };
  const html = renderShell({
    head: '<head></head>', article, title, badge: '<比較>', lead: '説明',
    body: '<p>本文</p>', faqPairs: [], nextLabel: '計算する'
  });
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;比較&quot;'));
  assert.ok(html.includes('&lt;比較&gt;'));
  assert.ok(html.includes('&lt;候補ゲーム&gt;'));
  assert.ok(html.includes('&lt;svg onload=alert(2)&gt;'));
  assert.doesNotMatch(html, /<img src=x|<svg onload=/);
});

test('文字抽出は複数の非表示領域を除き通常のscriptという単語は保持する', () => {
  const html = '<p>script の説明</p><SCRIPT>hidden one</SCRIPT ><b>比較</b><style>hidden two</style\n><em>判断</em>';
  assert.equal(stripHtml(html), 'script の説明 比較 判断');
  assert.equal(stripHtml(null), '');
});
