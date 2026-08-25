'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getSyncedHtmlFiles } = require('../scripts/build-targets.cjs');
const {
  GENERATED_GAME_PAGE_CONTENT_DATE,
  GAME_PAGE_CONTENT_DATE_OVERRIDES,
  getContentDateForFile,
  getGeneratedGamePageContentDate
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

function readLastModified(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"\s*\/?>/);
  assert.ok(match, `${file} should expose last-modified metadata`);
  return match[1];
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

test('game sitemap entries match discovered pages and each page editorial date', () => {
  const sitemapEntries = getGameSitemapEntries(root);
  const entriesByUrl = new Map(sitemapEntries.map(entry => [entry.url, entry]));
  const gameFiles = getGamePageHtmlFiles(root);

  assert.equal(entriesByUrl.size, gameFiles.length, 'game sitemap should contain every generated game page exactly once');

  for (const file of gameFiles) {
    const url = `${SITE_ORIGIN}/${file.replace(/index\.html$/, '')}`;
    const entry = entriesByUrl.get(url);
    assert.ok(entry, `${file} should be present in the game sitemap`);
    assert.equal(
      entry.lastmod,
      getGeneratedGamePageContentDate(file),
      `${file} sitemap lastmod should use its resolved editorial date`
    );
  }
});

test('default game editorial date stays aligned from generator to resolver', () => {
  const { contentDate } = getGeneratorMetadata();

  assert.equal(getGameContentDate(root), contentDate, 'game date helper should resolve the generator default date');
  assert.equal(
    GENERATED_GAME_PAGE_CONTENT_DATE,
    contentDate,
    'content date resolver should keep the generator date as the default for unchanged game pages'
  );
});

test('meaningfully edited game pages can override the shared default without changing other locales', () => {
  const expectedOverrides = [
    'games/arknights/index.html',
    'games/genshin/index.html',
    'games/honkai3rd/index.html',
    'games/nikke/index.html',
    'games/phantomparade/index.html',
    'games/wutheringwaves/index.html'
  ];

  assert.deepEqual(Object.keys(GAME_PAGE_CONTENT_DATE_OVERRIDES).sort(), expectedOverrides.sort());
  for (const file of expectedOverrides) {
    assert.equal(getGeneratedGamePageContentDate(file), '2026-08-25', `${file} should carry its meaningful edit date`);
  }

  assert.equal(
    getGeneratedGamePageContentDate('en/games/genshin/index.html'),
    GENERATED_GAME_PAGE_CONTENT_DATE,
    'an unchanged locale counterpart should keep the shared default date'
  );
  assert.equal(
    getGeneratedGamePageContentDate('games/index.html'),
    GENERATED_GAME_PAGE_CONTENT_DATE,
    'the game portal should keep the shared default date unless it is edited'
  );
});

test('all generated game pages publish their resolved editorial date and stay in the synchronization pass', () => {
  const synced = new Set(getSyncedHtmlFiles(root));
  for (const file of getGamePageHtmlFiles(root)) {
    const resolvedDate = getGeneratedGamePageContentDate(file);
    assert.equal(getContentDateForFile(file), resolvedDate, `${file} should use its resolved game editorial date`);
    assert.equal(readLastModified(file), resolvedDate, `${file} public metadata should match its resolved editorial date`);
    assert.equal(synced.has(file), true, `${file} should be synchronized after generation`);
  }
});
