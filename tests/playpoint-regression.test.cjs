const assert = require('assert');
const fs = require('fs');
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
  vm.createContext(context);
  const code = [
    fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8'),
    `
      PP_APP.UI = {
        displayResult
      };
    `,
    fs.readFileSync(path.join(root, 'js', 'calculator.js'), 'utf8'),
    `
      globalThis.__pp = {
        PP_REGION_CONFIGS: PP_APP.CONFIGS,
        PP_STATE: PP_APP.STATE,
        populateStatusSelects: PP_APP.CALC.populateStatusSelects.bind(PP_APP.CALC),
        updateBaseRateAndTarget: PP_APP.CALC.updateBaseRateAndTarget.bind(PP_APP.CALC),
        getRemainingMonths: PP_APP.CALC.getRemainingMonths.bind(PP_APP.CALC),
        calculate: PP_APP.CALC.calculate.bind(PP_APP.CALC),
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

  assert.ok(workflow.includes('article_urls'));
  assert.ok(workflow.includes('data-ad-client'));
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
