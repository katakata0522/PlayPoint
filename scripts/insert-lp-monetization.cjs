'use strict';

const fs = require('node:fs');
const path = require('node:path');

const lpFiles = [
  'status/silver/index.html',
  'status/gold/index.html',
  'status/platinum/index.html',
  'status/diamond/index.html',
  'maintenance/platinum/index.html',
  'maintenance/diamond/index.html',
  'amount/10000/index.html',
  'campaign/2x/index.html',
  'campaign/3x/index.html',
  'campaign/wait/index.html',
  'compare/earning-rates/index.html',
  'points-cost/index.html',
  'latest/index.html'
];

const affiliateSection = `    <section class="section">
        <h2>課金前に確認したいギフトコード購入条件</h2>
        <div class="lp-affiliate-box">
            <div class="lp-affiliate-box-header">
                <span style="font-size: 1.3rem;">🛒</span>
                <h3 class="lp-affiliate-box-title">楽天市場のGoogle Playギフトコード認定店の還元条件を確認</h3>
            </div>
            <p class="lp-affiliate-box-text">
                楽天市場の「Google Play ギフトコード認定店」では、<strong>楽天市場側のキャンペーンや会員条件によってポイント還元の対象になる場合があります。</strong> 付与率・上限・エントリー要否・コードの受取条件は変わるため、購入画面とキャンペーン詳細を確認してください。
            </p>
            <div class="lp-affiliate-box-actions">
                <a class="lp-affiliate-btn" href="https://hb.afl.rakuten.co.jp/hgc/56983677.8efa0dbe.56983678.1b999667/?pc=https%3A%2F%2Fwww.rakuten.co.jp%2Fgpgiftcard%2F&amp;link_type=hybrid_url&amp;ut=eyJwYWdlIjoic2hvcCIsInR5cGUiOiJoeWJyaWRfdXJsIiwiY29sIjoxLCJjYXQiOjEsImJhbiI6MTcxMDEwMCwiY1W1wIjp1YWxYODQ%3D" target="_blank" rel="sponsored noopener noreferrer">
                    🛒 楽天市場 認定店でギフトコードを見る ➔
                </a>
                <a class="lp-affiliate-sublink" href="/articles/2026-06-20-discount-gift-cards.html">
                    お得な買い方・還元上限の注意点 ➔
                </a>
            </div>
        </div>

        <!-- 広告ユニット（レスポンシブ） -->
        <div class="lp-ad-container">
            <span class="lp-ad-label">スポンサーリンク</span>
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-client="ca-pub-3845885843809455"
                 data-ad-slot="8250492620"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    </section>`;

const existingSectionPattern = /<section class="section">\s*<h2>(?:課金前にやっておくべき実質割引テクニック|課金前に確認したいギフトコード購入条件)<\/h2>[\s\S]*?<\/section>/g;

function normalizeLpContent(content) {
  const withoutExisting = content.replace(existingSectionPattern, '').replace(/\n{3,}/g, '\n\n');
  if (withoutExisting.includes('</main>')) {
    return withoutExisting.replace('</main>', `${affiliateSection}\n    </main>`);
  }
  if (withoutExisting.includes('<footer')) {
    return withoutExisting.replace('<footer', `${affiliateSection}\n    <footer`);
  }
  return withoutExisting;
}

function applyLpMonetization(rootDir = path.resolve(__dirname, '..')) {
  let updated = 0;
  for (const file of lpFiles) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;
    const original = fs.readFileSync(fullPath, 'utf8');
    const next = normalizeLpContent(original);
    if (next === original) continue;
    fs.writeFileSync(fullPath, next, 'utf8');
    updated += 1;
  }
  console.log(`[lp-monetization] synchronized: ${updated}`);
  return updated;
}

if (require.main === module) applyLpMonetization();

module.exports = {
  affiliateSection,
  applyLpMonetization,
  existingSectionPattern,
  lpFiles,
  normalizeLpContent
};
