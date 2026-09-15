'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadReturnScript(relativePath) {
  const html = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script[^>]*>/gi)]
    .map(match => match[1])
    .find(source => source.includes('btn-back-home'));
}

function buttonState(relativePath, referrer, region = 'US') {
  const source = loadReturnScript(relativePath);
  const button = {}, year = {};
  const context = {
    URL,
    Date,
    navigator: { language: 'en-US' },
    localStorage: { getItem: () => region },
    window: { location: { origin: 'https://playpoint-sim.com' } },
    document: {
      referrer,
      addEventListener: (_, callback) => callback(),
      getElementById: id => id === 'btn-back-home' ? button : year
    }
  };
  vm.runInNewContext(source, context);
  return button;
}

const referrerCases = [
  ['https://playpoint-sim.com/ko/articles/guide.html', 'ko/'],
  ['https://playpoint-sim.com/tw/', 'tw/'],
  ['https://playpoint-sim.com/en/', 'en/'],
  ['https://playpoint-sim.com/?next=/ko/', './'],
  ['https://playpoint-sim.com.evil.example/ko/', 'en/'],
  ['https://evil.example/?site=playpoint-sim.com', 'en/'],
  ['https://playpoint-sim.com@evil.example/tw/', 'en/'],
  ['http://playpoint-sim.com/ko/', 'en/'],
  ['not a URL', 'en/'],
  ['', 'en/']
];

test('案内ページの戻り先は同一オリジンのパスだけから言語を引き継ぐ', () => {
  for (const relativePath of ['info.html', 'about-playpoints.html']) {
    for (const [referrer, expected] of referrerCases) {
      assert.equal(buttonState(relativePath, referrer).href, expected, `${relativePath}: ${referrer}`);
    }
    assert.equal(buttonState(relativePath, '', 'KR').href, 'ko/', relativePath);
  }
});

test('更新履歴の戻りラベルも外部referrerでは言語を切り替えない', () => {
  const sameOriginCases = [
    ['https://playpoint-sim.com/ko/articles/guide.html', '← Q&A로 돌아가기'],
    ['https://playpoint-sim.com/tw/', '← 返回問與答'],
    ['https://playpoint-sim.com/en/', '← Go Back to Q&A'],
    ['https://playpoint-sim.com/?next=/ko/', '← あとがきに戻る']
  ];
  for (const [referrer, expectedText] of sameOriginCases) {
    const button = buttonState('changelog.html', referrer);
    assert.equal(button.href, 'info.html');
    assert.equal(button.textContent, expectedText, referrer);
  }

  for (const referrer of [
    'https://playpoint-sim.com.evil.example/ko/',
    'https://evil.example/?site=playpoint-sim.com',
    'https://playpoint-sim.com@evil.example/tw/',
    'http://playpoint-sim.com/ko/',
    'not a URL',
    ''
  ]) {
    const button = buttonState('changelog.html', referrer, 'US');
    assert.equal(button.href, 'info.html');
    assert.equal(button.textContent, '← Go Back to Q&A', referrer);
  }

  assert.equal(buttonState('changelog.html', '', 'KR').textContent, '← Q&A로 돌아가기');
});
