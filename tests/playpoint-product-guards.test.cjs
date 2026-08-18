'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

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
  vm.runInContext(source + "\nmodule.exports = { minifyJS, minifyCSS };", context, { filename: 'minify.cjs' });
  return context.module.exports;
}

function loadConfigs() {
  const context = { console, __TEST_ENV__: true };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('js/analytics-core.js'), context, { filename: 'analytics-core.js' });
  vm.runInContext(read('js/config.js').replace(/^import[^\n]+\n/gm, '').replace(/^export\s+/gm, ''), context, { filename: 'config.js' });
  return JSON.parse(JSON.stringify(context.PP_APP.CONFIGS));
}


// --- former playpoint-nine-fixes ---

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
  assert.ok(main.includes('scheduleThirdPartyLoad'));
  assert.ok(main.includes('void loadAdsense()'));
  assert.ok(main.indexOf('void ensureConsentManager();') < main.indexOf('scheduleThirdPartyLoad();'));
  assert.ok(blog.includes('PlayPointConsent.whenGranted'));
  assert.ok(article.includes('PlayPointConsent.whenGranted'));
  assert.ok(privacy.includes('プライバシー設定'));
  assert.ok(/js\/consent\.js\?v=[a-f0-9]+/.test(privacy));
  assert.ok(!privacy.includes('許可を与えたものとみなします'));
  assert.ok(consent.includes('__tcfapi'), 'TCF APIとの連携がありません');
  assert.ok(consent.includes('showRevocationMessage'), 'Google CMPの設定変更導線がありません');
  assert.ok(!consent.includes('data-consent-accept'), '廃止した独自同意UIが残っています');
});

