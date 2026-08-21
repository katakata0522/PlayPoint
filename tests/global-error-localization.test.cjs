'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('global error toast is selected from the static document language', () => {
  const source = read('js/ui.js');

  assert.ok(source.includes("ja: '予期せぬエラーが発生しました。ページをリロードしてみてください。'"));
  assert.ok(source.includes("en: 'An unexpected error occurred. Please try reloading the page.'"));
  assert.ok(source.includes("ko: '예기치 않은 오류가 발생했습니다. 페이지를 새로고침해 주세요.'"));
  assert.ok(source.includes("'zh-tw': '發生未預期的錯誤。請嘗試重新載入頁面。'"));
  assert.match(source, /document\.documentElement\?\.lang/);
  assert.match(source, /UI\.showToast\(getUnexpectedErrorMessage\(\), 'error'\)/);
  assert.ok(!source.includes('UI.showToast("予期せぬエラーが発生しました。ページをリロードしてみてください。", \'error\')'));
});

test('each calculator entry page has a stable static lang for pre-init errors', () => {
  const entries = [
    ['index.html', 'ja'],
    ['en/index.html', 'en'],
    ['ko/index.html', 'ko'],
    ['tw/index.html', 'zh-TW']
  ];

  for (const [relativePath, lang] of entries) {
    assert.ok(read(relativePath).includes(`<html lang="${lang}">`), `${relativePath}: missing lang=${lang}`);
  }
});
