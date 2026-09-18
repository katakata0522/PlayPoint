'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { CONTENT_DATE_OVERRIDES } = require('../scripts/content-dates.cjs');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('ゲーム生成物は確認範囲と出典を明示し保留記事を推薦しない', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  assert.match(generator, /game-source-section/);
  assert.ok(generator.includes('game prices/pity are reference values'));
  assert.ok(!generator.includes('tgs-google-play-vip.html'));
  assert.ok(!generator.includes('diamond-valley-festival-guide.html'));
});

test('ゲーム公開ページのナビariaと広告ラベルは言語別に出す', () => {
  for (const [file, nav, crumb, ad] of [
    ['en/games/genshin/index.html', 'Main navigation', 'Breadcrumb', 'Sponsored'],
    ['ko/games/genshin/index.html', '주 메뉴', '탐색 경로', '광고'],
    ['tw/games/genshin/index.html', '主要導覽', '導覽路徑', '廣告'],
    ['games/genshin/index.html', 'メインナビゲーション', 'パンくずリスト', 'スポンサーリンク']
  ]) {
    const html = read(file);
    assert.ok(html.includes(`aria-label="${nav}"`), `${file}: nav aria-label`);
    assert.ok(html.includes(`aria-label="${crumb}"`), `${file}: breadcrumb aria-label`);
    assert.ok(html.includes(`class="game-ad-label">${ad}<`), `${file}: ad label`);
  }
});

test('楽天還元率を固定の5〜15%以上と断定しない', () => {
  for (const file of [
    'scripts/insert-lp-monetization.cjs',
    'status/gold/index.html',
    'campaign/3x/index.html'
  ]) {
    assert.ok(!read(file).includes('実質5%〜15%以上'), file);
  }
});

