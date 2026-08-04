from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


config_path = Path('js/config.js')
config = config_path.read_text(encoding='utf-8')
translation_updates = {
    'resultLabelRate: "適用獲得率",': 'resultLabelRate: "適用獲得率", roundingNoteWithoutPack: "購入金額の内訳が不明なため、購入ごとのポイント四捨五入を含めない概算です。1回あたりの平均課金額を入力すると、より実際に近い試算になります。", roundingNoteWithPack: "入力した1回あたりの課金額ごとにポイントを四捨五入し、必要な購入回数を計算しています。", roundingNoteReverse: "入力した金額を1回の購入として四捨五入しています。複数回の購入合計を入力した場合、実際のポイントと異なることがあります。",',
    'resultLabelRate: "Applied earn rate",': 'resultLabelRate: "Applied earn rate", roundingNoteWithoutPack: "Because the purchase breakdown is unknown, this estimate does not apply purchase-by-purchase point rounding. Enter an average amount per purchase for a closer estimate.", roundingNoteWithPack: "Points are rounded for each entered purchase amount before the required number of purchases is calculated.", roundingNoteReverse: "The entered amount is rounded as one purchase. If it is the total of multiple purchases, the actual points may differ.",',
    'resultLabelRate: "적용 적립률",': 'resultLabelRate: "적용 적립률", roundingNoteWithoutPack: "구매별 금액 구성이 없으므로 구매 건별 포인트 반올림을 적용하지 않은 예상치입니다. 1회 평균 결제 금액을 입력하면 실제에 더 가까운 결과를 확인할 수 있습니다.", roundingNoteWithPack: "입력한 1회 결제 금액마다 포인트를 반올림한 뒤 필요한 구매 횟수를 계산합니다.", roundingNoteReverse: "입력한 금액을 한 번의 구매로 보고 포인트를 반올림합니다. 여러 구매의 합계 금액이면 실제 포인트와 다를 수 있습니다.",',
    'resultLabelRate: "套用回饋率",': 'resultLabelRate: "套用回饋率", roundingNoteWithoutPack: "由於未提供每筆購買金額，本結果是不套用逐筆點數四捨五入的估算。輸入平均單筆消費金額，可得到更接近實際情況的試算。", roundingNoteWithPack: "系統會先針對每筆輸入的消費金額四捨五入點數，再計算所需購買次數。", roundingNoteReverse: "系統會將輸入金額視為單筆購買並四捨五入點數。若輸入的是多筆購買總額，實際點數可能不同。",'
}
for old, new in translation_updates.items():
    config = replace_once(config, old, new, f'add translation after {old}')
config_path.write_text(config, encoding='utf-8')

