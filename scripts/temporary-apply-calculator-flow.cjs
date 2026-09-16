'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(content, search, replacement, label) {
  const first = content.indexOf(search);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (content.indexOf(search, first + search.length) >= 0) throw new Error(`Replacement target is not unique: ${label}`);
  return content.slice(0, first) + replacement + content.slice(first + search.length);
}

function patchIndex() {
  let html = read('index.html');

  html = replaceOnce(html,
    'data-lang-key="tabMain">通常計算</button>',
    'data-lang-key="tabMain">あといくら必要？</button>',
    'JP main tab');
  html = replaceOnce(html,
    'data-lang-key="tabReverse">逆算モード</button>',
    'data-lang-key="tabReverse">この課金で何pt？</button>',
    'JP reverse tab');
  html = replaceOnce(html,
    'data-lang-key="tabDiary">ウィークリーリワード記録</button>',
    'data-lang-key="tabDiary">週次を記録</button>',
    'JP diary tab');

  const neededPointsBlock = '            <input type="number" id="neededPoints" min="1" step="1" placeholder="例：250" inputmode="numeric" data-lang-placeholder="neededPointsPlaceholder">\n            <div id="calculator-advanced-settings" class="calculator-advanced-settings">';
  const enhancedNeededPointsBlock = '            <input type="number" id="neededPoints" min="1" step="1" placeholder="例：250" inputmode="numeric" data-lang-placeholder="neededPointsPlaceholder">\n            <div id="calculator-last-value" class="calculator-last-value" hidden aria-live="polite">\n                <span id="calculator-last-value-text"></span>\n                <button type="button" id="calculator-last-value-reuse" class="calculator-last-value__reuse">前回の条件を使う</button>\n            </div>\n            <button id="calculateButton" data-lang-key="calculateButton">必要額を計算する</button>\n            <div id="calculator-advanced-settings" class="calculator-advanced-settings">';
  html = replaceOnce(html, neededPointsBlock, enhancedNeededPointsBlock, 'needed-points memory block');

  html = replaceOnce(html,
    '        <div class="section">\n            <button id="calculateButton" data-lang-key="calculateButton">必要額を計算する</button>\n            <div class="result" id="result" aria-live="polite"></div>',
    '        <div class="section">\n            <div class="result" id="result" aria-live="polite"></div>',
    'original calculate button');

  html = replaceOnce(html,
    '<style id="playpoint-first-view-critical">\n.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}',
    `<style id="playpoint-first-view-critical">\n#mainMode>.section:first-child{display:flex;flex-direction:column}\n#mainMode>.section:first-child>#calculateButton{order:2;margin-top:1em}\n.calculator-last-value{display:flex;align-items:center;gap:.45em;flex-wrap:wrap;margin:.55em 0 0;font-size:.88em;line-height:1.5;color:var(--muted-text-color,#5f6368)}\n.calculator-last-value[hidden]{display:none!important}\n.calculator-last-value__reuse{appearance:none;border:0;background:transparent;color:var(--link-color,#0b57d0);padding:.1em .15em;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;box-shadow:none}\n.calculator-last-value__reuse:hover{background:transparent;box-shadow:none;transform:none}\n.calculator-last-value__reuse:focus-visible{outline:3px solid var(--input-focus-border-color,#005fcc);outline-offset:2px}\n.calculator-advanced-settings,.calculator-advanced-settings__body{display:contents}`,
    'first-view styles');

  html = replaceOnce(html,
    '@media(max-width:640px){\n.calculator-advanced-settings{display:block;margin-top:.85em}',
    '@media(max-width:640px){\n#mainMode>.section:first-child>#calculateButton{order:1}\n#mainMode>.section:first-child>#calculator-advanced-settings{order:2}\n.calculator-advanced-settings{display:block;margin-top:.85em}',
    'mobile primary action order');

  write('index.html', html);
}

