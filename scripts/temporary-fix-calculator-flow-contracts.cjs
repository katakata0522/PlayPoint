'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, text) => fs.writeFileSync(path.join(root, file), text, 'utf8');

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`missing target: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`non-unique target: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function patchIndex() {
  let html = read('index.html');
  html = replaceOnce(
    html,
    '<button type="button" id="calculator-last-value-reuse" class="calculator-last-value__reuse">前回の条件を使う</button>',
    '<button type="button" id="calculator-last-value-reuse" class="calculator-last-value__reuse" data-lang-key="lastCalculationReuse">前回の条件を使う</button>',
    'localized previous-value reuse button'
  );
  write('index.html', html);
}

function patchConfig() {
  let source = read('js/config.js');
  const changes = [
    ['tabMain: "あといくら必要？", tabReverse: "この課金で何pt？", tabDiary: "週次を記録",', 'tabMain: "あといくら必要？", tabReverse: "この課金で何pt？", tabDiary: "週次を記録", lastCalculationReuse: "前回の条件を使う",', 'JP previous reuse copy'],
    ['tabMain: "How much left?", tabReverse: "Points from spend", tabDiary: "Log weekly",', 'tabMain: "How much left?", tabReverse: "Points from spend", tabDiary: "Log weekly", lastCalculationReuse: "Use last values",', 'US previous reuse copy'],
    ['tabMain: "얼마나 더 필요?", tabReverse: "이 결제로 몇 pt?", tabDiary: "주간 기록",', 'tabMain: "얼마나 더 필요?", tabReverse: "이 결제로 몇 pt?", tabDiary: "주간 기록", lastCalculationReuse: "지난번 조건 사용",', 'KR previous reuse copy'],
    ['tabMain: "還差多少？", tabReverse: "這筆消費有幾點？", tabDiary: "每週記錄",', 'tabMain: "還差多少？", tabReverse: "這筆消費有幾點？", tabDiary: "每週記錄", lastCalculationReuse: "使用上次條件",', 'TW previous reuse copy']
  ];
  for (const [from, to, label] of changes) source = replaceOnce(source, from, to, label);
  write('js/config.js', source);
}

function patchLocaleConfig() {
  let source = read('scripts/locale-config.cjs');
  const changes = [
    ["            tabDiary: 'Log weekly',\n            firstStepTitle:", "            tabDiary: 'Log weekly',\n            lastCalculationReuse: 'Use last values',\n            firstStepTitle:", 'EN static previous reuse copy'],
    ["            tabDiary: '주간 기록',\n            sectionTitleStatus:", "            tabDiary: '주간 기록',\n            lastCalculationReuse: '지난번 조건 사용',\n            sectionTitleStatus:", 'KO static previous reuse copy'],
    ["            tabDiary: '每週記錄',\n            sectionTitleStatus:", "            tabDiary: '每週記錄',\n            lastCalculationReuse: '使用上次條件',\n            sectionTitleStatus:", 'TW static previous reuse copy']
  ];
  for (const [from, to, label] of changes) source = replaceOnce(source, from, to, label);
  write('scripts/locale-config.cjs', source);
}

function patchRuntimeOverrides() {
  let source = read('js/intl-copy-overrides.js');
  source = replaceOnce(source,
    "    CONFIGS.US.uiText.tabDiary = 'Weekly Rewards Diary';",
    "    CONFIGS.US.uiText.tabDiary = 'Log weekly';",
    'US runtime diary tab');
  source = replaceOnce(source,
    "    CONFIGS.TW.uiText.tabReverse = '反推模式';",
    "    CONFIGS.TW.uiText.tabReverse = '這筆消費有幾點？';",
    'TW runtime reverse tab');
  write('js/intl-copy-overrides.js', source);
}

