'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('実ユーザー速度は同意後に匿名区分だけを計測する', () => {
  const source = read('js/web-vitals.js');
  const config = read('js/config.js');
  assert.match(source, /PerformanceObserver/);
  assert.match(source, /metric_rating/);
  assert.doesNotMatch(source, /neededPoints|diary|localStorage/);
  assert.match(config, /web_vital:\s*\['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version'\]/);
});

test('トップページに年間グラフと独自計算図がある', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(relativePath);
    assert.match(html, /id="diary-year-chart"/, relativePath);
    assert.match(html, /images\/calculation-flow\.svg/, relativePath);
  }
});

test('ビルド後HTMLは外部Google Fontsへ接続しない', () => {
  const htmlFiles = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(absolute);
    }
  };
  visit(root);
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/, path.relative(root, file));
  }
});

test('Search ConsoleとGA4の運用手順が実行可能な粒度で残る', () => {
  const searchGuide = read('docs/SEARCH_CONSOLE_MONITORING.md');
  const analyticsGuide = read('docs/ANALYTICS.md');
  assert.match(searchGuide, /生成 AI|Generative AI/);
  assert.match(searchGuide, /クエリ.*ページ|query.*page/is);
  assert.match(analyticsGuide, /DebugView/);
  assert.match(analyticsGuide, /calculation_completed/);
  assert.match(analyticsGuide, /キーイベント/);
});

test('運営者ページに検証工程と外部プロフィールの関係を明示する', () => {
  const html = read('author/katakata.html');
  assert.match(html, /sameAs/);
  assert.match(html, /公開前の確認工程/);
});
