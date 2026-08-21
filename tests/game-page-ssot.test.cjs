'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getSyncedHtmlFiles } = require('../scripts/build-targets.cjs');
const {
  GENERATED_GAME_PAGE_CONTENT_DATE,
  getContentDateForFile
} = require('../scripts/content-dates.cjs');
const {
  GAME_LOCALE_DIRECTORIES,
  getGameContentDate,
  getGamePageHtmlFiles
} = require('../scripts/game-page-targets.cjs');

const root = path.resolve(__dirname, '..');
const generatorPath = path.join(root, 'scripts', 'generate-game-simulators.cjs');

function getGeneratorMetadata() {
  const source = fs.readFileSync(generatorPath, 'utf8');
  const gamesBlock = source.match(/const GAMES_DATA = \[([\s\S]*?)\n\];\n\nfunction generateGamePageHtml/);
  assert.ok(gamesBlock, 'GAMES_DATA block should remain discoverable for the regression guard');

  const gameIds = [...gamesBlock[1].matchAll(/^\s+id:\s*'([^']+)'/gm)].map(match => match[1]);
  assert.ok(gameIds.length > 0, 'GAMES_DATA should contain at least one game');
  assert.equal(new Set(gameIds).size, gameIds.length, 'GAMES_DATA ids must stay unique');

  const dateMatch = source.match(/const GAME_CONTENT_UPDATED_AT = '(\d{4}-\d{2}-\d{2})';/);
  assert.ok(dateMatch, 'game generator content date should remain explicit');

  return { gameIds, contentDate: dateMatch[1] };
}

test('game page sync targets are derived from every generated locale and game id', () => {
  const { gameIds } = getGeneratorMetadata();
  const expected = [];

  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const prefix = localeDirectory ? `${localeDirectory}/` : '';
    expected.push(`${prefix}games/index.html`);
    for (const gameId of gameIds) {
      expected.push(`${prefix}games/${gameId}/index.html`);
    }
  }

  assert.deepEqual(
    [...getGamePageHtmlFiles(root)].sort(),
    expected.sort(),
    'generated game outputs and discovered synchronization targets must stay aligned'
  );
});

test('game editorial date has a single canonical source in the generator', () => {
  const { contentDate } = getGeneratorMetadata();
  const contentDatesSource = fs.readFileSync(path.join(root, 'scripts', 'content-dates.cjs'), 'utf8');

  assert.equal(getGameContentDate(root), contentDate, 'game date helper should resolve the generator date');
  assert.equal(
    GENERATED_GAME_PAGE_CONTENT_DATE,
    contentDate,
    'content date resolver should derive the game editorial date from the generator'
  );
  assert.equal(
    contentDatesSource.includes(`GENERATED_GAME_PAGE_CONTENT_DATE = '${contentDate}'`),
    false,
    'content-dates.cjs must not duplicate the generator game date literal'
  );
  assert.match(
    contentDatesSource,
    /GENERATED_GAME_PAGE_CONTENT_DATE = getGameContentDate\(rootDir\)/,
    'content-dates.cjs should explicitly derive the game date through the SSOT helper'
  );
});

test('all generated game pages receive the canonical game editorial date and synchronization pass', () => {
  const synced = new Set(getSyncedHtmlFiles(root));
  for (const file of getGamePageHtmlFiles(root)) {
    assert.equal(getContentDateForFile(file), GENERATED_GAME_PAGE_CONTENT_DATE, `${file} should use the game editorial date`);
    assert.equal(synced.has(file), true, `${file} should be synchronized after generation`);
  }
});

test('game ids are not manually duplicated in build target or content date tables', () => {
  const { gameIds } = getGeneratorMetadata();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');
  const contentDatesSource = fs.readFileSync(path.join(root, 'scripts', 'content-dates.cjs'), 'utf8');

  for (const gameId of gameIds) {
    const duplicatedPath = `games/${gameId}/index.html`;
    assert.equal(buildTargetsSource.includes(duplicatedPath), false, `build targets should not hardcode ${duplicatedPath}`);
    assert.equal(contentDatesSource.includes(duplicatedPath), false, `content dates should not hardcode ${duplicatedPath}`);
  }
});
