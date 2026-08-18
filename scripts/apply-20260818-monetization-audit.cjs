'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const SLOT = '8250492620';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content, 'utf8');
}

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`replace target not found: ${label}`);
  return source.replace(before, after);
}

// 1) GA4: 記事/ブログ側も config 後に readiness を立てる。
{
  const file = 'blog/components.js';
  let source = read(file);
  source = replaceOnce(
    source,
    "        window.PlayPointAnalytics.flushPending();",
    "        window.PlayPointAnalytics.markAnalyticsReady();",
    'components GA4 readiness'
  );
  write(file, source);
}

// 2) 記事末の新規広告枠を、同意後に有効な既存広告ユニットIDで一度だけ初期化する。
{
  const file = 'blog/article.js';
  let source = read(file);
  const marker = "    // AdSense本体はページ解析をブロックしないasyncで早期取得し、固定スクロール量による機会損失を避ける。\n";
  const injected = `    const MANAGED_ADSENSE_SLOT = '${SLOT}';\n\n    function initializeManagedArticleAds() {\n        document.querySelectorAll('.article-ad-container ins.adsbygoogle').forEach((ad) => {\n            if (!ad.dataset.adSlot) ad.dataset.adSlot = MANAGED_ADSENSE_SLOT;\n            if (ad.dataset.playpointAdRequested === 'true' || ad.dataset.adsbygoogleStatus) return;\n            ad.dataset.playpointAdRequested = 'true';\n            try {\n                (window.adsbygoogle = window.adsbygoogle || []).push({});\n            } catch (error) {\n                delete ad.dataset.playpointAdRequested;\n                console.error('AdSense slot initialization failed:', error);\n            }\n        });\n    }\n\n${marker}`;
  source = replaceOnce(source, marker, injected, 'article managed AdSense helper');
  source = replaceOnce(
    source,
    "    function loadArticleAdsense() {\n        if (articleAdsenseLoaded) return;\n        articleAdsenseLoaded = true;\n\n        if (document.querySelector('script[src*=\"pagead2.googlesyndication.com/pagead/js/adsbygoogle.js\"]')) return;",
    "    function loadArticleAdsense() {\n        if (articleAdsenseLoaded) {\n            initializeManagedArticleAds();\n            return;\n        }\n        articleAdsenseLoaded = true;\n        initializeManagedArticleAds();\n\n        if (document.querySelector('script[src*=\"pagead2.googlesyndication.com/pagead/js/adsbygoogle.js\"]')) return;",
    'article AdSense load'
  );
  write(file, source);
}

// 3) LP・ゲームページの手動広告を共通ローダーで初期化する。
{
  const file = 'js/third-party.js';
  let source = read(file);
  source = replaceOnce(
    source,
    "    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';",
    `    const ADSENSE_CLIENT = 'ca-pub-3845885843809455';\n    const MANAGED_ADSENSE_SLOT = '${SLOT}';`,
    'third-party AdSense slot constant'
  );
  const marker = "    async function loadAdsense() {\n";
  const helper = `    function initializeManagedAds() {\n        document.querySelectorAll('.lp-ad-container ins.adsbygoogle, .game-ad-container ins.adsbygoogle').forEach((ad) => {\n            if (!ad.dataset.adSlot) ad.dataset.adSlot = MANAGED_ADSENSE_SLOT;\n            if (ad.dataset.playpointAdRequested === 'true' || ad.dataset.adsbygoogleStatus) return;\n            ad.dataset.playpointAdRequested = 'true';\n            try {\n                (window.adsbygoogle = window.adsbygoogle || []).push({});\n            } catch (error) {\n                delete ad.dataset.playpointAdRequested;\n                console.error('AdSense slot initialization failed:', error);\n            }\n        });\n    }\n\n${marker}`;
  source = replaceOnce(source, marker, helper, 'third-party managed AdSense helper');
  source = replaceOnce(
    source,
    "        void loadAdsense();\n\n        const scheduleAfterLoad = () => {",
    "        void loadAdsense();\n        // 手動広告枠のリクエストは同意取得後だけ行う。スクリプト取得自体の既存挙動は変えない。\n        void runAfterConsent(initializeManagedAds);\n\n        const scheduleAfterLoad = () => {",
    'third-party managed AdSense scheduling'
  );
  write(file, source);
}

