'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTextBoundary,
  isBoundaryOnlyChange
} = require('../.github/scripts/verify-build-output.cjs');

test('generated text comparison ignores only line-ending and final-newline differences', () => {
  assert.equal(isBoundaryOnlyChange('alpha\nbeta\n', 'alpha\r\nbeta'), true);
  assert.equal(isBoundaryOnlyChange('alpha\n', 'alpha\n\n'), true);
  assert.equal(normalizeTextBoundary('alpha\r\nbeta'), 'alpha\nbeta\n');
});

test('generated text comparison still rejects semantic or internal whitespace drift', () => {
  assert.equal(
    isBoundaryOnlyChange(
      '<lastmod>2026-09-03</lastmod>\n',
      '<lastmod>2026-09-08</lastmod>\n'
    ),
    false
  );
  assert.equal(isBoundaryOnlyChange('alpha beta\n', 'alpha  beta\n'), false);
  assert.equal(isBoundaryOnlyChange(null, 'alpha\n'), false);
});
