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

const normalizeText = value => value
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const extractJsonLd = html => [...html.matchAll(
  /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi
)].map(match => JSON.parse(match[1]));

const articleByFile = relativePath => articles.find(
  article => article.file === `../${relativePath}`
);

test('機種変更記事は独立した検索意図と症状別の確認導線を持つ', () => {
  const matching = articles.filter(article => article.id === 'device-change');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].file, `../${devicePath}`);
  assert.equal(matching[0].date, '2026-08-03');
  assert.match(matching[0].title, /機種変更/);

  const html = read(devicePath);
  assert.ok(html.length > 9000, '機種変更記事が薄すぎます');
  assert.match(html, /同じGoogleアカウントなら、端末間の移行操作は不要/);
  assert.match(html, /旧端末の操作は前提ではありません/);
  assert.match(html, /症状から確認先を選ぶ/);
  assert.match(html, /機種変更後に見つからないもの別の確認先/);
  assert.match(html, /Play Pointsのメニュー自体/);
  assert.match(html, /Play Passの週次特典だけ/);
  assert.match(html, /購入で得るはずのポイントだけ/);
  assert.match(html, /最長15日/);
  assert.match(html, /Google Playの請求先国を変更した/);
  assert.match(html, /別アカウントへポイントを移したい/);
  assert.match(html, /2025-12-25-check-balance\.html/);
  assert.match(html, /2025-12-25-multiple-accounts\.html/);
  assert.match(html, /2025-12-25-weekly-reward\.html/);
  assert.match(html, /2026-03-10-play-points-reflection-timing\.html/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/16507543/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077247/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/7431675/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/15776077/);
});

test('既存記事が履歴・週次特典・交換先の主担当として必要情報を持つ', () => {
  const balanceEntry = articleByFile(balancePath);
  const weeklyEntry = articleByFile(weeklyPath);
  const usageEntry = articleByFile(usagePath);

  assert.ok(balanceEntry, '残高・履歴記事が記事台帳にありません');
  assert.ok(weeklyEntry, '週次特典記事が記事台帳にありません');
  assert.ok(usageEntry, '交換先・使い道記事が記事台帳にありません');

  const balanceHtml = read(balancePath);
  assert.match(balanceHtml, /4つの数字を混同しない/);
  assert.match(balanceHtml, /ポイント履歴の読み方/);
  assert.match(balanceHtml, /購入による獲得/);
  assert.match(balanceHtml, /週次特典・キャンペーン/);
  assert.match(balanceHtml, /返金・キャンセル/);
  assert.match(balanceHtml, /コンテンツやデバイスによって時間がかかる場合/);
  assert.match(balanceHtml, /2025-12-25-playpoints-rank-maintenance\.html/);
  assert.doesNotMatch(balanceHtml, /2025-12-25-rank-maintenance-reset\.html/);
  assert.match(balanceHtml, /2026-08-03-play-points-device-change\.html/);

  const weeklyHtml = read(weeklyPath);
  assert.match(weeklyHtml, /Play Pass加入者向け週次ボーナス・ブースター/);
  assert.match(weeklyHtml, /最長15日/);
  assert.match(weeklyHtml, /2026-08-03-play-points-device-change\.html/);

  const usageHtml = read(usagePath);
  assert.match(usageHtml, /交換先・使い道を比較/);
  assert.match(usageHtml, /全員に共通する最適な交換先はありません/);
  assert.match(usageHtml, /Google Playクレジット/);
  assert.match(usageHtml, /アプリ・ゲーム別クーポン/);
  assert.match(usageHtml, /アプリ内・ゲーム内アイテム/);
  assert.match(usageHtml, /パートナー特典・クーポン/);
  assert.match(usageHtml, /購入手続きで直接利用/);
  assert.match(usageHtml, /交換後の払い戻しと失敗時の扱い/);
  assert.match(usageEntry.title, /交換先・使い道/);
});

test('機種変更記事のFAQ本文とFAQPage構造化データは一致する', () => {
  const html = read(devicePath);
  const jsonLd = extractJsonLd(html);
  const faqPage = jsonLd.find(item => item['@type'] === 'FAQPage');
  assert.ok(faqPage, 'FAQPage構造化データがありません');

  const visibleFaq = [...html.matchAll(
    /<div\s+class=["']faq-item["']>\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi
  )].map(match => ({
    name: normalizeText(match[1]),
    answer: normalizeText(match[2])
  }));

  const structuredFaq = faqPage.mainEntity.map(item => ({
    name: normalizeText(item.name),
    answer: normalizeText(item.acceptedAnswer.text)
  }));

  assert.ok(visibleFaq.length >= 3, '読者向けFAQが少なすぎます');
  assert.deepEqual(structuredFaq, visibleFaq,
    'FAQPageは画面に表示される質問・回答と同じ内容にしてください');
});

test('記事台帳のid・file・titleは重複せず、登録先ファイルが存在する', () => {
  for (const key of ['id', 'file', 'title']) {
    const values = articles.map(article => article[key]);
    assert.equal(new Set(values).size, values.length, `${key}が重複しています`);
  }

  for (const article of articles) {
    const absolutePath = path.resolve(root, 'blog', article.file);
    assert.ok(fs.existsSync(absolutePath), `${article.file}が存在しません`);
  }
});
