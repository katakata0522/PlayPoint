'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const blogUtils = require('../blog/utils.js');
const {
  buildArticleSearchIndex,
  articleMatchesSearch,
  articleMatchesGameTitle,
  clampPageJump,
  GAME_TITLE_FILTERS
} = blogUtils;

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('stgの静的アセットでも共通検索と保存コード・実行順・指紋を保持し、FGOなどの略称で検索できる', () => {
  const tempRoot=fs.realpathSync(require('node:os').tmpdir());
  const folder=fs.mkdtempSync(path.join(tempRoot,'pp-stg-blog-'));
  try {
    const built=require('node:child_process').spawnSync(process.execPath,[path.join(root,'tools/wordpress/build-blog-staging.mjs'),folder],{encoding:'utf8',windowsHide:true});
    assert.equal(built.status,0,built.stderr);
    const php=fs.readFileSync(path.join(folder,'playpoint-catalog-blog.php'),'utf8');
    const marker="base64_decode('",start=php.indexOf(marker)+marker.length,end=php.indexOf("'",start);
    const {html,assets}=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(php.slice(start,end),'base64')));
    assert.equal(assets.length,4);
    const bodies=new Map(assets.map(asset=>{
      const body=fs.readFileSync(path.join(folder,'assets/wp-catalog',asset.name),'utf8');
      const sha=require('node:crypto').createHash('sha256').update(body).digest('hex');
      assert.equal(sha,asset.sha256);assert.ok(asset.name.includes(sha.slice(0,20)));
      assert.ok(html.includes(asset.url));assert.ok(html.includes('sha256-'+Buffer.from(sha,'hex').toString('base64')));
      return [asset.name,body];
    }));
    const runtime=assets.find(asset=>asset.sources.includes('blog/script.js'));
    assert.deepEqual(runtime.sources,['js/article-search.js','js/reading-library.js','blog/utils.js','blog/components.js','blog/script.js']);
    for(const name of ['js/article-search.js','js/reading-library.js'])assert.ok(bodies.get(runtime.name).includes(read(name).replaceAll('\r\n','\n')),name);
    const guide=assets.find(asset=>asset.sources.includes('js/guide-navigation.js')),theme=assets.find(asset=>asset.sources.includes('js/reading-theme.js'));
    assert.ok(html.indexOf(guide.url)<html.indexOf(theme.url));
    const runtimeScript=html.indexOf('<script src="'+runtime.url+'"');
    assert.ok(runtimeScript>html.indexOf('id="pp-blog-config"'));assert.ok(!html.slice(runtimeScript,html.indexOf('>',runtimeScript)).includes('defer'));
    assert.ok(!/<script\b(?![^>]*\btype="application\/(?:json|ld\+json)")[^>]*>[^<]+<\/script>/i.test(html),'executable code is external');
    assert.ok(html.includes('<noscript>'));assert.ok(html.includes('<style data-stage-source="blog/noscript.css">'));
    assert.ok(!bodies.get(assets.find(asset=>asset.sources.includes('blog/style.css')).name).includes('.skeleton-card {\n    display: none !important;'));
    const headers=fs.readFileSync(path.join(folder,'assets/wp-catalog/.htaccess'),'utf8');
    assert.ok(headers.includes('private, max-age=31536000, immutable'));assert.ok(headers.includes('%{REQUEST_STATUS} == 200 || %{REQUEST_STATUS} == 304'));assert.ok(!/AuthType|AuthUserFile|Content-Security-Policy/.test(headers));
    const engine=read('js/article-search.js').replaceAll('\r\n','\n'),emitted=bodies.get(runtime.name),first=emitted.indexOf(engine);
    const context={module:{exports:{}}};vm.runInNewContext(emitted.slice(first,first+engine.length),context);
    assert.equal(context.module.exports.matches({title:'FGO天井330回の費用'},'FGO','ja'),true);
    assert.equal(context.module.exports.matches({title:'パズル＆ドラゴンズのパス'},'パズドラ','ja'),true);
  } finally {
    const resolved=fs.realpathSync(folder);assert.equal(path.dirname(resolved),tempRoot);assert.ok(path.basename(resolved).startsWith('pp-stg-blog-'));
    fs.rmSync(resolved,{recursive:true});
  }
});