function patchStaticLayout() {
  let source = read('scripts/static-calculator-layout.cjs');
  source = replaceOnce(source,
    `const ADVANCED_SETTINGS_CRITICAL_STYLE = \`<style id="\${ADVANCED_SETTINGS_STYLE_ID}">\n.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}`,
    `const ADVANCED_SETTINGS_CRITICAL_STYLE = \`<style id="\${ADVANCED_SETTINGS_STYLE_ID}">\n#mainMode>.section:first-child{display:flex;flex-direction:column}\n#mainMode>.section:first-child>#calculateButton{order:2;margin-top:1em}\n.calculator-last-value{display:flex;align-items:center;gap:.45em;flex-wrap:wrap;margin:.55em 0 0;font-size:.88em;line-height:1.5;color:var(--muted-text-color,#5f6368)}\n.calculator-last-value[hidden]{display:none!important}\n.calculator-last-value__reuse{appearance:none;border:0;background:transparent;color:var(--link-color,#0b57d0);padding:.1em .15em;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;box-shadow:none}\n.calculator-last-value__reuse:hover{background:transparent;box-shadow:none;transform:none}\n.calculator-last-value__reuse:focus-visible{outline:3px solid var(--input-focus-border-color,#005fcc);outline-offset:2px}\n.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}`,
    'critical calculator flow styles');
  source = replaceOnce(source,
    `@media(max-width:640px){\n.calculator-advanced-settings{display:block;margin-top:.85em}`,
    `@media(max-width:640px){\n#mainMode>.section:first-child>#calculateButton{order:1}\n#mainMode>.section:first-child>#calculator-advanced-settings{order:2}\n.calculator-advanced-settings{display:block;margin-top:.85em}`,
    'mobile CTA order styles');

  const insertionPoint = `function validateStaticLayout(content) {`;
  const helper = `function ensurePrimaryActionSourceOrder(content) {\n  const advancedToken = \`<div id="\${ADVANCED_SETTINGS_ID}"\`;\n  let advancedIndex = content.indexOf(advancedToken);\n  const buttonPattern = /<button\\b[^>]*\\bid=["']calculateButton["'][^>]*>/i;\n  const buttonMatch = buttonPattern.exec(content);\n  if (!buttonMatch || advancedIndex < 0 || buttonMatch.index < advancedIndex) return content;\n\n  const buttonRange = findBalancedElementRange(content, buttonMatch.index, 'button');\n  if (!buttonRange) throw new Error('計算ボタンの範囲を取得できません。');\n  const button = content.slice(buttonRange.start, buttonRange.end);\n  content = content.slice(0, buttonRange.start) + content.slice(buttonRange.end);\n  advancedIndex = content.indexOf(advancedToken);\n  if (advancedIndex < 0) throw new Error('詳細設定の挿入位置を再取得できません。');\n  return content.slice(0, advancedIndex) + button + '\\n            ' + content.slice(advancedIndex);\n}\n\n`;
  source = replaceOnce(source, insertionPoint, helper + insertionPoint, 'primary action source-order helper');
  source = replaceOnce(source,
    `  content = ensureStaticAdvancedSettings(content);\n  content = content.replace(/[ \\t]+(?=\\r?$)/gm, '');`,
    `  content = ensureStaticAdvancedSettings(content);\n  content = ensurePrimaryActionSourceOrder(content);\n  content = content.replace(/[ \\t]+(?=\\r?$)/gm, '');`,
    'apply primary action source order');
  write('scripts/static-calculator-layout.cjs', source);
}

