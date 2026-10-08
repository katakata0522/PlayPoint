'use strict';
// 各記事を読んだ後の確認順。テーマの一致だけで他ゲームや低頻度の手続きへ誘導しない。
const RELATED_CHOICES = {
  'best-use': ['points-value-100', 'expiration', 'play-points-coupon-not-applied'],
  'google-play-quests': ['install-offer-points-not-received', 'play-points-reflection-timing', 'earn-play-points-free'],
  'super-weekly-reward': ['super-weekly-reward-prize-history', 'google-play-super-ticket-2026', 'weekly-reward-not-showing'],
  'weekly-reward': ['super-weekly-reward', 'weekly-reward-not-showing', 'earn-play-points-free'],
  'super-weekly-reward-prize-history': ['super-weekly-reward', 'google-play-super-ticket-2026', 'weekly-reward-not-showing'],
  'google-play-super-ticket-2026': ['super-weekly-reward', 'super-weekly-reward-prize-history', 'weekly-reward'],
  'play-points-calendar-schedule-guide-2026': ['play-points-day', 'weekly-reward', 'super-weekly-reward'],
  'black-diamond-diamond-vip-2026': ['play-points-levels-guide', 'diamond-vip', 'tgs-google-play-vip'],
  'getting-started': ['check-balance', 'earn-play-points-free', 'play-points-levels-guide'],
  'earn-play-points-free': ['weekly-reward', 'google-play-quests', 'install-offer-points-not-received'],
  'points-value-1': ['points-value-100', 'best-use', 'play-points-levels-guide'],
  'points-value-100': ['points-value-1', 'points-value-500-1000', 'best-use'],
  'points-value-500-1000': ['points-value-1', 'play-points-multiplier-stacking', 'best-use'],
  'expiration': ['check-balance', 'best-use', 'points-disappeared'],
  'refund': ['play-points-reflection-timing', 'playpoints-rank-maintenance', 'check-balance'],
  'family-sharing': ['family-link-play-points', 'multiple-accounts', 'payment-methods-points'],
  'check-balance': ['expiration', 'play-points-reflection-timing', 'playpoints-rank-maintenance'],
  'points-disappeared': ['expiration', 'check-balance', 'refund'],
  'family-link-play-points': ['play-points-cannot-join', 'family-sharing', 'multiple-accounts'],
  'january-rank-reset': ['playpoints-rank-maintenance', 'play-points-levels-guide', 'points-disappeared'],
  'playpoints-rank-maintenance': ['january-rank-reset', 'play-points-levels-guide', 'gold-platinum-worth-it'],
  'play-points-levels-guide': ['fastest-gold', 'gold-platinum-worth-it', 'playpoints-rank-maintenance'],
  'fastest-silver': ['weekly-reward', 'earn-play-points-free', 'play-points-multiplier-stacking'],
  'fastest-gold': ['play-points-levels-guide', 'gold-platinum-worth-it', 'playpoints-rank-maintenance'],
  'fastest-platinum': ['gold-platinum-worth-it', 'playpoints-rank-maintenance', 'diamond-worth-it'],
  'gold-platinum-worth-it': ['fastest-gold', 'fastest-platinum', 'playpoints-rank-maintenance'],
  'diamond-worth-it': ['diamond-vip', 'super-weekly-reward', 'playpoints-rank-maintenance'],
  'premium-support': ['gold-platinum-worth-it', 'play-points-reflection-timing', 'refund'],
  'play-points-cannot-join': ['family-link-play-points', 'multiple-accounts', 'play-country-change-points'],
  'device-change': ['check-balance', 'multiple-accounts', 'play-points-reflection-timing'],
  'play-points-cash-conversion': ['best-use', 'points-value-1', 'expiration'],
  'play-points-coupon-not-applied': ['check-balance', 'play-credit-not-working', 'best-use'],
  'play-credit-not-working': ['play-points-coupon-not-applied', 'play-country-change-points', 'best-use'],
  'play-points-promotion-not-showing': ['campaign', 'play-points-multiplier-stacking', 'play-points-reflection-timing'],
  'weekly-reward-not-showing': ['weekly-reward', 'super-weekly-reward', 'january-rank-reset'],
  'play-points-day': ['campaign', 'play-points-multiplier-stacking', 'play-points-reflection-timing'],
  'new-year-campaign': ['campaign', 'playpoints-rank-maintenance', 'play-points-multiplier-stacking'],
  'campaign': ['play-points-day', 'play-points-multiplier-stacking', 'play-points-promotion-not-showing'],
  'pixel-discount-coupon': ['play-points-google-store', 'super-weekly-reward', 'diamond-vip'],
  'play-pass-worth-it': ['weekly-reward', 'google-play-super-ticket-2026', 'subscription'],
  'youtube-premium-play-points': ['subscription', 'play-points-reflection-timing', 'refund'],
  'subscription': ['payment-methods-points', 'play-points-reflection-timing', 'refund'],
  'payment-methods-points': ['gift-card', 'web-store-external-billing-points', 'subscription'],
  'discount-gift-cards': ['payment-methods-points', 'play-points-multiplier-stacking', 'best-use'],
  'pc-play-games-points': ['play-games', 'play-points-multiplier-stacking', 'play-points-reflection-timing'],
  'play-games': ['pc-play-games-points', 'google-play-quests', 'play-points-reflection-timing'],
  'play-country-change-points': ['check-balance', 'multiple-accounts', 'play-credit-not-working'],
  'play-points-reflection-timing': ['check-balance', 'payment-methods-points', 'refund'],
  'play-points-multiplier-stacking': ['points-value-1', 'campaign', 'play-points-reflection-timing'],
  'nikke-monthly-card-midasbuy-2026': ['web-store-external-billing-points', 'payment-methods-points', 'best-use'],
  'bluearchive-monthly-packs-guide-2026': ['web-store-external-billing-points', 'play-points-multiplier-stacking', 'best-use'],
  'gakumas-webshop-google-play-2026': ['web-store-external-billing-points', 'payment-methods-points', 'best-use'],
  'pokemon-sleep-play-points-coupon-2026': ['play-points-coupon-not-applied', 'expiration', 'best-use'],
  'monst-in-app-packs-guide-2026': ['monst-web-shop-vs-google-play-2026', 'play-points-day', 'subscription'],
  'monst-web-shop-vs-google-play-2026': ['monst-in-app-packs-guide-2026', 'web-store-external-billing-points', 'play-points-multiplier-stacking'],
  'pad-puzzle-and-dragons-play-points': ['pad-pass-value-2026', 'web-store-external-billing-points', 'best-use'],
  'dokkan-battle-dragon-ball-play-points': ['dokkan-google-play-vs-webstore-2026', 'web-store-external-billing-points', 'best-use']
};
const GUIDE_RETURNS = {
  'ranks': ['play-points-levels-guide', 'fastest-silver', 'fastest-gold', 'fastest-platinum', 'playpoints-rank-maintenance', 'january-rank-reset', 'gold-platinum-worth-it', 'diamond-worth-it'],
  'using-points': ['best-use', 'play-points-cash-conversion', 'points-value-1', 'points-value-100', 'expiration', 'play-points-coupon-not-applied', 'play-credit-not-working', 'play-points-google-store'],
  'troubleshooting': ['points-disappeared', 'play-points-cannot-join', 'play-points-reflection-timing', 'weekly-reward-not-showing', 'redeemed-item-not-received', 'install-offer-points-not-received', 'play-points-locked', 'google-play-quests']
};
const GUIDE_LABELS = { ranks: 'ランクの必要額・維持条件から選ぶ', 'using-points': '使う予定・期限から交換先を選ぶ', troubleshooting: '困っている状況から確認手順を選ぶ' };
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function improveReaderLinks(html, article, byId) {
  const ids = RELATED_CHOICES[article.id];
  const sectionPattern = /<(section|aside)\b[^>]*class="[^"]*(?:related-links-section|contextual-guide-links|article-related-guides)[^"]*"[^>]*>[\s\S]*?<\/\1>/;
  if (ids && !html.includes('data-editorial-next="true"')) {
    const previous = html.match(sectionPattern)?.[0];
    if (!previous) throw new Error(article.id + ': 関連記事の配置が見つかりません');
    const languageSection = previous.includes('他の言語で読む');
    const headingId = languageSection ? 'reader-related-guides' : previous.match(/<h2\b[^>]*id="([^"]+)"/)?.[1] || 'reader-related-guides';
    const links = ids.map(id => {
      const target = byId.get(id);
      if (!target || target.listed === false || id === article.id) throw new Error(article.id + ': 不正な関連記事 ' + id);
      return '<li><a href="/' + escape(target.file.slice(3)) + '">' + escape(target.listTitle || target.title) + '</a></li>';
    }).join('');
    const className = article.id === 'points-value-1' ? 'section contextual-guide-links related-links-section' : 'section related-links-section';
    const section = '<section class="' + className + '"><h2 id="' + headingId + '">あわせて読みたい</h2><ul>' + links + '</ul></section>';
    html = html.replace(previous, section + (languageSection ? '\n' + previous.replace('related-links-section', 'article-language-links') : ''));
  }
  html = html.replace(/<!-- reader-topic-return:start -->[\s\S]*?<!-- reader-topic-return:end -->\s*/g, '');
  const guide = Object.keys(GUIDE_RETURNS).find(key => GUIDE_RETURNS[key].includes(article.id));
  if (guide) {
    const entry = '<!-- reader-topic-return:start --><p class="reader-topic-return"><a href="/guides/' + guide + '/">' + GUIDE_LABELS[guide] + ' →</a></p><!-- reader-topic-return:end -->\n';
    const related = html.match(sectionPattern)?.[0];
    if (related) html = html.replace(related, entry + related);
  }
  return html;
}
module.exports = { RELATED_CHOICES, GUIDE_RETURNS, improveReaderLinks };

