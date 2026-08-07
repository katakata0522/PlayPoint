'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function file(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(file(relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.mkdirSync(path.dirname(file(relativePath)), { recursive: true });
  fs.writeFileSync(file(relativePath), content, 'utf8');
}

function replaceOnce(content, searchValue, replacement, label) {
  const matches = typeof searchValue === 'string'
    ? content.split(searchValue).length - 1
    : [...content.matchAll(new RegExp(searchValue.source, searchValue.flags.includes('g') ? searchValue.flags : searchValue.flags + 'g'))].length;
  if (matches !== 1) throw new Error(`${label}: expected exactly one match, found ${matches}`);
  return content.replace(searchValue, replacement);
}

function replaceAllChecked(content, searchValue, replacement, minimum, label) {
  const updated = content.replace(searchValue, replacement);
  if (updated === content || (minimum && !updated.includes(replacement))) {
    throw new Error(`${label}: replacement did not apply`);
  }
  return updated;
}

const analyticsSource = `'use strict';

const CALCULATOR_ENTRY_KEY = 'playpointCalculatorEntry';
const CALCULATOR_ENTRY_TTL_MS = 30 * 60 * 1000;
const INTEGER_PARAMS = new Set(['link_position', 'results_count']);

function getWindow() {
    return typeof window === 'undefined' ? null : window;
}

function safeSessionStorage() {
    const target = getWindow();
    if (!target) return null;
    try {
        return target.sessionStorage;
    } catch (error) {
        return null;
    }
}

export const ANALYTICS = {
    pendingEvents: [],
    maxPendingEvents: 20,
    allowedParams: {
        calculation_completed: ['calculation_mode', 'region', 'target_status', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'entry_calculator_preset'],
        reverse_calculation_completed: ['calculation_mode', 'region', 'entry_source', 'entry_medium', 'entry_campaign', 'entry_source_path', 'entry_link_context', 'entry_calculator_preset'],
        points_cost_calculation_completed: ['region', 'status', 'point_bucket'],
        diary_entry_saved: ['region', 'entry_type'],
        article_click: ['article_title', 'article_category'],
        search: ['search_term', 'results_count'],
        category_filter: ['category_name'],
        theme_change: ['theme_mode'],
        article_to_calculator_clicked: ['source_path', 'link_context', 'destination_path', 'calculator_preset'],
        lp_to_calculator_clicked: ['source_path', 'source_surface', 'link_context'],
        lp_related_link_clicked: ['source_path', 'target_path', 'link_context'],
        result_related_article_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        result_decision_link_clicked: ['source_path', 'target_path', 'target_status', 'calculation_mode', 'link_position'],
        share_url_copied: ['calculation_mode', 'region', 'target_status'],
        share_x_clicked: ['calculation_mode', 'region', 'target_status'],
        calendar_reminder_added: ['region', 'calendar_type'],
        pwa_install_accepted: ['region', 'install_surface'],
        widget_referral_landed: ['region', 'entry_surface'],
        widget_code_copied: ['theme', 'language', 'mode'],
        web_vital: ['metric_name', 'metric_rating', 'metric_value_bucket', 'page_group', 'release_version']
    },
    hasConsent() {
        const target = getWindow();
        return Boolean(target
            && target.PlayPointConsent
            && target.PlayPointConsent.getStatus() === 'granted');
    },
    sanitizeValue(key, value) {
        if (value === undefined || value === null || value === '') return null;
        if (INTEGER_PARAMS.has(key)) {
            const numberValue = Number(value);
            if (!Number.isInteger(numberValue) || numberValue < 0) return null;
            if (key === 'link_position' && numberValue > 10) return null;
            return numberValue;
        }
        let text = String(value).trim();
        if (!text) return null;
        if (key.endsWith('_path')) {
            const target = getWindow();
            if (!target) return null;
            try {
                text = new URL(text, target.location.origin).pathname;
            } catch (error) {
                return null;
            }
        }
        return text.replace(/[<>"']/g, '').slice(0, 120);
    },
    sanitizeParams(eventName, params = {}) {
        const allowed = this.allowedParams[eventName];
        if (!allowed) return null;
        return allowed.reduce((clean, key) => {
            const value = this.sanitizeValue(key, params[key]);
            if (value !== null) clean[key] = value;
            return clean;
        }, {});
    },
    rememberCalculatorEntry(context = {}) {
        if (!this.hasConsent()) return;
        const storage = safeSessionStorage();
        if (!storage) return;
        const clean = ['source_path', 'link_context', 'calculator_preset'].reduce((result, key) => {
            const value = this.sanitizeValue(key, context[key]);
            if (value !== null) result[key] = value;
            return result;
        }, {});
        if (!clean.source_path || !clean.link_context) return;
        try {
            storage.setItem(CALCULATOR_ENTRY_KEY, JSON.stringify({
                ...clean,
                expires_at: Date.now() + CALCULATOR_ENTRY_TTL_MS
            }));
        } catch (error) {
            // Storage quota and privacy-mode failures must not block navigation.
        }
    },
    readCalculatorEntry({ consume = false } = {}) {
        const storage = safeSessionStorage();
        if (!storage) return {};
        try {
            const raw = storage.getItem(CALCULATOR_ENTRY_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || Number(parsed.expires_at) < Date.now()) {
                storage.removeItem(CALCULATOR_ENTRY_KEY);
                return {};
            }
            const result = {
                entry_source_path: this.sanitizeValue('entry_source_path', parsed.source_path) || undefined,
                entry_link_context: this.sanitizeValue('entry_link_context', parsed.link_context) || undefined,
                entry_calculator_preset: this.sanitizeValue('entry_calculator_preset', parsed.calculator_preset) || undefined
            };
            if (consume) storage.removeItem(CALCULATOR_ENTRY_KEY);
            return result;
        } catch (error) {
            try { storage.removeItem(CALCULATOR_ENTRY_KEY); } catch (storageError) { }
            return {};
        }
    },
    getEntryContext({ consumeCalculatorEntry = false } = {}) {
        const target = getWindow();
        if (!target || typeof URLSearchParams === 'undefined' || !target.location) return {};
        const params = new URLSearchParams(target.location.search);
        return {
            entry_source: params.get('utm_source') || undefined,
            entry_medium: params.get('utm_medium') || undefined,
            entry_campaign: params.get('utm_campaign') || undefined,
            ...this.readCalculatorEntry({ consume: consumeCalculatorEntry })
        };
    },
    queue(eventName, params) {
        if (this.pendingEvents.length >= this.maxPendingEvents) this.pendingEvents.shift();
        this.pendingEvents.push({ eventName, params });
    },
    send(eventName, params) {
        const target = getWindow();
        if (!target) return;
        target.dataLayer = target.dataLayer || [];
        target.gtag = target.gtag || function gtag() {
            target.dataLayer.push(arguments);
        };
        target.gtag('event', eventName, params);
    },
    track(eventName, params = {}) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(eventName)) return;
        const target = getWindow();
        if (!target) return;
        const cleanParams = this.sanitizeParams(eventName, params);
        if (!cleanParams) return;

        if (!target.PlayPointConsent) {
            this.queue(eventName, cleanParams);
            return;
        }
        if (!this.hasConsent()) {
            this.pendingEvents = [];
            return;
        }
        this.send(eventName, cleanParams);
    },
    flushPending() {
        const target = getWindow();
        if (!target || !target.PlayPointConsent) return;
        if (!this.hasConsent()) {
            this.pendingEvents = [];
            return;
        }
        while (this.pendingEvents.length) {
            const { eventName, params } = this.pendingEvents.shift();
            this.send(eventName, params);
        }
    },
    markEngaged() {
        const target = getWindow();
        if (target && typeof target.dispatchEvent === 'function' && typeof target.CustomEvent === 'function') {
            target.dispatchEvent(new target.CustomEvent('playpoint:engaged'));
        }
    }
};

if (typeof window !== 'undefined') {
    window.PlayPointAnalytics = ANALYTICS;
    window.PP_APP = window.PP_APP || {};
    window.PP_APP.ANALYTICS = ANALYTICS;
}
`;
write('js/analytics.js', analyticsSource);

