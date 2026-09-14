'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const { ALL_GUIDES, LOCALES, renderGuide } = require('../scripts/intl-game-guide-expansion.cjs');
const { extractSupplementalMetaItems, getArticleFiles } = require('../scripts/article-date-contract.cjs');
const { getJapaneseArticleRepoPaths } = require('../scripts/game-guide-article-catalog.cjs');
const { ARTICLE_TABLE_OVERFLOW_PATHS, wrapUnwrappedTables } = require('../scripts/article-table-overflow-sync.cjs');

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function heroMetaText(html) {
  const match = String(html).match(/<p\b(?=[^>]*class=["'][^"']*\bhero-meta\b[^"']*["'])[^>]*>[\s\S]*?<\/p>/i);
  return match ? stripTags(match[0]) : '';
}

test('韓国語・繁体字ゲーム記事の共通UIを各言語で表示する', () => {
  for (const localeKey of ['ko', 'tw']) {
    const locale = LOCALES[localeKey];
    for (const guide of ALL_GUIDES) {
      const html = renderGuide(localeKey, guide);
      assert.match(html, new RegExp('aria-label="' + locale.toc + '"'));
      assert.match(html, new RegExp('>' + locale.toc + '<'));
      assert.match(html, new RegExp('aria-label="' + locale.authorAria + '"'));
      assert.match(html, new RegExp('>' + locale.authorLabel + '<'));
      assert.ok(html.includes(locale.earningRuleLink));
      assert.ok(html.includes(locale.levelsRuleLink));
      assert.doesNotMatch(html, /aria-label="Table of contents"|>Contents<|aria-label="Article author"|>Article author</);
      assert.doesNotMatch(html, />Google Play Points earning rules —|>Google Play Points levels —/);
    }
  }
});

test('ゲーム記事は共通Play Points説明を補助UIへ寄せ、本文の判断軸を重複させない', () => {
  for (const localeKey of Object.keys(LOCALES)) {
    for (const guide of ALL_GUIDES) {
      const html = renderGuide(localeKey, guide);
      assert.match(html, /class="decision-box article-common-rule"/);
      const toc = html.match(/<nav class="intl-article-toc"[\s\S]*?<\/nav>/)?.[0] || '';
      assert.doesNotMatch(toc, /#google-play-rule/);
      const decisionSection = html.match(/<section class="section" id="decision-guide">([\s\S]*?)<\/section>/)?.[1] || '';
      assert.equal((decisionSection.match(/<li>/g) || []).length, guide.content[localeKey].decisions.length - 1, String(localeKey) + '/' + guide.slug + ': decision list still repeats the lead decision');
    }
  }
});

test('日付同期は旧ラベルと裸のISO日付を補足情報として残さない', () => {
  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">Published 2026-09-13 · Updated 2026-09-13 · Official sources checked 2026-09-13 · United States guide · 2026-09-13</p>', 'en'), ['United States guide']);
  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">게시 2026-09-13 · 업데이트 2026-09-13 · 공식 정보 확인 2026-09-13</p>', 'ko'), []);
  assert.deepEqual(extractSupplementalMetaItems('<p class="hero-meta">發布 2026-09-13 · 更新 2026-09-13 · 官方資料確認 2026-09-13</p>', 'tw'), []);
});

test('公開中の海外記事hero-metaに旧日付ラベルや裸ISO日付を残さない', () => {
  for (const relativePath of getArticleFiles(root).filter(file => /^(?:en|ko|tw)\//.test(file))) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const meta = heroMetaText(html);
    if (!meta) continue;
    assert.doesNotMatch(meta, /(?:^|[·・]\s*)\d{4}-\d{2}-\d{2}(?:\s*[·・]|$)/, relativePath);
    if (relativePath.startsWith('en/')) assert.doesNotMatch(meta, /Official sources checked/i, relativePath);
    if (relativePath.startsWith('ko/')) assert.doesNotMatch(meta, /(?:^|·\s*)게시\s+\d{4}-\d{2}-\d{2}/, relativePath);
    if (relativePath.startsWith('tw/')) assert.doesNotMatch(meta, /官方資料確認/, relativePath);
  }
});

test('日本語記事の著者プロフィールを見出し階層から外す', () => {
  let profiles = 0;
  for (const relativePath of getJapaneseArticleRepoPaths(root)) {
    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute)) continue;
    const html = fs.readFileSync(absolute, 'utf8');
    if (!html.includes('author-profile-box')) continue;
    profiles += 1;
    assert.doesNotMatch(html, /<h4(?:\s[^>]*)?>\s*この記事の著者：/i, relativePath);
    assert.match(html, /class="author-profile-title"[^>]*>この記事の著者：/i, relativePath);
  }
  assert.ok(profiles >= 60, 'expected broad author coverage, got ' + profiles);
});

test('監査で見つかった4記事の表は横スクロール境界を持つ', () => {
  for (const relativePath of ARTICLE_TABLE_OVERFLOW_PATHS) {
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.equal(wrapUnwrappedTables(html), html, relativePath);
    assert.match(html, /class="table-wrap"/, relativePath);
  }
});
