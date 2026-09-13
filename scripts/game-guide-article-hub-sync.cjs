'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  GAME_GUIDE_ARTICLES,
  PUBLISHED_AT,
  articleForPath,
  syncGameGuideArticleManifest
} = require('./game-guide-article-catalog.cjs');

const JSON_LD_SCRIPT = /<script\b([^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstArticleNode(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstArticleNode(child);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const type = value['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some(item => ['Article', 'BlogPosting', 'NewsArticle'].includes(item))) return value;
  for (const child of Object.values(value)) {
    const found = firstArticleNode(child);
    if (found) return found;
  }
  return null;
}

function firstFaqNode(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstFaqNode(child);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const type = value['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes('FAQPage')) return value;
  for (const child of Object.values(value)) {
    const found = firstFaqNode(child);
    if (found) return found;
  }
  return null;
}

function synchronizeStructuredData(head, article) {
  return String(head).replace(JSON_LD_SCRIPT, (full, attrs, body) => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return full;
    }
    const node = firstArticleNode(data);
    if (!node) return full;
    node.image ||= new URL(article.thumbnail || '../ogp.png', 'https://playpoint-sim.com/blog/').href;
    node.datePublished = article.date || PUBLISHED_AT;
    node.dateModified = article.modified || article.date || PUBLISHED_AT;
    return `<script${attrs}>\n${JSON.stringify(data, null, 2)}\n</script>`;
  });
}

function extractFaqPairs(head) {
  for (const match of String(head).matchAll(JSON_LD_SCRIPT)) {
    let data;
    try {
      data = JSON.parse(match[2]);
    } catch {
      continue;
    }
    const faq = firstFaqNode(data);
    if (!faq) continue;
    const entities = Array.isArray(faq.mainEntity) ? faq.mainEntity : faq.mainEntity ? [faq.mainEntity] : [];
    return entities.map(entity => {
      const answer = Array.isArray(entity?.acceptedAnswer) ? entity.acceptedAnswer[0] : entity?.acceptedAnswer;
      return { q: String(entity?.name || '').trim(), a: String(answer?.text || '').trim() };
    }).filter(item => item.q && item.a);
  }
  return [];
}

function ensureMeta(head, property, content) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bproperty=["']${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*>`, 'i');
  if (pattern.test(head)) {
    return head.replace(pattern, tag => /\bcontent=["'][^"']*["']/i.test(tag)
      ? tag.replace(/\bcontent=["'][^"']*["']/i, `content="${content}"`)
      : tag.replace(/>$/, ` content="${content}">`));
  }
  return head.replace('</head>', `  <meta property="${property}" content="${content}" />\n</head>`);
}

function standardizeHead(originalHead, article) {
  let head = synchronizeStructuredData(originalHead, article);
  head = head.replace(/\s*<link\b[^>]*href=["'][^"']*games\.css(?:\?[^"']*)?["'][^>]*>\s*/i, '\n');
  if (!/article-modern\.css/.test(head)) {
    head = head.replace(/(<link\b[^>]*href=["'][^"']*article-shared\.css(?:\?[^"']*)?["'][^>]*>)/i,
      '<link rel="stylesheet" href="/articles/article-modern.css" />\n  $1');
  }
  if (!/game-guide-article\.css/.test(head)) {
    head = head.replace(/(<link\b[^>]*href=["'][^"']*article-shared\.css(?:\?[^"']*)?["'][^>]*>)/i,
      '$1\n  <link rel="stylesheet" href="/articles/game-guide-article.css" />');
  }
  head = ensureMeta(head, 'article:published_time', article.date || PUBLISHED_AT);
  head = ensureMeta(head, 'article:modified_time', article.modified || article.date || PUBLISHED_AT);
  return head;
}

function extractGuideMain(html, relativePath) {
  const main = String(html).match(/<main\b[^>]*class=["'][^"']*\bgame-main-content\b[^"']*["'][^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error(`${relativePath}: game guide main content not found`);
  const header = main.match(/<header\b[^>]*class=["'][^"']*\bgame-header\b[^"']*["'][^>]*>[\s\S]*?<\/header>/i)?.[0];
  if (!header) throw new Error(`${relativePath}: game guide header not found`);
  const title = stripHtml(header.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const badge = stripHtml(header.match(/<span\b[^>]*class=["'][^"']*\bgame-badge\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] || 'ゲーム別課金ガイド');
  const afterHeader = main.slice((main.indexOf(header) + header.length));
  const leadMatch = afterHeader.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  const lead = leadMatch ? leadMatch[1].trim() : '';
  let body = leadMatch ? afterHeader.slice(leadMatch[0].length) : afterHeader;
  return { title, badge, lead, body };
}

function removeParentCta(body) {
  let label = '';
  const patterns = [
    /<p>\s*<a\b[^>]*class=["'][^"']*\bgame-giftcard-cta-btn\b[^"']*["'][^>]*href=["']\.\.\/["'][^>]*>([\s\S]*?)<\/a>\s*<\/p>/i,
    /<p>\s*<a\b[^>]*href=["']\.\.\/["'][^>]*>([\s\S]*?)<\/a>\s*<\/p>/i
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (!match) continue;
    label = stripHtml(match[1]).replace(/\s*➔\s*$/, '');
    body = body.replace(match[0], '');
    break;
  }
  return { body, label };
}

function normalizeBodySections(body) {
  let output = String(body)
    .replace(/class=["']game-ad-slot["']/gi, 'class="article-ad-container"')
    .replace(/class=["']game-ad-label["']/gi, 'class="article-ad-label"');
  output = output.replace(/<section\b([^>]*)class=["']section["']([^>]*)>\s*<h2([^>]*)>(出典|公式ソース)([\s\S]*?)<\/h2>/gi,
    '<section$1class="section source-list"$2><h2$3>$4$5</h2>');
  return output;
}

function renderFaqSection(pairs) {
  if (!pairs.length) return '';
  return `\n<section class="section game-guide-visible-faq"><h2>よくある質問</h2>${pairs.map(item => `<div class="faq-item"><h3>Q. ${escapeHtml(item.q)}</h3><p>A. ${escapeHtml(item.a)}</p></div>`).join('')}</section>`;
}

function renderRelatedSection(article) {
  const links = Array.isArray(article.related) ? article.related : [];
  return `\n<section class="section related-links-section"><h2>あわせて読みたい</h2><ul>${links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('')}</ul></section>`;
}

function renderAuthor() {
  return `\n<div class="author-profile-box"><div class="author-avatar">✍️</div><div class="author-info"><h4>この記事の著者：<a href="/author/katakata.html" rel="author">かたかた</a></h4><p>Google Play Points 計算機 運営・編集。ゲーム内課金とGoogle Play Pointsを、公式情報と現在の購入経路を分けて検証しています。<a href="/author/katakata.html" rel="author">詳しい検証方針を見る</a></p></div></div>`;
}

function renderArticleAd() {
  return `\n<div class="article-ad-container"><span class="article-ad-label">スポンサーリンク</span><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-3845885843809455" data-ad-slot="8250492620" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}

function renderShell({ head, article, title, badge, lead, body, faqPairs, nextLabel }) {
  const textLength = stripHtml(`${lead} ${body}`).length;
  const readMinutes = Math.max(3, Math.ceil(textLength / 500));
  const gameFilter = encodeURIComponent(article.gameTitle || '');
  const ctaLabel = nextLabel || `${article.gameTitle || 'ゲーム'} Play Points計算機を開く`;
  const hasArticleAd = /\barticle-ad-container\b/.test(body);
  return `<!doctype html>\n<html lang="ja">\n${head}\n<body data-article-category="ゲーム別" data-game-guide-article="true">\n<header class="site-header"><div class="site-header-inner"><a class="site-logo" href="/">🎮 Google Play Points 完全攻略ガイド</a><div class="site-header-links"><a href="/blog/">📝 記事一覧</a><a href="https://katakatalab.com/" target="_blank" rel="noopener noreferrer">🧪 KatakataLab</a></div></div></header>\n<nav class="global-nav ja-global-nav" aria-label="目的から探す"><div class="global-nav-inner"><a class="nav-item" href="/"><span>計算する</span></a><a class="nav-item" href="/blog/"><span>ガイドを探す</span></a><a class="nav-item" href="/blog/?category=トラブル"><span>トラブルを解決</span></a><a class="nav-item" href="/articles/2025-12-25-best-use.html"><span>貯める・使う</span></a><a class="nav-item" href="/articles/2026-08-05-play-points-levels-guide.html"><span>ランク・特典</span></a><a class="nav-item" href="/articles/2025-12-25-getting-started.html"><span>アカウント・基本</span></a></div></nav>\n<div class="breadcrumbs-wrapper"><nav aria-label="パンくずリスト"><a href="/">ホーム</a> <span>&gt;</span> <a href="/blog/">記事一覧</a> <span>&gt;</span> <a href="/blog/?game=${gameFilter}">${escapeHtml(article.gameTitle || 'ゲーム別')}</a> <span>&gt;</span> <span>${escapeHtml(title)}</span></nav></div>\n<div class="layout-container"><article class="content main-content-column">\n<header class="hero"><span class="hero-badge">${escapeHtml(badge || 'ゲーム別課金ガイド')}</span><h1 class="article-title" id="article-title">${escapeHtml(title)}</h1><p class="hero-meta">公開 <time data-article-date="published" datetime="${article.date}">${article.date.replaceAll('-', '/')}</time> ・ 更新 <time data-article-date="modified" datetime="${article.modified}">${article.modified.replaceAll('-', '/')}</time> ・ 公式情報確認 <time data-article-date="official-verified" datetime="${article.modified}">${article.modified.replaceAll('-', '/')}</time> ・ 読了 ${readMinutes}分</p></header>\n<div class="intro"><p>${lead}</p></div>\n${body}\n<section aria-labelledby="next-action" class="cta-box game-guide-next-action"><h2 id="next-action">次にやること</h2><p>購入予定額が決まったら、同じゲームの計算機でGoogle Play Pointsの目安を確認できます。</p><a class="cta-btn" href="../">${escapeHtml(ctaLabel)}</a></section>\n${renderFaqSection(faqPairs)}\n${renderRelatedSection(article)}\n${renderAuthor()}\n<nav id="article-nav" class="article-nav"></nav>\n${hasArticleAd ? '' : renderArticleAd()}\n</article></div>\n<footer class="site-footer"><div class="site-footer-links"><a href="/">計算機トップ</a> ｜ <a href="/blog/">記事一覧</a> ｜ <a href="/privacy.html">プライバシーポリシー</a> ｜ <a href="/terms.html">利用規約</a> ｜ <a href="/author/katakata.html">運営者情報</a></div><p>© 2026 Playポイント計算機 All Rights Reserved.</p><p class="site-footer-trademark">Google Play、Google Play ロゴ、Android は Google LLC の商標です。当サイトは個人によって運営される非公式のファンサイト・計算ツールであり、Google LLC および掲載されている各ゲームの配信元・開発会社とは一切関係ありません。</p></footer>\n<script src="/js/analytics-core.js"></script>\n</body>\n</html>\n`;
}

function transformGameGuide(rootDir, article) {
  const relativePath = article.file.replace(/^\.\.\//, '');
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`${relativePath}: registered game guide is missing`);
  const original = fs.readFileSync(absolutePath, 'utf8');
  const headMatch = original.match(/<head>[\s\S]*?<\/head>/i);
  if (!headMatch) throw new Error(`${relativePath}: head not found`);
  const head = standardizeHead(headMatch[0], article);
  if (/data-game-guide-article=["']true["']/.test(original)) {
    const repaired = original.replace(headMatch[0], () => head);
    if (repaired === original) return false;
    fs.writeFileSync(absolutePath, repaired, 'utf8');
    return true;
  }
  const faqPairs = extractFaqPairs(head);
  const main = extractGuideMain(original, relativePath);
  const cta = removeParentCta(main.body);
  const body = normalizeBodySections(cta.body);
  const output = renderShell({
    head,
    article,
    title: main.title || article.title,
    badge: main.badge,
    lead: main.lead,
    body,
    faqPairs,
    nextLabel: cta.label
  });
  fs.writeFileSync(absolutePath, output, 'utf8');
  return true;
}

function syncGameGuideArticleHub(rootDir) {
  const manifest = syncGameGuideArticleManifest(rootDir);
  const changedFiles = [];
  for (const article of GAME_GUIDE_ARTICLES) {
    if (transformGameGuide(rootDir, article)) changedFiles.push(article.file.replace(/^\.\.\//, ''));
  }
  return { manifest, checked: GAME_GUIDE_ARTICLES.length, changedFiles };
}

module.exports = {
  stripHtml,
  extractFaqPairs,
  normalizeBodySections,
  renderShell,
  syncGameGuideArticleHub,
  transformGameGuide
};

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  console.log(syncGameGuideArticleHub(root));
}
