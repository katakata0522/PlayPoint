(() => {
  'use strict';

  const root = document.querySelector('[data-maintenance-calculator]');
  if (!root) return;

  const form = root.querySelector('[data-maintenance-form]');
  const input = root.querySelector('[data-progress-input]');
  const error = root.querySelector('[data-input-error]');
  const complete = root.querySelector('[data-complete-state]');
  const target = Number(root.dataset.target);
  const rate = Number(root.dataset.rate);
  const spendUnit = Number(root.dataset.spendUnit);
  const locale = root.dataset.locale || 'en-US';
  const currency = root.dataset.currency || 'USD';
  const completionText = root.dataset.completionText || '';
  const invalidText = root.dataset.invalidText || 'Enter a valid number.';

  const pointFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 0 : 0
  });

  const setText = (name, value) => {
    root.querySelectorAll('[data-output="' + name + '"]').forEach((node) => {
      node.textContent = value;
    });
  };

  const estimateSpend = (remaining, multiplier) =>
    Math.ceil((remaining / (rate * multiplier)) * spendUnit);

  const recalculate = () => {
    const progress = Number(input.value);
    const isValid = Number.isFinite(progress) && progress >= 0;

    if (!isValid) {
      error.hidden = false;
      error.textContent = invalidText;
      return;
    }

    error.hidden = true;
    const normalizedProgress = Math.floor(progress);
    const remaining = Math.max(0, target - normalizedProgress);
    const baseSpend = estimateSpend(remaining, 1);
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    const remainingDays = Math.max(1, Math.ceil((yearEnd.getTime() - now.getTime()) / 86400000));
    const remainingWeeks = Math.max(1 / 7, remainingDays / 7);
    const remainingMonths = Math.max(1 / 30.4375, remainingDays / 30.4375);

    setText('year', String(now.getFullYear()));
    setText('target', pointFormatter.format(target));
    setText('remaining', pointFormatter.format(remaining));
    setText('base', currencyFormatter.format(baseSpend));
    setText('double', currencyFormatter.format(estimateSpend(remaining, 2)));
    setText('triple', currencyFormatter.format(estimateSpend(remaining, 3)));
    setText('monthly', currencyFormatter.format(Math.ceil(baseSpend / remainingMonths)));
    setText('weekly', currencyFormatter.format(Math.ceil(baseSpend / remainingWeeks)));
    setText('daily', currencyFormatter.format(Math.ceil(baseSpend / remainingDays)));
    setText('days', pointFormatter.format(remainingDays));

    complete.hidden = remaining !== 0;
    if (remaining === 0) complete.textContent = completionText;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    recalculate();
    root.querySelector('[data-results]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  input.addEventListener('input', recalculate);
  recalculate();
})();
