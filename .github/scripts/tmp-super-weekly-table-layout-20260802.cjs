'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const articlePath = path.join(root, 'articles/2026-07-31-super-weekly-reward.html');
const cssPath = path.join(root, 'articles/article-modern.css');

let html = fs.readFileSync(articlePath, 'utf8');
html = html.replace(
  '<div class="table-card">\n        <table>',
  '<div class="table-card reward-comparison" aria-label="週次特典3制度の比較">\n        <table>'
);

const mobileCards = `
      <div class="reward-comparison-mobile" role="list" aria-label="週次特典3制度の比較">
        <section class="reward-option" role="listitem">
          <h3>通常のウィークリーリワード</h3>
          <dl>
            <div><dt>主な対象</dt><dd>シルバー以上</dd></div>
            <div><dt>日本での更新</dt><dd>金曜日</dd></div>
            <div><dt>特徴</dt><dd>Play Pointsの「特典」から受け取る通常の週次特典</dd></div>
          </dl>
        </section>
        <section class="reward-option" role="listitem">
          <h3>スーパーウィークリーリワード</h3>
          <dl>
            <div><dt>主な対象</dt><dd>ゴールド以上</dd></div>
            <div><dt>日本での更新</dt><dd>金曜日 午前0時以降</dd></div>
            <div><dt>特徴</dt><dd>在庫数がある賞品企画。ステータスや追加条件で内容が異なる場合がある</dd></div>
          </dl>
        </section>
        <section class="reward-option" role="listitem">
          <h3>Play Passの週次ボーナス・ブースター</h3>
          <dl>
            <div><dt>主な対象</dt><dd>対象のPlay Pass加入者など</dd></div>
            <div><dt>日本での更新</dt><dd>木曜日</dd></div>
            <div><dt>特徴</dt><dd>Play Pass画面で確認する別制度</dd></div>
          </dl>
        </section>
      </div>`;

if (!html.includes('class="reward-comparison-mobile"')) {
  const tableEnd = '        </table>\n      </div>';
  if (!html.includes(tableEnd)) {
    throw new Error('Could not find the weekly-benefit comparison table ending.');
  }
  html = html.replace(tableEnd, `        </table>${mobileCards}\n      </div>`);
}

fs.writeFileSync(articlePath, html, 'utf8');

let css = fs.readFileSync(cssPath, 'utf8');
const marker = '/* Responsive weekly-benefit comparison. */';
if (!css.includes(marker)) {
  css += `

${marker}
.reward-comparison-mobile {
    display: none;
}

@media (max-width: 600px) {
    .reward-comparison {
        overflow: visible;
        margin: 1rem 0 1.25rem;
        border: 0;
        background: transparent;
    }

    .reward-comparison > table {
        display: none;
    }

    .reward-comparison-mobile {
        display: grid;
        gap: 1rem;
    }

    .reward-option {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
    }

    .reward-option h3 {
        margin: 0;
        padding: 0.85rem 1rem;
        background: var(--brand-soft);
        color: var(--brand-dark);
        font-size: 1rem;
        line-height: 1.55;
    }

    .reward-option dl {
        margin: 0;
    }

    .reward-option dl > div {
        display: grid;
        grid-template-columns: minmax(6.8rem, 38%) minmax(0, 1fr);
        gap: 0.75rem;
        align-items: start;
        padding: 0.75rem 0.9rem;
        border-top: 1px solid var(--border);
    }

    .reward-option dt {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
        line-height: 1.6;
    }

    .reward-option dd {
        min-width: 0;
        margin: 0;
        line-height: 1.7;
        overflow-wrap: anywhere;
    }
}
`;
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Applied dedicated mobile cards to the weekly-benefit comparison.');
