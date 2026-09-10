'use strict';

const path = require('node:path');

/**
 * 記事カテゴリー（ランク/使い方/トラブル等）とは別に、
 * 「PlayPoint全体の中で何の仕事をするページか」を定義する。
 *
 * primaryKpi は改善判断の第一指標。未計測の指標は、
 * 無理に別指標で代用せず measurementStatus で明示する。
 */
const ROLE_DEFINITIONS = Object.freeze({
  calculator_bridge: Object.freeze({
    label: '計算・個別判断への橋渡し',
    job: '一般条件を読者自身の不足ポイント・金額・ランク条件へ落とし込み、計算結果まで到達させる',
    primaryKpi: 'view_to_first_calculation_success',
    secondaryKpis: ['article_to_calculator_rate', 'calculator_start_rate', 'search_ctr'],
    measurementStatus: 'measurable_now',
    doNotOptimizeBy: ['滞在時間だけ', 'PVだけ']
  }),
  decision_support: Object.freeze({
    label: '選択・意思決定支援',
    job: '交換・購入・キャンペーン等の選択肢を比較し、読者が自分の条件で次の行動を選べるようにする',
    primaryKpi: 'contextual_next_action_rate',
    secondaryKpis: ['organic_landing_users', 'search_ctr', 'assisted_calculation_success'],
    measurementStatus: 'partial',
    doNotOptimizeBy: ['計算機クリック率だけ', '記事滞在時間だけ']
  }),
  troubleshooting: Object.freeze({
    label: '問題解決',
    job: '症状を切り分け、公式確認・設定確認・再試行など解決に必要な次の行動へ案内する',
    primaryKpi: 'resolution_next_action_rate',
    secondaryKpis: ['organic_landing_users', 'search_ctr', 'return_to_site_rate'],
    measurementStatus: 'partial',
    doNotOptimizeBy: ['計算機クリック率', '長い滞在時間']
  }),
  retention: Object.freeze({
    label: '再訪・継続利用',
    job: '週次特典・クエスト・季節施策など、時間とともに変わる情報を理由にPlayPointへ戻る習慣を作る',
    primaryKpi: 'returning_user_rate',
    secondaryKpis: ['repeat_landing_users', 'search_demand', 'related_navigation_rate'],
    measurementStatus: 'partial',
    doNotOptimizeBy: ['単発PVだけ', '初回計算率だけ']
  }),
  game_decision: Object.freeze({
    label: 'ゲーム別課金判断',
    job: '抽象的なPlay Points条件を特定ゲームの実際の購入候補へ接続し、比較・計算で意思決定を助ける',
    primaryKpi: 'game_article_to_calculator_success',
    secondaryKpis: ['game_calculator_click_rate', 'organic_landing_users', 'search_ctr'],
    measurementStatus: 'partial',
    doNotOptimizeBy: ['攻略断定の強さ', 'PVだけ']
  }),
  reference: Object.freeze({
    label: '基礎理解・参照',
    job: '制度・アカウント・購入条件などの基礎を正確に説明し、他の判断や問題解決を支える参照点になる',
    primaryKpi: 'assisted_navigation_rate',
    secondaryKpis: ['organic_landing_users', 'search_ctr', 'return_to_site_rate'],
    measurementStatus: 'partial',
    doNotOptimizeBy: ['計算機クリック率だけ', '文字数']
  }),
  hold: Object.freeze({
    label: '検索品質保留',
    job: '公式確認が足りないテーマを検索流入へ出さず、発表後に公開判断できる状態で保持する',
    primaryKpi: 'verified_before_indexing',
    secondaryKpis: ['source_freshness'],
    measurementStatus: 'operational',
    doNotOptimizeBy: ['検索流入', '公開速度']
  })
});

function stemOf(relativePath) {
  return path.basename(String(relativePath || ''), '.html').toLowerCase();
}

const ROLE_RULES = Object.freeze([
  {
    role: 'game_decision',
    test: stem => /(?:pad-puzzle-and-dragons|dokkan-battle|umamusume-half-anniversary)/.test(stem)
  },
  {
    role: 'troubleshooting',
    test: stem => /(?:not-showing|not-working|not-applied|cannot-join|locked|disappeared|not-received|reflection-timing|coupon-not-applied|promotion-not-applied)/.test(stem)
  },
  {
    role: 'retention',
    test: stem => /(?:super-weekly-reward|weekly-reward|google-play-quests|play-points-day|new-year-campaign)/.test(stem)
  },
  {
    role: 'calculator_bridge',
    test: stem => /(?:fastest-|(?:^|-)1-value|100-value|500-1000-(?:value|cost)|levels(?:-guide)?$|platinum-diamond-cost|diamond-worth-it|rank-maintenance|level-maintenance-reset)/.test(stem)
  },
  {
    role: 'decision_support',
    test: stem => /(?:best-use|cash-conversion|gift-card|discount|promo-code|discounts-promo-codes|promotion-stacking|multiplier-stacking|payment-methods|balance-combine-payment|external-billing|play-pass-worth-it|youtube-premium|pixel-discount|gold-platinum-worth-it|google-store|earn-play-points-free|points-earn-free|use-coupons|campaign$)/.test(stem)
  },
  {
    role: 'reference',
    test: stem => /(?:getting-started|check-balance|expiration|family-sharing|family-link|multiple-accounts|movies-books|play-games|games-vs-play-points|refund|subscription|subscriptions|device-change|country-change|country-differences|apps-books-purchases|balance-history-progress|join-eligibility|rounding-tax|diamond-vip|premium-support|pc-play-games-points|redeemed-item|install-offer|january-rank-reset)/.test(stem)
  }
]);

function classifyArticleRole(relativePath, { listed = true } = {}) {
  if (listed === false) return 'hold';
  const stem = stemOf(relativePath);
  for (const rule of ROLE_RULES) {
    if (rule.test(stem)) return rule.role;
  }
  return null;
}

function getArticleRoleContract(relativePath, options) {
  const role = classifyArticleRole(relativePath, options);
  if (!role) return null;
  return { role, ...ROLE_DEFINITIONS[role] };
}

module.exports = {
  ROLE_DEFINITIONS,
  classifyArticleRole,
  getArticleRoleContract,
  stemOf
};
