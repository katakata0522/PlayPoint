'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Google Play特別獲得率をランク通常率へ掛けない', () => {
  const calculator = read('js/calculator.js');
  assert.match(calculator, /const promotionRate = multiplier/);
  assert.match(calculator, /Math\.max\(directRate, promotionRate\)/);
  assert.doesNotMatch(calculator, /statusRate \* multiplier/);
});

test('Consent Modeは広告用途をPurpose 1だけで一括許可しない', () => {
  const consent = read('js/consent.js');
  assert.match(consent, /consents\[3\]/);
  assert.match(consent, /consents\[4\]/);
  assert.match(consent, /ad_user_data: personalizedAdsAllowed/);
  assert.match(consent, /ad_personalization: personalizedAdsAllowed/);
});

test('ゲーム生成物は確認範囲と出典を明示し保留記事を推薦しない', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  assert.match(generator, /game-source-section/);
  assert.ok(generator.includes('game prices/pity are reference values'));
  assert.ok(!generator.includes('tgs-google-play-vip.html'));
  assert.ok(!generator.includes('diamond-valley-festival-guide.html'));
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

test('法務ページの更新日は2026-08-18へ統一', () => {
  for (const file of ['privacy.html', 'terms.html']) {
    const html = read(file);
    assert.match(html, /last-modified" content="2026-08-18/);
    assert.match(html, /dateModified": "2026-08-18/);
    assert.match(html, /最終改定日：<\/strong>2026-08-18/);
  }
});

test('CSPはHTML属性のinline scriptを禁止する', () => {
  const htaccess = read('.htaccess');
  assert.match(htaccess, /script-src-attr 'none'/);
  assert.match(htaccess, /script-src 'self' 'unsafe-inline' https:\/\/\*\.googlesyndication\.com/);
});

test('ブラウザCIはゲームと記事の収益経路を検査する', () => {
  const workflow = read('.github/workflows/browser-smoke.yml');
  assert.match(workflow, /browser-revenue-smoke\.cjs/);
  const smoke = read('.github/scripts/browser-revenue-smoke.cjs');
  assert.match(smoke, /games\/genshin/);
  assert.match(smoke, /article-ad-container/);
});

test('ゲームサイトマップは各ページのlast-modifiedを優先する', () => {
  const sitemap = read('scripts/sitemap-sync.cjs');
  assert.match(sitemap, /CONTENT_DATE_OVERRIDES\[relativePath\]/);
  assert.match(sitemap, /htmlDateFor/);
  assert.match(read('scripts/generate-game-simulators.cjs'), /last-modified/);
});


test('韓国語・繁体字ゲーム計算機も特別獲得率として表示する', () => {
  const generator = read('scripts/generate-game-simulators.cjs');
  assert.match(generator, /프로모션 특별 적립률/);
  assert.match(generator, /活動特別獲點率/);
  assert.ok(!generator.includes("multiplierLabel: '포인트 배율:'"));
  assert.ok(!generator.includes("multiplierLabel: '點數加碼倍率：'"));
});

test('国際LPはundefinedフッターやランク率×倍率の説明を生成しない', () => {
  const content = read('scripts/intl-seo-content.cjs');
  assert.match(content, /trademarkNotice/);
  assert.ok(!content.includes('Preset: 3x multiplier'));
  assert.ok(!content.includes('초기 조건: 3배 배율'));
  assert.ok(!content.includes('預設: 3 倍倍率'));
  for (const file of ['en/campaign/3x/index.html', 'ko/campaign/3x/index.html', 'tw/campaign/3x/index.html']) {
    const html = read(file);
    assert.ok(!html.includes('>undefined<'), file);
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
