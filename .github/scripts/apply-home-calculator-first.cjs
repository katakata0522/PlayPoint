'use strict';

const fs = require('node:fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Missing source for ${label}`);
  }
  return content.replace(search, replacement);
}

// Japanese source top page. International top pages are regenerated from this source.
let html = read('index.html');
html = html.replace('<main class="calculator-wrapper">', '<main class="calculator-wrapper home-calculator-first">');
html = html.replaceAll('ほくほくリワード日記', 'ウィークリーリワード記録');
html = html.replace(/(<button id="calculateButton"[^>]*>)[\s\S]*?(<\/button>)/, '$1必要額を計算する$2');

if (!html.includes('class="home-help-link"')) {
  html = html.replace(
    /(<h2 data-lang-key="sectionTitleStatus">[^<]+<\/h2>)/,
    '$1\n            <a class="home-help-link" href="#calculator-help">使い方を見る ↗</a>'
  );
}

html = html.replace(
  '<!-- DESCRIPTION_SECTION_START -->\n    <section class="section">',
  '<!-- DESCRIPTION_SECTION_START -->\n    <section class="section" id="calculator-help">'
);

const drawerMatch = html.match(/<!-- ARTICLE_DRAWER_START -->([\s\S]*?)<!-- ARTICLE_DRAWER_END -->/);
if (!drawerMatch) throw new Error('ARTICLE_DRAWER block not found');
const drawerItems = [...drawerMatch[1].matchAll(/<li>[\s\S]*?<\/li>/g)].map(match => match[0]);
if (drawerItems.length < 10) throw new Error(`Expected article links, got ${drawerItems.length}`);
const drawer = `<!-- ARTICLE_DRAWER_START -->
    <section class="section home-article-hub">
      <div class="home-section-heading">
        <h2 data-lang-key="articleDrawerTitle">よくある悩み・おすすめ記事</h2>
        <a class="home-section-more" href="blog/">もっと見る →</a>
      </div>
      <ul class="article-link-list home-article-carousel" aria-label="よくある悩み・おすすめ記事">
        ${drawerItems.join('\n        ')}
      </ul>
      <p class="article-drawer-note"><a href="info.html">Q&amp;Aを見る</a></p>
    </section>
    <!-- ARTICLE_DRAWER_END -->`;
html = html.replace(/<!-- ARTICLE_DRAWER_START -->[\s\S]*?<!-- ARTICLE_DRAWER_END -->/, drawer);

const descriptionMatch = html.match(/<!-- DESCRIPTION_SECTION_START -->[\s\S]*?<!-- DESCRIPTION_SECTION_END -->/);
const compactDrawerMatch = html.match(/<!-- ARTICLE_DRAWER_START -->[\s\S]*?<!-- ARTICLE_DRAWER_END -->/);
if (!descriptionMatch || !compactDrawerMatch) throw new Error('Home lower-section blocks not found');
if (descriptionMatch.index < compactDrawerMatch.index) {
  html = html
    .replace(descriptionMatch[0], '__PLAYPOINT_DESCRIPTION_BLOCK__')
    .replace(compactDrawerMatch[0], '__PLAYPOINT_ARTICLE_BLOCK__')
    .replace('__PLAYPOINT_DESCRIPTION_BLOCK__', compactDrawerMatch[0])
    .replace('__PLAYPOINT_ARTICLE_BLOCK__', descriptionMatch[0]);
}
write('index.html', html);

// Canonical static layout: advanced settings belong after the primary CTA in DOM order.
let layout = read('scripts/static-calculator-layout.cjs');
layout = replaceOnce(
  layout,
  "const ADVANCED_SETTINGS_COPY = '獲得率・キャンペーンを調整（任意）';",
  "const ADVANCED_SETTINGS_COPY = '詳細な条件を設定する';",
  'advanced settings copy'
);

