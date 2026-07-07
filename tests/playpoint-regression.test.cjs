const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createOption(text, value) {
  return {
    text,
    value: String(value),
    dataset: {},
    disabled: false,
  };
}

function createSelect() {
  const select = {
    value: '',
    options: [],
    selectedIndex: 0,
    add(option) {
      this.options.push(option);
      if (!this.value) this.value = option.value;
    },
  };
  Object.defineProperty(select, 'innerHTML', {
    get() {
      return '';
    },
    set(value) {
      if (value === '') {
        this.options = [];
        this.selectedIndex = 0;
        this.value = '';
      }
    },
  });
  return select;
}

function createInput(value = '') {
  return {
    value: String(value),
    max: undefined,
    removeAttribute(name) {
      delete this[name];
    },
  };
}

function preprocessESM(code) {
  return code
    .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*'[^']+'\s*;/g, (match, imports) => {
      const names = imports.split(',').map(s => s.trim());
      const needed = names.filter(name => name === 'UI' || name === 'SHARE' || name === 'CALC' || name === 'DIARY');
      if (needed.length === 0) return '';
      if (needed.length === 1) {
        return `var ${needed[0]} = PP_APP.${needed[0]};`;
      }
      return `var { ${needed.join(', ')} } = PP_APP;`;
    })
    .replace(/^export\s+/gm, '');
}

function loadCalculatorContext(dateClass = Date) {
  const renderedResults = [];
  const context = {
    console,
    Option: createOption,
    Date: dateClass,
    displayResult(targetElement, content, isError = false) {
      targetElement.innerHTML = content;
      targetElement.isError = isError;
      targetElement.renderedContent = content;
      renderedResults.push({ targetElement, content, isError });
    },
    renderedResults,
  };
  context.window = context;
  context.__TEST_ENV__ = true;
  vm.createContext(context);
  const code = [
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8')),
    `
      PP_APP.UI = {
        displayResult
      };
    `,
    preprocessESM(fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8')),
    `
      globalThis.__pp = {
        PP_REGION_CONFIGS: PP_APP.CONFIGS,
        PP_STATE: PP_APP.STATE,
        populateStatusSelects: PP_APP.CALC.populateStatusSelects.bind(PP_APP.CALC),
        updateBaseRateAndTarget: PP_APP.CALC.updateBaseRateAndTarget.bind(PP_APP.CALC),
        getRemainingMonths: PP_APP.CALC.getRemainingMonths.bind(PP_APP.CALC),
        calculate: PP_APP.CALC.calculate.bind(PP_APP.CALC),
        reverseCalculate: PP_APP.CALC.reverseCalculate.bind(PP_APP.CALC),
        renderedResults
      };
    `,
  ].join('\n');
  vm.runInContext(code, context, { filename: 'calculator-bundle.js' });
  return context.__pp;
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('ステータス選択の初期値はブロンズになる', () => {
  const { PP_STATE, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();

  assert.strictEqual(PP_STATE.dom.currentStatus.value, '1');
  assert.strictEqual(PP_STATE.dom.reverseStatus.value, '1');
});

test('通常計算では現在ステータスから次のランクだけを目標にする', () => {
  const { PP_STATE, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 1);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'シルバー');
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '250');
});

test('月平均の分母は年末までの残日数から切り上げ月数で計算する', () => {
  const { getRemainingMonths } = loadCalculatorContext();

  assert.strictEqual(getRemainingMonths(new Date(2026, 0, 1)), 12);
  assert.strictEqual(getRemainingMonths(new Date(2026, 4, 31)), 8);
  assert.strictEqual(getRemainingMonths(new Date(2026, 11, 31)), 0);
});

test('12月31日でも通常計算は合計必要額を表示する', () => {
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) return new Date(2026, 11, 31);
      return new Date(...args);
    }
  }
  FakeDate.UTC = Date.UTC;
  FakeDate.parse = Date.parse;
  FakeDate.now = () => new Date(2026, 11, 31).getTime();

  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext(FakeDate);
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('250');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('data-value="25000"'));
  assert.ok(!renderedResults[0].content.includes('/月'));
});

test('通常計算の結果は週平均と1日あたりの目安も表示する', () => {
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) return new Date(2026, 0, 1);
      return new Date(...args);
    }
  }
  FakeDate.UTC = Date.UTC;
  FakeDate.parse = Date.parse;
  FakeDate.now = () => new Date(2026, 0, 1).getTime();

  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext(FakeDate);
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('250');
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  updateBaseRateAndTarget();
  calculate();

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(renderedResults[0].content.includes('週平均目安'));
  assert.ok(renderedResults[0].content.includes('1日あたり目安'));
  assert.ok(renderedResults[0].content.includes('年末までの残り日数'));
  assert.ok(renderedResults[0].content.includes('data-value="472"'));
  assert.ok(renderedResults[0].content.includes('data-value="69"'));
  assert.ok(renderedResults[0].content.includes('data-value="365"'));
});

test('通常計算の結果は条件別関連記事を最大4件だけ結果の後に表示する', () => {
  const { PP_STATE, populateStatusSelects, updateBaseRateAndTarget, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput('3000');
  PP_STATE.dom.multiplier = createInput('3');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };

  populateStatusSelects();
  PP_STATE.dom.currentStatus.value = '1.75';
  updateBaseRateAndTarget();
  PP_STATE.dom.targetStatus.selectedIndex = 1;
  calculate();

  const content = renderedResults[0].content;
  const links = [...content.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);

  assert.strictEqual(renderedResults[0].isError, false);
  assert.ok(content.indexOf('関連記事') > content.indexOf('合計の必要課金額目安'));
  assert.ok(content.includes('result-related-links'));
  assert.ok(links.length > 0 && links.length <= 4);
  assert.ok(links.includes('articles/2025-12-25-campaign.html'));
  assert.ok(links.includes('articles/2025-12-25-diamond-worth-it.html'));
  links.forEach((href) => {
    assert.ok(fs.existsSync(path.join(root, href)), `関連記事リンクが存在しません: ${href}`);
  });
});

test('共有ボタンは結果アクション行にまとめて表示状態を切り替える', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  assert.ok(html.includes('id="result-actions"'));
  assert.ok(html.includes('class="result-actions hidden"'));
  assert.ok(html.indexOf('id="result-actions"') > html.indexOf('id="result"'));
  assert.ok(html.indexOf('id="copyButton"') > html.indexOf('id="result-actions"'));
  assert.ok(html.indexOf('id="tweetButton"') > html.indexOf('id="result-actions"'));
  assert.ok(main.includes("'result-actions'"));
  assert.ok(ui.includes('STATE.dom.resultActions'));
  assert.ok(css.includes('.result-actions'));
  assert.ok(!html.includes('line.me/R/share'));
  assert.ok(!html.includes('id="lineButton"'));
});

test('検索意図別LPは条件付き計算リンクとSEO基本タグを持つ', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const shareScript = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');
  const parseJsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const pages = [
    {
      file: path.join(root, 'status', 'diamond', 'index.html'),
      canonical: 'https://playpoint-sim.com/status/diamond/',
      mode: 'main',
      requiredQuery: 'target=diamond'
    },
    {
      file: path.join(root, 'status', 'platinum', 'index.html'),
      canonical: 'https://playpoint-sim.com/status/platinum/',
      mode: 'main',
      requiredQuery: 'target=platinum'
    },
    {
      file: path.join(root, 'maintenance', 'platinum', 'index.html'),
      canonical: 'https://playpoint-sim.com/maintenance/platinum/',
      mode: 'main',
      requiredQuery: 'target=platinum'
    },
    {
      file: path.join(root, 'maintenance', 'diamond', 'index.html'),
      canonical: 'https://playpoint-sim.com/maintenance/diamond/',
      mode: 'main',
      requiredQuery: 'target=diamond'
    },
    {
      file: path.join(root, 'campaign', '2x', 'index.html'),
      canonical: 'https://playpoint-sim.com/campaign/2x/',
      mode: 'main',
      requiredQuery: 'multiplier=2'
    },
    {
      file: path.join(root, 'campaign', '3x', 'index.html'),
      canonical: 'https://playpoint-sim.com/campaign/3x/',
      mode: 'main',
      requiredQuery: 'multiplier=3'
    },
    {
      file: path.join(root, 'amount', '10000', 'index.html'),
      canonical: 'https://playpoint-sim.com/amount/10000/',
      mode: 'reverse',
      requiredQuery: 'amount=10000'
    }
  ];

  assert.ok(shareScript.includes("params.get('target')"));
  assert.ok(shareScript.includes('setTargetFromParam'));

  pages.forEach(({ file, canonical, mode, requiredQuery }) => {
    assert.ok(fs.existsSync(file), `${path.relative(root, file)} がありません`);
    const html = fs.readFileSync(file, 'utf8');
    const schemas = parseJsonLd(html);
    const h2Count = (html.match(/<h2>/g) || []).length;

    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${canonical} のcanonicalがありません`);
    assert.ok(html.includes('<meta name="description" content="'), `${canonical} のdescriptionがありません`);
    assert.ok(html.includes('<meta name="robots" content="index,follow">'), `${canonical} のrobotsがありません`);
    assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`), `${canonical} のog:urlがありません`);
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), `${canonical} のTwitterカードがありません`);
    assert.ok(schemas.some(data => data['@type'] === 'WebPage'), `${canonical} のWebPage構造化データがありません`);
    assert.ok(schemas.some(data => data['@type'] === 'BreadcrumbList'), `${canonical} のパンくず構造化データがありません`);
    assert.ok(schemas.some(data => data['@type'] === 'FAQPage'), `${canonical} のFAQ構造化データがありません`);
    assert.ok(html.includes(`href="/?mode=${mode}`), `${canonical} から計算機への導線がありません`);
    assert.ok(html.includes(requiredQuery), `${canonical} の条件付き計算パラメータがありません`);
    assert.ok(html.includes('utm_source=lp'), `${canonical} の内部流入識別がありません`);
    assert.ok(html.includes('計算機に入れる条件'), `${canonical} の入力条件説明がありません`);
    assert.ok(html.includes('/author/katakata.html'), `${canonical} の運営者導線がありません`);
    assert.ok(/class="[^"]*\blp-faq\b[^"]*"/.test(html), `${canonical} のFAQ表示がありません`);
    assert.ok(h2Count >= 4, `${canonical} の本文セクションが薄すぎます`);
    assert.ok(html.length >= 5000, `${canonical} の本文量が薄すぎます`);
    const localLinks = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)]
      .map(match => match[1]);
    localLinks.forEach((href) => {
      let relativePath = href.replace(/^\//, '');
      if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${canonical} のリンク先が存在しません: ${href}`);
    });
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${canonical} がsitemap.xmlにありません`);
  });
});

