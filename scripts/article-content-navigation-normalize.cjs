'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ARTICLE_DIRS = ['articles', 'en/articles', 'ko/articles', 'tw/articles'];

const RELATED_SECTIONS = {
  'articles/2025-12-25-campaign.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-new-year-campaign.html', '年末年始キャンペーンの確認方法'],
      ['./2026-08-05-play-points-multiplier-stacking.html', 'ランクとキャンペーン倍率が重複するか確認'],
      ['./2026-08-16-play-points-day.html', '毎月1日のPlayポイントデーを画面で確認'],
      ['./2026-03-10-play-points-reflection-timing.html', '購入後にポイントが反映されない時の確認']
    ]
  },
  'articles/2025-12-25-diamond-worth-it.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-diamond-vip.html', 'ダイヤモンド固有・共通特典を確認'],
      ['./2026-08-05-play-points-levels-guide.html', '全ランクの条件・必要額・特典を比較'],
      ['./2025-12-25-playpoints-rank-maintenance.html', '獲得したランクの維持期間を確認'],
      ['./2026-08-16-pixel-discount-coupon.html', 'Pixel割引クーポンは特典タブで確認']
    ]
  },
  'articles/2025-12-25-playpoints-rank-maintenance.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2026-08-05-play-points-levels-guide.html', '全ランクの条件と必要ポイントを比較'],
      ['./2025-12-25-diamond-worth-it.html', 'ダイヤモンドを目指す費用と特典を比較'],
      ['./2025-12-25-weekly-reward.html', 'ランク別ウィークリーリワードを確認'],
      ['./2026-08-16-january-rank-reset.html', '1月1日にランクが下がった時の確認']
    ]
  },
  'articles/2025-12-25-getting-started.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2026-08-05-play-points-levels-guide.html', 'ランク・獲得率・必要ポイントの全体像'],
      ['./2025-12-25-check-balance.html', '残高・履歴・有効期限の確認方法'],
      ['./2026-08-05-play-points-cannot-join.html', '登録できない・表示されない時の確認順'],
      ['./2026-08-16-youtube-premium-play-points.html', '継続課金の請求経路を確認する']
    ]
  },
  'articles/2025-12-25-gift-card.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2026-06-20-discount-gift-cards.html', 'ギフトコードをお得に買う前の確認事項'],
      ['./2025-12-25-promo-code.html', 'プロモコード・割引時のポイント条件'],
      ['./2025-12-25-movies-books.html', '有料アプリ・本など獲得対象の確認']
    ]
  },
  'articles/2025-12-25-multiple-accounts.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-family-sharing.html', '家族利用とファミリーライブラリの注意点'],
      ['./2026-08-03-play-points-device-change.html', '機種変更後にポイントが見えない時の確認'],
      ['./2026-08-05-play-country-change-points.html', '国を変更した時の残高・ランクへの影響']
    ]
  },
  'articles/2025-12-25-promo-code.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-campaign.html', 'ポイント増量キャンペーンの確認方法'],
      ['./2025-12-25-gift-card.html', 'ギフトカード利用時のポイント条件'],
      ['./2026-08-05-play-points-multiplier-stacking.html', '複数倍率が重複するか確認']
    ]
  },
  'articles/2026-08-17-diamond-valley-festival-guide.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-diamond-vip.html', 'ダイヤモンド会員の公式特典を確認'],
      ['./2025-12-25-playpoints-rank-maintenance.html', 'ランクの維持期間と年末条件を確認'],
      ['./2026-08-05-play-points-levels-guide.html', 'Play Pointsの全ランク条件を確認']
    ]
  },
  'articles/2026-08-17-tgs-google-play-vip.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2025-12-25-diamond-vip.html', 'プラチナ・ダイヤモンドの公式特典を確認'],
      ['./2026-08-05-play-points-levels-guide.html', 'Play Pointsのステータス条件を確認'],
      ['./2025-12-25-playpoints-rank-maintenance.html', '年末のランク維持条件を確認']
    ]
  },
  'articles/2026-07-24-play-points-1-value.html': {
    heading: '次に確認したい関連記事',
    links: [
      ['./2026-07-24-play-points-100-value.html', '100ポイントを貯める金額と使う価値を確認'],
      ['./2026-07-24-play-points-500-1000-value.html', '500・1,000ポイントの必要額を早見表で比較'],
      ['./2026-08-05-play-points-levels-guide.html', 'ランク別の獲得率と必要ポイントを確認']
    ]
  },
  'en/articles/google-play-points-not-showing.html': {
    heading: 'Related troubleshooting guides',
    links: [
      ['./google-play-points-multiple-accounts.html', 'Check which Google Account owns the purchase and points'],
      ['./google-play-points-refund.html', 'See how refunds can remove points and level progress'],
      ['./google-play-points-country-change.html', 'Check how a Play country change affects points and level']
    ]
  }
};

