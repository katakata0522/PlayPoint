'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  HREFLANG_BY_LOCALE,
  LOCALES: EXPANSION_LOCALES,
  TOPICS
} = require('../scripts/intl-content-expansion.cjs');
const { HUB_CONTENT } = require('../scripts/intl-manual-content-sync.cjs');
const { LOCALES: SEO_LOCALES } = require('../scripts/intl-seo-content.cjs');
const {
  DEFAULT_INTERNATIONAL_LOCALE,
  INTERNATIONAL_LOCALES
} = require('../scripts/locale-ids.cjs');

const root = path.resolve(__dirname, '..');
const expectedLocales = [...INTERNATIONAL_LOCALES];

function sortedKeys(value) {
  return Object.keys(value).sort();
}

test('international content registries stay aligned with canonical locale identifiers', () => {
  assert.deepEqual(EXPANSION_LOCALES.map(locale => locale.key), expectedLocales);
  assert.deepEqual(sortedKeys(HREFLANG_BY_LOCALE), [...expectedLocales].sort());
  assert.deepEqual(sortedKeys(HUB_CONTENT), [...expectedLocales].sort());
  assert.deepEqual(sortedKeys(SEO_LOCALES), [...expectedLocales].sort());

  for (const topic of TOPICS) {
    assert.deepEqual(
      sortedKeys(topic.labels),
      [...expectedLocales].sort(),
      `${topic.slug} should provide a label for every international locale`
    );
  }
});

test('international x-default uses the canonical default locale', () => {
  assert.equal(DEFAULT_INTERNATIONAL_LOCALE, expectedLocales[0]);
  assert.ok(expectedLocales.includes(DEFAULT_INTERNATIONAL_LOCALE));

  const source = fs.readFileSync(path.join(root, 'scripts', 'intl-content-expansion.cjs'), 'utf8');
  assert.match(source, /articlePath\(DEFAULT_INTERNATIONAL_LOCALE, topic\.slug\)/);
  assert.doesNotMatch(
    source,
    /articlePath\('en', topic\.slug\)/,
    'x-default should not duplicate the default locale literal'
  );
});