test('計測イベントは同意済みラッパー経由だけで送信する', () => {
  const core = read('js/analytics-core.js');
  const config = read('js/config.js');
  const article = read('blog/article.js');
  const blog = read('blog/script.js');

  assert.ok(core.includes("window.PlayPointConsent.getStatus() === 'granted'"), '同意済み状態だけを明示的に許可していません');
  assert.ok(core.includes('pendingEvents'), '同意マネージャ読込前の短期キューがありません');
  assert.ok(config.includes('window.PlayPointAnalytics'), '計算機が共通計測ラッパーを参照していません');
  assert.ok(!article.includes("window.gtag('event'"), '記事ページが同意ラッパーを通さずイベント送信しています');
  assert.ok(!blog.includes("gtag('event'"), 'ブログ一覧が同意ラッパーを通さずイベント送信しています');
  assert.ok(article.includes('PlayPointAnalytics'), '記事ページが共通計測ラッパーを利用していません');
  assert.ok(blog.includes('PlayPointAnalytics'), 'ブログ一覧が共通計測ラッパーを利用していません');
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
    'blog/common-components.css',
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
  const core = read('js/analytics-core.js');
  const thirdParty = read('js/third-party.js');

  assert.ok(core.includes('pendingEvents'), 'GAロード前イベントのキューがありません');
  assert.ok(core.includes('flushPending'), '保留イベントのflush処理がありません');
  assert.ok(core.includes('markAnalyticsReady'), 'GA4準備完了を明示する処理がありません');
  const configIndex = thirdParty.indexOf("window.gtag('config', GA_MEASUREMENT_ID)");
  const readyIndex = thirdParty.indexOf('window.PlayPointAnalytics.markAnalyticsReady()');
  assert.ok(configIndex >= 0, 'GA4 config呼び出しがありません');
  assert.ok(readyIndex > configIndex, 'GA4 config完了前に保留イベントをflushし得ます');
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

test('デプロイ前検証は圧縮前に全回帰し、圧縮後は重点テストだけ再実行する', () => {
  const preflight = read('.github/scripts/preflight.cjs');
  const minifyIndex = preflight.indexOf("runPhase('公開アセット圧縮'");
  assert.ok(minifyIndex >= 0, 'ミニファイ処理がありません');
  assert.ok(preflight.includes("runPhase('全回帰テスト'"), 'ミニファイ前の全回帰テストがありません');
  assert.ok(preflight.includes('postMinifyTestFiles'), '圧縮後重点テスト一覧がありません');
  assert.ok(
    preflight.slice(minifyIndex).includes("runPhase('圧縮後の重点回帰テスト'"),
    'ミニファイ後の重点回帰テストがありません'
  );
  assert.ok(
    !preflight.slice(minifyIndex).includes("runPhase('圧縮後の全回帰テスト'"),
    '圧縮後に全量再実行が残っています'
  );
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

// --- former playpoint-audit-fixes ---
test('海外向け案内は英語を全世界共通レートとして案内しない', () => {
  const html = read('attention.html');
  for (const misleadingPhrase of ['English / Global mode', 'US (Global) mode', 'not from Japan']) {
    assert.ok(!html.includes(misleadingPhrase), `誤解を招く案内が残っています: ${misleadingPhrase}`);
  }
  assert.match(html, /Japan, the United States, South Korea, and Taiwan/);
  assert.match(html, /rates and level requirements vary by country/i);
});

test('多言語トップの実行時記事リンクは各言語の記事一覧を指す', () => {
  const configs = loadConfigs();
  const expected = {
    US: { text: '📝 Articles', href: 'articles/' },
    KR: { text: '📝 가이드 목록', href: 'articles/' },
    TW: { text: '📝 指南列表', href: 'articles/' }
  };
  for (const [region, link] of Object.entries(expected)) {
    assert.deepEqual(configs[region].uiText.linkArticles, link, region);
  }
});

test('日本語の必要ポイント例は初期状態とゴールドからプラチナの実例を使い分ける', () => {
  const configs = loadConfigs();
  const placeholder = configs.JP.uiText.neededPointsPlaceholder;
  const info = read('info.html');
  assert.equal(placeholder, '例：250');
  assert.equal(configs.JP.neededPointsPlaceholderOverrides['ゴールド:プラチナ'], '例：1728');
  assert.match(read('index.html'), new RegExp(`placeholder="${placeholder}"`));
  assert.match(info, /Q\. 例題の「1728」って何ですか？/);
  assert.match(info, /1728という数字は私がプラチナ到達までに必要なリアルな数字/);
});

test('タブ・補足・復元欄はCSSが失敗してもhidden属性で初期非表示になる', () => {
  const html = read('index.html');
  const ui = read('js/ui.js');
  const diary = read('js/diary.js');
  assert.match(html, /id="reverseMode"[^>]*\bhidden\b[^>]*aria-hidden="true"/);
  assert.match(html, /id="diaryMode"[^>]*\bhidden\b[^>]*aria-hidden="true"/);
  assert.match(html, /id="backup-input-wrapper"[^>]*\bhidden\b[^>]*aria-hidden="true"/);
  assert.match(html, /<label for="diaryBackupData"[^>]*data-lang-key="backupDataLabel"/);
  assert.equal((html.match(/class="tooltip-box"[^>]*\bhidden\b/g) || []).length, 9);
  assert.match(ui, /element\.hidden = !isVisible/);
  assert.match(ui, /tooltip\.hidden = false/);
  assert.match(diary, /backupInputWrapper\.hidden = !isHidden/);
});

test('ブログ初期表示は最終件数と同じ6枚のスケルトンをHTMLで確保する', () => {
  const html = read('blog/index.html');
  const script = read('blog/script.js');
  assert.equal((html.match(/class="skeleton-card"/g) || []).length, 6);
  assert.match(html, /<noscript>[\s\S]*href="noscript\.css\?v=[a-f0-9]+"/);
  assert.match(html, /<noscript>[\s\S]*class="static-article-fallback"[\s\S]*<\/noscript>/);
  assert.match(script, /querySelectorAll\('\.skeleton-card'\)\.length === CONFIG\.itemsPerPage/);
  assert.match(script, /i < CONFIG\.itemsPerPage/);
});

test('計算詳細は項目名と値を2列で揃え、値の内部は分断しない', () => {
  const css = read('style.css');
  assert.match(css, /\.result-detail-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/s);
  assert.doesNotMatch(css, /\.result-detail-grid\s+(?:span|strong)\s*\{/);
});

test('計算結果リンクのhover規則を閉じ、後続のツールチップ非表示を巻き込まない', () => {
  const css = read('style.css');
  assert.match(css, /\.result-guidance-links a:hover\s*\{[^{}]*text-decoration:\s*underline;\s*\}/s);
  assert.match(css, /\.tooltip-box\s*\{[^{}]*display:\s*none;/s);
});

test('CSPは計測と広告品質確認で実際に使う接続先を許可する', () => {
  const htaccess = read('.htaccess');
  const policy = (htaccess.match(/Content-Security-Policy "([^"]+)"/) || [])[1] || '';
  const directives = Object.fromEntries(policy.split(';').map(part => {
    const [name, ...values] = part.trim().split(/\s+/);
    return [name, values];
  }));
  for (const origin of [
    'https://*.analytics.google.com',
    'https://www.googletagmanager.com',
    'https://*.g.doubleclick.net',
    'https://pagead2.googlesyndication.com'
  ]) {
    assert.ok(directives['connect-src']?.includes(origin), `connect-src に必要な接続先がありません: ${origin}`);
  }
  assert.ok(directives['script-src']?.includes('https://*.adtrafficquality.google'), '広告品質確認スクリプトの接続先がありません');
});

test('日記の景品選択には全言語で読み上げ可能な名前がある', () => {
  const configs = loadConfigs();
  for (const region of ['JP', 'US', 'KR', 'TW']) {
    assert.ok(configs[region].uiText.prizeLabel, `${region} の景品ラベルがありません`);
  }
  assert.match(read('js/diary.js'), /<select id="week\$\{weekNum\}_prize" aria-label="\$\{texts\.prizeLabel\}">/);
});

test('トップページは大きな画像プレビューとOGP画像サイズを明示する', () => {
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(file);
    assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/, file);
    assert.match(html, /<meta property="og:image:width" content="1200">/, file);
    assert.match(html, /<meta property="og:image:height" content="630">/, file);
    assert.match(html, /<meta property="og:image:type" content="image\/png">/, file);
  }
});

test('初期操作に必要なアプリモジュールは実際のimport URLと同じURLで先読みする', () => {
  const dependencyModules = ['config.js', 'ui.js', 'share.js', 'calculator.js'];
  for (const [file, prefix] of [['index.html', ''], ['en/index.html', '../'], ['ko/index.html', '../'], ['tw/index.html', '../']]) {
    const html = read(file);
    for (const moduleName of dependencyModules) {
      assert.match(
        html,
        new RegExp(`<link rel="modulepreload" href="${prefix}js/${moduleName}">`),
        `${file}: ${moduleName}`
      );
      assert.doesNotMatch(
        html,
        new RegExp(`<link rel="modulepreload" href="${prefix}js/${moduleName}\\?v=`),
        `${file}: ${moduleName}をimportと異なるURLで先読みしています`
      );
    }
    assert.doesNotMatch(html, new RegExp(`<link rel="modulepreload" href="${prefix}js/diary\\.js(?:\\?v=[^"]+)?">`), `${file}: diary.jsを初期先読みしています`);
    const preloadMain = html.match(new RegExp(`<link rel="modulepreload" href="${prefix}js/main\\.js\\?v=([a-f0-9]{10})">`));
    const executedMain = html.match(new RegExp(`<script type="module" src="${prefix}js/main\\.js\\?v=([a-f0-9]{10})"></script>`));
    assert.ok(preloadMain && executedMain, `${file}: main.jsの先読みまたは実行タグがありません`);
    assert.equal(preloadMain[1], executedMain[1], `${file}: main.jsを異なるURLで二重取得します`);
  }
});

test('日記の重複通知を表示せず、カレンダー登録は残す', () => {
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(file);
    assert.ok(!html.includes('id="friday-reminder"'), `${file}: 重複する金曜日通知が残っています`);
    assert.ok(!html.includes('id="diary-hint-card"'), `${file}: 重複する日記ヒントが残っています`);
    assert.ok(html.includes('id="diaryMode"'), `${file}: 日記本体が消えています`);
    assert.ok(html.includes('id="register-google-cal-btn"'), `${file}: カレンダー登録が消えています`);
  }
});

test('地域差案内は日本語トップでも英語の注意導線として表示する', () => {
  assert.match(read('index.html'), /data-country-notes-link[^>]*>⚠️ For users outside Japan<\/a>/);
  for (const file of ['en/index.html', 'ko/index.html', 'tw/index.html']) {
    assert.match(read(file), /data-country-notes-link(?! hidden)/);
  }
});

test('計算方法と検証方針を全言語で本文から確認できる', () => {
  const expected = {
    'index.html': /入力値は外部へ送信せず、このブラウザ上で計算します/,
    'en/index.html': /Inputs are calculated in this browser and are not sent externally/,
    'ko/index.html': /입력값은 외부로 전송하지 않고 이 브라우저에서 계산합니다/,
    'tw/index.html': /輸入內容不會傳送到外部，而是在此瀏覽器中完成計算/
  };
  for (const [file, pattern] of Object.entries(expected)) {
    const html = read(file);
    assert.match(html, pattern, file);
    assert.match(html, /href="\.\.\/author\/katakata\.html"|href="author\/katakata\.html"/, file);
  }
});

test('AdSenseは早期async取得し分析だけを初期表示後に低優先度で読み込む', () => {
  const source = read('js/third-party.js');
  const articleSource = read('blog/article.js');
  const components = read('blog/components.js');
  const adsenseBlock = source.slice(source.indexOf('async function loadAdsense'), source.indexOf('function getCurrentAssetPrefix'));

  assert.match(source, /window\.addEventListener\('load', scheduleAfterLoad, \{ once: true \}\)/);
  assert.match(source, /ANALYTICS_DELAY_MS\s*=\s*1200/);
  assert.match(source, /ADSENSE_DELAY_MS\s*=\s*3000/);
  assert.match(source, /fetchpriority:\s*'low'/);
  assert.ok(source.indexOf('void loadAdsense();') < source.indexOf('const scheduleAfterLoad'));
  assert.doesNotMatch(adsenseBlock, /fetchpriority/);
  assert.match(source, /app_display_mode/);
  assert.match(source, /display-mode: standalone/);
  assert.match(components, /app_display_mode/);
  assert.doesNotMatch(articleSource, /window\.scrollY\s*<\s*600/);
  assert.doesNotMatch(components, /window\.scrollY\s*<\s*600/);
  assert.match(components, /runAfterConsent\(loadBlogAdsense\)/);
  assert.ok(source.indexOf('ensureConsentManager();') < source.indexOf('scheduleThirdPartyLoad();'));
});
