'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, 'utf8');
}

function replaceOnce(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error('Patch target not found: ' + label);
  return next;
}

let layout = read('scripts/intl-article-layout.cjs');

layout = replaceOnce(
  layout,
  /\n\}\);\n\nfunction escapeHtml\(value\) \{/,
  `\n});\n\nconst INTL_NAV = Object.freeze({
  en: { account: 'Account & basics', earn: 'Earn & spend', levels: 'Levels & rewards', troubleshooting: 'Troubleshooting' },
  ko: { account: '계정·기본', earn: '적립·사용', levels: '등급·리워드', troubleshooting: '문제 해결' },
  tw: { account: '帳號與基本', earn: '積點與使用', levels: '等級與回饋', troubleshooting: '問題排查' }
});

const INTL_SIDEBAR = Object.freeze({
  en: {
    calculatorHeading: 'Estimate your remaining cost',
    calculatorBody: 'Use the points still needed and the final earn rate shown for the account that will make the purchase.',
    calculatorCta: 'Open calculator',
    quickTitle: 'Levels & rewards',
    quickLinks: [
      ['/en/articles/google-play-points-levels.html', 'Levels', 'How the level system works'],
      ['/en/articles/google-play-points-platinum-diamond-cost.html', 'Platinum / Diamond', 'Plan the remaining cost'],
      ['/en/articles/google-play-points-weekly-reward.html', 'Weekly rewards', 'Eligibility and timing'],
      ['/en/articles/google-play-points-balance-history-progress.html', 'Progress', 'Balance and history']
    ],
    checkTitle: 'Before you buy',
    checkItems: [
      ['Account', 'Use the Play country and Google account that will actually make the purchase.'],
      ['Offer', 'Confirm eligible items, the offer period, and the final special earn rate shown in Google Play.'],
      ['After purchase', 'Recheck credited points and the remaining progress instead of assuming the estimate was exact.']
    ],
    tipTitle: 'Quick rule',
    tipBody: 'Page language does not change earning rules. Your Play country, account, eligible purchase, and current offer determine the conditions.',
    categoriesTitle: 'Browse guides',
    categories: [['Account & basics', 'intl-hub-account'], ['Earning & spending', 'intl-hub-earn'], ['Levels & rewards', 'intl-hub-levels'], ['Troubleshooting', 'intl-hub-trouble']]
  },
  ko: {
    calculatorHeading: '남은 필요 금액 계산',
    calculatorBody: '실제로 결제할 계정의 남은 포인트와 Google Play에 표시된 최종 적립률을 기준으로 계산하세요.',
    calculatorCta: '계산기 열기',
    quickTitle: '등급·리워드',
    quickLinks: [
      ['/ko/articles/google-play-points-levels.html', '등급', '등급 구조 확인'],
      ['/ko/articles/google-play-points-platinum-diamond-cost.html', '플래티넘·다이아', '남은 필요 금액 계획'],
      ['/ko/articles/google-play-points-weekly-reward.html', '주간 리워드', '대상과 시점 확인'],
      ['/ko/articles/google-play-points-balance-history-progress.html', '진행도', '잔액과 내역 확인']
    ],
    checkTitle: '결제 전 확인',
    checkItems: [
      ['계정', '실제로 결제할 Google 계정과 Play 국가를 기준으로 확인하세요.'],
      ['오퍼', '대상 상품, 기간, Google Play에 표시된 최종 특별 적립률을 확인하세요.'],
      ['결제 후', '예상치만 믿지 말고 실제 적립 포인트와 남은 진행도를 다시 확인하세요.']
    ],
    tipTitle: '핵심 기준',
    tipBody: '페이지 언어가 적립 규칙을 바꾸지 않습니다. Play 국가, 계정, 대상 결제, 현재 오퍼가 실제 조건을 결정합니다.',
    categoriesTitle: '가이드 찾아보기',
    categories: [['계정·기본', 'intl-hub-account'], ['적립·사용', 'intl-hub-earn'], ['등급·리워드', 'intl-hub-levels'], ['문제 해결', 'intl-hub-trouble']]
  },
  tw: {
    calculatorHeading: '估算剩餘所需金額',
    calculatorBody: '請使用實際付款帳號還差的點數，以及 Google Play 顯示的最終積點率來估算。',
    calculatorCta: '開啟計算機',
    quickTitle: '等級與回饋',
    quickLinks: [
      ['/tw/articles/google-play-points-levels.html', '等級', '確認等級制度'],
      ['/tw/articles/google-play-points-platinum-diamond-cost.html', '白金／鑽石', '規劃剩餘所需金額'],
      ['/tw/articles/google-play-points-weekly-reward.html', '每週回饋', '確認資格與時間'],
      ['/tw/articles/google-play-points-balance-history-progress.html', '進度', '查看點數與紀錄']
    ],
    checkTitle: '購買前確認',
    checkItems: [
      ['帳號', '以實際付款的 Google 帳號與 Play 國家或地區為準。'],
      ['活動', '確認適用商品、活動期間，以及 Google Play 顯示的最終活動特別獲點率。'],
      ['購買後', '請重新確認實際入帳點數與剩餘進度，不要把估算值當成保證結果。']
    ],
    tipTitle: '快速判斷',
    tipBody: '頁面語言不會改變積點規則。Play 國家或地區、帳號、適用購買與目前活動才是實際條件。',
    categoriesTitle: '瀏覽指南',
    categories: [['帳號與基本', 'intl-hub-account'], ['積點與使用', 'intl-hub-earn'], ['等級與回饋', 'intl-hub-levels'], ['問題排查', 'intl-hub-trouble']]
  }
});

function inferIntlSection(relativePath) {
  const slug = path.posix.basename(String(relativePath || ''), '.html').replace(/^\\d{4}-\\d{2}-\\d{2}-/, '').toLowerCase();
  if (/(?:not-showing|not-applied|not-working|coupon|refund|locked|missing|cannot|quest)/.test(slug)) return 'troubleshooting';
  if (/(?:level|levels|silver|gold|platinum|diamond|weekly-reward|super-weekly|maintenance)/.test(slug)) return 'levels';
  if (/(?:gift|payment|purchase|subscription|discount|promo|earn|earning|cash|credit|value|cost|spend|rounding|tax)/.test(slug)) return 'earn';
  if (/(?:account|device|country|family|join|eligibility|balance-history|expiration)/.test(slug)) return 'account';
  return 'guides';
}

function escapeHtml(value) {`,
  'insert localized navigation and sidebar configuration'
);

