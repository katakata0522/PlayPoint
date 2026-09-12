'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../info.html'), 'utf8');
const source = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script[^>]*>/gi)].map(m => m[1]).find(s => s.includes('btn-back-home'));
function destination(referrer, region = 'US') {
  const button = {}, year = {};
  const context = { URL, Date, navigator: { language: 'en-US' }, localStorage: { getItem: () => region },
    window: { location: { origin: 'https://playpoint-sim.com' } },
    document: { referrer, addEventListener: (_, callback) => callback(), getElementById: id => id === 'btn-back-home' ? button : year } };
  vm.runInNewContext(source, context); return button.href;
}
test('案内ページの戻り先は同一オリジンのパスだけから言語を引き継ぐ', () => {
  for (const [referrer, expected] of [
    ['https://playpoint-sim.com/ko/articles/guide.html', 'ko/'],
    ['https://playpoint-sim.com/tw/', 'tw/'],
    ['https://playpoint-sim.com/en/', 'en/'],
    ['https://playpoint-sim.com/?next=/ko/', './'],
    ['https://playpoint-sim.com.evil.example/ko/', 'en/'],
    ['https://evil.example/?site=playpoint-sim.com', 'en/'],
    ['https://playpoint-sim.com@evil.example/tw/', 'en/'],
    ['http://playpoint-sim.com/ko/', 'en/'],
    ['not a URL', 'en/'], ['', 'en/']
  ]) assert.equal(destination(referrer), expected, referrer);
  assert.equal(destination('', 'KR'), 'ko/');
});
