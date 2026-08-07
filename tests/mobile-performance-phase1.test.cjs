'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const {
  HARD_BUDGETS,
  MINIMUM_SAMPLES,
  TARGETS,
  evaluateProfileGroup,
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

function writeLighthouseReport(directory, name, metrics) {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, JSON.stringify({
    finalUrl: 'https://playpoint-sim.com/',
    categories: { performance: { score: metrics.performanceScore } },
    audits: {
      'largest-contentful-paint': { numericValue: metrics.largestContentfulPaintMs },
      'total-blocking-time': { numericValue: metrics.totalBlockingTimeMs },
      'cumulative-layout-shift': { numericValue: metrics.cumulativeLayoutShift },
      'total-byte-weight': { numericValue: metrics.totalByteWeight }
    }
  }));
  return filePath;
}

function calculatorMetrics(lcp) {
  return {
    performanceScore: 0.83,
    largestContentfulPaintMs: lcp,
    totalBlockingTimeMs: 5,
    cumulativeLayoutShift: 0.07,
    totalByteWeight: 295000
  };
}

test('低性能Androidのハード予算が旧基準より厳しく、ページ別に設定されている', () => {
  assert.equal(getProfile('calculator-home-1.json'), 'calculatorHome');
  assert.equal(getProfile('article-hub.json'), 'articleHub');
  assert.equal(getProfile('representative-article.json'), 'representativeArticle');

  assert.ok(HARD_BUDGETS.calculatorHome.performanceScore >= 0.65);
  assert.ok(HARD_BUDGETS.calculatorHome.largestContentfulPaintMs <= 3600);
  assert.equal(MINIMUM_SAMPLES.calculatorHome, 3);
  assert.ok(HARD_BUDGETS.articleHub.totalBlockingTimeMs <= 1200);
  assert.ok(HARD_BUDGETS.representativeArticle.totalBlockingTimeMs <= 800);
  assert.ok(HARD_BUDGETS.representativeArticle.cumulativeLayoutShift <= 0.15);
  assert.ok(HARD_BUDGETS.default.totalByteWeight <= 350 * 1024);
  assert.equal(TARGETS.largestContentfulPaintMs, 2500);
  assert.equal(TARGETS.cumulativeLayoutShift, 0.10);
});

test('トップページは3回の中央値で判定し、単発の遅い外れ値に左右されない', () => {
  const tempRoot = createTempRoot();
  try {
    const reports = [3500, 3550, 5000].map((lcp, index) =>
      writeLighthouseReport(tempRoot, `calculator-home-${index + 1}.json`, calculatorMetrics(lcp))
    );
    const result = evaluateProfileGroup('calculatorHome', reports);
    assert.equal(result.aggregation, 'median');
    assert.equal(result.sampleCount, 3);
    assert.equal(result.metrics.largestContentfulPaintMs, 3550);
    assert.deepEqual(result.failures, []);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('トップページは3回中2回が上限超過なら中央値で失敗する', () => {
  const tempRoot = createTempRoot();
  try {
    const reports = [3500, 3700, 3800].map((lcp, index) =>
      writeLighthouseReport(tempRoot, `calculator-home-${index + 1}.json`, calculatorMetrics(lcp))
    );
    const result = evaluateProfileGroup('calculatorHome', reports);
    assert.equal(result.metrics.largestContentfulPaintMs, 3700);
    assert.ok(result.failures.some(failure => failure.includes('largestContentfulPaintMs')));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('トップページの測定が3回未満なら性能値に関係なく失敗する', () => {
  const tempRoot = createTempRoot();
  try {
    const reports = [3400, 3450].map((lcp, index) =>
      writeLighthouseReport(tempRoot, `calculator-home-${index + 1}.json`, calculatorMetrics(lcp))
    );
    const result = evaluateProfileGroup('calculatorHome', reports);
    assert.ok(result.failures.some(failure => failure.includes('sampleCount')));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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

test('性能ワークフローが本番同等成果物・3回測定・記事一覧・診断アーティファクトを検査する', () => {
  const workflow = read('.github/workflows/mobile-performance.yml');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(workflow, /Prepare production-like local assets/);
  assert.match(workflow, /node \.github\/scripts\/minify\.cjs/);
  assert.match(workflow, /audit_page calculator-home-1 \//);
  assert.match(workflow, /audit_page calculator-home-2 \//);
  assert.match(workflow, /audit_page calculator-home-3 \//);
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
    assert.equal((html.match(/<aside class="article-calculator-prompt cta-box"/g) || []).length, 1);
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


test('日記は初期モジュールグラフと先読みから外し、利用時だけ動的読込する', () => {
  const main = read('js/main.js');
  assert.doesNotMatch(main, /import\s+\{\s*DIARY\s*\}\s+from\s+['"]\.\/diary\.js['"]/);
  assert.match(main, /import\(['"]\.\/diary\.js['"]\)/);
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    assert.doesNotMatch(read(file), /modulepreload[^>]+diary\.js/, `${file}: diary.jsを初期先読みしています`);
  }
});

test('Service Workerの初回キャッシュは必須シェルだけに絞り、重い任意資産は利用時キャッシュへ回す', () => {
  const sw = read('sw.js');
  const assets = (sw.match(/const ASSETS = \[([\s\S]*?)\n\];/) || [])[1] || '';
  for (const required of [
    './', './style.css', './manifest.json', './js/main.js', './js/config.js',
    './js/ui.js', './js/calculator.js', './js/share.js', './js/web-vitals.js',
    './en/', './ko/', './tw/'
  ]) {
    assert.ok(assets.includes(`'${required}'`) || assets.includes(`'${required}?v=`), `必須シェルが初回キャッシュから消えています: ${required}`);
  }
  for (const optional of [
    './ogp.png', './info.html', './changelog.html', './attention.html', './js/diary.js',
    './js/third-party.js', './blog/script.js', './blog/article.js', './articles/'
  ]) {
    assert.ok(!assets.includes(optional), `任意資産を初回キャッシュしています: ${optional}`);
  }
  assert.match(sw, /handleStaticRequest/);
  assert.match(sw, /cache\.put\(cacheKey, networkResponse\.clone\(\)\)/);
});
