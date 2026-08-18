'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const file = path.join(root, 'scripts/content-dates.cjs');
let source = fs.readFileSync(file, 'utf8');
source = source.replace("const GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-12';", "const GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-18';");
fs.writeFileSync(file, source, 'utf8');

const testFile = path.join(root, 'tests/full-integrity-audit.test.cjs');
let testSource = fs.readFileSync(testFile, 'utf8');
const addition = `\n\ntest('今回内容を更新した国際生成LPは8月18日を編集日として持つ', () => {\n  const dates = read('scripts/content-dates.cjs');\n  assert.match(dates, /GENERATED_INTL_PAGE_CONTENT_DATE = '2026-08-18'/);\n});\n`;
if (!testSource.includes('今回内容を更新した国際生成LPは8月18日')) testSource += addition;
fs.writeFileSync(testFile, testSource, 'utf8');
console.log('Editorial date follow-up applied.');
