'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  lpFiles,
  normalizeLpContent
} = require('../scripts/insert-lp-monetization.cjs');

const root = path.resolve(__dirname, '..');

test('LP収益セクションの正規化は全対象でbyte-idempotent', () => {
  for (const file of lpFiles) {
    const absolutePath = path.join(root, file);
    const committed = fs.readFileSync(absolutePath, 'utf8');
    const once = normalizeLpContent(committed);
    const twice = normalizeLpContent(once);

    assert.equal(twice, once, `${file}: 2回目の正規化で差分が出ています`);
    assert.equal(
      (once.match(/課金前に確認したいギフトコード購入条件/g) || []).length,
      1,
      `${file}: 管理セクションは1件だけである必要があります`
    );
  }
});

test('コミット済みLPはcanonical正規化済みである', () => {
  for (const file of lpFiles) {
    const absolutePath = path.join(root, file);
    const committed = fs.readFileSync(absolutePath, 'utf8');
    assert.equal(
      normalizeLpContent(committed),
      committed,
      `${file}: canonical buildの再実行で差分が出ます`
    );
  }
});
