'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { calculatePurchasePoints, roundPoints } = require('../js/play-points-rounding.js');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const registryPath = path.join(root, 'blog', 'articles.json');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function normalizeText(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

test('公式例のシルバー500円は6ポイントへ丸める', () => {
  const result = calculatePurchasePoints({ price: 500, count: 1, rate: 1.25 });
  assert.equal(result.perPurchaseRaw, 6.25);
  assert.equal(result.perPurchaseRounded, 6);
  assert.equal(result.separateTotal, 6);
});

test('購入ごとの丸めと総額への一度だけの丸めを分ける', () => {
  const result = calculatePurchasePoints({ price: 40, count: 2, rate: 1.5 });
  assert.equal(result.perPurchaseRounded, 1);
  assert.equal(result.separateTotal, 2);
  assert.equal(result.combinedRounded, 1);
  assert.equal(result.difference, 1);
});

test('丸め関数は非負のポイントを最も近い整数へ丸める', () => {
  assert.equal(roundPoints(6.25), 6);
  assert.equal(roundPoints(7.5), 8);
  assert.throws(() => roundPoints(-0.1), /0以上/);
});

test('不正な購入回数と獲得率を拒否する', () => {
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 0, rate: 1 }), /1～1000/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1.5, rate: 1 }), /整数/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1, rate: 0 }), /0より大きい/);
});

test('記事は税抜・商品ごとの丸め・限界を明示する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /ポイント対象はアイテム価格のみで税金を含めず/);
  assert.match(html, /最も近い整数へ四捨五入/);
  assert.match(html, /分割購入と合計計算で差が出る理由/);
  assert.match(html, /税額や対象可否を判定する機能ではありません/);
  assert.match(html, /play-points-rounding\.js/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/2850368/);
});

test('画面のFAQとFAQPage構造化データが一致する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  const scripts = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const faqPage = scripts.find(item => item['@type'] === 'FAQPage');
  assert.ok(faqPage);

  const visible = [...html.matchAll(/<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g)]
    .map(match => ({ name: normalizeText(match[1]), answer: normalizeText(match[2]) }));
  const structured = faqPage.mainEntity.map(item => ({
    name: normalizeText(item.name),
    answer: normalizeText(item.acceptedAnswer.text)
  }));
  assert.deepEqual(structured, visible);
});

test('記事台帳は既存記事の役割を維持して更新日と説明を同期する', () => {
  const articles = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const entry = articles.find(article => article.id === 'points-value-1');
  assert.ok(entry);
  assert.equal(entry.modified, '2026-08-03');
  assert.match(entry.description, /商品ごとの四捨五入/);
  assert.equal(articles.filter(article => /丸め|端数/.test(article.title)).length, 0,
    '既存記事と重複する丸め専用記事を追加しないでください');
});