test('ブログRSSとAtomフィードは発見可能で最新記事を含む', () => {
  const rssPath = path.join(root, 'feed.xml');
  const atomPath = path.join(root, 'atom.xml');
  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sitemapHtml = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));

  assert.ok(fs.existsSync(rssPath), 'feed.xml がありません');
  assert.ok(fs.existsSync(atomPath), 'atom.xml がありません');

  const rss = fs.readFileSync(rssPath, 'utf8');
  const atom = fs.readFileSync(atomPath, 'utf8');

  assert.ok(rss.includes('<rss version="2.0"'), 'RSSのルート要素がありません');
  assert.ok(rss.includes('<channel>'), 'RSS channel がありません');
  assert.ok(rss.includes('<item>'), 'RSS item がありません');
  assert.ok(rss.includes('https://playpoint-sim.com/articles/2026-06-20-discount-gift-cards.html'), 'RSSに最新記事がありません');
  assert.ok(atom.includes('<feed xmlns="http://www.w3.org/2005/Atom">'), 'Atom feed ルートがありません');
  assert.ok(atom.includes('<entry>'), 'Atom entry がありません');
  assert.ok(atom.includes('href="https://playpoint-sim.com/articles/2026-06-20-discount-gift-cards.html"'), 'Atomに最新記事がありません');
  for (const article of articles) {
    const absoluteUrl = `https://playpoint-sim.com/${article.file.replace(/^\.\.\//, '')}`;
    assert.ok(rss.includes(absoluteUrl), `RSSに記事がありません: ${absoluteUrl}`);
    assert.ok(atom.includes(absoluteUrl), `Atomに記事がありません: ${absoluteUrl}`);
  }

  for (const html of [blogHtml, indexHtml]) {
    assert.ok(html.includes('rel="alternate" type="application/rss+xml"'), 'RSS alternate link がありません');
    assert.ok(html.includes('rel="alternate" type="application/atom+xml"'), 'Atom alternate link がありません');
  }
  assert.ok(sitemapHtml.includes('feed.xml'), 'HTMLサイトマップにRSS導線がありません');
  assert.ok(sitemapHtml.includes('atom.xml'), 'HTMLサイトマップにAtom導線がありません');
});

test('新規ツール（サブスク健康診断、楽天ポイント上限シミュレーター、統合ダッシュボード）の実存とサイトマップ導線', () => {
  const subHealthPath = path.join(root, 'tools', 'sub-health', 'index.html');
  const rakutenSimPath = path.join(root, 'tools', 'rakuten-sim', 'index.html');
  const dashboardPath = path.join(root, 'tools', 'dashboard', 'index.html');
  const sitemapHtml = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');

  assert.ok(fs.existsSync(subHealthPath), 'sub-health/index.html がありません');
  assert.ok(fs.existsSync(rakutenSimPath), 'rakuten-sim/index.html がありません');
  assert.ok(fs.existsSync(dashboardPath), 'dashboard/index.html がありません');

  const subHealthHtml = fs.readFileSync(subHealthPath, 'utf8');
  const rakutenSimHtml = fs.readFileSync(rakutenSimPath, 'utf8');
  const dashboardHtml = fs.readFileSync(dashboardPath, 'utf8');

  assert.ok(subHealthHtml.includes('<title>サブスク健康診断シミュレーター'), 'サブスク健康診断のタイトルが不正です');
  assert.ok(subHealthHtml.includes('Noto Sans JP'), 'サブスク健康診断のフォント設定に Noto Sans JP がありません');
  assert.ok(rakutenSimHtml.includes('<title>楽天お買い物マラソン ポイント上限シミュレーター'), '楽天シミュレーターのタイトルが不正です');
  assert.ok(rakutenSimHtml.includes('Noto Sans JP'), '楽天シミュレーターのフォント設定に Noto Sans JP がありません');
  assert.ok(dashboardHtml.includes('<title>統合オトクダッシュボード'), '統合ダッシュボードのタイトルが不正です');
  assert.ok(dashboardHtml.includes('Noto Sans JP'), '統合ダッシュボードのフォント設定に Noto Sans JP がありません');

  assert.ok(sitemapHtml.includes('tools/sub-health/index.html'), 'サイトマップにサブスク健康診断のリンクがありません');
  assert.ok(sitemapHtml.includes('tools/rakuten-sim/index.html'), 'サイトマップに楽天シミュレーターのリンクがありません');
  assert.ok(sitemapHtml.includes('tools/dashboard/index.html'), 'サイトマップに統合ダッシュボードのリンクがありません');
});

test('ブログフィード生成は単体でURL正規化・日付順・XMLエスケープを行う', () => {
  const { buildBlogFeeds } = require(path.join(root, 'scripts', 'blog-feeds.cjs'));
  const feeds = buildBlogFeeds([
    {
      file: '../articles/older.html',
      title: '古い記事',
      date: '2026-01-01',
      description: 'old'
    },
    {
      file: '../articles/newer.html',
      title: '新しい & <記事>',
      date: '2026-02-01',
      description: '"説明" と \'引用\''
    },
    {
      file: '',
      title: '除外',
      date: '2026-03-01'
    }
  ]);

  assert.ok(feeds, 'フィードが生成されていません');
  assert.strictEqual(feeds.articleCount, 2);
  assert.ok(feeds.rss.indexOf('https://playpoint-sim.com/articles/newer.html') < feeds.rss.indexOf('https://playpoint-sim.com/articles/older.html'));
  assert.ok(feeds.atom.indexOf('https://playpoint-sim.com/articles/newer.html') < feeds.atom.indexOf('https://playpoint-sim.com/articles/older.html'));
  assert.ok(feeds.rss.includes('新しい &amp; &lt;記事&gt;'));
  assert.ok(feeds.atom.includes('&quot;説明&quot; と &apos;引用&apos;'));
});

