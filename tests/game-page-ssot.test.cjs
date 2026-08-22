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
  getGameContentDate,
  getGamePageHtmlFiles
} = require('../scripts/game-page-targets.cjs');
const {
  GAME_LOCALE_DIRECTORIES,
  SITE_LOCALES
} = require('../scripts/locale-ids.cjs');
const {
  SITE_ORIGIN,
  getGameSitemapEntries
} = require('../scripts/sitemap-sync.cjs');

const root = path.resolve(__dirname, '..');
const generatorPath = path.join(root, 'scripts', 'generate-game-simulators.cjs');

function getGeneratorMetadata() {
  const source = fs.readFileSync(generatorPath, 'utf8');
  const gamesBlock = source.match(/const GAMES_DATA = \[([\s\S]*?)\n\];\n\nfunction generateGamePageHtml/);
  assert.ok(gamesBlock, 'GAMES_DATA block should remain discoverable for the regression guard');

  const gameIds = [...gamesBlock[1].matchAll(/^\s+id:\s*'([^']+)'/gm)].map(match => match[1]);
  assert.ok(gameIds.length > 0, 'GAMES_DATA should contain at least one game');
  assert.equal(new Set(gameIds).size, gameIds.length, 'GAMES_DATA ids must stay unique');

  const localeBlockStart = source.indexOf('const LOCALES = {');
  const localeBlockEnd = source.indexOf('const GAMES_DATA = [');
  assert.ok(localeBlockStart >= 0 && localeBlockEnd > localeBlockStart, 'LOCALES block should remain discoverable');
  const localeKeys = [...source.slice(localeBlockStart, localeBlockEnd).matchAll(/^  ([a-z]{2}): \{$/gm)]
    .map(match => match[1]);

  const dateMatch = source.match(/const GAME_CONTENT_UPDATED_AT = '(\d{4}-\d{2}-\d{2})';/);
  assert.ok(dateMatch, 'game generator content date should remain explicit');

  return { gameIds, localeKeys, contentDate: dateMatch[1] };
}

test('game generator and page discovery cover the canonical site locales', () => {
  const { localeKeys } = getGeneratorMetadata();

  assert.deepEqual(localeKeys, [...SITE_LOCALES], 'game generator locales should match the public site locale set');
  assert.deepEqual(
    [...GAME_LOCALE_DIRECTORIES],
    ['', ...SITE_LOCALES.filter(locale => locale !== 'ja')],
    'Japanese game pages should stay at root and international locales should use locale directories'
  );
});

test('game page sync targets cover every generated locale and game id', () => {
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

test('game sitemap entries match the discovered game pages', () => {
  const expectedUrls = getGamePageHtmlFiles(root)
    .map(file => `${SITE_ORIGIN}/${file.replace(/index\.html$/, '')}`)
    .sort();
  const sitemapEntries = getGameSitemapEntries(root);
  const actualUrls = sitemapEntries.map(entry => entry.url).sort();

  assert.deepEqual(actualUrls, expectedUrls);
  assert.ok(
    sitemapEntries.every(entry => entry.lastmod === GENERATED_GAME_PAGE_CONTENT_DATE),
    'game sitemap entries should keep the canonical game editorial date'
  );
});

test('game editorial date stays aligned from generator to resolver', () => {
  const { contentDate } = getGeneratorMetadata();

  assert.equal(getGameContentDate(root), contentDate, 'game date helper should resolve the generator date');
  assert.equal(
    GENERATED_GAME_PAGE_CONTENT_DATE,
    contentDate,
    'content date resolver should use the generator editorial date'
  );
});

test('all generated game pages receive the canonical game editorial date and synchronization pass', () => {
  const synced = new Set(getSyncedHtmlFiles(root));
  for (const file of getGamePageHtmlFiles(root)) {
    assert.equal(getContentDateForFile(file), GENERATED_GAME_PAGE_CONTENT_DATE, `${file} should use the game editorial date`);
    assert.equal(synced.has(file), true, `${file} should be synchronized after generation`);
  }
});
