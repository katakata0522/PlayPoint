'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, 'utf8');
}

function replaceOnce(content, before, after, label) {
  const first = content.indexOf(before);
  if (first === -1) throw new Error(`Missing pattern: ${label}`);
  if (content.indexOf(before, first + before.length) !== -1) throw new Error(`Pattern is not unique: ${label}`);
  return content.slice(0, first) + after + content.slice(first + before.length);
}

function patchAnalyticsCore() {
  const rel = 'js/analytics-core.js';
  let content = read(rel);

  content = replaceOnce(
    content,
    "    const CALCULATOR_PATHS = new Set(['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']);\n    const ALLOWED_PARAMS = Object.freeze({",
    `    const CALCULATOR_PATHS = new Set(['/', '/en/', '/ko/', '/tw/', '/hk/', '/in/']);\n    const ENUM_PARAM_VALUES = Object.freeze({\n        component: new Set(['site_identity', 'global_nav', 'breadcrumb', 'region_switch', 'next_step', 'popular', 'related', 'author', 'katakatalab', 'browse']),\n        locale: new Set(['en', 'ko', 'tw']),\n        article_role: new Set(['calculator_bridge', 'decision_support', 'troubleshooting', 'retention', 'game_decision', 'reference', 'hold']),\n        article_category: new Set(['account', 'earn', 'levels', 'troubleshooting', 'guides']),\n        destination_type: new Set(['calculator', 'article', 'guide_hub', 'category', 'operator_profile', 'external_profile', 'region_home', 'section', 'internal'])\n    });\n    const REQUIRED_PARAMS = Object.freeze({\n        article_navigation_click: Object.freeze(['source_path', 'component', 'locale', 'article_role', 'article_category', 'destination_type'])\n    });\n    const ALLOWED_PARAMS = Object.freeze({`,
    'analytics enum definitions'
  );

  content = replaceOnce(
    content,
    "        article_to_calculator_clicked: ['source_path', 'link_context', 'destination_path'],\n",
    "        article_to_calculator_clicked: ['source_path', 'link_context', 'destination_path'],\n        article_navigation_click: ['source_path', 'target_path', 'component', 'locale', 'article_role', 'article_category', 'destination_type', 'link_position'],\n",
    'article_navigation_click allowlist'
  );

  content = replaceOnce(
    content,
    "        let text = String(value).trim();\n        if (!text) return null;\n        if (key.endsWith('_path')) {",
    "        let text = String(value).trim();\n        if (!text) return null;\n        const enumValues = ENUM_PARAM_VALUES[key];\n        if (enumValues && !enumValues.has(text)) return null;\n        if (key.endsWith('_path')) {",
    'enum sanitization'
  );

  content = replaceOnce(
    content,
    "    function sanitizeParams(eventName, params = {}) {\n        const allowed = ALLOWED_PARAMS[eventName];\n        if (!allowed) return null;\n        return sanitizeAllowedParams(allowed, params);\n    }",
    "    function sanitizeParams(eventName, params = {}) {\n        const allowed = ALLOWED_PARAMS[eventName];\n        if (!allowed) return null;\n        const clean = sanitizeAllowedParams(allowed, params);\n        const required = REQUIRED_PARAMS[eventName];\n        if (required && required.some(key => clean[key] === undefined)) return null;\n        return clean;\n    }",
    'required params validation'
  );

  const journeyHelpers = String.raw`
    const INTL_ARTICLE_PATH_PATTERN = /^\/(en|ko|tw)\/articles\/[^/]+\.html$/;
    const ARTICLE_CATEGORY_BY_ANCHOR = Object.freeze({
        'intl-hub-account': 'account',
        'intl-hub-earn': 'earn',
        'intl-hub-levels': 'levels',
        'intl-hub-trouble': 'troubleshooting'
    });

    function getArticleJourneyContext() {
        const pathname = window.location && window.location.pathname ? String(window.location.pathname) : '';
        const localeMatch = pathname.match(INTL_ARTICLE_PATH_PATTERN);
        if (!localeMatch || !window.document || typeof window.document.querySelector !== 'function') return null;

        const roleWidget = window.document.querySelector('.intl-article-sidebar .sidebar-widget--next');
        const roleMatch = String(roleWidget && roleWidget.className || '').match(/\bsidebar-widget--role-([a-z_]+)\b/);
        if (!roleMatch) return null;

        let articleCategory = 'guides';
        const categoryLink = window.document.querySelector('.intl-breadcrumb-category');
        const categoryHref = categoryLink && typeof categoryLink.getAttribute === 'function'
            ? String(categoryLink.getAttribute('href') || '')
            : '';
        for (const [anchor, category] of Object.entries(ARTICLE_CATEGORY_BY_ANCHOR)) {
            if (categoryHref.includes('#' + anchor)) {
                articleCategory = category;
                break;
            }
        }

        return {
            locale: localeMatch[1],
            article_role: roleMatch[1],
            article_category: articleCategory
        };
    }

    function getSelectorPosition(link, selector) {
        if (!window.document || typeof window.document.querySelectorAll !== 'function') return null;
        const links = Array.from(window.document.querySelectorAll(selector));
        const index = links.indexOf(link);
        return index >= 0 && index < 10 ? index + 1 : null;
    }

    function getPopularPosition(link) {
        const item = link && typeof link.closest === 'function' ? link.closest('.sidebar-popular-item') : null;
        const rank = item && typeof item.querySelector === 'function' ? item.querySelector('.sidebar-popular-rank') : null;
        const position = Number.parseInt(rank && rank.textContent || '', 10);
        return Number.isInteger(position) && position >= 1 && position <= 10 ? position : null;
    }

    function classifyArticleNavigationLink(link, url) {
        if (!link || !url) return null;
        const hasClass = name => Boolean(link.classList && typeof link.classList.contains === 'function' && link.classList.contains(name));
        const closest = selector => typeof link.closest === 'function' ? link.closest(selector) : null;

        if (hasClass('site-logo')) return { component: 'site_identity', link_position: 1 };
        if (hasClass('nav-item') && closest('.intl-global-nav')) return { component: 'global_nav', link_position: getSelectorPosition(link, '.intl-global-nav .nav-item') };
        if (closest('.intl-article-breadcrumbs')) return { component: 'breadcrumb', link_position: getSelectorPosition(link, '.intl-article-breadcrumbs a') };
        if (closest('.site-region-menu')) return { component: 'region_switch', link_position: getSelectorPosition(link, '.site-region-menu a') };
        if (hasClass('sidebar-next-link')) return { component: 'next_step', link_position: 1 };
        if (hasClass('sidebar-popular-link')) return { component: 'popular', link_position: getPopularPosition(link) };
        if (hasClass('sidebar-related-link')) return { component: 'related', link_position: getSelectorPosition(link, '.sidebar-related-link') };
        if (hasClass('sidebar-browse-link')) return { component: 'browse', link_position: getSelectorPosition(link, '.sidebar-browse-link') };
        if (hasClass('site-about-link') || closest('.sidebar-author-links, .author-box-links')) {
            const hostname = String(url.hostname || '').toLowerCase();
            const isKatakataLab = hostname === 'katakatalab.com' || hostname.endsWith('.katakatalab.com');
            return {
                component: isKatakataLab ? 'katakatalab' : 'author',
                link_position: getSelectorPosition(link, '.sidebar-author-links a, .author-box-links a, .site-about-link')
            };
        }
        return null;
    }

    function classifyArticleDestination(url, component) {
        if (url.origin !== window.location.origin) return component === 'katakatalab' ? 'external_profile' : 'internal';
        if (isCalculatorDestination(url)) return component === 'region_switch' ? 'region_home' : 'calculator';
        if (component === 'author') return 'operator_profile';
        if (/\/(?:en|ko|tw)\/articles\/[^/]+\.html$/.test(url.pathname)) return 'article';
        if (/\/(?:en|ko|tw)\/articles\/$/.test(url.pathname)) return url.hash ? 'category' : 'guide_hub';
        if (url.pathname === window.location.pathname && url.hash) return 'section';
        return 'internal';
    }

    function installArticleJourneyTracking() {
        if (!window.document || typeof window.document.addEventListener !== 'function') return;
        const pathname = window.location && window.location.pathname ? String(window.location.pathname) : '';
        if (!INTL_ARTICLE_PATH_PATTERN.test(pathname)) return;

        window.document.addEventListener('click', event => {
            const link = event && event.target && typeof event.target.closest === 'function'
                ? event.target.closest('a[href]')
                : null;
            if (!link) return;

            let url;
            try {
                url = resolveUrl(link);
            } catch (error) {
                return;
            }

            const journey = classifyArticleNavigationLink(link, url);
            const context = getArticleJourneyContext();
            if (!journey || !context) return;

            const params = {
                source_path: pathname,
                component: journey.component,
                locale: context.locale,
                article_role: context.article_role,
                article_category: context.article_category,
                destination_type: classifyArticleDestination(url, journey.component)
            };
            if (journey.link_position !== null) params.link_position = journey.link_position;
            if (url.origin === window.location.origin) params.target_path = url.pathname;
            track('article_navigation_click', params);
        });
    }
`;

  content = replaceOnce(
    content,
    "    function markEngaged() {",
    journeyHelpers + "\n    function markEngaged() {",
    'article journey helpers'
  );

  content = replaceOnce(
    content,
    "    installGtagBridge();\n    if (window.document && typeof window.document.addEventListener === 'function') {",
    "    installGtagBridge();\n    installArticleJourneyTracking();\n    if (window.document && typeof window.document.addEventListener === 'function') {",
    'article journey installation'
  );

  write(rel, content);
}

