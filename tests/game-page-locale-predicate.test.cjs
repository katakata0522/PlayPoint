'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { isGeneratedGamePagePath } = require('../scripts/content-dates.cjs');
const { GAME_LOCALE_DIRECTORIES } = require('../scripts/locale-ids.cjs');

const root = path.resolve(__dirname, '..');

test('generated game page predicate follows every canonical game locale directory', () => {
  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const prefix = localeDirectory ? `${localeDirectory}/` : '';
    assert.equal(isGeneratedGamePagePath(`${prefix}games/index.html`), true, `${prefix}games/index.html`);
    assert.equal(isGeneratedGamePagePath(`${prefix}games/example/index.html`), true, `${prefix}games/example/index.html`);
  }
});

test('game page predicate rejects unsupported or nested paths', () => {
  for (const file of [
    'ja/games/index.html',
    'fr/games/index.html',
    'games/example/details/index.html',
    'games/example.html',
    'articles/games/index.html'
  ]) {
    assert.equal(isGeneratedGamePagePath(file), false, file);
  }
});

test('content date resolver does not restore a handwritten international game locale regex', () => {
  const source = fs.readFileSync(path.join(root, 'scripts', 'content-dates.cjs'), 'utf8');
  assert.match(source, /GAME_LOCALE_DIRECTORIES/);
  assert.doesNotMatch(
    source,
    /en\|ko\|tw/,
    'content-dates.cjs must derive game locale paths from the canonical locale registry'
  );
});