layout = replaceOnce(
  layout,
  /function renderArticleChrome\(localeKey, title, newline, options = \{\}\) \{[\s\S]*?\n\}\n\nfunction renderSidebar/,
  `function renderArticleChrome(localeKey, title, newline, options = {}) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const navLabels = INTL_NAV[localeKey];
  const isHub = options.isHub === true;
  const isPolicy = options.isPolicy === true;
  const section = options.section || (isHub ? 'guides' : 'guides');
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const policyHref = homeHref + 'author/katakata.html';
  const navClass = key => 'nav-item' + (section === key ? ' active' : '');
  return [
    CHROME_START,
    '<header class="site-header intl-article-site-header">',
    '  <div class="site-header-inner">',
    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',
    '    <nav class="site-header-links" aria-label="' + escapeHtml(labels.navigation) + '">',
    '      <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>',
    '      <a href="' + policyHref + '">' + escapeHtml(labels.policy) + '</a>',
    '    </nav>',
    '  </div>',
    '</header>',
    '<nav class="global-nav intl-global-nav" aria-label="' + escapeHtml(labels.primary) + '">',
    '  <div class="global-nav-inner">',
    '    <a class="' + navClass('home') + '" href="' + homeHref + '"><span>' + escapeHtml(locale.home) + '</span></a>',
    '    <a class="' + navClass('guides') + '" href="' + guidesHref + '"><span>' + escapeHtml(locale.blog) + '</span></a>',
    '    <a class="' + navClass('account') + '" href="' + guidesHref + '#intl-hub-account"><span>' + escapeHtml(navLabels.account) + '</span></a>',
    '    <a class="' + navClass('earn') + '" href="' + guidesHref + '#intl-hub-earn"><span>' + escapeHtml(navLabels.earn) + '</span></a>',
    '    <a class="' + navClass('levels') + '" href="' + guidesHref + '#intl-hub-levels"><span>' + escapeHtml(navLabels.levels) + '</span></a>',
    '    <a class="' + navClass('troubleshooting') + '" href="' + guidesHref + '#intl-hub-trouble"><span>' + escapeHtml(navLabels.troubleshooting) + '</span></a>',
    '  </div>',
    '</nav>',
    '<div class="breadcrumbs-wrapper intl-article-breadcrumbs">',
    '  <nav aria-label="' + escapeHtml(labels.breadcrumb) + '">',
    '    <a href="' + homeHref + '">' + escapeHtml(locale.home) + '</a>' + (isPolicy ? '<span aria-hidden="true">&gt;</span>' : '<span aria-hidden="true">&gt;</span>'),
    ...(isPolicy
      ? ['    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>']
      : [
        '    <a href="' + guidesHref + '">' + escapeHtml(locale.blog) + '</a>' + (isHub ? '' : '<span aria-hidden="true">&gt;</span>'),
        ...(isHub ? [] : ['    <span class="intl-breadcrumb-current">' + escapeHtml(title) + '</span>'])
      ]),
    '  </nav>',
    '</div>',
    CHROME_END
  ].join(newline);
}

function renderSidebar`,
  'replace article chrome'
);

