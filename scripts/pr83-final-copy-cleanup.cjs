'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function update(file, transform) {
  const absolute = path.join(root, file);
  const original = fs.readFileSync(absolute, 'utf8');
  const next = transform(original);
  if (next === original) throw new Error(`no cleanup changes applied: ${file}`);
  fs.writeFileSync(absolute, next, 'utf8');
  console.log(`updated ${file}`);
}
function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`missing cleanup target: ${label}`);
  return content.replace(from, to);
}

update('scripts/intl-seo-content.cjs', content => {
  content = replaceRequired(
    content,
    'A 2x promotion can reduce the spending needed for a target, but only if the purchase is eligible. Use this page to open the calculator with a 2x multiplier and compare it with regular earning.',
    'This legacy “2x” page models a final special earn rate of 2 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 2.',
    'English 2x lead'
  );
  content = replaceRequired(content,
    "cta: 'Calculate with 2 pt / $1',\n      secondary: 'Compare 3x promotion',\n      secondaryHref: '/campaign/3x/'",
    "cta: 'Calculate with 2 pt / $1',\n      secondary: 'Compare 3x promotion',\n      secondaryHref: '/en/campaign/3x/'",
    'English 2x secondary href');
  content = replaceRequired(content,
    "cta: '2배로 계산하기',\n      secondary: '3배 캠페인 비교',\n      secondaryHref: '/campaign/3x/'",
    "cta: '1,000원당 2pt로 계산하기',\n      secondary: '3배 캠페인 비교',\n      secondaryHref: '/ko/campaign/3x/'",
    'Korean 2x CTA and href');
  content = replaceRequired(content,
    "['1배와 2배 비교', '먼저 1배 기준을 보고 2배로 바꾸면 캠페인을 기다릴 가치가 있는지 판단하기 쉽습니다.']",
    "['기본 적립률과 1,000원당 2pt 비교', '현재 등급의 기본 적립률을 기준으로 보고, Google Play에 해당 결제의 최종 특별 적립률이 1,000원당 2pt로 표시될 때만 2를 입력해 비교하세요.']",
    'Korean 2x section');
  content = replaceRequired(content,
    "['2배면 금액이 정확히 절반인가요?', '항상 그렇지는 않습니다. 기본 적립, 등급, 상한, 대상 금액에 따라 달라집니다.']",
    "['2배면 금액이 정확히 절반인가요?', '아닙니다. 1,000원당 2pt의 특별 적립률은 현재 등급 기본 적립률과 비교하는 값이며, 기본 적립률에 2를 곱하지 않습니다. 상한과 대상 조건도 확인해야 합니다.']",
    'Korean 2x FAQ');
  content = replaceRequired(content,
    "cta: '用 2 倍計算',\n      secondary: '比較 3 倍活動',\n      secondaryHref: '/campaign/3x/'",
    "cta: '以每 NT$30 2 點計算',\n      secondary: '比較 3 倍活動',\n      secondaryHref: '/tw/campaign/3x/'",
    'Traditional Chinese 2x CTA and href');
  content = replaceRequired(content,
    "['比較 1 倍與 2 倍', '先看 1 倍基準，再切換到 2 倍，就能判斷是否值得等待活動。']",
    "['比較基本獲點率與每 NT$30 2 點', '先以目前等級基本獲點率為基準，只有 Google Play 對該筆消費顯示最終特別獲點率為每 NT$30 2 點時，才輸入 2 進行比較。']",
    'Traditional Chinese 2x section');
  content = replaceRequired(content,
    "['2 倍會讓成本剛好減半嗎？', '不一定，會受到基本回饋、等級、上限與適用金額影響。']",
    "['2 倍會讓成本剛好減半嗎？', '不會直接減半。每 NT$30 2 點的特別獲點率是與會員等級基本獲點率比較，不是把基本獲點率乘以 2；上限與適用條件也要確認。']",
    'Traditional Chinese 2x FAQ');
  content = content.replaceAll('Check: 1x, 2x, 3x and eligibility', 'Check: base rate, special earn rate, and eligibility');
  content = content.replaceAll('確認: 1倍, 2倍, 3배, 대상 조건', '확인: 기본 적립률, 특별 적립률, 대상 조건');
  content = content.replaceAll('確認: 1 倍、2 倍、3 倍與資格', '確認：基本獲點率、特別獲點率與資格');
  return content;
});

update('tests/full-integrity-audit.test.cjs', content => replaceRequired(
  content,
  "  assert.ok(!source.includes('Preset: 2x multiplier'));\n  assert.ok(!source.includes('초기 조건: 2배 배율'));\n  assert.ok(!source.includes('預設: 2 倍倍率'));\n  assert.ok(source.includes('special earn rate of 2 points per $1'));",
  "  assert.ok(!source.includes('Preset: 2x multiplier'));\n  assert.ok(!source.includes('with a 2x multiplier'));\n  assert.ok(!source.includes('초기 조건: 2배 배율'));\n  assert.ok(!source.includes('預設: 2 倍倍率'));\n  assert.ok(source.includes('special earn rate of 2 points per $1'));\n  assert.ok(source.includes(\"secondaryHref: '/en/campaign/3x/'\"));\n  assert.ok(source.includes(\"secondaryHref: '/ko/campaign/3x/'\"));\n  assert.ok(source.includes(\"secondaryHref: '/tw/campaign/3x/'\"));",
  '2x regression guard'
));

console.log('PR #83 final 2x copy cleanup complete.');
