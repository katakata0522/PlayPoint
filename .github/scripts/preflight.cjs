'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

function run(command, args, options = {}) {
  console.log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env || {}) }
  });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`${command} failed: ${result.status}`);
  }
}

function output(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(result.stderr || `${command} failed`);
  }
  return result.stdout.trim();
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length === 0) throw new Error(`Target not found: ${label}`);
  if (matches.length > 1) throw new Error(`Target is not unique: ${label}`);
  return source.replace(pattern, replacement);
}

try {
  run('git', ['fetch', 'origin', 'main', 'fix/article-site-usability']);
  run('git', ['reset', '--hard', 'origin/fix/article-site-usability']);

  const scriptPath = path.join(root, 'blog', 'script.js');
  let script = fs.readFileSync(scriptPath, 'utf8');

  const skeletonStart = script.indexOf('    function showSkeletonLoading() {');
  const skeletonEnd = script.indexOf('\n    // Intersection Observer', skeletonStart);
  if (skeletonStart < 0 || skeletonEnd < 0) throw new Error('Could not isolate showSkeletonLoading.');
  let skeletonBlock = script.slice(skeletonStart, skeletonEnd);
  const prematurePattern = /\r?\n\s*if \(dom\.resultStatus\) \{[^\r\n]*filtered\.length[^\r\n]*\}\r?\n/;
  if (!prematurePattern.test(skeletonBlock)) throw new Error('Target not found: premature result count in skeleton loading');
  skeletonBlock = skeletonBlock.replace(prematurePattern, '\n');
  script = script.slice(0, skeletonStart) + skeletonBlock + script.slice(skeletonEnd);

  const renderStart = script.indexOf('    function render() {');
  const renderEnd = script.indexOf('\n    function renderPagination', renderStart);
  if (renderStart < 0 || renderEnd < 0) throw new Error('Could not isolate render.');
  let renderBlock = script.slice(renderStart, renderEnd);
  renderBlock = replaceRegexOnce(
    renderBlock,
    /(\r?\n\s*dom\.grid\.innerHTML = '';\r?\n)(\s*\r?\n\s*if \(pageItems\.length === 0\) \{)/,
    `$1        if (dom.resultStatus) {\n            const label = currentCategory === 'all' ? 'すべて' : currentCategory;\n            dom.resultStatus.textContent = (currentSearch ? '「' + currentSearch + '」の検索結果：' : label + 'の記事：') + filtered.length + '件';\n        }\n$2`,
    'render result count target'
  );
  script = script.slice(0, renderStart) + renderBlock + script.slice(renderEnd);

  script = replaceOnce(
    script,
    "          document.getElementById('reset-filters').addEventListener('click', function () { currentCategory = 'all'; currentSearch = ''; if (dom.searchInput) dom.searchInput.value = ''; window.history.replaceState({}, '', window.location.pathname); render(); });",
    "          document.getElementById('reset-filters').addEventListener('click', function () { currentCategory = 'all'; currentSearch = ''; if (dom.searchInput) dom.searchInput.value = ''; if (dom.categoryFilter) dom.categoryFilter.querySelectorAll('button').forEach(function (btn) { btn.classList.toggle('active', btn.dataset.category === 'all'); }); window.history.replaceState({}, '', window.location.pathname); render(); });",
    'reset visible category state'
  );

  script = replaceOnce(
    script,
    "    function openSidebar() {\n        if (dom.sidebar) dom.sidebar.classList.add('active');\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');\n        if (dom.sidebarToggle) dom.sidebarToggle.classList.add('active');\n        document.body.style.overflow = 'hidden';\n    }\n\n    function closeSidebar() {\n        if (dom.sidebar) dom.sidebar.classList.remove('active');\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');\n        if (dom.sidebarToggle) dom.sidebarToggle.classList.remove('active');\n        document.body.style.overflow = '';\n    }",
    "    function openSidebar() {\n        if (dom.sidebar) { dom.sidebar.classList.add('active'); dom.sidebar.setAttribute('aria-hidden', 'false'); }\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');\n        if (dom.sidebarToggle) { dom.sidebarToggle.classList.add('active'); dom.sidebarToggle.setAttribute('aria-expanded', 'true'); }\n        document.body.style.overflow = 'hidden';\n    }\n\n    function closeSidebar() {\n        if (dom.sidebar) { dom.sidebar.classList.remove('active'); dom.sidebar.setAttribute('aria-hidden', 'true'); }\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');\n        if (dom.sidebarToggle) { dom.sidebarToggle.classList.remove('active'); dom.sidebarToggle.setAttribute('aria-expanded', 'false'); }\n        document.body.style.overflow = '';\n    }",
    'synchronize sidebar accessibility state'
  );
  fs.writeFileSync(scriptPath, script, 'utf8');

  const indexPath = path.join(root, 'blog', 'index.html');
  let index = fs.readFileSync(indexPath, 'utf8');
  index = replaceOnce(
    index,
    '<button id="sidebar-toggle" class="sidebar-toggle" aria-label="メニューを開く">',
    '<button id="sidebar-toggle" class="sidebar-toggle" aria-label="メニューを開く" aria-controls="sidebar" aria-expanded="false">',
    'sidebar toggle aria attributes'
  );
  fs.writeFileSync(indexPath, index, 'utf8');

  const articlePath = path.join(root, 'blog', 'article.js');
  let article = fs.readFileSync(articlePath, 'utf8');
  article = replaceOnce(
    article,
    "      if (meta && pub) { meta.classList.add('article-verification-meta'); meta.textContent = '公開 ' + pub + (checked ? ' ｜ 最終確認 ' + checked[1] + '/' + String(checked[2]).padStart(2, '0') + '/' + String(checked[3]).padStart(2, '0') : (mod && mod !== pub ? ' ｜ 更新 ' + mod : '')); }",
    "      var lang = (document.documentElement.lang || 'ja').toLowerCase();\n      if (lang.startsWith('ja') && meta && pub) { meta.classList.add('article-verification-meta'); meta.textContent = '公開 ' + pub + (checked ? ' ｜ 最終確認 ' + checked[1] + '/' + String(checked[2]).padStart(2, '0') + '/' + String(checked[3]).padStart(2, '0') : (mod && mod !== pub ? ' ｜ 更新 ' + mod : '')); }",
    'preserve localized metadata outside Japanese pages'
  );
  fs.writeFileSync(articlePath, article, 'utf8');

  const sharedCssPath = path.join(root, 'articles', 'article-shared.css');
  let sharedCss = fs.readFileSync(sharedCssPath, 'utf8');
  sharedCss = replaceOnce(
    sharedCss,
    'background:#fff;box-shadow:1px 0 #dbe2ea',
    'background:inherit;box-shadow:1px 0 #dbe2ea',
    'preserve sticky table cell theme background'
  );
  fs.writeFileSync(sharedCssPath, sharedCss, 'utf8');

  const testPath = path.join(root, 'tests', 'blog-index-runtime-regression.test.cjs');
  fs.writeFileSync(testPath, `'use strict';\n\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\nconst assert = require('node:assert/strict');\n\nconst root = path.resolve(__dirname, '..');\nconst script = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');\nconst article = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');\nconst index = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');\nconst sharedCss = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');\n\ntest('skeleton loading does not read filtered before article data exists', () => {\n  const skeleton = script.match(/function showSkeletonLoading\\(\\) \\{[\\s\\S]*?\\n    \\}\\n\\n    \\/\\/ Intersection Observer/);\n  assert.ok(skeleton, 'showSkeletonLoading function should exist');\n  assert.doesNotMatch(skeleton[0], /\\bfiltered\\b/);\n});\n\ntest('result status is updated inside render after filtering', () => {\n  const render = script.match(/function render\\(\\) \\{[\\s\\S]*?\\n    function renderPagination/);\n  assert.ok(render, 'render function should exist');\n  assert.match(render[0], /dom\\.resultStatus[\\s\\S]*filtered\\.length/);\n});\n\ntest('sidebar aria state is synchronized with its visual state', () => {\n  assert.match(index, /id="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);\n  assert.match(script, /setAttribute\\('aria-hidden', 'false'\\)/);\n  assert.match(script, /setAttribute\\('aria-hidden', 'true'\\)/);\n  assert.match(script, /setAttribute\\('aria-expanded', 'true'\\)/);\n  assert.match(script, /setAttribute\\('aria-expanded', 'false'\\)/);\n});\n\ntest('Japanese date normalization does not overwrite localized article metadata', () => {\n  assert.match(article, /lang\\.startsWith\\('ja'\\) && meta && pub/);\n});\n\ntest('sticky mobile table cells inherit the active article theme', () => {\n  assert.match(sharedCss, /background:inherit;box-shadow:1px 0 #dbe2ea/);\n  assert.doesNotMatch(sharedCss, /background:#fff;box-shadow:1px 0 #dbe2ea/);\n});\n`, 'utf8');

  const { syncDynamicArticleStylesheetVersion, syncPublicAssetVersions } = require(path.join(root, 'scripts', 'article-asset-versioning.cjs'));
  const { collectAssetVersions, syncRootServiceWorker } = require(path.join(root, 'scripts', 'asset-sync.cjjs'));
  syncDynamicArticleStylesheetVersion(root);
  syncPublicAssetVersions(root);
  const serviceWorkerPath = path.join(root, 'sw.js');
  const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const cacheVersion = serviceWorker.match(/const CACHE_NAME = 'playpoint-calc-v([^-']+)-/);
  if (!cacheVersion) throw new Error('Could not resolve cache version.');
  syncRootServiceWorker(root, cacheVersion[1], collectAssetVersions(root));

  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const updatedWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
  const modifiedDate = home.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
  const assetVersion = updatedWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
  if (!modifiedDate || !assetVersion) throw new Error('Could not resolve deterministic build metadata.');
  const deterministicEnv = {
    PLAYPOINT_MODIFIED_DATE: modifiedDate,
    PLAYPOINT_ASSET_VERSION: assetVersion
  };
  run(process.execPath, ['scripts/build-html.js'], { env: deterministicEnv });

  run(process.execPath, ['.github/scripts/preflight.cjs'], { env: deterministicEnv });

  const changed = output('git', ['status', '--short']).split('\n').filter(Boolean).map(line => line.slice(3));
  const allowed = /^(?:tests\/blog-index-runtime-regression\.test\.cjs|index\.html|sw\.js|blog\/(?:index\.html|index-compact\.css|script\.js|article\.js)|articles\/article-shared\.css|articles\/[^/]+\.html|(?:en|ko|tw)\/index\.html|(?:en|ko|tw)\/articles\/[^/]+\.html)$/;
  const unexpected = changed.filter(file => !allowed.test(file));
  if (unexpected.length) throw new Error(`Unexpected files: ${unexpected.join(', ')}`);

  run('git', ['config', 'user.name', 'github-actions[bot]']);
  run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  if (changed.length) run('git', ['add', '--', ...changed]);
  run('git', ['diff', '--cached', '--check']);
  run('git', ['commit', '-m', '記事一覧の初期表示と多言語表示を修正']);
  run('git', ['push', 'origin', 'HEAD:refs/heads/fix/article-site-usability']);
  console.log('PR70_RUNTIME_FIX_VALIDATED_AND_PUSHED');
  process.exitCode = 1;
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}
