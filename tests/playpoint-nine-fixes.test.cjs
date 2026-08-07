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

test('ルートService WorkerはGETの許可対象だけを安定したキーでキャッシュする', () => {
  const source = read('sw.js');
  assert.ok(source.includes("event.request.method !== 'GET'"), 'GET制限がありません');
  assert.ok(source.includes('isCacheableRequest'), 'キャッシュ許可判定がありません');
  assert.ok(source.includes('getCacheKey'), 'クエリを正規化するキャッシュキーがありません');
});

test('GAとAdSenseは地域別Consent ModeとGoogle認定CMPに従う', () => {
  const { createFileRevision } = require(path.join(root, 'scripts', 'asset-sync.cjs'));
  const consent = read('js/consent.js');
  const main = read('js/third-party.js');
  const blog = read('blog/components.js');
  const article = read('blog/article.js');
  const privacy = read('privacy.html');
  assert.ok(consent.includes("analytics_storage: 'denied'"));
  assert.ok(consent.includes("ad_storage: 'denied'"));
  assert.ok(consent.includes('whenGranted'));
  assert.ok(main.includes('ensureConsentManager'));
  assert.ok(main.includes('void ensureConsentManager()'));
  assert.ok(main.includes('void loadAdsense();'));
  assert.ok(main.includes('scheduleAnalyticsLoad();'));
  assert.ok(!main.includes('ADSENSE_DELAY_MS'));
  assert.ok(main.includes('.then(() => {'));
  assert.ok(main.indexOf('void ensureConsentManager()') < main.indexOf('void loadAdsense();'));
  assert.ok(blog.includes('PlayPointConsent.whenGranted'));
  assert.ok(article.includes("window.PlayPointConsent.getStatus() === 'granted'"));
  assert.ok(blog.includes('if (!isBlogPage && !isArticlePageTop) return;'));
  assert.ok(blog.includes(`js/consent.js?v=${createFileRevision(root, 'js/consent.js')}`));
  assert.ok(privacy.includes('プライバシー設定'));
  assert.ok(privacy.includes(`js/consent.js?v=${createFileRevision(root, 'js/consent.js')}`));
  assert.ok(!privacy.includes('許可を与えたものとみなします'));
  assert.ok(consent.includes('__tcfapi'), 'TCF APIとの連携がありません');
  assert.ok(consent.includes('showRevocationMessage'), 'Google CMPの設定変更導線がありません');
  assert.ok(!consent.includes('data-consent-accept'), '廃止した独自同意UIが残っています');
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

test('ルートService Workerは自分のキャッシュだけを削除対象にする', () => {
  const rootSw = read('sw.js');

  assert.ok(rootSw.includes('cache.startsWith(CACHE_PREFIX)'), 'ルートSWが他アプリのキャッシュを削除し得ます');
});

test('ルートService Workerはprecache失敗時に壊れたまま有効化しない', () => {
  const source = read('sw.js');
  const installBlock = source.slice(source.indexOf("self.addEventListener('install'"), source.indexOf("self.addEventListener('activate'"));

  assert.ok(installBlock.includes('return cache.addAll(bypassRequests).then(() => self.skipWaiting())'), 'precache成功時だけskipWaitingする形ではありません');
  assert.ok(!installBlock.includes('.catch('), 'install失敗を握りつぶしています');
});

test('デプロイ同期は公開不要な運用ファイルをルート限定で除外する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const deployScript = read('.github/scripts/deploy-rsync.sh');

  assert.ok(workflow.includes('bash .github/scripts/deploy-rsync.sh'), '専用デプロイスクリプトを実行していません');
  for (const pattern of [
    "--exclude '/docs/***'",
    "--exclude '/scripts/***'",
    "--exclude '/みんな用URL.txt'",
    "--exclude '/CNAME'"
  ]) {
    assert.ok(deployScript.includes(pattern), `rsync除外が不足しています: ${pattern}`);
  }
  for (const unsafePattern of [
    "--exclude 'docs*'",
    "--exclude 'scripts*'"
  ]) {
    assert.ok(!deployScript.includes(unsafePattern), `全階層へ広がる除外が残っています: ${unsafePattern}`);
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

test('デプロイ時ミニファイはPlayPoint本体・ブログ・ウィジェットを対象にする', () => {
  const minifierSource = read('.github/scripts/minify.cjs');

  for (const file of [
    'blog/style.css',
    'blog/script.js',
    'blog/components.js',
    'blog/article.js',
    'blog/utils.js',
    'embed/playpoint-widget.js'
  ]) {
    assert.ok(minifierSource.includes(file), `ミニファイ対象が不足しています: ${file}`);
  }
});

test('デプロイ前検証はミニファイ後JSの構文を確認する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const preflight = read('.github/scripts/preflight.cjs');
  const minifyIndex = preflight.indexOf("runPhase('公開アセット圧縮'");

  assert.ok(fs.existsSync(path.join(root, '.github/scripts/verify-js-syntax.cjs')), 'JS構文検証スクリプトがありません');
  assert.ok(workflow.includes('node .github/scripts/preflight.cjs --prepare-deploy'), 'デプロイ前の一括検証を実行していません');
  assert.ok(minifyIndex >= 0, '一括検証にミニファイ処理がありません');
  assert.ok(preflight.slice(minifyIndex).includes("runPhase('圧縮後JavaScript構文検証'"), 'ミニファイ後のJS構文検証がありません');
});

test('CIデプロイはコミット済み成果物だけを公開する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  const deployScript = read('.github/scripts/deploy-rsync.sh');
  const preflight = read('.github/scripts/preflight.cjs');
  const verifier = read('.github/scripts/verify-build-output.cjs');
  const deployIndex = workflow.indexOf('Deploy strict public mirror via rsync');
  assert.ok(deployIndex >= 0, 'rsyncデプロイ処理がありません');
  const beforeDeploy = workflow.slice(0, deployIndex);

  assert.ok(!beforeDeploy.includes('node scripts/build-html.js'), 'CI上で未コミット生成物を作ってから本番公開しています');
  assert.ok(beforeDeploy.includes('node .github/scripts/preflight.cjs --prepare-deploy'), '一括検証を通さずにデプロイしています');
  assert.ok(deployScript.includes('rsync -avz --delete-after --delete-excluded'), '厳密ミラーのrsync処理がありません');
  assert.ok(preflight.includes("runPhase('生成物の再現性検証'"), '一括検証に生成物の整合性検証がありません');
  assert.ok(verifier.includes("'git', ['diff', '--exit-code', '--', ...generatedFiles]"), '生成物の未コミット差分を対象ファイル単位で検出していません');
});

test('デプロイ前JS構文検証はGitHub Actions用スクリプトも対象にする', () => {
  const verifier = read('.github/scripts/verify-js-syntax.cjs');

  assert.ok(!verifier.includes("'.github'"), '.github/scripts配下の検証スクリプトが構文チェック対象外です');
  assert.ok(verifier.includes("'.github/workflows'"), 'workflow定義はJS構文チェックから除外してください');
  assert.ok(verifier.includes("'.github/scripts/verify-js-syntax.cjs'"), '構文検証スクリプト自身を明示的に検証していません');
  assert.ok(verifier.includes("'.github/scripts/smoke-test.cjs'"), '本番スモークスクリプトをrsync前に構文検証していません');
});

test('多言語トップはJS実行前の主要文言も翻訳済みにする', () => {
  const en = read('en/index.html');
  const ko = read('ko/index.html');
  const tw = read('tw/index.html');

  assert.ok(en.includes('<h1 id="main-title" data-lang-key="mainTitle">Google Play Points Calculator</h1>'));
  assert.ok(ko.includes('<h1 id="main-title" data-lang-key="mainTitle">Google Play Points 계산기</h1>'));
  assert.ok(tw.includes('<h1 id="main-title" data-lang-key="mainTitle">Google Play Points 計算器</h1>'));
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

test('Xserver同期後に本番SEOヘルスチェックを実行する', () => {
  const deployWorkflow = read('.github/workflows/deploy.yml');
  const seoWorkflow = read('.github/workflows/seo-healthcheck.yml');
  const smokeIndex = deployWorkflow.indexOf('node .github/scripts/smoke-test.cjs');
  const deployIndex = deployWorkflow.indexOf('node .github/scripts/seo-health-check.cjs');

  assert.ok(fs.existsSync(path.join(root, '.github/scripts/seo-health-check.cjs')), 'SEOヘルスチェックスクリプトがありません');
  assert.ok(smokeIndex >= 0, '本番スモークテストがありません');
  assert.ok(deployIndex > smokeIndex, '本番SEOヘルスチェックがrsync後のスモーク確認後に実行されていません');
  assert.ok(seoWorkflow.includes('node .github/scripts/seo-health-check.cjs'), '週次SEO Health Checkとデプロイ後SEO確認が別実装になっています');
});

test('デプロイ検証の変更でもワークフローを実行する', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.ok(!workflow.includes("- '.github/**'"), '.github配下の検証変更がデプロイワークフローから除外されています');
});

test('デプロイ前検証は全テストをミニファイ前後に実行する', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  const minifyIndex = preflight.indexOf("runPhase('公開アセット圧縮'");
  assert.ok(minifyIndex >= 0, 'ミニファイ処理がありません');
  assert.ok(preflight.includes("runPhase('全回帰テスト'"), 'ミニファイ前の全回帰テストがありません');
  assert.ok(preflight.slice(minifyIndex).includes("runPhase('圧縮後の全回帰テスト'"), 'ミニファイ後の全回帰テストがありません');
  assert.ok(preflight.includes(".filter(file => file.endsWith('.test.cjs'))"), 'テストファイルが動的に収集されていません');
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

test('本番スモークテストは主要PlayPointページと言語トップを確認する', () => {
  const smokeTest = read('.github/scripts/smoke-test.cjs');
  const requiredUrls = [
    'https://playpoint-sim.com/en/',
    'https://playpoint-sim.com/ko/',
    'https://playpoint-sim.com/tw/',
    'https://playpoint-sim.com/campaign/2x/',
    'https://playpoint-sim.com/campaign/3x/',
    'https://playpoint-sim.com/campaign/wait/',
    'https://playpoint-sim.com/amount/10000/',
    'https://playpoint-sim.com/en/status/platinum/',
    'https://playpoint-sim.com/ko/status/platinum/',
    'https://playpoint-sim.com/tw/status/platinum/',
    'https://playpoint-sim.com/embed.html'
  ];

  for (const url of requiredUrls) {
    assert.ok(smokeTest.includes(`url: '${url}'`), `本番スモーク対象が不足しています: ${url}`);
  }
});

if (failures > 0) {
  console.error(`\n${failures}件の修正が未実装です。`);
  process.exitCode = 1;
}
