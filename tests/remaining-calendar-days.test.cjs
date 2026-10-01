const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function loadCalcPure(dateClass = Date) {
  const source = fs.readFileSync(path.join(root, 'js', 'calculator-core.js'), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  const context = { Date: dateClass };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__CALC_PURE = CALC_PURE;`, context);
  return context.__CALC_PURE;
}

test('remaining calendar days uses date-only boundaries', () => {
  const calc = loadCalcPure();

  assert.equal(calc.getRemainingCalendarDays(new Date(2026, 11, 31, 23, 30)), 1);
  assert.equal(calc.getRemainingCalendarDays(new Date(2026, 0, 1, 12, 0)), 365);
  assert.equal(calc.getRemainingCalendarDays(new Date(2026, 10, 17, 23, 59)), 45);
  assert.equal(calc.getRemainingCalendarDays(new Date(2026, 10, 16, 23, 59)), 46);
});

test('remaining calendar days handles leap-year boundaries', () => {
  const calc = loadCalcPure();

  assert.equal(calc.getRemainingCalendarDays(new Date(2028, 0, 1, 12, 0)), 366);
  assert.equal(calc.getRemainingCalendarDays(new Date(2028, 1, 28, 12, 0)), 308);
  assert.equal(calc.getRemainingCalendarDays(new Date(2028, 1, 29, 12, 0)), 307);
  assert.equal(calc.getRemainingCalendarDays(new Date(2028, 2, 1, 12, 0)), 306);
  assert.equal(calc.getRemainingCalendarDays(new Date(2028, 11, 31, 23, 30)), 1);
});

test('DST date boundaries produce the correct user-visible daily amount', () => {
  const script = String.raw`
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync('js/calculator-core.js', 'utf8')
      .replace(/^import .*;\s*$/gm, '')
      .replace(/^export\s+/gm, '');
    const context = { Date };
    vm.createContext(context);
    vm.runInContext(source + '\nglobalThis.__CALC_PURE = CALC_PURE;', context);
    const baseDate = new Date(2026, 6, 1, 0, 30);
    const nextYearStart = new Date(baseDate.getFullYear() + 1, 0, 1);
    const oldElapsedDayResult = Math.max(0, Math.ceil((nextYearStart - baseDate) / 86400000));
    const { createInput, createSelect, loadCalculatorContext } = require('./tests/helpers/playpoint-calculator-test-context.cjs');
    class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : [2026, 6, 1, 0, 30])); }
    }
    const runtime = loadCalculatorContext(FixedDate);
    const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = runtime;
    PP_STATE.currentRegion = 'JP';
    PP_STATE.dom.currentStatus = createSelect();
    PP_STATE.dom.reverseStatus = createSelect();
    PP_STATE.dom.targetStatus = createSelect();
    PP_STATE.dom.baseRate = createInput();
    PP_STATE.dom.neededPoints = createInput('185');
    PP_STATE.dom.multiplier = createInput('1');
    PP_STATE.dom.result = {dataset: {}};
    populateStatusSelects();
    updateBaseRateAndTarget();
    calculate();
    const visibleDailyAmount = renderedResults[0].content.match(/1日あたり目安[^<]*[\s\S]*?data-value="(\d+)"/)?.[1];
    process.stdout.write(JSON.stringify({
      calendarDays: context.__CALC_PURE.getRemainingCalendarDays(baseDate),
      oldElapsedDayResult,
      isError: renderedResults[0].isError,
      requiredAmount: PP_STATE.dom.result.dataset.requiredYen,
      visibleDailyAmount: Number(visibleDailyAmount)
    }));
  `;

  const child = spawnSync(process.execPath, ['-e', script], {
    cwd: root,
    env: { ...process.env, TZ: 'America/New_York' },
    encoding: 'utf8', timeout: 15000
  });

  if (child.error) throw child.error;
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    calendarDays: 184,
    oldElapsedDayResult: 185,
    isError: false,
    requiredAmount: 18500,
    visibleDailyAmount: 101
  });
});
