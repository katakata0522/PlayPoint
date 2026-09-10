'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function replaceIntlPromptCaller() {
  const file = 'scripts/intl-article-layout.cjs';
  let source = fs.readFileSync(file, 'utf8');
  const oldCall = 'const mainHtml = insertIntlArticlePrompt(unwrapped.slice(main.start, main.end), localeKey);';
  const newCall = 'const mainHtml = insertIntlArticlePrompt(unwrapped.slice(main.start, main.end), localeKey, { relativePath });';
  if (source.includes(oldCall)) {
    source = source.replace(oldCall, newCall);
    fs.writeFileSync(file, source, 'utf8');
    return;
  }
  if (!source.includes(newCall)) throw new Error('intl-article-layout.cjs のprompt呼び出し位置を特定できません');
}

function replaceContentStructureTest() {
  const file = 'tests/content-structure.test.cjs';
  let source = fs.readFileSync(file, 'utf8');
  const importAnchor = "} = require('../scripts/article-static-usability.cjs');";
  const roleImport = "const { classifyArticleRole } = require('../scripts/article-role-registry.cjs');";
  if (!source.includes(roleImport)) {
    if (!source.includes(importAnchor)) throw new Error('content-structure import位置を特定できません');
    source = source.replace(importAnchor, importAnchor + '\n' + roleImport);
  }

  const oldStart = "test('既存CTAの有無にかかわらずcanonical buildは回答直後へ計算導線を1つ置く', () => {";
  const newStart = "test('canonical buildはArticle Roleに応じて汎用計算主導線を出し分ける', () => {";
  const nextMarker = "\ntest('引用用比較表は恒久URL・固定アンカー・一次情報を持つ', () => {";

  if (source.includes(oldStart)) {
    const start = source.indexOf(oldStart);
    const end = source.indexOf(nextMarker, start);
    if (end < 0) throw new Error('content-structure test終端を特定できません');
    const replacement = `test('canonical buildはArticle Roleに応じて汎用計算主導線を出し分ける', () => {
  const input = '<article class="content"><div class="cta-box">別用途の既存CTA</div><section class="answer-box"><h2>即答</h2><p>回答。</p></section><section class="section"><h2>詳細</h2></section></article>';
  const calculatorOptions = { relativePath: 'articles/2026-07-24-play-points-100-value.html', listed: true };
  const first = insertStaticPrompt(input, calculatorOptions);
  const second = insertStaticPrompt(first, calculatorOptions);
  const answerIndex = first.indexOf('class="answer-box"');
  const answerEnd = first.indexOf('</section>', answerIndex) + '</section>'.length;
  const promptIndex = first.indexOf('data-generated-article-prompt="true"');
  const detailIndex = first.indexOf('<section class="section">');

  assert.equal(second, first, 'canonical buildを再実行してもCTAを増やしません');
  assert.ok(first.includes('別用途の既存CTA'), '別用途のCTAを壊しません');
  assert.ok(promptIndex > answerEnd, 'calculator_bridgeの計算CTAは即答の後に置きます');
  assert.ok(promptIndex < detailIndex, 'calculator_bridgeの計算CTAは詳細本文より前に置きます');
  assert.equal((first.match(/data-generated-article-prompt="true"/g) || []).length, 1);

  const retention = insertStaticPrompt(input, { relativePath: 'articles/2026-07-31-google-play-quests.html', listed: true });
  assert.doesNotMatch(retention, /data-generated-article-prompt="true"/, 'retentionへ汎用計算CTAを出しません');
  assert.ok(retention.includes('別用途の既存CTA'), '非calculator Roleでも既存文脈CTAを保持します');

  const articles = readArticles();
  for (const article of articles) {
    if (!/^\\.\\.\\/articles\\/[^/]+\\.html$/.test(article.file || '')) continue;
    const relativePath = article.file.replace(/^\\.\\.\\//, '');
    const html = read(relativePath);
    const role = classifyArticleRole(relativePath, { listed: article.listed !== false });
    const generatedCount = (html.match(/data-generated-article-prompt="true"/g) || []).length;

    if (role === 'calculator_bridge') {
      assert.match(html, /<aside\\b[^>]*class=["'][^"']*\\barticle-calculator-prompt\\b[^"']*["'][^>]*>/i, relativePath + ': calculator_bridgeの計算主導線がありません');
    } else {
      assert.equal(generatedCount, 0, relativePath + ': ' + role + 'へ汎用計算CTAを出してはいけません');
    }
  }
});`;
    source = source.slice(0, start) + replacement + source.slice(end);
  } else if (!source.includes(newStart)) {
    throw new Error('content-structure対象testを特定できません');
  }

  fs.writeFileSync(file, source, 'utf8');
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

replaceIntlPromptCaller();
replaceContentStructureTest();
run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--test',
  'tests/article-role-next-action-audit.test.cjs',
  'tests/content-structure.test.cjs',
  'tests/intl-article-reading-flow.test.cjs',
  'tests/article-role-registry.test.cjs'
]);
