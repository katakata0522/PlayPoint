'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { TOPIC_GUIDES } = require('./reader-topic-guides.cjs');
const root = path.resolve(__dirname, '..');
async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    const cards = [{ slug: 'article-guide', title: 'Google Play Points 記事一覧', subtitle: '基本・ランク・使い道・トラブル・ゲーム別課金' }, ...TOPIC_GUIDES.map(guide => ({ slug: guide.slug, title: guide.label, subtitle: guide.title }))];
    const dir = path.join(root, 'images/guides'); fs.mkdirSync(dir, { recursive: true });
    for (const card of cards) {
      await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#101a26;color:#edf4ff;font-family:"Yu Gothic",Meiryo,sans-serif;padding:62px 70px}header{font-size:34px;font-weight:bold;color:#8fbeff}h1{font-size:62px;line-height:1.45;margin:75px 0 30px;max-width:1050px}p{font-size:28px;line-height:1.6;color:#c3d3e7}footer{border-top:3px solid #8fbeff;padding-top:24px;position:absolute;bottom:45px;width:1060px;font-size:22px;letter-spacing:2px}</style><header>PlayPoint　記事ガイド</header><h1>${card.title}</h1><p>${card.subtitle}</p><footer>playpoint-sim.com</footer></html>`);
      await page.screenshot({ path: path.join(dir, card.slug + '.jpg'), type: 'jpeg', quality: 92 });
    }
  } finally { await browser.close(); }
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