// 4) 再発元の広告挿入スクリプトを正規化。
for (const file of ['scripts/insert-article-ads.cjs', 'scripts/insert-lp-monetization.cjs']) {
  let source = read(file);
  const needle = '                     data-ad-client="ca-pub-3845885843809455"\n                     data-ad-format="auto"';
  const replacement = `                     data-ad-client="ca-pub-3845885843809455"\n                     data-ad-slot="${SLOT}"\n                     data-ad-format="auto"`;
  if (!source.includes(needle)) throw new Error(`ad slot insertion target not found: ${file}`);
  source = source.replace(needle, replacement);
  if (file.endsWith('insert-article-ads.cjs')) {
    source = replaceOnce(
      source,
      "  // </article> の直前に挿入\n  if (content.includes('</article>')) {",
      "  // noindex の品質保留ページには広告を追加しない。\n  if (/name=\\\"robots\\\"[^>]*content=\\\"[^\\\"]*noindex/i.test(content)) {\n    fs.writeFileSync(filePath, content, 'utf8');\n    return;\n  }\n\n  // </article> の直前に挿入\n  if (content.includes('</article>')) {",
      'article ad noindex guard'
    );
  }
  write(file, source);
}

// 5) ゲーム計算機生成元に有効な広告スロットと共通ローダーを追加。
{
  const file = 'scripts/generate-game-simulators.cjs';
  let source = read(file);
  source = replaceOnce(
    source,
    '                       data-ad-client="ca-pub-3845885843809455"\n                       data-ad-format="auto"',
    `                       data-ad-client="ca-pub-3845885843809455"\n                       data-ad-slot="${SLOT}"\n                       data-ad-format="auto"`,
    'game generator ad slot'
  );
  source = replaceOnce(
    source,
    '  <script src="${assetsRelative}js/analytics-core.js"></script>\n  <script src="${assetsRelative}games/game-sim.js"></script>',
    '  <script src="${assetsRelative}js/analytics-core.js"></script>\n  <script src="${assetsRelative}js/third-party.js"></script>\n  <script src="${assetsRelative}games/game-sim.js"></script>',
    'game generator third-party loader'
  );
  write(file, source);
}

// 6) 公式確認できない未来イベント記事は検索品質保留へ。
const qualityHoldPages = [
  {
    file: 'articles/2026-08-17-diamond-valley-festival-guide.html',
    title: 'Google Play「Diamond Valley」の過去実績と2026年の確認ポイント',
    description: 'Diamond Valleyの過去開催で公式に確認できる仕組みを整理します。2026年の日本向け日程・対象ステータス・特典はGoogle Play公式発表待ちとして、未確定情報と分けて案内します。',
    body: `\n            <nav class="breadcrumb-nav" aria-label="パンくずリスト"><ol class="breadcrumb-list"><li><a href="../">トップ</a></li><li><a href="../blog/">記事一覧</a></li><li aria-current="page">Diamond Valley</li></ol></nav>\n            <h1>Google Play「Diamond Valley」の過去実績と2026年の確認ポイント</h1>\n            <p class="article-meta">公開日：2026-08-17 / 更新日：2026-08-18 / 著者：<a href="../author/katakata.html" rel="author">かたかた</a></p>\n            <div class="callout callout-warning"><h2>2026年の日本向け内容は公式発表待ちです</h2><p>このページは、Google Play公式で確認できる過去のDiamond Valley情報だけを基準に整理しています。2026年の日本向け開催日、対象ステータス、先着特典、景品内容は、Google Play公式が案内するまで確定情報として扱いません。</p></div>\n            <section class="section"><h2>公式に確認できるDiamond Valleyとは</h2><p>Diamond Valleyは、ゲーム内のダイヤを集め、実物景品などへの応募機会を得るGoogle Playの宝探し型ミニゲームとして公式に案内された実績があります。</p><p>過去の公式案内では、Gold以上のPlay Pointsメンバー向け早期アクセス、登録時のボーナスダイヤ、専用エリアなどが設けられた例があります。ただし、対象地域・対象ランク・期間・特典は開催ごとに変わるため、次回開催へそのまま当てはめることはできません。</p></section>\n            <section class="section"><h2>2026年に確認する項目</h2><ul><li>日本が開催対象地域に含まれるか</li><li>事前登録・早期アクセスの日程</li><li>対象となるPlay Pointsステータス</li><li>ボーナスや応募可能な景品</li><li>参加条件と利用規約</li></ul></section>\n            <section class="section"><h2>確認先</h2><p><a href="https://play.google.com/store/apps/editorial?hl=ja&amp;id=mc_games_editorialmd_play_points_diamond_valley_fcp" target="_blank" rel="noopener noreferrer">Google Play公式 Diamond Valley案内</a>を優先して確認してください。</p></section>\n        `
  },
  {
    file: 'articles/2026-08-17-tgs-google-play-vip.html',
    title: '東京ゲームショウのGoogle Play特典｜2026年公式発表待ちと確認ポイント',
    description: '東京ゲームショウにおけるGoogle Play Points向け特典について、2026年の公式発表待ちであることを明確にし、確認すべき項目とGoogle Play公式の通常特典を整理します。',
    body: `\n            <nav class="breadcrumb-nav" aria-label="パンくずリスト"><ol class="breadcrumb-list"><li><a href="../">トップ</a></li><li><a href="../blog/">記事一覧</a></li><li aria-current="page">TGS Google Play特典</li></ol></nav>\n            <h1>東京ゲームショウのGoogle Play特典｜2026年公式発表待ちと確認ポイント</h1>\n            <p class="article-meta">公開日：2026-08-17 / 更新日：2026-08-18 / 著者：<a href="../author/katakata.html" rel="author">かたかた</a></p>\n            <div class="callout callout-warning"><h2>2026年TGSのGoogle Play VIP特典は未確認です</h2><p>2026年8月18日時点で、当サイトがGoogle公式情報として確認できる範囲では、東京ゲームショウ2026におけるGoogle Play Pointsの専用ラウンジ、限定カード、優先試遊、当日の提示方法などを確定情報として裏付けられませんでした。過去イベントの情報を2026年の条件として流用しません。</p></div>\n            <section class="section"><h2>Google Play Pointsで現在公式に確認できる上位特典</h2><p>日本のGoogle Play公式ヘルプでは、プラチナとダイヤモンドにプレミアムサポートが案内されています。イベント固有の特典は、通常のステータス特典とは別に、その都度の公式告知と利用規約を確認する必要があります。</p></section>\n            <section class="section"><h2>TGS前に確認する項目</h2><ul><li>Google Playの出展有無</li><li>Play Points会員向け企画の有無</li><li>対象ステータス</li><li>受付方法・本人確認方法</li><li>特典内容・数量・時間帯</li></ul></section>\n            <section class="section"><h2>確認先</h2><p><a href="https://support.google.com/googleplay/answer/9080348?co=GENIE.CountryCode%3DJP&amp;hl=ja" target="_blank" rel="noopener noreferrer">Google Play公式：Play Pointsのステータスと特典</a>を基準にし、TGS固有の公式告知が出た場合にこのページを更新します。</p></section>\n        `
  }
];