test('HTML同期はアセットバージョンと日付表記を単体で更新する', () => {
  const { syncHtmlFile } = require(path.join(root, 'scripts', 'html-sync.cjs'));
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-html-sync-'));
  const file = 'sample.html';
  const filePath = path.join(tempRoot, file);

  try {
    fs.writeFileSync(filePath, [
      '<meta name="last-modified" content="2025-01-01">',
      '<meta property="article:modified_time" content="2025-01-01T00:00:00+09:00">',
      '<script>{"dateModified": "2025-01-01"}</script>',
      '<link href="style.css?v=old">',
      '<script src="third-party.js?v=old"></script>',
      '<script src="intent-tracking.js?v=old"></script>',
      '<link href="article-shared.css?v=old">',
      '<p>最終更新: 2025-01-01</p>',
      '<p>Last Modified: 2025-01-01</p>',
      '<p>最後更新: 2025-01-01</p>'
    ].join('\n'), 'utf8');

    const updated = syncHtmlFile(tempRoot, file, {
      articleSharedCssVersion: 'article-v',
      cssVersion: 'css-v',
      intentTrackingVersion: 'intent-v',
      thirdPartyVersion: 'third-v'
    }, '2026-06-28');

    const html = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(updated, true);
    assert.ok(html.includes('style.css?v=css-v'));
    assert.ok(html.includes('third-party.js?v=third-v'));
    assert.ok(html.includes('intent-tracking.js?v=intent-v'));
    assert.ok(html.includes('article-shared.css?v=article-v'));
    assert.ok(html.includes('<meta name="last-modified" content="2026-06-28">'));
    assert.ok(html.includes('<meta property="article:modified_time" content="2026-06-28T00:00:00+09:00">'));
    assert.ok(html.includes('"dateModified": "2026-06-28"'));
    assert.ok(html.includes('最終更新: 2026-06-28'));
    assert.ok(html.includes('Last Modified: 2026-06-28'));
    assert.ok(html.includes('最後更新: 2026-06-28'));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('HTML置換ヘルパーは日付メタデータと指定アセットだけを更新する', () => {
  const { replaceAssetVersion, replaceDateMetadata } = require(path.join(root, 'scripts', 'html-replacements.cjs'));
  const html = [
    '<meta name="last-modified" content="2025-01-01">',
    '<meta property="article:modified_time" content="2025-01-01T00:00:00+09:00">',
    '<script>{"dateModified": "2025-01-01"}</script>',
    '<link href="style.css?v=old">',
    '<script src="third-party.js?v=old"></script>',
    '<p>最終更新: 2025-01-01</p>',
    '<p>Last Modified: 2025-01-01</p>',
    '<p>最後更新: 2025-01-01</p>'
  ].join('\n');

  const dated = replaceDateMetadata(html, '2026-06-28', {
    includeEnglish: true,
    includeTraditionalChinese: true
  });
  const versioned = replaceAssetVersion(dated, 'style.css', 'next-v');

  assert.ok(versioned.includes('<meta name="last-modified" content="2026-06-28">'));
  assert.ok(versioned.includes('<meta property="article:modified_time" content="2026-06-28T00:00:00+09:00">'));
  assert.ok(versioned.includes('"dateModified": "2026-06-28"'));
  assert.ok(versioned.includes('最終更新: 2026-06-28'));
  assert.ok(versioned.includes('Last Modified: 2026-06-28'));
  assert.ok(versioned.includes('最後更新: 2026-06-28'));
  assert.ok(versioned.includes('style.css?v=next-v'));
  assert.ok(versioned.includes('third-party.js?v=old'));
});

test('Service Workerアセット同期は定義済みパスをバージョンキーで更新する', () => {
  const { ROOT_SERVICE_WORKER_ASSETS, syncServiceWorkerAssetVersions } = require(path.join(root, 'scripts', 'asset-sync.cjs'));
  const swContent = [
    "'./style.css?v=old'",
    "'./js/consent.js?v=old'",
    "'./js/third-party.js?v=old'",
    "'./js/intent-tracking.js?v=old'",
    "'./blog/style.css?v=old'",
    "'./blog/script.js?v=old'",
    "'./blog/components.js?v=old'",
    "'./blog/article.js?v=old'",
    "'./articles/article-shared.css?v=old'",
    "'./js/main.js?v=old'"
  ].join('\n');

  const updated = syncServiceWorkerAssetVersions(swContent, {
    articleScriptVersion: 'article-script-v',
    articleSharedCssVersion: 'article-v',
    blogComponentsVersion: 'blog-components-v',
    blogCssVersion: 'blog-css-v',
    blogScriptVersion: 'blog-script-v',
    consentVersion: 'consent-v',
    cssVersion: 'css-v',
    intentTrackingVersion: 'intent-v',
    mainVersion: 'main-v',
    thirdPartyVersion: 'third-v'
  });

  assert.strictEqual(ROOT_SERVICE_WORKER_ASSETS.length, 10);
  for (const expected of [
    './style.css?v=css-v',
    './js/consent.js?v=consent-v',
    './js/third-party.js?v=third-v',
    './js/intent-tracking.js?v=intent-v',
    './blog/style.css?v=blog-css-v',
    './blog/script.js?v=blog-script-v',
    './blog/components.js?v=blog-components-v',
    './blog/article.js?v=article-script-v',
    './articles/article-shared.css?v=article-v',
    './js/main.js?v=main-v'
  ]) {
    assert.ok(updated.includes(expected), `${expected} was not synchronized`);
  }
});

test('トップページの更新メタデータ同期は日付と主要アセットだけを更新する', () => {
  const { createBuildMetadata, syncIndexMetadataContent } = require(path.join(root, 'scripts', 'build-metadata.cjs'));
  const metadata = createBuildMetadata(
    {
      PLAYPOINT_MODIFIED_DATE: '2026-06-28',
      PLAYPOINT_ASSET_VERSION: 'fixed_version'
    },
    new Date('2026-01-01T00:00:00Z')
  );
  const html = [
    '<meta name="last-modified" content="2025-01-01">',
    '<meta property="article:modified_time" content="2025-01-01T00:00:00+09:00">',
    '<script>{"dateModified": "2025-01-01"}</script>',
    '<link href="style.css?v=old">',
    '<script src="js/main.js?v=old"></script>',
    '<script src="js/third-party.js?v=old"></script>',
    '<script src="blog/components.js?v=old"></script>',
    '<p>最終更新: 2025-01-01</p>'
  ].join('\n');

  const updated = syncIndexMetadataContent(html, metadata.todayStr, metadata.assetVersion);

  assert.strictEqual(metadata.todayStr, '2026-06-28');
  assert.strictEqual(metadata.assetVersion, 'fixed_version');
  assert.ok(updated.includes('<meta name="last-modified" content="2026-06-28">'));
  assert.ok(updated.includes('<meta property="article:modified_time" content="2026-06-28T00:00:00+09:00">'));
  assert.ok(updated.includes('"dateModified": "2026-06-28"'));
  assert.ok(updated.includes('style.css?v=fixed_versiona'));
  assert.ok(updated.includes('js/main.js?v=fixed_versiona'));
  assert.ok(updated.includes('js/third-party.js?v=fixed_versiona'));
  assert.ok(updated.includes('blog/components.js?v=fixed_versiona'));
  assert.ok(updated.includes('最終更新: 2026-06-28'));
});

test('多言語生成設定は更新日を受け取って各言語のメタ行を作る', () => {
  const { createLocales } = require(path.join(root, 'scripts', 'locale-config.cjs'));
  const locales = createLocales('2026-06-28');

  assert.deepStrictEqual(Object.keys(locales), ['en', 'ko', 'tw']);
  assert.strictEqual(locales.en.langCode, 'en');
  assert.strictEqual(locales.ko.langCode, 'ko');
  assert.strictEqual(locales.tw.langCode, 'zh-TW');
  assert.ok(locales.en.metaLine.includes('Last Updated: 2026-06-28'));
  assert.ok(locales.ko.metaLine.includes('최종 업데이트: 2026-06-28'));
  assert.ok(locales.tw.metaLine.includes('最後更新: 2026-06-28'));
});

test('多言語HTML生成は言語別メタ情報と相対パスを同期する', () => {
  const { buildLocalizedHtml } = require(path.join(root, 'scripts', 'language-page-builder.cjs'));
  const { createLocales } = require(path.join(root, 'scripts', 'locale-config.cjs'));
  const html = [
    '<html lang="ja">',
    '<head>',
    '<title>旧タイトル</title>',
    '<meta name="author" content="かたかた">',
    '<meta name="description" content="旧説明">',
    '<meta property="og:title" content="旧OG">',
    '<meta property="og:description" content="旧OG説明">',
    '<meta name="twitter:title" content="旧Twitter">',
    '<meta name="twitter:description" content="旧Twitter説明">',
    '<meta property="og:site_name" content="旧サイト">',
    '<meta property="og:url" content="https://playpoint-sim.com/">',
    '<link rel="canonical" href="https://playpoint-sim.com/">',
    '<link href="style.css?v=old">',
    '<script src="js/main.js?v=old"></script>',
    '<script>{"name": "Playポイント計算機", "description": "旧アプリ説明", "priceCurrency": "JPY", "url": "https://playpoint-sim.com/", "inLanguage": ["ja"]}</script>',
    '</head>',
    '<body>',
    '<button data-region="JP" class="active">日本語</button><button data-region="US">English</button>',
    '<h1 data-lang-key="mainTitle">旧見出し</h1>',
    '<p data-lang-key="siteDescription">旧説明文</p>',
    '<!-- FAQ_JSON_LD_START -->old<!-- FAQ_JSON_LD_END -->',
    '<!-- FAQ_SECTION_START -->old<!-- FAQ_SECTION_END -->',
    '<!-- ARTICLE_DRAWER_START -->remove me<!-- ARTICLE_DRAWER_END -->',
    '<!-- DESCRIPTION_SECTION_START -->old<!-- DESCRIPTION_SECTION_END -->',
    '<!-- META_LINE_START -->old<!-- META_LINE_END -->',
    '</body></html>'
  ].join('\n');

  const output = buildLocalizedHtml(html, 'en', createLocales('2026-06-28').en);

  assert.ok(output.includes('<html lang="en">'));
  assert.ok(output.includes('<title>Play Point Calculator - Google Play Points | How much to level up?</title>'));
  assert.ok(output.includes('<meta name="author" content="katakata">'));
  assert.ok(output.includes('<meta property="og:url" content="https://playpoint-sim.com/en/">'));
  assert.ok(output.includes('<link rel="canonical" href="https://playpoint-sim.com/en/">'));
  assert.ok(output.includes('href="../style.css?v=old"'));
  assert.ok(output.includes('src="../js/main.js?v=old"'));
  assert.ok(output.includes('<button data-region="US" class="active">English</button>'));
  assert.ok(output.includes('<h1 data-lang-key="mainTitle">Play Points Calculator</h1>'));
  assert.ok(output.includes('Last Updated: 2026-06-28'));
  assert.ok(!output.includes('remove me'));
});

test('ダイヤモンド維持LPは最高ランク維持用の条件と文脈に絞る', () => {
  const html = fs.readFileSync(path.join(root, 'maintenance', 'diamond', 'index.html'), 'utf8');

  assert.ok(html.includes('status=2'), '現在ステータスがダイヤモンドになっていません');
  assert.ok(html.includes('target=diamond'), '目標ステータスがダイヤモンドになっていません');
  assert.ok(html.includes('points=15000'), 'ダイヤモンド維持の初期不足ポイントが15000になっていません');
  assert.ok(html.includes('ダイヤモンドの体験価値'), 'ダイヤモンド文脈の記事導線がありません');
  assert.ok(!html.includes('ランク維持期間 of ルール'), '不自然な混入文言があります');
  assert.ok(!html.includes('初期値は4000ポイント'), 'プラチナ維持由来の初期値が混入しています');
});

test('キャンペーン/金額LPは日本向けの要約・比較・注意表示を持つ', () => {
  const pages = [
    path.join(root, 'campaign', '2x', 'index.html'),
    path.join(root, 'campaign', '3x', 'index.html'),
    path.join(root, 'amount', '10000', 'index.html')
  ];

  pages.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);

    assert.ok(html.includes('class="lp-trust-line"'), `${relative} の更新日/運営者表示がありません`);
    assert.ok(html.includes('class="lp-hero-panel"'), `${relative} のファーストビュー要約枠がありません`);
    assert.ok(html.includes('class="lp-jp-summary"'), `${relative} の要約ボックスがありません`);
    assert.ok(html.includes('class="lp-comparison-table"'), `${relative} の比較表がありません`);
    assert.ok(html.includes('class="lp-warning-box"'), `${relative} の注意枠がありません`);
    assert.ok(html.includes('class="lp-mid-cta"'), `${relative} の中間CTAがありません`);
  });
});

test('ステータス選択の再生成でoptionが重複しない', () => {
  const { PP_STATE, populateStatusSelects } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.reverseStatus = createSelect();

  populateStatusSelects();
  populateStatusSelects();

  assert.strictEqual(PP_STATE.dom.currentStatus.options.length, 5);
  assert.strictEqual(PP_STATE.dom.reverseStatus.options.length, 5);
});

test('XMLサイトマップに公開記事がすべて含まれている', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(articleFiles.length > 0);
  for (const file of articleFiles) {
    assert.ok(
      sitemap.includes(`https://playpoint-sim.com/articles/${file}`),
      `${file} is missing from sitemap.xml`
    );
  }
});

test('トップページは同一URLの英語hreflangを出さない', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.ok(!html.includes('hreflang="en" href="https://playpoint-sim.com/"'));
});

test('第三者スクリプトは初回操作待ちではなく初期描画後に読み込む', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'third-party.js'), 'utf8');

  assert.ok(script.includes('DOMContentLoaded'));
  assert.ok(!script.includes("window.addEventListener('pointerdown'"));
  assert.ok(!script.includes("window.addEventListener('keydown'"));
  assert.ok(!script.includes("window.addEventListener('touchstart'"));
});

test('デプロイ前に回帰テストを実行する', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.ok(workflow.includes('node tests/playpoint-regression.test.cjs'));
});

