'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function update(relativePath, transform) {
  const file = path.join(root, relativePath);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error('patch made no change: ' + relativePath);
  fs.writeFileSync(file, after, 'utf8');
  console.log('patched ' + relativePath);
}

update('scripts/intl-article-layout.cjs', source => {
  let output = source.replace(
    "const { getIntlGuideCategory } = require('./intl-guide-taxonomy.cjs');",
    "const { getIntlGuideCategory } = require('./intl-guide-taxonomy.cjs');\nconst { insertIntlArticlePrompt } = require('./intl-article-reading-flow.cjs');"
  );
  output = output.replace(
    '  const mainHtml = unwrapped.slice(main.start, main.end);',
    '  const mainHtml = insertIntlArticlePrompt(unwrapped.slice(main.start, main.end), localeKey);'
  );
  return output;
});

update('tests/intl-article-layout.test.cjs', source => source.replace(
  "  assert.ok(first.includes(originalArticle), 'article content must remain byte-for-byte intact');",
  "  assert.ok(first.includes('<h1>Sample guide</h1>'), 'article heading must remain intact');\n  assert.ok(first.includes('<p>Keep this sentence exactly.</p>'), 'article copy must remain intact');\n  assert.equal((first.match(/data-generated-intl-article-prompt=\\\"true\\\"/g) || []).length, 1, 'localized reading prompt must be generated exactly once');"
));
