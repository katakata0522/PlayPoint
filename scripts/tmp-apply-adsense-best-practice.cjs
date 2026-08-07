'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const write = (relativePath, content) => fs.writeFileSync(path.join(root, relativePath), content, 'utf8');

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) {
    if (source.includes(replacement.trim())) return source;
    throw new Error(`${label}: 開始位置を見つけられません`);
  }
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (end === -1) throw new Error(`${label}: 終了位置を見つけられません`);
  return source.slice(0, start) + replacement + (endMarker ? source.slice(end) : '');
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`${label}: 置換対象を見つけられません`);
  return source.replace(from, to);
}

function patchArticleAdsense() {
  const relativePath = 'blog/article.js';
  let source = read(relativePath);
  const replacement = `    // AdSense本体はページ描画を止めないasyncで早期に準備し、短時間閲覧の広告機会を失わない。\n    // 初回通信に失敗した場合だけ、既存のスクロール導線を再試行の保険として残す。\n    function loadArticleAdsense() {\n        if (articleAdsenseLoaded) return;\n        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {\n            articleAdsenseLoaded = true;\n            return;\n        }\n\n        const script = document.createElement('script');\n        script.async = true;\n        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3845885843809455';\n        script.crossOrigin = 'anonymous';\n        script.onerror = () => {\n            articleAdsenseLoaded = false;\n            console.error('AdSense load failed');\n        };\n        document.head.appendChild(script);\n        articleAdsenseLoaded = true;\n    }\n\n    function handleArticleAdsenseScroll() {\n        if (window.scrollY < 600 || articleAdsenseScheduled || !window.PlayPointConsent) return;\n        articleAdsenseScheduled = true;\n        window.removeEventListener('scroll', handleArticleAdsenseScroll);\n        document.removeEventListener('playpoint:consent-ready', handleArticleAdsenseScroll);\n        window.PlayPointConsent.whenGranted(loadArticleAdsense);\n    }\n\n    function setupArticleAdsense() {\n        loadArticleAdsense();\n        window.addEventListener('scroll', handleArticleAdsenseScroll, { passive: true });\n        document.addEventListener('playpoint:consent-ready', handleArticleAdsenseScroll);\n    }\n\n`;
  source = replaceBetween(
    source,
    '    // 記事本文を読み始める前に自動広告を挿入せず、十分なスクロール後に一度だけ読み込む',
    '    function sanitizeArticleFile',
    replacement,
    relativePath
  );
  write(relativePath, source);
}

function patchCommonComponents() {
  const relativePath = 'blog/components.js';
  let source = read(relativePath);
  const rootPathLine = "    const rootPath = (isArticlePageTop || isBlogPage) ? '../' : './';\n";
  const displayModeBlock = `${rootPathLine}\n    function getDisplayMode() {\n        const standaloneMedia = typeof window.matchMedia === 'function'\n            && window.matchMedia('(display-mode: standalone)').matches;\n        const iosStandalone = window.navigator && window.navigator.standalone === true;\n        return standaloneMedia || iosStandalone ? 'standalone' : 'browser';\n    }\n`;
  source = replaceOnce(source, rootPathLine, displayModeBlock, `${relativePath}: display mode`);
  source = replaceOnce(
    source,
    "        window.gtag('js', new Date());\n        window.gtag('config', GA_MEASUREMENT_ID);",
    "        window.gtag('js', new Date());\n        window.gtag('set', { display_mode: getDisplayMode() });\n        window.gtag('config', GA_MEASUREMENT_ID);",
    `${relativePath}: analytics display mode`
  );

  const adsReplacement = `    function loadBlogAdsense() {\n        if (blogAdsenseLoaded) return;\n        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {\n            blogAdsenseLoaded = true;\n            return;\n        }\n\n        const script = document.createElement('script');\n        script.async = true;\n        script.src = \`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=\${ADSENSE_CLIENT}\`;\n        script.crossOrigin = 'anonymous';\n        script.onerror = () => {\n            blogAdsenseLoaded = false;\n            console.error('AdSense load failed');\n        };\n        document.head.appendChild(script);\n        blogAdsenseLoaded = true;\n    }\n\n    function setupBlogAdsense() {\n        if (!isBlogPage) return;\n        loadBlogAdsense();\n    }\n\n`;
  source = replaceBetween(
    source,
    '    function loadBlogAdsense()',
    '    // ===========================================\n    // Common Styles Injection',
    adsReplacement,
    `${relativePath}: adsense`
  );
  write(relativePath, source);
}