function patchConfig() {
  let config = read('js/config.js');
  const replacements = [
    ['tabMain: "通常計算", tabReverse: "逆算モード", tabDiary: "ウィークリーリワード記録"', 'tabMain: "あといくら必要？", tabReverse: "この課金で何pt？", tabDiary: "週次を記録"', 'JP task tabs'],
    ['tabMain: "Standard", tabReverse: "Reverse", tabDiary: "Weekly Awards Diary"', 'tabMain: "How much left?", tabReverse: "Points from spend", tabDiary: "Log weekly"', 'US task tabs'],
    ['tabMain: "일반 계산", tabReverse: "역산 모드", tabDiary: "주간 리워드 일기"', 'tabMain: "얼마나 더 필요?", tabReverse: "이 결제로 몇 pt?", tabDiary: "주간 기록"', 'KR task tabs'],
    ['tabMain: "一般計算", tabReverse: "逆算模式", tabDiary: "每週獎勵日記"', 'tabMain: "還差多少？", tabReverse: "這筆消費有幾點？", tabDiary: "每週記錄"', 'TW task tabs']
  ];
  for (const [from, to, label] of replacements) config = replaceOnce(config, from, to, label);
  write('js/config.js', config);
}

function patchLocaleConfig() {
  let source = read('scripts/locale-config.cjs');
  const replacements = [
    ["            tabMain: 'Standard',\n            tabReverse: 'Reverse',\n            tabDiary: 'Weekly Rewards Diary',", "            tabMain: 'How much left?',\n            tabReverse: 'Points from spend',\n            tabDiary: 'Log weekly',", 'EN generated task tabs'],
    ["            tabMain: '일반 계산',\n            tabReverse: '역산 모드',\n            tabDiary: '주간 리워드 일기',", "            tabMain: '얼마나 더 필요?',\n            tabReverse: '이 결제로 몇 pt?',\n            tabDiary: '주간 기록',", 'KO generated task tabs'],
    ["            tabMain: '一般計算',\n            tabReverse: '反推模式',\n            tabDiary: '每週獎勵日記',", "            tabMain: '還差多少？',\n            tabReverse: '這筆消費有幾點？',\n            tabDiary: '每週記錄',", 'TW generated task tabs']
  ];
  for (const [from, to, label] of replacements) source = replaceOnce(source, from, to, label);
  write('scripts/locale-config.cjs', source);
}