function patchLocalizationTests() {
  let source = read('tests/localization-quality-audit.test.cjs');
  source = replaceOnce(source,
    "  assert.equal(locales.en.staticText.tabDiary, 'Weekly Rewards Diary');",
    "  assert.equal(locales.en.staticText.tabDiary, 'Log weekly');",
    'EN task tab expectation');
  source = replaceOnce(source,
    "  assert.equal(locales.tw.staticText.tabReverse, '反推模式');",
    "  assert.equal(locales.tw.staticText.tabReverse, '這筆消費有幾點？');",
    'TW task tab expectation');
  source = replaceOnce(source,
    "  assert.ok(!read('tw/index.html').includes('逆算模式'));",
    "  assert.ok(!read('tw/index.html').includes('逆算模式'));\n  assert.equal(locales.en.staticText.lastCalculationReuse, 'Use last values');\n  assert.equal(locales.ko.staticText.lastCalculationReuse, '지난번 조건 사용');\n  assert.equal(locales.tw.staticText.lastCalculationReuse, '使用上次條件');",
    'localized previous reuse expectations');
  write('tests/localization-quality-audit.test.cjs', source);

  source = read('tests/intl-localization-semantics.test.cjs');
  source = replaceOnce(source,
    "  assert.match(tw, /反推模式/);",
    "  assert.match(tw, /這筆消費有幾點？/);",
    'TW static task tab semantic');
  source = replaceOnce(source,
    "  assert.match(runtime, /反推模式/);",
    "  assert.match(runtime, /這筆消費有幾點？/);\n  assert.match(runtime, /Log weekly/);",
    'runtime task tab semantic');
  write('tests/intl-localization-semantics.test.cjs', source);
}

function patchStaticDeliveryTest() {
  let source = read('tests/static-calculator-delivery.test.cjs');
  const before = `test('6地域トップはPR #326前の通常レイアウトを維持する', () => {\n  const css = read('style.css');\n  assert.ok(!css.includes('HOME_CALCULATOR_FIRST'), 'Calculator-First専用CSSが残っている');\n\n  for (const indexPath of indexPaths) {\n    const html = read(indexPath);\n    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));\n    assert.ok(!html.includes('home-calculator-first'), \`\${indexPath}: Calculator-Firstクラスが残っている\`);\n    assert.ok(!html.includes('home-help-link'), \`\${indexPath}: Calculator-First専用リンクが残っている\`);\n    assert.ok(\n      mainMode.indexOf('id="calculator-advanced-settings"') < mainMode.indexOf('id="calculateButton"'),\n      \`\${indexPath}: 詳細設定と計算ボタンの旧配置が崩れている\`\n    );\n  }\n});`;
  const after = `test('6地域トップは通常デザインを保ちつつ主要CTAをモバイル優先のDOM順にする', () => {\n  const css = read('style.css');\n  assert.ok(!css.includes('HOME_CALCULATOR_FIRST'), 'Calculator-First専用CSSが残っている');\n\n  for (const indexPath of indexPaths) {\n    const html = read(indexPath);\n    const mainMode = html.slice(html.indexOf('<div id="mainMode"'), html.indexOf('<div id="reverseMode"'));\n    assert.ok(!html.includes('home-calculator-first'), \`\${indexPath}: Calculator-Firstクラスが残っている\`);\n    assert.ok(!html.includes('home-help-link'), \`\${indexPath}: Calculator-First専用リンクが残っている\`);\n    assert.ok(\n      mainMode.indexOf('id="calculateButton"') < mainMode.indexOf('id="calculator-advanced-settings"'),\n      \`\${indexPath}: 主要CTAが任意設定より後ろに戻っている\`\n    );\n    assert.match(html, /#mainMode>\\.section:first-child>#calculateButton\\{order:2;margin-top:1em\\}/, \`\${indexPath}: desktop CTA order\`);\n    assert.match(html, /@media\\(max-width:640px\\)\\{[\\s\\S]*#mainMode>\\.section:first-child>#calculateButton\\{order:1\\}/, \`\${indexPath}: mobile CTA order\`);\n    assert.match(html, /#mainMode>\\.section:first-child>#calculator-advanced-settings\\{order:2\\}/, \`\${indexPath}: mobile advanced-settings order\`);\n  }\n});`;
  source = replaceOnce(source, before, after, 'static delivery layout contract');
  write('tests/static-calculator-delivery.test.cjs', source);
}

patchIndex();
patchConfig();
patchLocaleConfig();
patchRuntimeOverrides();
patchStaticLayout();
patchLocalizationTests();
patchStaticDeliveryTest();
console.log('Patched calculator flow SSOT, localization, legacy conversion, and strict contracts.');