function patchPerformanceBudget() {
  const rel = '.github/scripts/mobile-performance-budget.cjs';
  let content = read(rel);

  content = replaceOnce(
    content,
    "const KB = 1024;\n\nconst HARD_BUDGETS = Object.freeze({",
    `const KB = 1024;\n\nconst ARTICLE_HARD_BUDGET = Object.freeze({\n  performanceScore: 0.70,\n  largestContentfulPaintMs: 3000,\n  totalBlockingTimeMs: 800,\n  cumulativeLayoutShift: 0.15,\n  totalByteWeight: 350 * KB\n});\n\nconst HARD_BUDGETS = Object.freeze({`,
    'shared article performance budget'
  );

  content = replaceOnce(
    content,
    `  representativeArticle: Object.freeze({\n    performanceScore: 0.70,\n    largestContentfulPaintMs: 3000,\n    totalBlockingTimeMs: 800,\n    cumulativeLayoutShift: 0.15,\n    totalByteWeight: 350 * KB\n  })\n});`,
    `  representativeArticle: ARTICLE_HARD_BUDGET,\n  internationalArticleEn: ARTICLE_HARD_BUDGET,\n  internationalArticleKo: ARTICLE_HARD_BUDGET,\n  internationalArticleTw: ARTICLE_HARD_BUDGET\n});`,
    'international article budgets'
  );

  content = replaceOnce(
    content,
    "  representativeArticle: 1,\n  default: 1",
    "  representativeArticle: 1,\n  internationalArticleEn: 1,\n  internationalArticleKo: 1,\n  internationalArticleTw: 1,\n  default: 1",
    'international article samples'
  );

  content = replaceOnce(
    content,
    "  if (name.includes('representative-article')) return 'representativeArticle';\n  return 'default';",
    "  if (name.includes('representative-article')) return 'representativeArticle';\n  if (name.includes('international-article-en')) return 'internationalArticleEn';\n  if (name.includes('international-article-ko')) return 'internationalArticleKo';\n  if (name.includes('international-article-tw')) return 'internationalArticleTw';\n  return 'default';",
    'international article performance profiles'
  );

  content = replaceOnce(
    content,
    "  BUDGETS: HARD_BUDGETS.default,\n  HARD_BUDGETS,",
    "  ARTICLE_HARD_BUDGET,\n  BUDGETS: HARD_BUDGETS.default,\n  HARD_BUDGETS,",
    'article budget export'
  );

  write(rel, content);
}

