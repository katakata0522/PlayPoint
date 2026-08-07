'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tempFiles = [
  '.github/workflows/apply-growth-flow-foundation.yml',
  'scripts/apply-growth-flow-foundation.cjs'
];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(absolute(relativePath), content, 'utf8');
}

function replaceOnce(content, searchValue, replacement, label) {
  const matches = typeof searchValue === 'string'
    ? content.split(searchValue).length - 1
    : [...content.matchAll(new RegExp(searchValue.source, searchValue.flags.includes('g') ? searchValue.flags : searchValue.flags + 'g'))].length;
  if (matches !== 1) throw new Error(`${label}: expected exactly one match, found ${matches}`);
  return content.replace(searchValue, replacement);
}

// 移行スクリプトは最終コミットから自分自身を除く設計だが、検証中は整合性監査の対象として復元する。
execFileSync('git', ['checkout', 'HEAD', '--', ...tempFiles], { cwd: root, stdio: 'inherit' });

let config = read('js/config.js');
config = replaceOnce(
  config,
  "'use strict';\n\nexport { ANALYTICS } from './analytics.js';",
  "'use strict';\n\nimport { ANALYTICS as SHARED_ANALYTICS } from './analytics.js';\nexport const ANALYTICS = SHARED_ANALYTICS;",
  'config shared analytics binding'
);
write('js/config.js', config);

let growthMigration = read('tests/growth-migration.test.cjs');
growthMigration = replaceOnce(
  growthMigration,
  "  const config = read('js/config.js');\n  const pwaInstall",
  "  const analytics = read('js/analytics.js');\n  const pwaInstall",
  'growth migration analytics source'
);
growthMigration = replaceOnce(
  growthMigration,
  '    assert.ok(config.includes(eventName), `${eventName} が許可イベントにありません`);',
  '    assert.ok(analytics.includes(eventName), `${eventName} が許可イベントにありません`);',
  'growth migration event assertions'
);
write('tests/growth-migration.test.cjs', growthMigration);

let growthPriority = read('tests/growth-priority.test.cjs');
growthPriority = replaceOnce(
  growthPriority,
  "  const config = read('js/config.js');\n  assert.match(source, /PerformanceObserver/);",
  "  const analytics = read('js/analytics.js');\n  assert.match(source, /PerformanceObserver/);",
  'growth priority analytics source'
);
growthPriority = replaceOnce(
  growthPriority,
  "  assert.match(config, /web_vital:\\s*\\['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version'\\]/);",
  "  assert.match(analytics, /web_vital:\\s*\\['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version'\\]/);",
  'growth priority web vital assertion'
);
write('tests/growth-priority.test.cjs', growthPriority);

let nineFixes = read('tests/playpoint-nine-fixes.test.cjs');
nineFixes = replaceOnce(
  nineFixes,
  /test\('計測イベントは同意済みラッパー経由だけで送信する', \(\) => \{[\s\S]*?\n\}\);/,
  `test('計測イベントは共通の同意済みラッパー経由だけで送信する', () => {\n  const analytics = read('js/analytics.js');\n  const article = read('blog/article.js');\n  const blog = read('blog/script.js');\n\n  assert.ok(analytics.includes("target.PlayPointConsent.getStatus() === 'granted'"), '同意済み状態だけを明示的に許可していません');\n  assert.ok(!analytics.includes('PlayPointConsent && window.PlayPointConsent.getStatus() !=='), '同意マネージャ未ロード時の扱いが旧実装へ戻っています');\n  assert.ok(!article.includes("window.gtag('event'"), '記事ページが共通ラッパーを通さずイベント送信しています');\n  assert.ok(!blog.includes("gtag('event'"), 'ブログ一覧が共通ラッパーを通さずイベント送信しています');\n  assert.ok(article.includes("import('/js/analytics.js')"), '記事ページが共通Analyticsを読み込んでいません');\n  assert.ok(blog.includes("import('/js/analytics.js')"), 'ブログ一覧が共通Analyticsを読み込んでいません');\n});`,
  'nine fixes shared analytics test'
);
nineFixes = replaceOnce(
  nineFixes,
  /test\('同意済み計測はGA本体ロード前のイベントを短期キューへ保持する', \(\) => \{[\s\S]*?\n\}\);/,
  `test('同意済み計測はGA本体ロード前のイベントを短期キューへ保持する', () => {\n  const analytics = read('js/analytics.js');\n  const thirdParty = read('js/third-party.js');\n  const blogComponents = read('blog/components.js');\n\n  assert.ok(analytics.includes('pendingEvents'), 'GAロード前イベントのキューがありません');\n  assert.ok(analytics.includes('flushPending'), '保留イベントのflush処理がありません');\n  assert.ok(thirdParty.includes('window.PP_APP.ANALYTICS.flushPending()'), 'トップ側でGAロード後に保留イベントをflushしていません');\n  assert.ok(blogComponents.includes('window.PlayPointAnalytics.flushPending()'), 'ブログ側でGAロード後に保留イベントをflushしていません');\n});`,
  'nine fixes analytics queue test'
);
write('tests/playpoint-nine-fixes.test.cjs', nineFixes);