test('デプロイ同期は削除済みファイルを本番からも消す', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.ok(workflow.includes('rsync -avz --delete'));
});

test('テストファイルは本番へ同期しない', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'deploy.yml'), 'utf8');

  assert.ok(workflow.includes("--exclude 'tests*'"));
});

test('SEO監視はサイトマップ掲載記事も確認する', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'seo-healthcheck.yml'), 'utf8');
  const script = fs.readFileSync(path.join(root, '.github', 'scripts', 'seo-health-check.cjs'), 'utf8');

  assert.ok(workflow.includes('node .github/scripts/seo-health-check.cjs'));
  assert.ok(script.includes('articleUrls'));
  assert.ok(script.includes('data-ad-client'));
  for (const pathValue of [
    '/campaign/2x/',
    '/campaign/3x/',
    '/amount/10000/',
    '/maintenance/diamond/'
  ]) {
    assert.ok(script.includes(pathValue), `SEO監視対象が不足しています: ${pathValue}`);
  }
});

test('公開canonical URLはXMLサイトマップに含める', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const htmlFiles = [
    ...fs.readdirSync(root).filter(file => file.endsWith('.html')).map(file => path.join(root, file)),
    path.join(root, 'kids-smile-land', 'index.html'),
    path.join(root, 'tools', 'gravity-todo', 'index.html')
  ];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('name="robots" content="noindex')) continue;

    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
    if (!canonicalMatch || !canonicalMatch[1].startsWith('https://playpoint-sim.com/')) continue;

    assert.ok(
      sitemap.includes(`<loc>${canonicalMatch[1]}</loc>`),
      `${path.relative(root, file)} canonical is missing from sitemap.xml`
    );
  }
});

test('blog robots.txtは本番ドメインのサイトマップを指す', () => {
  const robots = fs.readFileSync(path.join(root, 'blog', 'robots.txt'), 'utf8');

  assert.ok(robots.includes('Sitemap: https://playpoint-sim.com/blog/sitemap.xml'));
  assert.ok(!robots.includes('katakatalab.example.com'));
});

test('kids-smile-landのサービスワーカーはGETかつ同一オリジンだけをキャッシュ更新する', () => {
  const serviceWorker = fs.readFileSync(path.join(root, 'kids-smile-land', 'service-worker.js'), 'utf8');

  assert.ok(serviceWorker.includes("event.request.method !== 'GET'"));
  assert.ok(serviceWorker.includes('requestUrl.origin !== self.location.origin'));
});

test('ブログ一覧は記事JSONを正規化してから描画する', () => {
  const script = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');

  assert.ok(script.includes('normalizeArticle'));
  assert.ok(script.includes('Array.isArray(article.tags)'));
  assert.ok(script.includes('BlogUtils.escapeHtml(article.thumbnail)'));
  assert.ok(script.includes('BlogUtils.escapeHtml(article.file)'));
});

test('ブログ一覧の記事リンクとサムネイルは許可した相対パスだけを使う', () => {
  const script = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');

  assert.ok(script.includes('sanitizeArticleFile'));
  assert.ok(script.includes('sanitizeArticleThumbnail'));
  assert.ok(script.includes("value.startsWith('../articles/')"));
  assert.ok(script.includes("value.startsWith('../articles/ogp/')"));
});

test('記事ページの関連記事も記事JSONを正規化してから描画する', () => {
  const script = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');

  assert.ok(script.includes('normalizeArticle'));
  assert.ok(script.includes('sanitizeArticleFile'));
  assert.ok(script.includes('sanitizeArticleThumbnail'));
  assert.ok(!script.includes('onerror='));
});

test('CSPのscript-srcはhttps全体を許可しない', () => {
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  const scriptSrcMatch = htaccess.match(/script-src\s+([^;"]+)/);

  assert.ok(scriptSrcMatch);
  assert.ok(!scriptSrcMatch[1].split(/\s+/).includes('https:'));
  assert.ok(htaccess.includes('https://*.googlesyndication.com'));
  assert.ok(htaccess.includes('https://cdnjs.cloudflare.com'));
});

test('静的配信設定はフィードとローカルフォントを効率よく配信する', () => {
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');

  assert.ok(htaccess.includes('application/rss+xml'), 'RSSが圧縮対象に入っていません');
  assert.ok(htaccess.includes('application/atom+xml'), 'Atomが圧縮対象に入っていません');
  assert.ok(htaccess.includes('application/manifest+json'), 'manifestが圧縮対象に入っていません');
  assert.ok(htaccess.includes('ExpiresByType application/rss+xml "access plus 30 minutes"'), 'RSSのキャッシュ期限が明示されていません');
  assert.ok(htaccess.includes('ExpiresByType application/atom+xml "access plus 30 minutes"'), 'Atomのキャッシュ期限が明示されていません');
  assert.ok(htaccess.includes('ExpiresByType application/manifest+json "access plus 1 day"'), 'manifestのキャッシュ期限が明示されていません');
  assert.ok(htaccess.includes('ExpiresByType image/webp "access plus 30 days"'), 'WebP画像がキャッシュ対象ではありません');
  assert.ok(htaccess.includes('ExpiresByType image/avif "access plus 30 days"'), 'AVIF画像がキャッシュ対象ではありません');
  assert.ok(htaccess.includes('ExpiresByType font/woff2 "access plus 1 year"'), 'ローカルwoff2フォントが長期キャッシュ対象ではありません');
  assert.ok(htaccess.includes('<Files "feed.xml">'), 'RSSのファイル単位設定がありません');
  assert.ok(htaccess.includes('ForceType application/rss+xml'), 'RSSのContent-Typeを明示していません');
  assert.ok(htaccess.includes('Header set Cache-Control "public, max-age=1800"'), 'RSS/AtomのCache-Controlが明示されていません');
  assert.ok(htaccess.includes('<Files "atom.xml">'), 'Atomのファイル単位設定がありません');
  assert.ok(htaccess.includes('ForceType application/atom+xml'), 'AtomのContent-Typeを明示していません');
  assert.ok(htaccess.includes('<Files "manifest.json">'), 'manifestのファイル単位設定がありません');
  assert.ok(htaccess.includes('ForceType application/manifest+json'), 'manifestのContent-Typeを明示していません');
  assert.ok(htaccess.includes('Header set Cache-Control "public, max-age=86400"'), 'manifestのCache-Controlが明示されていません');
});

test('Gravity Todoのサービスワーカーは外部オリジンをキャッシュしない', () => {
  const serviceWorker = fs.readFileSync(path.join(root, 'tools', 'gravity-todo', 'sw.js'), 'utf8');

  assert.ok(serviceWorker.includes('requestUrl.origin !== self.location.origin'));
  assert.ok(!serviceWorker.includes('RUNTIME_CACHE'));
});

test('target blankリンクにはnoopener noreferrerを付ける', () => {
  const htmlFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(root, 'articles', file));

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const matches = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];

    for (const anchor of matches) {
      assert.ok(
        /rel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b[^"]*"/.test(anchor),
        `${path.relative(root, file)} has unsafe target blank link: ${anchor}`
      );
    }
  }
});

test('blogの再読み込みボタンはインラインonclickを使わない', () => {
  const blogIndex = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const blogScript = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');

  assert.ok(!blogIndex.includes('onclick="location.reload()"'));
  assert.ok(!blogScript.includes('onclick="location.reload()"'));
  assert.ok(blogScript.includes("addEventListener('click'"));
});

test('Kids Smile LandはlocalStorage設定値を許可値と範囲で復元する', () => {
  const app = fs.readFileSync(path.join(root, 'kids-smile-land', 'app.js'), 'utf8');

  assert.ok(app.includes('readStoredOption'));
  assert.ok(app.includes('readStoredNumber'));
  assert.ok(app.includes('readStoredText'));
  assert.ok(app.includes("['easy', 'normal', 'hard']"));
  assert.ok(app.includes('[0, 5, 15, 30, 45]'));
});

test('blog articles.jsonは公開記事HTMLをすべて含む', () => {
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));
  const jsonFiles = articles.map(article => path.basename(article.file || ''));
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    assert.ok(jsonFiles.includes(file), `${file} is missing from blog/articles.json`);
  }
});

test('blog sitemapは公開記事HTMLをすべて含む', () => {
  const sitemap = fs.readFileSync(path.join(root, 'blog', 'sitemap.xml'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    assert.ok(
      sitemap.includes(`https://playpoint-sim.com/articles/${file}`),
      `${file} is missing from blog/sitemap.xml`
    );
  }
});

test('blogと記事ページのローカルリンクは存在するファイルだけを指す', () => {
  const htmlFiles = [
    path.join(root, 'blog', 'index.html'),
    ...fs.readdirSync(path.join(root, 'articles'))
      .filter(file => file.endsWith('.html'))
      .map(file => path.join(root, 'articles', file))
  ];

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
      .map(match => match[1])
      .filter(value => !/^(https?:|#|mailto:|data:|\/)/.test(value));

    for (const ref of refs) {
      const localPath = ref.split('#')[0].split('?')[0];
      if (!localPath) continue;
      const target = path.normalize(path.join(path.dirname(file), localPath));
      assert.ok(fs.existsSync(target), `${path.relative(root, file)} has broken local link: ${ref}`);
    }
  }
});

test('記事ページのOGP画像は実ファイルが存在する', () => {
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    const match = html.match(/<meta\s+property="og:image"\s+content="https:\/\/playpoint-sim\.com\/([^"]+)"/);
    assert.ok(match, `${file} is missing og:image`);
    assert.ok(fs.existsSync(path.join(root, match[1])), `${file} og:image file is missing: ${match[1]}`);
  }
});

test('blog SearchActionは実装と同じqパラメータを使う', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.ok(html.includes('https://playpoint-sim.com/blog/?q={search_term_string}'));
  assert.ok(!html.includes('https://playpoint-sim.com/blog/?search={search_term_string}'));
});

test('blog一覧HTMLはJS実行前でも全記事への静的リンクを持つ', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const articles = JSON.parse(fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8'));

  for (const article of articles) {
    assert.ok(
      html.includes(`href="${article.file}"`),
      `${article.file} is missing from static blog HTML`
    );
  }
});

