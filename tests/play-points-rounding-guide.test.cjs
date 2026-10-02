const { openingTags } = require('./helpers/markup-contract.cjs');
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { calculatePurchasePoints, initRoundingSimulator, roundPoints } = require('../js/play-points-rounding.js');

const root = path.resolve(__dirname, '..');
const articlePath = path.join(root, 'articles', '2026-07-24-play-points-1-value.html');
const registryPath = path.join(root, 'blog', 'articles.json');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function normalizeText(value) {
  // 表示テキストと構造化データは、タグ境界の空白を除いて比較する。
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, '').trim();
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
  assert.equal(roundPoints(0), 0);
  assert.throws(() => roundPoints(-0.1), /0以上/);
  assert.throws(() => roundPoints(Infinity), TypeError);
});

test('不正な購入回数と獲得率を拒否する', () => {
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 0, rate: 1 }), /1～1000/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1.5, rate: 1 }), /整数/);
  assert.equal(calculatePurchasePoints({ price: 100, count: 1000, rate: 1 }).separateTotal, 1000);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1001, rate: 1 }), RangeError);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1, rate: 0 }), /0より大きい/);
  assert.throws(() => calculatePurchasePoints({ price: 100, count: 1, rate: Infinity }), TypeError);
});

test('記事は税抜・四捨五入・機能の限界を明示する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /税金を除いた対象価格/);
  assert.match(html, /その結果を<strong>最も近い整数へ丸める（四捨五入する）<\/strong>/);
  assert.match(html, /分割購入と合計計算で差が出る理由/);
  assert.match(html, /税額や対象可否を判定せず/);
  assert.match(html, /play-points-rounding\.js/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9077192/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/9080348/);
  assert.match(html, /support\.google\.com\/googleplay\/answer\/2850368/);
});

test('記事冒頭は通常獲得率と交換価値を分けて即答する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /結論：通常のブロンズは対象価格100円で1ポイント/);
  assert.match(html, /税金を除いた対象アイテム価格100円あたり1ポイント/);
  assert.match(html, /1ポイントを貯めるために必要な金額/);
  assert.match(html, /1ポイントを使うときの価値は交換先によって変わり、常に1円分とは限りません/);
});

test("記事固有の導線だけを1つずつ表示し、自動導線の重複を防ぐ", () => {
  const tags=openingTags(fs.readFileSync(articlePath,'utf8'));
  const has=(tag,value)=>(tag.attrs.class||'').split(/\s+/).includes(value);
  for(const token of ['rounding-jump','article-next-step-cta'])assert.equal(tags.filter(tag=>has(tag,token)).length,1,token);
  assert.equal(tags.filter(tag=>has(tag,'contextual-guide-links')&&has(tag,'related-links-section')).length,1);
  assert.ok(tags.some(tag=>tag.tag==='a'&&tag.attrs.href==='#rounding-simulator-section'));
});


test('シミュレーターは差が見える初期例と利用限界を明示する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  assert.match(html, /id="rounding-price"[^>]*value="40"/);
  assert.match(html, /<option value="1\.5" selected>ゴールド：1\.5<\/option>/);
  assert.match(html, /丸め方の差が見える架空例/);
  assert.match(html, /実際の付与予測には使わないでください/);
  assert.match(html, /id="rounding-result" aria-live="off" aria-atomic="true"/);
  assert.doesNotMatch(html, /id="rounding-result"[^>]*role="status"/);
  const attributes = new Map();
  const result = {innerHTML: '', textContent: '',
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); }};
  const clicks = [];
  const inputs = {'rounding-price': {value: '40'}, 'rounding-count': {value: '2'},
    'rounding-rate': {value: '1.5'}, 'rounding-result': result,
    'rounding-calculate': {addEventListener(type, callback) {
      assert.equal(type, 'click'); clicks.push(callback);
    }}};
  assert.equal(initRoundingSimulator({getElementById: id => inputs[id]}), true);
  assert.equal(attributes.get('aria-live'), 'off', '初期試算を自動読み上げしない');
  assert.equal(attributes.has('role'), false);
  assert.match(result.innerHTML, /購入ごとの丸めが 1ポイント多い試算/);
  assert.equal(clicks.length, 1);
  inputs['rounding-price'].value = '200';
  clicks[0]();
  assert.equal(attributes.get('role'), 'status');
  assert.equal(attributes.get('aria-live'), 'polite');
  assert.match(result.innerHTML, /差はありません/, '操作後に新しい値で再計算する');
  inputs['rounding-count'].value = '0';
  clicks[0]();
  assert.match(result.textContent, /購入回数/, '不正入力を画面へ説明する');
  assert.equal(initRoundingSimulator({getElementById() { return null; }}), false);
});

test('記事固有の条件説明は生成後も読める', () => {
  const { EDITORIAL_TARGETS, renderKnowledgeBoundary } = require('../scripts/article-editorial-structure.cjs');
  const config = EDITORIAL_TARGETS['articles/2026-07-24-play-points-1-value.html'];
  const rendered = renderKnowledgeBoundary(config);
  const html = fs.readFileSync(articlePath, 'utf8');
  for (const text of ['税金を除いた対象アイテム価格', '最も近い整数', '購入前', '購入後']) {
    assert.ok(rendered.includes(text));
    assert.ok(html.includes(text));
  }
  assert.doesNotMatch(rendered, /knowledge-boundary__grid/);
});

test('画面のFAQとFAQPage構造化データが一致する', () => {
  const html = fs.readFileSync(articlePath, 'utf8');
  const scripts = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const faqPage = scripts.find(item => item['@type'] === 'FAQPage');
  assert.ok(faqPage);

  const visible = [...html.matchAll(/<div class="faq-item"><h3\b[^>]*>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g)]
    .map(match => ({ name: normalizeText(match[1]), answer: normalizeText(match[2]) }));
  const structured = faqPage.mainEntity.map(item => ({
    name: normalizeText(item.name),
    answer: normalizeText(item.acceptedAnswer.text)
  }));
  assert.ok(visible.length > 0, '表示FAQを空のまま合格させない');
  assert.ok(structured.length > 0, '構造化FAQを空のまま合格させない');
  assert.deepEqual(structured, visible);
});

test('記事台帳は既存記事の役割を維持して更新日と説明を同期する', () => {
  const articles = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const entry = articles.find(article => article.id === 'points-value-1');
  const html = fs.readFileSync(articlePath, 'utf8');
  const modified = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})"/)?.[1];
  assert.ok(entry);
  assert.ok(modified, 'article last-modified is required');
  assert.equal(entry.modified, modified);
  assert.match(entry.description, /商品ごとの四捨五入/);
});
