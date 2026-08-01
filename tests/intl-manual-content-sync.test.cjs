'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { HUB_CONTENT, syncIntlManualContent } = require('../scripts/intl-manual-content-sync.cjs');

function fixture(locale) {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta name="description" content="Old description">
  <meta name="last-modified" content="2026-07-31">
  <meta property="og:description" content="Old description">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"CollectionPage","description":"Old description"}
  </script>
</head>
<body>
  <p class="hero-meta">Last updated 2026-07-31</p>
  <section class="section related-links-section">
    <ul>
      <li><a href="/existing.html">Existing guide</a></li>
    </ul>
  </section>
</body>
</html>`;
}

test('manual multilingual guide links survive regeneration exactly once', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playpoint-intl-hubs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  for (const locale of Object.keys(HUB_CONTENT)) {
    const dir = path.join(root, locale, 'articles');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), fixture(locale));
  }

  syncIntlManualContent(root);
  const once = new Map(Object.keys(HUB_CONTENT).map(locale => [
    locale,
    fs.readFileSync(path.join(root, locale, 'articles', 'index.html'), 'utf8')
  ]));
  syncIntlManualContent(root);

  for (const [locale, config] of Object.entries(HUB_CONTENT)) {
    const html = fs.readFileSync(path.join(root, locale, 'articles', 'index.html'), 'utf8');
    assert.equal(html, once.get(locale), `${locale}: synchronization must be idempotent`);
    assert.ok(html.includes(`content="${config.description}"`), `${locale}: description was not synchronized`);
    assert.ok(html.includes(`content="${config.modifiedAt}"`), `${locale}: update date was not synchronized`);
    for (const [href, label] of config.links) {
      assert.equal((html.match(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1, `${locale}: duplicate ${href}`);
      assert.ok(html.includes(label), `${locale}: label is missing for ${href}`);
    }
  }
});
