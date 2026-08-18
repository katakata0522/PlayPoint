'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s.replace(/\r\n/g, '\n'), 'utf8');

function replaceAllIn(file, replacements) {
  let s = read(file);
  for (const [oldText, newText] of replacements) s = s.split(oldText).join(newText);
  write(file, s);
}

// Q&A: remove the accidental duplicated clause, preserve conservative disclaimer, and update editorial date.
replaceAllIn('info.html', [
  [
    'A. 獲得率が「3ポイント/100円」のように表示される場合はGoogle Playのオファー画面に「100円ごとに3ポイント」のような特別獲得率が表示される場合は、その最終的な獲得率をキャンペーン欄へ入力します。計算機は現在ステータスの通常獲得率と特別獲得率を比較し、高い方を試算に使います。通常獲得率へキャンペーン数字を掛ける計算ではありません。対象判定、上限、期間、有効化の要否はGoogle Playの表示を優先してください。購入前に対象アプリ、期間、上限、有効化の有無を公式画面で確認してください。',
    'A. Google Playのオファー画面に「100円ごとに3ポイント」のような特別獲得率が表示される場合は、その最終的な獲得率をキャンペーン欄へ入力します。計算機は現在ステータスの通常獲得率と特別獲得率を比較し、高い方を試算に使います。通常獲得率へキャンペーン数字を掛ける計算ではありません。キャンペーンの併用可否や対象判定を保証するものではありません。対象アプリ、期間、上限、有効化の要否はGoogle Playの公式画面を優先してください。'
  ],
  [
    '獲得率を直接入力する方法とキャンペーン倍率を入力する方法を用意し、両方が入力された場合は高い方を試算に使います。キャンペーンの併用可否や対象判定を保証するものではないため、公式画面の条件を確認してください。',
    'Google Playに表示された特別獲得率と現在ステータスの通常獲得率を比較し、高い方を試算に使います。通常獲得率へキャンペーン数字を掛ける計算ではありません。キャンペーンの併用可否や対象判定は保証せず、公式画面の条件を優先してください。'
  ],
  ['<meta name="last-modified" content="2026-07-26">', '<meta name="last-modified" content="2026-08-18">'],
  ['<meta property="article:modified_time" content="2026-07-26T00:00:00+09:00">', '<meta property="article:modified_time" content="2026-08-18T00:00:00+09:00">'],
  ['"dateModified": "2026-07-26"', '"dateModified": "2026-08-18"']
]);
replaceAllIn('scripts/content-dates.cjs', [["'info.html': '2026-07-26'", "'info.html': '2026-08-18'"]]);