function patchPerformanceWorkflow() {
  const rel = '.github/workflows/mobile-performance.yml';
  let content = read(rel);

  content = replaceOnce(
    content,
    "      - 'articles/article-shared.css'\n      - 'articles/styles/2026-03-10-play-points-reflection-timing.css'",
    "      - 'articles/article-shared.css'\n      - 'articles/intl-article.css'\n      - 'articles/intl-shell-v1.css'\n      - 'articles/styles/2026-03-10-play-points-reflection-timing.css'\n      - 'en/articles/google-play-points-join-eligibility.html'\n      - 'ko/articles/google-play-points-join-eligibility.html'\n      - 'tw/articles/google-play-points-join-eligibility.html'",
    'international performance trigger paths'
  );

  content = replaceOnce(
    content,
    "          audit_page representative-article /articles/2026-03-10-play-points-reflection-timing.html",
    "          audit_page representative-article /articles/2026-03-10-play-points-reflection-timing.html\n          audit_page international-article-en /en/articles/google-play-points-join-eligibility.html\n          audit_page international-article-ko /ko/articles/google-play-points-join-eligibility.html\n          audit_page international-article-tw /tw/articles/google-play-points-join-eligibility.html",
    'international performance audits'
  );

  content = replaceOnce(
    content,
    "          performance-artifacts/article-hub.json\n          performance-artifacts/representative-article.json\n          --output-dir performance-artifacts",
    "          performance-artifacts/article-hub.json\n          performance-artifacts/representative-article.json\n          performance-artifacts/international-article-en.json\n          performance-artifacts/international-article-ko.json\n          performance-artifacts/international-article-tw.json\n          --output-dir performance-artifacts",
    'international diagnostics inputs'
  );

  content = replaceOnce(
    content,
    "          performance-artifacts/article-hub.json\n          performance-artifacts/representative-article.json\n\n      - name: Upload Lighthouse reports and CLS evidence",
    "          performance-artifacts/article-hub.json\n          performance-artifacts/representative-article.json\n          performance-artifacts/international-article-en.json\n          performance-artifacts/international-article-ko.json\n          performance-artifacts/international-article-tw.json\n\n      - name: Upload Lighthouse reports and CLS evidence",
    'international budget inputs'
  );

  write(rel, content);
}

