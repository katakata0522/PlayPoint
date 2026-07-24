'use strict';

const REGIONS = {
  JP: {
    locale: 'ja-JP',
    currency: 'JPY',
    unit: 100,
    precision: 0,
    statuses: [
      ['ブロンズ', 1],
      ['シルバー', 1.25],
      ['ゴールド', 1.5],
      ['プラチナ', 1.75],
      ['ダイヤモンド', 2]
    ],
    resultLabel: '必要な購入額の目安',
    rateLabel: '適用レート',
    note: '購入ごとにポイントが四捨五入されるため、実際の合計は購入の分け方や対象金額で前後します。',
    error: 'ポイント数と倍率を正しく入力してください。',
    copied: '計算条件のURLをコピーしました'
  },
  US: {
    locale: 'en-US',
    currency: 'USD',
    unit: 1,
    precision: 2,
    statuses: [
      ['Bronze', 1],
      ['Silver', 1.1],
      ['Gold', 1.2],
      ['Platinum', 1.4],
      ['Diamond', 1.6]
    ],
    resultLabel: 'Estimated eligible spend',
    rateLabel: 'Applied earn rate',
    note: 'Google rounds points for each item, so the actual total can vary with item prices, taxes, and eligibility.',
    error: 'Enter valid points and a valid multiplier.',
    copied: 'Calculation link copied'
  },
  KR: {
    locale: 'ko-KR',
    currency: 'KRW',
    unit: 1000,
    precision: 0,
    statuses: [
      ['브론즈', 1],
      ['실버', 1.1],
      ['골드', 1.3],
      ['플래티넘', 1.6],
      ['다이아몬드', 2]
    ],
    resultLabel: '예상 필요 결제액',
    rateLabel: '적용 적립률',
    note: '포인트는 구매 건별로 반올림되므로 상품 가격, 세금, 적립 대상 여부에 따라 실제 합계가 달라질 수 있습니다.',
    error: '포인트와 배율을 올바르게 입력하세요.',
    copied: '계산 조건 링크를 복사했습니다'
  },
  TW: {
    locale: 'zh-TW',
    currency: 'TWD',
    unit: 30,
    precision: 0,
    statuses: [
      ['銅級', 1],
      ['銀級', 1.25],
      ['黃金級', 1.5],
      ['白金級', 1.75],
      ['鑽石級', 2]
    ],
    resultLabel: '預估所需消費金額',
    rateLabel: '套用積點率',
    note: '點數會依每筆商品價格四捨五入，因此實際結果可能因購買拆分、稅金與適用資格而不同。',
    error: '請輸入有效點數與活動倍率。',
    copied: '已複製計算條件連結'
  }
};

function getNumber(input, min, max) {
  if (!input || (input.validity && !input.validity.valid)) return null;
  const value = Number(input.value);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function roundSpend(value, precision) {
  const factor = 10 ** precision;
  return Math.ceil((value + Number.EPSILON) * factor) / factor;
}

function formatMoney(value, config) {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.precision,
    maximumFractionDigits: config.precision
  }).format(value);
}

function pointBucket(points) {
  if (points < 100) return '1_99';
  if (points < 500) return '100_499';
  if (points < 1000) return '500_999';
  return '1000_plus';
}

function trackCalculation(region, status, points) {
  if (!window.PlayPointConsent || window.PlayPointConsent.getStatus() !== 'granted') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'points_cost_calculation_completed', {
    region,
    status,
    point_bucket: pointBucket(points)
  });
}

function updateUrl(points, statusIndex, multiplier) {
  const url = new URL(window.location.href);
  url.searchParams.set('points', String(points));
  url.searchParams.set('status', String(statusIndex));
  url.searchParams.set('multiplier', String(multiplier));
  history.replaceState(null, '', url);
  return url.toString();
}

function init() {
  const region = document.body.dataset.region;
  const config = REGIONS[region];
  if (!config) return;

  const form = document.getElementById('points-cost-form');
  const pointsInput = document.getElementById('points-target');
  const statusSelect = document.getElementById('points-status');
  const multiplierInput = document.getElementById('points-multiplier');
  const result = document.getElementById('points-cost-result');
  const copyButton = document.getElementById('copy-points-cost-link');

  config.statuses.forEach(([label, rate], index) => {
    const option = new Option(`${label} — ${rate} pt / ${config.unit.toLocaleString(config.locale)}`, String(index));
    statusSelect.add(option);
  });

  function calculate({ track = true } = {}) {
    const points = getNumber(pointsInput, 1, 1000000);
    const multiplier = getNumber(multiplierInput, 1, 10);
    const statusIndex = Number(statusSelect.value);
    const status = config.statuses[statusIndex];

    if (points === null || multiplier === null || !status) {
      result.classList.add('is-error');
      result.textContent = config.error;
      copyButton.hidden = true;
      return;
    }

    const finalRate = status[1] * multiplier;
    const spend = roundSpend((points / finalRate) * config.unit, config.precision);
    const url = updateUrl(points, statusIndex, multiplier);
    result.classList.remove('is-error');
    result.innerHTML = `
      <p class="points-cost-result-label">${config.resultLabel}</p>
      <p class="points-cost-result-value">${formatMoney(spend, config)}</p>
      <p class="points-cost-result-rate">${config.rateLabel}: ${finalRate.toFixed(2)} pt / ${config.unit.toLocaleString(config.locale)}</p>
      <p class="points-cost-result-note">${config.note}</p>
    `;
    result.dataset.shareUrl = url;
    copyButton.hidden = false;
    if (track) trackCalculation(region, status[0], points);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    calculate();
  });

  document.querySelectorAll('[data-points-preset]').forEach(button => {
    button.addEventListener('click', () => {
      pointsInput.value = button.dataset.pointsPreset;
      calculate();
    });
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result.dataset.shareUrl || window.location.href);
      copyButton.textContent = config.copied;
      window.setTimeout(() => {
        copyButton.textContent = copyButton.dataset.defaultLabel;
      }, 1800);
    } catch (error) {
      window.prompt('', result.dataset.shareUrl || window.location.href);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const points = Number(params.get('points'));
  const status = Number(params.get('status'));
  const multiplier = Number(params.get('multiplier'));
  if (Number.isFinite(points) && points >= 1 && points <= 1000000) pointsInput.value = String(points);
  if (Number.isInteger(status) && status >= 0 && status < config.statuses.length) statusSelect.value = String(status);
  if (Number.isFinite(multiplier) && multiplier >= 1 && multiplier <= 10) multiplierInput.value = String(multiplier);
  if (params.has('points')) calculate({ track: false });
}

document.addEventListener('DOMContentLoaded', init);