// Game calculator localization and source-verification wording.
replaceAllIn('scripts/generate-game-simulators.cjs', [
  ["verifiedDate: '최종 확인: 2026년 8월'", "verifiedDate: 'Play Points 적립률 확인: 2026년 8월 (게임 가격/천장은 참고값)'"],
  ["multiplierLabel: '포인트 배율:'", "multiplierLabel: '프로모션 특별 적립률:'"],
  ["{ val: '1', label: '일반 적립 (1배 / 1%)' }", "{ val: '1', label: '기본 기준: 1,000원당 1pt' }"],
  ["{ val: '2', label: '2배 이벤트' }", "{ val: '2', label: '특별 적립률: 1,000원당 2pt' }"],
  ["{ val: '3', label: '3배 이벤트' }", "{ val: '3', label: '특별 적립률: 1,000원당 3pt' }"],
  ["{ val: '4', label: '4배 이벤트' }", "{ val: '4', label: '특별 적립률: 1,000원당 4pt' }"],
  ["{ val: '5', label: '5배 이벤트' }", "{ val: '5', label: '특별 적립률: 1,000원당 5pt' }"],
  ["{ val: '7', label: '7배 이벤트' }", "{ val: '7', label: '특별 적립률: 1,000원당 7pt' }"],
  ["tableThNormal: '일반 적립 (1배)'", "tableThNormal: '기본 적립률 (1,000원당 1pt)'"],
  ["tableThCp: '5배 이벤트 (5배)'", "tableThCp: '특별 적립률 (1,000원당 5pt)'"],
  ["multiplierLabel: '點數加碼倍率：'", "multiplierLabel: '活動特別獲點率：'"],
  ["{ val: '1', label: '一般回饋（1倍 / 3.3%）' }", "{ val: '1', label: '基本參考：每 NT$30 1點' }"],
  ["{ val: '2', label: '2倍活動加碼' }", "{ val: '2', label: '特別獲點率：每 NT$30 2點' }"],
  ["{ val: '3', label: '3倍活動加碼' }", "{ val: '3', label: '特別獲點率：每 NT$30 3點' }"],
  ["{ val: '4', label: '4倍活動加碼' }", "{ val: '4', label: '特別獲點率：每 NT$30 4點' }"],
  ["{ val: '5', label: '5倍活動加碼' }", "{ val: '5', label: '特別獲點率：每 NT$30 5點' }"],
  ["{ val: '7', label: '7倍活動加碼' }", "{ val: '7', label: '特別獲點率：每 NT$30 7點' }"],
  ["tableThNormal: '一般回饋 (1倍)'", "tableThNormal: '基本獲點率（每 NT$30 1點）'"],
  ["tableThCp: '5倍加碼 (5倍)'", "tableThCp: '特別獲點率（每 NT$30 5點）'"],
  ['Google Playのポイント増量キャンペーン（4倍〜7倍時）なら', 'Google Playに100円あたり4〜7ptの特別獲得率が表示され、その購入が対象なら'],
  ['during 4x-7x special point promotions', 'when an eligible special earn rate of 4-7 points per $1 is shown in Google Play'],
  ['4배~7배 이벤트', 'Google Play에 1,000원당 4~7pt의 특별 적립률이 표시되는 대상 오퍼'],
  ['4～7 倍活動', 'Google Play 顯示每 NT$30 4～7 點且該筆消費符合資格的活動']
]);

