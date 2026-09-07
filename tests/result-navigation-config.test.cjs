'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/result-navigation-config.js'), 'utf8')
  .replace('export function getResultNavigationConfig', 'function getResultNavigationConfig')
  + '\nglobalThis.__getResultNavigationConfig = getResultNavigationConfig;\n';
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'result-navigation-config.js' });
const getConfig = context.__getResultNavigationConfig;
test('結果ナビ設定は公開6地域を明示的に解決し未知地域はJPへ戻す', () => {
  for (const region of ['JP', 'US', 'KR', 'TW', 'HK', 'IN']) {
    const config = getConfig(region);
    assert.ok(config.decisionTitle, `${region}: decisionTitle`);
    assert.ok(config.relatedArticleGroups.default.length > 0, `${region}: default links`);
    assert.ok(config.giftCards.href, `${region}: giftCards`);
  }
  assert.strictEqual(getConfig('UNKNOWN'), getConfig('JP'));
});
test('結果ナビ設定は呼び出しごとに再生成しない', () => {
  assert.strictEqual(getConfig('HK'), getConfig('HK'));
  assert.strictEqual(getConfig('IN'), getConfig('IN'));
  assert.strictEqual(getConfig('US'), getConfig('US'));
});