test('法務ページの更新日はメタデータ・構造化データ・本文・内容日台帳で一致する', () => {
  for (const file of ['privacy.html', 'terms.html']) {
    const html = read(file);
    const metaDate = html.match(/last-modified" content="(\d{4}-\d{2}-\d{2})/)?.[1];
    const schemaDate = html.match(/dateModified":\s*"(\d{4}-\d{2}-\d{2})/)?.[1];
    const visibleDate = html.match(/最終改定日：<\/strong>(\d{4}-\d{2}-\d{2})/)?.[1];

    assert.ok(metaDate, `${file}: last-modified がありません`);
    assert.ok(schemaDate, `${file}: dateModified がありません`);
    assert.ok(visibleDate, `${file}: 本文の最終改定日がありません`);
    assert.equal(schemaDate, metaDate, `${file}: 構造化データの更新日が不一致です`);
    assert.equal(visibleDate, metaDate, `${file}: 本文の更新日が不一致です`);
    assert.equal(CONTENT_DATE_OVERRIDES[file], metaDate, `${file}: 内容日台帳とHTMLが不一致です`);
    assert.match(metaDate, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('CSPはHTML属性のinline scriptを禁止する', () => {
  const htaccess = read('.htaccess');
  assert.match(htaccess, /script-src-attr 'none'/);
  assert.match(htaccess, /script-src 'self' 'unsafe-inline' https:\/\/\*\.googlesyndication\.com/);
});

test('必須ブラウザCIはゲームと記事の収益経路を検査する', () => {
  const qualityWorkflow = read('.github/workflows/quality-check.yml');
  const deployWorkflow = read('.github/workflows/deploy.yml');
  assert.match(qualityWorkflow, /browser-revenue-smoke\.cjs/);
  assert.match(deployWorkflow, /browser-revenue-smoke\.cjs/);
  const smoke = read('.github/scripts/browser-revenue-smoke.cjs');
  assert.match(smoke, /games\/genshin/);
  assert.match(smoke, /article-ad-container/);
});

test('国際3x LPはundefinedを出さず最終特別獲得率として説明する', () => {
  const cases = [
    ['en/campaign/3x/index.html', /special earn rate of 3 points per \$1/i, /does not multiply|rather than multiplying/i],
    ['ko/campaign/3x/index.html', /1,000원당 3pt.*특별 적립률/, /기본 적립률에 3을 곱하지/],
    ['tw/campaign/3x/index.html', /每 NT\$30 3 點.*特別獲點率/, /不會把.*基本獲點率乘以 3/]
  ];
  for (const [file, ratePattern, noMultiplyPattern] of cases) {
    const html = read(file);
    assert.ok(!html.includes('>undefined<'), file);
    assert.match(html, ratePattern, file);
    assert.match(html, noMultiplyPattern, file);
  }
});

test('Q&Aのキャンペーン説明は重複せず公式画面を優先する', () => {
  const html = read('info.html');
  assert.ok(!html.includes('表示される場合はGoogle Playのオファー画面'));
  assert.ok(html.includes('通常獲得率へキャンペーン数字を掛ける計算ではありません'));
  assert.ok(html.includes('キャンペーンの併用可否や対象判定を保証するものではありません'));
});

test('2pt/100円LPはランク通常率へ2を掛けた旧金額を残さない', () => {
  const html = read('campaign/2x/index.html');
  assert.ok(html.includes('<td>37,500円</td>'));
  assert.ok(html.includes('<td>150,000円</td>'));
  assert.ok(html.includes('<td>200,000円</td>'));
  assert.ok(html.includes('<td>550,000円</td>'));
  assert.ok(!html.includes('<td>約314,286円</td>'));
});

test('LPアフィリエイト文言は固定還元や二重取りを断定しない', () => {
  const source = read('scripts/insert-lp-monetization.cjs');
  assert.ok(!source.includes('ポイント二重取り'));
  assert.ok(!source.includes('場合</strong>されます'));
  assert.ok(source.includes('ポイント還元の対象になる場合があります'));
});

test('レビューで見つかった表示破損と旧倍率コピーを残さない', () => {
  const config = read('js/config.js');
  const simplified = read('js/main-calculator-ui.js');
  assert.ok(!config.includes('pt/labelMultiplier'));
  assert.ok(!config.includes('pt/labelMultiplierReverse'));
  assert.ok(!simplified.includes('Campaign multiplier (normally 1×)'));
  assert.ok(simplified.includes('Promotion special earn rate (e.g. 3 pt / $1)'));
});

test('LP収益セクションはcanonical buildで冪等に同期される', () => {
  const source = read('scripts/insert-lp-monetization.cjs');
  const build = read('scripts/build-html.js');
  assert.ok(source.includes('課金前にやっておくべき実質割引テクニック'));
  assert.ok(source.includes('課金前に確認したいギフトコード購入条件'));
  assert.ok(source.includes('normalizeLpContent'));
  assert.ok(build.includes('applyLpMonetization(rootDir)'));
  for (const file of ['campaign/2x/index.html', 'campaign/3x/index.html']) {
    const html = read(file);
    assert.ok(!html.includes('ポイント還元の対象になる場合</strong>されます'));
    assert.ok(!html.includes('ポイント二重取り'));
    assert.equal((html.match(/課金前に確認したいギフトコード購入条件/g) || []).length, 1, file);
  }
});

test('国際2xページも最終特別獲得率として説明する', () => {
  const cases = [
    ['en/campaign/2x/index.html', /special earn rate of 2 points per \$1/i, /does not multiply|rather than multiplying/i, '/en/campaign/3x/'],
    ['ko/campaign/2x/index.html', /1,000원당 2pt.*특별 적립률/, /기본 적립률에 2를 곱하지/, '/ko/campaign/3x/'],
    ['tw/campaign/2x/index.html', /每 NT\$30 2 點.*特別獲點率/, /不會把.*基本獲點率乘以 2/, '/tw/campaign/3x/']
  ];
  for (const [file, ratePattern, noMultiplyPattern, nextHref] of cases) {
    const html = read(file);
    assert.match(html, ratePattern, file);
    assert.match(html, noMultiplyPattern, file);
    assert.ok(html.includes(`href="${nextHref}"`), `${file}: 3x comparison link`);
  }
});

test('記事共通導線は固定交換価値や旧キャンペーン倍率を断定しない', () => {
  const source = read('scripts/article-static-usability.cjs');
  assert.ok(source.includes('Play Pointsの交換先や必要ポイント数は時期・国・アカウントで変わります'));
  for (const name of fs.readdirSync(path.join(root, 'articles')).filter(name => name.endsWith('.html'))) {
    const html = read('articles/' + name);
    assert.ok(!html.includes('不足ポイントとキャンペーン倍率から'), name);
    assert.ok(!html.includes('1pt = 最大2円〜3円相当'), name);
  }
});
