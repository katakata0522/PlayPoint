const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  root,
  test,
} = require('./helpers/playpoint-calculator-test-context.cjs');

test('削除済みのウィークリーリワード自動差し引きは設定にも計算処理にも残さない', () => {
  const configSource = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const calculatorSource = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const localeSource = fs.readFileSync(path.join(root, 'scripts', 'locale-config.cjs'), 'utf8');

  assert.ok(!configSource.includes('weeklyRewardEstimates'), '旧リワード推定設定が残っています');
  assert.ok(!configSource.includes('subtractRewardsLabel'), '旧リワード差し引き文言が残っています');
  assert.ok(!calculatorSource.includes('subtractRewards'), '旧リワード差し引き分岐が残っています');
  assert.ok(!localeSource.includes('subtractRewardsLabel'), '言語ページ生成設定に旧文言が残っています');
});

test('公開LPは削除済みのウィークリーリワード差し引き操作を案内しない', () => {
  const publicPages = [
    'status/platinum/index.html',
    'maintenance/platinum/index.html',
    'maintenance/diamond/index.html'
  ];

  for (const relativePath of publicPages) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(html, /差し引き設定|差し引く設定|差し引く前|週次リワード差し引き|リワード見込みを差し引く/, relativePath);
  }
});

test('カレンダー登録は固定済みの過去日時を使わない', () => {
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
  assert.ok(!main.includes('20260626T'), 'iCalが固定の過去日時を使っています');
  assert.ok(!ui.includes('20260626T'), 'Google Calendarが固定の過去日時を使っています');
});
