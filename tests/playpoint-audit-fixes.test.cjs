'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadConfigs() {
  const context = { console, __TEST_ENV__: true };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('js/config.js').replace(/^export\s+/gm, ''), context, { filename: 'config.js' });
  return JSON.parse(JSON.stringify(context.PP_APP.CONFIGS));
}

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

test('日本語の必要ポイント例はあとがきにつながる実例1728を保つ', () => {
  const configs = loadConfigs();
  const placeholder = configs.JP.uiText.neededPointsPlaceholder;
  const info = read('info.html');
  assert.equal(placeholder, '例：1728');
  assert.match(read('index.html'), new RegExp(`placeholder="${placeholder}"`));
  assert.match(info, /Q\. 例題の「1728」って何ですか？/);
  assert.match(info, /1728という数字は私がプラチナ到達までに必要なリアルな数字/);
});

test('結果カードの見出しだけをブロック化し、金額の内訳は分断しない', () => {
  const css = read('style.css');
  assert.match(css, /\.result-summary-grid\s*>\s*div\s*>\s*span\s*\{/);
  assert.doesNotMatch(css, /\.result-summary-grid\s+span\s*\{/);
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

test('初期操作に必要なアプリモジュールは依存解析前から取得を開始する', () => {
  const expectedModules = ['config.js', 'ui.js', 'diary.js', 'share.js', 'calculator.js'];
  for (const [file, prefix] of [['index.html', ''], ['en/index.html', '../'], ['ko/index.html', '../'], ['tw/index.html', '../']]) {
    const html = read(file);
    for (const moduleName of expectedModules) {
      assert.match(
        html,
        new RegExp(`<link rel="modulepreload" href="${prefix}js/${moduleName}">`),
        `${file}: ${moduleName}`
      );
    }
  }
});

test('日記本体とカレンダー登録を全言語で残す', () => {
  for (const file of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = read(file);
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

test('広告と計測は初期表示後に低優先度で読み込む', () => {
  const source = read('js/third-party.js');
  assert.match(source, /window\.addEventListener\('load', scheduleAfterLoad, \{ once: true \}\)/);
  assert.match(source, /ANALYTICS_DELAY_MS\s*=\s*1200/);
  assert.match(source, /ADSENSE_DELAY_MS\s*=\s*3000/);
  assert.match(source, /fetchpriority:\s*'low'/);
  assert.ok(source.indexOf('ensureConsentManager();') < source.indexOf('scheduleThirdPartyLoad();'));
});
