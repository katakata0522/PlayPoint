'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  HUMAN_SITEMAP_TASK_HUB_MARKER,
  syncHumanSitemapListedArticles
} = require('../scripts/sitemap-sync.cjs');

const rootDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

test('human sitemap is a task hub instead of a full URL warehouse', () => {
  const html = read('sitemap.html');

  assert.match(html, new RegExp(HUMAN_SITEMAP_TASK_HUB_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /目的から探す/);
  assert.match(html, /🧮 計算する/);
  assert.match(html, /🎮 ゲーム別に調べる/);
  assert.match(html, /🆘 困りごと・制度を調べる/);
  assert.match(html, /🌍 国・地域を選ぶ/);
  assert.match(html, /🔒 ポリシー/);

  for (const href of ['./', 'en/', 'ko/', 'tw/', 'hk/', 'in/']) {
    assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }

  assert.match(html, /href="feed\.xml">RSSフィード<\/a>/);
  assert.doesNotMatch(html, /href="sitemap\.xml"/);
  assert.doesNotMatch(html, /href="robots\.txt"/);
  assert.doesNotMatch(html, /href="atom\.xml"/);
  assert.doesNotMatch(html, /generated-listed-articles/);
  assert.doesNotMatch(html, /<h2>公開中の解説記事<\/h2>/);
  assert.doesNotMatch(html, /<h2>International shortcuts<\/h2>/);
  assert.equal((html.match(/<footer\b/g) || []).length, 1, 'human sitemap must expose exactly one footer');

  const anchorCount = (html.match(/<a\b/g) || []).length;
  assert.ok(anchorCount < 60, `human sitemap should stay concise, found ${anchorCount} links`);
});

test('task-hub mode prevents generated full article lists from returning', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-human-sitemap-task-hub-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'blog', 'articles.json'), JSON.stringify([
    {
      file: '../articles/new-guide.html',
      title: '新しい記事',
      date: '2026-09-15',
      category: '使い方'
    }
  ]), 'utf8');

  const sitemapPath = path.join(root, 'sitemap.html');
  fs.writeFileSync(sitemapPath, [
    `<main ${HUMAN_SITEMAP_TASK_HUB_MARKER}>`,
    '<a href="blog/">記事一覧</a>',
    '<!-- generated-listed-articles:start -->',
    '<section data-generated-listed-articles="true"><a href="articles/old.html">旧一覧</a></section>',
    '<!-- generated-listed-articles:end -->',
    '</main>'
  ].join('\n'), 'utf8');

  assert.equal(syncHumanSitemapListedArticles(root), 0);
  const html = fs.readFileSync(sitemapPath, 'utf8');
  assert.doesNotMatch(html, /generated-listed-articles/);
  assert.doesNotMatch(html, /new-guide\.html/);
  assert.match(html, /href="blog\/"/);
});
