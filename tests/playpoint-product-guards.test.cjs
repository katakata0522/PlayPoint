'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadConfigs } = require('./helpers/playpoint-calculator-test-context.cjs');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

// --- former playpoint-nine-fixes ---

test('著者ページのOGP画像は実在する', () => {
  const html = read('author/katakata.html');
  const match = html.match(/<meta\s+property="og:image"\s+content="https:\/\/playpoint-sim\.com\/([^"]+)"/);
  assert.ok(match, 'og:imageがありません');
  assert.ok(fs.existsSync(path.join(root, match[1])), `OGP画像が存在しません: ${match[1]}`);
});

test('Consentの公開UIと広告境界に旧独自同意フローを戻さない', () => {
  const consent = read('js/consent.js');
  const article = read('blog/article.js');
  const privacy = read('privacy.html');

  assert.ok(privacy.includes('プライバシー設定'), 'ユーザーが同意設定を開く公開導線がありません');
  assert.match(privacy, /js\/consent\.js\?v=[a-f0-9]+/, 'Consent管理スクリプトが公開ページから読み込まれていません');
  assert.ok(!privacy.includes('許可を与えたものとみなします'), '閲覧だけで同意扱いする旧文言が戻っています');
  assert.doesNotMatch(consent, /data-consent-accept/, '廃止した独自同意UIが戻っています');
  assert.match(article, /PlayPointConsent\.whenAdsAllowed/, '記事広告が共通Consent境界を利用していません');
});

test('記事・ブログはGA4 eventを直接送らず共通計測境界を利用する', () => {
  const config = read('js/config.js');
  const article = read('blog/article.js');
  const blog = read('blog/script.js');
  const directGtagEvent = /(?:window\.)?gtag\s*\(\s*['"]event['"]/;

  assert.match(config, /PlayPointAnalytics/, '計算機が共通計測境界を参照していません');
  assert.doesNotMatch(article, directGtagEvent, '記事ページが共通計測境界を迂回しています');
  assert.doesNotMatch(blog, directGtagEvent, 'ブログ一覧が共通計測境界を迂回しています');
  assert.match(article, /PlayPointAnalytics/, '記事ページが共通計測境界を利用していません');
  assert.match(blog, /PlayPointAnalytics/, 'ブログ一覧が共通計測境界を利用していません');
});

// P04: deploy-cleanupの実rsync fixtureへ統合（root除外・同名サブ階層保持・別管理領域保護）。

test('デプロイ時は実在する公開CSSだけを圧縮し、JSはasset version同期だけ行う', () => {
  const minifierSource = read('.github/scripts/minify.cjs');
  const { cssTargets } = require('../.github/scripts/minify.cjs');

  for (const file of [
    'style.css',
    'region-selector.css',
    'visitor-thanks.css',
    'site-shell-vnext.css',
    'points-cost.css',
    'articles/article-shared.css',
    'articles/article-modern.css',
    'articles/article-discovery.css',
    'articles/game-guide-article.css',
    'articles/intl-article.css',
    'articles/intl-shell-v1.css',
    'articles/japanese-shell.css',
    'articles/reading-theme.css',
    'blog/style.css',
    'blog/common-components.css',
    'blog/index-compact.css',
    'games/games.css'
  ]) {
    assert.ok(cssTargets.includes(file), `CSS圧縮対象が不足しています: ${file}`);
  }
  for (const file of cssTargets) {
    assert.ok(fs.existsSync(path.join(root, file)), `存在しないCSSを圧縮対象にしています: ${file}`);
  }

  assert.ok(!minifierSource.includes('function minifyJS('), '実行しないJS minifierが残っています');
  for (const operation of [
    'syncDynamicArticleStylesheetVersion',
    'syncSharedRuntimeAssetVersions',
    'syncRootServiceWorker',
    'syncPublicAssetVersions'
  ]) {
    assert.ok(minifierSource.includes(operation), `asset version同期処理が不足しています: ${operation}`);
  }
});

// P06/P13: preflight-execution-contractが実行順序・対象集合・構文エラー伝播を主担当として検証する。

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

// P08: syntax-verifier-executionで実CLIに運用JSの構文エラーと必須ファイル欠損を与える。

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

// P06/P13: preflight-execution-contractが実行順序・対象集合・構文エラー伝播を主担当として検証する。

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
  assert.match(html, /Japan, the United States, South Korea, Taiwan, Hong Kong, and India/);
  assert.match(html, /level thresholds, base earn rates, currency units, and available top levels can differ by country/i);
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
  const top = read('index.html');
  const info = read('info.html');
  assert.equal(placeholder, '例：250');
  assert.equal(configs.JP.neededPointsPlaceholderOverrides['ゴールド:プラチナ'], '例：1728');
  assert.match(top, new RegExp(`placeholder="${placeholder}"`));
  assert.match(top, /たびたび出てくる「1,728」って何ですか？/);
  assert.match(top, /info\.html#about-section/);
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

// P21: CSS記法ではなく必須browser-smokeの計算詳細実表示（項目・値・改行・はみ出し）で検証する。

test('計算結果リンクのhover規則を閉じ、後続のツールチップ非表示を巻き込まない', () => {
  const css = read('style.css');
  assert.match(css, /\.result-guidance-links a:hover\s*\{[^{}]*text-decoration:\s*underline;\s*\}/s);
  assert.match(css, /\.result-purchase-check a:hover\s*\{[^{}]*text-decoration:\s*underline;\s*\}/s);
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
  assert.ok(directives['frame-src']?.includes('https://*.adtrafficquality.google'), '広告品質確認フレームの接続先がありません');
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

test('計算と検証の説明責任はトップを占有せず運営・検証方針へ集約する', () => {
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /class="calculation-method-note"/, `${file}: top still contains verification prose`);
  }

  assert.match(read('author/katakata.html'), /計算機の扱い[\s\S]*入力値そのものを外部へ送信しません/);
  assert.match(read('en/author/katakata.html'), /How the calculator handles inputs[\s\S]*raw input values are not sent externally/);
  assert.match(read('ko/author/katakata.html'), /계산기 입력값 처리 방식[\s\S]*입력값 자체를 외부로 전송하지 않습니다/);
  assert.match(read('tw/author/katakata.html'), /計算器如何處理輸入值[\s\S]*原始輸入值傳送到外部/);
});

test('ブログ広告はスクロール量に依存せず共通ローダーから初期化する', () => {
  const articleSource = read('blog/article.js');
  const components = read('blog/components.js');

  assert.doesNotMatch(articleSource, /window\.scrollY\s*<\s*600/);
  assert.doesNotMatch(components, /window\.scrollY\s*<\s*600/);
  assert.match(components, /loadBlogAdsense\(\);/);
});
