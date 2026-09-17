'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../../blog/components.js'), 'utf8');

// 本物の起動処理がheadへ挿入するURLを観測。広告・同意のDOM-ready処理は起動しない。
function observeComponentStyles(pathname, componentSource = source) {
  const inserted = [];
  const document = {
    body: { dataset: {} }, addEventListener() {},
    querySelector(selector) {
      if (selector === 'link[data-common-components-style]') return inserted.find(item => item.dataset.commonComponentsStyle) || null;
      return null;
    },
    createElement(tag) { return { tag, dataset: {} }; },
    head: { appendChild(element) { inserted.push(element); } }
  };
  const context = vm.createContext({
    window: { location: new URL(pathname, 'https://playpoint-sim.com'), PlayPointAnalytics: {} },
    document, localStorage: { getItem() { return null; } }, console
  });
  vm.runInContext(componentSource, context, { filename: 'blog/components.js' });
  vm.runInContext(componentSource, context, { filename: 'blog/components.js' });
  return inserted.map(item => ({ ...item, href: new URL(item.href, context.window.location).href }));
}
module.exports = { observeComponentStyles };
