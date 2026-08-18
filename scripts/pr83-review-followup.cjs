'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, content) { fs.writeFileSync(path.join(root, file), content, 'utf8'); }
function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`missing replacement target: ${label || from.slice(0, 80)}`);
  return content.replaceAll(from, to);
}
function update(file, transform) {
  const original = read(file);
  const next = transform(original);
  if (next !== original) {
    write(file, next);
    console.log(`updated ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}

update('js/config.js', content => {
  content = replaceRequired(content,
    'Promotion special earn rate (e.g. 3 pt/labelMultiplier: )',
    'Promotion special earn rate (e.g. 3 pt / $1)', 'broken English multiplier label');
  content = replaceRequired(content,
    'Promotion special earn rate (e.g. 3 pt/labelMultiplierReverse: )',
    'Promotion special earn rate (e.g. 3 pt / $1)', 'broken English reverse multiplier label');
  content = content.replaceAll('campaign multipliers', 'promotion special earn rates');
  content = content.replaceAll('キャンペーン倍率込みの目安', 'Google Playに表示されたキャンペーン特別獲得率を反映した目安');
  content = content.replaceAll('캠페인 배율', '캠페인 특별 적립률');
  content = content.replaceAll('活動倍率', '活動特別獲點率');
  content = content.replaceAll(
    '倍率で表示されるオファーは、隣の「キャンペーン倍率」を使います。計算機は対象可否や上限を確認できないため、購入前に公式画面をご確認ください。',
    '「3倍」などの見出しだけでなく、オファー詳細に表示される最終的な「100円あたり何ポイント」を確認し、その特別獲得率を隣の欄へ入力してください。通常獲得率へ倍率を掛けず、対象可否や上限は購入前に公式画面をご確認ください。');
  content = content.replaceAll(
    'If the offer is shown as “3x,” use Campaign multiplier instead. The calculator cannot verify eligibility, activation, or caps.',
    'If an offer headline says “3x,” open the offer details and enter the final special earn rate shown per $1. Do not multiply your tier base rate; confirm eligibility, activation, and caps in Google Play.');
  content = content.replaceAll(
    '“3배”처럼 표시된 혜택은 이벤트 배율을 사용합니다. 계산기는 대상 여부·활성화·상한을 확인할 수 없습니다.',
    '“3배” 같은 제목만 보지 말고 혜택 상세에 표시된 1,000원당 최종 특별 적립률을 확인해 입력하세요. 등급 기본 적립률에 배율을 곱하지 않으며 대상 여부·활성화·상한은 Google Play에서 확인해야 합니다.');
  content = content.replaceAll(
    '若活動顯示「3 倍」，請使用活動特別獲點率。計算器無法確認資格、啟用狀態或上限。',
    '若活動標題顯示「3 倍」，請打開活動詳情並輸入每 NT$30 顯示的最終特別獲點率；不要把等級基本獲點率乘上倍率。資格、啟用與上限請以 Google Play 為準。');
  return content;
});

update('index.html', content => {
  content = content.replaceAll('課金額やキャンペーン倍率を目安で逆算できます。', '課金額やGoogle Playに表示されたキャンペーン特別獲得率を反映して目安を逆算できます。');
  content = content.replaceAll('課金額やキャンペーン倍率込みの目安を逆算できます。', '課金額やGoogle Playに表示されたキャンペーン特別獲得率を反映した目安を逆算できます。');
  content = content.replaceAll('必要な課金額やキャンペーン倍率込みの目安を確認できます。', '必要な課金額やGoogle Playに表示されたキャンペーン特別獲得率を反映した目安を確認できます。');
  content = content.replaceAll('現在の基本還元ポイントやキャンペーン倍率に基づいて必要な課金額を算出します。', '現在の通常獲得率とGoogle Playに表示されたキャンペーン特別獲得率を比較し、適用される高い獲得率を使って必要な課金額を算出します。');
  content = content.replaceAll('100円あたりの獲得率（自動入力・編集可）', '通常獲得率（自動入力・編集可）');
  content = content.replaceAll('キャンペーン倍率（通常は1倍）', 'キャンペーン特別獲得率（例：3pt/100円）');
  return content;
});

update('blog/components.js', content => {
  const oldRun = `    function runAfterConsent(callback) {\n        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])\n            .then(() => window.PlayPointConsent.whenGranted(callback))\n            .catch((error) => console.error('Consent manager load failed:', error));\n    }`;
  const newRun = `    function runAfterConsent(callback, purpose = 'analytics') {\n        return Promise.all([ensureAnalyticsCore(), ensureConsentManager()])\n            .then(() => {\n                const consent = window.PlayPointConsent;\n                if (purpose === 'ads' && typeof consent.whenAdsAllowed === 'function') {\n                    consent.whenAdsAllowed(callback);\n                    return;\n                }\n                if (typeof consent.whenAnalyticsGranted === 'function') {\n                    consent.whenAnalyticsGranted(callback);\n                    return;\n                }\n                consent.whenGranted(callback);\n            })\n            .catch((error) => console.error('Consent manager load failed:', error));\n    }`;
  content = replaceRequired(content, oldRun, newRun, 'blog consent gate');
  const oldSetup = `    function setupBlogAdsense() {\n        if (!window.location.pathname.includes('/blog')) return;\n        // 固定600pxのスクロール条件を置かず、同意状態に従ってasync取得を開始する。\n        void runAfterConsent(loadBlogAdsense);\n    }`;
  const newSetup = `    function setupBlogAdsense() {\n        if (!(isBlogPage || isArticlePageTop)) return;\n        // Google Privacy & Messaging / TCFの初期化に必要な非同期ライブラリは早期取得する。\n        // 手動広告枠のpushはarticle.js側でad_storage許可後にだけ実行する。\n        loadBlogAdsense();\n    }`;
  content = replaceRequired(content, oldSetup, newSetup, 'blog AdSense bootstrap');
  return content;
});