if (!layout.includes('function moveAdvancedSettingsAfterCalculate(content)')) {
  const helper = [
    'function moveAdvancedSettingsAfterCalculate(content) {',
    '  const advancedPattern = new RegExp(`<div\\\\b[^>]*\\\\bid=["\\\']${ADVANCED_SETTINGS_ID}["\\\'][^>]*>`, \'i\');',
    '  const advancedMatch = advancedPattern.exec(content);',
    '  const calculatePattern = /<button\\b[^>]*\\bid=["\\\']calculateButton["\\\'][^>]*>/i;',
    '  const calculateMatch = calculatePattern.exec(content);',
    '  if (!advancedMatch || !calculateMatch) return content;',
    '',
    '  const advancedRange = findBalancedElementRange(content, advancedMatch.index, \'div\');',
    '  const calculateRange = findBalancedElementRange(content, calculateMatch.index, \'button\');',
    '  if (!advancedRange || !calculateRange) throw new Error(\'詳細設定または計算ボタンの範囲を取得できません。\');',
    '  if (advancedRange.start > calculateRange.end) return content;',
    '',
    '  const advancedBlock = content.slice(advancedRange.start, advancedRange.end);',
    '  let output = content.slice(0, advancedRange.start) + content.slice(advancedRange.end);',
    '  const refreshedCalculateMatch = calculatePattern.exec(output);',
    '  if (!refreshedCalculateMatch) throw new Error(\'詳細設定移動後に計算ボタンを再取得できません。\');',
    '  const refreshedCalculateRange = findBalancedElementRange(output, refreshedCalculateMatch.index, \'button\');',
    '  if (!refreshedCalculateRange) throw new Error(\'計算ボタンの範囲を再取得できません。\');',
    '  return output.slice(0, refreshedCalculateRange.end)',
    '    + \'\\n            \' + advancedBlock.trim()',
    '    + output.slice(refreshedCalculateRange.end);',
    '}',
    '',
    ''
  ].join('\n');
  layout = replaceOnce(layout, 'function validateStaticLayout(content) {', helper + 'function validateStaticLayout(content) {', 'layout validation marker');
}

layout = replaceOnce(
  layout,
  '  content = ensureStaticAdvancedSettings(content);\n  validateStaticLayout(content);',
  '  content = ensureStaticAdvancedSettings(content);\n  content = moveAdvancedSettingsAfterCalculate(content);\n  validateStaticLayout(content);',
  'layout canonicalization call'
);
layout = replaceOnce(
  layout,
  '    \'id="neededPoints"\',\n    `id="${ADVANCED_SETTINGS_ID}"`,\n    \'id="baseRate"\',\n    \'id="multiplier"\',\n    \'id="calculateButton"\'',
  '    \'id="neededPoints"\',\n    \'id="calculateButton"\',\n    `id="${ADVANCED_SETTINGS_ID}"`,\n    \'id="baseRate"\',\n    \'id="multiplier"\'',
  'layout expected order'
);
write('scripts/static-calculator-layout.cjs', layout);

// Shared shell: compact region labels fit a real phone width without shrinking tap targets.
let shell = read('scripts/site-shell.cjs');
shell = shell
  .replace("label: '🇯🇵 日本'", "label: '🇯🇵 JP'")
  .replace("label: '🇺🇸 United States'", "label: '🇺🇸 US'")
  .replace("label: '🇰🇷 대한민국'", "label: '🇰🇷 KR'")
  .replace("label: '🇹🇼 台灣'", "label: '🇹🇼 TW'");
write('scripts/site-shell.cjs', shell);

// Runtime-hydrated Japanese UI copy.
let config = read('js/config.js');
config = replaceOnce(config, 'tabDiary: "ほくほくリワード日記"', 'tabDiary: "ウィークリーリワード記録"', 'JP diary tab');
config = replaceOnce(config, 'calculateButton: "課金額を計算"', 'calculateButton: "必要額を計算する"', 'JP main CTA');
config = replaceOnce(config, 'articleDrawerTitle: "よくある悩みから記事を探す"', 'articleDrawerTitle: "よくある悩み・おすすめ記事"', 'JP article hub title');
write('js/config.js', config);

let langBuilder = read('scripts/language-page-builder.cjs');
langBuilder = langBuilder
  .replace("advancedSettingsLabel: 'Adjust earn rates & promotion (optional)'", "advancedSettingsLabel: 'Detailed conditions'")
  .replace("advancedSettingsLabel: '적립률·프로모션 조정 (선택)'", "advancedSettingsLabel: '상세 조건 설정'")
  .replace("advancedSettingsLabel: '調整獲點率與活動（選填）'", "advancedSettingsLabel: '設定詳細條件'");
write('scripts/language-page-builder.cjs', langBuilder);

// Result guidance becomes the compact three-card next-action strip from the approved mock.
let nav = read('js/result-navigation-config.js');
nav = replaceOnce(
  nav,
  "    decisionTitle: '次に確認すること',",
  "    decisionTitle: '計算したあとのおすすめ',\n    decisionSubtitle: '結果に合わせて、次の一手をチェックしましょう。',",
  'JP result guidance heading'
);
write('js/result-navigation-config.js', nav);

