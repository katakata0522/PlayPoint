'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { assertOrderedAttributes } = require('./helpers/markup-contract.cjs');

test('静的順序の検査は存在を必須にし、コメントやscript内の偽タグで補完しない', () => {
  const first = '<h2 data-key="first">説明</h2>';
  const last = "<h2 title='a > b' data-key='last'>記事</h2>";
  const check = html => assertOrderedAttributes(html, 'data-key', ['first', 'last'], 'fixture');
  check(first + last);
  check(first.replace('data-key="first"', "class='title' data-key = 'first'") + '<!-- marker変更 -->' + last);
  for (const broken of [last, first, last + first, first + first + last, `<!-- ${first} -->${last}`, `<script>const x = '${first}'</script>${last}`]) assert.throws(() => check(broken));
});

// Cache-ControlはHTTP応答の単体検査とPR Gateの実Apache検査へ移行した。
test('多言語の共有検査は属性の順序や引用符を固定せず、偽リンク・偽本文を拒否する', () => {
  const { assertBasicSeo, assertHreflang, assertOfficialAnswers, assertPhrases, assertLocalAnchorsExist, schemas } = require('./helpers/intl-check.cjs');
  const seo = `<html lang='en'><head><title>Example</title><meta content='Description' name='description'>
    <link href='https://playpoint-sim.com/en/articles/example.html' rel='canonical'>
    <meta content='Example Site' property='og:site_name'>
    <script data-other='ok' type = 'application/ld+json'>{"@type":"Article"}</script>
    <script type='application/ld+json'>{"@type":"FAQPage"}</script></head><body><h1>Example</h1>
    <a href='/en/' class='other cta-btn'>Calculate</a><a href='/en/author/katakata.html'>Author</a></body></html>`;
  const basic = html => assertBasicSeo(html, 'en/articles/example.html', { lang: 'en', siteName: 'Example Site' });
  basic(seo);
  for (const element of ["<link href='https://playpoint-sim.com/en/articles/example.html' rel='canonical'>", "<a href='/en/' class='other cta-btn'>Calculate</a>", '<h1>Example</h1>']) {
    assert.throws(() => basic(seo.replace(element, `<!--${element}-->`)));
  }
  assert.deepEqual(schemas('<!--<script type="application/ld+json">{"@type":"Article"}</script>-->'), []);
  assert.deepEqual(schemas(`<script data-note="type='application/ld+json'">not JSON</script>`), []);
  assert.throws(() => schemas('<script type="application/ld+json">broken</script>'));
  const alternate = `<link href='/en/' hreflang='en' rel='alternate'>`;
  assertHreflang(alternate, 'fixture', ['en']);
  assert.throws(() => assertHreflang(`<!--${alternate}-->`, 'fixture', ['en']));
  assert.throws(() => assertHreflang(`<div hreflang='en'>Fake</div>`, 'fixture', ['en']));
  const official = `<a href='https://support.google.com/googleplay/answer/9077247?hl=en'>Official</a>`;
  assertOfficialAnswers(official, 'fixture', ['9077247']);
  for (const bad of [`<!--${official}-->`, official.replace('support.google.com', 'support.google.com.example.com'), official.replace('9077247?', '90772470?')]) assert.throws(() => assertOfficialAnswers(bad, 'fixture', ['9077247']));
  assertPhrases('<p>expire after one year</p>', 'fixture', ['expire after one year']);
  for (const bad of ['<!-- expire after one year -->', '<script>expire after one year</script>', '<style>expire after one year</style>']) assert.throws(() => assertPhrases(bad, 'fixture', ['expire after one year']));
  for (const quote of ['"', "'", '']) assert.throws(() => assertLocalAnchorsExist(`<a href=${quote}/__missing_fixture__.html${quote}>Broken</a>`, 'fixture'));
  assertLocalAnchorsExist(`<a href='/en/?mode=x#result'>Exists</a>`, 'fixture');
});