// International locale metadata and legacy 2x/3x search pages.
{
  let s = read('scripts/intl-seo-content.cjs');
  const localeNotices = [
    ["    siteName: 'Google Play Points Calculator',", "    siteName: 'Google Play Points Calculator',\n    trademarkNotice: 'Google Play, the Google Play logo, and Android are trademarks of Google LLC. This independent calculator is not affiliated with or endorsed by Google LLC or the game publishers mentioned on this site.',"],
    ["    siteName: 'Google Play Points 계산기',", "    siteName: 'Google Play Points 계산기',\n    trademarkNotice: 'Google Play, Google Play 로고 및 Android는 Google LLC의 상표입니다. 본 사이트는 독립적으로 운영되는 비공식 계산기이며 Google LLC 및 언급된 게임의 개발·배급사와 제휴 또는 승인 관계가 없습니다.',"],
    ["    siteName: 'Google Play Points 計算器',", "    siteName: 'Google Play Points 計算器',\n    trademarkNotice: 'Google Play、Google Play 標誌及 Android 均為 Google LLC 的商標。本網站為獨立營運的非官方計算工具，與 Google LLC 及所提及遊戲的開發或發行商無隸屬或認可關係。',"]
  ];
  for (const [needle, replacement] of localeNotices) {
    const start = s.indexOf(needle);
    if (start >= 0 && !s.slice(start, start + 500).includes('trademarkNotice')) {
      s = s.slice(0, start) + s.slice(start).replace(needle, replacement);
    }
  }
  const phrases = [
    ['A 3x promotion can change a status plan more than a small discount, but only when the purchase qualifies. Compare 1x, 2x, and 3x before deciding.', 'This legacy “3x” page models a final special earn rate of 3 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 3.'],
    ['Preset: 3x multiplier', 'Preset: special earn rate 3 pt / $1'],
    ['Calculate with 3x', 'Calculate with 3 pt / $1'],
    ['Use 3x only when it is real', 'Use the 3 pt / $1 rate only when it is shown'],
    ['A 3x headline does not always apply to every app, item, payment method, or account. Confirm the offer before treating the result as likely.', 'Only enter 3 when Google Play shows a final special earn rate of 3 points per $1 for the purchase. Check the eligible app, item, period, activation, and cap.'],
    ['Compare against 1x and 2x', 'Compare against your base earn rate'],
    ['The useful question is not whether 3x looks attractive. It is whether the difference is large enough to change a purchase you already planned.', 'Compare the confirmed special earn rate with your normal tier earn rate. Use the higher applicable rate rather than multiplying the two.'],
    ['Not necessarily. Base rate, caps, and eligibility can change the final result.', 'Not necessarily. A 3-point special rate is compared with your base tier rate; it does not multiply that tier rate. Caps and eligibility can also change the result.'],
    ['A 2x promotion can make a meaningful difference when you are already close to a target, but only if the purchase is eligible. Compare 1x and 2x before deciding.', 'This legacy “2x” page models a final special earn rate of 2 points per $1 when Google Play shows that rate for an eligible purchase. It does not multiply your tier base rate by 2.'],
    ['Preset: 2x multiplier', 'Preset: special earn rate 2 pt / $1'],
    ['Calculate with 2x', 'Calculate with 2 pt / $1'],
    ['3배 캠페인은 등급 계획을 크게 바꿀 수 있지만, 대상 결제일 때만 의미가 있습니다. 1배, 2배, 3배를 비교한 뒤 판단하세요.', '이 기존 “3배” 페이지는 Google Play에 대상 결제의 최종 특별 적립률이 1,000원당 3pt로 표시될 때 그 값을 사용합니다. 현재 등급의 기본 적립률에 3을 곱하지 않습니다.'],
    ['초기 조건: 3배 배율', '초기 조건: 특별 적립률 1,000원당 3pt'],
    ['3배로 계산하기', '1,000원당 3pt로 계산하기'],
    ['3배 문구가 모든 앱, 상품, 결제수단, 계정에 적용된다고 가정하면 안 됩니다.', 'Google Play에 해당 결제의 최종 특별 적립률이 1,000원당 3pt로 표시될 때만 3을 입력하세요. 대상 앱, 상품, 기간, 활성화, 상한을 함께 확인해야 합니다.'],
    ['1배와 2배도 함께 비교', '기본 적립률과 비교'],
    ['중요한 것은 3배가 좋아 보이는지가 아니라, 원래 예정된 결제의 시점을 바꿀 만큼 차이가 있는지입니다.', '확인된 특별 적립률과 현재 등급의 기본 적립률을 비교해 더 높은 적용률을 사용하며, 두 값을 곱하지 않습니다.'],
    ['항상 그렇지는 않습니다. 기본 적립률, 상한, 대상 조건이 영향을 줍니다.', '항상 그렇지는 않습니다. 1,000원당 3pt의 특별 적립률은 등급 기본 적립률과 비교하는 값이며, 기본 적립률에 3을 곱하지 않습니다. 상한과 대상 조건도 확인해야 합니다.'],
    ['3 倍活動可能大幅改變等級計畫，但前提是該筆消費符合資格。請先比較 1 倍、2 倍與 3 倍。', '這個保留「3 倍」搜尋名稱的頁面，僅在 Google Play 對符合資格的消費顯示最終特別獲點率為每 NT$30 3 點時使用 3；不會把會員等級的基本獲點率再乘以 3。'],
    ['預設: 3 倍倍率', '預設：特別獲點率每 NT$30 3 點'],
    ['用 3 倍計算', '以每 NT$30 3 點計算'],
    ['3 倍標題不代表所有 App、商品、付款方式或帳號都適用。', '只有 Google Play 對該筆消費顯示最終特別獲點率為每 NT$30 3 點時才輸入 3，並確認適用 App、商品、期間、啟用方式與上限。'],
    ['同時比較 1 倍與 2 倍', '與基本獲點率比較'],
    ['重點不是 3 倍看起來多好，而是差距是否足以改變原本計畫的購買時機。', '請比較已確認的活動特別獲點率與會員等級基本獲點率，採用實際適用的較高者，不要把兩者相乘。'],
    ['不一定，基本回饋率、上限與資格都會影響結果。', '不一定。每 NT$30 3 點的特別獲點率要與等級基本獲點率比較，不是把基本獲點率乘以 3；上限與資格也會影響結果。'],
    ['Use Start with your base rate, then enter the final special earn rate shown for an eligible purchase in Google Play.', 'Start with your base rate, then enter the final special earn rate shown for an eligible purchase in Google Play.'],
    ['如果估算金額高於平常消費，先比較 1 倍、2 倍或 3 倍，不要為了等級增加不必要支出。', '如果估算金額高於平常消費，請比較目前等級的基本獲點率與 Google Play 顯示的活動特別獲點率，不要為了等級增加不必要支出。'],
    ['可以，但只有實際符合活動資格的消費才適合使用倍率估算。', '可以，但請輸入 Google Play 顯示的最終特別獲點率，並且只用於實際符合活動資格的消費。']
  ];
  for (const [a, b] of phrases) s = s.split(a).join(b);
  write('scripts/intl-seo-content.cjs', s);
}