test('移行前点検は大文字や空白・属性付きのscript終了タグでも参照と本文を記録する', async () => {
  const {scriptBlocks}=await import(require('node:url').pathToFileURL(path.join(root,'tools/wordpress/audit-migration.mjs')).href);
  const blocks=scriptBlocks('<SCRIPT src="calculator.js">Math.floor(2)</SCRIPT \n><script>second</script data-extra>');
  assert.equal(blocks.length,2);
  assert.ok(blocks[0][1].includes('calculator.js'));
  assert.equal(blocks[0][2],'Math.floor(2)');
  assert.equal(blocks[1][2],'second');
});

test('stg一覧のページ送り・検索・保存先を保ち、画像は固定allowlistだけへ変換する', () => {
  const {link,image}=require('../tools/wordpress/blog-links.js');
  const config={origin:'https://stg.playpoint-sim.com',paths:['/articles/one.html'],images:{'articles/thumbnails/one.webp':'image-key.webp'}};
  const page=new URL(link('/blog/page/2/?q=Play%20Pass',config));
  assert.equal(page.pathname,'/blog/');
  assert.equal(page.searchParams.get('page'),'2');
  assert.equal(page.searchParams.get('q'),'Play Pass');
  assert.equal(page.searchParams.get('pp_flow'),'normal');
  assert.equal(page.searchParams.get('pp_catalog'),'live');
  assert.equal(link('../articles/one.html#conditions',config),'https://stg.playpoint-sim.com/articles/one.html#conditions');
  assert.equal(link('/articles/two.html',config),'https://playpoint-sim.com/articles/two.html');
  assert.equal(link('#reading-library',config),'#reading-library');
  assert.equal(link('https://external.example/blog/',config),'https://external.example/blog/');
  assert.equal(image('../articles/thumbnails/one.webp',config),'/cms/index.php?pp_blog_image=image-key.webp');
  assert.equal(image('../../wp-config.php',config),'../../wp-config.php');
  assert.equal(image('https://external.example/one.webp',config),'https://external.example/one.webp');
});

test('listed blog search indexes title, description, tags, and category in memory', () => {
  const article = {
    title: 'パズドラ課金とPlay Points',
    description: 'パスの確認方法',
    tags: ['パズドラ', 'Play Points'],
    category: '使い方'
  };
  const index = buildArticleSearchIndex(article);
  assert.match(index, /パズドラ課金/);
  assert.match(index, /パスの確認方法/);
  assert.match(index, /play points/);
  assert.match(index, /使い方/);
  assert.equal(articleMatchesSearch(article, 'パズドラ 使い方'), true);
  assert.equal(articleMatchesSearch(article, 'ドッカン'), false);
  assert.equal(articleMatchesSearch(article, 'パズドラ   課金'), true);
});

test('game-title filtering matches title or tags without a fifth articles.json category', () => {
  const registry = JSON.parse(read('blog/articles.json'));
  assert.ok(registry.length > 0);
  assert.ok(GAME_TITLE_FILTERS.length > 0);
  assert.equal(new Set(GAME_TITLE_FILTERS).size, GAME_TITLE_FILTERS.length);
  assert.ok(GAME_TITLE_FILTERS.every(value => typeof value === 'string' && value.trim()));
  assert.equal(
    articleMatchesGameTitle({ title: '【ウマ娘】5.5周年', tags: ['ウマ娘'] }, 'ウマ娘'),
    true
  );
  assert.equal(
    articleMatchesGameTitle({ title: 'Play Pointsがロックされた', tags: ['ロック'] }, 'ウマ娘'),
    false
  );
});

