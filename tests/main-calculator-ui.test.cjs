'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const indexPaths = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html'];

function loadCalculatorUi(document) {
  const source = read('js/main-calculator-ui.js')
    .replace(/^export\s+/gm, '')
    .concat('\n;globalThis.__testExports = { simplifyMainCalculatorLayout, updateSimplifiedCalculatorCopy };');
  const context = { document };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'main-calculator-ui.js' });
  return context.__testExports;
}

function createNode(name, classes = []) {
  return {
    name,
    children: [],
    parentNode: null,
    dataset: {},
    textContent: '',
    classList: { contains: value => classes.includes(value) },
    queryMap: new Map(),
    querySelector(selector) {
      return this.queryMap.get(selector) || null;
    },
    append(...nodes) {
      for (const node of nodes) this.appendChild(node);
    },
    appendChild(node) {
      if (node.parentNode) {
        const oldIndex = node.parentNode.children.indexOf(node);
        if (oldIndex >= 0) node.parentNode.children.splice(oldIndex, 1);
      }
      node.parentNode = this;
      this.children.push(node);
      return node;
    },
    remove() {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
      this.parentNode = null;
    },
    removeAttribute() {}
  };
}

function createFixture() {
  const mainMode = createNode('mainMode');
  const statusSection = createNode('statusSection', ['section']);
  const rateSection = createNode('rateSection', ['section']);
  const packSettings = createNode('packSettings');
  const baseRateLabel = createNode('baseRateLabel');
  const baseRateText = createNode('baseRateText');
  const baseRate = createNode('baseRate');
  const multiplierLabel = createNode('multiplierLabel');
  const multiplierText = createNode('multiplierText');
  const multiplier = createNode('multiplier');
  const warning = createNode('warning');

  baseRateLabel.queryMap.set('[data-lang-key="labelBaseRate"]', baseRateText);
  multiplierLabel.queryMap.set('[data-lang-key="labelMultiplier"]', multiplierText);
  statusSection.queryMap.set('.option-settings', packSettings);
  rateSection.queryMap.set('.warning', warning);
  mainMode.queryMap.set('label[for="baseRate"]', baseRateLabel);
  mainMode.queryMap.set('label[for="multiplier"]', multiplierLabel);

  statusSection.appendChild(packSettings);
  rateSection.append(baseRateLabel, baseRate, multiplierLabel, multiplier, warning);
  mainMode.append(statusSection, rateSection);

  const byId = new Map([
    ['mainMode', mainMode],
    ['baseRate', baseRate],
    ['multiplier', multiplier]
  ]);
  const document = {
    getElementById: id => byId.get(id) || null,
    querySelector(selector) {
      if (selector === '[data-simplified-calculator-copy="baseRateLabel"]') return baseRateText;
      if (selector === '[data-simplified-calculator-copy="multiplierLabel"]') return multiplierText;
      return null;
    }
  };

  return {
    document,
    mainMode,
    statusSection,
    rateSection,
    packSettings,
    baseRateLabel,
    baseRateText,
    baseRate,
    multiplierLabel,
    multiplierText,
    multiplier,
    warning
  };
}

test('通常計算は必要な獲得率入力を主画面へ残し、旧パック設定を除去する', () => {
  const fixture = createFixture();
  const { simplifyMainCalculatorLayout } = loadCalculatorUi(fixture.document);

  simplifyMainCalculatorLayout('JP');

  assert.deepEqual(
    fixture.statusSection.children.map(node => node.name),
    ['baseRateLabel', 'baseRate', 'multiplierLabel', 'multiplier', 'warning']
  );
  assert.equal(fixture.packSettings.parentNode, null);
  assert.equal(fixture.rateSection.parentNode, null);
  assert.equal(fixture.mainMode.dataset.visibleBaseRateLayout, 'true');
  assert.equal(fixture.baseRateText.dataset.simplifiedCalculatorCopy, 'baseRateLabel');
  assert.equal(fixture.multiplierText.dataset.simplifiedCalculatorCopy, 'multiplierLabel');
});

test('通常計算の簡略化は冪等で、地域変更時は利用者向け文言だけ更新する', () => {
  const fixture = createFixture();
  const { simplifyMainCalculatorLayout } = loadCalculatorUi(fixture.document);

  simplifyMainCalculatorLayout('JP');
  const firstOrder = fixture.statusSection.children.slice();
  simplifyMainCalculatorLayout('US');

  assert.deepEqual(fixture.statusSection.children, firstOrder);
  assert.equal(fixture.baseRateText.textContent, 'Base earn rate per $1 (auto-filled, editable)');
  assert.equal(fixture.multiplierText.textContent, 'Promotion special earn rate (e.g. 3 pt / $1)');
});

test('公開6地域へ通常獲得率とキャンペーン特別獲得率の文言を出し分ける', () => {
  const expected = {
    JP: ['通常獲得率（自動入力・編集可）', 'キャンペーン特別獲得率（例：3pt/100円）'],
    US: ['Base earn rate per $1 (auto-filled, editable)', 'Promotion special earn rate (e.g. 3 pt / $1)'],
    KR: ['기본 적립률 (자동 입력·수정 가능)', '캠페인 특별 적립률 (예: 1,000원당 3pt)'],
    TW: ['基本獲點率（自動帶入，可修改）', '活動特別獲點率（例：每 NT$30 3 點）'],
    HK: ['每 HK$7 獲得點數（自動帶入，可修改）', '活動特別獲點率（例：每 HK$7 3 點）'],
    IN: ['Points per ₹5 (auto-filled, editable)', 'Promotion special earn rate (e.g. 3 pt / ₹5)']
  };

  for (const [region, copy] of Object.entries(expected)) {
    const fixture = createFixture();
    const { simplifyMainCalculatorLayout } = loadCalculatorUi(fixture.document);
    simplifyMainCalculatorLayout(region);
    assert.equal(fixture.baseRateText.textContent, copy[0], `${region}: base rate copy`);
    assert.equal(fixture.multiplierText.textContent, copy[1], `${region}: special rate copy`);
  }
});

test('公開トップは主要入力IDを初期HTMLから維持する', () => {
  for (const indexPath of indexPaths) {
    const html = read(indexPath);
    for (const id of ['currentStatus', 'targetStatus', 'neededPoints', 'multiplier', 'baseRate']) {
      assert.match(html, new RegExp(`id=["']${id}["']`), `${indexPath}: missing ${id}`);
    }
    assert.match(html, /id=["']reverseMode["']/);
  }
});
