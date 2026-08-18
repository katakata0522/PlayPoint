'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, content) { fs.writeFileSync(path.join(root, file), content, 'utf8'); }
function replaceExact(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`target not found: ${label}`);
  return source.replace(before, after);
}
function replaceFieldOccurrences(source, field, values) {
  let index = 0;
  const pattern = new RegExp(`(${field}: ')[^']*(')`, 'g');
  const next = source.replace(pattern, (_match, prefix, suffix) => {
    if (index >= values.length) throw new Error(`too many ${field} occurrences`);
    return `${prefix}${values[index++]}${suffix}`;
  });
  if (index !== values.length && !field.startsWith('reward')) throw new Error(`${field}: expected ${values.length}, got ${index}`);
  return next;
}

// --- Game calculator: align country rules and remove fixed redemption-value claims. ---
{
  const file = 'scripts/generate-game-simulators.cjs';
  let source = read(file);

  // US: Diamond rate is currently 1.6 pt / $1.
  source = replaceExact(source,
    "      { val: '1.75', label: 'Diamond ($1 = 1.75pt)' }",
    "      { val: '1.6', label: 'Diamond ($1 = 1.6pt)' }",
    'US Diamond rate');

  // South Korea: official current level rates.
  source = replaceExact(source,
    "      { val: '1.2', label: '골드 (1,000원=1.2pt)' },\n      { val: '1.4', label: '플래티넘 (1,000원=1.4pt)' },\n      { val: '1.75', label: '다이아몬드 (1,000원=1.75pt)' }",
    "      { val: '1.3', label: '골드 (1,000원=1.3pt)' },\n      { val: '1.6', label: '플래티넘 (1,000원=1.6pt)' },\n      { val: '2.0', label: '다이아몬드 (1,000원=2pt)' }",
    'KR status rates');

  // Taiwan: official current rates match the 250/1000/4000/15000 structure.
  source = replaceExact(source,
    "      { val: '1.1', label: '銀級（NT$30 = 1.1點）' },\n      { val: '1.2', label: '金級（NT$30 = 1.2點）' },\n      { val: '1.4', label: '白金級（NT$30 = 1.4點）' },\n      { val: '1.75', label: '鑽石級（NT$30 = 1.75點）' }",
    "      { val: '1.25', label: '銀級（NT$30 = 1.25點）' },\n      { val: '1.5', label: '金級（NT$30 = 1.5點）' },\n      { val: '1.75', label: '白金級（NT$30 = 1.75點）' },\n      { val: '2.0', label: '鑽石級（NT$30 = 2點）' }",
    'TW status rates');

  source = replaceFieldOccurrences(source, 'resValueLabel', [
    '交換価値（Play画面で確認）',
    'Redemption value (check Play)',
    '교환 가치 (Play 화면 확인)',
    '兌換價值（請以 Play 畫面為準）'
  ]);
  source = replaceFieldOccurrences(source, 'resRankLabel', [
    '0ptから見た参考ランク',
    'Reference level from 0 pts',
    '0pt 기준 참고 등급',
    '以 0 點起算的參考等級'
  ]);
  source = replaceFieldOccurrences(source, 'resProgressTitle', [
    '0ptから見た参考進捗',
    'Reference progress from 0 pts',
    '0pt 기준 참고 진행도',
    '以 0 點起算的參考進度'
  ]);
  source = replaceFieldOccurrences(source, 'disclaimerText', [
    '※獲得ポイントはGoogle Play公式の国別通常獲得率と四捨五入ルールを基準にした目安です。ランク表示は年間累計0ptから見た参考で、現在の年間進捗は反映しません。購入前にGoogle Play画面の獲得予定ポイントとステータス進捗をご確認ください。',
    '※Point estimates use the current US base rates and Google Play rounding rules. The level display is only a reference starting from 0 annual points and does not include your current yearly progress. Check the Play purchase screen and level progress before checkout.',
    '※포인트 예상치는 현재 대한민국 공식 기본 적립률과 Google Play 반올림 규칙을 기준으로 합니다. 등급 표시는 연간 누적 0pt에서 시작한 참고값이며 현재 연간 진행도는 반영하지 않습니다. 결제 전에 Google Play 화면의 예상 포인트와 등급 진행도를 확인하세요.',
    '※點數為依目前台灣官方基本回饋率與 Google Play 四捨五入規則計算的參考值。等級顯示僅以年度累積 0 點起算，不包含你目前的年度進度；付款前請以 Google Play 畫面的預計點數與等級進度為準。'
  ]);
  source = replaceFieldOccurrences(source, 'rewardCompareTitle', [
    'Play Points「使う」で確認できる交換先',
    'Redemption options shown in Play Points',
    'Play Points 사용 탭에서 확인할 교환처',
    '請在 Play Points「使用」頁面確認兌換選項'
  ]);
  source = replaceFieldOccurrences(source, 'rewardCouponRate', [
    '必要ポイント・割引額は表示条件で確認',
    'Points and discount vary by shown offer',
    '필요 포인트와 할인액은 표시된 조건 확인',
    '所需點數與折扣額依顯示優惠為準'
  ]);
  source = replaceFieldOccurrences(source, 'rewardCouponDesc', [
    '対象ゲームの割引クーポンが表示される場合があります。必要ポイント、割引額、最低購入額、有効期限はPlay Pointsの「使う」に表示された条件を基準にしてください。',
    'Game-specific coupons may appear in Play Points. Use the points cost, discount, minimum purchase, and expiry shown in your Play Points account as the source of truth.',
    '대상 게임 할인 쿠폰이 표시될 수 있습니다. 필요한 포인트, 할인액, 최소 결제 금액, 유효기간은 Play Points의 사용 화면에 표시된 조건을 기준으로 확인하세요.',
    'Play Points 可能會顯示特定遊戲折價券。所需點數、折扣額、最低消費與期限，請以你帳戶「使用」頁面顯示的條件為準。'
  ]);
  source = replaceFieldOccurrences(source, 'rewardDirectRate', [
    '交換内容・必要ポイントは表示中のオファーで確認',
    'Contents and points vary by shown offer',
    '교환 내용과 필요 포인트는 표시된 오퍼 확인',
    '內容與所需點數依顯示優惠為準'
  ]);
  source = replaceFieldOccurrences(source, 'rewardDirectDesc', [
    '対象ゲームのゲーム内アイテムとポイントを交換できる場合があります。内容や必要ポイントは国・時期・アカウントで異なるため、Play Pointsの「使う」を確認してください。',
    'Eligible in-game items may be available for points. Availability and points cost can vary by country, time, and account, so check the Play Points redemption screen.',
    '대상 게임의 인게임 아이템과 포인트를 교환할 수 있는 경우가 있습니다. 제공 여부와 필요 포인트는 국가, 시기, 계정에 따라 달라질 수 있으므로 Play Points 사용 화면을 확인하세요.',
    '部分遊戲可能提供點數兌換遊戲內道具。是否提供與所需點數可能因地區、時間與帳戶而異，請查看 Play Points「使用」頁面。'
  ]);
  source = replaceFieldOccurrences(source, 'rewardCreditRate', [
    '必要ポイント・受取額はPlay Points画面で確認',
    'Points and credit amount: check Play Points',
    '필요 포인트와 크레딧 금액은 Play Points에서 확인',
    '所需點數與額度請以 Play Points 畫面為準'
  ]);
  source = replaceFieldOccurrences(source, 'rewardCreditDesc', [
    'Google Playクレジットと交換できる場合があります。交換条件はPlay Pointsの「使う」に表示された内容を確認してください。ポイント交換で受け取ったPlayクレジットの有効期限は1年です。',
    'Google Play Credit may be available as a redemption option. Check the points cost and credit amount shown in Play Points. Play Credit received from points expires after one year.',
    'Google Play 크레딧으로 교환할 수 있는 경우가 있습니다. 필요한 포인트와 금액은 Play Points 사용 화면을 확인하세요. 포인트로 받은 Play 크레딧은 1년 후 만료됩니다.',
    '可兌換 Google Play 餘額時，請以 Play Points「使用」頁面顯示的所需點數與額度為準。使用點數取得的 Play 餘額會在一年後到期。'
  ]);
  source = replaceFieldOccurrences(source, 'giftCardCtaText', [
    '楽天市場のGoogle Play ギフトコード認定店では、楽天側のキャンペーンや会員条件に応じてポイント還元が付く場合があります。購入前に当日の還元条件・上限を確認してください。',
    'Check the gift card guide for how Google Play Gift Cards interact with points, promotions, and account conditions before purchase.',
    'Google Play 기프트카드 사용 시 포인트 적립 여부와 조건은 실제 Google Play 결제 화면과 계정 조건을 확인하세요.',
    '使用 Google Play 禮物卡前，請先確認你的 Play Points 帳戶條件、付款畫面與當期活動規則。'
  ]);
  source = source.replace(/交換レート/g, '使い道').replace(/交換レートも/g, '使い道も');
  write(file, source);
}

