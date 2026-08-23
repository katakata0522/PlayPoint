'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  getPublicHtmlFiles,
  normalizeSpeculationRulesHtml
} = require('../scripts/speculation-rules-sync.cjs');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function speculationRuleBlocks(html) {
  return [...html.matchAll(/<script type="speculationrules">\s*([\s\S]*?)\s*<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

function assertNoImpossibleHrefAnd(node, label) {
  if (Array.isArray(node)) {
    node.forEach(item => assertNoImpossibleHrefAnd(item, label));
    return;
  }
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node.and)) {
    const directHrefMatches = node.and.filter(item => item && typeof item.href_matches === 'string');
    assert.ok(
      directHrefMatches.length <= 1,
      `${label}: mutually exclusive href_matches are combined directly with and`
    );
  }

  Object.values(node).forEach(value => assertNoImpossibleHrefAnd(value, label));
}

test('Speculation Rules normalizer groups multiple href matches under OR', () => {
  const source = `<script type="speculationrules">\n{\n  "prerender": [{\n    "where": {\n      "and": [\n        { "href_matches": "/articles/*" },\n        { "href_matches": "/blog/*" },\n        { "href_matches": "/status/*" },\n        { "not": { "selector_matches": "[rel~=nofollow]" } }\n      ]\n    }\n  }]\n}\n</script>`;
  const normalized = normalizeSpeculationRulesHtml(source);
  assert.match(normalized, /"or": \[/);
  const parsed = speculationRuleBlocks(normalized)[0];
  assertNoImpossibleHrefAnd(parsed, 'fixture');
});

test('全公開HTMLのSpeculation Rulesに排他的なhref_matches ANDが残っていない', () => {
  for (const filePath of getPublicHtmlFiles(root)) {
    const relativePath = path.relative(root, filePath).replaceAll('\\', '/');
    for (const rules of speculationRuleBlocks(fs.readFileSync(filePath, 'utf8'))) {
      assertNoImpossibleHrefAnd(rules, relativePath);
    }
  }
});

test('国別比較記事は現在の6地域を案内する', () => {
  const article = read('en/articles/google-play-points-country-differences.html');
  for (const region of ['United States', 'South Korea', 'Taiwan', 'Hong Kong', 'India', 'Japan']) {
    assert.ok(article.includes(region), `comparison article is missing ${region}`);
  }
  assert.match(article, /1 point per HK\$7/);
  assert.match(article, /1 point per ₹5/);
  assert.match(article, /No Diamond tier/);
  assert.match(article, /CountryCode%3DHK/);
  assert.match(article, /CountryCode%3DIN/);
  assert.match(article, /og:title" content="Play Points country differences: 6-region comparison"/);
  assert.doesNotMatch(article, /Play Points country differences: US, Korea, Taiwan/);
  assert.match(article, /Official information checked on 2026-08-24/);
});

test('preflightはビルド前に6地域トップとPWAランチャーの存在を確認する', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  for (const required of [
    'index.html',
    'en/index.html',
    'ko/index.html',
    'tw/index.html',
    'hk/index.html',
    'in/index.html',
    'pwa-launch.html'
  ]) {
    assert.ok(preflight.includes(`'${required}'`), `preflight required files is missing ${required}`);
  }

  const requiredCheck = preflight.indexOf('verifyRequiredPublicFiles();');
  const reproducibilityCheck = preflight.indexOf("runPhase('生成物の再現性検証'");
  assert.ok(requiredCheck >= 0 && reproducibilityCheck >= 0);
  assert.ok(requiredCheck < reproducibilityCheck, 'required public files must be checked before generated files can recreate them');
});

test('本番SmokeとSEO healthは香港・インドの公開トップを監視する', () => {
  const smoke = read('.github/scripts/smoke-test.cjs');
  const seoHealth = read('.github/scripts/seo-health-check.cjs');

  assert.match(smoke, /https:\/\/playpoint-sim\.com\/hk\//);
  assert.match(smoke, /Google Play Points 計算器（香港）/);
  assert.match(smoke, /https:\/\/playpoint-sim\.com\/in\//);
  assert.match(smoke, /Google Play Points Calculator for India/);

  assert.match(seoHealth, /`\$\{BASE_URL\}\/hk\/`/);
  assert.match(seoHealth, /`\$\{BASE_URL\}\/in\/`/);
});
