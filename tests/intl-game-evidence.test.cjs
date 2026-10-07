'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { GAME_EVIDENCE, REVIEWED_AT, locales, isReference, referenceFiles } = require('../scripts/intl-game-evidence.cjs');
const { COPY } = require('../scripts/intl-game-evidence-sync.cjs');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

test('all 24 games have regional evidence; overseas calculators never turn an unverified price into a pack', () => {
  assert.equal(Object.keys(GAME_EVIDENCE).length, 24);
  for (const locale of locales) for (const [id, entry] of Object.entries(GAME_EVIDENCE)) {
    const file = `${locale}/games/${id}/index.html`, html = read(file);
    assert.ok(html.includes(entry.editions[locale].replace(/&/g, '&amp;')), `${file}: regional source`);
    assert.doesNotMatch(html, /id="sim-pack-select"|id="sim-pack-count"|data-amount=|class="pack-table"/, `${file}: unverified fixed-price controls or table`);
    assert.match(html, /id="game-sim-form" data-input-mode="amount"/);
    assert.match(html, /id="sim-custom-amount" value="0"/);
    assert.match(html, new RegExp(`<time datetime="${REVIEWED_AT}">`));
    for (const item of entry.offers[locale]) {
      assert.ok(item.names[locale] && item.details[locale] && item.evidence.url);
      assert.equal(item.evidence.scope === 'global' || item.evidence.scope === COPY[locale].code, true, `${file}: another edition's offer leaked`);
      assert.ok(html.indexOf('class="game-offers"') < html.indexOf('id="game-calculator"'), `${file}: offer before calculation`);
      assert.ok(html.includes(item.evidence.url.replace(/&/g, '&amp;')));
      assert.equal(new URL(item.evidence.url).protocol, 'https:');
    }
    const app = schemas(html).find(s => s['@type'] === 'WebApplication');
    assert.equal(app.inLanguage, COPY[locale].hreflang);
    assert.equal(app.offers.priceCurrency, locale === 'en' ? 'USD' : locale === 'ko' ? 'KRW' : 'TWD');
    assert.equal(app.offers.price, '0', 'free calculator price, not a game product price');
    assert.equal(app.description, decode(html.match(/<meta name="description" content="([^"]*)"/)[1]));
    const faq = schemas(html).find(s => s['@type'] === 'FAQPage');
    for (const q of faq.mainEntity) {
      assert.ok(decode(html).includes(`<summary>${q.name}</summary>`), `${file}: visible FAQ question`);
      assert.ok(decode(html).includes(`<p>${q.acceptedAnswer.text}</p>`), `${file}: visible FAQ answer`);
    }
  }
});

test('unconfirmed editions remain reachable as references but are not submitted or used as language alternates', () => {
  const sitemap = read('sitemap.xml');
  assert.equal(referenceFiles().length, 8);
  for (const locale of locales) for (const id of Object.keys(GAME_EVIDENCE)) {
    const file = `${locale}/games/${id}/index.html`, html = read(file);
    const url = `https://playpoint-sim.com/${locale}/games/${id}/`;
    if (isReference(locale, id)) {
      assert.match(html, /name="robots" content="noindex, follow"/);
      assert.doesNotMatch(html, /hreflang="(?:en-US|ko-KR|zh-TW|x-default)"/);
      assert.ok(!sitemap.includes(`<loc>${url}</loc>`), `${file}: noindex URL in sitemap`);
      assert.ok(!read(`games/${id}/index.html`).includes(`hreflang="${COPY[locale].hreflang}"`));
      assert.ok(html.includes(`href="/games/${id}/"`));
    } else {
      assert.ok(sitemap.includes(`<loc>${url}</loc>`));
      const ja = read(`games/${id}/index.html`);
      assert.ok(ja.includes(`hreflang="${COPY[locale].hreflang}" href="${url}"`));
      assert.ok(html.includes(`hreflang="ja" href="https://playpoint-sim.com/games/${id}/"`));
    }
  }
});

test('region-specific products and retired products are not replaced with Japanese assumptions', () => {
  const usUma = read('en/games/umamusume/index.html'), krUma = read('ko/games/umamusume/index.html');
  assert.match(usUma, /Daily Carat Pack/);
  assert.match(krUma, /먼슬리 우마/);
  assert.doesNotMatch(usUma, /Jewels \(\$|Umasuku \(\$|Umaplan \(\$/);
  assert.match(read('tw/games/monst/index.html'), /NT\$140[\s\S]*NT\$440/);
  assert.match(read('en/games/proseka/index.html'), /Colorful\+[\s\S]*14-day[\s\S]*MYSEKAI/);
  assert.match(read('en/games/efootball/index.html'), /old Match Pass was replaced by Campaign Hub/);
  assert.match(read('en/games/fgo/index.html'), /ended July 14, 2026/);
  assert.match(read('en/games/pokemon-go/index.html'), /October 6–November 3[\s\S]*not a renewing monthly subscription/);
});
