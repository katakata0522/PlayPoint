const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('本番デプロイはmain以外の手動refを拒否する', () => {
  const workflow = read('.github', 'workflows', 'deploy.yml');
  assert.match(workflow, /if:\s*github\.ref\s*==\s*['"]refs\/heads\/main['"]/);
});

test('KidsのSVG出力はXMLエスケープと名前長制限を持つ', () => {
  const html = read('kids-smile-land', 'index.html');
  const app = read('kids-smile-land', 'app.js');
  assert.match(html, /id="parent-kids-name"[^>]*maxlength="30"/);
  assert.match(app, /function escapeXml/);
  assert.match(app, /escapeXml\(smileKidsName\)/);
});

test('Kindleバックアップ取込はファイル容量と件数を先に制限する', () => {
  const app = read('kindle-tracker', 'app.js');
  assert.match(app, /MAX_IMPORT_FILE_BYTES/);
  assert.match(app, /MAX_IMPORTED_BOOKS/);
  assert.match(app, /file\.size\s*>\s*MAX_IMPORT_FILE_BYTES/);
  assert.match(app, /books\.length\s*>\s*MAX_IMPORTED_BOOKS/);
});

test('Gravity TODOは復元時にもタスク上限を適用する', () => {
  const physics = read('tools', 'gravity-todo', 'src', 'PhysicsEngine.js');
  assert.match(physics, /MAX_RESTORED_TASKS/);
  assert.match(physics, /slice\(0,\s*MAX_RESTORED_TASKS\)/);
});

test('楽天シミュレーターは保存状態の配列と数値を正規化する', () => {
  const html = read('tools', 'rakuten-sim', 'index.html');
  assert.match(html, /Array\.isArray\(savedState\.items\)/);
  assert.match(html, /Number\.isFinite\(Number\(item\.price\)\)/);
});

test('サブスク診断はカスタム保存件数を制限する', () => {
  const html = read('tools', 'sub-health', 'index.html');
  assert.match(html, /MAX_CUSTOM_SUBS/);
  assert.match(html, /customSubs\.slice\(0,\s*MAX_CUSTOM_SUBS\)/);
});
