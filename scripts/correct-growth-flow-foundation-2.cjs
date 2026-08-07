'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const write = (relativePath, content) => fs.writeFileSync(path.join(root, relativePath), content, 'utf8');

function replaceOnce(content, searchValue, replacement, label) {
  const count = typeof searchValue === 'string'
    ? content.split(searchValue).length - 1
    : [...content.matchAll(new RegExp(searchValue.source, searchValue.flags.includes('g') ? searchValue.flags : searchValue.flags + 'g'))].length;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return content.replace(searchValue, replacement);
}

let regression = read('tests/playpoint-regression.test.cjs');
regression = replaceOnce(
  regression,
  "if (!['UI', 'SHARE', 'CALC', 'DIARY', 'ANALYTICS'].includes(imported)) return '';",
  "if (!['UI', 'SHARE', 'CALC', 'DIARY'].includes(imported)) return '';",
  'calculator test import list'
);
regression = replaceOnce(
  regression,
  "  context.PP_APP = {\n    ANALYTICS: {\n      track() {},\n      markEngaged() {},\n      getEntryContext() { return {}; }\n    }\n  };\n  context.__TEST_ENV__ = true;",
  "  context.PP_APP = {\n    ANALYTICS: {\n      track() {},\n      markEngaged() {},\n      getEntryContext() { return {}; }\n    }\n  };\n  context.SHARED_ANALYTICS = context.PP_APP.ANALYTICS;\n  context.__TEST_ENV__ = true;",
  'calculator test shared analytics binding'
);
write('tests/playpoint-regression.test.cjs', regression);

for (const relativePath of [
  'tests/common-pages-fact-ux.test.cjs',
  'tests/playpoint-audit-fixes.test.cjs'
]) {
  let source = read(relativePath);
  source = replaceOnce(
    source,
    "  vm.runInContext(read('js/config.js').replace(/^export\\s+/gm, ''), context, { filename: 'config.js' });",
    "  const configSource = read('js/config.js')\n    .replace(/^import \\{ ANALYTICS as SHARED_ANALYTICS \\} from '\\.\\/analytics\\.js';$/m, 'const SHARED_ANALYTICS = {};')\n    .replace(/^export\\s+/gm, '');\n  vm.runInContext(configSource, context, { filename: 'config.js' });",
    `${relativePath} config loader`
  );
  write(relativePath, source);
}

console.log('Additional analytics test compatibility corrections applied.');
