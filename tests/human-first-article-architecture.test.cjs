'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const articles = JSON.parse(read('blog/articles.json'));

const devicePath = 'articles/2026-08-03-play-points-device-change.html';
const balancePath = 'articles/2025-12-25-check-balance.html';
const weeklyPath = 'articles/2025-12-25-weekly-reward.html';
const usagePath = 'articles/2026-07-24-play-points-cash-conversion.html';

test('新規記事は機種変更の独立した検索意図だけを担当する', () => {
  const matching = articles.filter(article => article.id === 'device-change');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].file, '../' + devicePath);
  assert.equal(matching[0].date, '2026-08-03');
  assert.match(matching[0].title, /機種変更/);

  const html = read(devicePath);
  assert.ok(html.length > 7000, '機種変更記事が薄すぎます');
  assert.match(html, /同じGoogleアカウントなら、端末間の移行操作は不要/);
  assert.match(html, /最長15日/);
  assert.match(html, /Google Playの請求先国を変更した/);
  assert.match(html, /別アカウントへポイントを移したい/);
  assert.match(html, /2025-12-25-check-balance\.html/);
  assert.match(html, /2025-12-25-multiple-accounts\.html/);
  assert.match(html, /2025-12-25-weekly-reward\.html/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/16507543/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077247/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/7431675/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/15776077/);
});

test('履歴の検索意図は既存の残高・履歴記事へ集約する', () => {
  const html = read(balancePath);
  assert.match(html, /4つの数字を混同しない/);
  assert.match(html, /ポイント履歴の読み方/);
  assert.match(html, /購入による獲得/);
  assert.match(html, /週次特典・キャンペーン/);
  assert.match(html, /返金・キャンセル/);
  assert.match(html, /コンテンツやデバイスによって時間がかかる場合/);
  assert.match(html, /2025-12-25-playpoints-rank-maintenance\.html/);
  assert.doesNotMatch(html, /2025-12-25-rank-maintenance-reset\.html/);
  assert.match(html, /2026-08-03-play-points-device-change\.html/);

  const historyTitles = articles.filter(article => /履歴/.test(article.title));
  assert.equal(historyTitles.length, 1, '履歴だけの重複記事を増やさないでください');
  assert.equal(historyTitles[0].id, 'check-balance');
});

test('Play Pass週次特典は既存の週次比較記事へ集約する', () => {
  const html = read(weeklyPath);
  assert.match(html, /Play Pass加入者向け週次ボーナス・ブースター/);
  assert.match(html, /最長15日/);
  assert.match(html, /2026-08-03-play-points-device-change\.html/);

  const weeklyTitles = articles.filter(article =>
    /Play Pass/.test(article.title) && /週次|ウィークリー/.test(article.title)
  );
  assert.equal(weeklyTitles.length, 0, 'Play Passだけの薄い週次記事を新設しないでください');
});

test('交換先の検索意図は現金化記事を比較ガイドへ拡張して扱う', () => {
  const html = read(usagePath);
  assert.match(html, /交換先・使い道を比較/);
  assert.match(html, /全員に共通する最適な交換先はありません/);
  assert.match(html, /Google Playクレジット/);
  assert.match(html, /アプリ・ゲーム別クーポン/);
  assert.match(html, /アプリ内・ゲーム内アイテム/);
  assert.match(html, /パートナー特典・クーポン/);
  assert.match(html, /購入手続きで直接利用/);
  assert.match(html, /交換後の払い戻しと失敗時の扱い/);

  const entry = articles.find(article => article.id === 'play-points-cash-conversion');
  assert.ok(entry);
  assert.match(entry.title, /交換先・使い道/);
});

test('記事台帳のid・file・titleは重複しない', () => {
  for (const key of ['id', 'file', 'title']) {
    const values = articles.map(article => article[key]);
    assert.equal(new Set(values).size, values.length, `${key}が重複しています`);
  }
});
