'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function write(file, text) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), text, 'utf8'); }
function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`patch anchor missing: ${label}`);
  return text.replace(from, to);
}

// A1/A3/A4: Japanese article usability — contextual fallback CTA, mobile-priority sidebar, no duplicate recommended widget.
{
  const file = 'scripts/article-static-usability.cjs';
  let s = read(file);
  s = replaceOnce(s,
`const ARTICLE_PROMPT_PATTERN = /<aside\\b[^>]*class=["'][^"']*\\barticle-calculator-prompt\\b[^"']*["'][^>]*>/i;\n`,
`const ARTICLE_PROMPT_PATTERN = /<aside\\b[^>]*class=["'][^"']*\\barticle-calculator-prompt\\b[^"']*["'][^>]*>/i;\nconst ACTION_CTA_OPEN_PATTERN = /<(?:aside|div|section)\\b(?=[^>]*\\bclass=["'][^"']*\\bcta-box\\b[^"']*["'])[^>]*>/gi;\n\nconst PROMPT_COPY = Object.freeze({\n  'ランク': { label: '目標ランクを自分の数字で確認', title: 'あといくらで届く？', body: '不足ポイントとGoogle Playに表示された獲得率を使って、目標ランクまでの必要額を確認できます。', href: '../', cta: '計算機で必要額を見る' },\n  'キャンペーン': { label: 'キャンペーン条件を数字で確認', title: '特別獲得率ならどれくらい変わる？', body: 'Google Playに表示された特別獲得率を入力して、通常時との差を自分の条件で確認できます。', href: '../', cta: '計算機で試す' },\n  '使い方': { label: '次に確認する情報を選ぶ', title: '使い方を目的別に探す', body: '交換・残高・対象購入など、知りたい内容に近いガイドから確認できます。', href: '../blog/?category=使い方', cta: '使い方ガイドを見る' },\n  'トラブル': { label: '症状から確認順を探す', title: '困っている内容に近いガイドへ', body: '反映されない、残高がおかしい、国やアカウントの問題など、症状別の確認手順を探せます。', href: '../blog/?category=トラブル', cta: 'トラブル解決ガイドを見る' },\n  default: { label: '記事の条件を自分の数字で確認', title: 'あなたの場合はいくら必要？', body: '不足ポイントとGoogle Playに表示された獲得率を使って、必要額の目安を確認できます。', href: '../', cta: '計算機で自分の必要額を見る' }\n});\n`, 'article prompt constants');

  s = replaceOnce(s,
`const PROMPT_HTML = \`\n            <aside class="article-calculator-prompt cta-box" \${GENERATED_PROMPT_ATTRIBUTE} aria-label="あなたの場合の必要額を計算">\n                <p class="article-calculator-prompt__label">記事の条件を自分の数字で確認</p>\n                <h2>あなたの場合はいくら必要？</h2>\n                <p>先に概算を出してから本文を読むと、一般条件と自分の状況を分けて確認できます。</p>\n                <a class="article-calculator-prompt__button" href="../">計算機で自分の必要額を見る</a>\n            </aside>\`;\n`,
`const PROMPT_HTML = renderPromptHtml('');\n\nfunction articleCategory(html) {\n  return html.match(/<body\\b[^>]*\\bdata-article-category=["']([^"']+)["']/i)?.[1] || '';\n}\n\nfunction renderPromptHtml(html) {\n  const copy = PROMPT_COPY[articleCategory(html)] || PROMPT_COPY.default;\n  return \`\n            <aside class="article-calculator-prompt cta-box" \${GENERATED_PROMPT_ATTRIBUTE} aria-label="\${copy.title}">\n                <p class="article-calculator-prompt__label">\${copy.label}</p>\n                <h2>\${copy.title}</h2>\n                <p>\${copy.body}</p>\n                <a class="article-calculator-prompt__button" href="\${copy.href}">\${copy.cta}</a>\n            </aside>\`;\n}\n\nfunction hasExistingActionCta(html) {\n  ACTION_CTA_OPEN_PATTERN.lastIndex = 0;\n  for (const match of html.matchAll(ACTION_CTA_OPEN_PATTERN)) {\n    const start = match.index || 0;\n    const tail = html.slice(start, Math.min(html.length, start + 2400));\n    const close = tail.search(/<\\/(?:aside|div|section)>/i);\n    const block = close >= 0 ? tail.slice(0, close) : tail;\n    if (/<a\\b[^>]*\\bhref=["'][^"']+["']/i.test(block)) return true;\n  }\n  return false;\n}\n`, 'generic prompt template');

  s = replaceOnce(s,
`function insertStaticPrompt(html) {\n  const withoutGeneratedPrompt = removeStaticPrompt(html);\n  if (ARTICLE_PROMPT_PATTERN.test(withoutGeneratedPrompt)) {\n    return withoutGeneratedPrompt;\n  }\n  const anchorEnd = findPromptAnchorEnd(withoutGeneratedPrompt);\n  if (anchorEnd < 0) return html;\n  return \`\${withoutGeneratedPrompt.slice(0, anchorEnd)}\${PROMPT_HTML}\${withoutGeneratedPrompt.slice(anchorEnd)}\`;\n}\n`,
`function insertStaticPrompt(html) {\n  const withoutGeneratedPrompt = removeStaticPrompt(html);\n  if (ARTICLE_PROMPT_PATTERN.test(withoutGeneratedPrompt) || hasExistingActionCta(withoutGeneratedPrompt)) {\n    return withoutGeneratedPrompt;\n  }\n  const anchorEnd = findPromptAnchorEnd(withoutGeneratedPrompt);\n  if (anchorEnd < 0) return html;\n  return \`\${withoutGeneratedPrompt.slice(0, anchorEnd)}\${renderPromptHtml(withoutGeneratedPrompt)}\${withoutGeneratedPrompt.slice(anchorEnd)}\`;\n}\n\nfunction normalizeMobileSidebarPriorities(html) {\n  return html\n    .replace(/<div class="sidebar-widget">(?=\\s*<div class="sidebar-widget-title">🧮\\s*Playポイント計算機<\\/div>)/g, '<div class="sidebar-widget sidebar-widget--mobile-primary">')\n    .replace(/<div class="sidebar-widget">(?=\\s*<div class="sidebar-widget-title">📁\\s*カテゴリー<\\/div>)/g, '<div class="sidebar-widget sidebar-widget--mobile-nav">')\n    .replace(/\\s*<div class="sidebar-widget">\\s*<div class="sidebar-widget-title">🔥\\s*おすすめ記事<\\/div>\\s*<div class="sidebar-widget-body">[\\s\\S]*?<\\/div>\\s*<\\/div>/g, '');\n}\n`, 'insertStaticPrompt');

  s = replaceOnce(s,
`    const next = normalizeSharedArticleCopy(insertStaticPrompt(insertStaticHeader(original)));\n`,
`    const next = normalizeMobileSidebarPriorities(normalizeSharedArticleCopy(insertStaticPrompt(insertStaticHeader(original))));\n`, 'static usability pipeline');

  s = replaceOnce(s,
`  insertStaticPrompt,\n  japaneseArticlePaths,\n`,
`  insertStaticPrompt,\n  hasExistingActionCta,\n  normalizeMobileSidebarPriorities,\n  japaneseArticlePaths,\n`, 'static usability exports');
  write(file, s);
}