test('reader-facing browse taxonomy filters the full public corpus without breaking legacy categories', () => {
  const registry = JSON.parse(read('blog/articles.json')).filter(article => article.listed !== false);
  const topics = ['はじめて・基本', 'ランク・ステータス', '貯める・キャンペーン', '使う・交換', 'トラブル・アカウント', 'ゲーム別課金', '最新情報・イベント'];
  assert.ok(registry.length > topics.length);
  assert.ok(registry.every(article => topics.includes(article.browseCategory)));
  for (const topic of topics) {
    const expectedCount = registry.filter(article => article.browseCategory === topic).length;
    assert.ok(expectedCount > 0, topic);
    const hits = blogUtils.filterListedArticles(registry, { browseCategory: topic });
    assert.equal(hits.length, expectedCount, topic);
    assert.ok(hits.every(article => article.browseCategory === topic), topic);
  }
  const legacyTrouble = blogUtils.filterListedArticles(registry, { category: 'トラブル' });
  assert.ok(legacyTrouble.length > 0);
  assert.ok(legacyTrouble.every(article => article.category === 'トラブル'));
});

test('ゲームの正式名・略称・旧URLから同じ公開記事を探せる', () => {
  const registry = JSON.parse(read('blog/articles.json')).filter(article => article.listed !== false);
  const aliases = ['ポケスリ', 'ポケモンスリープ', 'Pokémon Sleep', 'Pokemon Sleep'];
  const expected = blogUtils.filterListedArticles(registry, { gameTitle: aliases[0] }).map(article => article.id).sort();
  assert.ok(expected.length >= 2);
  for (const alias of aliases) {
    assert.deepEqual(blogUtils.filterListedArticles(registry, { gameTitle: alias }).map(article => article.id).sort(), expected);
    assert.equal(blogUtils.resolveGameTitle(alias, registry), 'ポケモンスリープ');
    assert.deepEqual(blogUtils.filterListedArticles(registry, { search: alias }).map(article => article.id).sort(), expected);
  }
  assert.equal(blogUtils.gameTitleFilters(registry).filter(name => aliases.includes(name)).length, 1);
  assert.equal(blogUtils.gameTitleLabel('ポケモンスリープ'), 'ポケモンスリープ（ポケスリ）');
  assert.equal(blogUtils.articleMatchesGameTitle({ title:'ポケモンGOでポイントを使う' }, 'ポケスリ'), false);
});

test('page-number jump clamps full-width digits into the published page range', () => {
  assert.equal(clampPageJump('３', 10), 3);
  assert.equal(clampPageJump('0', 10), 1);
  assert.equal(clampPageJump('99', 10), 10);
  assert.equal(clampPageJump('abc', 10), 1);
});

test('listed corpus AND search and game-title filter share one callable listing filter', () => {
  assert.equal(typeof blogUtils.filterListedArticles, 'function');
  const registry = JSON.parse(read('blog/articles.json'));
  const andHits = blogUtils.filterListedArticles(registry, { search: 'パズドラ 使い方' });
  assert.ok(andHits.some(article => article.id === 'pad-puzzle-and-dragons-play-points'));
  assert.ok(andHits.every(article => articleMatchesSearch(article, 'パズドラ 使い方')));
  assert.equal(
    blogUtils.filterListedArticles(registry, { search: 'パズドラ ドッカン' }).length,
    0
  );

  const uma = blogUtils.filterListedArticles(registry, { gameTitle: 'ウマ娘' });
  assert.ok(uma.length >= 1);
  assert.ok(uma.length < registry.length);
  assert.ok(uma.every(article => articleMatchesGameTitle(article, 'ウマ娘')));
  assert.equal(uma.some(article => (article.title || '').includes('ロック')), false);
});


test('blog listing keeps content visible without scroll-animation success and has one canonical footer', () => {
  const html = read('blog/index.html');
  const style = read('blog/style.css');

  assert.equal((html.match(/<footer\b/g) || []).length, 1, 'blog/index.html must expose exactly one footer');
  assert.doesNotMatch(html, /class="blog-footer"/, 'legacy duplicate footer must not return');
  assert.doesNotMatch(style, /\.fade-in-up\s*\{[^}]*opacity:\s*0/s, 'primary article cards must never default to opacity:0');
});


