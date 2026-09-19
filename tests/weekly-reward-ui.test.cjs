'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const { collectAssetVersions } = require('../scripts/asset-sync.cjs');

test('ウィークリーリワードUIは既存の日記保存契約を変更せず表示層だけを担当する', () => {
  const ui = read('js/weekly-reward-ui.js');

  assert.doesNotMatch(ui, /localStorage|DIARY_DATA_KEY|saveDiaryData|handleDiarySave/);
  assert.match(ui, /MutationObserver/);
  assert.match(ui, /weekly-month-picker/);
  assert.match(ui, /weekly-secondary-details/);
  assert.match(ui, /is-weekly-current/);
  assert.match(ui, /is-weekly-compact/);
  assert.match(ui, /aria-expanded/);
});

test('日記タブがある実ページだけ新UIを動的importする', () => {
  const thirdParty = read('js/third-party.js');

  assert.match(thirdParty, /typeof document\.getElementById !== 'function'/);
  assert.match(thirdParty, /document\.getElementById\('tab-diary'\)/);
  assert.match(thirdParty, /import\('\/js\/weekly-reward-ui\.js(?:\?v=[^']+)?'\)/);
  assert.match(thirdParty, /Weekly reward UI load failed/);
});

test('新UIのJSは既存のasset version同期に含まれる', () => {
  const versions = collectAssetVersions(root);
  assert.ok(versions.weeklyRewardUiVersion, 'weekly-reward-ui.js のrevisionがありません');
});

test('UIスタイルはモジュール内包で今週優先・過去週コンパクト・狭幅1列の契約を持つ', () => {
  const ui = read('js/weekly-reward-ui.js');

  assert.match(ui, /#tab-diary::before/);
  assert.match(ui, /content:\s*"🎁"/);
  assert.match(ui, /\.is-weekly-current/);
  assert.match(ui, /\.is-weekly-compact/);
  assert.match(ui, /\.diary-save-btn[^`]*display:none/);
  assert.match(ui, /@media\(max-width:360px\)/);
  assert.match(ui, /style\.textContent = STYLE_TEXT/);
});


test('今月見出しの重複を画面から隠し、週次カードの日付側へ視線を集める', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /diary-input-area>#selectedMonth,[^\n]*weekly-month-section-title\{display:none!important\}/);
});

test('記録直後グラフは週ごとの色を積み上げ、月表示・現在週強調・段階アニメーションを持つ', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /monthlyWeeks/);
  assert.match(diary, /weekly-week-segment week-/);
  for (const week of [1, 2, 3, 4, 5]) assert.match(diary, new RegExp('weekly-week-segment\\.week-' + week));
  assert.match(diary, /weekly-mini-stack/);
  assert.match(diary, /weekly-mini-bar-label/);
  assert.match(diary, /is-current-month/);
  assert.match(diary, /is-current-week-segment/);
  assert.match(diary, /--weekly-week-delay/);
  assert.match(diary, /weekly-week-rise/);
  assert.match(diary, /weekly-current-glow/);
  assert.doesNotMatch(diary, /weekly-achievement-kicker/);
  assert.doesNotMatch(diary, /記録できた！/);
});

test('ポイント入力はpt単位を常時見せ、5桁警告は非ブロッキングである', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /weekly-points-unit/);
  assert.match(diary, /shouldQuestionLargePoints/);
  assert.match(diary, />= 10000/);
  assert.doesNotMatch(diary, /window\.confirm|confirm\(/);
  assert.match(diary, /本当に…？（このままの値でも記録に残せます）/);
});


test('X共有ラベルは地域別コピーを使い、日本語固定ariaを残さない', () => {
  const diary = read('js/diary.js');

  assert.match(diary, /shareAria: 'この週の結果をXで共有'/);
  assert.match(diary, /share\.setAttribute\('aria-label', copy\.shareAria\)/);
  assert.match(diary, /weekly-result-share/);
  assert.doesNotMatch(diary, /aria-label="Xでシェア"/);
});

test('記録結果には次の金曜日とGoogleカレンダー導線をコンパクトに表示する', () => {
  const diary = read('js/diary.js');

  assert.match(diary, /nextFriday\(now = new Date\(\)\)/);
  assert.match(diary, /weekly-next-reward/);
  assert.match(diary, /register-google-cal-btn/);
  assert.match(diary, /copy\.nextReward/);
  assert.match(diary, /copy\.calendarCta/);
});


test('詳細年間グラフも月合計の単色棒ではなく週別スタックを使う', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /diary-chart-stack/);
  assert.match(diary, /diary-week-segment week-/);
  assert.match(diary, /\.diary-chart-stack\{[^\n]*flex-direction:column-reverse/);
  for (const week of [1, 2, 3, 4, 5]) assert.match(diary, new RegExp('diary-week-segment\\.week-' + week));
});

test('今週は保存後にロックし、編集・未保存・変更保存の状態を明示する', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /saved: '記録済み ✓'/);
  assert.match(diary, /unsaved: '未保存の変更'/);
  assert.match(diary, /saveChanges: '変更を保存'/);
  assert.match(diary, /setCurrentWeekRecordMode/);
  assert.match(diary, /input\.disabled = saved/);
  assert.match(diary, /select\.disabled = saved/);
  assert.match(diary, /weekly-record-edit/);
  assert.match(diary, /event\.key !== 'Enter'/);
});

test('X共有は入力行ではなく記録結果の後にだけ表示する', () => {
  const diary = read('js/diary.js');
  assert.doesNotMatch(diary, /diary-x-share-btn/);
  assert.match(diary, /weekly-result-share/);
  assert.match(diary, /SHARE\.shareRewardToX\(normalizedPoints, prize\)/);
});

test('自己最高更新だけ「今年いちばん✨」を記録結果へ出せる', () => {
  const diary = read('js/diary.js');
  assert.match(diary, /isNewYearBest/);
  assert.match(diary, /yearBest: '今年いちばん✨'/);
  assert.match(diary, /weekly-achievement-milestone/);
});