{
  const file = 'games/game-sim.js';
  let source = read(file);
  source = replaceExact(source,
    "                { name: 'Diamond', points: 10000, rate: 1.75 }",
    "                { name: 'Diamond', points: 10000, rate: 1.6 }",
    'US runtime Diamond');
  source = replaceExact(source,
    "                { name: '골드', points: 600, rate: 1.2 },\n                { name: '플래티넘', points: 3000, rate: 1.4 },\n                { name: '다이아몬드', points: 10000, rate: 1.75 }",
    "                { name: '골드', points: 600, rate: 1.3 },\n                { name: '플래티넘', points: 2400, rate: 1.6 },\n                { name: '다이아몬드', points: 15000, rate: 2.0 }",
    'KR runtime levels');
  source = replaceExact(source,
    "                { name: '銀級', points: 250, rate: 1.1 },\n                { name: '金級', points: 1000, rate: 1.2 },\n                { name: '白金級', points: 5000, rate: 1.4 },\n                { name: '鑽石級', points: 15000, rate: 1.75 }",
    "                { name: '銀級', points: 250, rate: 1.25 },\n                { name: '金級', points: 1000, rate: 1.5 },\n                { name: '白金級', points: 4000, rate: 1.75 },\n                { name: '鑽石級', points: 15000, rate: 2.0 }",
    'TW runtime levels');

  source = replaceExact(source,
    "            savingsText: (min, max) => `（実質 約${min.toLocaleString()}円〜${max.toLocaleString()}円相当おトク！）`,",
    "            savingsText: () => '',\n            redeemCheckText: 'Play Points「使う」で交換条件を確認',",
    'JA dynamic savings');
  source = replaceExact(source,
    "            savingsText: () => '',\n            ranks: [",
    "            savingsText: () => '',\n            redeemCheckText: 'Check redemption options in Play Points',\n            ranks: [",
    'EN redemption text');
  // The previous replace affects the first occurrence after JA; add KR/TW texts by locating locale blocks.
  source = source.replace(
    "            nextRankText: (name, pts) => `${name}까지 남은 포인트: ${pts.toLocaleString('ko-KR')} pt`,\n            savingsText: () => '',\n            ranks: [",
    "            nextRankText: (name, pts) => `${name}까지 남은 포인트: ${pts.toLocaleString('ko-KR')} pt`,\n            savingsText: () => '',\n            redeemCheckText: 'Play Points 사용 화면에서 교환 조건 확인',\n            ranks: ["
  );
  source = source.replace(
    "            nextRankText: (name, pts) => `距離${name}還差 ${pts.toLocaleString('zh-TW')} 點`,\n            savingsText: () => '',\n            ranks: [",
    "            nextRankText: (name, pts) => `距離${name}還差 ${pts.toLocaleString('zh-TW')} 點`,\n            savingsText: () => '',\n            redeemCheckText: '請在 Play Points「使用」頁面確認兌換條件',\n            ranks: ["
  );
  source = replaceExact(source,
    "            if (pointValueYenEl) {\n                const pointValueRatio = cfg.unitSpend / 100;\n                const formattedVal = (res.points * pointValueRatio).toLocaleString(undefined, {\n                    minimumFractionDigits: cfg.unitSpend === 1 ? 2 : 0,\n                    maximumFractionDigits: 2\n                });\n                pointValueYenEl.textContent = `${cfg.pointValuePrefix}${formattedVal}${cfg.pointValueSuffix}`;\n            }",
    "            if (pointValueYenEl) {\n                pointValueYenEl.textContent = cfg.redeemCheckText || '';\n            }",
    'fixed redemption value output');
  write(file, source);
}

