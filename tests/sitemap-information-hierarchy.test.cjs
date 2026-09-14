'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');

test('human sitemap introduces the page purpose before secondary navigation groups', () => {
  const mainStart = sitemap.indexOf('<main class="container">');
  const h1Index = sitemap.indexOf('<h1>サイトマップ</h1>', mainStart);
  const firstH2Index = sitemap.indexOf('<h2>', mainStart);
  const leadIndex = sitemap.indexOf('<p class="lead">', mainStart);

  assert.ok(mainStart >= 0);
  assert.ok(h1Index > mainStart);
  assert.ok(leadIndex > h1Index);
  assert.ok(firstH2Index > leadIndex);
  assert.equal((sitemap.match(/<h1\b/g) || []).length, 1);
});

test('comparison reference remains discoverable exactly once after the sitemap hierarchy repair', () => {
  assert.equal((sitemap.match(/href="compare\/earning-rates\/"/g) || []).length, 1);
  assert.match(sitemap, /<h2>比較資料<\/h2>/);
});
