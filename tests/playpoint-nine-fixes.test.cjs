const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok - ${name}`);
    console.error(error.message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function loadStorageManager(localStorage) {
  const quietConsole = { log() {}, warn() {}, error() {} };
  const context = { console: quietConsole, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  const source = read('tools/gravity-todo/src/StorageManager.js')
    .replace('export class StorageManager', 'class StorageManager')
    .concat('\nglobalThis.StorageManager = StorageManager;');
  vm.runInContext(source, context, { filename: 'StorageManager.js' });
  return context.StorageManager;
}

test('著者ページのOGP画像は実在する', () => {
  const html = read('author/katakata.html');
  const match = html.match(/<meta\s+property="og:image"\s+content="https:\/\/playpoint-sim\.com\/([^"]+)"/);
  assert.ok(match, 'og:imageがありません');
  assert.ok(fs.existsSync(path.join(root, match[1])), `OGP画像が存在しません: ${match[1]}`);
});

test('計算機は有限値とHTMLの上下限を検証する', () => {
  const source = read('js/calculator.js');
  assert.ok(source.includes('Number.isFinite(value)'), '有限値検証がありません');
  assert.ok(source.includes('element.max'), 'max属性の検証がありません');
  assert.ok(source.includes('element.min'), 'min属性の検証がありません');
});

test('Gravity Todoの保存正規化は個別色を保持する', () => {
  const StorageManager = loadStorageManager({ getItem: () => null, setItem() {} });
  const [task] = StorageManager.normalizeTasks([{
    text: '仕事', x: 1, y: 2, angle: 0, subTasks: [],
    blockColor: '#0f3460', blockBorder: '#4a90e2'
  }]);
  assert.strictEqual(task.blockColor, '#0f3460');
  assert.strictEqual(task.blockBorder, '#4a90e2');
});

test('破壊スコアはストレージ拒否と破損値でも安全に動作する', () => {
  const denied = loadStorageManager({
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); }
  });
  assert.strictEqual(denied.getDestroyCount(), 0);
  assert.strictEqual(denied.incrementDestroyCount(), 1);

  const corrupted = loadStorageManager({ getItem: () => 'NaN', setItem() {} });
  assert.strictEqual(corrupted.getDestroyCount(), 0);
});

test('ルートService WorkerはGETの許可対象だけを安定したキーでキャッシュする', () => {
  const source = read('sw.js');
  assert.ok(source.includes("event.request.method !== 'GET'"), 'GET制限がありません');
  assert.ok(source.includes('isCacheableRequest'), 'キャッシュ許可判定がありません');
  assert.ok(source.includes('getCacheKey'), 'クエリを正規化するキャッシュキーがありません');
});

test('GAとAdSenseは明示同意後だけ読み込む', () => {
  const consent = read('js/consent.js');
  const main = read('js/third-party.js');
  const blog = read('blog/components.js');
  const article = read('blog/article.js');
  const privacy = read('privacy.html');
  assert.ok(consent.includes("analytics_storage: 'denied'"));
  assert.ok(consent.includes("ad_storage: 'denied'"));
  assert.ok(consent.includes('whenGranted'));
  assert.ok(main.includes('PlayPointConsent.whenGranted'));
  assert.ok(blog.includes('PlayPointConsent.whenGranted'));
  assert.ok(article.includes('PlayPointConsent.whenGranted'));
  assert.ok(privacy.includes('プライバシー設定'));
  assert.ok(privacy.includes('js/consent.js?v=20260619a'));
  assert.ok(!privacy.includes('許可を与えたものとみなします'));
  assert.ok(consent.includes('.pp-consent h2{color:#f8fafc'), '同意見出しの色がページCSSに上書きされます');
});

test('Xserver同期後に本番スモークテストを実行する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.ok(workflow.includes('node .github/scripts/smoke-test.cjs'));
  assert.ok(fs.existsSync(path.join(root, '.github/scripts/smoke-test.cjs')));
});

test('初回ピン留めデモは文頭の固定記号で始まる', () => {
  const source = read('tools/gravity-todo/src/PhysicsEngine.js');
  assert.ok(source.includes("this.addTask('@📌 1. 空中にピン留め!"));
});

test('PWAインストール操作後は結果にかかわらずボタンを隠す', () => {
  const source = read('tools/gravity-todo/src/main.js');
  const handler = source.slice(source.indexOf("installBtn?.addEventListener('click'"));
  assert.ok(handler.includes("installBtn.classList.add('hidden');"));
  assert.ok(!handler.includes("if (outcome === 'accepted')"));
});

if (failures > 0) {
  console.error(`\n${failures}件の修正が未実装です。`);
  process.exitCode = 1;
}
