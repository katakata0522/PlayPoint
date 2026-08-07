'use strict';

const fs = require('node:fs');

function replaceTest(file, title, replacement) {
  const source = fs.readFileSync(file, 'utf8');
  const marker = `test('${title}', () => {`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`テスト開始位置が見つかりません: ${file} / ${title}`);
  const end = source.indexOf('\n});', start);
  if (end === -1) throw new Error(`テスト終了位置が見つかりません: ${file} / ${title}`);
  const updated = source.slice(0, start) + replacement + source.slice(end + 4);
  fs.writeFileSync(file, updated, 'utf8');
}

replaceTest(
  'tests/playpoint-audit-fixes.test.cjs',
  '広告と計測は初期表示後に低優先度で読み込む',
  `test('AdSenseは早期async取得し分析だけを初期表示後に低優先度で読み込む', () => {
  const source = read('js/third-party.js');
  const articleSource = read('blog/article.js');
  const components = read('blog/components.js');
  const adsenseBlock = source.slice(source.indexOf('async function loadAdsense'), source.indexOf('function getCurrentAssetPrefix'));

  assert.match(source, /window\\.addEventListener\\('load', scheduleAfterLoad, \\{ once: true \\}\\)/);
  assert.match(source, /ANALYTICS_DELAY_MS\\s*=\\s*1200/);
  assert.match(source, /ADSENSE_DELAY_MS\\s*=\\s*3000/);
  assert.match(source, /fetchpriority:\\s*'low'/);
  assert.ok(source.indexOf('void loadAdsense();') < source.indexOf('const scheduleAfterLoad'));
  assert.doesNotMatch(adsenseBlock, /fetchpriority/);
  assert.match(source, /app_display_mode/);
  assert.match(source, /display-mode: standalone/);
  assert.match(components, /app_display_mode/);
  assert.doesNotMatch(articleSource, /window\\.scrollY\\s*<\\s*600/);
  assert.doesNotMatch(components, /window\\.scrollY\\s*<\\s*600/);
  assert.match(components, /runAfterConsent\\(loadBlogAdsense\\)/);
  assert.ok(source.indexOf('ensureConsentManager();') < source.indexOf('scheduleThirdPartyLoad();'));
});`
);

replaceTest(
  'tests/playpoint-regression.test.cjs',
  '記事のAdSenseは本文スクロール後に共通スクリプトから読み込む',
  `test('記事のAdSenseは固定スクロール量を待たず同意状態に従ってasync読み込みする', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(articleScript.includes('function loadArticleAdsense()'));
  assert.ok(articleScript.includes('PlayPointConsent.whenGranted(loadArticleAdsense)'));
  assert.ok(articleScript.includes("document.addEventListener('playpoint:consent-ready'"));
  assert.ok(articleScript.includes('script.async = true'));
  assert.ok(!/window\\.scrollY\\s*<\\s*600/.test(articleScript));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), \`\${file} should delegate AdSense loading to the shared script\`);
  }
});`
);

const docsPath = 'docs/ANALYTICS.md';
let docs = fs.readFileSync(docsPath, 'utf8');
if (!docs.includes('app_display_mode')) {
  docs += '\n\n## PWA / ブラウザ起動形態\n\nGA4のページビューと以後のイベントには、技術的な起動形態を比較するため `app_display_mode` を付与します。値は通常ブラウザの `browser` と、PWA・ホーム画面起動の `standalone` の2種類です。入力した金額・ポイント数・個人情報はこの値には含めません。\n';
  fs.writeFileSync(docsPath, docs, 'utf8');
}

console.log('広告読込方針の回帰テストと分析ドキュメントを同期しました。');
