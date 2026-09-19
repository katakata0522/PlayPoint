const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  root,
  createSelect,
  createInput,
  loadCalculatorContext,
  loadConfigs,
  test,
} = require('./helpers/playpoint-calculator-test-context.cjs');

test('通常計算の補足導線は1グループに統合し最大3件だけ表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('3000');
  PP_STATE.dom.multiplier = createInput('3');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 1;
  calculate();

  const content = renderedResultDetails[0];
  const guidanceBlock = content.match(/<div class="result-guidance-links">[\s\S]*?<\/div>/)?.[0] || '';
  const links = [...guidanceBlock.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);

  assert.ok(content.includes('計算したあとのおすすめ'));
  assert.ok(content.includes('結果に合わせて、次の一手をチェックしましょう。'));
  assert.ok(content.includes('result-guidance-links'));
  assert.ok(!content.includes('result-related-links'));
  assert.ok(!content.includes('result-decision-links'));
  assert.ok(links.length > 0 && links.length <= 3);
  assert.ok(links.includes('articles/2025-12-25-campaign.html'));
  links.forEach((href) => {
    assert.ok(fs.existsSync(path.join(root, href)), `関連記事リンクが存在しません: ${href}`);
  });
});

test('計算結果の統合導線は検索意図別LPを優先する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('1000');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 0;
  calculate();

  const content = renderedResultDetails[0];
  const links = [...content.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);

  assert.ok(links.includes('maintenance/platinum/'), 'プラチナ維持LPへの導線がありません');
});

test('専用ランク導線の表示名は昇格・維持の文脈を残す', () => {
  const { PP_STATE, getRelatedArticles } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';

  const upgrade = getRelatedArticles('プラチナ', 1, 'upgrade')[0];
  const maintain = getRelatedArticles('プラチナ', 1, 'maintain')[0];

  assert.equal(upgrade.href, 'status/platinum/');
  assert.match(upgrade.title, /プラチナ.*昇格/);
  assert.equal(maintain.href, 'maintenance/platinum/');
  assert.match(maintain.title, /プラチナ.*維持/);
});

test('通常時の判断導線は未発生トラブルや購入前チェックを混ぜない', () => {
  const { PP_STATE, getDecisionLinks } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';

  const normal = getDecisionLinks(10000, 'シルバー', 1, 100);
  assert.deepStrictEqual(normal, []);

  const highSpend = getDecisionLinks(60000, 'プラチナ', 1, 100);
  assert.ok(highSpend.some(link => link.href === 'campaign/3x/'));
  assert.ok(highSpend.every(link => link.href !== 'articles/2026-03-10-play-points-reflection-timing.html'));
  assert.ok(highSpend.every(link => link.href !== 'articles/2026-06-20-discount-gift-cards.html'));

  const nearYearEnd = getDecisionLinks(10000, 'シルバー', 1, 30);
  assert.ok(nearYearEnd.some(link => link.href === 'articles/2026-03-10-play-points-reflection-timing.html'));
});

test('計算結果の統合導線には金額や条件に応じた次の判断が含まれる', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('3000');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 1;
  calculate();

  const content = renderedResultDetails[0];
  const guidanceBlock = content.match(/<div class="result-guidance-links">[\s\S]*?<\/div>/)?.[0] || '';
  assert.ok(content.includes('result-guidance-links'), '統合導線のコンテナがありません');
  assert.ok(content.includes('計算したあとのおすすめ'), '判断導線の見出しがありません');
  assert.ok(content.includes('campaign/3x/'), '高額時の3倍キャンペーン導線がありません');
  assert.ok([...guidanceBlock.matchAll(/<a href="([^"]+)"/g)].length <= 3, '統合導線は3件以内にしてください');
});


test('主要結果、共有、折りたたみ詳細の順を公開6地域で維持する', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html', 'hk/index.html', 'in/index.html']) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const resultPosition = html.indexOf('id="result"');
    const actionsPosition = html.indexOf('id="result-actions"');
    const detailsPosition = html.indexOf('id="result-details"');
    assert.ok(resultPosition >= 0 && actionsPosition > resultPosition && detailsPosition > actionsPosition, relativePath);
  }
});


test('折りたたみ詳細の見出しを公開6地域の設定へ用意する', () => {
  const configs = loadConfigs(true);
  for (const region of ['JP', 'US', 'KR', 'TW', 'HK', 'IN']) {
    const label = configs[region]?.uiText?.resultDetailsSummary;
    assert.equal(typeof label, 'string', `${region}: resultDetailsSummary must be a string`);
    assert.ok(label.trim(), `${region}: resultDetailsSummary must not be empty`);
    assert.doesNotMatch(label, /undefined|null|\{[^}]+\}/i, `${region}: resultDetailsSummary contains an unresolved value`);
  }
});

