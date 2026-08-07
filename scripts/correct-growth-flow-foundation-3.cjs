'use strict';

const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(__dirname, '..', 'tests', 'playpoint-regression.test.cjs');
let source = fs.readFileSync(target, 'utf8');

function replaceOnce(searchValue, replacement, label) {
  const count = source.split(searchValue).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(searchValue, replacement);
}

replaceOnce(
  '    "\'./blog/style.css?v=old\'",\n    "\'./blog/script.js?v=old\'",',
  '    "\'./blog/style.css?v=old\'",\n    "\'./blog/index.css?v=old\'",\n    "\'./blog/script.js?v=old\'",',
  'service worker fixture blog index css'
);
replaceOnce(
  "    blogCssVersion: 'blog-css-v',\n    blogScriptVersion: 'blog-script-v',",
  "    blogCssVersion: 'blog-css-v',\n    blogIndexCssVersion: 'blog-index-css-v',\n    blogScriptVersion: 'blog-script-v',",
  'service worker fixture blog index css version'
);
replaceOnce(
  '    11\n  );',
  '    12\n  );',
  'service worker asset count'
);
replaceOnce(
  "    './blog/style.css?v=blog-css-v',\n    './blog/script.js?v=blog-script-v',",
  "    './blog/style.css?v=blog-css-v',\n    './blog/index.css?v=blog-index-css-v',\n    './blog/script.js?v=blog-script-v',",
  'service worker expected blog index css'
);

fs.writeFileSync(target, source, 'utf8');
console.log('Service Worker regression fixture updated for blog index CSS.');
