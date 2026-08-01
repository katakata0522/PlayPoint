'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const clusters = {
  reward: {
    ja: 'articles/2026-07-31-super-weekly-reward.html',
    en: 'en/articles/google-play-points-super-weekly-reward.html',
    ko: 'ko/articles/google-play-points-super-weekly-reward.html',
    tw: 'tw/articles/google-play-points-super-weekly-reward.html'
  },
  quests: {
    ja: 'articles/2026-07-31-google-play-quests.html',
    en: 'en/articles/google-play-quests.html',
    ko: 'ko/articles/google-play-quests.html',
    tw: 'tw/articles/google-play-quests.html'
  }
};

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function schemas(html, file) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      assert.fail(`${file}: invalid JSON-LD: ${error.message}`);
    }
  });
}

test('reward and quest topics have complete Japanese, English, Korean and Taiwan clusters', () => {
  for (const [topic, cluster] of Object.entries(clusters)) {
    const paths = Object.values(cluster);
    for (const file of paths) assert.ok(fs.existsSync(path.join(root, file)), `${topic}: missing ${file}`);

    for (const [locale, file] of Object.entries(cluster)) {
      const html = read(file);
      for (const target of paths) {
        assert.ok(
          html.includes(`href="https://playpoint-sim.com/${target}"`),
          `${file}: missing reciprocal alternate for ${target}`
        );
      }
      assert.match(html, /hreflang="x-default"/, `${file}: x-default is missing`);
      assert.match(html, new RegExp(`"inLanguage"\\s*:\\s*"${locale === 'tw' ? 'zh-TW' : locale}"`), `${file}: inLanguage mismatch`);
    }
  }
});

test('new international guides are substantial, sourced and usable instead of thin translations', () => {
  const international = Object.values(clusters).flatMap(cluster => [cluster.en, cluster.ko, cluster.tw]);

  for (const file of international) {
    const html = read(file);
    const text = visibleText(html);
    assert.ok(text.length >= 1500, `${file}: visible copy is too thin (${text.length} chars)`);
    assert.ok((html.match(/<h2\b/g) || []).length >= 6, `${file}: needs at least six h2 sections`);
    assert.ok((html.match(/<p\b/g) || []).length >= 12, `${file}: needs at least twelve paragraphs`);
    assert.match(html, /official-source-note/, `${file}: official source section is missing`);
    assert.match(html, /related-links-section/, `${file}: related guide section is missing`);
    assert.match(html, /rel="author"/, `${file}: visible author attribution is missing`);
    assert.ok(schemas(html, file).some(schema => schema['@type'] === 'Article'), `${file}: Article JSON-LD missing`);
    assert.ok(schemas(html, file).some(schema => schema['@type'] === 'FAQPage'), `${file}: FAQPage JSON-LD missing`);
  }
});

test('Super Weekly Reward articles explain stock and the Super Ticket trade-off without promising premium prizes', () => {
  for (const file of Object.values(clusters.reward)) {
    const html = read(file);
    assert.match(html, /Super Ticket|슈퍼 티켓|超級票券/, `${file}: Super Ticket explanation missing`);
    assert.match(html, /previous reward|以前の特典|이전 리워드|原本的獎勵|先前獎勵/, `${file}: previous-reward trade-off missing`);
    assert.match(html, /limited|限り|한정|數量有限|庫存/, `${file}: limited stock explanation missing`);

    const misleading = visibleText(html)
      .split(/[.!?。！？]/)
      .filter(sentence => /guaranteed premium|必ず.*高額|프리미엄.*보장|一定.*高價/.test(sentence))
      .filter(sentence => !/not|ない|아니|不/.test(sentence));
    assert.deepEqual(misleading, [], `${file}: premium prize is presented as guaranteed`);
  }
});

test('quest articles cover account-specific conditions, qualifying purchases, sign-in and refunds', () => {
  const requiredPatterns = [
    /account|アカウント|계정|帳號/,
    /purchase|購入|구매|購買/,
    /Play Games|Play 게임즈|Play 遊戲/,
    /personalization|パーソナライズ|맞춤설정|個人化/,
    /refund|返金|환불|退款/
  ];

  for (const file of Object.values(clusters.quests)) {
    const html = read(file);
    for (const pattern of requiredPatterns) assert.match(html, pattern, `${file}: missing ${pattern}`);
    assert.match(html, /11534416/, `${file}: official quest source missing`);
  }
});

test('locale indexes and the dedicated sitemap expose all six new international guides', () => {
  for (const locale of ['en', 'ko', 'tw']) {
    const index = read(`${locale}/articles/index.html`);
    assert.ok(index.includes(`/${locale}/articles/google-play-points-super-weekly-reward.html`));
    assert.ok(index.includes(`/${locale}/articles/google-play-quests.html`));
  }

  const sitemap = read('sitemap-intl-guides.xml');
  for (const cluster of Object.values(clusters)) {
    for (const file of [cluster.en, cluster.ko, cluster.tw]) {
      assert.ok(sitemap.includes(`https://playpoint-sim.com/${file}`), `sitemap missing ${file}`);
    }
  }
});
