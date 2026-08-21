'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  articleHtmlFiles,
  generatedLocaleFiles,
  internationalArticleDirectories
} = require('../scripts/build-targets.cjs');
const { TOP_PAGE_CONTENT_DATES } = require('../scripts/content-dates.cjs');
const {
  INTERNATIONAL_LOCALES,
  SITE_LOCALES
} = require('../scripts/locale-ids.cjs');
const { createLocales } = require('../scripts/locale-config.cjs');

const root = path.resolve(__dirname, '..');

test('公開locale識別子は副作用のないleaf moduleを正本として各設定と一致する', () => {
  assert.deepEqual(Object.keys(createLocales()), [...INTERNATIONAL_LOCALES]);
  assert.deepEqual(Object.keys(TOP_PAGE_CONTENT_DATES), [...SITE_LOCALES]);

  const localeIdsSource = fs.readFileSync(path.join(root, 'scripts', 'locale-ids.cjs'), 'utf8');
  assert.doesNotMatch(
    localeIdsSource,
    /require\(['"]\.\//,
    'locale-ids.cjs should remain dependency-free to avoid CommonJS cycles'
  );
});

test('多言語トップの生成対象は共通locale識別子から導出する', () => {
  const expected = INTERNATIONAL_LOCALES
    .map(locale => `${locale}/index.html`)
    .sort();
  const actual = [...generatedLocaleFiles].sort();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');

  assert.deepEqual(actual, expected);
  assert.match(buildTargetsSource, /INTERNATIONAL_LOCALES/);
  assert.doesNotMatch(
    buildTargetsSource,
    /const generatedLocaleFiles = \[\s*['"]/,
    'build-targets.cjs must not restore a second handwritten locale output list'
  );
});

test('国際記事の追跡・公式参照検査対象も共通locale識別子から導出する', () => {
  const expectedDirectories = INTERNATIONAL_LOCALES.map(locale => `${locale}/articles`).sort();
  const expectedArticleFiles = expectedDirectories
    .flatMap(directory => {
      const absoluteDirectory = path.join(root, directory);
      if (!fs.existsSync(absoluteDirectory)) return [];
      return fs.readdirSync(absoluteDirectory)
        .filter(file => file.endsWith('.html'))
        .map(file => `${directory}/${file}`);
    })
    .sort();
  const actualInternationalFiles = articleHtmlFiles
    .filter(file => INTERNATIONAL_LOCALES.some(locale => file.startsWith(`${locale}/articles/`)))
    .sort();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');
  const preparePrSource = fs.readFileSync(path.join(root, 'scripts', 'prepare-pr.cjs'), 'utf8');

  assert.deepEqual([...internationalArticleDirectories].sort(), expectedDirectories);
  assert.deepEqual(actualInternationalFiles, expectedArticleFiles);
  assert.match(buildTargetsSource, /INTERNATIONAL_LOCALES/);
  assert.match(preparePrSource, /INTERNATIONAL_LOCALES\.flatMap/);
  assert.doesNotMatch(
    buildTargetsSource,
    /'en\/articles',\s*'ko\/articles',\s*'tw\/articles'/,
    'build-targets.cjs must not restore a handwritten international article locale list'
  );
  assert.doesNotMatch(
    preparePrSource,
    /\['en',\s*'ko',\s*'tw'\]\.flatMap/,
    'prepare-pr.cjs must not restore a handwritten international article locale list'
  );
});