// A2: the Complete Guide brand returns to its guide hub, not the calculator.
{
  const file = 'scripts/japanese-guide-brand.cjs';
  let s = read(file);
  s = replaceOnce(s,
`  return html.replace(logoPattern, \`$1🎮 \${GUIDE_BRAND}$2\`);\n`,
`  const branded = html.replace(logoPattern, \`$1🎮 \${GUIDE_BRAND}$2\`);\n  return branded.replace(\n    /(<a\\b(?=[^>]*\\bclass=["'][^"']*\\b(?:site-logo|logo)\\b[^"']*["'])[^>]*\\bhref=)(["'])[^"']*\\2/i,\n    '$1$2../blog/$2'\n  );\n`, 'guide brand logo href');
  write(file, s);
}

// A1/A2/A4: international shell — guide logo targets hub, mobile sidebar is compact, related guides live only in main content.
{
  const file = 'scripts/intl-article-layout.cjs';
  let s = read(file);
  s = s.replace("const { selectRelatedArticles } = require('./intl-related-guides.cjs');\n", '');
  s = replaceOnce(s,
`    '    <a class="site-logo" href="' + homeHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',\n`,
`    '    <a class="site-logo" href="' + guidesHref + '"><span aria-hidden="true">🎮</span><span class="site-logo-text">' + escapeHtml(locale.siteName) + '</span></a>',\n`, 'intl article logo');

  s = s.replace("function renderSidebar(localeKey, newline, relatedArticles = null) {", "function renderSidebar(localeKey, newline) {");
  s = s.replace(/\n  const articles = Array\.isArray\(relatedArticles\)[\s\S]*?: \(Array\.isArray\(locale\.articles\) \? locale\.articles\.slice\(0, 4\) : \[\]\);/, '');
  s = s.replace("    '  <section class=\"sidebar-widget\">',\n    '    <h2 class=\"sidebar-widget-title\">🧮 ", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-primary\">',\n    '    <h2 class=\"sidebar-widget-title\">🧮 ");
  s = s.replace("    '  <section class=\"sidebar-widget\">',\n    '    <h2 class=\"sidebar-widget-title\">🎯 ", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-secondary\">',\n    '    <h2 class=\"sidebar-widget-title\">🎯 ");
  s = s.replace("    '  <section class=\"sidebar-widget\">',\n    '    <h2 class=\"sidebar-widget-title\">📅 ", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-secondary\">',\n    '    <h2 class=\"sidebar-widget-title\">📅 ");
  s = s.replace("    '  <section class=\"sidebar-widget\">',\n    '    <h2 class=\"sidebar-widget-title\">💡 ", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-secondary\">',\n    '    <h2 class=\"sidebar-widget-title\">💡 ");
  s = s.replace("    '  <section class=\"sidebar-widget\">',\n    '    <h2 class=\"sidebar-widget-title\">📁 ", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-nav\">',\n    '    <h2 class=\"sidebar-widget-title\">📁 ");

  s = s.replace(/\n    '  <section class="sidebar-widget">',\n    '    <h2 class="sidebar-widget-title">🔥 '[\s\S]*?    '  <\/section>',/, '');
  s = s.replace("    '  <section class=\"sidebar-widget intl-sidebar-policy\">',", "    '  <section class=\"sidebar-widget sidebar-widget--mobile-secondary intl-sidebar-policy\">',");
  s = s.replace("function renderArticleLayout(localeKey, mainHtml, newline, relatedArticles = null) {", "function renderArticleLayout(localeKey, mainHtml, newline) {");
  s = s.replace("    renderSidebar(localeKey, newline, relatedArticles),", "    renderSidebar(localeKey, newline),");
  s = s.replace("function synchronizeArticle(html, localeKey, relativePath, relatedArticles = null) {", "function synchronizeArticle(html, localeKey, relativePath) {");
  s = s.replace("  const layout = renderArticleLayout(localeKey, mainHtml, newline, relatedArticles);", "  const layout = renderArticleLayout(localeKey, mainHtml, newline);");
  s = s.replace(/\n    const catalog = files\.map\(file => \{[\s\S]*?\n    \}\);\n/, '\n');
  s = s.replace("      const relatedArticles = selectRelatedArticles(catalog, relativePath, 4);\n      const after = synchronizeArticle(before, localeKey, relativePath, relatedArticles);", "      const after = synchronizeArticle(before, localeKey, relativePath);");
  write(file, s);
}

