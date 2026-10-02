'use strict';
const { openingTags } = require('./helpers/markup-contract.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');


test("fractional spending inputs request a decimal mobile keyboard in every calculator locale", () => {
  for (const file of ['index.html','en/index.html','ko/index.html','tw/index.html','hk/index.html','in/index.html']) {
    const inputs=openingTags(read(file)).filter(tag=>tag.tag==='input'&&tag.attrs.id==='amountYen');
    assert.equal(inputs.length,1,file);
    assert.equal(inputs[0].attrs.type,'number',file);
    assert.equal(Number(inputs[0].attrs.step),0.01,file);
    assert.equal(inputs[0].attrs.inputmode,'decimal',file);
  }
});

test("integer-only points input keeps the numeric keyboard hint", () => {
  for (const file of ['index.html','en/index.html','ko/index.html','tw/index.html','hk/index.html','in/index.html']) {
    const inputs=openingTags(read(file)).filter(tag=>tag.tag==='input'&&tag.attrs.id==='neededPoints');
    assert.equal(inputs.length,1,file);
    assert.equal(inputs[0].attrs.type,'number',file);
    assert.equal(Number(inputs[0].attrs.step),1,file);
    assert.equal(inputs[0].attrs.inputmode,'numeric',file);
  }
});
