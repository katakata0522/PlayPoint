const fs = require('fs');
const path = require('path');

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
        <h2>課金前にやっておくべき実質割引テクニック</h2>
        <div class="lp-affiliate-box">
            <div class="lp-affiliate-box-header">
                <span style="font-size: 1.3rem;">🛒</span>
                <h3 class="lp-affiliate-box-title">楽天市場のGoogle Playギフトコード認定店でポイント二重取り</h3>
            </div>
            <p class="lp-affiliate-box-text">
                直接クレジットカードで決済する前に、楽天市場の「Google Play ギフトコード認定店」を経由すると、<strong>SPU（スーパーポイントアップ）やお買い物マラソン、5と0のつく日で実質5%〜15%以上の楽天ポイントが還元</strong>されます。コードはメールで即時届くため、課金の実質負担を大幅に抑えられます。
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
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    </section>`;

lpFiles.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');

  // 既存のセクションがあれば除去
  const existingRegex = /<section class="section">\s*<h2>課金前にやっておくべき実質割引テクニック<\/h2>[\s\S]*?<\/section>/g;
  content = content.replace(existingRegex, '');

  // 最後の </main> または <footer の直前に挿入
  if (content.includes('</main>')) {
    content = content.replace('</main>', `${affiliateSection}\n    </main>`);
  } else if (content.includes('<footer')) {
    content = content.replace('<footer', `${affiliateSection}\n    <footer`);
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Cleanly updated monetization section in ${file}`);
});
