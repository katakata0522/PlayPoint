'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');

test('human sitemap introduces its purpose before secondary navigation groups', () => {
  const mainMatch = sitemap.match(/<main\b[^>]*data-human-sitemap-mode=["']task-hub["'][^>]*>([\s\S]*?)<\/main>/i);
  assert.ok(mainMatch, 'task-hub main is missing');
  const main = mainMatch[1];
  const h1Index = main.search(/<h1\b/i);
  const h1End = main.indexOf('</h1>', h1Index);
  const leadIndex = main.indexOf('<p', h1End);
  const firstH2Index = main.indexOf('<h2', h1End);

  assert.ok(h1Index >= 0, 'human sitemap needs one primary heading');
  assert.ok(h1End > h1Index, 'primary heading must close');
  assert.ok(leadIndex > h1End, 'purpose lead must follow the primary heading');
  assert.ok(firstH2Index > leadIndex, 'secondary navigation groups must follow the purpose lead');
  assert.equal((main.match(/<h1\b/gi) || []).length, 1);
});

test('comparison reference remains discoverable exactly once after the sitemap hierarchy repair', () => {
  const matches = [...sitemap.matchAll(/<a\b[^>]*href=["']compare\/earning-rates\/["'][^>]*>([\s\S]*?)<\/a>/gi)];
  assert.equal(matches.length, 1);
  const label = matches[0][1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(label.length > 0, 'comparison reference needs visible link text');
});

