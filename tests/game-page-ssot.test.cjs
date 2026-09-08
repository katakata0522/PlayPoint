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

function isGameDetailPage(file) {
  return !/(^|\/)games\/index\.html$/.test(file);
}

function readLastModified(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"\s*\/?>/);
  assert.ok(match, `${file} should expose last-modified metadata`);
  return match[1];
}

function gameSlugsForLocale(localeDirectory, gameFiles = getGamePageHtmlFiles(root)) {
  const prefix = localeDirectory ? `${localeDirectory}/games/` : 'games/';
  return gameFiles
    .filter(file => file.startsWith(prefix) && file !== `${prefix}index.html`)
    .map(file => file.slice(prefix.length).replace(/\/index\.html$/, ''))
    .sort();
}

test('generated game outputs cover the canonical game locales with the same game set', () => {
  assert.deepEqual(
    [...GAME_LOCALE_DIRECTORIES],
    ['', ...SITE_LOCALES.filter(locale => locale !== 'ja')],
    'Japanese game pages should stay at root and international locales should use locale directories'
  );

  const gameFiles = getGamePageHtmlFiles(root);
  const japaneseSlugs = gameSlugsForLocale('', gameFiles);
  assert.ok(japaneseSlugs.length > 0, 'at least one generated Japanese game page is required');
  assert.equal(new Set(japaneseSlugs).size, japaneseSlugs.length, 'generated game slugs must stay unique');

  for (const localeDirectory of GAME_LOCALE_DIRECTORIES) {
    const prefix = localeDirectory ? `${localeDirectory}/` : '';
    assert.ok(gameFiles.includes(`${prefix}games/index.html`), `${prefix}games/index.html should exist`);
    assert.deepEqual(
      gameSlugsForLocale(localeDirectory, gameFiles),
      japaneseSlugs,
      `${localeDirectory || 'ja'} generated game set should match Japanese`
    );
  }
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

test('default game editorial date stays aligned with the shared resolver', () => {
  const contentDate = getGameContentDate(root);
  assert.match(contentDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(
    GENERATED_GAME_PAGE_CONTENT_DATE,
    contentDate,
    'content date resolver should keep the generator date as the default for unchanged game pages'
  );
});

test('game editorial-date overrides target real generated pages without freezing the current override list', () => {
  const generatedPages = new Set(getGamePageHtmlFiles(root));

  for (const [file, date] of Object.entries(GAME_PAGE_CONTENT_DATE_OVERRIDES)) {
    assert.ok(generatedPages.has(file), `${file} override should target a generated game page`);
    assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${file} override should be an ISO date`);
    assert.equal(getGeneratedGamePageContentDate(file), date, `${file} should resolve its configured editorial date`);
  }

  assert.equal(
    getGeneratedGamePageContentDate('games/index.html'),
    GENERATED_GAME_PAGE_CONTENT_DATE,
    'the game portal should keep the shared default date unless it has an explicit override'
  );
});

test('all generated game pages use resolved dates, detail pages publish them, and every page stays in the synchronization pass', () => {
  const synced = new Set(getSyncedHtmlFiles(root));
  for (const file of getGamePageHtmlFiles(root)) {
    const resolvedDate = getGeneratedGamePageContentDate(file);
    assert.equal(getContentDateForFile(file), resolvedDate, `${file} should use its resolved game editorial date`);
    if (isGameDetailPage(file)) {
      assert.equal(readLastModified(file), resolvedDate, `${file} public metadata should match its resolved editorial date`);
    }
    assert.equal(synced.has(file), true, `${file} should be synchronized after generation`);
  }
});