// A1: on mobile, retain only the primary action and guide navigation; redundant desktop widgets remain available on desktop.
{
  const file = 'articles/article-shared.css';
  let s = read(file);
  s = replaceOnce(s,
`.sidebar-column {\nwidth: 100%;\n}\n`,
`.sidebar-column {\nwidth: 100%;\ngap: 12px;\n}\n.sidebar-column > .sidebar-widget:not(.sidebar-widget--mobile-primary):not(.sidebar-widget--mobile-nav) {\ndisplay: none;\n}\n`, 'mobile sidebar css');
  write(file, s);
}

// A4: three Japanese pages used language alternatives as their only “related” section. Give them canonical same-language related guides.
{
  const file = 'scripts/article-content-navigation-normalize.cjs';
  let s = read(file);
  const anchor = `  'en/articles/google-play-points-not-showing.html': {\n    heading: 'Related troubleshooting guides',\n    links: [\n      ['./google-play-points-multiple-accounts.html', 'Check which Google Account owns the purchase and points'],\n      ['./google-play-points-refund.html', 'See how refunds can remove points and level progress'],\n      ['./google-play-points-country-change.html', 'Check how a Play country change affects points and level']\n    ]\n  }\n};`;
  const replacement = `  'en/articles/google-play-points-not-showing.html': {\n    heading: 'Related troubleshooting guides',\n    links: [\n      ['./google-play-points-multiple-accounts.html', 'Check which Google Account owns the purchase and points'],\n      ['./google-play-points-refund.html', 'See how refunds can remove points and level progress'],\n      ['./google-play-points-country-change.html', 'Check how a Play country change affects points and level']\n    ]\n  },\n  'articles/2025-12-25-refund.html': {\n    heading: '次に確認したい関連記事',\n    links: [\n      ['./2025-12-25-expiration.html', 'ポイント残高と有効期限の扱いを確認'],\n      ['./2025-12-25-playpoints-rank-maintenance.html', '返金後のランク維持条件を確認'],\n      ['./2026-03-10-play-points-reflection-timing.html', 'ポイント反映が遅い時の確認順を確認']\n    ]\n  },\n  'articles/2025-12-25-expiration.html': {\n    heading: '次に確認したい関連記事',\n    links: [\n      ['./2025-12-25-check-balance.html', 'ポイント残高と履歴の確認方法'],\n      ['./2025-12-25-refund.html', '返金時に残高・進捗がどう変わるか確認'],\n      ['./2026-08-05-play-points-levels-guide.html', 'ランク条件と必要ポイントを確認']\n    ]\n  },\n  'articles/2025-12-25-family-sharing.html': {\n    heading: '次に確認したい関連記事',\n    links: [\n      ['./2025-12-25-multiple-accounts.html', '複数Googleアカウント利用時の注意点'],\n      ['./2026-08-03-play-points-device-change.html', '機種変更後のポイント確認方法'],\n      ['./2026-08-05-play-country-change-points.html', 'Playの国変更時の残高・ランクへの影響']\n    ]\n  }\n};`;
  s = replaceOnce(s, anchor, replacement, 'related sections for locale-only pages');
  write(file, s);
}