let calculator = read('js/calculator.js');
calculator = replaceOnce(calculator, '        }).slice(0, 2);', '        }).slice(0, 3);', 'result guidance card count');
calculator = replaceOnce(
  calculator,
  '        return `\n            <div class="result-guidance-links">\n                <h3>${this.getResultNavigation().decisionTitle}</h3>\n                <ul>${items}</ul>\n            </div>\n        `;',
  '        const navigation = this.getResultNavigation();\n        return `\n            <div class="result-guidance-links">\n                <h3>${navigation.decisionTitle}</h3>\n                ${navigation.decisionSubtitle ? `<p class="result-guidance-subtitle">${navigation.decisionSubtitle}</p>` : \'\'}\n                <ul>${items}</ul>\n            </div>\n        `;',
  'result guidance markup'
);
write('js/calculator.js', calculator);

let css = read('style.css');
const cssStart = '/* HOME_CALCULATOR_FIRST_V2_START */';
const cssEnd = '/* HOME_CALCULATOR_FIRST_V2_END */';
const cssBlock = `${cssStart}
.home-calculator-first{--home-accent:#0b6edc;--home-accent-soft:#eef6ff;--home-border:#cfe0f6;max-width:480px}
.home-calculator-first .top-bar{display:block;margin:.2rem auto .75rem;padding:0}
.home-calculator-first .region-switch{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;width:100%;padding:4px;border:1px solid #d4e1f1;border-radius:16px;background:#f8fbff;box-shadow:0 5px 18px rgba(11,87,208,.09);box-sizing:border-box}
.home-calculator-first .region-switch>button,.home-calculator-first .region-switch .region-more-toggle{width:100%;min-width:0;min-height:52px;margin:0;padding:.45rem .12rem;border:0!important;border-right:1px solid #d8e1ee!important;border-radius:0!important;background:#fff;color:#1f2937;box-shadow:none;font-size:.94rem;font-weight:800;white-space:nowrap}
.home-calculator-first .region-switch>button:first-child{border-radius:12px 0 0 12px!important}
.home-calculator-first .region-switch>button.active{background:#0b6edc!important;color:#fff!important;border-color:#0b6edc!important}
.home-calculator-first .region-switch .region-more{display:block;position:relative;min-width:0}
.home-calculator-first .region-switch .region-more-toggle{height:100%;border-right:0!important;border-radius:0 12px 12px 0!important;font-size:1.25rem}
.home-calculator-first .header-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.62rem;width:100%;margin-top:.65rem}
.home-calculator-first .header-links>a{margin:0!important;white-space:normal;min-width:0;text-decoration:none!important;box-shadow:none;transform:none!important}
.home-calculator-first .header-links .alert-link{grid-column:1/-1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-height:66px;padding:.72rem 2.7rem .72rem 1rem;border:1px solid var(--home-border);border-radius:18px;background:#f5f9ff;color:#1f2937;font-size:.98rem;font-weight:800;line-height:1.25;position:relative}
html[lang="ja"] .home-calculator-first .header-links .alert-link::after{content:"Point rules may vary by country or region.  ›";display:block;margin-top:.28rem;color:#64748b;font-size:.75rem;font-weight:600;line-height:1.35}
.home-calculator-first .header-links>a[data-lang-key="linkGames"],.home-calculator-first .header-links>a[data-lang-key="linkArticles"]{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-height:74px;padding:.7rem .78rem;border:1px solid var(--home-border);border-radius:18px;background:#f8fbff;color:#1f2937;font-size:.98rem;font-weight:800;line-height:1.3;position:relative}
html[lang="ja"] .home-calculator-first .header-links>a[data-lang-key="linkGames"]::after{content:"よく遊ぶゲームで簡単に  ›";margin-top:.28rem;color:#64748b;font-size:.73rem;font-weight:600}
html[lang="ja"] .home-calculator-first .header-links>a[data-lang-key="linkArticles"]::after{content:"攻略・キャンペーン情報  ›";margin-top:.28rem;color:#64748b;font-size:.73rem;font-weight:600}
.home-calculator-first .header-link-secondary{display:none!important}
.home-calculator-first #main-title{margin:.9rem .1rem .2rem;font-size:clamp(1.6rem,7vw,2rem);line-height:1.25;letter-spacing:-.02em}
.home-calculator-first #site-description{margin:.15rem auto .65rem;max-width:32rem;font-size:.98rem;font-weight:650;line-height:1.55;color:#374151}
.home-calculator-first .tab-switch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.38rem;margin:.45rem 0 .7rem}
.home-calculator-first .tab-switch button{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:72px;margin:0;padding:.55rem .45rem;border:1px solid transparent;border-radius:14px;box-shadow:none;font-size:1rem;font-weight:800;line-height:1.2}
.home-calculator-first .tab-switch button::before{display:block;margin-bottom:.2rem;font-size:1.35rem;line-height:1}
.home-calculator-first .tab-switch button::after{display:block;margin-top:.2rem;font-size:.73rem;font-weight:600;opacity:.88;line-height:1.2}
.home-calculator-first #tab-main::before{content:"🧮"}.home-calculator-first #tab-reverse::before{content:"↔"}.home-calculator-first #tab-diary::before{content:"🎁"}
html[lang="ja"] .home-calculator-first #tab-main::after{content:"あといくら必要？"}html[lang="ja"] .home-calculator-first #tab-reverse::after{content:"使う金額から計算"}html[lang="ja"] .home-calculator-first #tab-diary::after{content:"毎週のリワードを記録して、もっとお得に"}
html[lang^="en"] .home-calculator-first #tab-main::after{content:"How much more?"}html[lang^="en"] .home-calculator-first #tab-reverse::after{content:"Start from spend"}html[lang^="en"] .home-calculator-first #tab-diary::after{content:"Track weekly rewards"}
html[lang="ko"] .home-calculator-first #tab-main::after{content:"얼마가 더 필요할까요?"}html[lang="ko"] .home-calculator-first #tab-reverse::after{content:"사용 금액으로 계산"}html[lang="ko"] .home-calculator-first #tab-diary::after{content:"매주 리워드 기록"}
html[lang^="zh"] .home-calculator-first #tab-main::after{content:"還差多少？"}html[lang^="zh"] .home-calculator-first #tab-reverse::after{content:"從消費金額計算"}html[lang^="zh"] .home-calculator-first #tab-diary::after{content:"記錄每週獎勵"}
.home-calculator-first #tab-diary{grid-column:1/-1;min-height:62px;background:#f5f9ff;color:#1f2937;border-color:var(--home-border)}
.home-calculator-first #tab-diary.active{background:#e6f2ff;color:#0757ad;border-color:#0b6edc}
.home-calculator-first #mainMode>.section:first-child{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:.72rem;row-gap:.18rem;margin:.25rem 0 0;padding:1rem 1rem .68rem;border-radius:18px 18px 0 0;box-shadow:0 8px 24px rgba(36,71,120,.09)}
.home-calculator-first #mainMode>.section:first-child>h2{grid-column:1/-1;grid-row:1;margin:0 0 .55rem;padding:0 0 .5rem;font-size:1.35rem;border-bottom:2px solid #d1d7e0}
.home-calculator-first .home-help-link{position:absolute;right:1rem;top:1.05rem;color:#0b6edc;font-size:.82rem;font-weight:800;text-decoration:none}
.home-calculator-first #mainMode label[for="currentStatus"]{grid-column:1;grid-row:2}.home-calculator-first #currentStatus{grid-column:1;grid-row:3}
.home-calculator-first #mainMode label[for="targetStatus"]{grid-column:2;grid-row:2}.home-calculator-first #targetStatus{grid-column:2;grid-row:3}
.home-calculator-first #mainMode label[for="neededPoints"]{grid-column:1/-1;grid-row:4;margin-top:.28rem}.home-calculator-first #neededPoints{grid-column:1/-1;grid-row:5}
.home-calculator-first #mainMode>.section:first-child label{margin-top:0;font-size:.88rem;font-weight:750}.home-calculator-first #mainMode>.section:first-child select,.home-calculator-first #mainMode>.section:first-child input[type="number"]{min-height:52px;margin:.18rem 0 .25rem;padding:.68rem .72rem;border-radius:10px}
.home-calculator-first #mainMode>.section:nth-child(2){margin:0 0 .85rem;padding:.18rem 1rem 1rem;border-radius:0 0 18px 18px;box-shadow:0 10px 24px rgba(36,71,120,.09)}
.home-calculator-first #calculateButton{width:100%;min-height:58px;margin:.25rem 0 0;border:0;border-radius:12px;background:#0b6edc;color:#fff;box-shadow:0 5px 14px rgba(11,110,220,.22);font-size:1.08rem;font-weight:850}
.home-calculator-first #calculateButton::before{content:"🧮";margin-right:.48rem}
.home-calculator-first .calculator-advanced-settings{margin-top:.62rem!important}
.home-calculator-first .calculator-advanced-settings__toggle{justify-content:center!important;min-height:48px!important;padding:.58rem .75rem!important;border:1px solid #bfd8f6!important;border-radius:12px!important;background:#edf6ff!important;color:#164e87!important;font-weight:800!important}
.home-calculator-first .calculator-advanced-settings__toggle::before{content:"⚙️";margin-right:.45rem}
.home-calculator-first .result{margin-top:.65rem}.home-calculator-first .result-actions{margin-top:.55rem}
.home-calculator-first .result-guidance-links{margin-top:1rem;padding-top:.9rem;border-top:1px solid #dce7f4;text-align:left}
.home-calculator-first .result-guidance-links h3{margin:0;font-size:1.18rem;font-weight:850}.home-calculator-first .result-guidance-subtitle{margin:.15rem 0 .65rem;color:#64748b;font-size:.82rem}
.home-calculator-first .result-guidance-links ul{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.48rem;list-style:none;margin:0;padding:0}
.home-calculator-first .result-guidance-links li{margin:0;min-width:0}.home-calculator-first .result-guidance-links a{display:flex;flex-direction:column;justify-content:center;min-height:104px;padding:.62rem .52rem;border:1px solid #dae4f0;border-radius:14px;background:#fff;color:#1f2937;text-align:center;text-decoration:none;box-shadow:0 4px 14px rgba(31,41,55,.07)}
.home-calculator-first .result-guidance-links a span{font-size:.82rem;font-weight:800;line-height:1.35}.home-calculator-first .result-guidance-links a small{margin-top:.28rem;color:#64748b;font-size:.68rem;line-height:1.3}
.home-calculator-first .home-article-hub{margin-top:.9rem;padding:.9rem .85rem 1rem;border-radius:18px;overflow:hidden}
.home-calculator-first .home-section-heading{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-bottom:.65rem}.home-calculator-first .home-section-heading h2{margin:0;padding:0;border:0;font-size:1.18rem}.home-calculator-first .home-section-more{flex:0 0 auto;color:#0b6edc;font-size:.82rem;font-weight:800;text-decoration:none}
.home-calculator-first .home-article-carousel{display:flex;gap:.58rem;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding:.1rem .05rem .55rem;scrollbar-width:thin}
.home-calculator-first .home-article-carousel li{flex:0 0 30%;min-width:112px;scroll-snap-align:start}.home-calculator-first .home-article-carousel .article-link-card{height:100%;min-height:122px;padding:.68rem .58rem;border-radius:14px;box-sizing:border-box}.home-calculator-first .home-article-carousel .article-link-card::before{content:"📘";display:block;margin-bottom:.35rem;font-size:1.25rem}.home-calculator-first .home-article-carousel .article-link-tag{margin-bottom:.35rem;font-size:.64rem}.home-calculator-first .home-article-carousel .article-link-title{font-size:.78rem;line-height:1.38}.home-calculator-first .home-article-hub .article-drawer-note{margin:.4rem 0 0;font-size:.78rem}
@media(max-width:359px){.home-calculator-first #mainMode>.section:first-child{grid-template-columns:1fr}.home-calculator-first #mainMode label[for="currentStatus"]{grid-column:1;grid-row:2}.home-calculator-first #currentStatus{grid-column:1;grid-row:3}.home-calculator-first #mainMode label[for="targetStatus"]{grid-column:1;grid-row:4}.home-calculator-first #targetStatus{grid-column:1;grid-row:5}.home-calculator-first #mainMode label[for="neededPoints"]{grid-column:1;grid-row:6}.home-calculator-first #neededPoints{grid-column:1;grid-row:7}.home-calculator-first .home-help-link{display:none}.home-calculator-first .region-switch>button,.home-calculator-first .region-switch .region-more-toggle{font-size:.82rem;min-height:48px}.home-calculator-first .header-links>a[data-lang-key="linkGames"],.home-calculator-first .header-links>a[data-lang-key="linkArticles"]{padding:.62rem .58rem;font-size:.88rem}.home-calculator-first #main-title{font-size:1.48rem}.home-calculator-first .result-guidance-links ul{grid-template-columns:repeat(3,minmax(92px,1fr));overflow-x:auto}.home-calculator-first .home-article-carousel li{flex-basis:38%}}
@media(min-width:641px){.home-calculator-first #mainMode>.section:first-child,.home-calculator-first #mainMode>.section:nth-child(2){border-radius:16px;margin:.8em auto;padding:1.05em 1.15em;box-shadow:var(--section-shadow)}.home-calculator-first #mainMode>.section:first-child{display:block}.home-calculator-first #mainMode>.section:first-child>h2{margin-bottom:.8em;padding-bottom:.3em;font-size:1.3em}.home-calculator-first #mainMode>.section:first-child label,.home-calculator-first #mainMode>.section:first-child select,.home-calculator-first #mainMode>.section:first-child input[type="number"]{display:block;width:100%;margin-top:.4em}.home-calculator-first .home-help-link{position:static;display:inline-block;margin:-.45rem 0 .5rem}.home-calculator-first .calculator-advanced-settings__toggle{display:none!important}.home-calculator-first .calculator-advanced-settings,.home-calculator-first .calculator-advanced-settings__body{display:contents!important}}
@media(prefers-reduced-motion:reduce){.home-calculator-first *{scroll-behavior:auto!important;transition:none!important}}
${cssEnd}`;
const startIndex = css.indexOf(cssStart);
const endIndex = css.indexOf(cssEnd);
if (startIndex >= 0 && endIndex > startIndex) {
  css = css.slice(0, startIndex) + cssBlock + css.slice(endIndex + cssEnd.length);
} else {
  css = css.trimEnd() + '\n\n' + cssBlock + '\n';
}
write('style.css', css);

