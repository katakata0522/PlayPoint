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

test('new international guides are sourced, attributable and structurally usable without length quotas', () => {
  const international = Object.values(clusters).flatMap(cluster => [cluster.en, cluster.ko, cluster.tw]);

  for (const file of international) {
    const html = read(file);
    const body = html.match(/<article\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
    assert.ok(visibleText(body), `${file}: article body is empty`);
    assert.match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/i, `${file}: visible article heading is missing`);
    assert.match(html, /official-source-note/, `${file}: official source section is missing`);
    assert.match(html, /(?:support\.google\.com\/googleplay|play\.google\.com\/store\/apps\/editorial)/, `${file}: Google official source is missing`);
    assert.match(html, /related-links-section/, `${file}: related guide section is missing`);
    assert.match(html, /rel="author"/, `${file}: visible author attribution is missing`);
    assert.ok(schemas(html, file).some(schema => schema['@type'] === 'Article'), `${file}: Article JSON-LD missing`);
    assert.ok(schemas(html, file).some(schema => schema['@type'] === 'FAQPage'), `${file}: FAQPage JSON-LD missing`);
  }
});

test('Super Weekly Prize articles keep limited-stock/no-guarantee facts and scope Super Ticket to current account terms', () => {
  const ticketScope = new Map([
    [clusters.reward.ja, /現在の付与状況|現在.*特典.*画面|以前公開していたSuper Ticket/],
    [clusters.reward.en, /current account card|older ticket schedules are not verified current terms/i],
    [clusters.reward.ko, /현재 카드|과거 지급 주기를 현행 규칙으로 보장하지/],
    [clusters.reward.tw, /目前帳號卡片|不把過去發放週期當作現行規則/]
  ]);

  for (const file of Object.values(clusters.reward)) {
    const html = read(file);
    const text = visibleText(html);
    const headline = visibleText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
    assert.match(html, /Super Weekly Prize|スーパーウィークリーリワード|슈퍼 위클리|超級每週/, `${file}: Super Weekly Prize explanation missing`);
    assert.match(html, /limited|限り|한정|數量有限|庫存/, `${file}: limited stock explanation missing`);
    assert.doesNotMatch(headline, /guaranteed|必ず|보장|一定/, `${file}: headline overpromises a premium prize`);
    assert.match(
      text,
      /not a promise|not guaranteed|no [^.]{0,80} guaranteed|uncertain benefit|必ず当たる仕組みでは|保証はありません|보장하지|보장되지|보장이 아님|보장이 아닙니다|不保證|不代表/,
      `${file}: explicit premium-prize uncertainty is missing`
    );

    if (/Super Ticket|スーパー.*Ticket|슈퍼.*티켓|超級.*票券/i.test(html)) {
      assert.match(html, ticketScope.get(file), `${file}: Super Ticket must defer to current account/card terms`);
    }
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
