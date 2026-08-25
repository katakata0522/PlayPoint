'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const generator = fs.readFileSync(path.join(root, 'scripts/generate-game-simulators.cjs'), 'utf8');

const japaneseGamePages = fs.readdirSync(path.join(root, 'games'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => path.join(root, 'games', entry.name, 'index.html'))
  .filter(file => fs.existsSync(file));

test('ゲームFAQは旧5倍CP表現ではなく特別獲得率として案内する', () => {
  assert.doesNotMatch(generator, /5倍CP時/);
  assert.doesNotMatch(generator, /通常時（1%）/);

  for (const file of japaneseGamePages) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /5倍CP時/, path.relative(root, file));
    assert.doesNotMatch(html, /通常時（1%）/, path.relative(root, file));
  }
});
