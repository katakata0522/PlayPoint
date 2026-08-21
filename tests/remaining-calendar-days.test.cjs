const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const calculatorPath = path.join(root, 'js', 'calculator.js');

function loadCalcPure(dateClass = Date) {
  const source = fs.readFileSync(calculatorPath, 'utf8')
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

test('remaining calendar days is stable while New York is on DST', () => {
  const script = String.raw`
    const fs = require('node:fs');
    const vm = require('node:vm');
    const source = fs.readFileSync('js/calculator.js', 'utf8')
      .replace(/^import .*;\\s*$/gm, '')
      .replace(/^export\\s+/gm, '');
    const context = { Date };
    vm.createContext(context);
    vm.runInContext(source + '\\nglobalThis.__CALC_PURE = CALC_PURE;', context);
    const baseDate = new Date(2026, 6, 1, 0, 30);
    const nextYearStart = new Date(baseDate.getFullYear() + 1, 0, 1);
    const oldElapsedDayResult = Math.max(0, Math.ceil((nextYearStart - baseDate) / 86400000));
    process.stdout.write(JSON.stringify({
      calendarDays: context.__CALC_PURE.getRemainingCalendarDays(baseDate),
      oldElapsedDayResult
    }));
  `;

  const child = spawnSync(process.execPath, ['-e', script], {
    cwd: root,
    env: { ...process.env, TZ: 'America/New_York' },
    encoding: 'utf8'
  });

  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    calendarDays: 184,
    oldElapsedDayResult: 185
  });
});

test('calculator runtime delegates remaining days to CALC_PURE', () => {
  const source = fs.readFileSync(calculatorPath, 'utf8');
  assert.match(source, /const remainingDays = CALC_PURE\.getRemainingCalendarDays\(now\);/);
  assert.doesNotMatch(source, /Math\.ceil\(\(nextYearStart - now\) \/ \(1000 \* 60 \* 60 \* 24\)\)/);
});
