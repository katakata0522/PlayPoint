'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const {
  HARD_BUDGETS,
  TARGETS,
  getProfile
} = require('../.github/scripts/mobile-performance-budget.cjs');
const {
  layoutShiftItems,
  longTaskItems,
  topOpportunities
} = require('../.github/scripts/lighthouse-diagnostics.cjs');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('低性能Androidのハード予算が旧基準より厳しく、ページ別に設定されている', () => {
  assert.equal(getProfile('calculator-home.json'), 'calculatorHome');
  assert.equal(getProfile('article-hub.json'), 'articleHub');
  assert.equal(getProfile('representative-article.json'), 'representativeArticle');

  assert.ok(HARD_BUDGETS.calculatorHome.performanceScore >= 0.65);
  assert.ok(HARD_BUDGETS.articleHub.totalBlockingTimeMs <= 1200);
  assert.ok(HARD_BUDGETS.representativeArticle.totalBlockingTimeMs <= 800);
  assert.ok(HARD_BUDGETS.representativeArticle.cumulativeLayoutShift <= 0.15);
  assert.ok(HARD_BUDGETS.default.totalByteWeight <= 350 * 1024);
  assert.equal(TARGETS.cumulativeLayoutShift, 0.10);
});

test('Lighthouse診断がCLS要素・長時間タスク・改善候補を抽出する', () => {
  const report = {
    audits: {
      'layout-shift-elements': {
        details: {
          items: [{ node: { selector: '.article-ad-slot' }, score: 0.21 }]
        }
      },
      'long-tasks': {
        details: {
          items: [{ duration: 320, startTime: 1200, url: 'https://example.test/app.js' }]
        }
      },
      'unused-javascript': {
        title: 'Reduce unused JavaScript',
        numericValue: 500,
        details: { overallSavingsMs: 250, overallSavingsBytes: 12000 }
      }
    }
  };

  assert.deepEqual(layoutShiftItems(report)[0], {
    auditId: 'layout-shift-elements',
    description: '.article-ad-slot',
    score: 0.21
  });
  assert.equal(longTaskItems(report)[0].durationMs, 320);
  assert.equal(topOpportunities(report)[0].id, 'unused-javascript');
});

test('性能ワークフローがPR成果物・記事一覧・診断アーティファクトを検査する', () => {
  const workflow = read('.github/workflows/mobile-performance.yml');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(workflow, /audit_page article-hub \/blog\//);
  assert.match(workflow, /lighthouse-diagnostics\.cjs/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.match(workflow, /retention-days:\s*14/);
});

test('記事広告枠が端末幅別の予約領域を持つ', () => {
  const css = read('articles/article-shared.css');
  assert.match(css, /\.article-ad-slot\s*\{[^}]*min-height:\s*280px/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)[\s\S]*\.article-ad-slot\s*\{[^}]*min-height:\s*250px/s);
});