layout = replaceOnce(
  layout,
  /function renderSidebar\(localeKey, newline, relatedArticles = null\) \{[\s\S]*?\n\}\n\nfunction renderArticleLayout/,
  `function renderSidebar(localeKey, newline, relatedArticles = null) {
  const locale = LOCALES[localeKey];
  const labels = LOCALE_LAYOUT[localeKey];
  const sidebar = INTL_SIDEBAR[localeKey];
  const homeHref = '/' + localeKey + '/';
  const guidesHref = homeHref + 'articles/';
  const policyHref = homeHref + 'author/katakata.html';
  const articles = Array.isArray(relatedArticles)
    ? relatedArticles
    : (Array.isArray(locale.articles) ? locale.articles.slice(0, 4) : []);
  return [
    '<aside class="sidebar-column intl-article-sidebar" aria-label="' + escapeHtml(labels.sidebar) + '">',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🧮 ' + escapeHtml(locale.siteName) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <div class="sidebar-calc-banner">',
    '        <h4>' + escapeHtml(sidebar.calculatorHeading) + '</h4>',
    '        <p>' + escapeHtml(sidebar.calculatorBody) + '</p>',
    '        <a class="sidebar-calc-btn" href="' + homeHref + '">' + escapeHtml(sidebar.calculatorCta) + ' ➔</a>',
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🎯 ' + escapeHtml(sidebar.quickTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <div class="sidebar-rank-grid">',
    ...sidebar.quickLinks.map(([href, name, detail]) => '        <a class="sidebar-rank-link" href="' + escapeHtml(href) + '"><span class="sidebar-rank-name">' + escapeHtml(name) + '</span><span class="sidebar-rank-pt">' + escapeHtml(detail) + '</span></a>'),
    '      </div>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">📅 ' + escapeHtml(sidebar.checkTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    ...sidebar.checkItems.map(([tag, text]) => '      <div class="sidebar-event-item"><span class="sidebar-event-tag">' + escapeHtml(tag) + '</span><span>' + escapeHtml(text) + '</span></div>'),
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">💡 ' + escapeHtml(sidebar.tipTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><div class="sidebar-tip-box">' + escapeHtml(sidebar.tipBody) + '</div></div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">📁 ' + escapeHtml(sidebar.categoriesTitle) + '</h2>',
    '    <div class="sidebar-widget-body"><ul class="sidebar-category-list">',
    ...sidebar.categories.map(([label, anchor]) => '      <li><a href="' + guidesHref + '#' + escapeHtml(anchor) + '">' + escapeHtml(label) + '</a></li>'),
    '    </ul></div>',
    '  </section>',
    '  <section class="sidebar-widget">',
    '    <h2 class="sidebar-widget-title">🔥 ' + escapeHtml(locale.relatedTitle) + '</h2>',
    '    <div class="sidebar-widget-body">',
    '      <ul class="sidebar-article-list">',
    ...articles.map(([href, label]) => '        <li><a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a></li>'),
    '      </ul>',
    '    </div>',
    '  </section>',
    '  <section class="sidebar-widget intl-sidebar-policy">',
    '    <h2 class="sidebar-widget-title">✍️ ' + escapeHtml(labels.policy) + '</h2>',
    '    <div class="sidebar-widget-body"><a href="' + policyHref + '">' + escapeHtml(locale.policyLabel) + '</a></div>',
    '  </section>',
    '</aside>'
  ].join(newline);
}

function renderArticleLayout`,
  'replace sidebar'
);

