'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { articleImages, cardTitle } = require('./intl-article-images.cjs');
const { metadata: gameMetadata } = require('./intl-game-article-discovery.cjs');
const { getCategoryLabels, getIntlGuideCategory } = require('./intl-guide-taxonomy.cjs');
const root = path.resolve(__dirname, '..');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const REGION = { en: 'UNITED STATES · ENGLISH', ko: '대한민국 · 한국어', tw: '台灣 · 繁體中文', hk: '香港 · 繁體中文', in: 'INDIA · ENGLISH' };

async function run() {
  // 新規記事の追加時は既存の確認済み画像を上書きしない。
  // 改稿時は --file=相対パス を指定し、見出しを変えた記事だけ再生成できる。
  const selectedFiles = new Set(process.argv.filter(arg => arg.startsWith('--file=')).map(arg => arg.slice('--file='.length)));
  const articles = articleImages(root).concat(['hk', 'in'].map(locale => ({
    locale, slug: 'google-play-payment-failed', file: locale + '/google-play-payment-failed.html',
    image: 'images/ogp/pages/' + locale + '-google-play-payment-failed.jpg'
  })));
  for (const file of selectedFiles) {
    if (!articles.some(article => article.file === file)) throw Error('海外記事が見つかりません: ' + file);
  }
  const targets = articles.filter(article => (!selectedFiles.size || selectedFiles.has(article.file))
    && (!process.argv.includes('--only-missing') || !fs.existsSync(path.join(root, article.image))));
  const browser = await chromium.launch(process.env.PLAYPOINT_CHROME_PATH ? { executablePath: process.env.PLAYPOINT_CHROME_PATH, headless: true } : { channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    for (const article of targets) {
      const html = fs.readFileSync(path.join(root, article.file), 'utf8');
      const title = cardTitle(html);
      if (!title) throw Error('記事タイトルがありません: ' + article.file);
      const gameId = gameMetadata('/' + article.file)?.id || (article.slug === 'bluearchive-recruitment-stack-update-2026' ? 'bluearchive' : '');
      const icon = gameId && path.join(root, 'images/game-icons', gameId + '-2x.webp');
      const visual = icon && fs.existsSync(icon) ? `<img src="data:image/webp;base64,${fs.readFileSync(icon).toString('base64')}" alt="">` : '<div class="points-mark" aria-hidden="true">P<span>POINTS</span></div>';
      const category = gameId ? ({ en: 'GAME PURCHASE GUIDE', ko: '게임 결제 가이드', tw: '遊戲消費指南' }[article.locale]) : ({ hk: '付款疑難', in: 'Payment help' }[article.locale] || getCategoryLabels(article.locale)[getIntlGuideCategory('/' + article.file)]);
      await page.setContent(`<!doctype html><html lang="${{ tw: 'zh-TW', hk: 'zh-HK', in: 'en-IN' }[article.locale] || article.locale}"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f4f8f8;color:#172e36;font-family:Arial,"Malgun Gothic","Microsoft JhengHei",sans-serif;padding:48px 62px;position:relative}.brand{font-size:32px;font-weight:800;letter-spacing:-1px}.region{position:absolute;right:62px;top:54px;font-size:21px;color:#236b66}.category{font-size:23px;color:#20796d;letter-spacing:1px;margin:66px 0 18px;font-weight:700}h1{font-size:58px;line-height:1.22;letter-spacing:-1px;margin:0;max-width:838px;text-wrap:balance;overflow-wrap:anywhere}html:lang(ko) h1{word-break:keep-all}.visual{position:absolute;right:62px;top:204px;width:190px;height:190px;display:grid;place-items:center;background:#e2eeec;border-radius:34px}.visual img{width:148px;height:148px;border-radius:27px}.points-mark{font-size:95px;font-weight:900;color:#20796d;line-height:.95;text-align:center}.points-mark span{display:block;font-size:17px;letter-spacing:4px;margin-top:13px}footer{position:absolute;bottom:47px;left:62px;right:62px;border-top:2px solid #b4ccc7;padding-top:22px;font-size:22px;color:#47716b}.bar{position:absolute;top:0;left:0;right:0;height:10px;background:#20796d}</style><div class="bar"></div><header class="brand">PlayPoint</header><span class="region">${escape(REGION[article.locale])}</span><p class="category">${escape(category)}</p><h1>${escape(title)}</h1><div class="visual">${visual}</div><footer>playpoint-sim.com · ${escape(category)}</footer></html>`);
      // 文字を切らず、実際の描画範囲に合わせて縮小する。
      const fits = await page.evaluate(() => {
        const heading = document.querySelector('h1');
        for (let size = 58; size >= 32; size -= 2) {
          heading.style.fontSize = size + 'px';
          if (heading.getBoundingClientRect().bottom < 510) return true;
        }
        return false;
      });
      if (!fits) throw Error('共有画像のタイトルが収まりません: ' + article.file);
      await page.screenshot({ path: path.join(root, article.image), type: 'jpeg', quality: 90 });
    }
    console.log('海外記事専用OGP生成:', targets.length);
  } finally { await browser.close(); }
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { run };
