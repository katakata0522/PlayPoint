const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');

function createOption(text, value) {
  return {
    text,
    value: String(value),
    dataset: {},
    disabled: false,
  };
}

function createSelect() {
  const select = {
    value: '',
    options: [],
    selectedIndex: 0,
    add(option) {
      this.options.push(option);
      if (!this.value) this.value = option.value;
    },
  };
  Object.defineProperty(select, 'innerHTML', {
    get() {
      return '';
    },
    set(value) {
      if (value === '') {
        this.options = [];
        this.selectedIndex = 0;
        this.value = '';
      }
    },
  });
  return select;
}

function createInput(value = '') {
  return {
    value: String(value),
    min: undefined,
    max: undefined,
    step: undefined,
    validity: { valid: true },
    removeAttribute(name) {
      delete this[name];
    },
  };
}

function preprocessESM(code) {
  return code
    .replace(/^import\s*'[^']+';\s*$/gm, '')
    .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*'[^']+'\s*;/g, (match, imports) => {
      const names = imports.split(',').map(s => s.trim());
      const needed = names.filter(name => name === 'UI' || name === 'SHARE' || name === 'CALC' || name === 'DIARY');
      if (needed.length === 0) return '';
      if (needed.length === 1) {
        return `var ${needed[0]} = PP_APP.${needed[0]};`;
      }
      return `var { ${needed.join(', ')} } = PP_APP;`;
    })
    .replace(/^export\s+/gm, '');
}

function loadCalculatorContext(dateClass = Date) {
  const renderedResults = [];
  const renderedResultDetails = [];
  const context = {
    console,
    Option: createOption,
    Date: dateClass,
    displayResult(targetElement, content, isError = false) {
      targetElement.innerHTML = content;
      targetElement.isError = isError;
      targetElement.renderedContent = content;
      renderedResults.push({ targetElement, content, isError });
    },
    displayResultDetails(content) {
      renderedResultDetails.push(content);
    },
    renderedResults,
    renderedResultDetails,
  };
  context.window = context;
  context.__TEST_ENV__ = true;
  vm.createContext(context);
  const code = [
    fs.readFileSync(path.join(root, 'js', 'analytics-core.js'), 'utf8'),
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8')),
    `
      PP_APP.UI = {
        displayResult,
        displayResultDetails
      };
    `,
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'result-navigation-config.js'), 'utf8')),
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8')),
    `
      globalThis.__pp = {
        PP_REGION_CONFIGS: PP_APP.CONFIGS,
        PP_STATE: PP_APP.STATE,
        populateStatusSelects: PP_APP.CALC.populateStatusSelects.bind(PP_APP.CALC),
        updateBaseRateAndTarget: PP_APP.CALC.updateBaseRateAndTarget.bind(PP_APP.CALC),
        updateNeededPointsConstraint: PP_APP.CALC.updateNeededPointsConstraint.bind(PP_APP.CALC),
        getMaxNeededPointsForTarget: PP_APP.CALC.getMaxNeededPointsForTarget.bind(PP_APP.CALC),
        getRateDetails: PP_APP.CALC.getRateDetails.bind(PP_APP.CALC),
        getRemainingMonths: PP_APP.CALC.getRemainingMonths.bind(PP_APP.CALC),
        getNextFridayCalendarWindow,
        getRelatedArticles: PP_APP.CALC.getRelatedArticles.bind(PP_APP.CALC),
        getDecisionLinks: PP_APP.CALC.getDecisionLinks.bind(PP_APP.CALC),
        computeMainResult: PP_APP.CALC_PURE.computeMainResult.bind(PP_APP.CALC_PURE),
        computeRateComparison: PP_APP.CALC_PURE.computeRateComparison.bind(PP_APP.CALC_PURE),
        calculate: PP_APP.CALC.calculate.bind(PP_APP.CALC),
        reverseCalculate: PP_APP.CALC.reverseCalculate.bind(PP_APP.CALC),
        renderedResults,
        renderedResultDetails
      };
    `,
  ].join('\n');
  vm.runInContext(code, context, { filename: 'calculator-bundle.js' });
  return context.__pp;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

module.exports = {
  root,
  createOption,
  createSelect,
  createInput,
  loadCalculatorContext,
  test,
};