// A5: one shared Language / region switcher for guide hubs and article pages.
write('scripts/article-locale-switcher.cjs', `'use strict';\n\nconst fs = require('node:fs');\nconst path = require('node:path');\n\nconst START = '<!-- ARTICLE_LOCALE_SWITCHER_START -->';\nconst END = '<!-- ARTICLE_LOCALE_SWITCHER_END -->';\nconst STYLE_ATTR = 'data-article-locale-switcher-style';\nconst TARGETS = ['ja', 'en', 'ko', 'zh-TW'];\nconst LABELS = Object.freeze({\n  ja: { aria: '言語・地域', options: { ja: '🇯🇵 日本語', en: '🇺🇸 English (US)', ko: '🇰🇷 한국어', 'zh-TW': '🇹🇼 繁體中文（台灣）' } },\n  en: { aria: 'Language / region', options: { ja: '🇯🇵 日本語', en: '🇺🇸 English (US)', ko: '🇰🇷 한국어', 'zh-TW': '🇹🇼 繁體中文（台灣）' } },\n  ko: { aria: '언어 / 지역', options: { ja: '🇯🇵 日本語', en: '🇺🇸 English (US)', ko: '🇰🇷 한국어', 'zh-TW': '🇹🇼 繁體中文（台灣）' } },\n  'zh-TW': { aria: '語言 / 地區', options: { ja: '🇯🇵 日本語', en: '🇺🇸 English (US)', ko: '🇰🇷 한국어', 'zh-TW': '🇹🇼 繁體中文（台灣）' } }\n});\n\nfunction escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[ch]); }\nfunction attr(tag, name) { return tag.match(new RegExp('\\\\b' + name + '=["\\\\\']([^"\\\\\']+)["\\\\\']', 'i'))?.[1] || ''; }\nfunction pageLang(html) { const raw = html.match(/<html\\b[^>]*\\blang=["']([^"']+)["']/i)?.[1] || 'en'; return raw.toLowerCase().startsWith('zh') ? 'zh-TW' : raw.toLowerCase().startsWith('ko') ? 'ko' : raw.toLowerCase().startsWith('ja') ? 'ja' : 'en'; }\nfunction internalPath(url) { try { const parsed = new URL(url, 'https://playpoint-sim.com/'); return parsed.origin === 'https://playpoint-sim.com' ? parsed.pathname + parsed.search + parsed.hash : null; } catch { return null; } }\nfunction alternates(html) {\n  const map = new Map();\n  for (const match of html.matchAll(/<link\\b[^>]*>/gi)) {\n    const tag = match[0];\n    if (attr(tag, 'rel').toLowerCase() !== 'alternate') continue;\n    const lang = attr(tag, 'hreflang');\n    const href = internalPath(attr(tag, 'href'));\n    if (TARGETS.includes(lang) && href) map.set(lang, href);\n  }\n  return map;\n}\nfunction hubAlternates() { return new Map([['ja','/blog/'],['en','/en/articles/'],['ko','/ko/articles/'],['zh-TW','/tw/articles/']]); }\nfunction render(lang, links) {\n  const labels = LABELS[lang] || LABELS.en;\n  const items = TARGETS.filter(key => links.has(key)).map(key => {\n    const current = key === lang ? ' aria-current="page"' : '';\n    return '<a href="' + escapeHtml(links.get(key)) + '" hreflang="' + key + '"' + current + '>' + escapeHtml(labels.options[key]) + '</a>';\n  }).join('');\n  return START + '\\n<nav class="article-locale-switcher" aria-label="' + escapeHtml(labels.aria) + '"><span class="article-locale-switcher__label">' + escapeHtml(labels.aria) + '</span><div class="article-locale-switcher__links">' + items + '</div></nav>\\n' + END;\n}\nfunction removeLegacyLanguageSection(html) {\n  const sections = [...html.matchAll(/<section\\b[^>]*>[\\s\\S]*?<\\/section>/gi)];\n  let out = html;\n  for (const match of sections.reverse()) {\n    if (!/<h2\\b[^>]*>\\s*他の言語で読む\\s*<\\/h2>/i.test(match[0])) continue;\n    out = out.slice(0, match.index) + out.slice((match.index || 0) + match[0].length);\n  }\n  return out;\n}\nfunction insertSwitcher(html, fragment) {\n  const breadcrumb = /<div\\b(?=[^>]*\\bclass=["'][^"']*\\bbreadcrumbs-wrapper\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/div>/i.exec(html);\n  if (breadcrumb) { const end = (breadcrumb.index || 0) + breadcrumb[0].length; return html.slice(0,end) + '\\n' + fragment + html.slice(end); }\n  const blogHeader = /<header\\b(?=[^>]*\\bclass=["'][^"']*\\bblog-header\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/header>/i.exec(html);\n  if (blogHeader) { const end = (blogHeader.index || 0) + blogHeader[0].length; return html.slice(0,end) + '\\n' + fragment + html.slice(end); }\n  return html;\n}\nfunction ensureStyle(html) {\n  html = html.replace(new RegExp('\\\\s*<link\\\\b[^>]*' + STYLE_ATTR + '[^>]*>', 'gi'), '');\n  return html.replace('</head>', '    <link rel="stylesheet" href="/articles/locale-switcher.css?v=1" ' + STYLE_ATTR + '>\\n</head>');\n}\nfunction processFile(root, relativePath, isHub = false) {\n  const file = path.join(root, relativePath);\n  if (!fs.existsSync(file)) return false;\n  const original = fs.readFileSync(file, 'utf8');\n  let html = original.replace(new RegExp(START + '[\\\\s\\\\S]*?' + END, 'g'), '');\n  html = removeLegacyLanguageSection(html);\n  const lang = pageLang(html);\n  const links = isHub ? hubAlternates() : alternates(html);\n  if (links.size < 2) return false;\n  html = ensureStyle(insertSwitcher(html, render(lang, links)));\n  if (html === original) return false;\n  fs.writeFileSync(file, html, 'utf8');\n  return true;\n}\nfunction syncArticleLocaleSwitchers(root) {\n  const targets = [['blog/index.html', true], ['en/articles/index.html', true], ['ko/articles/index.html', true], ['tw/articles/index.html', true]];\n  const registry = JSON.parse(fs.readFileSync(path.join(root,'blog','articles.json'),'utf8'));\n  for (const item of registry) { const rel = String(item.file || '').replace(/^\\.\\.\\//,''); if (/^articles\\/[^/]+\\.html$/.test(rel)) targets.push([rel,false]); }\n  for (const locale of ['en','ko','tw']) { const dir = path.join(root,locale,'articles'); if (!fs.existsSync(dir)) continue; for (const name of fs.readdirSync(dir)) if (name.endsWith('.html') && name !== 'index.html') targets.push([locale + '/articles/' + name,false]); }\n  let changed = 0;\n  for (const [file,isHub] of targets) if (processFile(root,file,isHub)) changed++;\n  return { checked: targets.length, changed };\n}\nmodule.exports = { alternates, removeLegacyLanguageSection, render, syncArticleLocaleSwitchers };\n`);