test('blogトップは自前のOGP画像とfaviconを使う', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.ok(html.includes('content="https://playpoint-sim.com/ogp.png"'));
  assert.ok(html.includes('href="../favicon.svg"'));
  assert.ok(!html.includes('placehold.co'));
});

test('blogトップの説明文は検索結果向けの長さを確保する', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';

  assert.ok(description.length >= 70, `description is too short: ${description.length}`);
  assert.ok(description.includes('Play Points') || description.includes('Playポイント'));
});

test('blogの正規URLはindex.htmlを露出しない', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const components = fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8');
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');

  assert.ok(!html.includes('href="index.html"'));
  assert.ok(!components.includes('blog/index.html'));
  assert.ok(htaccess.includes('RewriteRule ^blog/index\\.html$ /blog/ [R=301,L,NE]'));
});

test('blogトップはGoogle Fonts CSSをpreloadしない', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.ok(!html.includes('rel="preload"'));
  assert.ok(html.includes('fonts.googleapis.com'));
});

test('記事ページの前後ナビは関連記事コンテナが無くても描画される', () => {
  const script = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const navIndex = script.indexOf('setupPrevNextNav(allArticles);');
  const containerReturnIndex = script.indexOf('if (!container) return;');

  assert.ok(navIndex >= 0);
  assert.ok(containerReturnIndex >= 0);
  assert.ok(navIndex < containerReturnIndex);
  assert.ok(script.includes('if (container && recommended.length > 0)'));
});

test('blog記事カードクリックをAnalyticsへ送る', () => {
  const script = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');

  assert.ok(script.includes('Analytics.trackArticleClick(article.title, article.category)'));
});

test('主要な操作要素は44px以上のタップ領域を持つ', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

  assert.ok(css.includes('min-height: 44px'));
  assert.match(css, /\.header-links a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.tab-switch button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.region-switch button\s*\{[^}]*min-height:\s*44px/s);
});

test('狭い画面でも日記タブの文字を省略しない', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const mobileBlock = css.slice(css.indexOf('@media(max-width:480px)'));

  assert.ok(mobileBlock.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
  assert.ok(mobileBlock.includes('#tab-diary'));
  assert.ok(!mobileBlock.includes('text-overflow: ellipsis'));
});

test('計算と日記保存の完了を個人情報なしでAnalyticsへ送る', () => {
  const config = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const diary = fs.readFileSync(path.join(root, 'js', 'diary.js'), 'utf8');

  assert.ok(config.includes('PP_APP.ANALYTICS'));
  assert.ok(calculator.includes("track('calculation_completed'"));
  assert.ok(calculator.includes("track('reverse_calculation_completed'"));
  assert.ok(diary.includes("track('diary_entry_saved'"));
  assert.ok(!calculator.includes('required_yen:'));
  assert.ok(!diary.includes('points_value:'));
});

test('AdSenseは主機能より先に読み込まず利用開始後に読み込む', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'third-party.js'), 'utf8');

  assert.ok(script.includes("addEventListener('playpoint:engaged'"));
  assert.ok(script.includes("addEventListener('scroll'"));
  assert.ok(script.includes('scheduleAdsenseLoad'));
  assert.ok(!script.includes("requestIdleCallback(() => {\n                loadAdsense();"));
});

test('ブログのH1はPlay Points攻略記事の検索意図と一致する', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.ok(html.includes('<h1 class="hero-title">Google Play Points 攻略・使い方記事</h1>'));
  assert.ok(!html.includes("Katakata's Update Log"));
});

test('トップページの静的初期表示は古い曜日や年で信頼性を落とさない', () => {
  const topFiles = ['index.html', 'en/index.html', 'ko/index.html', 'tw/index.html'];

  for (const file of topFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.includes('class="first-step-guide"'), `${file} に初手導線がありません`);
    assert.ok(!html.includes('今日は金曜日！'), `${file} に曜日断定の静的文言があります`);
    assert.ok(!html.includes('<h2 id="currentYear">2025</h2>'), `${file} に古い日記年の静的初期値があります`);
  }
});

test('ブログ一覧の静的HTMLは読み込み失敗表示を常時露出しない', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'blog', 'script.js'), 'utf8');

  assert.ok(html.includes('static-article-links'));
  assert.ok(html.includes('id="search-pathways-title"'));
  assert.ok(html.includes('悩みから記事を選ぶ'));
  assert.ok(html.includes('../articles/2026-03-10-play-points-reflection-timing.html'));
  assert.ok(html.includes('../maintenance/platinum/'));
  assert.ok(html.includes('../amount/10000/'));
  assert.ok(!html.includes('記事を読み込み中...'));
  assert.ok(!html.includes('記事の読み込みに失敗しました。'));
  assert.match(script, /articlesUrl:\s*'articles\.json\?v=[0-9_a-z-]+'/);
});

test('blog articles.jsonは記事ごとのfileキーを1つだけ持つ', () => {
  const raw = fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8');
  const blocks = raw.match(/\{\s*"id"[\s\S]*?\n  \}/g) || [];

  assert.ok(blocks.length >= 20, '記事メタデータの件数が想定より少ないです');
  for (const block of blocks) {
    const id = block.match(/"id":\s*"([^"]+)"/)?.[1] || '(unknown)';
    const fileKeys = block.match(/"file"\s*:/g) || [];
    assert.strictEqual(fileKeys.length, 1, `${id} has duplicate file keys`);
  }
});

test('課金効率記事は煽り表現より条件と注意を前面に出す', () => {
  const html = fs.readFileSync(path.join(root, 'articles', '2026-06-20-discount-gift-cards.html'), 'utf8');
  const articles = fs.readFileSync(path.join(root, 'blog', 'articles.json'), 'utf8');

  for (const phrase of ['裏ワザ', 'ザクザク', '非常にもったいない', '最大20％近く', '普通に買うのはもったいない']) {
    assert.ok(!html.includes(phrase), `記事本文に煽り表現が残っています: ${phrase}`);
    assert.ok(!articles.includes(phrase), `記事メタデータに煽り表現が残っています: ${phrase}`);
  }
  assert.ok(html.includes('条件を満たすと'));
  assert.ok(html.includes('購入前にキャンペーンページの条件を必ず確認'));
  assert.ok(html.includes('使いすぎを避けましょう'));
});

test('全記事から有効なGoogle公式ヘルプを確認できる', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(articleScript.includes('https://support.google.com/googleplay/answer/9077312'));
  assert.ok(articleScript.includes('official-source-note'));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(html.includes('../blog/article.js'), `${file} does not load the common article script`);
    assert.ok(!html.includes('/answer/9077302'), `${file} contains a broken Google Help URL`);
  }
});

test('記事HTMLの見出しタグは壊れた属性形式を含まない', () => {
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(!/<h[1-6]"/.test(html), `${file} contains malformed heading tags`);
  }
});

test('トップページの記事リンクはローカルに存在する公開記事だけを指す', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/href="(articles\/[^"#?]+\.html)"/g)]
    .map(match => match[1]);

  assert.ok(refs.length >= 6);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(root, ref)), `トップページに存在しない記事リンクがあります: ${ref}`);
  }
});

test('トップ上部は商業色の強い課金導線を前面に出しすぎない', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const headerMatch = html.match(/<div class="header-links">([\s\S]*?)<\/div>/);

  assert.ok(headerMatch, 'header-links が見つかりません');
  assert.ok(!headerMatch[1].includes('linkDiscount'));
  assert.ok(!headerMatch[1].includes('お得に課金する'));
  assert.ok(html.includes('購入前チェック'));
  assert.ok(html.includes('Google Play ギフトコードを購入する前に確認する条件と注意点'));
});

test('計算条件を共有URLへ保存し再訪時に復元できる', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const englishHtml = fs.readFileSync(path.join(root, 'en', 'index.html'), 'utf8');
  const shareScript = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');
  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

  assert.ok(html.includes('js/main.js'));
  assert.ok(englishHtml.includes('../js/main.js'));
  assert.ok(shareScript.includes('buildMainShareUrl'));
  assert.ok(shareScript.includes('applyFromUrl'));
  assert.ok(shareScript.includes('URLSearchParams'));
  assert.ok(shareScript.includes("url.searchParams.set('target'"));
  assert.ok(shareScript.includes("params.get('target')"));
  assert.ok(shareScript.includes('setTargetFromParam(dom.targetStatus, target)'));
  assert.ok(calculator.includes('dataset.shareUrl'));
  assert.ok(main.includes('SHARE.applyFromUrl()'));
});

test('記事から計算機への導線は内部流入を識別できる', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');

  assert.ok(articleScript.includes("utm_source', 'article'"));
  assert.ok(articleScript.includes("utm_medium', 'internal'"));
  assert.ok(articleScript.includes('article_to_calculator_clicked'));
  assert.ok(articleScript.includes('link_context'));
  assert.ok(articleScript.includes('destination_path'));
});

test('流入施策はLPと結果画面の主要導線を個人情報なしで計測する', () => {
  const config = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8');
  const calculator = fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');
  const intent = fs.readFileSync(path.join(root, 'js', 'intent-tracking.js'), 'utf8');
  const docs = fs.readFileSync(path.join(root, 'docs', 'ANALYTICS.md'), 'utf8');
  const lpFiles = [
    path.join(root, 'status', 'platinum', 'index.html'),
    path.join(root, 'status', 'diamond', 'index.html'),
    path.join(root, 'maintenance', 'platinum', 'index.html'),
    path.join(root, 'campaign', '2x', 'index.html'),
    path.join(root, 'campaign', '3x', 'index.html'),
    path.join(root, 'amount', '10000', 'index.html')
  ];

  for (const eventName of [
    'lp_to_calculator_clicked',
    'lp_related_link_clicked',
    'result_related_article_clicked',
    'share_url_copied',
    'share_x_clicked'
  ]) {
    assert.ok(config.includes(eventName), `${eventName} is missing from analytics allowlist`);
    assert.ok(docs.includes(eventName), `${eventName} is missing from analytics docs`);
  }

  for (const forbiddenParam of ['required_yen', 'needed_points', 'amount_yen', 'earned_points']) {
    assert.ok(!config.includes(forbiddenParam), `${forbiddenParam} must not be allowlisted`);
  }

  assert.ok(config.includes('sanitizeParams'));
  assert.ok(calculator.includes('getEntryContext()'));
  assert.ok(calculator.includes("track('share_url_copied'"));
  assert.ok(calculator.includes("track('share_x_clicked'"));
  assert.ok(calculator.includes('data-result-related-link'));
  assert.ok(main.includes("track('result_related_article_clicked'"));
  assert.ok(intent.includes("track('lp_to_calculator_clicked'"));
  assert.ok(intent.includes("track('lp_related_link_clicked'"));

  lpFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);
    assert.ok(html.includes('/js/intent-tracking.js'), `${relative} にLP計測スクリプトがありません`);
    assert.ok(html.includes('/js/third-party.js'), `${relative} に同意/GA読み込みスクリプトがありません`);
  });
});

