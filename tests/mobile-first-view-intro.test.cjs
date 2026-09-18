'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function readStaticIntro() {
  const html = read('index.html');
  const match = html.match(/<p id="site-description"[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(match, 'site description is missing');
  return match[1];
}

function assertConciseJapaneseIntro(value) {
  const text = String(value || '');
  assert.equal(text.trim(), text, 'intro must not depend on surrounding whitespace');
  assert.doesNotMatch(text, /<br\b|\r|\n/i, 'intro must not contain a forced line break');
  assert.ok(text.length > 0 && text.length <= 80, 'intro must stay concise enough for the first view');
  assert.match(text, /(?:目標|ランク)/, 'intro must explain the goal or rank context');
  assert.match(text, /必要/, 'intro must explain what is needed');
  assert.match(text, /ポイント/, 'intro must keep the Play Points calculation context');
}

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


test('日本語トップの初期HTMLは短く改行依存のない計算説明を持つ', () => {
  assertConciseJapaneseIntro(readStaticIntro());
});


test('日本語トップのhydration後説明は初期HTMLと一致し、first viewを揺らさない', () => {
  const fixture = createDocument('長い説明');
  const update = loadCopyUpdater(fixture.document);

  update('JP');

  assertConciseJapaneseIntro(fixture.description.textContent);
  assert.equal(fixture.description.textContent, readStaticIntro(), 'static and hydrated intro copy must stay aligned');
});

test('日本語以外は既存ローカライズ説明を勝手に置き換えない', () => {
  const fixture = createDocument('Existing localized introduction');
  const update = loadCopyUpdater(fixture.document);

  update('US');

  assert.equal(fixture.description.textContent, 'Existing localized introduction');
});


test('冒頭を短くしても主要な計算意図は可視本文に残る', () => {
  const html = read('index.html');
  const descriptionSection = html.match(/<!-- DESCRIPTION_SECTION_START -->([\s\S]*?)<!-- DESCRIPTION_SECTION_END -->/);

  assert.ok(descriptionSection, 'visible description section is missing');
  assert.match(descriptionSection[1], /ランクアップ[\s\S]*必要|必要[\s\S]*ランクアップ/);
  assert.match(descriptionSection[1], /ポイント[\s\S]*獲得|獲得[\s\S]*ポイント/);
  assert.match(descriptionSection[1], /キャンペーン/);
  assert.match(html, />現在のステータス</);
  assert.match(html, />目標ステータス</);
  assert.match(html, />目標までの必要ポイント</);
  assert.match(html, />キャンペーン特別獲得率/);
});

