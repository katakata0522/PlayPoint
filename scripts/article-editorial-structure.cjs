'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EDITORIAL_MARKER_PATTERN = /\n?\s*<!-- editorial-summary:start -->[\s\S]*?<!-- editorial-summary:end -->\n?/;

const EDITORIAL_TARGETS = Object.freeze({
  'articles/2026-03-10-play-points-reflection-timing.html': {
    answer: '購入が完了しているのにポイントが見えない場合は、注文状態、Play Points履歴、購入したGoogleアカウント、キャンペーン条件の順で確認します。待ち時間だけでは原因を切り分けられません。',
    known: [
      '注文が完了・保留・キャンセル・返金のどれかは購入履歴で確認できます。',
      '通常ポイントとキャンペーン分は分けて確認できます。'
    ],
    unknown: [
      'このサイトから個別アカウントの処理状況や正確な反映時刻は確認できません。',
      '対象アプリやアカウント限定キャンペーンの適用結果はGoogle Playの画面が最終判断です。'
    ]
  },
  'articles/2026-07-24-play-points-1-value.html': {
    known: [
      '日本の通常獲得率と、商品単位で最も近い整数へ丸める計算方法は公式案内で確認できます。',
      '獲得に必要な金額と、交換時の価値は別の計算です。'
    ],
    unknown: [
      '個別アカウントに表示される交換先やキャンペーンはこのサイトから確認できません。',
      '購入前に表示される獲得予定ポイントを超える確約はできません。'
    ],
    comparisonHref: '/compare/earning-rates/#status-rates',
    comparisonLabel: 'ステータス別獲得率の引用用比較表を見る'
  },
  'articles/2026-07-24-play-points-100-value.html': {
    known: [
      '100ポイントを貯める概算は、ステータス別獲得率と対象商品の価格から計算できます。',
      'ポイント残高と年間のランク進捗は別の数字です。'
    ],
    unknown: [
      '100ポイントを何円分として使えるかは、表示される交換先と条件で変わります。',
      '個別キャンペーンの対象可否はGoogle Playの表示を確認する必要があります。'
    ],
    comparisonHref: '/compare/earning-rates/#status-rates',
    comparisonLabel: '100円ごとの獲得率を比較表で確認する'
  },
  'articles/2026-07-24-play-points-500-1000-value.html': {
    known: [
      '500・1,000ポイントの通常時概算は、ステータス別獲得率から比較できます。',
      '2倍・3倍は対象商品の対象期間内購入にだけ適用して試算します。'
    ],
    unknown: [
      '今後のキャンペーン開催時期や個別アカウントの対象可否は予測できません。',
      '商品ごとの丸めにより、合計額だけの計算とは数ポイントずれる場合があります。'
    ],
    comparisonHref: '/compare/earning-rates/#campaign-comparison',
    comparisonLabel: '通常・2倍・3倍の引用用比較表を見る'
  },
  'articles/2026-07-24-play-points-cash-conversion.html': {
    answer: 'Google Play Pointsは現金、PayPay残高、銀行口座へ直接送金できません。公式に表示されるクーポン、アプリ内アイテム、Google Playクレジットなどの交換先から選びます。',
    known: [
      'ポイントを購入したり現金へ換えたり、別アカウントへ移したりすることはできません。',
      '利用可能な交換先はGoogle Playの「使う」画面で確認できます。'
    ],
    unknown: [
      '表示される交換先や必要ポイント数は国・時期・アカウントで異なります。',
      '非公式な換金方法の安全性や成立をこのサイトは保証できません。'
    ]
  },
  'articles/2026-07-24-earn-play-points-free.html': {
    known: [
      '追加購入なしで利用できる特典が表示される場合がありますが、対象条件の確認が必要です。',
      '通常のウィークリーリワードは日本向け公式案内ではシルバー以上の特典です。'
    ],
    unknown: [
      '次に表示される特典、配布量、個別アカウントの対象可否は予測できません。',
      '非公式サイトが示す固定確率や必ずもらえるという説明は確認できません。'
    ]
  },
  'articles/2026-07-25-play-credit-not-working.html': {
    answer: '交換できない場合はポイント残高と交換条件を、交換後に使えない場合は期限、対象購入、利用アカウント、国・通貨を順に確認します。',
    known: [
      '交換前のポイント残高と、交換後のGoogle Playクレジットは別の残高です。',
      '交換後クレジットには期限や利用条件が表示される場合があります。'
    ],
    unknown: [
      '個別アカウントの残高状態やエラー原因をこのサイトから読み取ることはできません。',
      '利用できるコンテンツや表示条件は国・アカウントで異なります。'
    ]
  },
  'articles/2026-07-25-play-points-coupon-not-applied.html': {
    answer: 'クーポンが適用されない場合は、対象アプリ、最低購入額、他の割引との併用、交換したアカウント、国・通貨の順で確認します。',
    known: [
      '保存済みクーポンの対象アプリや条件はGoogle Playの画面で確認できます。',
      '条件を満たす購入では、対象クーポンが自動適用される案内があります。'
    ],
    unknown: [
      '個別クーポンが表示されない理由やアカウント側の制限はこのサイトから確認できません。',
      '今後配布されるクーポンの内容や対象アプリは予測できません。'
    ]
  },
  'articles/2025-12-25-playpoints-rank-maintenance.html': {
    answer: 'その年に到達したステータスは翌年末まで維持され、翌年に貯めたポイント数をもとに次の年初のステータスが再判定されます。',
    known: [
      '日本のステータス条件と通常獲得率はGoogle Play公式案内で確認できます。',
      '使ったポイントが年間のステータス判定ポイントから同じように減るわけではありません。'
    ],
    unknown: [
      '現在の個別アカウントの進捗や、年末までに実施されるキャンペーンは確認できません。',
      '将来の制度変更は公式発表前に確定できません。'
    ],
    comparisonHref: '/compare/earning-rates/#status-rates',
    comparisonLabel: 'ランク条件と通常獲得率の比較表を見る'
  },
  'articles/2025-12-25-campaign.html': {
    answer: 'キャンペーンを待つかは、予定している購入だけを通常・2倍・3倍で比較し、対象アプリ、期間、開始操作、上限を確認して判断します。',
    known: [
      '通常時の獲得率を基準にすると、キャンペーン分の差額を比較できます。',
      '倍率は対象商品と対象期間へだけ適用する必要があります。'
    ],
    unknown: [
      '次回キャンペーンの開催時期や、個別アカウントが対象になるかは予測できません。',
      'Google Playに表示されていない倍率を確定情報として扱うことはできません。'
    ],
    comparisonHref: '/compare/earning-rates/#campaign-comparison',
    comparisonLabel: '通常・2倍・3倍の引用用比較表を見る'
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderKnowledgeBoundary(config) {
  const comparison = config.comparisonHref
    ? `<p class="knowledge-boundary__source"><a href="${escapeHtml(config.comparisonHref)}">${escapeHtml(config.comparisonLabel)}</a></p>`
    : '';
  return `<section class="knowledge-boundary" aria-labelledby="known-unknown">
                <h2 id="known-unknown">判明していること／このサイトからは不明なこと</h2>
                <div class="knowledge-boundary__grid">
                    <div>
                        <h3>判明していること</h3>
                        <ul>${config.known.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                    </div>
                    <div>
                        <h3>このサイトからは不明なこと</h3>
                        <ul>${config.unknown.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                    </div>
                </div>
                ${comparison}
            </section>`;
}

function renderAnswer(answer) {
  return `<section class="answer-box editorial-answer" aria-labelledby="quick-answer">
                <h2 id="quick-answer">先に結論</h2>
                <p>${escapeHtml(answer)}</p>
            </section>`;
}

function updateDateMetadata(html, modifiedDate) {
  return html
    .replace(
      /(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}(T[^"]*"\s*\/?>)/,
      `$1${modifiedDate}$2`
    )
    .replace(
      /(<meta name="last-modified" content=")\d{4}-\d{2}-\d{2}("\s*\/?>)/,
      `$1${modifiedDate}$2`
    )
    .replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(")/g, `$1${modifiedDate}$2`)
    .replace(/\d{4}\/\d{2}\/\d{2} 更新/g, modifiedDate.replace(/-/g, '/') + ' 更新');
}

function applyEditorialStructure(rootDir, modifiedDate) {
  let updatedCount = 0;

  for (const [relativePath, config] of Object.entries(EDITORIAL_TARGETS)) {
    const absolutePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`編集対象の記事がありません: ${relativePath}`);
    }

    let html = fs.readFileSync(absolutePath, 'utf8').replace(EDITORIAL_MARKER_PATTERN, '\n');
    const knowledge = renderKnowledgeBoundary(config);
    let editorialHtml;

    if (config.answer) {
      editorialHtml = `${renderAnswer(config.answer)}\n            ${knowledge}`;
      html = html.replace(
        /(<article class="content">)/,
        `$1\n            <!-- editorial-summary:start -->\n            ${editorialHtml}\n            <!-- editorial-summary:end -->`
      );
    } else {
      const answerBoxPattern = /(<section class="answer-box"[\s\S]*?<\/section>)/;
      if (!answerBoxPattern.test(html)) {
        throw new Error(`既存の即答欄がありません: ${relativePath}`);
      }
      html = html.replace(
        answerBoxPattern,
        `$1\n            <!-- editorial-summary:start -->\n            ${knowledge}\n            <!-- editorial-summary:end -->`
      );
    }

    html = updateDateMetadata(html, modifiedDate)
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+$/gm, '');
    fs.writeFileSync(absolutePath, html, 'utf8');
    updatedCount += 1;
  }

  const articlesPath = path.join(rootDir, 'blog', 'articles.json');
  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  const targetFiles = new Set(Object.keys(EDITORIAL_TARGETS).map(file => `../${file}`));
  for (const article of articles) {
    if (targetFiles.has(article.file)) article.modified = modifiedDate;
  }
  fs.writeFileSync(articlesPath, `${JSON.stringify(articles, null, 2)}\n`, 'utf8');

  return updatedCount;
}

module.exports = {
  EDITORIAL_TARGETS,
  applyEditorialStructure,
  escapeHtml,
  renderAnswer,
  renderKnowledgeBoundary,
  updateDateMetadata
};
