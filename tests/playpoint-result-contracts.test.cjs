const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  root,
  createSelect,
  createInput,
  loadCalculatorContext,
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

  assert.ok(content.includes('次に確認すること'));
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
  assert.ok(content.includes('result-guidance-links'), '統合導線のコンテナがありません');
  assert.ok(content.includes('次に確認すること'), '判断導線の見出しがありません');
  assert.ok(content.includes('campaign/3x/'), '高額時の3倍キャンペーン導線がありません');
  assert.ok([...content.matchAll(/<a href="([^"]+)"/g)].length <= 3, '統合導線は3件以内にしてください');
});

test('主要結果、共有、折りたたみ詳細の順で4言語ページに配置する', () => {
  for (const relativePath of ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html']) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const resultPosition = html.indexOf('id="result"');
    const actionsPosition = html.indexOf('id="result-actions"');
    const detailsPosition = html.indexOf('id="result-details"');
    assert.ok(resultPosition >= 0 && actionsPosition > resultPosition && detailsPosition > actionsPosition, relativePath);
  }
});

test('折りたたみ詳細の見出しを4言語で用意する', () => {
  const configSource = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  for (const label of ['計算の詳細を見る', 'View calculation details', '계산 상세 보기', '查看計算詳情']) {
    assert.ok(configSource.includes(label), `折りたたみ見出しがありません: ${label}`);
  }
});

test('計算結果の直後に買う前のギフト確認リンクを出す', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, reverseCalculate, renderedResults } = loadCalculatorContext();
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

  assert.ok(renderedResults[0].content.includes('result-purchase-check'));
  assert.ok(renderedResults[0].content.includes('articles/2026-06-20-discount-gift-cards.html'));
  assert.ok(renderedResults[0].content.includes('買う前にギフトコードの還元条件を見る'));

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