update('blog/article.js', content => {
  content = content.replaceAll('通常時・2倍・3倍で必要額を比べて、キャンペーンを待つ価値があるか確認できます。', '通常獲得率と、Google Playに表示された2pt/100円・3pt/100円などの特別獲得率で必要額を比べ、キャンペーンを待つ価値があるか確認できます。');
  content = content.replaceAll("{ href: '../campaign/2x/', text: '2倍で計算' }", "{ href: '../campaign/2x/', text: '2pt/100円で計算' }");
  content = content.replaceAll("{ href: '../campaign/3x/', text: '3倍で計算' }", "{ href: '../campaign/3x/', text: '3pt/100円で計算' }");
  const oldGate = `    function scheduleArticleAdsenseLoad() {\n        if (!window.PlayPointConsent) return;\n        window.PlayPointConsent.whenGranted(loadArticleAdsense);\n    }`;
  const newGate = `    function scheduleArticleAdsenseLoad() {\n        if (!window.PlayPointConsent) return;\n        if (typeof window.PlayPointConsent.whenAdsAllowed === 'function') {\n            window.PlayPointConsent.whenAdsAllowed(loadArticleAdsense);\n            return;\n        }\n        window.PlayPointConsent.whenGranted(loadArticleAdsense);\n    }`;
  content = replaceRequired(content, oldGate, newGate, 'article ad consent gate');
  return content;
});

update('scripts/intl-seo-content.cjs', content => {
  content = content.replaceAll('campaign multipliers', 'promotion special earn rates');
  content = content.replaceAll('campaign multiplier', 'promotion special earn rate');
  content = content.replaceAll('캠페인 배율', '캠페인 특별 적립률');
  content = content.replaceAll('活動倍率', '活動特別獲點率');
  content = content.replaceAll(
    'A 2x promotion can reduce the spending needed for a target, but only if the purchase is eligible. Use this page to open the calculator with a 2x promotion special earn rate and compare it with regular earning.',
    'This legacy “2x” page models a final special earn rate of 2 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 2.');
  content = content.replaceAll(
    "['Compare 1x and 2x', 'Run the estimate at 1x first, then switch to 2x. The difference shows whether waiting for the campaign matters.']",
    "['Compare your base rate with 2 pt / $1', 'Use your normal tier earn rate as the baseline, then enter 2 only when Google Play shows a final special earn rate of 2 points per $1 for the eligible purchase.']");
  content = content.replaceAll(
    "['Does 2x make the cost exactly half?', 'Not always. It depends on base earning, status, caps, and eligible purchase amount.']",
    "['Does 2x make the cost exactly half?', 'Not necessarily. A 2-point special earn rate is compared with your tier base rate rather than multiplying that base rate by 2; caps and eligibility also matter.']");
  content = content.replaceAll('이 페이지는 2배 배율로 계산기를 열어 일반 조건과 비교할 수 있게 합니다.', '이 기존 “2배” 페이지는 Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 2pt로 표시될 때 그 값을 사용하며, 등급 기본 적립률에 2를 곱하지 않습니다.');
  content = content.replaceAll('這頁會以 2 倍倍率開啟計算機，方便與一般條件比較。', '這個保留「2 倍」搜尋名稱的頁面，僅在 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 2 點時使用 2，不會把等級基本獲點率乘以 2。');
  content = content.replaceAll('Preset: 2x multiplier', 'Preset: special earn rate 2 pt / $1');
  content = content.replaceAll('초기 조건: 2배 배율', '초기 조건: 특별 적립률 1,000원당 2pt');
  content = content.replaceAll('預設: 2 倍倍率', '預設：特別獲點率每 NT$30 2 點');
  return content;
});