test('最新情報ハブは検証日・公式参照・計算機CTAを持つ', () => {
  const latest = fs.readFileSync(path.join(root, 'latest', 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapHtml = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');
  const top = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const blogTop = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');

  assert.ok(latest.includes('Google Play Points 最新情報ハブ'));
  assert.ok(latest.includes('最終更新: '));
  assert.ok(latest.includes('検証日: '));
  assert.ok(latest.includes('https://support.google.com/googleplay/answer/9077312'));
  assert.ok(latest.includes('https://support.google.com/googleplay/answer/9080348'));
  assert.ok(latest.includes('utm_source=latest_hub'));
  assert.ok(sitemap.includes('<loc>https://playpoint-sim.com/latest/</loc>'));
  assert.ok(sitemapHtml.includes('href="latest/"'));
  assert.ok(top.includes('href="latest/"'));
  assert.ok(blogTop.includes('href="../latest/"'));
});

test('記事共通CTAは計算機への自然導線と計測文脈を持つ', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const articleCss = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');

  assert.ok(articleScript.includes('setupCalculatorPrompt'));
  assert.ok(articleScript.includes("content.querySelector('.cta-box, .cta-banner')"));
  assert.ok(articleScript.includes('あなたの場合はいくら必要？'));
  assert.ok(articleScript.includes('utm_campaign=article_cta_prompt'));
  assert.ok(articleScript.includes('article_calculator_prompt'));
  assert.ok(articleCss.includes('.article-calculator-prompt'));
  assert.ok(articleCss.includes('.content .cta-box'));
  assert.ok(articleCss.includes('border-left: 4px solid var(--article-accent)') || articleCss.includes('border-left:4px solid var(--article-accent)'));
  assert.ok(articleCss.includes('transform: none;'));
});

test('モバイルの補助リンクと共有ボタンは縦に増えすぎない', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const mobileBlock = css.slice(css.indexOf('@media (max-width: 480px)'));

  assert.ok(css.includes('.header-link-secondary'));
  assert.ok(mobileBlock.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
  assert.ok(mobileBlock.includes('.header-link-secondary'));
  assert.ok(mobileBlock.includes('display: none !important'));
});

test('モバイル初期表示外の重い領域は遅延描画される', () => {
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'js', 'main.js'), 'utf8');

  assert.ok(css.includes('#diaryMode'));
  assert.ok(css.includes('#reverseMode'));
  assert.ok(css.includes('content-visibility: auto'));
  assert.ok(main.includes('requestIdleCallback'));
  assert.ok(main.includes('navigator.serviceWorker.register'));
});

test('記事クラスタは検索意図別LPへ文脈に合う内部リンクを持つ', () => {
  const articleLinks = [
    {
      file: '2025-12-25-campaign.html',
      targets: ['/campaign/2x/', '/campaign/3x/']
    },
    {
      file: '2025-12-25-new-year-campaign.html',
      targets: ['/campaign/2x/', '/campaign/3x/']
    },
    {
      file: '2026-06-20-discount-gift-cards.html',
      targets: ['/amount/10000/', '/campaign/2x/']
    },
    {
      file: '2025-12-25-diamond-worth-it.html',
      targets: ['/status/diamond/', '/campaign/3x/']
    },
    {
      file: '2025-12-25-playpoints-rank-maintenance.html',
      targets: ['/maintenance/platinum/', '/status/platinum/']
    }
  ];
  const monitoring = fs.readFileSync(path.join(root, 'docs', 'SEARCH_CONSOLE_MONITORING.md'), 'utf8');

  articleLinks.forEach(({ file, targets }) => {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    targets.forEach((target) => {
      assert.ok(html.includes(`https://playpoint-sim.com${target}`), `${file} から ${target} への内部リンクがありません`);
    });
  });

  for (const query of ['2倍キャンペーン', 'play points 1万円', 'ダイヤモンド 必要額', 'プラチナ 維持']) {
    assert.ok(monitoring.includes(query), `Search Console監視メモに対象クエリがありません: ${query}`);
  }
});

test('外部サイト向け埋め込みウィジェットは依存なしで安全に計算できる', () => {
  const guide = fs.readFileSync(path.join(root, 'embed.html'), 'utf8');
  const widget = fs.readFileSync(path.join(root, 'embed', 'playpoint-widget.js'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

  assert.ok(guide.includes('data-playpoint-widget'));
  assert.ok(guide.includes('embed/playpoint-widget.js'));
  assert.ok(widget.includes('customElements.define'));
  assert.ok(widget.includes('attachShadow'));
  assert.ok(widget.includes('Number.isFinite'));
  assert.ok(widget.includes('playpoint-sim.com/?utm_source=embedded_widget'));
  assert.ok(!sitemap.includes('https://playpoint-sim.com/embed.html'));
});

test('Analyticsのイベント設計と検証手順が文書化されている', () => {
  const docs = fs.readFileSync(path.join(root, 'docs', 'ANALYTICS.md'), 'utf8');

  for (const eventName of [
    'calculation_completed',
    'reverse_calculation_completed',
    'diary_entry_saved',
    'article_to_calculator_clicked'
  ]) {
    assert.ok(docs.includes(eventName), `${eventName} is missing from analytics docs`);
  }
  assert.ok(docs.includes('DebugView'));
  assert.ok(docs.includes('個人情報'));
});

test('Service Workerは共有URL機能を含む最新版アセットを事前キャッシュする', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  assert.ok(sw.includes("'./js/share.js'"));
  assert.ok(/playpoint-calc-v2026\d{4}/.test(sw));
  assert.ok(/\.\/style\.css\?v=[a-zA-Z0-9_-]+/.test(sw));
});

test('トップページの更新日は実装更新日と一致する', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const englishHtml = fs.readFileSync(path.join(root, 'en', 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const modifiedDate = html.match(/<meta name="last-modified" content="(\d{4}-\d{2}-\d{2})">/);

  assert.ok(modifiedDate, 'トップページのlast-modifiedがありません');
  assert.ok(html.includes(`"dateModified": "${modifiedDate[1]}"`));
  assert.ok(html.includes(`最終更新: ${modifiedDate[1]}`));
  assert.ok(englishHtml.includes(`<meta name="last-modified" content="${modifiedDate[1]}">`));
  assert.match(sitemap, new RegExp(`<loc>https://playpoint-sim\\.com/</loc>\\s*<lastmod>${modifiedDate[1]}</lastmod>`));
});

test('サイトマップ同期はトップページ群のlastmodだけを更新する', () => {
  const { syncSitemapContent } = require(path.join(root, 'scripts', 'sitemap-sync.cjs'));
  const before = [
    '<urlset>',
    '<url><loc>https://playpoint-sim.com/</loc><lastmod>2026-01-01</lastmod></url>',
    '<url><loc>https://playpoint-sim.com/en/</loc><lastmod>2026-01-01</lastmod></url>',
    '<url><loc>https://playpoint-sim.com/articles/sample.html</loc><lastmod>2026-02-02</lastmod></url>',
    '</urlset>'
  ].join('\r\n');

  const after = syncSitemapContent(before, '2026-06-27');

  assert.ok(!after.includes('\r\n'));
  assert.ok(after.endsWith('\n'));
  assert.ok(after.includes('<loc>https://playpoint-sim.com/</loc><lastmod>2026-06-27</lastmod>'));
  assert.ok(after.includes('<loc>https://playpoint-sim.com/en/</loc><lastmod>2026-06-27</lastmod>'));
  assert.ok(after.includes('<loc>https://playpoint-sim.com/articles/sample.html</loc><lastmod>2026-02-02</lastmod>'));
});

test('反映タイミング記事は結論と確認手順を見出しで整理する', () => {
  const html = fs.readFileSync(path.join(root, 'articles', '2026-03-10-play-points-reflection-timing.html'), 'utf8');

  assert.ok(html.includes('<h2>最初に確認する3つ</h2>'));
  assert.ok(html.includes('<h2>状況別の判断目安</h2>'));
  assert.ok(html.includes('<h2>問い合わせ前に残しておく情報</h2>'));
  assert.ok(!html.includes('検索から来た人にもちゃんと残りやすくなります'));
  assert.ok(html.includes('2026/06/18 更新'));
});

test('広告のスクロール監視は閾値到達まで解除しない', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'third-party.js'), 'utf8');

  assert.ok(script.includes('function handleAdsenseScroll()'));
  assert.ok(script.includes("removeEventListener('scroll', handleAdsenseScroll)"));
  assert.ok(!script.includes("}, { passive: true, once: true });"));
});

test('共有URLは実在するステータス値だけを復元する', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'share.js'), 'utf8');

  assert.ok(script.includes('isAllowedStatusValue'));
  assert.ok(script.includes('params.has(name)'));
});

test('日記保存イベントはストレージ保存成功時だけ送る', () => {
  const script = fs.readFileSync(path.join(root, 'js', 'diary.js'), 'utf8');

  assert.ok(script.includes('return true;'));
  assert.ok(script.includes('return false;'));
  assert.ok(script.includes('if (!this.saveDiaryData(data)) return;'));
});

test('記事のAdSenseは本文スクロール後に共通スクリプトから読み込む', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(articleScript.includes('function loadArticleAdsense()'));
  assert.ok(articleScript.includes('window.scrollY < 600'));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(!html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), `${file} loads AdSense before article engagement`);
  }
});

