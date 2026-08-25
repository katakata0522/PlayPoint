'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Browser SmokeのPR対象に香港・インドを含める', () => {
  const workflow = read('.github/workflows/browser-smoke.yml');
  assert.match(workflow, /- 'hk\/\*\*'/);
  assert.match(workflow, /- 'in\/\*\*'/);
});

test('PR Gateは検査専用、Deployだけが配信用アセットを保持する', () => {
  const qualityWorkflow = read('.github/workflows/quality-check.yml');
  const deployWorkflow = read('.github/workflows/deploy.yml');

  assert.match(qualityWorkflow, /run: node \.github\/scripts\/preflight\.cjs\s*$/m);
  assert.doesNotMatch(qualityWorkflow, /preflight\.cjs --prepare-deploy/);
  assert.match(deployWorkflow, /preflight\.cjs --prepare-deploy/);
});

test('Deployは本番非公開のtests・docs変更だけでは起動しない', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /- 'tests\/\*\*'/);
  assert.match(workflow, /- 'docs\/\*\*'/);
});

test('preflightは本番同期前に鮮度と記事正規化をcheck-onlyで検証する', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  const freshCommand = "['scripts/latest-hub-audit.cjs', '--fresh']";
  const navigationCheck = "['scripts/article-content-navigation-normalize.cjs', '--check']";
  const seoCheck = "['scripts/article-seo-normalize.cjs', '--check']";

  assert.ok(preflight.includes(freshCommand), 'latest hub freshness check is missing');
  assert.ok(preflight.includes(navigationCheck), 'article navigation check-only phase is missing');
  assert.ok(preflight.includes(seoCheck), 'article SEO check-only phase is missing');
  assert.ok(
    !preflight.includes("['scripts/article-content-navigation-normalize.cjs']"),
    'preflight must not rewrite article navigation'
  );
  assert.ok(
    !preflight.includes("['scripts/article-seo-normalize.cjs']"),
    'preflight must not rewrite article SEO'
  );

  const freshIndex = preflight.indexOf(freshCommand);
  const navigationIndex = preflight.indexOf(navigationCheck);
  const seoIndex = preflight.indexOf(seoCheck);
  const minifyIndex = preflight.indexOf("['.github/scripts/minify.cjs']");

  assert.ok(minifyIndex >= 0, 'minify phase is missing');
  assert.ok(freshIndex < minifyIndex, 'latest hub freshness must be checked before deploy preparation');
  assert.ok(navigationIndex < minifyIndex, 'article navigation must be checked before deploy preparation');
  assert.ok(seoIndex < minifyIndex, 'article SEO must be checked before deploy preparation');
});
