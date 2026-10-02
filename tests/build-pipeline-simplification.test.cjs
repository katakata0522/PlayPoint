'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getPublishedIntlArticles, writeIntlSeoPages } = require('../scripts/intl-seo-pages.cjs');

// 最終化順序の保証はverify-build-outputと各成果物の主担当へ集約する。
test('国際記事生成を再実行しても既存の手動正本を上書きしない', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-manual-preserve-'));
  t.after(() => fs.rmSync(root, { recursive:true, force:true }));
  const articles = getPublishedIntlArticles();
  const manual = articles.filter(article => article.manual);
  assert.ok(manual.length > 0);
  for (const article of manual) {
    const file = path.join(root,article.file);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,'User-owned facts: '+article.file);
  }
  const versions = new Proxy({}, {get:()=> 'fixture'});
  for (let i=0;i<2;i++) {
    writeIntlSeoPages(root,versions);
    for (const article of manual) assert.equal(fs.readFileSync(path.join(root,article.file),'utf8'),'User-owned facts: '+article.file);
    const generated = articles.find(article => !article.manual);
    assert.ok(generated && fs.readFileSync(path.join(root,generated.file),'utf8').includes('<html'), '通常の自動生成経路も実行する');
  }
});