// Japanese legacy /campaign/2x/ page: correct every table value to a final 2pt/100円 special earn rate.
replaceAllIn('campaign/2x/index.html', [
  ['<span class="lp-summary-label">初期条件</span><span class="lp-summary-value">倍率2倍・プラチナ到達</span>', '<span class="lp-summary-label">初期条件</span><span class="lp-summary-value">特別獲得率2pt/100円・プラチナ到達</span>'],
  ['>2倍でプラチナ到達を計算する<', '>2pt/100円でプラチナ到達を計算する<'],
  ['<h2>2倍で見るべき判断材料</h2>', '<h2>特別獲得率2pt/100円で見るべき判断材料</h2>'],
  ['同じ不足ポイントでも、2倍を入れると必要額の目安が下がります。まず1倍と2倍を切り替えて差を見てください。', 'Google Playに特別獲得率2pt/100円と表示された対象購入では、その2ptと現在ランクの通常獲得率を比較します。通常獲得率へ2を掛けません。'],
  ['ここでは「2倍ならどれくらい変わるか」を先に見るための入口として使ってください。', 'このページの「2倍」は検索用の従来表記です。計算ではGoogle Playに表示された最終特別獲得率2pt/100円として扱います。'],
  ['<td>30,000円</td>\n                        <td><strong style="color:#059669;">30,000円おトク</strong></td>', '<td>37,500円</td>\n                        <td><strong style="color:#059669;">22,500円少ない</strong></td>'],
  ['<td>100,000円</td>\n                        <td><strong style="color:#059669;">100,000円おトク</strong></td>', '<td>150,000円</td>\n                        <td><strong style="color:#059669;">50,000円少ない</strong></td>'],
  ['<td>約114,286円</td>\n                        <td><strong style="color:#059669;">約114,286円おトク</strong></td>', '<td>200,000円</td>\n                        <td><strong style="color:#059669;">約28,572円少ない</strong></td>'],
  ['<td>約314,286円</td>\n                        <td><strong style="color:#059669;">約314,286円おトク</strong></td>', '<td>550,000円</td>\n                        <td><strong style="color:#059669;">約78,572円少ない</strong></td>'],
  ['<strong>💡 賢い活用法:</strong> 特別獲得率2pt/100円のキャンペーンは対象ゲームの限定ガチャ・大型アップデート時に開催されることが多いため、普段の課金をこの期間に集中させるのが最も効果的です。', '<strong>💡 比較の見方:</strong> 特別獲得率2pt/100円は、Google Playにその最終獲得率が表示され、対象・期間・上限などの条件を満たす購入にだけ使ってください。'],
  ['>計算機で2倍シミュレーション ➔<', '>計算機で2pt/100円を試算 ➔<'],
  ['特別獲得率2pt/100円のキャンペーンの計算では、倍率だけを見ても判断できません。', '特別獲得率2pt/100円の計算では、キャンペーン名だけを見ても判断できません。'],
  ['<summary>2倍と3倍ではどちらを狙うべき？</summary>', '<summary>特別獲得率2ptと3ptはどう比べる？</summary>'],
  ['<summary>2倍で計算した結果を共有できますか？</summary>', '<summary>2pt/100円で計算した結果を共有できますか？</summary>'],
  ['倍率や不足ポイントを含んだURL', '特別獲得率や不足ポイントを含んだURL']
]);

