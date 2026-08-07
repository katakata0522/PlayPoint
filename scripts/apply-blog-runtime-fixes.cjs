'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(content, pattern, replacement, label) {
  const matches = typeof pattern === 'string'
    ? content.split(pattern).length - 1
    : [...content.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))].length;
  if (matches !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${matches}`);
  }
  return content.replace(pattern, replacement);
}

let script = read('blog/script.js');

script = replaceOnce(
  script,
  /^\s*if \(dom\.resultStatus\) \{ var label = currentCategory === 'all' \? 'すべて' : currentCategory; dom\.resultStatus\.textContent = \(currentSearch \? '「' \+ currentSearch \+ '」の検索結果：' : label \+ 'の記事：'\) \+ filtered\.length \+ '件'; \}\r?\n/m,
  '',
  'remove unsafe skeleton result count'
);

script = replaceOnce(
  script,
  `    // Sidebar Toggle Functions\n    function openSidebar() {\n        if (dom.sidebar) dom.sidebar.classList.add('active');\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.add('active');\n        if (dom.sidebarToggle) dom.sidebarToggle.classList.add('active');\n        document.body.style.overflow = 'hidden';\n    }\n\n    function closeSidebar() {\n        if (dom.sidebar) dom.sidebar.classList.remove('active');\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.remove('active');\n        if (dom.sidebarToggle) dom.sidebarToggle.classList.remove('active');\n        document.body.style.overflow = '';\n    }`,
  `    // Sidebar Toggle Functions\n    function setSidebarState(isOpen) {\n        if (dom.sidebar) {\n            dom.sidebar.classList.toggle('active', isOpen);\n            dom.sidebar.setAttribute('aria-hidden', String(!isOpen));\n        }\n        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.toggle('active', isOpen);\n        if (dom.sidebarToggle) {\n            dom.sidebarToggle.classList.toggle('active', isOpen);\n            dom.sidebarToggle.setAttribute('aria-expanded', String(isOpen));\n            dom.sidebarToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');\n        }\n        document.body.style.overflow = isOpen ? 'hidden' : '';\n    }\n\n    function openSidebar() {\n        setSidebarState(true);\n    }\n\n    function closeSidebar() {\n        setSidebarState(false);\n    }`,
  'synchronize sidebar accessibility state'
);

script = replaceOnce(
  script,
  `                if (dom.categoryFilter) {\n                    const buttons = dom.categoryFilter.querySelectorAll('button');\n                    buttons.forEach(btn => {\n                        btn.classList.toggle('active', btn.dataset.category === currentCategory);\n                    });\n                }`,
  `                syncCategoryActiveState();`,
  'use shared category state after history navigation'
);

script = replaceOnce(
  script,
  `    function setCategory(cat) {\n        currentCategory = cat;\n        currentPage = 1;\n\n        // Update URL state\n        updateURLState();\n\n        // Track in GA4\n        Analytics.trackCategoryFilter(cat);\n\n        // Update UI buttons\n        if (dom.categoryFilter) {\n            const buttons = dom.categoryFilter.querySelectorAll('button');\n            buttons.forEach(btn => {\n                btn.classList.toggle('active', btn.dataset.category === cat);\n            });\n        }\n\n        render();\n    }`,
  `    function syncCategoryActiveState() {\n        if (dom.categoryFilter) {\n            dom.categoryFilter.querySelectorAll('button').forEach(btn => {\n                btn.classList.toggle('active', btn.dataset.category === currentCategory);\n            });\n        }\n        if (dom.sidebarCategories) {\n            dom.sidebarCategories.querySelectorAll('button').forEach(btn => {\n                btn.classList.toggle('active', btn.dataset.category === currentCategory);\n            });\n        }\n    }\n\n    function resetFilters() {\n        currentCategory = 'all';\n        currentSearch = '';\n        currentPage = 1;\n        if (dom.searchInput) dom.searchInput.value = '';\n        syncCategoryActiveState();\n        updateURLState();\n        render();\n    }\n\n    function setCategory(cat) {\n        currentCategory = cat;\n        currentPage = 1;\n\n        // Update URL state\n        updateURLState();\n\n        // Track in GA4\n        Analytics.trackCategoryFilter(cat);\n\n        syncCategoryActiveState();\n        render();\n    }`,
  'centralize category and reset state synchronization'
);

script = replaceOnce(
  script,
  `        } else {\n            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));\n        }\n\n        // 3. Paginate`,
  `        } else {\n            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));\n        }\n\n        if (dom.resultStatus) {\n            const label = currentCategory === 'all' ? 'すべて' : currentCategory;\n            dom.resultStatus.textContent = (currentSearch\n                ? '「' + currentSearch + '」の検索結果：'\n                : label + 'の記事：') + filtered.length + '件';\n        }\n\n        // 3. Paginate`,
  'move result count into render after filtering'
);

script = replaceOnce(
  script,
  `          document.getElementById('reset-filters').addEventListener('click', function () { currentCategory = 'all'; currentSearch = ''; if (dom.searchInput) dom.searchInput.value = ''; window.history.replaceState({}, '', window.location.pathname); render(); });`,
  `          document.getElementById('reset-filters').addEventListener('click', resetFilters);`,
  'use synchronized reset handler'
);