for (const page of qualityHoldPages) {
  let source = read(page.file);
  source = source.replace(/<title>[\s\S]*?<\/title>/i, `<title>${page.title} - Playポイント計算機</title>`);
  source = source.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${page.description}">`);
  source = source.replace(/<meta name="robots" content="[^"]*">/i, '<meta name="robots" content="noindex, follow, max-image-preview:large">');
  source = source.replace(/<article class="article-content">[\s\S]*?<\/article>/i, `<article class="article-content">${page.body}</article>`);
  write(page.file, source);
}

// 7) 品質保留ページは全サイトマップから外す。
{
  const file = 'scripts/sitemap-sync.cjs';
  let source = read(file);
  source = replaceOnce(
    source,
    "const RETIRED_CONTENT_URLS = new Set([\n  `${SITE_ORIGIN}/articles/2025-12-25-playpoints-not-reflected.html`,\n  `${SITE_ORIGIN}/en/articles/google-play-points-reflection-timing.html`\n]);",
    "const RETIRED_CONTENT_URLS = new Set([\n  `${SITE_ORIGIN}/articles/2025-12-25-playpoints-not-reflected.html`,\n  `${SITE_ORIGIN}/en/articles/google-play-points-reflection-timing.html`\n]);\nconst SEARCH_QUALITY_HOLD_URLS = new Set([\n  `${SITE_ORIGIN}/articles/2026-08-17-diamond-valley-festival-guide.html`,\n  `${SITE_ORIGIN}/articles/2026-08-17-tgs-google-play-vip.html`\n]);",
    'sitemap quality hold set'
  );
  source = replaceOnce(
    source,
    "    .map(article => ({\n      url: `${SITE_ORIGIN}/${String(article.file).replace(/^\\.\\.\\//, '')}`,\n      lastmod: article.modified || article.date\n    }));",
    "    .map(article => ({\n      url: `${SITE_ORIGIN}/${String(article.file).replace(/^\\.\\.\\//, '')}`,\n      lastmod: article.modified || article.date\n    }))\n    .filter(entry => !SEARCH_QUALITY_HOLD_URLS.has(entry.url));",
    'blog sitemap quality filter'
  );
  source = replaceOnce(
    source,
    "    ...NON_PLAYPOINT_URLS,\n    ...RETIRED_CONTENT_URLS,\n    ...getDedicatedSitemapUrls(rootDir)",
    "    ...NON_PLAYPOINT_URLS,\n    ...RETIRED_CONTENT_URLS,\n    ...SEARCH_QUALITY_HOLD_URLS,\n    ...getDedicatedSitemapUrls(rootDir)",
    'main sitemap quality exclusion'
  );
  source = replaceOnce(
    source,
    "  RETIRED_CONTENT_URLS,",
    "  RETIRED_CONTENT_URLS,\n  SEARCH_QUALITY_HOLD_URLS,",
    'sitemap export quality hold'
  );
  write(file, source);
}

