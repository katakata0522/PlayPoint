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

const uiPath = 'js/ui.js';
replaceExact(
  uiPath,
`const HTML_TEXT_KEYS = new Set(['siteDescription', 'warningRate', 'guestNotice']);
const LOCALIZED_PAGE_PREFIXES = ['/en/', '/ko/', '/tw/'];
const TAB_NAVIGATION_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'Home', 'End']);`,
`const HTML_TEXT_KEYS = new Set(['siteDescription', 'warningRate', 'guestNotice']);
const LOCALIZED_PAGE_PREFIXES = ['/en/', '/ko/', '/tw/'];
const TAB_NAVIGATION_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'Home', 'End']);
const UNEXPECTED_ERROR_MESSAGES = Object.freeze({
    ja: '予期せぬエラーが発生しました。ページをリロードしてみてください。',
    en: 'An unexpected error occurred. Please try reloading the page.',
    ko: '예기치 않은 오류가 발생했습니다. 페이지를 새로고침해 주세요.',
    'zh-tw': '發生未預期的錯誤。請嘗試重新載入頁面。'
});

function getUnexpectedErrorMessage() {
    const lang = typeof document !== 'undefined'
        ? String(document.documentElement?.lang || '').toLowerCase()
        : '';
    if (lang.startsWith('zh')) return UNEXPECTED_ERROR_MESSAGES['zh-tw'];
    const primaryLang = lang.split('-')[0];
    return UNEXPECTED_ERROR_MESSAGES[primaryLang] || UNEXPECTED_ERROR_MESSAGES.ja;
}`
);
replaceExact(
  uiPath,
  `        UI.showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", 'error');`,
  `        UI.showToast(getUnexpectedErrorMessage(), 'error');`
);

run(process.execPath, ['scripts/prepare-pr.cjs']);
run(process.execPath, ['--test', 'tests/global-error-localization.test.cjs']);

const changedResult = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8' });
if (changedResult.status !== 0) process.exit(changedResult.status || 1);
const changed = String(changedResult.stdout || '').trim().split(/\r?\n/).filter(Boolean);
if (changed.length === 0) {
  console.log('No changes to commit.');
  process.exit(0);
}

const allowed = new Set(['js/ui.js', 'sw.js']);
for (const file of changed) {
  if (!allowed.has(file)) throw new Error(`Unexpected generated change: ${file}`);
}

run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', ...changed]);
run('git', ['commit', '-m', 'fix: localize global error toast']);
run('git', ['push', 'origin', 'HEAD:fix/p2-global-error-localization']);