test('計算結果の直後に買う前のギフト確認リンクを出す', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, reverseCalculate, renderedResults, renderedResultDetails } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('300');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };
  PP_STATE.dom.amountYen = createInput('10000');
  PP_STATE.dom.reverseBaseRate = createInput('1');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.5';
  updateBaseRateAndTarget();
  calculate();

  assert.ok(renderedResultDetails[0].includes('result-purchase-check'));
  assert.ok(renderedResultDetails[0].includes('articles/2026-06-20-discount-gift-cards.html'));
  assert.ok(renderedResultDetails[0].includes('買う前にギフトコードの還元条件を見る'));
  assert.equal(
    [...renderedResultDetails[0].matchAll(/articles\/2026-06-20-discount-gift-cards\.html/g)].length,
    1,
    '購入前チェックは同じ結果内で1回だけ表示する'
  );

  reverseCalculate();
  assert.ok(renderedResults[1].content.includes('result-purchase-check'));
  assert.ok(renderedResults[1].content.includes('articles/2026-06-20-discount-gift-cards.html'));
});

test('海外版の計算結果導線は各言語の実在ページだけを使う', () => {
  const { PP_STATE, getRelatedArticles, getDecisionLinks } = loadCalculatorContext();

  for (const [region, dir] of [['US', 'en'], ['KR', 'ko'], ['TW', 'tw']]) {
    PP_STATE.currentRegion = region;
    const links = [
      ...getRelatedArticles(region === 'TW' ? '鑽石級' : (region === 'KR' ? '다이아몬드' : 'Diamond'), 3),
      ...getDecisionLinks(60000, region === 'TW' ? '鑽石級' : (region === 'KR' ? '다이아몬드' : 'Diamond'), 1, 100)
    ];

    assert.ok(links.length > 0, `${region} の結果導線がありません`);
    links.forEach(({ href, title }) => {
      if (region === 'US') {
        assert.ok(!/[ぁ-んァ-ヶ一-龠]/.test(title), `${region} の結果導線に日本語タイトルが残っています: ${title}`);
      }
      assert.ok(fs.existsSync(path.join(root, dir, href)), `${region} の結果導線が存在しません: ${href}`);
    });
  }
});

test('計算結果のエラー表示とクリアは前回の共有用データを破棄する', () => {
  let source = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8')
    .replace(/^import .*;\s*$/m, '')
    .replace('export const UI =', 'const UI =');
  const windowMock = { __TEST_ENV__: true };
  const classNames = new Set();
  const target = {
    appendChild(child) { this.children.push(child); },
    children: [],
    classList: {
      add(name) { classNames.add(name); },
      remove(name) { classNames.delete(name); }
    },
    dataset: { earnedPoints: '50', requiredYen: '1000' },
    innerHTML: '<strong>old</strong>',
    querySelectorAll() { return []; }
  };
  const context = {
    CONFIGS: { JP: { lang: 'ja' } },
    CONSTANTS: { CLASS_HAS_RESULT: 'has-result', CLASS_HIDDEN: 'hidden' },
    STATE: { currentRegion: 'JP', dom: {} },
    clearTimeout,
    console,
    document: {
      createElement() {
        return { className: '', textContent: '' };
      }
    },
    getNextFridayCalendarWindow() { return { start: '', end: '' }; },
    setTimeout,
    window: windowMock
  };

  vm.runInNewContext(source, context);
  const UI = windowMock.PP_APP.UI;
  UI.displayResult(target, '入力内容を確認してください', true);
  assert.deepStrictEqual(Object.keys(target.dataset), []);
  assert.strictEqual(target.children[0].textContent, '入力内容を確認してください');

  target.dataset.earnedPoints = '80';
  UI.clearResult(target);
  assert.deepStrictEqual(Object.keys(target.dataset), []);
  assert.ok(!classNames.has('has-result'));
});


test('ランク導線は翻訳文字列の正規表現ではなくSSOTのランクIDで解決する', () => {
  const { PP_STATE, getTargetRankKey } = loadCalculatorContext();

  for (const [region, label, expected] of [
    ['JP', 'ダイヤモンド', 'diamond'],
    ['US', 'Diamond', 'diamond'],
    ['KR', '다이아몬드', 'diamond'],
    ['TW', '鑽石級', 'diamond']
  ]) {
    PP_STATE.currentRegion = region;
    assert.equal(getTargetRankKey(label), expected, region);
  }

  PP_STATE.currentRegion = 'JP';
  assert.equal(getTargetRankKey('表示文言が変わっても', 'diamond'), 'diamond');
});

test('目標ランク別の導線は選択したランクの専用ページを最優先する', () => {
  const { PP_STATE, getRelatedArticles } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';

  const expected = {
    'シルバー': 'status/silver/',
    'ゴールド': 'status/gold/',
    'プラチナ': 'status/platinum/',
    'ダイヤモンド': 'status/diamond/'
  };
  for (const [label, href] of Object.entries(expected)) {
    assert.equal(getRelatedArticles(label, 1)[0]?.href, href, label);
  }
});

test('残りポイントの一言はゴール直前だけ前向きに出す', () => {
  const { PP_STATE, getProgressCheer } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';

  assert.equal(getProgressCheer(500), '');
  assert.equal(getProgressCheer(499), 'もう一歩！');
  assert.equal(getProgressCheer(101), 'もう一歩！');
  assert.equal(getProgressCheer(100), 'ラストスパート🔥');
  assert.equal(getProgressCheer(1), 'ラストスパート🔥');
  assert.equal(getProgressCheer(0), '');
});
