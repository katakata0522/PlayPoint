'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { generatedLocaleFiles } = require('../scripts/build-targets.cjs');
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
