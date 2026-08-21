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
const { createLocales } = require('../scripts/locale-config.cjs');

const root = path.resolve(__dirname, '..');

test('多言語トップの生成対象はlocale設定から導出する', () => {
  const expected = Object.keys(createLocales())
    .map(locale => `${locale}/index.html`)
    .sort();
  const actual = [...generatedLocaleFiles].sort();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');

  assert.deepEqual(actual, expected);
  assert.match(buildTargetsSource, /Object\.keys\(createLocales\(\)\)/);
  assert.doesNotMatch(
    buildTargetsSource,
    /const generatedLocaleFiles = \[\s*['"]/,
    'build-targets.cjs must not restore a second handwritten locale output list'
  );
});

test('国際記事の追跡・公式参照検査対象もlocale設定から導出する', () => {
  const localeKeys = Object.keys(createLocales());
  const expectedDirectories = localeKeys.map(locale => `${locale}/articles`).sort();
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
    .filter(file => localeKeys.some(locale => file.startsWith(`${locale}/articles/`)))
    .sort();
  const buildTargetsSource = fs.readFileSync(path.join(root, 'scripts', 'build-targets.cjs'), 'utf8');
  const preparePrSource = fs.readFileSync(path.join(root, 'scripts', 'prepare-pr.cjs'), 'utf8');

  assert.deepEqual([...internationalArticleDirectories].sort(), expectedDirectories);
  assert.deepEqual(actualInternationalFiles, expectedArticleFiles);
  assert.match(buildTargetsSource, /localeKeys\.map\(locale => `\$\{locale\}\/articles`\)/);
  assert.match(preparePrSource, /Object\.keys\(createLocales\(\)\)\.flatMap/);
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