write('articles/locale-switcher.css', `.article-locale-switcher{max-width:1140px;margin:10px auto 0;padding:0 16px;display:flex;align-items:center;gap:10px;min-width:0;font-size:13px;color:#64748b}.article-locale-switcher__label{font-weight:700;white-space:nowrap}.article-locale-switcher__links{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0}.article-locale-switcher__links::-webkit-scrollbar{display:none}.article-locale-switcher a{display:inline-flex;align-items:center;min-height:36px;padding:6px 10px;border:1px solid #dbe2ea;border-radius:999px;background:#fff;color:#334155;text-decoration:none;white-space:nowrap}.article-locale-switcher a:hover{border-color:#94a3b8;background:#f8fafc}.article-locale-switcher a[aria-current="page"]{border-color:#164e63;background:#f0f7fa;color:#0e3746;font-weight:800}@media(max-width:600px){.article-locale-switcher{align-items:flex-start;flex-direction:column;gap:4px;padding:0 10px}.article-locale-switcher__links{width:100%}}`);

// Add locale switcher to canonical build before public asset-version sync.
{
  const file = 'scripts/build-html.js';
  let s = read(file);
  s = replaceOnce(s, "const { syncIntlHubDiscovery } = require('./intl-hub-discovery.cjs');\n", "const { syncIntlHubDiscovery } = require('./intl-hub-discovery.cjs');\nconst { syncArticleLocaleSwitchers } = require('./article-locale-switcher.cjs');\n", 'build import locale switcher');
  s = replaceOnce(s,
`const intlHubDiscoverySummary = syncIntlHubDiscovery(rootDir);\nconsole.log(\`[build-html] synchronized international guide discovery: \${intlHubDiscoverySummary.changed}/\${intlHubDiscoverySummary.checked} updated\`);\n\nrequire('./generate-game-simulators.cjs');\n`,
`const intlHubDiscoverySummary = syncIntlHubDiscovery(rootDir);\nconsole.log(\`[build-html] synchronized international guide discovery: \${intlHubDiscoverySummary.changed}/\${intlHubDiscoverySummary.checked} updated\`);\nconst articleLocaleSummary = syncArticleLocaleSwitchers(rootDir);\nconsole.log(\`[build-html] synchronized article language/region navigation: \${articleLocaleSummary.changed}/\${articleLocaleSummary.checked} updated\`);\n\nrequire('./generate-game-simulators.cjs');\n`, 'build call locale switcher');
  write(file, s);
}