// --- Quality-hold articles: make visible content, OGP, JSON-LD and article feed agree. ---
const holds = {
  'articles/2026-08-17-diamond-valley-festival-guide.html': {
    title: 'Google Play「Diamond Valley」の過去実績と2026年の確認ポイント',
    desc: 'Diamond Valleyの過去開催で公式に確認できる仕組みを整理します。2026年の日本向け日程・対象ステータス・特典はGoogle Play公式発表待ちとして、未確定情報と分けて案内します。',
    breadcrumb: 'Diamond Valleyの確認ポイント'
  },
  'articles/2026-08-17-tgs-google-play-vip.html': {
    title: '東京ゲームショウのGoogle Play特典｜2026年公式発表待ちと確認ポイント',
    desc: '東京ゲームショウにおけるGoogle Play Points向け特典について、2026年の公式発表待ちであることを明確にし、確認すべき項目とGoogle Play公式の通常特典を整理します。',
    breadcrumb: 'TGS Google Play特典の確認ポイント'
  }
};
for (const [file, meta] of Object.entries(holds)) {
  let html = read(file);
  html = html.replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${meta.title}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${meta.desc}">`);
  html = html.replace(/("headline"\s*:\s*")[^"]*(")/, `$1${meta.title}$2`);
  html = html.replace(/("description"\s*:\s*")[^"]*(")/, `$1${meta.desc}$2`);
  html = html.replace(/("dateModified"\s*:\s*")[^"]*(")/, '$12026-08-18$2');
  html = html.replace(/("position"\s*:\s*3,[\s\S]*?"name"\s*:\s*")[^"]*(")/, `$1${meta.breadcrumb}$2`);
  write(file, html);
}

{
  const file = 'blog/articles.json';
  const items = JSON.parse(read(file));
  const updates = {
    'diamond-valley-festival-guide': {
      title: holds['articles/2026-08-17-diamond-valley-festival-guide.html'].title,
      description: holds['articles/2026-08-17-diamond-valley-festival-guide.html'].desc,
      tags: ['Play Points', 'Diamond Valley', '公式情報', '開催情報']
    },
    'tgs-google-play-vip': {
      title: holds['articles/2026-08-17-tgs-google-play-vip.html'].title,
      description: holds['articles/2026-08-17-tgs-google-play-vip.html'].desc,
      tags: ['Play Points', '東京ゲームショウ', 'TGS', '公式発表待ち']
    }
  };
  for (const item of items) {
    if (updates[item.id]) Object.assign(item, updates[item.id]);
  }
  write(file, JSON.stringify(items, null, 2) + '\n');
}

// Extend permanent regression checks.
{
  const file = 'tests/monetization-search-quality.test.cjs';
  let source = read(file);
  if (!source.includes("test('ゲーム計算機の国別公式レートは現行Google表と一致する'")) {
    source += `\n\ntest('ゲーム計算機の国別公式レートは現行Google表と一致する', () => {\n  const generator = read('scripts/generate-game-simulators.cjs');\n  const runtime = read('games/game-sim.js');\n  for (const expected of [\n    \"Diamond ($1 = 1.6pt)\",\n    \"골드 (1,000원=1.3pt)\",\n    \"플래티넘 (1,000원=1.6pt)\",\n    \"다이아몬드 (1,000원=2pt)\",\n    \"銀級（NT$30 = 1.25點）\",\n    \"金級（NT$30 = 1.5點）\",\n    \"白金級（NT$30 = 1.75點）\",\n    \"鑽石級（NT$30 = 2點）\"\n  ]) assert.ok(generator.includes(expected), expected);\n  assert.ok(runtime.includes(\"{ name: 'Diamond', points: 10000, rate: 1.6 }\"));\n  assert.ok(runtime.includes(\"{ name: '플래티넘', points: 2400, rate: 1.6 }\"));\n  assert.ok(runtime.includes(\"{ name: '다이아몬드', points: 15000, rate: 2.0 }\"));\n  assert.ok(runtime.includes(\"{ name: '白金級', points: 4000, rate: 1.75 }\"));\n});\n\ntest('ゲーム計算機は固定のポイント換金価値を断定しない', () => {\n  const generator = read('scripts/generate-game-simulators.cjs');\n  const runtime = read('games/game-sim.js');\n  for (const forbidden of ['1pt ＝ 約2.0〜2.5円相当', '100ptで100円分', '100pts = $1.00 Play Credit', '100pt로 100원 충전']) {\n    assert.ok(!generator.includes(forbidden), forbidden);\n  }\n  assert.ok(runtime.includes('redeemCheckText'));\n  assert.ok(!runtime.includes('res.points * pointValueRatio'));\n  assert.ok(!runtime.includes('実質 約\${min.toLocaleString()}円'));\n});\n\ntest('品質保留記事はタイトル・OGP・構造化データ・記事台帳を保守的表現へ統一する', () => {\n  const catalog = JSON.parse(read('blog/articles.json'));\n  for (const [file, id] of [\n    ['articles/2026-08-17-diamond-valley-festival-guide.html', 'diamond-valley-festival-guide'],\n    ['articles/2026-08-17-tgs-google-play-vip.html', 'tgs-google-play-vip']\n  ]) {\n    const html = read(file);\n    const title = (html.match(/<h1>([^<]+)<\\/h1>/) || [])[1];\n    assert.ok(title);\n    assert.ok(html.includes('content=\\"' + title + '\\"'));\n    assert.ok(html.includes('\\"headline\\": \\"' + title + '\\"'));\n    const item = catalog.find(entry => entry.id === id);\n    assert.equal(item.title, title);\n  }\n});\n`;
  }
  write(file, source);
}

console.log('Applied Google facts and search-quality hardening.');
