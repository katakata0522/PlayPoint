'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function ruleBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'i'));
  return match ? match[1] : '';
}

test('あとがきの戻るボタンは白背景でも文字が残る', () => {
  const style = read('style.css');
  const shell = read('site-shell-vnext.css');
  const info = read('info.html');

  assert.match(info, /site-shell-vnext\.css/);
  assert.match(info, /class="btn-back-home"/);
  assert.match(style, /\.btn-back-home[\s\S]*?color:\s*#fff\s*!important/);

  const shellBtn = ruleBlock(shell, '.calculator-wrapper .btn-back-home');
  assert.ok(shellBtn, 'site-shell must style afterword .btn-back-home');
  assert.match(shellBtn, /background:\s*var\(--pp-shell-surface\)/);
  assert.match(
    shellBtn,
    /color:\s*var\(--pp-shell-link\)\s*!important/,
    'shell text color must beat style.css white !important'
  );
});