update('scripts/article-editorial-structure.cjs', content => {
  content = content.replaceAll('2倍・3倍は対象商品の対象期間内購入にだけ適用して試算します。', '2pt/100円・3pt/100円などの特別獲得率は、Google Playにその最終獲得率が表示された対象購入にだけ適用して試算します。');
  content = content.replaceAll('通常・2倍・3倍の引用用比較表を見る', '通常獲得率・特別獲得率の引用用比較表を見る');
  content = content.replaceAll('キャンペーンを待つかは、予定している購入だけを通常・2倍・3倍で比較し、対象アプリ、期間、開始操作、上限を確認して判断します。', 'キャンペーンを待つかは、予定している購入だけを通常獲得率とGoogle Playに表示された特別獲得率で比較し、対象アプリ、期間、開始操作、上限を確認して判断します。');
  content = content.replaceAll('倍率は対象商品と対象期間へだけ適用する必要があります。', '特別獲得率はGoogle Playにその最終獲得率が表示された対象商品・対象期間へだけ適用する必要があります。');
  content = content.replaceAll('Google Playに表示されていない倍率を確定情報として扱うことはできません。', 'Google Playに表示されていない特別獲得率を確定情報として扱うことはできません。');
  return content;
});

update('scripts/article-static-usability.cjs', content => {
  if (!content.includes('function normalizeSharedArticleCopy(html)')) {
    const marker = 'function synchronizeArticleStaticUsability(rootDir) {';
    const helper = `function normalizeSharedArticleCopy(html) {\n  return html\n    .replaceAll('不足ポイントとキャンペーン倍率から、目標ランクまでの必要課金額を即シミュレーション！', '不足ポイントとGoogle Playに表示されたキャンペーン特別獲得率から、目標ランクまでの必要課金額をシミュレーションできます。')\n    .replaceAll('<span class="sidebar-event-tag">5と0の日</span>\\n                        <span><strong>楽天市場 5と0のつく日！</strong> ギフトコード認定店でポイント還元UP</span>', '<span class="sidebar-event-tag">購入前確認</span>\\n                        <span><strong>ギフトコードの還元条件を確認</strong> 付与率・上限・エントリー要否は購入時の表示を確認</span>')\n    .replaceAll('Playポイントは、ゲーム内アイテムクーポンに交換すると「1pt = 最大2円〜3円相当」の価値になることがあります！', 'Play Pointsの交換先や必要ポイント数は時期・国・アカウントで変わります。「使う」画面に表示された現在の条件を確認してください。');\n}\n\n`;
    content = replaceRequired(content, marker, helper + marker, 'article static helper insertion');
  }
  content = content.replace(
    'const next = insertStaticPrompt(insertStaticHeader(original));',
    'const next = normalizeSharedArticleCopy(insertStaticPrompt(insertStaticHeader(original)));');
  content = content.replace(
    '  removeStaticPrompt,\n  synchronizeArticleStaticUsability',
    '  removeStaticPrompt,\n  normalizeSharedArticleCopy,\n  synchronizeArticleStaticUsability');
  return content;
});

// Clean currently committed Japanese article outputs now; the canonical builder will repeat the same normalization.
for (const name of fs.readdirSync(path.join(root, 'articles')).filter(name => name.endsWith('.html'))) {
  update(`articles/${name}`, content => content
    .replaceAll('不足ポイントとキャンペーン倍率から、目標ランクまでの必要課金額を即シミュレーション！', '不足ポイントとGoogle Playに表示されたキャンペーン特別獲得率から、目標ランクまでの必要課金額をシミュレーションできます。')
    .replaceAll('<span class="sidebar-event-tag">5と0の日</span>\n                        <span><strong>楽天市場 5と0のつく日！</strong> ギフトコード認定店でポイント還元UP</span>', '<span class="sidebar-event-tag">購入前確認</span>\n                        <span><strong>ギフトコードの還元条件を確認</strong> 付与率・上限・エントリー要否は購入時の表示を確認</span>')
    .replaceAll('Playポイントは、ゲーム内アイテムクーポンに交換すると「1pt = 最大2円〜3円相当」の価値になることがあります！', 'Play Pointsの交換先や必要ポイント数は時期・国・アカウントで変わります。「使う」画面に表示された現在の条件を確認してください。'));
}

