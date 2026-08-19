'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  listedJapaneseArticles,
  syncBlogStaticArticleIndex,
  syncBlogStaticArticleTitles
} = require('../scripts/blog-feeds.cjs');
const { syncHumanSitemapListedArticles } = require('../scripts/sitemap-sync.cjs');

function writeBlogFixture(root, extraCategory = '') {
  fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
  const file = path.join(root, 'blog', 'index.html');
  fs.writeFileSync(file, [
    '<section class="static-article-fallback" aria-label="新着記事の静的リンク">',
    '                <h2>新着記事</h2>',
    '                <ul>',
    '                    <li><a href="../articles/old.html">旧タイトル</a></li>',
    '                </ul>',
    '            </section>',
    '            <section class="static-article-links">',
    '                <section class="static-topic-group" data-topic-cluster="ランク">',
    '                    <h3>ランク</h3>',
    '                    <ul>',
    '                        <li><a href="../articles/rank-old.html">旧ランク</a></li>',
    '                    </ul>',
    '                </section>',
    '                <section class="static-topic-group" data-topic-cluster="トラブル">',
    '                    <h3>トラブル</h3>',
    '                    <ul></ul>',
    '                </section>',
    '                <section class="static-topic-group" data-topic-cluster="使い方">',
    '                    <h3>使い方</h3>',
    '                    <ul></ul>',
    '                </section>',
    '                <section class="static-topic-group" data-topic-cluster="キャンペーン">',
    '                    <h3>キャンペーン</h3>',
    '                    <ul></ul>',
    '                </section>',
    extraCategory,
    '            </section>'
  ].join('\n'), 'utf8');
  return file;
}

test('static blog article links follow article registry titles and remain idempotent', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-blog-index-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
  const file = path.join(root, 'blog', 'index.html');
  fs.writeFileSync(file, [
    '<section class="static-article-fallback">',
    '<a href="../articles/new-guide.html">Old title</a>',
    '<a href="../tools/not-an-article.html">Keep this label</a>',
    '</section>'
  ].join('\n'));

  const articles = [{
    file: '../articles/new-guide.html',
    title: 'New & safer <guide>'
  }];
  assert.equal(syncBlogStaticArticleTitles(root, articles), 1);
  const once = fs.readFileSync(file, 'utf8');
  assert.match(once, /New &amp; safer &lt;guide&gt;/);
  assert.match(once, /Keep this label/);
  assert.equal(syncBlogStaticArticleTitles(root, articles), 0);
  assert.equal(fs.readFileSync(file, 'utf8'), once);
});

test('公開記事は静的新着とカテゴリ一覧へ入り、非掲載は除外する', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-blog-index-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = writeBlogFixture(root);
  const articles = [
    {
      file: '../articles/new-trouble.html',
      title: '新しいトラブル',
      date: '2026-08-19',
      category: 'トラブル'
    },
    {
      file: '../articles/rank-old.html',
      title: '更新したランク',
      date: '2026-08-18',
      category: 'ランク'
    },
    {
      file: '../articles/hidden.html',
      title: '非掲載',
      date: '2026-08-20',
      category: 'トラブル',
      listed: false
    }
  ];

  const first = syncBlogStaticArticleIndex(root, articles);
  assert.equal(first.listed, 2);
  assert.equal(first.latest, 2);
  assert.equal(first.changed, true);
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /href="\.\.\/articles\/new-trouble\.html">新しいトラブル<\/a>/);
  assert.match(html, /data-topic-cluster="トラブル"[\s\S]*href="\.\.\/articles\/new-trouble\.html"/);
  assert.match(html, /data-topic-cluster="ランク"[\s\S]*href="\.\.\/articles\/rank-old\.html">更新したランク<\/a>/);
  assert.doesNotMatch(html, /hidden\.html/);
  assert.doesNotMatch(html, /非掲載/);
  assert.deepEqual(
    listedJapaneseArticles(articles).map(article => article.file),
    ['../articles/new-trouble.html', '../articles/rank-old.html']
  );

  const second = syncBlogStaticArticleIndex(root, articles);
  assert.equal(second.changed, false);
  assert.equal(fs.readFileSync(file, 'utf8'), html);
});

test('未知カテゴリの公開記事は静的一覧へ混ぜず失敗する', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-blog-index-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBlogFixture(root);
  assert.throws(
    () => syncBlogStaticArticleIndex(root, [{
      file: '../articles/misc.html',
      title: 'その他',
      date: '2026-08-19',
      category: 'その他'
    }]),
    /カテゴリが不正/
  );
});

test('PR準備コマンドは日付とアセット版を固定して生成する', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'prepare-pr.cjs'), 'utf8');
  assert.match(source, /PLAYPOINT_MODIFIED_DATE/);
  assert.match(source, /PLAYPOINT_ASSET_VERSION/);
  assert.match(source, /scripts\/build-html\.js/);
  assert.match(source, /scripts\/site-click-depth\.cjs/);
});

test('人向けサイトマップは未掲載の公開記事だけを生成欄へ足す', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-human-sitemap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'blog', 'articles.json'), JSON.stringify([
    {
      file: '../articles/already.html',
      title: '既存',
      date: '2026-08-18',
      category: '使い方'
    },
    {
      file: '../articles/missing.html',
      title: '未掲載 <記事>',
      date: '2026-08-19',
      category: 'トラブル'
    },
    {
      file: '../articles/hidden.html',
      title: '非掲載',
      date: '2026-08-20',
      category: 'トラブル',
      listed: false
    }
  ], null, 2));
  const sitemapPath = path.join(root, 'sitemap.html');
  fs.writeFileSync(sitemapPath, [
    '<section class="group">',
    '      <h2>解説・ヘルプ</h2>',
    '      <ul>',
    '        <li><a href="articles/already.html">既存</a></li>',
    '      </ul>',
    '    </section>',
    '    <section class="group">',
    '      <h2>ポリシー</h2>',
    '    </section>'
  ].join('\n'), 'utf8');

  assert.equal(syncHumanSitemapListedArticles(root), 1);
  const once = fs.readFileSync(sitemapPath, 'utf8');
  assert.match(once, /generated-listed-articles:start/);
  assert.match(once, /href="articles\/missing\.html">未掲載 &lt;記事&gt;<\/a>/);
  assert.match(once, /href="articles\/already\.html">既存<\/a>/);
  assert.doesNotMatch(once, /hidden\.html/);
  assert.ok(once.indexOf('generated-listed-articles:start') < once.indexOf('ポリシー'));
  assert.equal(syncHumanSitemapListedArticles(root), 1);
  assert.equal(fs.readFileSync(sitemapPath, 'utf8'), once);
});
