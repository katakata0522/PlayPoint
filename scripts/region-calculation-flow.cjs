'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { getRegionRule } = require('../js/region-rules.js');
const { CALC_PURE } = require('../js/calculator-core.js');

const REGIONS = Object.freeze({ en: ['US', '$'], ko: ['KR', '₩'], tw: ['TW', 'NT$'], hk: ['HK', 'HK$'], in: ['IN', '₹'] });
function regionFlowExample(locale) {
  const [region, symbol] = REGIONS[locale];
  const { spendUnit } = getRegionRule(region);
  const { totalAmountNeeded } = CALC_PURE.computeMainResult({ neededPoints: 1728, finalRate: 2, spendUnit });
  const money = value => symbol + value.toLocaleString('en-US');
  const description = {
    en: `Example: 1,728 points at 2 points per ${money(spendUnit)} requires ${money(totalAmountNeeded)}.`,
    ko: `계산 예시: ${money(spendUnit)}당 2포인트로 1,728포인트를 모으려면 ${money(totalAmountNeeded)}가 필요합니다.`,
    tw: `計算範例：每${money(spendUnit)}累積2點，1,728點需要消費${money(totalAmountNeeded)}。`,
    hk: `計算例子：每${money(spendUnit)}累積2點，1,728點需要消費${money(totalAmountNeeded)}。`,
    in: `Example: 1,728 points at 2 points per ${money(spendUnit)} requires ${money(totalAmountNeeded)}.`
  }[locale];
  return { description, unit:money(spendUnit), amount:money(totalAmountNeeded) };
}
function renderRegionFlow(template, locale) {
  const { description, unit, amount } = regionFlowExample(locale);
  return template.replace(/<title id="title">[^<]*<\/title>/, `<title id="title">${{en:'Calculation example',ko:'계산 예시',tw:'計算範例',hk:'計算例子',in:'Calculation example'}[locale]}</title>`)
    .replace(/<desc id="desc">[^<]*<\/desc>/, `<desc id="desc">${description}</desc>`)
    .replace('/ ¥100', '/ ' + unit)
    .replace('font-size="47" font-weight="800">¥86,400', `font-size="${amount.length > 8 ? 40 : 47}" font-weight="800">${amount}`);
}
function syncRegionFlows(root) {
  const template = fs.readFileSync(path.join(root, 'images/calculation-flow-compact.svg'), 'utf8');
  for (const locale of Object.keys(REGIONS)) {
    const file = path.join(root, `images/calculation-flow-${locale}.svg`), svg = renderRegionFlow(template, locale);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== svg) fs.writeFileSync(file, svg);
  }
}
module.exports = { REGIONS, regionFlowExample, renderRegionFlow, syncRegionFlows };
