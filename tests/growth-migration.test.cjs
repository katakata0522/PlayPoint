'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const migrations = Object.freeze([
  ['tools/dashboard', 'https://katakatalab.com/lab-tools/side-fire-dashboard/'],
  ['tools/gravity-todo', 'https://katakatalab.com/lab-tools/gravity-todo/'],
  ['tools/rakuten-sim', 'https://katakatalab.com/lab-tools/rakuten-sim/'],
  ['tools/sub-health', 'https://katakatalab.com/lab-tools/sub-health/'],
  ['kindle-tracker', 'https://katakatalab.com/lab-tools/kindle-tracker/'],
  ['kids-smile-land', 'https://katakatalab.com/lab-tools/kids-smile-land/'],
  ['doujin-shi-calculator', 'https://katakatalab.com/lab-tools/doujin-shi-calculator/'],
]);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walkFiles(directory, extensions) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath, extensions);
    return extensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

test('PlayPointと無関係なツールはKatakataLabへ移設し旧URLを恒久転送する', () => {
  const htaccess = read('.htaccess');

  for (const [sourcePath, destinationUrl] of migrations) {
    assert.equal(fs.existsSync(path.join(root, sourcePath)), false, `${sourcePath} がPlayPointに残っています`);
    assert.ok(htaccess.includes(destinationUrl), `${sourcePath} の移設先が.htaccessにありません`);
  }
});

test('公開HTMLと生成元にサイト内遷移用UTMを残さない', () => {
  const files = [
    ...walkFiles(root, new Set(['.html'])),
    ...walkFiles(path.join(root, 'scripts'), new Set(['.cjs', '.js'])),
  ];
  const offenders = files
    .filter((file) => !file.includes(`${path.sep}tests${path.sep}`))
    .filter((file) => read(path.relative(root, file)).includes('utm_medium=internal'))
    .map((file) => path.relative(root, file).replaceAll(path.sep, '/'));

  assert.deepEqual(offenders, []);
});

test('プライバシー文書はWeb版と認定CMPの運用に一致する', () => {
  const privacy = read('privacy.html');
  const terms = read('terms.html');
  const consent = read('js/consent.js');

  assert.doesNotMatch(privacy, /AdMob|当アプリ|広告ID/);
  assert.doesNotMatch(terms, /当アプリ/);
  for (const [label, html] of [['privacy', privacy], ['terms', terms]]) {
    const match = html.match(/最終改定日：<\/strong>(\d{4})年(\d{1,2})月(\d{1,2})日/);
    assert.ok(match, `${label}: 最終改定日がありません`);
    const [, year, month, day] = match.map(Number);
    const normalized = new Date(Date.UTC(year, month - 1, day));
    assert.equal(normalized.getUTCFullYear(), year, `${label}: 年が不正です`);
    assert.equal(normalized.getUTCMonth(), month - 1, `${label}: 月が不正です`);
    assert.equal(normalized.getUTCDate(), day, `${label}: 日が不正です`);
  }
  assert.match(consent, /__tcfapi/);
  assert.match(consent, /showRevocationMessage/);
  assert.doesNotMatch(consent, /data-consent-accept.*focus/s);
});

test('再訪と配布の主要イベントだけを許可する', () => {
  const config = read('js/config.js');
  const main = read('js/main.js');
  const diary = read('js/diary.js');
  const embed = read('embed.html');

  for (const eventName of [
    'calendar_reminder_added',
    'pwa_install_accepted',
    'widget_code_copied',
    'widget_referral_landed',
  ]) {
    assert.ok(config.includes(eventName), `${eventName} が許可イベントにありません`);
  }
  assert.match(main, /beforeinstallprompt/);
  assert.match(diary, /playpoint:diary-saved/);
  assert.match(embed, /<meta name="robots" content="index,follow">/);
  assert.match(embed, /widget_code_copied/);
});

test('ウィジェット作成ページは狭い画面でグリッド内容をはみ出させない', () => {
  const embed = read('embed.html');

  assert.match(embed, /\.main-grid\s*>\s*\*,\s*\.panel\s*\{\s*min-width:\s*0/s);
  assert.match(embed, /pre\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;/);
});