// Japanese legacy /campaign/3x/ page: make all body copy match a final 3pt/100円 special earn rate.
replaceAllIn('campaign/3x/index.html', [
  ['>3倍でダイヤモンド到達を計算する<', '>3pt/100円でダイヤモンド到達を計算する<'],
  ['<h2>3倍で見るべき判断材料</h2>', '<h2>特別獲得率3pt/100円で見るべき判断材料</h2>'],
  ['不足分が大きいほど3倍の効果は見えやすくなります。少額だけなら2倍との差が小さいこともあります。', '不足分が大きいほど特別獲得率の差は金額に反映されます。現在ランクの通常獲得率と、Google Playに表示された最終特別獲得率を比較してください。'],
  ['倍率が高いキャンペーンほど、獲得上限や対象外条件の影響を受けやすくなります。', '特別獲得率が高く見えても、獲得上限や対象外条件がある場合はその条件を優先してください。'],
  ['<h2>3倍キャンペーンでどれくらい浮く？早見表</h2>', '<h2>特別獲得率3pt/100円でどれくらい変わる？早見表</h2>'],
  ['通常時・2倍・3倍キャンペーン時で、目標ランクやポイントを貯めるのに必要な課金額（プラチナ現在想定）の比較目安です。', '現在ランクの通常獲得率と、特別獲得率2pt/100円・3pt/100円が実際に適用される場合の必要額を比較します。'],
  ['<th>3倍で浮く金額</th>', '<th>3pt/100円時の差額</th>'],
  ['>計算機で3倍シミュレーション ➔<', '>計算機で3pt/100円を試算 ➔<'],
  ['3倍キャンペーンは必要額を大きく下げる可能性がありますが、入力条件が雑だと期待しすぎた結果になります。次の条件をそろえて、通常時、2倍、3倍を順に比較してください。', '特別獲得率3pt/100円が適用されると必要額が下がる場合がありますが、入力条件が違えば結果も変わります。現在ランクの通常獲得率と、Google Playに表示された特別獲得率を比較してください。'],
  ['<h2>3倍キャンペーンの使いどころ</h2>', '<h2>特別獲得率3pt/100円を使う条件</h2>'],
  ['必要ポイントが大きいダイヤモンド到達では、3倍の効果が見えやすくなります。', '必要ポイントが大きいダイヤモンド到達では、通常獲得率と3pt/100円の差が必要額に反映されます。'],
  ['すでに予定している支払いがあるなら、3倍期間に寄せる価値があります。', 'すでに予定している支払いがあり、その購入に3pt/100円の特別獲得率が適用されるなら、期間内に寄せる選択肢があります。'],
  ['年末が近いときは倍率より反映タイミングが重要になることがあります。高倍率でも、反映が締めに間に合わなければランク判定に使えない可能性があります。', '年末が近いときは特別獲得率だけでなく反映タイミングも重要です。条件を満たしていても、反映状況はGoogle Play側で確認してください。'],
  ['このページから3倍で計算したあと、倍率欄を2に変えると差を見られます。', 'このページから3pt/100円で計算したあと、特別獲得率欄を2に変えると2pt/100円との差を見られます。'],
  ['差額が小さいなら、無理に3倍待ちをする必要はありません。', '差額が小さいなら、特定のキャンペーンを待つために予定を変える必要があるか慎重に判断してください。']
]);