function patchFirstView() {
  let source = read('js/first-view.js');
  source = replaceOnce(source,
    "import { STATE, CONSTANTS } from './config.js';",
    "import { CONFIGS, STATE, CONSTANTS } from './config.js';",
    'first-view config import');

  const oldTail = `function prepareFirstView() {\n    enhanceCalculatorAdvancedSettings();\n}\n\nif (typeof document !== 'undefined') {\n    if (document.getElementById('mainMode')) prepareFirstView();\n    else document.addEventListener('DOMContentLoaded', prepareFirstView, { once: true });\n}\n`;

  const newTail = `const LAST_MAIN_CALCULATION_KEY = 'playpointLastMainCalculationV1';\n\nconst LAST_CALCULATION_COPY = Object.freeze({\n    JP: Object.freeze({\n        last: '前回：{points}pt{context}',\n        context: '（{current} → {target}）',\n        decreased: '前回 {previous}pt → 今回 {current}pt（{delta}pt減）',\n        increased: '前回 {previous}pt → 今回 {current}pt（{delta}pt増）',\n        same: '前回と同じ：{current}pt',\n        reuse: '前回の条件を使う'\n    }),\n    US: Object.freeze({\n        last: 'Last time: {points} pts{context}',\n        context: ' ({current} → {target})',\n        decreased: 'Last {previous} → now {current} pts ({delta} fewer)',\n        increased: 'Last {previous} → now {current} pts ({delta} more)',\n        same: 'Same as last time: {current} pts',\n        reuse: 'Use last values'\n    }),\n    KR: Object.freeze({\n        last: '지난번: {points}pt{context}',\n        context: ' ({current} → {target})',\n        decreased: '지난번 {previous}pt → 이번 {current}pt ({delta}pt 감소)',\n        increased: '지난번 {previous}pt → 이번 {current}pt ({delta}pt 증가)',\n        same: '지난번과 동일: {current}pt',\n        reuse: '지난번 조건 사용'\n    }),\n    TW: Object.freeze({\n        last: '上次：{points}點{context}',\n        context: '（{current} → {target}）',\n        decreased: '上次 {previous}點 → 這次 {current}點（減少 {delta}點）',\n        increased: '上次 {previous}點 → 這次 {current}點（增加 {delta}點）',\n        same: '和上次相同：{current}點',\n        reuse: '使用上次條件'\n    }),\n    HK: Object.freeze({\n        last: '上次：{points}點{context}',\n        context: '（{current} → {target}）',\n        decreased: '上次 {previous}點 → 今次 {current}點（減少 {delta}點）',\n        increased: '上次 {previous}點 → 今次 {current}點（增加 {delta}點）',\n        same: '和上次相同：{current}點',\n        reuse: '使用上次條件'\n    }),\n    IN: Object.freeze({\n        last: 'Last time: {points} pts{context}',\n        context: ' ({current} → {target})',\n        decreased: 'Last {previous} → now {current} pts ({delta} fewer)',\n        increased: 'Last {previous} → now {current} pts ({delta} more)',\n        same: 'Same as last time: {current} pts',\n        reuse: 'Use last values'\n    })\n});\n\nfunction emptyLastCalculationStore() {\n    return { version: 1, mainByRegion: {} };\n}\n\nfunction isLastCalculationSnapshot(value) {\n    if (!value || typeof value !== 'object') return false;\n    const points = Number(value.neededPoints);\n    return typeof value.region === 'string'\n        && typeof value.currentStatus === 'string'\n        && typeof value.targetStatus === 'string'\n        && Number.isSafeInteger(points)\n        && points >= 0;\n}\n\nexport function readLastMainCalculationStore(storage = localStorage) {\n    try {\n        const parsed = JSON.parse(storage.getItem(LAST_MAIN_CALCULATION_KEY) || 'null');\n        if (!parsed || parsed.version !== 1 || !parsed.mainByRegion || typeof parsed.mainByRegion !== 'object') {\n            return emptyLastCalculationStore();\n        }\n        const mainByRegion = {};\n        for (const [region, snapshot] of Object.entries(parsed.mainByRegion)) {\n            if (isLastCalculationSnapshot(snapshot)) mainByRegion[region] = snapshot;\n        }\n        return { version: 1, mainByRegion };\n    } catch {\n        return emptyLastCalculationStore();\n    }\n}\n\nexport function getLastMainCalculationForRegion(region, storage = localStorage) {\n    return readLastMainCalculationStore(storage).mainByRegion[String(region || '')] || null;\n}\n\nexport function saveLastMainCalculationForRegion(region, snapshot, storage = localStorage) {\n    if (!isLastCalculationSnapshot(snapshot) || snapshot.region !== region) return false;\n    try {\n        const store = readLastMainCalculationStore(storage);\n        store.mainByRegion[region] = { ...snapshot };\n        storage.setItem(LAST_MAIN_CALCULATION_KEY, JSON.stringify(store));\n        return true;\n    } catch {\n        return false;\n    }\n}\n\nexport function sameCalculationContext(left, right) {\n    return Boolean(left && right\n        && left.region === right.region\n        && left.currentStatus === right.currentStatus\n        && left.targetStatus === right.targetStatus);\n}\n\nfunction fillCopy(template, values) {\n    return Object.entries(values).reduce(\n        (text, [key, value]) => text.replaceAll('{' + key + '}', String(value ?? '')),\n        template\n    );\n}\n\nfunction formatPointValue(value, region) {\n    const number = Number(value);\n    if (!Number.isFinite(number)) return String(value ?? '');\n    const locale = typeof CONFIGS === 'object' && CONFIGS?.[region]?.lang ? CONFIGS[region].lang : 'en';\n    return number.toLocaleString(locale);\n}\n\nexport function formatLastCalculationText(region, currentSnapshot, previousSnapshot = null) {\n    const copy = LAST_CALCULATION_COPY[region] || LAST_CALCULATION_COPY.US;\n    const currentPoints = formatPointValue(currentSnapshot?.neededPoints, region);\n\n    if (previousSnapshot && sameCalculationContext(previousSnapshot, currentSnapshot)) {\n        const previousValue = Number(previousSnapshot.neededPoints);\n        const currentValue = Number(currentSnapshot.neededPoints);\n        const delta = previousValue - currentValue;\n        const values = {\n            previous: formatPointValue(previousValue, region),\n            current: currentPoints,\n            delta: formatPointValue(Math.abs(delta), region)\n        };\n        if (delta > 0) return fillCopy(copy.decreased, values);\n        if (delta < 0) return fillCopy(copy.increased, values);\n        return fillCopy(copy.same, values);\n    }\n\n    const hasContext = currentSnapshot?.currentStatusLabel && currentSnapshot?.targetStatusLabel;\n    const context = hasContext\n        ? fillCopy(copy.context, { current: currentSnapshot.currentStatusLabel, target: currentSnapshot.targetStatusLabel })\n        : '';\n    return fillCopy(copy.last, { points: currentPoints, context });\n}\n\nfunction getSelectedOption(select) {\n    if (!select || !select.options || select.selectedIndex < 0) return null;\n    return select.options[select.selectedIndex] || null;\n}\n\nfunction getCurrentMainCalculationSnapshot() {\n    const currentStatus = document.getElementById('currentStatus');\n    const targetStatus = document.getElementById('targetStatus');\n    const neededPoints = document.getElementById('neededPoints');\n    const points = Number(neededPoints?.value);\n    if (!currentStatus || !targetStatus || !Number.isSafeInteger(points) || points < 0) return null;\n\n    const currentOption = getSelectedOption(currentStatus);\n    const targetOption = getSelectedOption(targetStatus);\n    return {\n        region: STATE.currentRegion,\n        currentStatus: String(currentStatus.value),\n        currentStatusLabel: String(currentOption?.textContent || '').trim(),\n        targetStatus: String(targetStatus.value),\n        targetStatusLabel: String(targetOption?.dataset?.statusLabel || targetOption?.textContent || '').trim(),\n        neededPoints: String(points)\n    };\n}\n\nfunction renderLastCalculation(snapshot, previousSnapshot = null) {\n    const container = document.getElementById('calculator-last-value');\n    const text = document.getElementById('calculator-last-value-text');\n    const reuse = document.getElementById('calculator-last-value-reuse');\n    if (!container || !text || !reuse || !snapshot) return;\n\n    const copy = LAST_CALCULATION_COPY[STATE.currentRegion] || LAST_CALCULATION_COPY.US;\n    text.textContent = formatLastCalculationText(STATE.currentRegion, snapshot, previousSnapshot);\n    reuse.textContent = copy.reuse;\n    container.hidden = false;\n}\n\nfunction hideLastCalculation() {\n    const container = document.getElementById('calculator-last-value');\n    if (container) container.hidden = true;\n}\n\nfunction dispatchInputEvent(element, type) {\n    if (!element || typeof Event !== 'function') return;\n    element.dispatchEvent(new Event(type, { bubbles: true }));\n}\n\nfunction restoreLastCalculation() {\n    const snapshot = getLastMainCalculationForRegion(STATE.currentRegion);\n    if (!snapshot) return;\n\n    const currentStatus = document.getElementById('currentStatus');\n    const targetStatus = document.getElementById('targetStatus');\n    const neededPoints = document.getElementById('neededPoints');\n\n    if (currentStatus && Array.from(currentStatus.options || []).some(option => String(option.value) === snapshot.currentStatus)) {\n        currentStatus.value = snapshot.currentStatus;\n        dispatchInputEvent(currentStatus, 'change');\n    }\n    if (targetStatus && Array.from(targetStatus.options || []).some(option => String(option.value) === snapshot.targetStatus)) {\n        targetStatus.value = snapshot.targetStatus;\n        dispatchInputEvent(targetStatus, 'change');\n    }\n    if (neededPoints) {\n        neededPoints.value = snapshot.neededPoints;\n        dispatchInputEvent(neededPoints, 'input');\n        neededPoints.focus?.();\n    }\n}\n\nfunction bindLastCalculationReuse() {\n    const reuse = document.getElementById('calculator-last-value-reuse');\n    if (!reuse || reuse.dataset.playpointBound === 'true') return;\n    reuse.addEventListener('click', restoreLastCalculation);\n    reuse.dataset.playpointBound = 'true';\n}\n\nfunction recordSuccessfulMainCalculation() {\n    const result = document.getElementById('result');\n    if (!result?.classList?.contains(CONSTANTS.CLASS_HAS_RESULT || 'has-result')) return;\n    const currentSnapshot = getCurrentMainCalculationSnapshot();\n    if (!currentSnapshot) return;\n\n    const previousSnapshot = getLastMainCalculationForRegion(STATE.currentRegion);\n    if (!saveLastMainCalculationForRegion(STATE.currentRegion, currentSnapshot)) return;\n\n    if (previousSnapshot && sameCalculationContext(previousSnapshot, currentSnapshot)) {\n        renderLastCalculation(currentSnapshot, previousSnapshot);\n    } else {\n        hideLastCalculation();\n    }\n}\n\nfunction bindLastCalculationMemory() {\n    const result = document.getElementById('result');\n    if (!result) return;\n\n    bindLastCalculationReuse();\n    const saved = getLastMainCalculationForRegion(STATE.currentRegion);\n    if (saved) renderLastCalculation(saved);\n    else hideLastCalculation();\n\n    if (typeof MutationObserver !== 'function' || result.dataset.playpointMemoryBound === 'true') return;\n    let scheduled = false;\n    const observer = new MutationObserver(() => {\n        if (scheduled) return;\n        scheduled = true;\n        queueMicrotask(() => {\n            scheduled = false;\n            recordSuccessfulMainCalculation();\n        });\n    });\n    observer.observe(result, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });\n    result.dataset.playpointMemoryBound = 'true';\n}\n\nfunction prepareFirstView() {\n    enhanceCalculatorAdvancedSettings();\n}\n\nfunction preparePostInit() {\n    if (typeof window?.setTimeout === 'function') window.setTimeout(bindLastCalculationMemory, 0);\n    else bindLastCalculationMemory();\n}\n\nif (typeof document !== 'undefined') {\n    if (document.getElementById('mainMode')) {\n        prepareFirstView();\n        document.addEventListener('DOMContentLoaded', preparePostInit, { once: true });\n    } else {\n        document.addEventListener('DOMContentLoaded', () => {\n            prepareFirstView();\n            preparePostInit();\n        }, { once: true });\n    }\n}\n`;

  source = replaceOnce(source, oldTail, newTail, 'first-view post-init enhancement tail');
  write('js/first-view.js', source);
}