let config = read('js/config.js');
const constantsMarker = 'export const CONSTANTS = {';
const constantsIndex = config.indexOf(constantsMarker);
if (constantsIndex < 0) throw new Error('config.js: CONSTANTS marker not found');
config = `'use strict';\n\nexport { ANALYTICS } from './analytics.js';\n\n` + config.slice(constantsIndex);
write('js/config.js', config);

let calculator = read('js/calculator.js');
const entryContextCall = '...ANALYTICS.getEntryContext()';
const entryContextCount = calculator.split(entryContextCall).length - 1;
if (entryContextCount !== 2) throw new Error(`calculator.js: expected 2 entry context calls, found ${entryContextCount}`);
calculator = calculator.replaceAll(entryContextCall, '...ANALYTICS.getEntryContext({ consumeCalculatorEntry: true })');
write('js/calculator.js', calculator);

let article = read('blog/article.js');
article = replaceOnce(
  article,
  "    'use strict';\n\n    // Configuration",
  "    'use strict';\n\n    const analyticsModulePromise = import('/js/analytics.js');\n\n    // Configuration",
  'article analytics import'
);
article = replaceOnce(
  article,
  '    function setupCalculatorPrompt() {\n        if (document.querySelector(\'.article-calculator-prompt\')) return;\n        const content = document.querySelector(\'.content\');\n        if (!content) return;',
  `    function isCalculatorDestination(url) {\n        return url.origin === window.location.origin\n            && ['/', '/en/', '/ko/', '/tw/'].includes(url.pathname);\n    }\n\n    function hasEditorialCalculatorLink(content) {\n        return Array.from(content.querySelectorAll('a[href]')).some(link => {\n            if (link.closest('.article-calculator-prompt')) return false;\n            try {\n                return isCalculatorDestination(new URL(link.href, window.location.href));\n            } catch (error) {\n                return false;\n            }\n        });\n    }\n\n    function setupCalculatorPrompt() {\n        if (document.querySelector('.article-calculator-prompt')) return;\n        const content = document.querySelector('.content');\n        if (!content || hasEditorialCalculatorLink(content)) return;`,
  'article calculator prompt guard'
);
article = replaceOnce(
  article,
  "    function setupContextualGuideLinks() {\n        if (document.querySelector('.contextual-guide-links')) return;\n        const content = document.querySelector('.content');\n        if (!content) return;",
  "    function setupContextualGuideLinks() {\n        if (document.querySelector('.contextual-guide-links')) return;\n        const content = document.querySelector('.content');\n        if (!content || content.querySelector('.related-links-section')) return;",
  'article contextual guide guard'
);
article = replaceOnce(
  article,
  /\n    function getArticleNextStepCta\(\) \{[\s\S]*?\n    \/\/ 記事が計算機の利用につながったかだけを計測し、入力値は送信しない/,
  '\n    // 記事が計算機の利用につながったかだけを計測し、入力値は送信しない',
  'remove duplicate generated next-step CTA'
);
article = replaceOnce(
  article,
  /    function setupCalculatorLinkTracking\(\) \{[\s\S]*?\n    \}\n\n    \/\/ 記事本文を読み始める前に自動広告を挿入せず/,
  `    function getCalculatorLinkContext(link) {\n        if (link.closest('.article-calculator-prompt')) return 'article_calculator_prompt';\n        if (link.closest('.cta-box, .cta-banner')) return 'article_cta';\n        return 'article_link';\n    }\n\n    function setupCalculatorLinkTracking() {\n        document.addEventListener('click', (event) => {\n            const link = event.target && typeof event.target.closest === 'function'\n                ? event.target.closest('a[href]')\n                : null;\n            if (!link) return;\n\n            let url;\n            try {\n                url = new URL(link.href, window.location.href);\n            } catch (error) {\n                return;\n            }\n            if (!isCalculatorDestination(url)) return;\n\n            const linkContext = getCalculatorLinkContext(link);\n            const calculatorPreset = url.searchParams.has('mode') ? 'prefilled' : 'blank';\n            void analyticsModulePromise.then(({ ANALYTICS }) => {\n                ANALYTICS.rememberCalculatorEntry({\n                    source_path: window.location.pathname,\n                    link_context: linkContext,\n                    calculator_preset: calculatorPreset\n                });\n                ANALYTICS.track('article_to_calculator_clicked', {\n                    source_path: window.location.pathname,\n                    link_context: linkContext,\n                    destination_path: url.pathname,\n                    calculator_preset: calculatorPreset\n                });\n            }).catch(error => console.warn('Analytics module load failed:', error));\n        });\n    }\n\n    // 記事本文を読み始める前に自動広告を挿入せず`,
  'article calculator attribution tracking'
);
article = article.replace("        setupArticleNextStepCta();\n", '');
if (article.includes('setupArticleNextStepCta();')) throw new Error('article.js: duplicate next-step CTA call remains');
write('blog/article.js', article);

let blogScript = read('blog/script.js');
blogScript = replaceOnce(
  blogScript,
  /    \/\/ ===========================================\n    \/\/ Google Analytics 4 Event Tracking\n    \/\/ ===========================================[\s\S]*?    \/\/ ===========================================\n    \/\/ URL State Management/,
  `    // ===========================================\n    // Shared analytics event adapters\n    // ===========================================\n    const analyticsModulePromise = import('/js/analytics.js');\n    const Analytics = {\n        track(eventName, params) {\n            void analyticsModulePromise\n                .then(({ ANALYTICS }) => ANALYTICS.track(eventName, params))\n                .catch(error => console.warn('Analytics module load failed:', error));\n        },\n        trackArticleClick(title, category) {\n            this.track('article_click', { article_title: title, article_category: category });\n        },\n        trackSearch(query, resultsCount) {\n            this.track('search', { search_term: query, results_count: resultsCount });\n        },\n        trackCategoryFilter(category) {\n            this.track('category_filter', { category_name: category });\n        },\n        trackThemeChange(theme) {\n            this.track('theme_change', { theme_mode: theme });\n        }\n    };\n\n    // ===========================================\n    // URL State Management`,
  'blog analytics adapter'
);
write('blog/script.js', blogScript);

const intentTrackingSource = `'use strict';

(() => {
    const analyticsModulePromise = import('/js/analytics.js');

    function track(eventName, params) {
        void analyticsModulePromise
            .then(({ ANALYTICS }) => ANALYTICS.track(eventName, params || {}))
            .catch(error => console.warn('Analytics module load failed:', error));
    }

    function getLinkContext(link) {
        if (link.closest('.lp-mid-cta')) return 'mid_cta';
        if (link.closest('.lp-action-row')) return 'hero_cta';
        if (link.closest('.lp-related-list')) return 'related_link';
        return 'inline_link';
    }

    function getSourceSurface() {
        const segments = window.location.pathname.split('/').filter(Boolean);
        return segments.slice(-2).join('_') || 'home';
    }

    function isCalculatorDestination(url) {
        return ['/', '/en/', '/ko/', '/tw/'].includes(url.pathname);
    }

    document.addEventListener('click', (event) => {
        const link = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('a[href]')
            : null;
        if (!link) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const linkContext = getLinkContext(link);
        if (isCalculatorDestination(url) && linkContext !== 'related_link') {
            track('lp_to_calculator_clicked', {
                source_path: window.location.pathname,
                source_surface: getSourceSurface(),
                link_context: linkContext
            });
            return;
        }

        if (linkContext === 'related_link') {
            track('lp_related_link_clicked', {
                source_path: window.location.pathname,
                target_path: url.pathname,
                link_context: linkContext
            });
        }
    });
})();
`;
write('js/intent-tracking.js', intentTrackingSource);

let pointsCost = read('js/points-cost.js');
pointsCost = replaceOnce(
  pointsCost,
  "'use strict';\n\nconst REGIONS",
  "'use strict';\n\nconst analyticsModulePromise = import('/js/analytics.js');\n\nconst REGIONS",
  'points-cost analytics import'
);
pointsCost = replaceOnce(
  pointsCost,
  /function trackCalculation\(region, status, points\) \{[\s\S]*?\n\}/,
  `function trackCalculation(region, status, points) {\n  void analyticsModulePromise\n    .then(({ ANALYTICS }) => ANALYTICS.track('points_cost_calculation_completed', {\n      region,\n      status,\n      point_bucket: pointBucket(points)\n    }))\n    .catch(error => console.warn('Analytics module load failed:', error));\n}`,
  'points-cost shared analytics'
);
write('js/points-cost.js', pointsCost);

let components = read('blog/components.js');
components = replaceOnce(
  components,
  "        window.gtag('config', GA_MEASUREMENT_ID);\n\n        if (document.querySelector",
  "        window.gtag('config', GA_MEASUREMENT_ID);\n        if (window.PlayPointAnalytics) window.PlayPointAnalytics.flushPending();\n\n        if (document.querySelector",
  'blog analytics queue flush'
);
write('blog/components.js', components);

let assetVersioning = read('scripts/article-asset-versioning.cjs');
assetVersioning = replaceOnce(
  assetVersioning,
  'function syncDynamicArticleStylesheetVersion(rootDir) {',
  `function syncBlogDataVersions(rootDir) {\n  const dataPath = path.join(rootDir, 'blog/articles.json');\n  if (!fs.existsSync(dataPath)) return 0;\n  const version = createRevision(dataPath);\n  const targets = [\n    { relativePath: 'blog/script.js', pattern: /articles\\.json(?:\\?v=[a-zA-Z0-9_-]+)?/g, replacement: 'articles.json?v=' + version },\n    { relativePath: 'blog/article.js', pattern: /\\.\\.\\/blog\\/articles\\.json(?:\\?v=[a-zA-Z0-9_-]+)?/g, replacement: '../blog/articles.json?v=' + version }\n  ];\n  let updatedFiles = 0;\n  for (const target of targets) {\n    const absolutePath = path.join(rootDir, target.relativePath);\n    if (!fs.existsSync(absolutePath)) continue;\n    const original = fs.readFileSync(absolutePath, 'utf8');\n    const updated = original.replace(target.pattern, target.replacement);\n    if (updated === original) continue;\n    fs.writeFileSync(absolutePath, updated, 'utf8');\n    updatedFiles += 1;\n  }\n  console.log(\`[blog-data] synchronized articles.json: v=\${version}, files=\${updatedFiles}\`);\n  return updatedFiles;\n}\n\nfunction syncDynamicArticleStylesheetVersion(rootDir) {`,
  'blog JSON version synchronizer'
);
assetVersioning = replaceOnce(
  assetVersioning,
  '  syncPublicAssetVersions,\n  syncDynamicArticleStylesheetVersion',
  '  syncPublicAssetVersions,\n  syncBlogDataVersions,\n  syncDynamicArticleStylesheetVersion',
  'export blog JSON synchronizer'
);
write('scripts/article-asset-versioning.cjs', assetVersioning);

let buildHtml = read('scripts/build-html.js');
buildHtml = replaceOnce(
  buildHtml,
  '  syncPublicAssetVersions,\n  syncDynamicArticleStylesheetVersion',
  '  syncPublicAssetVersions,\n  syncBlogDataVersions,\n  syncDynamicArticleStylesheetVersion',
  'build import blog JSON synchronizer'
);
buildHtml = replaceOnce(
  buildHtml,
  'generateBlogFeeds(rootDir);\n\nconst strippedFontFiles',
  `generateBlogFeeds(rootDir);\nsyncBlogDataVersions(rootDir);\n// articles.jsonの版番号でblog/article.jsとblog/script.jsが変わるため、最終ハッシュを再同期する。\nsyncServiceWorkerAssets(rootDir, assetVersion);\nsyncPublicAssetVersions(rootDir);\n\nconst strippedFontFiles`,
  'build final blog JSON hash sync'
);
write('scripts/build-html.js', buildHtml);

let minify = read('.github/scripts/minify.cjs');
minify = replaceOnce(
  minify,
  "  'blog/style.css',",
  "  'blog/style.css',\n  'blog/index.css',",
  'minify blog index CSS'
);
minify = replaceOnce(
  minify,
  "  'js/main.js',",
  "  'js/main.js',\n  'js/analytics.js',",
  'minify analytics module'
);
minify = replaceOnce(
  minify,
  '    syncDynamicArticleStylesheetVersion,\n    syncPublicAssetVersions',
  '    syncDynamicArticleStylesheetVersion,\n    syncBlogDataVersions,\n    syncPublicAssetVersions',
  'minify import blog JSON synchronizer'
);
minify = replaceOnce(
  minify,
  '  syncDynamicArticleStylesheetVersion(root);\n  const indexHtml',
  '  syncDynamicArticleStylesheetVersion(root);\n  syncBlogDataVersions(root);\n  const indexHtml',
  'minify blog JSON hash order'
);
write('.github/scripts/minify.cjs', minify);

let assetSync = read('scripts/asset-sync.cjs');
assetSync = replaceOnce(
  assetSync,
  "  { versionKey: 'blogCssVersion', assetPath: './blog/style.css' },",
  "  { versionKey: 'blogCssVersion', assetPath: './blog/style.css' },\n  { versionKey: 'blogIndexCssVersion', assetPath: './blog/index.css' },",
  'service worker blog index CSS asset'
);
assetSync = replaceOnce(
  assetSync,
  "  'js/config.js',",
  "  'js/analytics.js',\n  'js/config.js',",
  'app module analytics revision'
);
assetSync = replaceOnce(
  assetSync,
  "  const blogCssVersion = createFileRevision(rootDir, 'blog/style.css');",
  "  const blogCssVersion = createFileRevision(rootDir, 'blog/style.css');\n  const blogIndexCssVersion = createFileRevision(rootDir, 'blog/index.css');",
  'collect blog index CSS version'
);
assetSync = replaceOnce(
  assetSync,
  '    blogCssVersion,\n    blogScriptVersion,',
  '    blogCssVersion,\n    blogIndexCssVersion,\n    blogScriptVersion,',
  'return blog index CSS version'
);
write('scripts/asset-sync.cjs', assetSync);

let sw = read('sw.js');
sw = replaceOnce(
  sw,
  "  './js/config.js',",
  "  './js/analytics.js',\n  './js/config.js',",
  'service worker analytics module'
);
sw = replaceOnce(
  sw,
  "  './blog/style.css?v=73cb119703',",
  "  './blog/style.css?v=73cb119703',\n  './blog/index.css',",
  'service worker blog index CSS'
);
write('sw.js', sw);

const oldCssPath = file('blog/index-compact.css');
const newCssPath = file('blog/index.css');
if (!fs.existsSync(oldCssPath)) throw new Error('blog/index-compact.css not found');
let indexCss = fs.readFileSync(oldCssPath, 'utf8')
  .replace('/* 記事一覧ページ専用：記事を最初に見せるためのコンパクトレイアウト */', '/* 記事一覧専用レイアウト。共通トークンと部品はstyle.cssへ集約する。 */')
  .replaceAll('body.blog-index-compact', 'body.blog-index');
write('blog/index.css', indexCss);
fs.rmSync(oldCssPath);

let blogIndex = read('blog/index.html');
blogIndex = replaceOnce(
  blogIndex,
  /index-compact\.css\?v=[a-zA-Z0-9_-]+/,
  'index.css',
  'blog index stylesheet reference'
);
blogIndex = replaceOnce(blogIndex, 'body class="blog-index-compact"', 'body class="blog-index"', 'blog index body class');
write('blog/index.html', blogIndex);

const testSource = `'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('articles.jsonは内容ハッシュ付きURLで一覧と関連記事から取得する', () => {
  const version = crypto.createHash('sha256')
    .update(read('blog/articles.json').replace(/\\r\\n/g, '\\n'))
    .digest('hex')
    .slice(0, 10);
  assert.match(read('blog/script.js'), new RegExp('articles\\\\.json\\\\?v=' + version));
  assert.match(read('blog/article.js'), new RegExp('\\\\.\\\\.\\\\/blog\\\\/articles\\\\.json\\\\?v=' + version));
});

test('記事CTAは編集済み導線を優先し自動補完を重ねない', () => {
  const source = read('blog/article.js');
  assert.match(source, /hasEditorialCalculatorLink\(content\)/);
  assert.match(source, /content\.querySelector\('\.related-links-section'\)/);
  assert.doesNotMatch(source, /setupArticleNextStepCta\(\);/);
  assert.match(source, /calculator_preset: calculatorPreset/);
});

test('記事流入元は同意後だけ一時保存し計算完了へ引き継ぐ', () => {
  const analytics = read('js/analytics.js');
  const calculator = read('js/calculator.js');
  assert.match(analytics, /rememberCalculatorEntry\(context = \{\}\)/);
  assert.match(analytics, /CALCULATOR_ENTRY_TTL_MS = 30 \* 60 \* 1000/);
  assert.match(analytics, /entry_source_path/);
  assert.match(analytics, /entry_link_context/);
  assert.match(analytics, /entry_calculator_preset/);
  assert.equal((calculator.match(/consumeCalculatorEntry: true/g) || []).length, 2);
});

test('イベント送信・同意・サニタイズ処理は共通Analyticsへ集約する', () => {
  const config = read('js/config.js');
  assert.match(config, /export \{ ANALYTICS \} from '\.\/analytics\.js'/);
  for (const relativePath of ['blog/script.js', 'blog/article.js', 'js/intent-tracking.js', 'js/points-cost.js']) {
    const source = read(relativePath);
    assert.match(source, /import\('\/js\/analytics\.js'\)/, relativePath);
    assert.doesNotMatch(source, /window\.gtag\(['"]event['"]/, relativePath);
  }
  assert.match(read('blog/components.js'), /PlayPointAnalytics\.flushPending\(\)/);
});

test('記事一覧固有CSSは共有CSSから分離しビルド対象に含める', () => {
  assert.equal(fs.existsSync(path.join(root, 'blog/index.css')), true);
  assert.equal(fs.existsSync(path.join(root, 'blog/index-compact.css')), false);
  assert.match(read('blog/index.html'), /href="index\.css\?v=[a-zA-Z0-9_-]+"/);
  assert.match(read('blog/index.html'), /body class="blog-index"/);
  assert.match(read('.github/scripts/minify.cjs'), /'blog\/index\.css'/);
  assert.match(read('scripts/asset-sync.cjs'), /blogIndexCssVersion/);
  assert.match(read('sw.js'), /\.\/blog\/index\.css\?v=/);
});
`;
write('tests/growth-flow-foundation.test.cjs', testSource);

let docs = read('docs/ANALYTICS.md');
if (!docs.includes('entry_source_path')) {
  docs += `\n\n## 記事から計算完了までの流入計測\n\n記事内の計算機リンクを押した場合、同意済みユーザーに限り、記事パス・導線種別・入力済みリンクかどうかをsessionStorageへ最大30分保存します。金額、ポイント数、日記内容は保存・送信しません。計算完了時には \`entry_source_path\`、\`entry_link_context\`、\`entry_calculator_preset\` として送信し、1回の計算完了後に削除します。\n`;
  write('docs/ANALYTICS.md', docs);
}

fs.rmSync(file('scripts/apply-growth-flow-foundation.cjs'), { force: true });
fs.rmSync(file('.github/workflows/apply-growth-flow-foundation.yml'), { force: true });
console.log('Growth flow foundation migration applied.');