// A6: calculator pages link to their localized editorial policy instead of the Japanese policy.
{
  const file = 'scripts/language-page-builder.cjs';
  let s = read(file);
  s = replaceOnce(s,
`  // 海外版では翻訳済み記事一覧へ遷移させ、日本語ブログへ迷い込ませない。\n  output = output.replace('href="../blog/" data-lang-key="linkArticles"', 'href="./articles/" data-lang-key="linkArticles"');\n`,
`  // 海外版では翻訳済み記事一覧・編集方針へ遷移させ、日本語ページへ迷い込ませない。\n  output = output.replace('href="../blog/" data-lang-key="linkArticles"', 'href="./articles/" data-lang-key="linkArticles"');\n  output = output.replace(/href="\\.\\.\\/author\\/katakata\\.html"/g, 'href="./author/katakata.html"');\n  output = output.replace(/https:\\/\\/playpoint-sim\\.com\\/author\\/katakata\\.html/g, \`https://playpoint-sim.com/\${langDir}/author/katakata.html\`);\n`, 'localized editorial policy href');
  write(file, s);
}

{
  const file = 'scripts/locale-config.cjs';
  let s = read(file);
  s = s.replace("linkAuthor: 'Operator & Policy (Japanese)'", "linkAuthor: 'Editorial policy'");
  s = s.replace("linkAuthor: '운영자 및 정책 (일본어)'", "linkAuthor: '운영자·검증 방침'");
  s = s.replace("linkAuthor: '營運者與政策（日文）'", "linkAuthor: '營運者與驗證方針'");
  s = s.replaceAll('href="../author/katakata.html" rel="author">operator and verification policy</a>', 'href="./author/katakata.html" rel="author">editorial and verification policy</a>');
  s = s.replaceAll('href="../author/katakata.html" rel="author">운영자 및 검증 방침</a>', 'href="./author/katakata.html" rel="author">운영자 및 검증 방침</a>');
  s = s.replaceAll('href="../author/katakata.html" rel="author">營運者與驗證方針</a>', 'href="./author/katakata.html" rel="author">營運者與驗證方針</a>');
  s = s.replaceAll('href="../author/katakata.html" rel="author">katakata</a> / Last Updated:', 'href="./author/katakata.html" rel="author">katakata</a> / Last Updated:');
  s = s.replaceAll('href="../author/katakata.html" rel="author">katakata</a> / 최종 업데이트:', 'href="./author/katakata.html" rel="author">katakata</a> / 최종 업데이트:');
  s = s.replaceAll('href="../author/katakata.html" rel="author">katakata</a> / 最後更新:', 'href="./author/katakata.html" rel="author">katakata</a> / 最後更新:');
  write(file, s);
}

