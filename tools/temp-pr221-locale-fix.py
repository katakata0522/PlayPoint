from pathlib import Path


def replace_once(path, old, new):
    target = Path(path)
    text = target.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected block not found in {path}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')


static_path = 'scripts/static-calculator-layout.cjs'
replace_once(
    static_path,
    """const ADVANCED_SETTINGS_COPY = Object.freeze({
  ja: '獲得率・キャンペーンを調整（任意）',
  en: 'Adjust earn rates & promotion (optional)',
  ko: '적립률·프로모션 조정 (선택)',
  tw: '調整獲點率與活動（選填）',
  hk: '調整獲點率與活動（選填）'
});""",
    """const ADVANCED_SETTINGS_COPY = '獲得率・キャンペーンを調整（任意）';"""
)
replace_once(
    static_path,
    """.calculator-advanced-settings__toggle{display:none}
.calculator-advanced-settings__copy{display:none}
html[lang=\"ja\"] .calculator-advanced-settings__copy--ja{display:inline}
html[lang^=\"en\"] .calculator-advanced-settings__copy--en{display:inline}
html[lang^=\"ko\"] .calculator-advanced-settings__copy--ko{display:inline}
html[lang=\"zh-TW\"] .calculator-advanced-settings__copy--tw{display:inline}
html[lang=\"zh-HK\"] .calculator-advanced-settings__copy--hk{display:inline}
.region-switch""",
    """.calculator-advanced-settings__toggle{display:none}
.region-switch"""
)
replace_once(
    static_path,
    """function buildAdvancedSettingsToggle() {
  const copies = Object.entries(ADVANCED_SETTINGS_COPY)
    .map(([key, value]) => `<span class=\"calculator-advanced-settings__copy calculator-advanced-settings__copy--${key}\">${value}</span>`)
    .join('');
  return `<button type=\"button\" class=\"calculator-advanced-settings__toggle\" aria-controls=\"${ADVANCED_SETTINGS_BODY_ID}\" aria-expanded=\"false\"><span>${copies}</span><span class=\"calculator-advanced-settings__chevron\" aria-hidden=\"true\">⌄</span></button>`;
}

function ensureCriticalFirstViewAssets(content) {
  if (!content.includes('</head>')) return content;
  const additions = [];
  if (!content.includes(`id=\"${ADVANCED_SETTINGS_STYLE_ID}\"`)) additions.push(ADVANCED_SETTINGS_CRITICAL_STYLE);
  if (!content.includes(`id=\"${ADVANCED_SETTINGS_STATE_SCRIPT_ID}\"`)) additions.push(ADVANCED_SETTINGS_STATE_SCRIPT);
  if (!additions.length) return content;
  return content.replace('</head>', `${additions.map(item => `    ${item}`).join('\\n    ')}\\n</head>`);
}

function ensureStaticAdvancedSettings(content) {
  if (content.includes(`id=\"${ADVANCED_SETTINGS_ID}\"`)) return ensureCriticalFirstViewAssets(content);
""",
    """function buildAdvancedSettingsToggle() {
  return `<button type=\"button\" class=\"calculator-advanced-settings__toggle\" aria-controls=\"${ADVANCED_SETTINGS_BODY_ID}\" aria-expanded=\"false\"><span data-simplified-calculator-copy=\"advancedSettingsLabel\">${ADVANCED_SETTINGS_COPY}</span><span class=\"calculator-advanced-settings__chevron\" aria-hidden=\"true\">⌄</span></button>`;
}

function normalizeAdvancedSettingsToggle(content) {
  const openingPattern = /<button\\b[^>]*\\bclass=[\"'][^\"']*calculator-advanced-settings__toggle[^\"']*[\"'][^>]*>/i;
  const match = openingPattern.exec(content);
  if (!match) return content;
  const range = findBalancedElementRange(content, match.index, 'button');
  if (!range) throw new Error('詳細設定トグルの範囲を取得できません。');
  return `${content.slice(0, range.start)}${buildAdvancedSettingsToggle()}${content.slice(range.end)}`;
}

function ensureCriticalFirstViewAssets(content) {
  if (!content.includes('</head>')) return content;
  const stylePattern = new RegExp(`<style id=\"${ADVANCED_SETTINGS_STYLE_ID}\">[\\s\\S]*?<\\/style>`, 'i');
  const statePattern = new RegExp(`<script id=\"${ADVANCED_SETTINGS_STATE_SCRIPT_ID}\">[\\s\\S]*?<\\/script>`, 'i');
  const additions = [];

  if (stylePattern.test(content)) content = content.replace(stylePattern, ADVANCED_SETTINGS_CRITICAL_STYLE);
  else additions.push(ADVANCED_SETTINGS_CRITICAL_STYLE);

  if (statePattern.test(content)) content = content.replace(statePattern, ADVANCED_SETTINGS_STATE_SCRIPT);
  else additions.push(ADVANCED_SETTINGS_STATE_SCRIPT);

  if (!additions.length) return content;
  return content.replace('</head>', `${additions.map(item => `    ${item}`).join('\\n    ')}\\n</head>`);
}

function ensureStaticAdvancedSettings(content) {
  if (content.includes(`id=\"${ADVANCED_SETTINGS_ID}\"`)) {
    content = normalizeAdvancedSettingsToggle(content);
    return ensureCriticalFirstViewAssets(content);
  }
"""
)