script = replaceOnce(
  script,
  `    function changePage(num) {\n        currentPage = num;\n        render();`,
  `    function changePage(num) {\n        currentPage = num;\n        updateURLState();\n        render();`,
  'persist page changes in URL'
);

const skeletonStart = script.indexOf('    function showSkeletonLoading() {');
const skeletonEnd = script.indexOf('\n    // Intersection Observer for Scroll Fade-In', skeletonStart);
if (skeletonStart < 0 || skeletonEnd < 0 || script.slice(skeletonStart, skeletonEnd).includes('filtered')) {
  throw new Error('showSkeletonLoading() still references filtered');
}
const renderStart = script.indexOf('    function render() {');
const renderEnd = script.indexOf('\n    function renderPagination(', renderStart);
const renderBody = script.slice(renderStart, renderEnd);
if (!renderBody.includes('filtered.length + \'件\'')) {
  throw new Error('render() does not update the filtered result count');
}
write('blog/script.js', script);

let index = read('blog/index.html');
index = replaceOnce(
  index,
  `<button id="sidebar-toggle" class="sidebar-toggle" aria-label="メニューを開く">`,
  `<button id="sidebar-toggle" class="sidebar-toggle" aria-label="メニューを開く" aria-controls="sidebar" aria-expanded="false">`,
  'add initial sidebar toggle ARIA state'
);
write('blog/index.html', index);

let smoke = read('.github/scripts/browser-smoke.cjs');
const blogFunction = `\nasync function verifyBlogPage(browser, baseUrl) {\n  const origin = new URL(baseUrl).origin;\n  const context = await browser.newContext({\n    locale: 'ja-JP',\n    timezoneId: 'Asia/Tokyo',\n    viewport: { width: 390, height: 844 }\n  });\n  await blockExternalRequests(context, origin);\n  const page = await context.newPage();\n  const browserState = observeBrowser(page, origin);\n\n  try {\n    const response = await page.goto(new URL('blog/', baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 45_000 });\n    if (response && !response.ok()) throw new Error(\`HTTP \${response.status()}\`);\n    await page.locator('.article-card').first().waitFor({ state: 'visible', timeout: 30_000 });\n    await page.waitForFunction(() => /\\d+件/.test(document.querySelector('#article-result-status')?.textContent || ''));\n\n    const initial = await page.evaluate(() => ({\n      cards: document.querySelectorAll('.article-card').length,\n      resultStatus: document.querySelector('#article-result-status')?.textContent || '',\n      pagination: document.querySelector('.pagination-status')?.textContent || '',\n      activeCategory: document.querySelector('#category-filter button.active')?.dataset.category || '',\n      toggleExpanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),\n      sidebarHidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')\n    }));\n    assert(initial.cards > 0, 'Blog initial article cards were not rendered');\n    assert(/件/.test(initial.resultStatus), \`Blog result status missing: \${initial.resultStatus}\`);\n    assert(initial.activeCategory === 'all', \`Blog initial category mismatch: \${initial.activeCategory}\`);\n    assert(initial.toggleExpanded === 'false' && initial.sidebarHidden === 'true', 'Blog sidebar initial ARIA state mismatch');\n\n    const nextButton = page.getByRole('button', { name: '次へ →' });\n    if (await nextButton.count()) {\n      await nextButton.click();\n      await page.waitForFunction(() => new URL(location.href).searchParams.get('page') === '2');\n      assert((await page.locator('.pagination-status').textContent())?.trim().startsWith('2 /'), 'Blog pagination did not advance');\n    }\n\n    await page.locator('#search-input').fill('__playpoint_no_result__');\n    await page.waitForFunction(() => (document.querySelector('#article-result-status')?.textContent || '').includes('0件'));\n    await page.getByRole('button', { name: '検索とカテゴリーをリセット' }).click();\n    await page.locator('.article-card').first().waitFor({ state: 'visible', timeout: 30_000 });\n    await page.waitForFunction(() => {\n      const url = new URL(location.href);\n      return !url.searchParams.has('q') && !url.searchParams.has('category') && !url.searchParams.has('page');\n    });\n    const resetState = await page.evaluate(() => ({\n      activeCategory: document.querySelector('#category-filter button.active')?.dataset.category || '',\n      query: document.querySelector('#search-input')?.value || ''\n    }));\n    assert(resetState.activeCategory === 'all' && resetState.query === '', 'Blog reset state is inconsistent');\n\n    const categoryButton = page.locator('#category-filter button:not([data-category="all"])').first();\n    const category = await categoryButton.getAttribute('data-category');\n    await categoryButton.click();\n    await page.waitForFunction(expected => new URL(location.href).searchParams.get('category') === expected, category);\n    assert(await categoryButton.evaluate(element => element.classList.contains('active')), 'Blog category active state did not update');\n\n    await page.locator('#sidebar-toggle').click();\n    await page.waitForFunction(() => document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded') === 'true');\n    const openState = await page.evaluate(() => ({\n      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),\n      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')\n    }));\n    assert(openState.expanded === 'true' && openState.hidden === 'false', 'Blog sidebar open ARIA state mismatch');\n    await page.keyboard.press('Escape');\n    await page.waitForFunction(() => document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded') === 'false');\n    const closeState = await page.evaluate(() => ({\n      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),\n      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')\n    }));\n    assert(closeState.expanded === 'false' && closeState.hidden === 'true', 'Blog sidebar close ARIA state mismatch');\n\n    await page.waitForTimeout(500);\n    browserState.verify('Blog browser errors');\n    return { initial, resetState, category, openState, closeState, errors: browserState.values };\n  } catch (error) {\n    await saveScreenshot(page, 'blog.png');\n    throw error;\n  } finally {\n    await context.close();\n  }\n}\n`;
smoke = replaceOnce(
  smoke,
  `\nasync function verifyRevision(baseUrl) {`,
  `${blogFunction}\nasync function verifyRevision(baseUrl) {`,
  'add blog browser verification'
);
smoke = replaceOnce(
  smoke,
  `    locales: [],\n    passed: false`,
  `    locales: [],\n    blog: { passed: false },\n    passed: false`,
  'add blog report section'
);
smoke = replaceOnce(
  smoke,
  `    report.passed = report.locales.every(result => result.passed);`,
  `    try {\n      report.blog = { passed: true, details: await verifyBlogPage(browser, baseUrl) };\n      console.log('ok - Blog initial render, search, reset, pagination, category and sidebar');\n    } catch (error) {\n      report.blog = { passed: false, error: error.message };\n      console.error(\`not ok - Blog: \${error.message}\`);\n    }\n    report.passed = report.locales.every(result => result.passed) && report.blog.passed;`,
  'run blog browser verification'
);
smoke = replaceOnce(
  smoke,
  `  console.log(\`Browser smoke test passed (\${report.mode}, \${LOCALES.length} locales).\`);`,
  `  console.log(\`Browser smoke test passed (\${report.mode}, \${LOCALES.length} locales + blog).\`);`,
  'report blog verification success'
);
write('.github/scripts/browser-smoke.cjs', smoke);

