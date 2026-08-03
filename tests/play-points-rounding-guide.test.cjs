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
  assert.match(html, /税金を除いた対象価格/);
  assert.match(html, /購入ごとに最も近い整数へ丸める（四捨五入する）/);
  assert.match(html, /分割購入と合計計算で差が出る理由/);
  assert.match(html, /税額や対象可否を判定する機能ではありません/);
  assert.match(html, /play-points-rounding\.js/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/2850368/);
});

test('記事冒頭は貯める金額と使う価値を分けて即答する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /結論：ブロンズは100円で約1ポイント/);
  assert.match(html, /1ポイントを貯めるために必要な金額/);
  assert.match(html, /1ポイントを使うときの価値は交換先によって変わり、常に1円分とは限りません/);
});

test('記事固有の導線だけを1つずつ表示し、自動導線の重複を防ぐ', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.equal((html.match(/class="article-calculator-prompt rounding-jump"/g) || []).length, 1);
  assert.equal((html.match(/class="article-next-step-cta"/g) || []).length, 1);
  assert.equal((html.match(/class="contextual-guide-links related-links-section"/g) || []).length, 1);
  assert.match(html, /href="#rounding-simulator-section"/);
  assert.doesNotMatch(html, /<section class="cta-box"/);
});

test('スマホでは比較表をカード表示し、主要操作を画面幅いっぱいにする', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  const css = read('articles/styles/2026-07-24-play-points-1-value.css');
  assert.equal((html.match(/class="rounding-table"/g) || []).length, 2);
  assert.equal((html.match(/class="table-wrap rounding-table-wrap"/g) || []).length, 2);
  assert.match(html, /data-label="100円あたり"/);
  assert.match(html, /data-label="途中計算"/);
  assert.match(css, /\.rounding-table td::before/);
  assert.match(css, /\.rounding-jump__button,\s*\.rounding-action\s*\{\s*width:\s*100%/);
});

test('FAQと補助導線は主要目次へ混入しない構造にする', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /<section class="section faq">/);
  assert.match(html, /<aside class="contextual-guide-links related-links-section"/);
  assert.doesNotMatch(html, /<section class="section related-links-section"/);
});

test('シミュレーターは初期条件と試算結果を明示する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  const js = read('js/play-points-rounding.js');
  assert.match(html, /<option value="1" selected>ブロンズ：1<\/option>/);
  assert.match(html, /初期値は、記事冒頭の基準に合わせて/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(js, /rounding-result-title">試算結果/);
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