function patchPrivacy() {
  let privacy = read('privacy.html');
  privacy = replaceOnce(privacy,
    '<p>地域設定、日記、同意に関する状態などは、ブラウザのlocalStorageまたはsessionStorageに保存することがあります。日記に入力したポイント数や景品名は当サイトのサーバーへ送信せず、利用中のブラウザ内だけに保存します。サイトデータを削除すると消えるため、必要に応じて書き出し機能をご利用ください。</p>',
    '<p>地域設定、日記、同意に関する状態、直近の通常計算で入力した現在・目標ステータスと必要ポイントなどは、ブラウザのlocalStorageまたはsessionStorageに保存することがあります。日記に入力したポイント数や景品名、直近計算の入力値は当サイトのサーバーへ送信せず、利用中のブラウザ内だけに保存します。サイトデータを削除すると消えるため、日記は必要に応じて書き出し機能をご利用ください。</p>',
    'privacy local storage disclosure');
  write('privacy.html', privacy);
}

function patchTests() {
  let testSource = read('tests/mobile-first-view-contract.test.cjs');
  testSource = replaceOnce(testSource,
    ".concat('\\n;globalThis.__firstView = { shouldAutoOpenAdvancedSettings, enhanceCalculatorAdvancedSettings, getSuggestedRegionForBrowserLanguage, checkLanguageSuggestion };');",
    ".concat('\\n;globalThis.__firstView = { shouldAutoOpenAdvancedSettings, enhanceCalculatorAdvancedSettings, getSuggestedRegionForBrowserLanguage, checkLanguageSuggestion, readLastMainCalculationStore, getLastMainCalculationForRegion, saveLastMainCalculationForRegion, sameCalculationContext, formatLastCalculationText };');",
    'first-view test exports');

  testSource += `\n\ntest('前回の通常計算は地域別に端末内へ1件だけ保持し、別地域を上書きしない', () => {\n  const fixture = loadFirstView({ region: 'JP' });\n  const jp = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };\n  const us = { region: 'US', currentStatus: '1.2', currentStatusLabel: 'Gold', targetStatus: '4000', targetStatusLabel: 'Platinum', neededPoints: '900' };\n\n  assert.equal(fixture.api.saveLastMainCalculationForRegion('JP', jp, fixture.localStorage), true);\n  assert.equal(fixture.api.saveLastMainCalculationForRegion('US', us, fixture.localStorage), true);\n  assert.equal(fixture.api.getLastMainCalculationForRegion('JP', fixture.localStorage).neededPoints, '1728');\n  assert.equal(fixture.api.getLastMainCalculationForRegion('US', fixture.localStorage).neededPoints, '900');\n});\n\ntest('同じランク条件の再計算だけ前回との差を表示する', () => {\n  const fixture = loadFirstView({ region: 'JP' });\n  const previous = { region: 'JP', currentStatus: '1.5', currentStatusLabel: 'ゴールド', targetStatus: '4000', targetStatusLabel: 'プラチナ', neededPoints: '1728' };\n  const current = { ...previous, neededPoints: '1200' };\n  const changedTarget = { ...current, targetStatus: '15000', targetStatusLabel: 'ダイヤモンド' };\n\n  assert.equal(fixture.api.sameCalculationContext(previous, current), true);\n  assert.match(fixture.api.formatLastCalculationText('JP', current, previous), /528pt減/);\n  assert.match(fixture.api.formatLastCalculationText('JP', changedTarget, previous), /前回：1,200pt/);\n});\n\ntest('公開トップは行動ベースのタブ名と、入力を邪魔しない前回値表示領域を持つ', () => {\n  const expected = {\n    'index.html': ['あといくら必要？', 'この課金で何pt？', '週次を記録'],\n    'en/index.html': ['How much left?', 'Points from spend', 'Log weekly'],\n    'ko/index.html': ['얼마나 더 필요?', '이 결제로 몇 pt?', '주간 기록'],\n    'tw/index.html': ['還差多少？', '這筆消費有幾點？', '每週記錄'],\n    'hk/index.html': ['還差多少？', '這筆消費有幾點？', '每週記錄'],\n    'in/index.html': ['How much left?', 'Points from spend', 'Log weekly']\n  };\n\n  for (const [indexPath, labels] of Object.entries(expected)) {\n    const html = read(indexPath);\n    labels.forEach(label => assert.ok(html.includes(label), indexPath + ': missing ' + label));\n    assert.ok(html.includes('id="calculator-last-value"'), indexPath + ': memory UI missing');\n    const needed = html.indexOf('id="neededPoints"');\n    const calculate = html.indexOf('id="calculateButton"');\n    const advanced = html.indexOf('id="calculator-advanced-settings"');\n    assert.ok(needed >= 0 && needed < calculate && calculate < advanced, indexPath + ': mobile primary action order');\n  }\n\n  const firstView = read('js/first-view.js');\n  assert.doesNotMatch(firstView, /ANALYTICS|gtag|dataLayer/, 'raw previous values must not enter analytics code');\n  assert.match(read('privacy.html'), /直近の通常計算で入力した現在・目標ステータスと必要ポイント/);\n});\n`;
  write('tests/mobile-first-view-contract.test.cjs', testSource);
}

patchIndex();
patchConfig();
patchLocaleConfig();
patchFirstView();
patchPrivacy();
patchTests();

console.log('Applied calculator flow + last-value memory source changes.');
