'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { syncBlogStaticArticleTitles } = require('../scripts/blog-feeds.cjs');

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
