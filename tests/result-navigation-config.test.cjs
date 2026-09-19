'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/result-navigation-config.js'), 'utf8')
  .replace('export function assertResultNavigationCoverage', 'function assertResultNavigationCoverage')
  .replace('export function getResultNavigationConfig', 'function getResultNavigationConfig')
  + '\nglobalThis.__assertResultNavigationCoverage = assertResultNavigationCoverage;\n'
  + 'globalThis.__getResultNavigationConfig = getResultNavigationConfig;\n';
const context = {};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'result-navigation-config.js' });
const assertCoverage = context.__assertResultNavigationCoverage;
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

test('結果ナビ設定は呼び出し側の変更で後続計算を汚染しない', () => {
  const first = getConfig('JP');
  const expectedTitle = first.decisionTitle;
  const expectedHref = first.relatedArticleGroups.default[0].href;
  const expectedLength = first.relatedArticleGroups.default.length;

  try { first.decisionTitle = 'changed'; } catch {}
  try { first.relatedArticleGroups.default[0].href = 'broken'; } catch {}
  try { first.relatedArticleGroups.default.push({ href: 'broken', title: 'broken' }); } catch {}

  const next = getConfig('JP');
  assert.equal(next.decisionTitle, expectedTitle);
  assert.equal(next.relatedArticleGroups.default[0].href, expectedHref);
  assert.equal(next.relatedArticleGroups.default.length, expectedLength);
});

test('結果ナビ設定の全リンクを契約として検証する', () => {
  const regionBasePaths = { JP: '', US: 'en', KR: 'ko', TW: 'tw', HK: 'hk', IN: 'in' };
  const actionKeys = ['highSpend', 'campaign', 'diamond', 'platinum', 'nearYearEnd', 'giftCards'];

  for (const [region, basePath] of Object.entries(regionBasePaths)) {
    const config = getConfig(region);
    for (const [groupName, group] of Object.entries(config.relatedArticleGroups)) {
      assert.equal(new Set(group.map(link => link.href)).size, group.length, `${region}/${groupName}: duplicate href`);
    }

    const links = [
      ...Object.values(config.relatedArticleGroups).flat(),
      ...actionKeys.map(key => config[key])
    ];

    for (const link of links) {
      assert.equal(typeof link.href, 'string', `${region}: href must be a string`);
      assert.ok(link.href.trim(), `${region}: href must not be empty`);
      assert.equal(typeof link.title, 'string', `${region}: title must be a string`);
      assert.ok(link.title.trim(), `${region}: title must not be empty`);

      if (/^https:\/\//i.test(link.href)) {
        const url = new URL(link.href);
        assert.equal(url.protocol, 'https:', `${region}: external links must use HTTPS`);
        assert.equal(url.hostname, 'support.google.com', `${region}: unexpected external host ${url.hostname}`);
        assert.match(url.pathname, /^\/googleplay\//, `${region}: unexpected Google support path ${url.pathname}`);
        continue;
      }

      const cleanHref = link.href.split(/[?#]/, 1)[0];
      let target = cleanHref.startsWith('/')
        ? path.join(root, cleanHref)
        : path.resolve(root, basePath, cleanHref);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      assert.ok(fs.existsSync(target), `${region}: missing result navigation target ${link.href}`);
    }
  }
});

test('専用ランク導線の対応表は実在ページだけを宣言する', () => {
  const regionBasePaths = { JP: '', US: 'en', KR: 'ko', TW: 'tw', HK: 'hk', IN: 'in' };

  for (const [region, basePath] of Object.entries(regionBasePaths)) {
    const config = getConfig(region);
    assert.ok(Array.isArray(config.statusPageRanks), `${region}: statusPageRanks`);
    assert.ok(Array.isArray(config.maintenancePageRanks), `${region}: maintenancePageRanks`);

    for (const rank of config.statusPageRanks) {
      assert.ok(
        fs.existsSync(path.join(root, basePath, 'status', rank, 'index.html')),
        `${region}: missing status page for ${rank}`
      );
    }
    for (const rank of config.maintenancePageRanks) {
      assert.ok(
        fs.existsSync(path.join(root, basePath, 'maintenance', rank, 'index.html')),
        `${region}: missing maintenance page for ${rank}`
      );
    }
  }
});

test('公開地域に結果ナビ設定が無い場合は明示的に失敗する', () => {
  const publicRegions = ['JP', 'US', 'KR', 'TW', 'HK', 'IN'];
  assert.doesNotThrow(() => assertCoverage(publicRegions));
  assert.throws(() => assertCoverage([...publicRegions, 'SG']), /SG/);

  const regionNavigation = fs.readFileSync(path.join(root, 'js/region-navigation.js'), 'utf8');
  assert.match(regionNavigation, /assertResultNavigationCoverage\(Object\.keys\(CONFIGS\)\)/);
});