// Monetization copy: no fixed return promise, no awkward replacement grammar, no "double dipping" claim.
replaceAllIn('scripts/insert-lp-monetization.cjs', [
  ['課金前にやっておくべき実質割引テクニック', '課金前に確認したいギフトコード購入条件'],
  ['楽天市場のGoogle Playギフトコード認定店でポイント二重取り', '楽天市場のGoogle Playギフトコード認定店の還元条件を確認'],
  ['直接クレジットカードで決済する前に、楽天市場の「Google Play ギフトコード認定店」を経由すると、<strong>楽天市場側のキャンペーンや会員条件により楽天ポイント還元の対象になる場合</strong>されます。付与率・上限・エントリー要否・コードの受取条件は変わるため、購入画面とキャンペーン詳細を確認してください。', '楽天市場の「Google Play ギフトコード認定店」では、<strong>楽天市場側のキャンペーンや会員条件によってポイント還元の対象になる場合があります。</strong> 付与率・上限・エントリー要否・コードの受取条件は変わるため、購入画面とキャンペーン詳細を確認してください。']
]);

// Extend permanent guards for newly discovered cross-locale regressions and exact 2pt table values.
{
  let s = read('tests/full-integrity-audit.test.cjs');
  const addition = `\n\ntest('韓国語・繁体字ゲーム計算機も特別獲得率として表示する', () => {\n  const generator = read('scripts/generate-game-simulators.cjs');\n  assert.match(generator, /프로모션 특별 적립률/);\n  assert.match(generator, /活動特別獲點率/);\n  assert.ok(!generator.includes(\"multiplierLabel: '포인트 배율:'\"));\n  assert.ok(!generator.includes(\"multiplierLabel: '點數加碼倍率：'\"));\n});\n\ntest('国際LPはundefinedフッターやランク率×倍率の説明を生成しない', () => {\n  const content = read('scripts/intl-seo-content.cjs');\n  assert.match(content, /trademarkNotice/);\n  assert.ok(!content.includes('Preset: 3x multiplier'));\n  assert.ok(!content.includes('초기 조건: 3배 배율'));\n  assert.ok(!content.includes('預設: 3 倍倍率'));\n  for (const file of ['en/campaign/3x/index.html', 'ko/campaign/3x/index.html', 'tw/campaign/3x/index.html']) {\n    const html = read(file);\n    assert.ok(!html.includes('>undefined<'), file);\n  }\n});\n\ntest('Q&Aのキャンペーン説明は重複せず公式画面を優先する', () => {\n  const html = read('info.html');\n  assert.ok(!html.includes('表示される場合はGoogle Playのオファー画面'));\n  assert.ok(html.includes('通常獲得率へキャンペーン数字を掛ける計算ではありません'));\n  assert.ok(html.includes('キャンペーンの併用可否や対象判定を保証するものではありません'));\n});\n\ntest('2pt/100円LPはランク通常率へ2を掛けた旧金額を残さない', () => {\n  const html = read('campaign/2x/index.html');\n  assert.ok(html.includes('<td>37,500円</td>'));\n  assert.ok(html.includes('<td>150,000円</td>'));\n  assert.ok(html.includes('<td>200,000円</td>'));\n  assert.ok(html.includes('<td>550,000円</td>'));\n  assert.ok(!html.includes('<td>約314,286円</td>'));\n});\n\ntest('LPアフィリエイト文言は固定還元や二重取りを断定しない', () => {\n  const source = read('scripts/insert-lp-monetization.cjs');\n  assert.ok(!source.includes('ポイント二重取り'));\n  assert.ok(!source.includes('場合</strong>されます'));\n  assert.ok(source.includes('ポイント還元の対象になる場合があります'));\n});\n`;
  if (!s.includes('2pt/100円LPはランク通常率へ2を掛けた旧金額を残さない')) s += addition;
  write('tests/full-integrity-audit.test.cjs', s);
}

console.log('Final audit follow-up applied.');