builder_path = 'scripts/language-page-builder.cjs'
replace_once(
    builder_path,
    """  en: {
    baseRateLabel: 'Points per $1 (auto-filled, editable)',
    multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / $1)'
  },
  ko: {
    baseRateLabel: '₩1,000당 적립률 (자동 입력·수정 가능)',
    multiplierLabel: '캠페인 특별 적립률 (예: 1,000원당 3pt)'
  },
  tw: {
    baseRateLabel: '每 NT$30 獲得點數（自動帶入，可修改）',
    multiplierLabel: '活動特別獲點率（例：每 NT$30 3 點）'
  }""",
    """  en: {
    baseRateLabel: 'Points per $1 (auto-filled, editable)',
    multiplierLabel: 'Promotion special earn rate (e.g. 3 pt / $1)',
    advancedSettingsLabel: 'Adjust earn rates & promotion (optional)'
  },
  ko: {
    baseRateLabel: '₩1,000당 적립률 (자동 입력·수정 가능)',
    multiplierLabel: '캠페인 특별 적립률 (예: 1,000원당 3pt)',
    advancedSettingsLabel: '적립률·프로모션 조정 (선택)'
  },
  tw: {
    baseRateLabel: '每 NT$30 獲得點數（自動帶入，可修改）',
    multiplierLabel: '活動特別獲點率（例：每 NT$30 3 點）',
    advancedSettingsLabel: '調整獲點率與活動（選填）'
  }"""
)
replace_once(
    builder_path,
    """    .replace(
      /(<span\\b[^>]*\\bdata-simplified-calculator-copy=\"multiplierLabel\"[^>]*>)[\\s\\S]*?(<\\/span>)/i,
      (_match, openTag, closeTag) => `${openTag}${copy.multiplierLabel}${closeTag}`
    );""",
    """    .replace(
      /(<span\\b[^>]*\\bdata-simplified-calculator-copy=\"multiplierLabel\"[^>]*>)[\\s\\S]*?(<\\/span>)/i,
      (_match, openTag, closeTag) => `${openTag}${copy.multiplierLabel}${closeTag}`
    )
    .replace(
      /(<span\\b[^>]*\\bdata-simplified-calculator-copy=\"advancedSettingsLabel\"[^>]*>)[\\s\\S]*?(<\\/span>)/i,
      (_match, openTag, closeTag) => `${openTag}${copy.advancedSettingsLabel}${closeTag}`
    );"""
)

test_path = 'tests/static-calculator-delivery.test.cjs'
replace_once(
    test_path,
    """    '100円あたりの獲得率（自動入力・編集可）',
    'キャンペーン特別獲得率（例：3pt/100円）'
  ],
  'en/index.html': [
    'Points per $1 (auto-filled, editable)',
    'Promotion special earn rate (e.g. 3 pt / $1)'
  ],
  'ko/index.html': [
    '₩1,000당 적립률 (자동 입력·수정 가능)',
    '캠페인 특별 적립률 (예: 1,000원당 3pt)'
  ],
  'tw/index.html': [
    '每 NT$30 獲得點數（自動帶入，可修改）',
    '活動特別獲點率（例：每 NT$30 3 點）'
  ]""",
    """    '100円あたりの獲得率（自動入力・編集可）',
    'キャンペーン特別獲得率（例：3pt/100円）',
    '獲得率・キャンペーンを調整（任意）'
  ],
  'en/index.html': [
    'Points per $1 (auto-filled, editable)',
    'Promotion special earn rate (e.g. 3 pt / $1)',
    'Adjust earn rates & promotion (optional)'
  ],
  'ko/index.html': [
    '₩1,000당 적립률 (자동 입력·수정 가능)',
    '캠페인 특별 적립률 (예: 1,000원당 3pt)',
    '적립률·프로모션 조정 (선택)'
  ],
  'tw/index.html': [
    '每 NT$30 獲得點數（自動帶入，可修改）',
    '活動特別獲點率（例：每 NT$30 3 點）',
    '調整獲點率與活動（選填）'
  ]"""
)
replace_once(
    test_path,
    """    assert.ok(mainMode.includes('calculator-advanced-settings__toggle'), `${indexPath}: 静的な詳細設定トグルがない`);
  }
});""",
    """    assert.ok(mainMode.includes('calculator-advanced-settings__toggle'), `${indexPath}: 静的な詳細設定トグルがない`);
    const advancedLabels = mainMode.match(/data-simplified-calculator-copy=\"advancedSettingsLabel\"/g) || [];
    assert.equal(advancedLabels.length, 1, `${indexPath}: 詳細設定ラベルは1言語分だけ静的出力する`);
    assert.ok(!mainMode.includes('calculator-advanced-settings__copy--'), `${indexPath}: 他言語の非表示コピーを埋め込まない`);
  }
});"""
)

mobile_test_path = 'tests/mobile-first-view-contract.test.cjs'
replace_once(
    mobile_test_path,
    """  const source = firstView();
  const staticLayout = read('scripts/static-calculator-layout.cjs');
""",
    """  const source = firstView();
  const staticLayout = read('scripts/static-calculator-layout.cjs');
  const languageBuilder = read('scripts/language-page-builder.cjs');
"""
)
replace_once(
    mobile_test_path,
    """  assert.match(staticLayout, /獲得率・キャンペーンを調整（任意）/);
  assert.match(staticLayout, /Adjust earn rates & promotion \\(optional\\)/);
  assert.match(staticLayout, /적립률·프로모션 조정 \\(선택\\)/);
  assert.match(staticLayout, /調整獲點率與活動（選填）/);""",
    """  assert.match(staticLayout, /獲得率・キャンペーンを調整（任意）/);
  assert.match(staticLayout, /data-simplified-calculator-copy=\"advancedSettingsLabel\"/);
  assert.match(languageBuilder, /Adjust earn rates & promotion \\(optional\\)/);
  assert.match(languageBuilder, /적립률·프로모션 조정 \\(선택\\)/);
  assert.match(languageBuilder, /調整獲點率與活動（選填）/);"""
)