const SCOPE_NOTES = {
  'articles/2026-07-24-play-points-100-value.html': {
    label: 'この記事で扱う範囲',
    html: 'この記事は、<strong>100ポイントを貯める金額と、100ポイントを使う価値の違い</strong>を知りたい人向けです。500・1,000ポイントをランク別にまとめて比較したい場合は、<a href="./2026-07-24-play-points-500-1000-value.html">500・1,000ポイント必要額早見表</a>をご覧ください。'
  },
  'articles/2026-07-24-play-points-500-1000-value.html': {
    label: 'この記事で扱う範囲',
    html: 'この記事は、<strong>500・1,000ポイントの必要額をランク別・倍率別にまとめて比較する早見表</strong>です。100ポイント単体の獲得額と交換価値を確認したい場合は、<a href="./2026-07-24-play-points-100-value.html">100ポイントはいくらかの解説</a>をご覧ください。'
  },
  'en/articles/google-play-points-family-sharing.html': {
    label: 'Scope of this guide',
    html: 'This guide focuses on <strong>Google family groups, Family Library, and family payment methods</strong>. If one person uses several Google Accounts and needs to identify which account owns the points or purchase history, see <a href="./google-play-points-multiple-accounts.html">Play Points with multiple accounts</a>.'
  },
  'en/articles/google-play-points-multiple-accounts.html': {
    label: 'Scope of this guide',
    html: 'This guide focuses on <strong>account ownership, switching accounts, purchase history, and country settings</strong>. For Google family groups, Family Library, and family payment methods, see <a href="./google-play-points-family-sharing.html">sharing Play Points with family</a>.'
  },
  'en/articles/google-play-points-gift-cards.html': {
    label: 'Scope of this guide',
    html: 'This guide focuses on <strong>whether buying or redeeming a gift card earns points</strong>. For recurring Google Play charges, renewals, trials, and subscription billing, see <a href="./google-play-points-subscriptions.html">whether subscriptions earn Play Points</a>.'
  },
  'en/articles/google-play-points-subscriptions.html': {
    label: 'Scope of this guide',
    html: 'This guide focuses on <strong>recurring charges, renewals, trials, and the Google Play billing path</strong>. For gift-card purchase, redemption, and later Play-balance spending, see <a href="./google-play-points-gift-cards.html">whether gift cards earn Play Points</a>.'
  }
};

const RELATED_HEADING_PATTERN = /(関連記事|あわせて読みたい|次に確認したい|Related guides|Related articles|Read next|관련|함께 읽|相關|延伸閱讀)/i;

function listArticleFiles(root) {
  const files = [];
  for (const dir of ARTICLE_DIRS) {
    const absoluteDir = path.join(root, dir);
    if (!fs.existsSync(absoluteDir)) continue;
    for (const name of fs.readdirSync(absoluteDir).sort()) {
      if (name.endsWith('.html')) files.push(path.posix.join(dir, name));
    }
  }
  return files;
}