layout = replaceOnce(
  layout,
  /function normalizeIntlArticleStylesheets\(html, newline, relativePath\) \{[\s\S]*?\n\}\n\nfunction synchronizeArticle/,
  `function normalizeIntlArticleStylesheets(html, newline, relativePath) {
  let next = html.replace(/\\s*<link\\b[^>]*href=["'][^"']*article-gift-card\\.css(?:\\?[^"']*)?["'][^>]*\\/?>\\s*/gi, newline);
  next = next.replace(/\\s*<link\\b[^>]*href=["'][^"']*(?:\\/en\\/articles\\/intl-article\\.css|\\/articles\\/intl-article\\.css)(?:\\?[^"']*)?["'][^>]*\\/?>\\s*/gi, newline);
  const shared = next.match(/<link\\b[^>]*href=["'][^"']*\\/articles\\/article-shared\\.css(?:\\?[^"']*)?["'][^>]*\\/?>/i);
  if (!shared) return next;
  return next.replace(shared[0], shared[0] + newline + '  <link rel="stylesheet" href="/articles/intl-article.css">');
}

function synchronizeArticle`,
  'neutralize intl css path'
);

layout = replaceOnce(
  layout,
  /function synchronizeArticle\(html, localeKey, relativePath, relatedArticles = null\) \{[\s\S]*?\n\}\n\nfunction synchronizeIntlArticleLayouts/,
  `function synchronizeArticle(html, localeKey, relativePath, relatedArticles = null) {
  const newline = html.includes('\\r\\n') ? '\\r\\n' : '\\n';
  const styledHtml = normalizeIntlArticleStylesheets(html, newline, relativePath);
  const localAuthorHref = '/' + localeKey + '/author/katakata.html';
  const localAuthorUrl = 'https://playpoint-sim.com' + localAuthorHref;
  const localizedHtml = styledHtml
    .replace(/href=(["'])(?:\\.\\.\\/|\\/)?author\\/katakata\\.html\\1/gi, 'href=$1' + localAuthorHref + '$1')
    .replace(/https:\\/\\/playpoint-sim\\.com\\/author\\/katakata\\.html/g, localAuthorUrl);
  const withoutChrome = localizedHtml.replace(markerPattern(CHROME_START, CHROME_END), newline);
  const unwrapped = unwrapGeneratedLayout(withoutChrome, relativePath);
  const title = extractArticleTitle(unwrapped, relativePath);
  const main = findMainBlock(unwrapped, relativePath);
  const mainHtml = unwrapped.slice(main.start, main.end);
  const chrome = renderArticleChrome(localeKey, title, newline, { section: inferIntlSection(relativePath) });
  const layout = renderArticleLayout(localeKey, mainHtml, newline, relatedArticles);
  const trailingHtml = unwrapped.slice(main.end).replace(/^\\s*/, '');
  return unwrapped.slice(0, main.start).replace(/\\s*$/, newline) + chrome + newline + layout
    + (trailingHtml ? newline + trailingHtml : '');
}

function synchronizeIntlArticleLayouts`,
  'localize author links and section navigation'
);

layout = replaceOnce(
  layout,
  /  renderArticleChrome,\n  renderSidebar,/,
  `  inferIntlSection,\n  renderArticleChrome,\n  renderSidebar,`,
  'export section inference'
);

write('scripts/intl-article-layout.cjs', layout);