let regression = read('tests/playpoint-regression.test.cjs');
regression = replaceOnce(
  regression,
  /function preprocessESM\(code\) \{[\s\S]*?\n\}/,
  `function preprocessESM(code) {\n  return code\n    .replace(/import\\s*\\{\\s*([^}]+)\\s*\\}\\s*from\\s*'[^']+'\\s*;/g, (match, imports) => {\n      return imports.split(',').map(specifier => {\n        const parts = specifier.trim().split(/\\s+as\\s+/);\n        const imported = parts[0];\n        const local = parts[1] || imported;\n        if (!['UI', 'SHARE', 'CALC', 'DIARY', 'ANALYTICS'].includes(imported)) return '';\n        return \`var \${local} = PP_APP.\${imported};\`;\n      }).filter(Boolean).join('\\n');\n    })\n    .replace(/^export\\s+\\{[^}]+\\};?\\s*$/gm, '')\n    .replace(/^export\\s+/gm, '');\n}`,
  'regression ESM preprocessor'
);
regression = replaceOnce(
  regression,
  '  context.window = context;\n  context.__TEST_ENV__ = true;',
  `  context.window = context;\n  context.PP_APP = {\n    ANALYTICS: {\n      track() {},\n      markEngaged() {},\n      getEntryContext() { return {}; }\n    }\n  };\n  context.__TEST_ENV__ = true;`,
  'regression analytics test stub'
);
write('tests/playpoint-regression.test.cjs', regression);

let contentStructure = read('tests/content-structure.test.cjs');
contentStructure = replaceOnce(
  contentStructure,
  /test\('既存CTAの有無にかかわらず記事冒頭近くへ計算導線を置く', \(\) => \{[\s\S]*?\n\}\);/,
  `test('記事固有CTAを優先し、不足している記事だけ共通計算導線で補う', () => {\n  const script = read('blog/article.js');\n\n  assert.ok(script.includes('hasEditorialCalculatorLink(content)'));\n  assert.ok(script.includes('if (!content || hasEditorialCalculatorLink(content)) return;'));\n  assert.ok(script.includes("content.querySelector('.answer-box, .summary-box, .intro')"));\n  assert.ok(script.includes('setupCalculatorPrompt();'));\n  assert.ok(!script.includes('setupArticleNextStepCta();'));\n});`,
  'content structure CTA expectation'
);
write('tests/content-structure.test.cjs', contentStructure);

let foundationTest = read('tests/growth-flow-foundation.test.cjs');
foundationTest = replaceOnce(
  foundationTest,
  "  assert.match(config, /export { ANALYTICS } from './analytics.js'/);",
  "  assert.ok(config.includes(\"import { ANALYTICS as SHARED_ANALYTICS } from './analytics.js';\"));",
  'foundation analytics binding assertion'
);
write('tests/growth-flow-foundation.test.cjs', foundationTest);

// 変更したソースを基に、日付を進めず既存リビジョンのまま生成物を同期する。
const indexHtml = read('index.html');
const serviceWorker = read('sw.js');
const modifiedDate = indexHtml.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/)?.[1];
const assetVersion = serviceWorker.match(/playpoint-calc-v([0-9_]+)-[a-f0-9]+/)?.[1];
if (!modifiedDate || !assetVersion) throw new Error('Could not resolve committed build metadata');
execFileSync(process.execPath, ['scripts/build-html.js'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYPOINT_MODIFIED_DATE: modifiedDate,
    PLAYPOINT_ASSET_VERSION: assetVersion
  }
});

fs.rmSync(absolute('preflight-failure.log'), { force: true });
fs.rmSync(absolute('preflight-summary.log'), { force: true });
console.log('Growth flow validation compatibility corrections applied.');
