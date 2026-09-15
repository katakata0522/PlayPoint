'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const EXPECTED_JP_INTRO = '目標ランクまであといくら必要か、現在のステータスと必要ポイントから計算できます。';

function loadCopyUpdater(document) {
  const source = read('js/main-calculator-ui.js')
    .replace(/^export\s+/gm, '')
    .concat('\n;globalThis.__testExports = { updateSimplifiedCalculatorCopy };');
  const context = { document };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'main-calculator-ui.js' });
  return context.__testExports.updateSimplifiedCalculatorCopy;
}

function createDocument(initialDescription = '') {
  const description = { textContent: initialDescription };
  return {
    description,
    document: {
      getElementById(id) {
        return id === 'site-description' ? description : null;
      },
      querySelector() {
        return null;
      }
    }
  };
}

test('日本語トップの初期HTMLから固定改行なしの短い説明を返す', () => {
  const html = read('index.html');
  const intro = html.match(/<p id="site-description"[^>]*>([\s\S]*?)<\/p>/);

  assert.ok(intro, 'site description is missing');
  assert.equal(intro[1], EXPECTED_JP_INTRO);
  assert.doesNotMatch(intro[1], /<br\b/i);
});

test('日本語トップの初回説明はhydration後も固定改行なしの1文を保つ', () => {
  const fixture = createDocument('長い説明');
  const update = loadCopyUpdater(fixture.document);

  update('JP');

  assert.equal(fixture.description.textContent, EXPECTED_JP_INTRO);
  assert.doesNotMatch(fixture.description.textContent, /<br\s*\/?\s*>/i);
  assert.equal(fixture.description.textContent.split(/\r?\n/).length, 1);
});

test('日本語以外は既存ローカライズ説明を勝手に置き換えない', () => {
  const fixture = createDocument('Existing localized introduction');
  const update = loadCopyUpdater(fixture.document);

  update('US');

  assert.equal(fixture.description.textContent, 'Existing localized introduction');
});

test('冒頭を短くしても検索意図を説明する可視要素はページ本体に残る', () => {
  const html = read('index.html');
  const descriptionSection = html.match(/<!-- DESCRIPTION_SECTION_START -->([\s\S]*?)<!-- DESCRIPTION_SECTION_END -->/);

  assert.ok(descriptionSection, 'visible description section is missing');
  assert.match(html, /<title>[^<]*Google Play Points[^<]*あといくら[^<]*必要課金額[^<]*<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]*ランクアップ[^"]*あといくら[^"]*必要ポイント[^"]*課金額[^"]*">/);
  assert.match(html, /<h1 id="main-title"[^>]*>Google Play Points 計算機<\/h1>/);
  assert.match(descriptionSection[1], /ランクアップまであといくら必要か/);
  assert.match(descriptionSection[1], /今の課金額で何ポイント獲得できるか/);
  assert.match(descriptionSection[1], /キャンペーン時にどれだけ有利になるか/);
  assert.match(html, />現在のステータス</);
  assert.match(html, />目標ステータス</);
  assert.match(html, />目標までの必要ポイント</);
  assert.match(html, />キャンペーン特別獲得率/);
});