// 8) 回帰テストを追加。
write('tests/monetization-search-quality.test.cjs', `'use strict';\n\nconst assert = require('node:assert/strict');\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst test = require('node:test');\n\nconst root = path.resolve(__dirname, '..');\nconst read = (file) => fs.readFileSync(path.join(root, file), 'utf8');\nconst SLOT = '${SLOT}';\n\ntest('記事・LP・ゲームの管理広告は有効な広告ユニットIDを持つ', () => {\n  const targets = [\n    ['articles/2025-12-25-campaign.html', 'article-ad-container'],\n    ['status/gold/index.html', 'lp-ad-container'],\n    ['games/fgo/index.html', 'game-ad-container'],\n    ['en/games/fgo/index.html', 'game-ad-container']\n  ];\n  for (const [file, klass] of targets) {\n    const html = read(file);\n    if (!html.includes(klass)) continue;\n    const blocks = html.match(new RegExp('<div class=\\"' + klass + '\\"[\\s\\S]*?<\\/div>', 'g')) || [];\n    assert.ok(blocks.length > 0, file + ': 管理広告枠がありません');\n    for (const block of blocks) {\n      assert.ok(block.includes('data-ad-slot=\\"' + SLOT + '\\"'), file + ': data-ad-slot がありません');\n    }\n  }\n});\n\ntest('記事・LP・ゲームの広告初期化経路が共通ローダーと同意管理に接続される', () => {\n  const article = read('blog/article.js');\n  const thirdParty = read('js/third-party.js');\n  const game = read('games/fgo/index.html');\n  assert.ok(article.includes('.article-ad-container ins.adsbygoogle'));\n  assert.ok(article.includes('PlayPointConsent.whenGranted(loadArticleAdsense)'));\n  assert.ok(thirdParty.includes('.lp-ad-container ins.adsbygoogle, .game-ad-container ins.adsbygoogle'));\n  assert.ok(thirdParty.includes('runAfterConsent(initializeManagedAds)'));\n  assert.ok(game.includes('js/third-party.js'));\n});\n\ntest('記事・ブログGA4はconfig後にreadinessを立てる', () => {\n  const source = read('blog/components.js');\n  const configIndex = source.indexOf(\"window.gtag('config', GA_MEASUREMENT_ID)\");\n  const readyIndex = source.indexOf('window.PlayPointAnalytics.markAnalyticsReady()');\n  assert.ok(configIndex >= 0);\n  assert.ok(readyIndex > configIndex);\n  assert.ok(!source.includes('window.PlayPointAnalytics.flushPending()'));\n});\n\ntest('未確認の未来イベント記事は検索品質保留としてnoindex・サイトマップ除外する', () => {\n  const files = [\n    'articles/2026-08-17-diamond-valley-festival-guide.html',\n    'articles/2026-08-17-tgs-google-play-vip.html'\n  ];\n  const mainSitemap = read('sitemap.xml');\n  const blogSitemap = read('blog/sitemap.xml');\n  for (const file of files) {\n    const html = read(file);\n    const name = path.basename(file);\n    assert.match(html, /name=\\"robots\\" content=\\"noindex, follow, max-image-preview:large\\"/);\n    assert.match(html, /公式発表待ち|未確認/);\n    assert.ok(!mainSitemap.includes(name), name + ': main sitemapに残っています');\n    assert.ok(!blogSitemap.includes(name), name + ': blog sitemapに残っています');\n  }\n});\n\ntest('広告生成スクリプト自体もdata-ad-slotを保持する', () => {\n  for (const file of [\n    'scripts/insert-article-ads.cjs',\n    'scripts/insert-lp-monetization.cjs',\n    'scripts/generate-game-simulators.cjs'\n  ]) {\n    assert.ok(read(file).includes('data-ad-slot=\\"' + SLOT + '\\"'), file);\n  }\n});\n`);

console.log('Applied 2026-08-18 monetization, analytics, and search-quality audit fixes.');
