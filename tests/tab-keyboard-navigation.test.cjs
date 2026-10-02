'use strict';
const { openingTags } = require('./helpers/markup-contract.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test("calculator tabs expose roving tabindex and tab semantics in every locale", () => {
  for (const file of ['index.html','en/index.html','ko/index.html','tw/index.html','hk/index.html','in/index.html']) {
    const tags=openingTags(read(file));
    assert.equal(tags.filter(tag=>tag.attrs.role==='tablist').length,1,file);
    for(const [id,selected,index,panel]of[['tab-main','true','0','mainMode'],['tab-reverse','false','-1','reverseMode'],['tab-diary','false','-1','diaryMode']]) {
      const matches=tags.filter(tag=>tag.attrs.id===id);assert.equal(matches.length,1,file+' '+id);
      const attrs=matches[0].attrs;assert.equal(attrs.role,'tab');assert.equal(attrs['aria-selected'],selected);assert.equal(attrs.tabindex,index);assert.equal(attrs['aria-controls'],panel);
      const panels=tags.filter(tag=>tag.attrs.id===panel);assert.equal(panels.length,1);assert.equal(panels[0].attrs.role,'tabpanel');assert.equal(panels[0].attrs['aria-labelledby'],id);
    }
  }
});