// Focused regression contract for the A-rank UX work.
write('tests/a-rank-article-ux.test.cjs', `'use strict';\nconst assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const test=require('node:test');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');\n\ntest('article brand returns to the guide hub while KatakataLab stays in the top article header',()=>{const ja=read('articles/2025-12-25-refund.html');assert.match(ja,/class="site-logo" href="\\.\\.\\/blog\\/"/);assert.match(ja,/site-header-links[\\s\\S]*https:\\/\\/katakatalab\\.com\\//);for(const locale of ['en','ko','tw']){const html=read(locale+'/articles/google-play-points-refund.html');assert.match(html,new RegExp('class="site-logo" href="/'+locale+'/articles/"'));}});\n\ntest('mobile article sidebars keep only primary action and guide navigation contracts',()=>{const css=read('articles/article-shared.css');assert.match(css,/sidebar-widget:not\\(\\.sidebar-widget--mobile-primary\\):not\\(\\.sidebar-widget--mobile-nav\\)[\\s\\S]*display:\\s*none/);const ja=read('articles/2025-12-25-refund.html');assert.match(ja,/sidebar-widget sidebar-widget--mobile-primary/);assert.match(ja,/sidebar-widget sidebar-widget--mobile-nav/);const en=read('en/articles/google-play-points-refund.html');assert.match(en,/sidebar-widget sidebar-widget--mobile-primary/);assert.match(en,/sidebar-widget sidebar-widget--mobile-nav/);});\n\ntest('existing contextual CTA prevents a duplicate generic generated prompt',()=>{const ja=read('articles/2025-12-25-refund.html');assert.match(ja,/返金後のレベル進捗を確認/);assert.doesNotMatch(ja,/data-generated-article-prompt="true"/);});\n\ntest('related guides have one canonical main-content location',()=>{const en=read('en/articles/google-play-points-refund.html');assert.equal((en.match(/>Related guides</g)||[]).length,1);assert.doesNotMatch(en,/sidebar-widget-title">🔥\\s*Related guides/);const ja=read('articles/2025-12-25-refund.html');assert.match(ja,/article-related-guides/);assert.doesNotMatch(ja,/sidebar-widget-title">🔥\\s*おすすめ記事/);});\n\ntest('guide hubs and article pages expose a language-region switcher without legacy language-as-related blocks',()=>{for(const file of ['blog/index.html','articles/2025-12-25-refund.html','en/articles/index.html','en/articles/google-play-points-refund.html','ko/articles/index.html','tw/articles/index.html']){const html=read(file);assert.match(html,/class="article-locale-switcher"/);assert.match(html,/aria-current="page"/);}assert.doesNotMatch(read('articles/2025-12-25-refund.html'),/他の言語で読む/);});\n\ntest('EN KO TW calculator pages link to their localized editorial policy',()=>{const expectations={en:'Editorial policy',ko:'운영자·검증 방침',tw:'營運者與驗證方針'};for(const [locale,label] of Object.entries(expectations)){const html=read(locale+'/index.html');assert.match(html,new RegExp('href="\\./author/katakata\\.html" rel="author" data-lang-key="linkAuthor">'+label));assert.ok(html.includes('https://playpoint-sim.com/'+locale+'/author/katakata.html'));}});\n\ntest('top KatakataLab navigation remains available',()=>{for(const file of ['index.html','en/index.html','ko/index.html','tw/index.html'])assert.match(read(file),/data-lang-key="linkKatakata"/);});\n`);

console.log('A-rank UX source patch applied.');