test('ブログと記事は共通コンポーネントからGA4本体を読み込む', () => {
  const components = fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8');
  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(components.includes("const GA_MEASUREMENT_ID = 'G-HED6D0FR4L'"));
  assert.ok(components.includes('googletagmanager.com/gtag/js'));
  assert.ok(components.includes("window.gtag('config', GA_MEASUREMENT_ID)"));
  assert.ok(blogHtml.includes('components.js'));
  assert.ok(!blogHtml.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'));
  assert.ok(components.includes('function loadBlogAdsense()'));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(html.includes('../blog/components.js'), `${file} does not load common analytics components`);
  }
});

test('共通コンポーネントは既存のヘッダーとフッターを重複生成しない', () => {
  const components = fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8');

  assert.ok(components.includes("document.querySelector('header')"));
  assert.ok(components.includes("document.querySelector('footer')"));
  assert.ok(!components.includes("document.querySelector('header.header')"));
  assert.ok(!components.includes("document.querySelector('footer.site-footer')"));
});

test('公開されている全記事HTMLが必要なSEOおよびAdSenseタグを含んでいること', () => {
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');

    assert.ok(/<title>/i.test(html), `${file} に <title> が見つかりません`);
    assert.ok(/meta\s+name="description"/i.test(html), `${file} に meta description が見つかりません`);
    assert.ok(/rel="canonical"/i.test(html), `${file} に rel="canonical" が見つかりません`);
    assert.ok(/data-ad-client/i.test(html), `${file} に data-ad-client (AdSense) が見つかりません`);
  }
});

test('ブログと記事の変更アセットはバージョン付きURLで配信する', () => {
  const componentsVersion = '20260621a';
  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.match(blogHtml, /style\.css\?v=[0-9_a-z-]+/);
  assert.ok(blogHtml.includes(`components.js?v=${componentsVersion}`));
  assert.match(blogHtml, /script\.js\?v=[0-9_a-z-]+/);
  assert.ok(/playpoint-calc-v2026\d{4}/.test(sw));
  const articleSharedVersion = sw.match(/\.\/articles\/article-shared\.css\?v=([0-9_a-z-]+)/)?.[1];
  assert.ok(articleSharedVersion, 'sw.js does not version article-shared.css');
  assert.match(sw, /\.\/blog\/article\.js\?v=[0-9_a-z-]+/);
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(html.includes(`article-shared.css?v=${articleSharedVersion}`), `${file} does not match sw.js article-shared.css version`);
    assert.match(html, /\.\.\/blog\/article\.js\?v=[0-9_a-z-]+/, `${file} does not version article.js`);
    assert.ok(html.includes(`../blog/components.js?v=${componentsVersion}`), `${file} does not version components.js`);
  }
});

test('記事共通デザインは前後ナビと操作領域とカテゴリー配色を統一する', () => {
  const css = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');
  const components = fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8');

  assert.ok(css.includes('.article-nav-link'));
  assert.ok(css.includes('min-height: 44px'));
  for (const category of ['入門', '攻略', '活用術', '検証', 'トラブル対処']) {
    assert.ok(css.includes(`data-article-category="${category}"`), `${category} category color is missing`);
  }
  assert.ok(components.includes('katakata_blog_settings'));
  assert.ok(components.includes('dataset.blogTheme'));
  assert.ok(components.includes('dataset.articleCategory'));
});

test('ブログのライトテーマとモバイル導線は読みやすさを維持する', () => {
  const css = fs.readFileSync(path.join(root, 'blog', 'style.css'), 'utf8');

  assert.match(css, /\.blog-header\s*\{[^}]*--header-text:/s);
  assert.match(css, /\.brand\s*\{[^}]*color:\s*var\(--header-text\)/s);
  assert.match(css, /\.theme-toggle\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(css, /\.sidebar-toggle\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
  assert.match(css, /@media \(max-width:\s*600px\)[\s\S]*?\.search-sort-row\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /@media \(max-width:\s*600px\)[\s\S]*?\.cta-banner-content\s*\{[^}]*display:\s*grid/s);
});

test('記事はfaviconを指定しAdSenseが必要とする接続先をCSPで許可する', () => {
  const htaccess = fs.readFileSync(path.join(root, '.htaccess'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(htaccess.includes('https://fundingchoicesmessages.google.com'));
  assert.ok(htaccess.includes('https://ep1.adtrafficquality.google'));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(html.includes('rel="icon" href="../favicon.svg"'), `${file} does not declare the site favicon`);
  }
});

test('運営者プロフィールは検索可能な独立ページとして公開する', () => {
  const authorPath = path.join(root, 'author', 'katakata.html');
  assert.ok(fs.existsSync(authorPath));

  const html = fs.readFileSync(authorPath, 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="https://playpoint-sim.com/author/katakata.html"'));
  assert.ok(html.includes('"@type": "ProfilePage"'));
  assert.ok(html.includes('"@type": "Person"'));
  assert.ok(html.includes('記事の検証方針'));
});

test('全記事は著者ページへリンクしArticle構造化データの著者と発行者を統一する', () => {
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    const jsonBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(match => JSON.parse(match[1]));
    const article = jsonBlocks.find(data => data['@type'] === 'Article');

    assert.ok(html.includes('class="author-box"'), `${file} does not show an author box`);
    assert.ok(html.includes('../author/katakata.html'), `${file} does not link to the author profile`);
    const navigationPosition = html.includes('<!-- Previous / Next Article Navigation -->')
      ? html.indexOf('<!-- Previous / Next Article Navigation -->')
      : html.indexOf('<nav id="article-nav"');
    assert.ok(navigationPosition >= 0, `${file} does not expose article navigation`);
    assert.ok(html.indexOf('class="author-box"') < navigationPosition, `${file} places the author box after article navigation`);
    assert.ok(article, `${file} does not have Article structured data`);
    assert.equal(article.author['@type'], 'Person');
    assert.equal(article.author.url, 'https://playpoint-sim.com/author/katakata.html');
    assert.equal(article.publisher.url, 'https://playpoint-sim.com/');
    assert.equal(article.publisher.logo.url, 'https://playpoint-sim.com/favicon.svg');
    assert.ok(article.image?.startsWith('https://playpoint-sim.com/articles/ogp/'));
  }
});

test('ブログ検索タイトルと内部リンクは運営者の専門性を明示する', () => {
  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const parseJsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const rootSchemas = parseJsonLd(rootHtml);
  const blogSchemas = parseJsonLd(blogHtml);
  const application = rootSchemas.find(data => data['@type'] === 'SoftwareApplication');
  const website = rootSchemas.find(data => data['@type'] === 'WebSite');
  const blog = blogSchemas.find(data => data['@type'] === 'Blog');

  assert.ok(blogHtml.includes('<title>Google Play Points攻略・使い方ブログ | Playポイント計算機</title>'));
  assert.ok(blogHtml.includes('../author/katakata.html'));
  assert.ok(rootHtml.includes('author/katakata.html'));
  assert.equal(application.author.url, 'https://playpoint-sim.com/author/katakata.html');
  assert.equal(website.publisher.url, 'https://playpoint-sim.com/author/katakata.html');
  assert.equal(blog.author.url, 'https://playpoint-sim.com/author/katakata.html');
  assert.equal(blog.publisher.url, 'https://playpoint-sim.com/');
});

test('サイトマップとSearch Console運用は著者ページと記事群を監視対象にする', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const monitoring = fs.readFileSync(path.join(root, 'docs', 'SEARCH_CONSOLE_MONITORING.md'), 'utf8');

  assert.ok(sitemap.includes('https://playpoint-sim.com/author/katakata.html'));
  assert.ok(monitoring.includes('/blog/'));
  assert.ok(monitoring.includes('/articles/'));
  assert.ok(monitoring.includes('掲載順位5〜20位'));
  assert.ok(monitoring.includes('記事から計算完了'));
});

test('sw.js と各言語版 index.html の style.css バージョンクエリが一致していること', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

  const indexMatch = indexHtml.match(/href="style\.css\?v=([^"]+)"/);
  const swMatch = swJs.match(/\.\/style\.css\?v=([^']+)'/);

  assert.ok(indexMatch, 'index.html 内に style.css のバージョン指定が見つかりません');
  assert.ok(swMatch, 'sw.js 内に style.css のバージョン指定が見つかりません');

  const indexVer = indexMatch[1];
  const swVer = swMatch[1];

  assert.strictEqual(indexVer, swVer, `index.html (${indexVer}) と sw.js (${swVer}) の style.css バージョンが一致しません`);

  // 各他言語版HTMLとの比較
  const targets = ['en', 'ko', 'tw'];
  for (const lang of targets) {
    const filePath = path.join(root, lang, 'index.html');
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      const match = html.match(/href="\.\.\/style\.css\?v=([^"]+)"/);
      assert.ok(match, `${lang}/index.html 内に style.css のバージョン指定が見つかりません`);
      const ver = match[1];
      assert.strictEqual(ver, swVer, `${lang}/index.html (${ver}) と sw.js (${swVer}) の style.css バージョンが一致しません`);
    }
  }
});

test('多言語HTMLビルド出力の整合性とhreflangの検証', () => {
  const targets = {
    'en': { lang: 'en',    title: 'Play Point Calculator',      ogUrl: 'https://playpoint-sim.com/en/' },
    'ko': { lang: 'ko',    title: '구글 플레이 포인트 계산기',           ogUrl: 'https://playpoint-sim.com/ko/' },
    'tw': { lang: 'zh-TW', title: 'Google Play 點數計算器',         ogUrl: 'https://playpoint-sim.com/tw/' }
  };

  for (const [dir, config] of Object.entries(targets)) {
    const filePath = path.join(root, dir, 'index.html');
    assert.ok(fs.existsSync(filePath), `${dir}/index.html が存在しません。ビルドスクリプトを実行してください。`);

    const html = fs.readFileSync(filePath, 'utf8');

    // lang 属性検証（BCP47準拠の正しい言語コードを期待）
    assert.ok(html.includes(`<html lang="${config.lang}">`), `${dir}/index.html の lang 属性が正しくありません。期待: lang="${config.lang}"`);

    // タイトル検証
    assert.ok(html.includes(`<title>${config.title}`), `${dir}/index.html のタイトルが正しくありません`);

    // canonical 検証
    assert.ok(html.includes(`<link rel="canonical" href="https://playpoint-sim.com/${dir}/">`), `${dir}/index.html の canonical リンクが正しくありません`);

    // og:url 検証（SNSシェア正確性のため必須）
    assert.ok(
      html.includes(`<meta property="og:url" content="${config.ogUrl}">`),
      `${dir}/index.html の og:url が正しくありません。期待: ${config.ogUrl}`
    );

    // hreflang 検証 (5言語分全て)
    const hreflangs = [
      'hreflang="ja" href="https://playpoint-sim.com/"',
      'hreflang="en" href="https://playpoint-sim.com/en/"',
      'hreflang="ko" href="https://playpoint-sim.com/ko/"',
      'hreflang="zh-TW" href="https://playpoint-sim.com/tw/"',
      'hreflang="x-default" href="https://playpoint-sim.com/"'
    ];

    for (const hf of hreflangs) {
      assert.ok(html.includes(hf), `${dir}/index.html に hreflang (${hf}) が見つかりません`);
    }

    // 相対アセットパスが ../ になっているか検証
    assert.ok(html.includes('href="../style.css'), `${dir}/index.html の style.css パスが相対化されていません`);
    assert.ok(html.includes('src="../js/'), `${dir}/index.html の JSパスが相対化されていません`);
  }
});

