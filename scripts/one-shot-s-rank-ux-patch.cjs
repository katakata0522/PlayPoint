'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function update(relativePath, transform) {
  const file = path.join(root, relativePath);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`patch made no change: ${relativePath}`);
  fs.writeFileSync(file, after, 'utf8');
  console.log(`patched ${relativePath}`);
}

update('index.html', html => {
  let output = html.replace('<div class="region-switch">', '<div class="region-switch" aria-label="Play country or region">');
  const labels = {
    JP: '🇯🇵 日本',
    US: '🇺🇸 United States',
    KR: '🇰🇷 대한민국',
    TW: '🇹🇼 台灣'
  };
  for (const [region, label] of Object.entries(labels)) {
    const pattern = new RegExp(`<button data-region="${region}"( class="active")?>[^<]*<\\/button>`);
    output = output.replace(pattern, (_match, active = '') => `<button data-region="${region}"${active}>${label}</button>`);
  }
  return output;
});

update('scripts/language-page-builder.cjs', source => source.replace(
`  output = output.replace('<button data-region="JP" class="active">日本語</button>', '<button data-region="JP">日本語</button>');
  const activeBtnTarget = \`<button data-region="\${config.region}">\`;
  const activeBtnReplacement = \`<button data-region="\${config.region}" class="active">\`;
  output = output.replace(activeBtnTarget, activeBtnReplacement);`,
`  output = output.replace('<button data-region="JP" class="active">', '<button data-region="JP">');
  const activeBtnTarget = \`<button data-region="\${config.region}">\`;
  const activeBtnReplacement = \`<button data-region="\${config.region}" class="active">\`;
  output = output.replace(activeBtnTarget, activeBtnReplacement);`
));

update('scripts/intl-article-layout.cjs', source => {
  let output = source.replace(
    "const { selectRelatedArticles } = require('./intl-related-guides.cjs');",
    "const { selectRelatedArticles } = require('./intl-related-guides.cjs');\nconst { getIntlGuideCategory } = require('./intl-guide-taxonomy.cjs');"
  );
  output = output.replace(
    /function inferIntlSection\(relativePath\) \{[\s\S]*?\n\}/,
    `function inferIntlSection(relativePath) {\n  return getIntlGuideCategory(relativePath);\n}`
  );
  return output;
});

update('scripts/build-html.js', source => {
  let output = source.replace(
    "const { synchronizeIntlArticleLayouts } = require('./intl-article-layout.cjs');",
    "const { synchronizeIntlArticleLayouts } = require('./intl-article-layout.cjs');\nconst { syncIntlHubDiscovery } = require('./intl-hub-discovery.cjs');"
  );
  output = output.replace(
    "console.log(`[build-html] synchronized international article layouts: ${intlArticleLayoutSummary.changed}/${intlArticleLayoutSummary.checked} updated`);",
    "console.log(`[build-html] synchronized international article layouts: ${intlArticleLayoutSummary.changed}/${intlArticleLayoutSummary.checked} updated`);\nconst intlHubDiscoverySummary = syncIntlHubDiscovery(rootDir);\nconsole.log(`[build-html] synchronized international guide discovery: ${intlHubDiscoverySummary.changed}/${intlHubDiscoverySummary.checked} updated`);"
  );
  return output;
});
