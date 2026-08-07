'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
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
const {
  createRevision,
  syncPublicAssetVersions
} = require('../scripts/article-asset-versioning.cjs');
const {
  synchronizeArticleStaticUsability
} = require('../scripts/article-static-usability.cjs');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-phase1-'));
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

test('Lighthouse 13のCLS要素・原因・長時間タスク・改善候補を抽出する', () => {
  const report = {
    audits: {
      'layout-shifts': {
        details: {
          type: 'table',
          items: [{
            node: { selector: 'body > main.main-card' },
            score: 0.21,
            subItems: {
              items: [{
                extra: { selector: '.header' },
                cause: 'Injected element moved the article'
              }]
            }
          }]
        }
      },
      'cls-culprits-insight': {
        details: {
          type: 'list',
          items: [{
            type: 'table',
            items: [
              { node: { type: 'text', value: 'Total' }, score: 0.21 },
              { node: { selector: 'body > main.main-card' }, score: 0.21 }
            ]
          }]
        }
      },
      'long-tasks': {
        details: {
          items: [{ duration: 320, startTime: 1200, url: 'https://example.test/app.js' }]
        }
      },
      'unused-javascript': {
        title: 'Reduce unused JavaScript',
        details: { overallSavingsMs: 250, overallSavingsBytes: 12000 }
      },
      'total-byte-weight': {
        title: 'Avoid enormous network payloads',
        numericValue: 500000,
        details: {}
      }
    }
  };

  assert.deepEqual(layoutShiftItems(report)[0], {
    auditId: 'layout-shifts',
    description: 'body > main.main-card',
    score: 0.21,
    causes: [{
      cause: 'Injected element moved the article',
      element: '.header'
    }]
  });
  assert.equal(layoutShiftItems(report).length, 1, '重複したCLS行をまとめる');
  assert.equal(longTaskItems(report)[0].durationMs, 320);
  assert.deepEqual(topOpportunities(report).map(item => item.id), ['unused-javascript']);
});

test('性能ワークフローがPR成果物・記事一覧・診断アーティファクトを検査する', () => {
  const workflow = read('.github/workflows/mobile-performance.yml');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(workflow, /audit_page article-hub \/blog\//);
  assert.match(workflow, /blocked-url-patterns=https:\/\/www\.googletagmanager\.com\/\*/);
  assert.match(workflow, /AUDIT_TARGET.*local/);
  assert.match(workflow, /lighthouse-diagnostics\.cjs/);
  assert.match(workflow, /actions\/upload-artifact@/);
  assert.match(workflow, /retention-days:\s*14/);
});

test('modulepreloadと実スクリプトが同じ内容ハッシュへ同期される', () => {
  const tempRoot = createTempRoot();
  try {
    fs.mkdirSync(path.join(tempRoot, 'js'), { recursive: true });
    const scriptPath = path.join(tempRoot, 'js', 'main.js');
    fs.writeFileSync(scriptPath, 'console.log("phase1");\n');
    fs.writeFileSync(path.join(tempRoot, 'index.html'), [
      '<link rel="modulepreload" href="js/main.js?v=old-preload">',
      '<script type="module" src="js/main.js?v=old-script"></script>'
    ].join('\n'));

    assert.equal(syncPublicAssetVersions(tempRoot), 1);
    const html = fs.readFileSync(path.join(tempRoot, 'index.html'), 'utf8');
    const revision = createRevision(scriptPath);
    assert.match(html, new RegExp(`modulepreload[^>]+main\\.js\\?v=${revision}`));
    assert.match(html, new RegExp(`script[^>]+main\\.js\\?v=${revision}`));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('記事の共通ヘッダーと計算機導線を生成時に一度だけ埋め込む', () => {
  const tempRoot = createTempRoot();
  try {
    fs.mkdirSync(path.join(tempRoot, 'blog'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'articles'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'blog', 'articles.json'), JSON.stringify([
      { file: '../articles/example.html' }
    ]));
    fs.writeFileSync(path.join(tempRoot, 'articles', 'example.html'), [
      '<!doctype html><html><body>',
      '<main class="main-card"><article class="content">',
      '<section class="answer-box"><h2>先に結論</h2><p>内容</p></section>',
      '<section class="section"><h2>詳細</h2></section>',
      '</article></main></body></html>'
    ].join(''));

    assert.equal(synchronizeArticleStaticUsability(tempRoot), 1);
    assert.equal(synchronizeArticleStaticUsability(tempRoot), 0, '二度目は変更しない');
    const html = fs.readFileSync(path.join(tempRoot, 'articles', 'example.html'), 'utf8');
    assert.equal((html.match(/article-static-header/g) || []).length, 1);
    assert.equal((html.match(/article-calculator-prompt/g) || []).length, 2, 'asideと内部クラスに一度ずつ現れる');
    assert.ok(html.indexOf('article-static-header') < html.indexOf('<main'));
    assert.ok(html.indexOf('article-calculator-prompt') > html.indexOf('</section>'));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('記事広告枠・静的ヘッダー・計算図が初期レイアウトを予約する', () => {
  const articleCss = read('articles/article-shared.css');
  const calculatorCss = read('style.css');
  assert.match(articleCss, /\.article-ad-slot\s*\{[^}]*min-height:\s*280px/s);
  assert.match(articleCss, /@media\s*\(max-width:\s*600px\)[\s\S]*\.article-ad-slot\s*\{[^}]*min-height:\s*250px/s);
  assert.match(articleCss, /\.article-static-header/);
  assert.match(articleCss, /\.header-inner/);
  assert.match(calculatorCss, /\.calculation-flow-figure\s+img\s*\{[^}]*aspect-ratio:\s*8\s*\/\s*3/s);
});

test('記事一覧はモバイルで重いOGP画像を生成せず、デスクトップだけに画像を残す', () => {
  const script = read('blog/script.js');
  const css = read('blog/index-compact.css');
  assert.match(script, /shouldRenderArticleThumbnails/);
  assert.match(script, /card-thumb--text-only/);
  assert.match(script, /decoding="async"/);
  assert.match(css, /\.card-thumb--text-only/);
});

test('生成済み代表記事は初回HTMLからヘッダーと計算導線を持つ', () => {
  const html = read('articles/2026-03-10-play-points-reflection-timing.html');
  assert.match(html, /<header class="header article-static-header">/);
  assert.match(html, /<aside class="article-calculator-prompt cta-box"/);
  assert.ok(html.indexOf('article-static-header') < html.indexOf('<main class="main-card">'));
});