function patchAnalyticsDocs() {
  const rel = 'docs/ANALYTICS.md';
  let content = read(rel);
  content = replaceOnce(
    content,
    "| `article_to_calculator_clicked` | 記事から計算機へ移動した時 | `source_path`, `link_context`, `destination_path` | コンテンツがツール利用へつながったか判断する |\n",
    "| `article_to_calculator_clicked` | 記事から計算機へ移動した時 | `source_path`, `link_context`, `destination_path` | コンテンツがツール利用へつながったか判断する |\n| `article_navigation_click` | EN / KO / TW記事のNavigation / Sidebar v1導線を押した時 | `source_path`, `target_path`（同一originのみ）, `component`, `locale`, `article_role`, `article_category`, `destination_type`, `link_position` | Next step / Popular / Related / Author / Browse / headerのうち、どの導線が次行動に使われているか判断する |\n",
    'analytics docs event row'
  );

  const marker = "`calculator_form_started` と `calculator_funnel_completed` は通常計算・逆算ごとに1ページ1回だけ送る。";
  content = replaceOnce(
    content,
    marker,
    "`article_navigation_click` はリンク文言・記事タイトル・自由入力を送らず、有限の分類値だけを送る。`component` は `site_identity / global_nav / breadcrumb / region_switch / next_step / popular / related / author / katakatalab / browse`、`locale` は `en / ko / tw`、`article_role` と `article_category` は既存のArticle Role / guide taxonomyに合わせる。外部のKatakataLab導線では `target_path` を送らず、`destination_type=external_profile` だけを記録する。これにより内部リンクのアンカー文言や利用者入力がGA4へ流れないようにする。\n\n" + marker,
    'analytics docs privacy contract'
  );

  content = replaceOnce(
    content,
    "10. 記事と検索意図別LPから計算機へ移動して計算し、流入属性が最初の完了イベントだけに付くことを確認する。",
    "10. 記事と検索意図別LPから計算機へ移動して計算し、流入属性が最初の完了イベントだけに付くことを確認する。\n11. EN / KO / TWの代表記事で Next step / Popular / Related / About Katakata / KatakataLab / Browse / Play country を1回ずつ操作し、`article_navigation_click` が有限分類だけで届くことを確認する。\n12. `article_navigation_click` にリンク文言、記事タイトル、課金額、必要ポイントが含まれないことを確認する。",
    'analytics docs verification steps'
  );

  write(rel, content);
}

