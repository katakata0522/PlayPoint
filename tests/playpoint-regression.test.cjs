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

test('トップページの記事リンクはローカルに存在する公開記事だけを指す', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/href="(articles\/[^"#?]+\.html)"/g)]
    .map(match => match[1]);

  assert.ok(refs.length >= 6);
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(root, ref)), `トップページに存在しない記事リンクがあります: ${ref}`);
  }
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
  assert.ok(calculator.includes('dataset.shareUrl'));
  assert.ok(main.includes('SHARE.applyFromUrl()'));
});

test('記事から計算機への導線は内部流入を識別できる', () => {
  const articleScript = fs.readFileSync(path.join(root, 'blog', 'article.js'), 'utf8');

  assert.ok(articleScript.includes("utm_source', 'article'"));
  assert.ok(articleScript.includes("utm_medium', 'internal'"));
  assert.ok(articleScript.includes('article_to_calculator_clicked'));
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
  assert.ok(sitemap.includes('https://playpoint-sim.com/embed.html'));
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
  assert.ok(sw.includes("'./style.css?v=20260618a'"));
});

test('トップページの更新日は実装更新日と一致する', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const englishHtml = fs.readFileSync(path.join(root, 'en', 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

  assert.ok(html.includes('2026-06-20'));
  assert.ok(englishHtml.includes('2026-06-20'));
  assert.match(sitemap, /<loc>https:\/\/playpoint-sim\.com\/<\/loc>\s*<lastmod>2026-06-20<\/lastmod>/);
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

test('ブログと記事の変更アセットはバージョン付きURLで配信する', () => {
  const version = '20260619a';
  const componentsVersion = '20260619c';
  const articleScriptVersion = '20260619c';
  const articleStyleVersion = '20260619b';
  const blogHtml = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const articleFiles = fs.readdirSync(path.join(root, 'articles'))
    .filter(file => file.endsWith('.html'));

  assert.ok(blogHtml.includes(`style.css?v=${version}`));
  assert.ok(blogHtml.includes(`components.js?v=${componentsVersion}`));
  assert.ok(blogHtml.includes(`script.js?v=${version}`));
  assert.ok(/playpoint-calc-v2026\d{4}/.test(sw));
  assert.ok(sw.includes(`./articles/article-shared.css?v=${articleStyleVersion}`));
  for (const file of articleFiles) {
    const html = fs.readFileSync(path.join(root, 'articles', file), 'utf8');
    assert.ok(html.includes(`article-shared.css?v=${articleStyleVersion}`), `${file} does not load versioned shared article styles`);
    assert.ok(html.includes(`../blog/article.js?v=${articleScriptVersion}`), `${file} does not version article.js`);
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


