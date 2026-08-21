'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function replaceExact(path, oldText, newText, expectedCount = 1) {
  let source = fs.readFileSync(path, 'utf8');
  const count = source.split(oldText).length - 1;
  if (count === expectedCount) {
    source = source.split(oldText).join(newText);
    fs.writeFileSync(path, source);
    console.log(`${path}: replaced ${expectedCount} occurrence(s)`);
    return;
  }
  if (count === 0 && source.includes(newText)) {
    console.log(`${path}: replacement already present`);
    return;
  }
  throw new Error(`${path}: expected ${expectedCount} occurrence(s), found ${count}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8' });
  if (result.status !== 0) process.exit(result.status || 1);
}

replaceExact(
  'blog/index.html',
  '<aside id="sidebar" class="sidebar" aria-label="サイト内メニュー" aria-hidden="true">',
  '<aside id="sidebar" class="sidebar" aria-label="サイト内メニュー" aria-hidden="true" inert>'
);

replaceExact(
  'blog/script.js',
`    function setSidebarState(isOpen) {
        if (dom.sidebar) {
            dom.sidebar.classList.toggle('active', isOpen);
            dom.sidebar.setAttribute('aria-hidden', String(!isOpen));
        }
        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.toggle('active', isOpen);
        if (dom.sidebarToggle) {
            dom.sidebarToggle.classList.toggle('active', isOpen);
            dom.sidebarToggle.setAttribute('aria-expanded', String(isOpen));
            dom.sidebarToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }`,
`    function setSidebarState(isOpen) {
        // aria-hidden / inert を付ける前に、閉じる操作ではフォーカスをトグルへ戻す。
        if (!isOpen && dom.sidebarToggle) {
            dom.sidebarToggle.focus();
        }

        if (dom.sidebar) {
            dom.sidebar.classList.toggle('active', isOpen);
            dom.sidebar.setAttribute('aria-hidden', String(!isOpen));
            if (isOpen) {
                dom.sidebar.removeAttribute('inert');
            } else {
                dom.sidebar.setAttribute('inert', '');
            }
        }
        if (dom.sidebarOverlay) dom.sidebarOverlay.classList.toggle('active', isOpen);
        if (dom.sidebarToggle) {
            dom.sidebarToggle.classList.toggle('active', isOpen);
            dom.sidebarToggle.setAttribute('aria-expanded', String(isOpen));
            dom.sidebarToggle.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';

        if (isOpen && dom.sidebar) {
            const focusTarget = dom.sidebarClose || dom.sidebar.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
            if (focusTarget) focusTarget.focus();
        }
    }`
);

replaceExact(
  '.github/scripts/browser-smoke.cjs',
`      toggleExpanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      sidebarHidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden'),
      thumbnailImages: document.querySelectorAll('.article-card .card-thumb img').length,`,
`      toggleExpanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      sidebarHidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden'),
      sidebarInert: document.querySelector('#sidebar')?.hasAttribute('inert'),
      thumbnailImages: document.querySelectorAll('.article-card .card-thumb img').length,`
);
replaceExact(
  '.github/scripts/browser-smoke.cjs',
`    assert(initial.toggleExpanded === 'false' && initial.sidebarHidden === 'true', 'Blog sidebar initial ARIA state mismatch');`,
`    assert(initial.toggleExpanded === 'false' && initial.sidebarHidden === 'true', 'Blog sidebar initial ARIA state mismatch');
    assert(initial.sidebarInert === true, 'Blog sidebar must be inert while closed');`
);
replaceExact(
  '.github/scripts/browser-smoke.cjs',
`    const openState = await page.evaluate(() => ({
      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')
    }));
    assert(openState.expanded === 'true' && openState.hidden === 'false', 'Blog sidebar open ARIA state mismatch');`,
`    const openState = await page.evaluate(() => ({
      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden'),
      inert: document.querySelector('#sidebar')?.hasAttribute('inert'),
      activeElement: document.activeElement?.id || ''
    }));
    assert(openState.expanded === 'true' && openState.hidden === 'false', 'Blog sidebar open ARIA state mismatch');
    assert(openState.inert === false, 'Blog sidebar remained inert after opening');
    assert(openState.activeElement === 'sidebar-close', 'Blog sidebar open focus mismatch: ' + openState.activeElement);`
);
replaceExact(
  '.github/scripts/browser-smoke.cjs',
`    const closeState = await page.evaluate(() => ({
      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden')
    }));
    assert(closeState.expanded === 'false' && closeState.hidden === 'true', 'Blog sidebar close ARIA state mismatch');`,
`    const closeState = await page.evaluate(() => ({
      expanded: document.querySelector('#sidebar-toggle')?.getAttribute('aria-expanded'),
      hidden: document.querySelector('#sidebar')?.getAttribute('aria-hidden'),
      inert: document.querySelector('#sidebar')?.hasAttribute('inert'),
      activeElement: document.activeElement?.id || ''
    }));
    assert(closeState.expanded === 'false' && closeState.hidden === 'true', 'Blog sidebar close ARIA state mismatch');
    assert(closeState.inert === true, 'Blog sidebar must become inert after closing');
    assert(closeState.activeElement === 'sidebar-toggle', 'Blog sidebar close focus mismatch: ' + closeState.activeElement);`
);

run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--check', 'blog/script.js']);
run(process.execPath, ['--check', '.github/scripts/browser-smoke.cjs']);

const changedResult = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
if (changedResult.status !== 0) process.exit(changedResult.status || 1);
const changed = String(changedResult.stdout || '').trim().split(/\r?\n/).filter(Boolean);
if (changed.length === 0) {
  console.log('No changes to commit.');
  process.exit(0);
}

const allowed = new Set(['blog/index.html', 'blog/script.js', '.github/scripts/browser-smoke.cjs']);
for (const file of changed) {
  if (!allowed.has(file)) throw new Error(`Unexpected generated change: ${file}`);
}

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', ...changed]);
run('git', ['commit', '-m', 'fix: make blog sidebar focus-safe']);
run('git', ['push', 'origin', 'HEAD:fix/p1-blog-sidebar-accessibility']);