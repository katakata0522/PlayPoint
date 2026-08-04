from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


calculator_path = Path("js/calculator.js")
config_path = Path("js/config.js")
test_path = Path("tests/playpoint-regression.test.cjs")

calculator = calculator_path.read_text(encoding="utf-8")
config = config_path.read_text(encoding="utf-8")
tests = test_path.read_text(encoding="utf-8")

if "errorZeroPointPurchase" in config and "hasPackAmount && pointsPerPurchase <= 0" in calculator:
    print("Zero-point purchase guard is already applied.")
    raise SystemExit(0)

calculator = replace_once(
    calculator,
    """        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;
        const mainResult = CALC_PURE.computeMainResult({
""",
    """        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;
        const hasPackAmount = packAmount !== null && packAmount > 0;
        const pointsPerPurchase = hasPackAmount
            ? CALC_PURE.getPointsForPurchase(packAmount, finalRate, spendUnit)
            : null;

        if (hasPackAmount && pointsPerPurchase <= 0) {
            return UI.displayResult(
                STATE.dom.result,
                texts.errorZeroPointPurchase || texts.errorInput,
                true
            );
        }

        const mainResult = CALC_PURE.computeMainResult({
""",
    "main calculation pack validation",
)

calculator = replace_once(
    calculator,
    """                <p class=\"rounding-assumption-note\" style=\"font-size:0.82em; color:var(--link-color); margin:0.8em 0 0; line-height:1.5;\">${packsNeeded !== null ? texts.roundingNoteWithPack : texts.roundingNoteWithoutPack}</p>
""",
    """                <p class=\"rounding-assumption-note\" style=\"font-size:0.82em; color:var(--link-color); margin:0.8em 0 0; line-height:1.5;\">${hasPackAmount ? texts.roundingNoteWithPack : texts.roundingNoteWithoutPack}</p>
""",
    "rounding note selection",
)

calculator = replace_once(
    calculator,
    """        const spendUnit = config.spendUnit || 100;
        const earnedPointsRaw = (amountYen / spendUnit) * finalRate;
        const earnedPoints = Math.round(earnedPointsRaw);
""",
    """        const spendUnit = config.spendUnit || 100;
        const { earnedPoints, earnedPointsRaw } = CALC_PURE.computeReverseResult({
            amountYen,
            finalRate,
            spendUnit
        });
""",
    "reverse pure calculation delegation",
)

config_replacements = [
    (
        '            errorTargetConsistency: "入力した必要ポイントが、選択した目標ステータスに対して不正です。値を確認してください。",\n',
        '            errorTargetConsistency: "入力した必要ポイントが、選択した目標ステータスに対して不正です。値を確認してください。",\n'
        '            errorZeroPointPurchase: "入力した1回あたりの課金額では、1回の獲得ポイントが四捨五入後に0ポイントになります。課金額を大きくして再計算してください。",\n',
        "Japanese zero-point error",
    ),
    (
        '            errorTargetConsistency: "The points-to-goal value is not valid for the selected target status.",\n',
        '            errorTargetConsistency: "The points-to-goal value is not valid for the selected target status.",\n'
        '            errorZeroPointPurchase: "At the entered amount, each purchase rounds to 0 points. Enter a larger amount and calculate again.",\n',
        "English zero-point error",
    ),
    (
        '            errorTargetConsistency: "입력한 필요 포인트가 선택한 목표 등급에 대해 올바르지 않습니다.",\n',
        '            errorTargetConsistency: "입력한 필요 포인트가 선택한 목표 등급에 대해 올바르지 않습니다.",\n'
        '            errorZeroPointPurchase: "입력한 1회 결제 금액으로는 구매당 적립 포인트가 반올림 후 0포인트가 됩니다. 더 큰 금액을 입력해 다시 계산해 주세요.",\n',
        "Korean zero-point error",
    ),
    (
        '            errorTargetConsistency: "輸入的所需點數與選擇的目標等級不符，請確認數值。",\n',
        '            errorTargetConsistency: "輸入的所需點數與選擇的目標等級不符，請確認數值。",\n'
        '            errorZeroPointPurchase: "以目前輸入的單筆消費金額計算，每筆獲得點數四捨五入後為0點。請輸入較高金額後重新計算。",\n',
        "Traditional Chinese zero-point error",
    ),
]
for old, new, label in config_replacements:
    config = replace_once(config, old, new, label)

test_anchor = """test('逆算モードは入力額を1回の購入として丸める前提を表示する', () => {
"""
zero_point_test = """test('1回0ポイントになる購入額は概算へフォールバックせずエラーにする', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('6');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('0.01');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, true);
  assert.ok(renderedResults[0].content.includes('each purchase rounds to 0 points'));
  assert.ok(!renderedResults[0].content.includes('data-value=\"6\"'));
});

"""
tests = replace_once(
    tests,
    test_anchor,
    zero_point_test + test_anchor,
    "zero-point purchase regression test",
)

calculator_path.write_text(calculator, encoding="utf-8")
config_path.write_text(config, encoding="utf-8")
test_path.write_text(tests, encoding="utf-8")
print("Applied zero-point purchase guard and pure reverse delegation.")
