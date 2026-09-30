'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { inspectPage } = require('../scripts/seo-head-audit.cjs');

const URL = 'https://playpoint-sim.com/seo-audit-fixture.html';

function pageHtml({
  title = 'Fixture',
  description = 'Fixture description',
  scriptClose = '</script>',
  jsonLd = '{"@context":"https://schema.org","@type":"WebPage"}'
} = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${URL}">
  <meta property="og:title" content="Fixture">
  <meta property="og:description" content="Fixture description">
  <meta property="og:image" content="https://playpoint-sim.com/ogp.png">
  <meta property="og:url" content="${URL}">
  <script type="application/ld+json">${jsonLd}${scriptClose}
</head>
<body><h1>Fixture</h1></body>
</html>`;
}

test('Head監査はHTMLエンティティを一度だけデコードし二重アンエスケープしない', () => {
  const page = inspectPage(
    URL,
    'seo-audit-fixture.html',
    pageHtml({ title: 'Play &amp;quot;Points&amp;quot;', description: 'Fish &amp;lt; chips' })
  );

  assert.equal(page.title, 'Play &quot;Points&quot;');
  assert.equal(page.description, 'Fish &lt; chips');
});

test('JSON-LD抽出はscript終了タグの閉じ山括弧前の空白を許容する', () => {
  const page = inspectPage(URL, 'seo-audit-fixture.html', pageHtml({ scriptClose: '</script >' }));

  assert.deepEqual(page.schemaTypes, ['WebPage']);
  assert.equal(page.errors.some(issue => issue.code === 'jsonld-invalid'), false);
  assert.equal(page.warnings.some(issue => issue.code === 'jsonld-missing'), false);
});

test('JSON-LD抽出はブラウザが終了タグとして扱う空白と余分トークンを安全に終端する', () => {
  const page = inspectPage(URL, 'seo-audit-fixture.html', pageHtml({ scriptClose: '</script\t\n data-junk>' }));

  assert.deepEqual(page.schemaTypes, ['WebPage']);
  assert.equal(page.errors.some(issue => issue.code === 'jsonld-invalid'), false);
  assert.equal(page.warnings.some(issue => issue.code === 'jsonld-missing'), false);
});

test('JSON-LD抽出はscript接頭辞だけの文字列を終了タグと誤認しない', () => {
  const jsonLd = '{"@context":"https://schema.org","@type":"WebPage","name":"</scriptx> stays data"}';
  const page = inspectPage(URL, 'seo-audit-fixture.html', pageHtml({ jsonLd }));

  assert.deepEqual(page.schemaTypes, ['WebPage']);
  assert.equal(page.errors.some(issue => issue.code === 'jsonld-invalid'), false);
});

// 一部の日本語ファイルだけ通る「0エラー」を再発させない。
const { completeHeadOgp } = require('../scripts/update-common-pages-ogp.cjs');
const rootDir = require('node:path').resolve(__dirname, '..');
for (const file of ['en/articles/fixture.html', 'ko/articles/fixture.html', 'tw/articles/fixture.html',
  'games/fixture/index.html', 'en/games/fixture/index.html', 'campaign/3x/index.html', 'maintenance/diamond/index.html']) {
  test(`${file}: 補助タグ欠落を検出し共通生成後は全契約を満たす`, () => {
    const url = 'https://playpoint-sim.com/' + file;
    const html = pageHtml().replaceAll(URL, url);
    const before = inspectPage(url, file, html);
    for (const code of ['og-width-invalid', 'og-height-invalid', 'og-alt-missing', 'og-type-invalid', 'og-locale-missing', 'twitter-image-missing']) {
      assert.ok(before.errors.some(issue => issue.code === code), code);
    }
    const fixed = completeHeadOgp(html, rootDir);
    assert.deepEqual(inspectPage(url, file, fixed).errors, []);
    assert.equal(completeHeadOgp(fixed, rootDir), fixed, '再生成でタグが増殖しない');
    assert.equal(fixed.split('<body>')[1], html.split('<body>')[1], '本文を変更しない');
  });
}
test('共有画像の共通生成は実体・既存代替テキストを維持し、欠落や重複を隠さない', () => {
  const html = pageHtml().replace('</head>', () => '<meta property="og:image:alt" content="Fish &amp; chips $&amp;">\n</head>');
  const fixed = completeHeadOgp(html, rootDir);
  assert.ok(fixed.includes('content="Fish &amp; chips $&amp;"'));
  assert.ok(fixed.includes('property="og:image" content="https://playpoint-sim.com/ogp.png"'));
  assert.throws(() => completeHeadOgp(html.replace(/<meta property="og:image"[^>]*>/, ''), rootDir), /og:image/);
  assert.throws(() => completeHeadOgp(fixed.replace('</head>', '<meta property="og:image:width" content="1200"></head>'), rootDir), /重複/);
});
