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

function loadMinifierForTest() {
  const source = read('.github/scripts/minify.cjs');
  const context = {
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === 'fs') {
        return {
          existsSync() { return false; },
          readFileSync() { return ''; },
          writeFileSync() {}
        };
      }
      if (name === 'path') return require('path');
      return require(name);
    },
    __dirname: path.join(root, '.github', 'scripts'),
    module: { exports: {} },
    exports: {}
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nmodule.exports = { minifyJS, minifyCSS };`, context, { filename: 'minify.cjs' });
  return context.module.exports;
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

test('計測イベントは同意済みラッパー経由だけで送信する', () => {
  const config = read('js/config.js');
  const article = read('blog/article.js');
  const blog = read('blog/script.js');

  assert.ok(config.includes("window.PlayPointConsent.getStatus() === 'granted'"), '同意済み状態だけを明示的に許可していません');
  assert.ok(!config.includes('window.PlayPointConsent && window.PlayPointConsent.getStatus() !=='), '同意マネージャ未ロード時にイベントをキューへ積めます');
  assert.ok(!article.includes("window.gtag('event'"), '記事ページが同意ラッパーを通さずイベント送信しています');
  assert.ok(!blog.includes("gtag('event'"), 'ブログ一覧が同意ラッパーを通さずイベント送信しています');
  assert.ok(article.includes('PlayPointConsent.getStatus()'), '記事ページのクリック計測が同意状態を確認していません');
  assert.ok(blog.includes('PlayPointConsent.getStatus()'), 'ブログ一覧の計測が同意状態を確認していません');
});

test('Kids Smile Landのprecache対象は実在する配信ファイルだけを指す', () => {
  const source = read('kids-smile-land/service-worker.js');
  const urlsMatch = source.match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(urlsMatch, 'ASSETS配列がありません');
  const urls = [...urlsMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.ok(urls.includes('./tailwind-built.css'), '実際に読み込むCSSをprecacheしていません');
  assert.ok(urls.includes('./kiwimaru-400.woff2'), '実在する400 weightフォントをprecacheしていません');
  assert.ok(urls.includes('./kiwimaru-500.woff2'), '実在する500 weightフォントをprecacheしていません');

  for (const url of urls) {
    if (url === './') continue;
    const relativePath = url.replace(/^\.\//, 'kids-smile-land/');
    assert.ok(fs.existsSync(path.join(root, relativePath)), `precache対象が存在しません: ${url}`);
  }
});

test('各Service Workerは自分のキャッシュだけを削除対象にする', () => {
  const rootSw = read('sw.js');
  const kidsSw = read('kids-smile-land/service-worker.js');
  const gravitySw = read('tools/gravity-todo/sw.js');

  assert.ok(rootSw.includes('cache.startsWith(CACHE_PREFIX)'), 'ルートSWが他アプリのキャッシュを削除し得ます');
  assert.ok(kidsSw.includes('key.startsWith(CACHE_PREFIX)'), 'Kids Smile Land SWが他アプリのキャッシュを削除し得ます');
  assert.ok(gravitySw.includes('cacheName.startsWith(APP_SHELL_CACHE_PREFIX)'), 'Gravity Todo SWが他アプリのキャッシュを削除し得ます');
});

test('ルートService Workerはprecache失敗時に壊れたまま有効化しない', () => {
  const source = read('sw.js');
  const installBlock = source.slice(source.indexOf("self.addEventListener('install'"), source.indexOf("self.addEventListener('activate'"));

  assert.ok(installBlock.includes('return cache.addAll(bypassRequests).then(() => self.skipWaiting())'), 'precache成功時だけskipWaitingする形ではありません');
  assert.ok(!installBlock.includes('.catch('), 'install失敗を握りつぶしています');
});

test('デプロイ同期は公開不要な運用ファイルを除外する', () => {
  const workflow = read('.github/workflows/deploy.yml');

  for (const pattern of [
    "--exclude 'docs*'",
    "--exclude 'scripts*'",
    "--exclude 'みんな用URL.txt'",
    "--exclude 'CNAME'"
  ]) {
    assert.ok(workflow.includes(pattern), `rsync除外が不足しています: ${pattern}`);
  }
});

test('JSミニファイは文字列中のスラッシュコメント風テキストを壊さない', () => {
  const minifierSource = read('.github/scripts/minify.cjs');
  assert.ok(!minifierSource.includes("replace(/(^|\\s)\\/\\/.*$/gm"), '正規表現でJS行コメントを削除しています');

  const { minifyJS } = loadMinifierForTest();
  const source = "const a = 'value // keep';\nconst b = 'https://playpoint-sim.com/';\nconsole.log(a, b);\n";
  const minified = minifyJS(source);
  assert.ok(minified.includes("'value // keep'"));
  assert.ok(minified.includes("'https://playpoint-sim.com/'"));
  new Function(minified);
});

test('デプロイ前検証はミニファイ後JSの構文を確認する', () => {
  const workflow = read('.github/workflows/deploy.yml');

  assert.ok(fs.existsSync(path.join(root, '.github/scripts/verify-js-syntax.cjs')), 'JS構文検証スクリプトがありません');
  assert.ok(workflow.includes('node .github/scripts/verify-js-syntax.cjs'), 'ワークフローでJS構文検証を実行していません');
});

test('CIデプロイはコミット済み成果物だけを公開する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const verifier = read('.github/scripts/verify-build-output.cjs');
  const deployIndex = workflow.indexOf('Deploy via rsync');
  assert.ok(deployIndex >= 0, 'rsyncデプロイ処理がありません');
  const beforeDeploy = workflow.slice(0, deployIndex);

  assert.ok(!beforeDeploy.includes('node scripts/build-html.js'), 'CI上で未コミット生成物を作ってから本番公開しています');
  assert.ok(beforeDeploy.includes('node .github/scripts/verify-build-output.cjs'), '生成物の整合性検証をデプロイ前に実行していません');
  assert.ok(verifier.includes("'git', ['diff', '--exit-code', '--', ...generatedFiles]"), '生成物の未コミット差分を対象ファイル単位で検出していません');
});

test('デプロイ前JS構文検証はGitHub Actions用スクリプトも対象にする', () => {
  const verifier = read('.github/scripts/verify-js-syntax.cjs');

  assert.ok(!verifier.includes("'.github'"), '.github/scripts配下の検証スクリプトが構文チェック対象外です');
  assert.ok(verifier.includes("'.github/workflows'"), 'workflow定義はJS構文チェックから除外してください');
  assert.ok(verifier.includes("'.github/scripts/verify-js-syntax.cjs'"), '構文検証スクリプト自身を明示的に検証していません');
  assert.ok(verifier.includes("'.github/scripts/smoke-test.cjs'"), '本番スモークスクリプトをrsync前に構文検証していません');
});

test('サブアプリService Workerはprecache成功時だけ有効化する', () => {
  const kidsSw = read('kids-smile-land/service-worker.js');
  const gravitySw = read('tools/gravity-todo/sw.js');
  const kidsInstall = kidsSw.slice(kidsSw.indexOf("addEventListener('install'"), kidsSw.indexOf("addEventListener('activate'"));
  const gravityInstall = gravitySw.slice(gravitySw.indexOf("addEventListener('install'"), gravitySw.indexOf("addEventListener('activate'"));

  assert.ok(kidsInstall.includes('cache.addAll(ASSETS).then(() => self.skipWaiting())'), 'Kids SWがprecache成功前にskipWaitingしています');
  assert.ok(!kidsInstall.includes('self.skipWaiting();'), 'Kids SWのskipWaitingがprecache Promise外にあります');
  assert.ok(gravityInstall.includes('cache.addAll(APP_SHELL_URLS).then(() => self.skipWaiting())'), 'Gravity Todo SWがprecache成功前にskipWaitingしています');
  assert.ok(!gravityInstall.includes('self.skipWaiting();'), 'Gravity Todo SWのskipWaitingがprecache Promise外にあります');
});

test('多言語トップはJS実行前の主要文言も翻訳済みにする', () => {
  const en = read('en/index.html');
  const ko = read('ko/index.html');
  const tw = read('tw/index.html');

  assert.ok(en.includes('<h1 id="main-title" data-lang-key="mainTitle">Play Points Calculator</h1>'));
  assert.ok(ko.includes('<h1 id="main-title" data-lang-key="mainTitle">구글 플레이 포인트 계산기</h1>'));
  assert.ok(tw.includes('<h1 id="main-title" data-lang-key="mainTitle">Google Play 點數計算器</h1>'));
  assert.ok(!en.includes('data-lang-key="tabMain">通常計算</button>'));
  assert.ok(!ko.includes('data-lang-key="tabMain">通常計算</button>'));
  assert.ok(!tw.includes('data-lang-key="tabMain">通常計算</button>'));
});

test('同意済み計測はGA本体ロード前のイベントを短期キューへ保持する', () => {
  const config = read('js/config.js');
  const thirdParty = read('js/third-party.js');

  assert.ok(config.includes('pendingEvents'), 'GAロード前イベントのキューがありません');
  assert.ok(config.includes('flushPending'), '保留イベントのflush処理がありません');
  assert.ok(thirdParty.includes('window.PP_APP.ANALYTICS.flushPending()'), 'GAロード後に保留イベントをflushしていません');
});

test('Xserver同期後に本番スモークテストを実行する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.ok(workflow.includes('node .github/scripts/smoke-test.cjs'));
  assert.ok(fs.existsSync(path.join(root, '.github/scripts/smoke-test.cjs')));
});

test('デプロイ検証の変更でもワークフローを実行する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.ok(!workflow.includes("- '.github/**'"), '.github配下の検証変更がデプロイワークフローから除外されています');
});

test('デプロイ前検証はミニファイ後の成果物にも実行する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const minifyIndex = workflow.indexOf('node .github/scripts/minify.cjs');
  assert.ok(minifyIndex >= 0, 'ミニファイ処理がありません');
  const afterMinify = workflow.slice(minifyIndex);
  assert.ok(afterMinify.includes('node tests/playpoint-regression.test.cjs'), 'ミニファイ後に回帰テストを再実行していません');
  assert.ok(afterMinify.includes('node tests/playpoint-nine-fixes.test.cjs'), 'ミニファイ後に追加修正テストを再実行していません');
});

test('本番スモークテストの期待文字列は配信元ファイルに存在する', () => {
  const smokeTest = read('.github/scripts/smoke-test.cjs');
  const targets = [...smokeTest.matchAll(/\{ url: '([^']+)', contains: '([^']+)' \}/g)];
  assert.ok(targets.length > 0);

  for (const [, urlValue, expected] of targets) {
    const url = new URL(urlValue);
    let relativePath = url.pathname.replace(/^\//, '');
    if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
    const source = read(relativePath);
    assert.ok(source.includes(expected), `${url.pathname}に期待文字列「${expected}」がありません`);
  }
});

test('本番スモークテストは主要サブアプリと言語トップも確認する', () => {
  const smokeTest = read('.github/scripts/smoke-test.cjs');
  const requiredUrls = [
    'https://playpoint-sim.com/en/',
    'https://playpoint-sim.com/ko/',
    'https://playpoint-sim.com/tw/',
    'https://playpoint-sim.com/kids-smile-land/',
    'https://playpoint-sim.com/tools/gravity-todo/'
  ];

  for (const url of requiredUrls) {
    assert.ok(smokeTest.includes(`url: '${url}'`), `本番スモーク対象が不足しています: ${url}`);
  }
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