test('search sorting uses the selected meaning, stays stable, and leaves source records unchanged', () => {
  const list = Object.freeze([
    Object.freeze({ id:'old', title:'Guide', description:'天井',date:'2025-12-25', modified:'2026-09-18' }),
    Object.freeze({ id:'new', title:'天井', description:'Guide',date:'2026-09-13', modified:'2026-09-13' }),
    Object.freeze({ id:'missing', title:'Other',date:'invalid' })
  ]);
  const order = mode => blogUtils.sortListedArticles(list,{mode,search:'天井'}).map(a=>a.id);
  assert.deepEqual(order('relevance'), ['new','old','missing']);
  assert.deepEqual(order('oldest'), ['old','new','missing']);
  assert.deepEqual(order('newest'), ['new','old','missing']);
  assert.deepEqual(order('updated'), ['old','new','missing']);
  assert.deepEqual(list.map(a=>a.id),['old','new','missing']);
  assert.deepEqual(blogUtils.sortListedArticles([{id:'a',date:'2026-01-01'},{id:'b',date:'2026-01-01'}],{mode:'newest'}).map(a=>a.id), ['a','b']);
});

test('URL and page-input normalization rejects fractional, negative and malformed input', () => {
  for (const input of [-1,0,'-2','2.7','1e2','2junk','',NaN,Infinity,'9999999999999999999999']) assert.equal(clampPageJump(input,13),1,String(input));
  assert.equal(clampPageJump(' ３ ',13),3);
  assert.equal(clampPageJump('999',13),13);
  assert.equal(clampPageJump('2',0),1);
  assert.equal(blogUtils.validArticleDate('2026-02-30'),'');
  assert.equal(blogUtils.validArticleDate('2024-02-29'),'2024-02-29');
});

test('broken thumbnails use same-origin fallback and cannot loop or replace the article link', () => {
  const image = { src:'../images/game-icons/fgo.webp', alt:'FGO', onerror:()=>{}, classList:{add(){}} };
  blogUtils.handleImageError(image);
  assert.equal(image.onerror,null);
  assert.equal(image.src, '/images/article-placeholder.svg');
  assert.equal(image.alt,'');
  assert.ok(fs.existsSync(path.join(root,image.src)));
});