update('tests/full-integrity-audit.test.cjs', content => {
  const oldConsent = `test('Consent Modeは広告用途をPurpose 1だけで一括許可しない', () => {\n  const consent = read('js/consent.js');\n  assert.match(consent, /consents\\[3\\]/);\n  assert.match(consent, /consents\\[4\\]/);\n  assert.match(consent, /ad_user_data: personalizedAdsAllowed/);\n  assert.match(consent, /ad_personalization: personalizedAdsAllowed/);\n});`;
  const newConsent = `test('ConsentはGoogleFCを一次情報にしTCFフォールバックでPurpose 7まで扱う', () => {\n  const consent = read('js/consent.js');\n  assert.match(consent, /gtag_enable_tcf_support = true/);\n  assert.match(consent, /CONSENT_MODE_DATA_READY/);\n  assert.match(consent, /getGoogleConsentModeValues/);\n  assert.match(consent, /consents\\[7\\]/);\n  assert.match(consent, /whenAnalyticsGranted/);\n  assert.match(consent, /whenAdsAllowed/);\n  assert.doesNotMatch(consent, /settleWithoutTcf/);\n});`;
  if (content.includes(oldConsent)) content = content.replace(oldConsent, newConsent);
  const extra = `\n\ntest('レビューで見つかった表示破損と旧倍率コピーを残さない', () => {\n  const config = read('js/config.js');\n  const simplified = read('js/main-calculator-ui.js');\n  assert.ok(!config.includes('pt/labelMultiplier'));\n  assert.ok(!config.includes('pt/labelMultiplierReverse'));\n  assert.ok(!simplified.includes('Campaign multiplier (normally 1×)'));\n  assert.ok(simplified.includes('Promotion special earn rate (e.g. 3 pt / $1)'));\n});\n\ntest('LP収益セクションはcanonical buildで冪等に同期される', () => {\n  const source = read('scripts/insert-lp-monetization.cjs');\n  const build = read('scripts/build-html.js');\n  assert.ok(source.includes('課金前にやっておくべき実質割引テクニック'));\n  assert.ok(source.includes('課金前に確認したいギフトコード購入条件'));\n  assert.ok(source.includes('normalizeLpContent'));\n  assert.ok(build.includes('applyLpMonetization(rootDir)'));\n  for (const file of ['campaign/2x/index.html', 'campaign/3x/index.html']) {\n    const html = read(file);\n    assert.ok(!html.includes('ポイント還元の対象になる場合</strong>されます'));\n    assert.ok(!html.includes('ポイント二重取り'));\n    assert.equal((html.match(/課金前に確認したいギフトコード購入条件/g) || []).length, 1, file);\n  }\n});\n\ntest('国際2xページも最終特別獲得率として説明する', () => {\n  const source = read('scripts/intl-seo-content.cjs');\n  assert.ok(!source.includes('Preset: 2x multiplier'));\n  assert.ok(!source.includes('초기 조건: 2배 배율'));\n  assert.ok(!source.includes('預設: 2 倍倍率'));\n  assert.ok(source.includes('special earn rate of 2 points per $1'));\n});\n\ntest('記事共通導線は固定交換価値や旧キャンペーン倍率を断定しない', () => {\n  const source = read('scripts/article-static-usability.cjs');\n  assert.ok(source.includes('Play Pointsの交換先や必要ポイント数は時期・国・アカウントで変わります'));\n  for (const name of fs.readdirSync(path.join(root, 'articles')).filter(name => name.endsWith('.html'))) {\n    const html = read('articles/' + name);\n    assert.ok(!html.includes('不足ポイントとキャンペーン倍率から'), name);\n    assert.ok(!html.includes('1pt = 最大2円〜3円相当'), name);\n  }\n});`;
  if (!content.includes("レビューで見つかった表示破損と旧倍率コピーを残さない")) content += extra;
  return content;
});

console.log('PR #83 review follow-up source normalization complete.');