calculator_path = Path('js/calculator.js')
calculator = calculator_path.read_text(encoding='utf-8')
calculator = replace_once(
    calculator,
    """        const remainingMonths = this.getRemainingMonths();
        
        const finalNeededPoints = neededPoints;

        const spendUnit = config.spendUnit || 100;
        let totalAmountNeeded = 0;
        let packResultContent = '';

        // パック額が入力されているか検証
        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;

        if (finalNeededPoints <= 0) {
            totalAmountNeeded = 0;
        } else if (packAmount !== null && packAmount > 0) {
            const pointsPerPack = CALC_PURE.getPointsForPurchase(packAmount, finalRate, spendUnit);
            
            if (pointsPerPack <= 0) {
                totalAmountNeeded = Math.ceil((finalNeededPoints / finalRate) * spendUnit);
            } else {
                const packsNeeded = Math.ceil(finalNeededPoints / pointsPerPack);
                totalAmountNeeded = CALC_PURE.roundCurrencyAmount(packsNeeded * packAmount);
                const packStr = texts.packUnit || 'packs';
                packResultContent = `
                    <dt>${texts.resultLabelRequiredPacks || '必要購入パック数'}</dt>
                    <dd><b><span class=\"count-target\" data-value=\"${packsNeeded}\">0</span> ${packStr}</b> <span style=\"font-size:0.8em; color:var(--link-color);\">(${packAmount.toLocaleString(config.lang)}${config.currencySymbol}/${packStr})</span></dd>
                `;
            }
        } else {
            totalAmountNeeded = Math.ceil((finalNeededPoints / finalRate) * spendUnit);
        }
""",
    """        const finalNeededPoints = neededPoints;
        const spendUnit = config.spendUnit || 100;

        // 購入単位が分かる場合だけ、購入1回ごとのポイント丸めを適用する。
        // 未入力時は購入回数と価格構成が分からないため、丸めを仮定しない概算にする。
        const packAmount = STATE.dom.packAmount ? this.getValidNumberInput(STATE.dom.packAmount, 0) : null;
        const mainResult = CALC_PURE.computeMainResult({
            neededPoints: finalNeededPoints,
            finalRate,
            packAmount: packAmount || 0,
            spendUnit,
            baseDate: now
        });
        const { totalAmountNeeded, packsNeeded, remainingMonths } = mainResult;
        let packResultContent = '';

        if (packsNeeded !== null) {
            const packStr = texts.packUnit || 'packs';
            packResultContent = `
                <dt>${texts.resultLabelRequiredPacks || '必要購入パック数'}</dt>
                <dd><b><span class=\"count-target\" data-value=\"${packsNeeded}\">0</span> ${packStr}</b> <span style=\"font-size:0.8em; color:var(--link-color);\">(${packAmount.toLocaleString(config.lang)}${config.currencySymbol}/${packStr})</span></dd>
            `;
        }
""",
    'delegate UI calculation to pure function'
)
calculator = replace_once(
    calculator,
    """                <span class=\"rate-info\">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
                <div style=\"font-size:0.82em; color:var(--link-color); margin-top:0.8em; line-height:1.4;\">
""",
    """                <span class=\"rate-info\">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
                <p class=\"rounding-assumption-note\" style=\"font-size:0.82em; color:var(--link-color); margin:0.8em 0 0; line-height:1.5;\">${packsNeeded !== null ? texts.roundingNoteWithPack : texts.roundingNoteWithoutPack}</p>
                <div style=\"font-size:0.82em; color:var(--link-color); margin-top:0.8em; line-height:1.4;\">
""",
    'show main-mode rounding assumption'
)
calculator = replace_once(
    calculator,
    """            <span class=\"rate-info\">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
        `;
""",
    """            <span class=\"rate-info\">(${texts.resultLabelRate}: ${finalRate.toFixed(2)} pt/${config.rateUnit}${rateSourceLabel ? ` · ${rateSourceLabel}` : ''})</span>
            <p class=\"rounding-assumption-note\" style=\"font-size:0.82em; color:var(--link-color); margin:0.8em 0 0; line-height:1.5;\">${texts.roundingNoteReverse}</p>
        `;
""",
    'show reverse-mode rounding assumption'
)
calculator_path.write_text(calculator, encoding='utf-8')

tests_path = Path('tests/playpoint-regression.test.cjs')
tests = tests_path.read_text(encoding='utf-8')
anchor = """test('金曜の開始時刻を過ぎたカレンダー登録は翌週を使う', () => {
"""
additions = """test('パック額未入力では購入ごとの丸めを仮定しない概算として表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('6');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('0');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value=\"6\"'));
  assert.ok(content.includes('does not apply purchase-by-purchase point rounding'));
});

test('パック額入力時は購入ごとの四捨五入で必要回数と合計額を計算する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('12');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.packAmount = createInput('5');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.1';
  updateBaseRateAndTarget();
  calculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value=\"2\"'));
  assert.ok(content.includes('data-value=\"10\"'));
  assert.ok(content.includes('Points are rounded for each entered purchase amount'));
});

test('逆算モードは入力額を1回の購入として丸める前提を表示する', () => {
  const { PP_STATE, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'US';
  PP_STATE.dom.amountYen = createInput('10');
  PP_STATE.dom.reverseBaseRate = createInput('1.1');
  PP_STATE.dom.reverseStatus = createInput('1.1');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  reverseCalculate();

  const content = renderedResults[0].content;
  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.includes('data-value=\"11\"'));
  assert.ok(content.includes('rounded as one purchase'));
});

"""
tests = replace_once(tests, anchor, additions + anchor, 'insert rounding regression tests')
tests_path.write_text(tests, encoding='utf-8')