test('関連記事カードの実生成はゲームアイコンと一般webpを保持し、外部画像だけをplaceholderへ置換する', () => {
  const source = read('blog/article.js');
  const extract = name => {
    const match = source.match(new RegExp(`    function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n    \\}`));
    assert.ok(match, `blog/article.js に ${name} がありません`);
    return match[0];
  };
  const runtime = vm.runInNewContext(`(() => {
    ${extract('sanitizeArticleFile')}
    ${extract('sanitizeArticleThumbnail')}
    ${extract('normalizeArticle')}
    ${extract('relatedCardMarkup')}
    ${extract('isSquareRelatedThumbnail')}
    ${extract('createRelatedCard')}
    return { normalizeArticle, relatedCardMarkup, createRelatedCard };
  })()`, {
    CONFIG: { placeholderImage: '/images/article-placeholder.svg' },
    getUtils: () => blogUtils,
    document: {
      createElement() {
        const image = { addEventListener() {} };
        return {
          href: '', className: '', innerHTML: '',
          querySelector(selector) { return selector === 'img' ? image : null; }
        };
      }
    }
  });

  const game = runtime.normalizeArticle({
    title: 'NIKKEの課金', date: '2026-10-03', category: 'ゲーム別課金',
    file: '../games/nikke/guide/index.html', thumbnail: '../images/game-icons/nikke.webp'
  });
  const gameMarkup = runtime.relatedCardMarkup(game, blogUtils);
  assert.match(gameMarkup, /<img src="\.\.\/images\/game-icons\/nikke\.webp"/);
  assert.match(gameMarkup, /<h4>NIKKEの課金<\/h4>/);
  assert.equal(runtime.createRelatedCard(game).className, 'related-card related-card--square');

  const generic = runtime.normalizeArticle({
    title: '週次特典', date: '2026-10-03', category: '最新情報',
    file: '../articles/weekly.html', thumbnail: '../articles/thumbnails/weekly-square-v1.webp'
  });
  assert.match(runtime.relatedCardMarkup(generic, blogUtils), /<img src="\.\.\/articles\/thumbnails\/weekly-square-v1\.webp"/);
  assert.equal(runtime.createRelatedCard(generic).className, 'related-card related-card--square');

  const untrusted = runtime.normalizeArticle({
    title: '外部画像', date: '2026-10-03', category: 'トラブル',
    file: '../articles/untrusted.html', thumbnail: 'https://evil.example/tracker.svg'
  });
  assert.equal(untrusted.thumbnail, '/images/article-placeholder.svg');
  assert.match(runtime.relatedCardMarkup(untrusted, blogUtils), /<img src="\/images\/article-placeholder\.svg"/);
  assert.equal(runtime.createRelatedCard(untrusted).className, 'related-card');
  const css = read('blog/style.css');
  assert.match(css, /\.related-card--square \.related-card-thumb\s*\{[\s\S]*?aspect-ratio:\s*1/);
  assert.match(css, /\.related-card--square \.related-card-thumb img\s*\{[\s\S]*?object-fit:\s*contain/);
});

test('editorial thumbnails can opt into a sanitized focal position', () => {
  const articles = JSON.parse(read('blog/articles.json'));
  const blackDiamond = articles.find(article => article.id === 'black-diamond-diamond-vip-2026');
  assert.ok(blackDiamond);
  assert.equal(blackDiamond.thumbnail, '../articles/thumbnails/black-diamond-diamond-vip-2026-square-v1.webp');
  assert.equal(blackDiamond.thumbnailKind, 'generic');
  assert.notEqual(blackDiamond.thumbnail, blackDiamond.ogp, '一覧サムネイルと記事OGPは独立している');
  assert.equal(blackDiamond.thumbnailPosition, 'left');

  const css = read('blog/article-list.css');
  const normalized = blogUtils.normalizeArticle(blackDiamond);
  assert.equal(normalized.thumbnailPosition, 'left');
  assert.match(blogUtils.articleCardMarkup(normalized), /card-thumb--focus-left/);
  assert.equal(blogUtils.normalizeArticle({ ...blackDiamond, thumbnailPosition: 'left" onclick="bad' }).thumbnailPosition, 'center');
  assert.match(css, /\.card-thumb--focus-left img/);
  assert.match(css, /object-position:left center/);
});

test('reading theme resolves saved intent before the system preference and ignores invalid values', () => {
  const {resolveTheme} = require('../js/reading-theme.js');
  assert.equal(resolveTheme({theme:'dark'},false),'dark');
  assert.equal(resolveTheme({theme:'light'},true),'light');
  assert.equal(resolveTheme(null,true),'dark');
  assert.equal(resolveTheme({theme:'invalid'},false),'light');
});


test('ゲーム略称と複合検索から、記事がない場合も該当する計算機へ案内する', () => {
  const calculators = JSON.parse(read('blog/game-calculators.json'));
  for (const [query, id] of [['ブルアカ 課金', 'bluearchive'], ['鳴潮 月パス', 'wutheringwaves'], ['メメントモリ', 'mementomori'], ['学マス', 'gakumas'], ['ニケ', 'nikke'], ['プロスピA', 'prospi-a']]) {
    assert.deepEqual(blogUtils.relatedGameCalculators(calculators, query, '').map(game => game.id), [id], query);
  }
  assert.deepEqual(blogUtils.relatedGameCalculators(calculators, '存在しないゲーム', ''), []);
  assert.deepEqual(blogUtils.relatedGameCalculators(calculators, '', 'ブルアカ').map(game => game.id), ['bluearchive']);
  assert.deepEqual(blogUtils.relatedGameCalculators([{title:'ブルアカ',id:'bluearchive',href:'https://example.com'}], 'ブルアカ', ''), []);
  assert.ok(blogUtils.gameTitleFilters([{gameTitle:'追加ゲーム'}]).includes('追加ゲーム'));
  for (const game of calculators) assert.ok(fs.existsSync(path.join(root, game.href, 'index.html')), game.href);
});