function createRegressionTest() {
  const rel = 'tests/article-navigation-observability.test.cjs';
  const content = `'use strict';\n\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\nconst vm = require('node:vm');\n\nconst root = path.resolve(__dirname, '..');\nconst analyticsSource = fs.readFileSync(path.join(root, 'js/analytics-core.js'), 'utf8');\nconst workflowSource = fs.readFileSync(path.join(root, '.github/workflows/mobile-performance.yml'), 'utf8');\nconst budget = require('../.github/scripts/mobile-performance-budget.cjs');\n\nfunction createClassList(classes) {\n  const set = new Set(classes);\n  return { contains(name) { return set.has(name); } };\n}\n\nfunction createRuntime() {\n  const listeners = new Map();\n  const roleWidget = { className: 'sidebar-widget sidebar-widget--next sidebar-widget--role-reference' };\n  const categoryLink = { getAttribute(name) { return name === 'href' ? '/en/articles/#intl-hub-account' : null; } };\n  const rank = { textContent: '02' };\n  const popularItem = { querySelector(selector) { return selector === '.sidebar-popular-rank' ? rank : null; } };\n  const popularLink = {\n    href: 'https://playpoint-sim.com/en/articles/google-play-points-cash-conversion.html',\n    classList: createClassList(['sidebar-popular-link']),\n    closest(selector) {\n      if (selector === 'a[href]') return this;\n      if (selector === '.sidebar-popular-item') return popularItem;\n      return null;\n    }\n  };\n  const context = {\n    console: { warn() {} },\n    URL,\n    URLSearchParams,\n    location: {\n      href: 'https://playpoint-sim.com/en/articles/google-play-points-join-eligibility.html',\n      origin: 'https://playpoint-sim.com',\n      pathname: '/en/articles/google-play-points-join-eligibility.html',\n      search: ''\n    },\n    sessionStorage: { getItem() { return null; }, removeItem() {}, setItem() {} },\n    PlayPointConsent: { getStatus: () => 'granted' },\n    dispatchEvent() {},\n    CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },\n    document: {\n      addEventListener(type, listener) {\n        if (!listeners.has(type)) listeners.set(type, []);\n        listeners.get(type).push(listener);\n      },\n      querySelector(selector) {\n        if (selector === '.intl-article-sidebar .sidebar-widget--next') return roleWidget;\n        if (selector === '.intl-breadcrumb-category') return categoryLink;\n        return null;\n      },\n      querySelectorAll(selector) {\n        if (selector === '.sidebar-popular-link') return [popularLink];\n        return [];\n      }\n    }\n  };\n  context.window = context;\n  vm.createContext(context);\n  vm.runInContext(analyticsSource, context, { filename: 'analytics-core.js' });\n  context.PlayPointAnalytics.markAnalyticsReady();\n  return { context, listeners, popularLink };\n}\n\nfunction eventCalls(context, eventName) {\n  return context.dataLayer\n    .filter(item => item && item[0] === 'event' && item[1] === eventName)\n    .map(item => JSON.parse(JSON.stringify(item[2])));\n}\n\ntest('international article navigation emits only finite classification values', () => {\n  const { context, listeners, popularLink } = createRuntime();\n  const click = listeners.get('click')[0];\n  click({ target: popularLink });\n  assert.deepEqual(eventCalls(context, 'article_navigation_click'), [{\n    source_path: '/en/articles/google-play-points-join-eligibility.html',\n    target_path: '/en/articles/google-play-points-cash-conversion.html',\n    component: 'popular',\n    locale: 'en',\n    article_role: 'reference',\n    article_category: 'account',\n    destination_type: 'article',\n    link_position: 2\n  }]);\n});\n\ntest('article navigation rejects unknown cardinality values and external target paths', () => {\n  const { context } = createRuntime();\n  const analytics = context.PlayPointAnalytics;\n  assert.equal(analytics.sanitizeParams('article_navigation_click', {\n    source_path: '/en/articles/a.html',\n    target_path: 'https://example.com/private',\n    component: 'arbitrary-widget',\n    locale: 'en',\n    article_role: 'reference',\n    article_category: 'account',\n    destination_type: 'article'\n  }), null);\n  const clean = analytics.sanitizeParams('article_navigation_click', {\n    source_path: '/en/articles/a.html',\n    target_path: 'https://example.com/private',\n    component: 'katakatalab',\n    locale: 'en',\n    article_role: 'reference',\n    article_category: 'account',\n    destination_type: 'external_profile',\n    link_position: 1,\n    link_text: 'must not leak'\n  });\n  assert.deepEqual(JSON.parse(JSON.stringify(clean)), {\n    source_path: '/en/articles/a.html',\n    component: 'katakatalab',\n    locale: 'en',\n    article_role: 'reference',\n    article_category: 'account',\n    destination_type: 'external_profile',\n    link_position: 1\n  });\n});\n\ntest('P0 performance CI measures EN KO TW articles independently', () => {\n  for (const locale of ['en', 'ko', 'tw']) {\n    assert.match(workflowSource, new RegExp('international-article-' + locale));\n    assert.match(workflowSource, new RegExp('/' + locale + '/articles/google-play-points-join-eligibility\\\\.html'));\n    const profile = budget.getProfile('performance-artifacts/international-article-' + locale + '.json');\n    const expected = 'internationalArticle' + locale[0].toUpperCase() + locale.slice(1);\n    assert.equal(profile, expected);\n    assert.equal(budget.HARD_BUDGETS[profile].largestContentfulPaintMs, 3000);\n    assert.equal(budget.HARD_BUDGETS[profile].cumulativeLayoutShift, 0.15);\n  }\n  assert.match(workflowSource, /articles\\/intl-shell-v1\\.css/);\n  assert.match(workflowSource, /articles\\/intl-article\\.css/);\n  assert.equal(budget.TARGETS.largestContentfulPaintMs, 2500);\n  assert.equal(budget.TARGETS.cumulativeLayoutShift, 0.10);\n});\n`;
  write(rel, content);
}

patchAnalyticsCore();
patchPerformanceBudget();
patchPerformanceWorkflow();
patchAnalyticsDocs();
createRegressionTest();

console.log('P0 article observability/performance patch applied.');