test('海外向けSEOページは主要検索意図ごとに公開可能な構造を持つ', () => {
  const { getIntlSeoFiles } = require(path.join(root, 'scripts', 'intl-seo-pages.cjs'));
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const sitemapHtml = fs.readFileSync(path.join(root, 'sitemap.html'), 'utf8');
  const files = getIntlSeoFiles();

  assert.strictEqual(files.length, 14);
  for (const file of files) {
    const filePath = path.join(root, file);
    const canonical = `https://playpoint-sim.com/${file.replace(/index\.html$/, '')}`;

    assert.ok(fs.existsSync(filePath), `${file} が生成されていません`);
    const html = fs.readFileSync(filePath, 'utf8');
    assert.ok(html.includes('<meta name="robots" content="index,follow">'), `${file} のrobotsがありません`);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`), `${file} のcanonicalが不正です`);
    assert.ok(html.includes('<meta name="description" content="'), `${file} のdescriptionがありません`);
    assert.ok(html.includes('application/ld+json'), `${file} の構造化データがありません`);
    assert.ok(html.includes('/js/intent-tracking.js?v='), `${file} の計測導線がありません`);
    assert.ok(html.length >= 4000, `${file} の本文量が薄すぎます`);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${file} がsitemap.xmlにありません`);

    const localLinks = [...html.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)]
      .map(match => match[1]);
    for (const href of localLinks) {
      let relativePath = href.replace(/^\//, '');
      if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
      assert.ok(fs.existsSync(path.join(root, relativePath)), `${file} のリンク先が存在しません: ${href}`);
    }
  }

  assert.ok(sitemapHtml.includes('International shortcuts'));
  assert.ok(sitemapHtml.includes('English Play Points guides'));
});

test('海外向けSEOページは既存記事の読み物感と各言語の自然な導線を保つ', () => {
  const intlFiles = [
    'en/status/diamond/index.html',
    'en/campaign/2x/index.html',
    'en/amount/10000/index.html',
    'ko/status/diamond/index.html',
    'ko/campaign/2x/index.html',
    'ko/amount/10000/index.html',
    'tw/status/diamond/index.html',
    'tw/campaign/2x/index.html',
    'tw/amount/10000/index.html'
  ];
  for (const file of intlFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const h2Count = (html.match(/<h2\b/g) || []).length;
    assert.ok(h2Count >= 5, `${file} の見出し構造が薄く、既存LPとの差が大きいです`);
  }

  for (const file of intlFiles.filter(file => file.startsWith('ko/') || file.startsWith('tw/'))) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!html.includes('When do Google Play Points appear?'), `${file} に英語の関連記事ラベルが残っています`);
    assert.ok(!html.includes('Google Play Points levels explained'), `${file} に英語の関連記事ラベルが残っています`);
    assert.ok(!html.includes('Do gift cards earn Play Points?'), `${file} に英語の関連記事ラベルが残っています`);
  }

  const articleFiles = [
    'en/articles/google-play-points-reflection-timing.html',
    'en/articles/google-play-points-not-showing.html',
    'en/articles/google-play-points-levels.html',
    'en/articles/google-play-points-platinum-diamond-cost.html',
    'en/articles/google-play-points-gift-cards.html'
  ];
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ');
    const wordCount = (text.match(/\b[A-Za-z][A-Za-z'-]*\b/g) || []).length;
    assert.ok(html.includes('<main class="main-card">'), `${file} が既存記事のカード構造を使っていません`);
    assert.ok(html.includes('<article class="content">'), `${file} が既存記事の本文構造を使っていません`);
    assert.ok(html.includes('<div class="intro">'), `${file} に記事らしい導入文がありません`);
    assert.ok(html.includes('class="author-box"'), `${file} に著者/検証方針の表示がありません`);
    assert.ok(wordCount >= 450, `${file} の本文量が薄すぎます: ${wordCount} words`);
  }
});

test('ブロンズ以外のステータスでは、同ランク維持と次のランク昇格が目標に設定される', () => {
  const { PP_STATE, updateBaseRateAndTarget } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  
  // 1. ゴールド（1.5）の場合
  PP_STATE.dom.currentStatus.value = '1.5';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  // ゴールド(維持) と プラチナ(昇格) の2つが選択肢に入るはず
  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 2);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'ゴールド');
  assert.strictEqual(PP_STATE.dom.targetStatus.options[1].dataset.statusLabel, 'プラチナ');

  // ゴールド（維持）選択時の neededPoints.max は 1000 に制限されること
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '1000');

  // 2. ダイヤモンド（2.0）の場合
  PP_STATE.dom.currentStatus.value = '2';
  PP_STATE.dom.baseRate = createInput();
  PP_STATE.dom.targetStatus = createSelect();
  PP_STATE.dom.neededPoints = createInput();

  updateBaseRateAndTarget();

  // ダイヤモンドは最高ランクなので、ダイヤモンド(維持) の1つだけが選択肢に入るはず
  assert.strictEqual(PP_STATE.dom.targetStatus.options.length, 1);
  assert.strictEqual(PP_STATE.dom.targetStatus.options[0].dataset.statusLabel, 'ダイヤモンド');
  assert.strictEqual(PP_STATE.dom.neededPoints.max, '15000');
});

test('韓国（KR）リージョンの spendUnit 正確性検証', () => {
  const { PP_STATE, calculate, reverseCalculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'KR';
  
  // 逆算テスト (10,000ウォン課金)
  PP_STATE.dom.amountYen = createInput('10000');
  PP_STATE.dom.reverseStatus = createSelect();
  PP_STATE.dom.reverseStatus.value = '1'; // ブロンズ
  PP_STATE.dom.reverseBaseRate = createInput('1.0');
  PP_STATE.dom.reverseMultiplier = createInput('1');
  PP_STATE.dom.reverseResult = { dataset: {}, innerHTML: '', isError: false };

  reverseCalculate();

  // 10000 / 1000 * 1.0 = 10pt であるべき
  assert.ok(renderedResults[0].content.includes('data-value="10"'), `Expected 10pt for 10000 KRW, got: ${renderedResults[0].content}`);
});

test('リワードポイント差し引き計算の検証', () => {
  class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) return new Date(2026, 9, 2); // 10月2日 (年末までぴったり13週)
      return new Date(...args);
    }
  }
  FakeDate.UTC = Date.UTC;
  FakeDate.parse = Date.parse;
  FakeDate.now = () => new Date(2026, 9, 1).getTime();

  const { PP_STATE, calculate, renderedResults } = loadCalculatorContext(FakeDate);
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5'; // ゴールド (週平均5pt)
  PP_STATE.dom.baseRate = createInput('1.5');
  PP_STATE.dom.targetStatus = createSelect();
  const option1 = createOption('プラチナ', 4000);
  option1.dataset.statusLabel = 'プラチナ';
  PP_STATE.dom.targetStatus.add(option1);
  PP_STATE.dom.neededPoints = createInput('100'); // あと100pt必要
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };
  
  // リワード差し引きON
  PP_STATE.dom.subtractRewards = { checked: true };

  // 10月1日〜12月31日は91日間 ➔ 13週間
  // 13週 × 5pt = 65pt 差し引き
  // 実質必要ポイント = 100 - 65 = 35pt
  // 必要な課金額 = 35 / 1.5 * 100 = 2334円
  calculate();

  assert.ok(renderedResults[0].content.includes('data-value="35"'), '実質必要ポイントが35ptに減算されること');
  assert.ok(renderedResults[0].content.includes('data-value="2334"'), '必要額が2334円に減額されること');

  // リワードだけでクリアできるケースのテスト
  PP_STATE.dom.neededPoints.value = '50'; // あと50pt必要 (リワード65pt > 必要50pt)
  renderedResults.length = 0; // 結果クリア
  calculate();

  assert.ok(renderedResults[0].content.includes('課金不要'), 'リワードが上回る場合、課金不要と表示されること');
});

test('平均パック課金額（端数切り捨て）シミュレーションの検証', () => {
  const { PP_STATE, calculate, renderedResults } = loadCalculatorContext();
  PP_STATE.currentRegion = 'JP';
  PP_STATE.dom.currentStatus = createSelect();
  PP_STATE.dom.currentStatus.value = '1.5'; // ゴールド (還元率1.5pt/100円)
  PP_STATE.dom.baseRate = createInput('1.5');
  PP_STATE.dom.targetStatus = createSelect();
  const option2 = createOption('プラチナ', 4000);
  option2.dataset.statusLabel = 'プラチナ';
  PP_STATE.dom.targetStatus.add(option2);
  PP_STATE.dom.neededPoints = createInput('300'); // あと300pt必要
  PP_STATE.dom.multiplier = createInput('1');
  PP_STATE.dom.result = { dataset: {}, innerHTML: '', isError: false };
  
  // パック額 = 9800円 (9800円 / 100 = 98回。 98 * 1.5 = 147pt獲得)
  // 300pt ➔ 147pt × 3パック = 441pt ➔ 29400円必要
  PP_STATE.dom.packAmount = createInput('9800');

  calculate();

  assert.ok(renderedResults[0].content.includes('data-value="3"'), '必要購入パック数が3パックとなること');
  assert.ok(renderedResults[0].content.includes('data-value="29400"'), '合計課金額が29,400円になること');
});



