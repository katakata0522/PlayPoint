'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  read, writeIfChanged, createRequiredEdits, replaceDescriptionsAcrossGamePages,
  requireGuideMetadata, createGuideShell
} = require('../scripts/game-seo-common.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'game-seo-common-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

const edits = createRequiredEdits('fixture');

test('required edits keep repeat execution safe but reject missing source contracts', () => {
  assert.equal(edits.replaceRequired('before', 'before', 'after', 'copy'), 'after');
  assert.equal(edits.replaceRequired('after', 'before', 'after', 'copy'), 'after');
  assert.equal(edits.replaceAllRequired('after before before', 'before', 'after', 'copy'), 'after after after');
  assert.throws(() => edits.replaceRequired('unknown', 'before', 'after', 'copy'), /\[fixture\] copy/);
  assert.throws(() => edits.replaceAllRequired('unknown', 'before', 'after', 'copy'), /expected source text/);
  assert.throws(() => edits.insertBeforeRequired('unknown', 'needle', 'block', 'marker', 'insert'), /insertion point/);
  const inserted = edits.insertBeforeRequired('text needle', 'needle', '<aside>marker</aside>', 'marker', 'insert');
  assert.equal(edits.insertBeforeRequired(inserted, 'needle', '<aside>marker</aside>', 'marker', 'insert'), inserted);
});

test('a reused global expression cannot hide required replacements or retain a failed cursor', () => {
  const expression = /before/g;
  expression.lastIndex = 100;
  assert.equal(edits.replaceRegexRequired('before before', expression, 'after', '', 'regex'), 'after after');
  expression.lastIndex = 100;
  assert.throws(() => edits.replaceRegexRequired('missing', expression, 'after', '', 'regex'), /expected source pattern/);
  assert.equal(expression.lastIndex, 0);
  assert.equal(edits.replaceRegexRequired('before', expression, 'after', '', 'regex'), 'after');
  assert.equal(edits.replaceRegexRequired('marker', expression, 'after', 'marker', 'regex'), 'marker');
});

test('shared writer normalizes only line endings and never writes unchanged content', t => {
  const root = fixture(t);
  assert.equal(writeIfChanged(root, 'games/test/index.html', 'text\r\n'), true);
  assert.equal(read(root, 'games/test/index.html'), 'text\n');
  t.mock.method(fs, 'writeFileSync', () => { throw new Error('unexpected write'); });
  t.mock.method(fs, 'mkdirSync', () => { throw new Error('unexpected mkdir'); });
  assert.equal(writeIfChanged(root, 'games/test/index.html', 'text\r\n'), false);
});

test('multiple ordered description replacements preserve scope, order and idempotency', t => {
  const root = fixture(t);
  for (const file of ['games/test/index.html', 'games/test/guide/index.html', 'en/games/test/index.html']) {
    writeIfChanged(root, file, 'old second unchanged');
  }
  const originalWrite = fs.writeFileSync;
  const writes = [];
  t.mock.method(fs, 'writeFileSync', function (file, ...args) {
    writes.push(path.relative(root, file));
    return Reflect.apply(originalWrite, this, [file, ...args]);
  });

  const replacements = [['old', 'intermediate'], ['intermediate', 'new'], ['second', 'other']];
  const expected = ['games/test/index.html', 'games/test/guide/index.html'];
  assert.deepEqual(replaceDescriptionsAcrossGamePages(root, replacements), expected);
  assert.equal(writes.every(file => expected.includes(file)), true, 'non-Japanese or unrelated files must not be written');
  assert.equal(fs.readFileSync(path.join(root, expected[0]), 'utf8'), 'new other unchanged');
  assert.equal(fs.readFileSync(path.join(root, 'en/games/test/index.html'), 'utf8'), 'old second unchanged');

  writes.length = 0;
  assert.deepEqual(replaceDescriptionsAcrossGamePages(root, replacements), []);
  assert.equal(writes.length, 0, 'repeat execution must not rewrite unchanged files');
});

test('all-language correction must be explicitly selected and does not touch non-game articles', t => {
  const root = fixture(t);
  for (const file of ['games/test/index.html', 'en/games/test/index.html', 'ko/games/test/index.html', 'tw/games/test/index.html', 'articles/unrelated.html']) {
    writeIfChanged(root, file, 'old');
  }
  assert.equal(replaceDescriptionsAcrossGamePages(root, [['old', 'new']], { japaneseOnly: false }).length, 4);
  assert.equal(read(root, 'articles/unrelated.html'), 'old');
});

test('guide title ownership is shared while a distinct page description stays explicit', () => {
  const meta = requireGuideMetadata('starrail', 'supply-pass-value');
  assert.match(meta.title, /列車補給標章/);
  assert.equal(requireGuideMetadata('starrail', 'supply-pass-value', 'Distinct search description').description, 'Distinct search description');
  assert.throws(() => requireGuideMetadata('unknown', 'guide'), /未登録/);
  const render = createGuideShell({ verifiedAt: '2026-09-13', badge: 'Evidence', verificationPolicy: 'Do not infer prices.' });
  const html = render({ gameId: 'starrail', slug: 'supply-pass-value', lead: 'Lead', body: '<p>Facts</p>', pageDescription: 'Distinct search description', faq: [{ q: 'Question', a: 'Answer' }] });
  assert.ok(html.includes('<title>' + meta.title + ' | Playポイント計算機</title>'));
  assert.ok(html.includes('name="description" content="Distinct search description"'));
  assert.ok(html.includes('<p>Facts</p>'));
  assert.ok(html.includes('Do not infer prices.'));
  assert.match(html, /"dateModified": "2026-09-13"/);
  assert.match(html, /"name": "Question"/);
});
