const fs = require('fs');
const path = require('path');

const articlesDir = path.resolve(__dirname, '../articles');
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.html'));

const articleAdUnit = `
            <!-- 記事下 広告枠（レスポンシブ） -->
            <div class="article-ad-container">
                <span class="article-ad-label">スポンサーリンク</span>
                <ins class="adsbygoogle"
                     style="display:block"
                     data-ad-client="ca-pub-3845885843809455"
                     data-ad-slot="8250492620"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            </div>`;

let modifiedCount = 0;

files.forEach(file => {
  const filePath = path.join(articlesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 既存の広告枠があれば置換・正規化
  const existingAdRegex = /<!-- 記事下 広告枠（レスポンシブ） -->[\s\S]*?<\/div>/g;
  content = content.replace(existingAdRegex, '');

  // 古いstyle付きarticle-ad-containerがあれば除去
  content = content.replace(/<div class="article-ad-container"[^>]*>[\s\S]*?<\/div>/g, '');

  // noindex の品質保留ページには広告を追加しない。
  if (/name=\"robots\"[^>]*content=\"[^\"]*noindex/i.test(content)) {
    fs.writeFileSync(filePath, content, 'utf8');
    return;
  }

  // </article> の直前に挿入
  if (content.includes('</article>')) {
    content = content.replace('</article>', `${articleAdUnit}\n        </article>`);
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Finished: ${modifiedCount} articles cleanly updated with AdSense units without inline styles.`);