function patchAuditTests() {
  const relativePath = 'tests/playpoint-audit-fixes.test.cjs';
  let source = read(relativePath);
  const replacement = `test('AdSenseは人工的に待たせず、計測だけを低優先度で遅延する', () => {\n  const source = read('js/third-party.js');\n  assert.match(source, /ANALYTICS_DELAY_MS\\s*=\\s*1200/);\n  assert.doesNotMatch(source, /ADSENSE_DELAY_MS/);\n  assert.match(source, /await loadScript\\(\\s*ANALYTICS_SCRIPT_SRC,\\s*\\{\\s*fetchpriority:\\s*'low'\\s*\\}\\s*\\)/s);\n  assert.match(source, /await loadScript\\(\\s*ADSENSE_SCRIPT_SRC,\\s*\\{\\s*crossorigin:\\s*'anonymous'\\s*\\}\\s*\\)/s);\n  assert.match(source, /window\\.gtag\\('set', \\{ display_mode: getDisplayMode\\(\\) \\}\\);/);\n  assert.match(source, /void loadAdsense\\(\\);\\s*scheduleAnalyticsLoad\\(\\);/s);\n  assert.match(source, /window\\.addEventListener\\('load', scheduleAfterLoad, \\{ once: true \\}\\)/);\n});\n`;
  source = replaceBetween(
    source,
    "test('広告と計測は初期表示後に低優先度で読み込む'",
    null,
    replacement,
    relativePath
  );
  write(relativePath, source);
}

function patchRegressionTests() {
  const relativePath = 'tests/playpoint-regression.test.cjs';
  let source = read(relativePath);
  const replacement = `test('記事のAdSenseは固定スクロール待ちより先に共通スクリプトから非同期で準備する', () => {\n  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');\n  const articleFiles = fs.readdirSync(path.join(root, 'articles'))\n    .filter(file => file.endsWith('.html'));\n\n  assert.ok(articleScript.includes('function loadArticleAdsense()'));\n  assert.ok(articleScript.includes("function setupArticleAdsense() {\\n        loadArticleAdsense();"));\n  assert.ok(articleScript.includes('script.async = true'));\n  assert.ok(articleScript.includes('window.scrollY < 600'), '通信失敗時の再試行導線がありません');\n  for (const file of articleFiles) {\n    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');\n    assert.ok(!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), \`\${file} embeds AdSense directly instead of using the shared loader\`);\n  }\n});\n\n`;
  source = replaceBetween(
    source,
    "test('記事のAdSenseは本文スクロール後に共通スクリプトから読み込む'",
    "test('ブログと記事は共通コンポーネントからGA4本体を読み込む'",
    replacement,
    `${relativePath}: article adsense test`
  );

  source = replaceOnce(
    source,
    "  assert.ok(components.includes(\"window.gtag('config', GA_MEASUREMENT_ID)\"));",
    "  assert.ok(components.includes(\"window.gtag('set', { display_mode: getDisplayMode() })\"));\n  assert.ok(components.includes(\"window.gtag('config', GA_MEASUREMENT_ID)\"));\n  assert.ok(components.includes(\"function setupBlogAdsense() {\\n        if (!isBlogPage) return;\\n        loadBlogAdsense();\"));\n  assert.ok(!components.includes('window.scrollY < 600'));",
    `${relativePath}: common analytics assertions`
  );
  write(relativePath, source);
}

function syncGeneratedOutput() {
  const indexHtml = read('index.html');
  const serviceWorker = read('sw.js');
  const modifiedDate = indexHtml.match(/<meta name="last-modified" content="([0-9]{4}-[0-9]{2}-[0-9]{2})">/)?.[1];
  const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
  if (!modifiedDate || !assetVersion) throw new Error('既存の公開日またはアセット版を取得できません');

  const result = spawnSync(process.execPath, ['scripts/build-html.js'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYPOINT_MODIFIED_DATE: modifiedDate,
      PLAYPOINT_ASSET_VERSION: assetVersion
    }
  });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`build-html.js failed: ${result.status}`);
  }
}

patchArticleAdsense();
patchCommonComponents();
patchAuditTests();
patchRegressionTests();
syncGeneratedOutput();
console.log('広告読み込み・PWA計測のベストプラクティス差分を適用し、生成物を同期しました。');
