'use strict';

(function attachPlayPointsRounding(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlayPointsRounding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPlayPointsRounding() {
  function toFiniteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(label + 'は数値で入力してください。');
    return number;
  }

  function roundPoints(value) {
    const number = toFiniteNumber(value, 'ポイント');
    if (number < 0) throw new RangeError('ポイントは0以上で計算してください。');
    return Math.round(number);
  }

  function calculatePurchasePoints(input) {
    const price = toFiniteNumber(input.price, '対象価格');
    const count = toFiniteNumber(input.count, '購入回数');
    const rate = toFiniteNumber(input.rate, '獲得率');

    if (price < 0) throw new RangeError('対象価格は0円以上で入力してください。');
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      throw new RangeError('購入回数は1～1000の整数で入力してください。');
    }
    if (rate <= 0) throw new RangeError('獲得率は0より大きい値を選んでください。');

    const perPurchaseRaw = price / 100 * rate;
    const perPurchaseRounded = roundPoints(perPurchaseRaw);
    const separateTotal = perPurchaseRounded * count;
    const combinedRaw = price * count / 100 * rate;
    const combinedRounded = roundPoints(combinedRaw);

    return {
      price,
      count,
      rate,
      perPurchaseRaw,
      perPurchaseRounded,
      separateTotal,
      combinedRaw,
      combinedRounded,
      difference: separateTotal - combinedRounded
    };
  }

  function formatDecimal(value) {
    return Number(value.toFixed(4)).toLocaleString('ja-JP');
  }

  function renderResult(resultElement, result) {
    const differenceText = result.difference === 0
      ? '差はありません'
      : result.difference > 0
        ? '購入ごとの丸めが ' + result.difference + 'ポイント多い試算'
        : '合計後の丸めが ' + Math.abs(result.difference) + 'ポイント多い試算';

    resultElement.innerHTML = '<dl>'
      + '<dt>1回の丸め前</dt><dd>' + formatDecimal(result.perPurchaseRaw) + 'ポイント</dd>'
      + '<dt>1回の丸め後</dt><dd>' + result.perPurchaseRounded.toLocaleString('ja-JP') + 'ポイント</dd>'
      + '<dt>購入ごとに丸めた合計</dt><dd><strong>' + result.separateTotal.toLocaleString('ja-JP') + 'ポイント</strong></dd>'
      + '<dt>総額へ一度だけ丸めた場合</dt><dd>' + result.combinedRounded.toLocaleString('ja-JP') + 'ポイント</dd>'
      + '<dt>比較結果</dt><dd>' + differenceText + '</dd>'
      + '</dl><p class="small">税額・対象可否・キャンペーン条件は計算していません。実際の付与はGoogle Playの表示を確認してください。</p>';
  }

  function initRoundingSimulator(doc) {
    if (!doc) return false;
    const priceInput = doc.getElementById('rounding-price');
    const countInput = doc.getElementById('rounding-count');
    const rateInput = doc.getElementById('rounding-rate');
    const button = doc.getElementById('rounding-calculate');
    const resultElement = doc.getElementById('rounding-result');
    if (!priceInput || !countInput || !rateInput || !button || !resultElement) return false;

    const calculateAndRender = function calculateAndRender() {
      try {
        renderResult(resultElement, calculatePurchasePoints({
          price: priceInput.value,
          count: countInput.value,
          rate: rateInput.value
        }));
      } catch (error) {
        resultElement.textContent = error.message;
      }
    };

    button.addEventListener('click', calculateAndRender);
    calculateAndRender();
    return true;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function onReady() {
        initRoundingSimulator(document);
      }, { once: true });
    } else {
      initRoundingSimulator(document);
    }
  }

  return { calculatePurchasePoints, initRoundingSimulator, roundPoints };
});