let seo = read('scripts/intl-seo-pages.cjs');
seo = replaceOnce(
  seo,
  /const \{ INTL_LAYOUT_CSS, renderArticleChrome, renderSidebar \} = require\('\.\/intl-article-layout\.cjs'\);/,
  `const { INTL_LAYOUT_CSS, renderArticleChrome, renderSidebar } = require('./intl-article-layout.cjs');\nconst { getIntlAuthorPageFiles, getIntlAuthorSitemapEntries, writeIntlAuthorPages } = require('./intl-author-pages.cjs');`,
  'import localized author pages'
);
seo = seo.replace(/\/en\/articles\/intl-article\.css/g, '/articles/intl-article.css');
seo = replaceOnce(
  seo,
  /    \.\.\.Object\.keys\(LOCALES\)\.map\(localeKey => `\$\{localeKey\}\/articles\/index\.html`\),/,
  `    ...Object.keys(LOCALES).map(localeKey => \`${'${localeKey}'}/articles/index.html\`),\n    ...getIntlAuthorPageFiles(),`,
  'include localized author files'
);
seo = replaceOnce(
  seo,
  /  for \(const article of getPublishedIntlArticles\(\)\) \{\n    entries\.push\(\{ url: `https:\/\/playpoint-sim\.com\/\$\{article\.file\}`, lastmod: article\.modifiedAt \}\);\n  \}/,
  `  for (const article of getPublishedIntlArticles()) {\n    entries.push({ url: \`https://playpoint-sim.com/${'${article.file}'}\`, lastmod: article.modifiedAt });\n  }\n  entries.push(...getIntlAuthorSitemapEntries());`,
  'include author sitemap entries'
);
seo = replaceOnce(
  seo,
  /writeFile\(rootDir, 'en\/articles\/intl-article\.css', minifyCSS\(INTL_LAYOUT_CSS\)\);/,
  `writeFile(rootDir, 'articles/intl-article.css', minifyCSS(INTL_LAYOUT_CSS));`,
  'write neutral intl css'
);
seo = replaceOnce(
  seo,
  /  for \(const article of getPublishedIntlArticles\(\)\) \{\n    if \(article\.manual\) continue;\n    writeFile\(rootDir, article\.file, renderArticle\(article, assetVersions\)\);\n  \}/,
  `  for (const article of getPublishedIntlArticles()) {\n    if (article.manual) continue;\n    writeFile(rootDir, article.file, renderArticle(article, assetVersions));\n  }\n  writeIntlAuthorPages(rootDir, assetVersions, writeFile);`,
  'write localized author pages'
);
write('scripts/intl-seo-pages.cjs', seo);

let targets = read('scripts/build-targets.cjs');
targets = targets.replace("  'en/articles/intl-article.css',", "  'articles/intl-article.css',");
write('scripts/build-targets.cjs', targets);

let tests = read('tests/intl-article-layout.test.cjs');
tests = tests.replace(/path\.join\(root, 'en', 'articles', 'intl-article\.css'\)/g, "path.join(root, 'articles', 'intl-article.css')");
tests = replaceOnce(
  tests,
  /test\('international article CSS has one canonical writer', \(\) => \{/,
  `test('international article shell follows the Japanese navigation and sidebar rhythm in each language', () => {\n  for (const locale of locales) {\n    const html = fs.readFileSync(path.join(root, locale, 'articles', 'google-play-points-country-change.html'), 'utf8');\n    assert.match(html, /class="global-nav-inner"[\\s\\S]*?nav-item[\\s\\S]*?nav-item[\\s\\S]*?nav-item[\\s\\S]*?nav-item[\\s\\S]*?nav-item[\\s\\S]*?nav-item/, locale + ': six-part Japanese-style navigation');\n    assert.match(html, /sidebar-rank-grid/, locale + ': localized level and reward quick links');\n    assert.match(html, /sidebar-event-item/, locale + ': localized pre-purchase checks');\n    assert.match(html, /sidebar-tip-box/, locale + ': localized regional rule tip');\n    assert.match(html, /sidebar-category-list/, locale + ': category navigation');\n    assert.match(html, new RegExp('href="\\/' + locale + '\\/author\\/katakata\\.html"'), locale + ': localized editorial policy link');\n    assert.match(html, /href="\\/articles\\/intl-article\\.css(?:\?[^"']*)?"/, locale + ': neutral shared international stylesheet');\n    assert.doesNotMatch(html, /href="\\/en\\/articles\\/intl-article\\.css/, locale + ': must not depend on English directory for shared CSS');\n  }\n});\n\ntest('localized author pages share the international Japanese-style shell', () => {\n  for (const locale of locales) {\n    const file = path.join(root, locale, 'author', 'katakata.html');\n    assert.ok(fs.existsSync(file), locale + ': localized author page missing');\n    const html = fs.readFileSync(file, 'utf8');\n    assert.match(html, /class="layout-container intl-layout-container"/);\n    assert.match(html, /class="sidebar-column intl-article-sidebar"/);\n    assert.match(html, /hreflang="ja"/);\n    assert.match(html, new RegExp('canonical" href="https:\\/\\/playpoint-sim\\.com\\/' + locale + '\\/author\\/katakata\\.html"'));\n  }\n});\n\ntest('international article CSS has one canonical writer', () => {`,
  'add parity and localized policy tests'
);
write('tests/intl-article-layout.test.cjs', tests);

console.log('Applied international Japanese-layout polish patch.');