const test = `'use strict';\n\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\n\nconst root = path.resolve(__dirname, '..');\nconst blogScript = fs.readFileSync(path.join(root, 'blog/script.js'), 'utf8');\nconst blogIndex = fs.readFileSync(path.join(root, 'blog/index.html'), 'utf8');\nconst browserSmoke = fs.readFileSync(path.join(root, '.github/scripts/browser-smoke.cjs'), 'utf8');\n\nfunction functionBody(source, startMarker, endMarker) {\n  const start = source.indexOf(startMarker);\n  const end = source.indexOf(endMarker, start);\n  assert.notEqual(start, -1, \`missing start marker: \${startMarker}\`);\n  assert.notEqual(end, -1, \`missing end marker: \${endMarker}\`);\n  return source.slice(start, end);\n}\n\ntest('skeleton loading never references filtered results', () => {\n  const body = functionBody(blogScript, '    function showSkeletonLoading() {', '\\n    // Intersection Observer for Scroll Fade-In');\n  assert.doesNotMatch(body, /\\bfiltered\\b/);\n});\n\ntest('result count is calculated inside render after filtering', () => {\n  const body = functionBody(blogScript, '    function render() {', '\\n    function renderPagination(');\n  assert.match(body, /dom\\.resultStatus\\.textContent[\\s\\S]*filtered\\.length/);\n});\n\ntest('pagination, reset and category controls synchronize URL and active state', () => {\n  const changePage = functionBody(blogScript, '    function changePage(num) {', '\\n    // Back to Top Button');\n  assert.match(changePage, /updateURLState\\(\\);[\\s\\S]*render\\(\\);/);\n  assert.match(blogScript, /function resetFilters\\(\\)[\\s\\S]*syncCategoryActiveState\\(\\);[\\s\\S]*updateURLState\\(\\);/);\n  assert.match(blogScript, /function setCategory\\(cat\\)[\\s\\S]*syncCategoryActiveState\\(\\);/);\n});\n\ntest('sidebar ARIA state is synchronized in markup and runtime', () => {\n  assert.match(blogIndex, /id="sidebar-toggle"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"/);\n  assert.match(blogScript, /setAttribute\\('aria-hidden', String\\(!isOpen\\)\\)/);\n  assert.match(blogScript, /setAttribute\\('aria-expanded', String\\(isOpen\\)\\)/);\n});\n\ntest('browser smoke covers the blog runtime flow', () => {\n  assert.match(browserSmoke, /async function verifyBlogPage\\(/);\n  assert.match(browserSmoke, /new URL\\('blog\\/', baseUrl\\)/);\n  assert.match(browserSmoke, /Blog initial render, search, reset, pagination, category and sidebar/);\n});\n`;
write('tests/blog-runtime-regressions.test.cjs', test);

console.log('Applied blog runtime fixes and regression coverage.');
