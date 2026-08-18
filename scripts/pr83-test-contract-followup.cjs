'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, content) { fs.writeFileSync(path.join(root, file), content, 'utf8'); }
function update(file, transform) {
  const original = read(file);
  const next = transform(original);
  if (next === original) throw new Error(`no test-contract changes applied: ${file}`);
  write(file, next);
  console.log(`updated ${file}`);
}
function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`missing test target: ${label}`);
  return content.replace(from, to);
}

update('tests/full-integrity-audit.test.cjs', content => replaceRequired(
  content,
  `  assert.ok(!consent.includes("if (status !== 'granted') callbacks.clear()"));\n  assert.match(consent, /else callbacks\\.add\\(callback\\)/);`,
  `  assert.match(consent, /else analyticsCallbacks\\.add\\(callback\\)/);\n  assert.match(consent, /else adCallbacks\\.add\\(callback\\)/);\n  assert.match(consent, /whenAnalyticsGranted/);\n  assert.match(consent, /whenAdsAllowed/);`,
  'pending consent callback contract'
));

update('tests/main-calculator-ui.test.cjs', content => {
  content = replaceRequired(content,
    "test('4言語に自動入力の獲得率と通常倍率の文言が用意されている', () => {",
    "test('4言語に通常獲得率とキャンペーン特別獲得率の文言が用意されている', () => {",
    'main calculator test title');
  const oldArray = `  const expectedCopy = [\n    '100円あたりの獲得率（自動入力・編集可）',\n    'キャンペーン倍率（通常は1倍）',\n    'Points per $1 (auto-filled, editable)',\n    'Campaign multiplier (normally 1×)',\n    '₩1,000당 적립률 (자동 입력·수정 가능)',\n    '캠페인 배율 (보통 1배)',\n    '每 NT$30 獲得點數（自動帶入，可修改）',\n    '活動倍率（通常為 1 倍）'\n  ];`;
  const newArray = `  const expectedCopy = [\n    '通常獲得率（自動入力・編集可）',\n    'キャンペーン特別獲得率（例：3pt/100円）',\n    'Base earn rate per $1 (auto-filled, editable)',\n    'Promotion special earn rate (e.g. 3 pt / $1)',\n    '기본 적립률 (자동 입력·수정 가능)',\n    '캠페인 특별 적립률 (예: 1,000원당 3pt)',\n    '基本獲點率（自動帶入，可修改）',\n    '活動特別獲點率（例：每 NT$30 3 點）'\n  ];`;
  return replaceRequired(content, oldArray, newArray, 'localized special earn rate copy');
});

update('tests/monetization-search-quality.test.cjs', content => {
  content = replaceRequired(content,
    "assert.ok(article.includes('PlayPointConsent.whenGranted(loadArticleAdsense)'));",
    "assert.ok(article.includes('PlayPointConsent.whenAdsAllowed(loadArticleAdsense)'));",
    'article ad gate');
  content = replaceRequired(content,
    "assert.ok(thirdParty.includes('runAfterConsent(initializeManagedAds)'));",
    "assert.ok(thirdParty.includes(\"runAfterConsent(initializeManagedAds, 'ads')\"));",
    'managed ad purpose gate');
  return content;
});

update('tests/playpoint-product-guards.test.cjs', content => {
  content = replaceRequired(content,
    "  assert.ok(consent.includes('whenGranted'));",
    "  assert.ok(consent.includes('whenAnalyticsGranted'));\n  assert.ok(consent.includes('whenAdsAllowed'));\n  assert.ok(consent.includes('getGoogleConsentModeValues'));\n  assert.ok(consent.includes('consents[7]'));",
    'consent contract guards');
  content = replaceRequired(content,
    "  assert.ok(blog.includes('PlayPointConsent.whenGranted'));\n  assert.ok(article.includes('PlayPointConsent.whenGranted'));",
    "  assert.ok(blog.includes('whenAnalyticsGranted'));\n  assert.ok(article.includes('PlayPointConsent.whenAdsAllowed'));",
    'blog and article purpose gates');
  content = replaceRequired(content,
    "  assert.match(components, /runAfterConsent\\(loadBlogAdsense\\)/);",
    "  assert.match(components, /loadBlogAdsense\\(\\);/);\n  assert.match(articleSource, /whenAdsAllowed\\(loadArticleAdsense\\)/);\n  assert.match(source, /runAfterConsent\\(initializeManagedAds, 'ads'\\)/);",
    'AdSense bootstrap and manual slot gate');
  return content;
});

console.log('PR #83 test contracts updated for the reviewed consent/monetization design.');