// Browser smoke: ensure the revised label and the primary CTA stay reachable on common phone sizes.
let smoke = read('.github/scripts/mobile-first-view-smoke.cjs');
smoke = replaceOnce(
  smoke,
  "    const currentStatus = document.getElementById('currentStatus');\n    if (!description || !title || !tabs || !currentStatus) return null;",
  "    const currentStatus = document.getElementById('currentStatus');\n    const calculateButton = document.getElementById('calculateButton');\n    const diaryTab = document.getElementById('tab-diary');\n    if (!description || !title || !tabs || !currentStatus || !calculateButton || !diaryTab) return null;",
  'smoke required nodes'
);
smoke = replaceOnce(
  smoke,
  '    const currentStatusRect = currentStatus.getBoundingClientRect();',
  '    const currentStatusRect = currentStatus.getBoundingClientRect();\n    const calculateRect = calculateButton.getBoundingClientRect();',
  'smoke calculate rect'
);
smoke = replaceOnce(
  smoke,
  '      currentStatusBottom: currentStatusRect.bottom,',
  '      currentStatusBottom: currentStatusRect.bottom,\n      calculateTop: calculateRect.top,\n      calculateBottom: calculateRect.bottom,\n      diaryLabel: diaryTab.textContent.trim(),',
  'smoke report fields'
);
smoke = replaceOnce(
  smoke,
  '        assert(layout.currentStatusTop < 620, `${width}px: first input is still too far down (${Math.round(layout.currentStatusTop)}px)`);',
  '        assert(layout.currentStatusTop < 590, `${width}px: first input is still too far down (${Math.round(layout.currentStatusTop)}px)`);\n        assert(layout.diaryLabel === \'ウィークリーリワード記録\', `${width}px: weekly reward label not updated: ${layout.diaryLabel}`);\n        if (width >= 390) assert(layout.calculateBottom <= layout.viewportHeight + 1, `${width}px: primary CTA is below the first viewport (${Math.round(layout.calculateBottom)}px)`);',
  'smoke mobile assertions'
);
smoke = replaceOnce(
  smoke,
  '      console.log(`ok - JP first view at ${width}px: ${layout.lineCount} line(s), first input y=${Math.round(layout.currentStatusTop)}`);',
  '      console.log(`ok - JP first view at ${width}px: ${layout.lineCount} line(s), first input y=${Math.round(layout.currentStatusTop)}, CTA bottom=${Math.round(layout.calculateBottom)}`);',
  'smoke log line'
);
write('.github/scripts/mobile-first-view-smoke.cjs', smoke);

console.log('Home Calculator-First source transform completed.');