function hasRelatedSection(html) {
  if (/class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["']/i.test(html)) return true;
  return [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .some(match => RELATED_HEADING_PATTERN.test(stripTags(match[1])));
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function buildRelatedSection(config) {
  const items = config.links
    .map(([href, text]) => `                    <li><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></li>`)
    .join('\n');
  return `
            <section class="section related-links-section article-related-guides" aria-labelledby="related-guides">
                <h2 id="related-guides">${escapeHtml(config.heading)}</h2>
                <ul>
${items}
                </ul>
            </section>
`;
}

function buildScopeNote(config, language) {
  const className = language === 'ja'
    ? 'callout callout-info article-scope-note'
    : 'intro article-scope-note';
  const separator = language === 'ja' ? '：' : ':';
  return `
            <aside class="${className}" aria-label="${escapeHtml(config.label)}"><strong>${escapeHtml(config.label)}${separator}</strong> ${config.html}</aside>
`;
}

function insertAfterLead(html, fragment) {
  const answerBox = /(<section\b[^>]*class=["'][^"']*\banswer-box\b[^"']*["'][^>]*>[\s\S]*?<\/section>)/i;
  if (answerBox.test(html)) return html.replace(answerBox, `$1${fragment}`);

  const intro = /(<div\b[^>]*class=["'][^"']*\bintro\b[^"']*["'][^>]*>[\s\S]*?<\/div>)/i;
  if (intro.test(html)) return html.replace(intro, `$1${fragment}`);

  return html.replace(/(<article\b[^>]*>)/i, `$1${fragment}`);
}

function insertBeforeArticleEnd(html, fragment) {
  const index = html.toLowerCase().lastIndexOf('</article>');
  if (index < 0) throw new Error('article closing tag not found');
  return html.slice(0, index) + fragment + html.slice(index);
}

function normalizeHref(filePath, href) {
  const cleaned = href.split('#', 1)[0].split('?', 1)[0];
  if (!cleaned || /^(?:https?:)?\/\//i.test(cleaned) && !cleaned.startsWith('https://playpoint-sim.com/')) return null;
  let local;
  if (cleaned.startsWith('https://playpoint-sim.com/')) local = cleaned.slice('https://playpoint-sim.com/'.length);
  else if (cleaned.startsWith('/')) local = cleaned.slice(1);
  else local = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), cleaned));
  if (local.endsWith('/')) local += 'index.html';
  return local;
}

function extractRelatedSection(html) {
  const classMatch = html.match(/<section\b[^>]*class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  if (classMatch) return classMatch[0];

  const sections = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/gi)];
  return sections.map(match => match[0]).find(section => {
    const heading = section.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    return heading && RELATED_HEADING_PATTERN.test(stripTags(heading[1]));
  }) || null;
}

function extractRelatedArticleTargets(relativePath, html) {
  const relatedSection = extractRelatedSection(html);
  if (!relatedSection) return [];

  const hrefs = [...relatedSection.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map(match => match[1]);
  return [...new Set(hrefs
    .map(href => normalizeHref(relativePath, href))
    .filter(Boolean)
    .filter(target => /(?:^|\/)articles\/[^/]+\.html$/i.test(target)))];
}

function normalizeHtml(relativePath, html) {
  let output = html;
  let scopeAdded = false;
  let relatedAdded = false;

  const scope = SCOPE_NOTES[relativePath];
  if (scope && !/\barticle-scope-note\b/.test(output)) {
    const language = relativePath.startsWith('articles/') ? 'ja' : 'intl';
    output = insertAfterLead(output, buildScopeNote(scope, language));
    scopeAdded = true;
  }

  const related = RELATED_SECTIONS[relativePath];
  const existingRelatedSection = extractRelatedSection(output);
  if (!existingRelatedSection) {
    if (!related) throw new Error(`関連記事セクションの定義がありません: ${relativePath}`);
    output = insertBeforeArticleEnd(output, buildRelatedSection(related));
    relatedAdded = true;
  } else if (related && extractRelatedArticleTargets(relativePath, output).length === 0) {
    output = output.replace(existingRelatedSection, buildRelatedSection(related).trim());
    relatedAdded = true;
  }

  return { html: output, changed: output !== html, scopeAdded, relatedAdded };
}

function validateArticle(root, relativePath, html, knownFiles) {
  const problems = [];
  const relatedSection = extractRelatedSection(html);
  if (!relatedSection) {
    problems.push('関連記事セクションがありません');
  } else {
    const uniqueTargets = extractRelatedArticleTargets(relativePath, html);
    const isCurated = Object.hasOwn(RELATED_SECTIONS, relativePath);
    if (isCurated && (uniqueTargets.length < 2 || uniqueTargets.length > 4)) {
      problems.push(`関連記事リンクは2〜4本必要です（現在${uniqueTargets.length}本）`);
    } else if (!isCurated && uniqueTargets.length === 0) {
      problems.push('関連記事への内部リンクがありません');
    }
    for (const target of uniqueTargets) {
      if (target === relativePath) problems.push('関連記事に自己リンクがあります');
      if (!knownFiles.has(target) && !fs.existsSync(path.join(root, target))) {
        problems.push(`関連記事リンク先が存在しません: ${target}`);
      }
    }
  }

  const scope = SCOPE_NOTES[relativePath];
  if (scope && !/\barticle-scope-note\b/.test(html)) problems.push('記事の役割を分ける注記がありません');

  return problems;
}

function run(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const check = Boolean(options.check);
  const files = listArticleFiles(root);
  const knownFiles = new Set(files);
  const stats = { scanned: files.length, changed: 0, scopeAdded: 0, relatedAdded: 0 };
  const failures = [];

  for (const relativePath of files) {
    const absolutePath = path.join(root, relativePath);
    const original = fs.readFileSync(absolutePath, 'utf8');
    let result;
    try {
      result = normalizeHtml(relativePath, original);
    } catch (error) {
      failures.push(`${relativePath}: ${error.message}`);
      continue;
    }

    if (result.changed) {
      stats.changed += 1;
      if (result.scopeAdded) stats.scopeAdded += 1;
      if (result.relatedAdded) stats.relatedAdded += 1;
      if (!check) fs.writeFileSync(absolutePath, result.html);
    }

    const finalHtml = check ? result.html : fs.readFileSync(absolutePath, 'utf8');
    for (const problem of validateArticle(root, relativePath, finalHtml, knownFiles)) {
      failures.push(`${relativePath}: ${problem}`);
    }
  }

  if (check && stats.changed > 0) {
    failures.push(`正規化が必要な記事が${stats.changed}件あります`);
  }

  if (files.length === 0) failures.push('監査対象の記事がありません');

  return { stats, failures };
}

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  return {
    check: argv.includes('--check'),
    root: rootIndex >= 0 ? argv[rootIndex + 1] : process.cwd()
  };
}

if (require.main === module) {
  const result = run(parseArgs(process.argv.slice(2)));
  console.log(`記事検索意図・内部リンク監査: ${result.stats.scanned}件`);
  console.log(`変更: ${result.stats.changed}件 / 役割注記: ${result.stats.scopeAdded}件 / 関連記事追加: ${result.stats.relatedAdded}件`);
  if (result.failures.length > 0) {
    result.failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('全記事の関連記事と競合境界が整合しています。');
  }
}

module.exports = {
  ARTICLE_DIRS,
  RELATED_SECTIONS,
  SCOPE_NOTES,
  hasRelatedSection,
  normalizeHtml,
  run,
  validateArticle
};
