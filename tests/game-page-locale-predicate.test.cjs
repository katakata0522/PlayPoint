'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { isGeneratedGamePagePath } = require('../scripts/content-dates.cjs');
const { GAME_LOCALE_DIRECTORIES } = require('../scripts/locale-ids.cjs');

test('generated game page predicate follows every canonical game locale directory', () => {
  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const prefix = localeDirectory ? `${localeDirectory}/` : '';
    assert.equal(isGeneratedGamePagePath(`${prefix}games/index.html`), true, `${prefix}games/index.html`);
    assert.equal(isGeneratedGamePagePath(`${prefix}games/example/index.html`), true, `${prefix}games/example/index.html`);
  }
});

test('game page predicate accepts nested editorial detail pages inside a canonical game locale', () => {
  assert.equal(isGeneratedGamePagePath('games/example/details/index.html'), true);
  assert.equal(isGeneratedGamePagePath('en/games/example/details/index.html'), true);
});

test('game page predicate rejects unsupported or malformed paths', () => {
  for (const file of [
    'ja/games/index.html',
    'fr/games/index.html',
    'games/example/details.html',
    'games/example.html',
    'articles/games/index.html'
  ]) {
    assert.equal(isGeneratedGamePagePath(file), false, file);
  }
});
