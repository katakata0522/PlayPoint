'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { createRevision } = require('./article-asset-versioning.cjs');
function text(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[\da-f]+|\d+);/gi, entity => {
      const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
      if (named[entity]) return named[entity];
      const code = entity.startsWith('&#x') ? parseInt(entity.slice(3), 16) : parseInt(entity.slice(2), 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }).replace(/\s+/g, ' ').trim();
}
function articleEntries(root) {
  const jp = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8')).filter(a => a.listed !== false)
    .map(a => ({ ...a, path: a.file.replace(/^\.\.\//, ''), locale: 'ja' }));
  const intl = ['en', 'ko', 'tw'].flatMap(locale => fs.readdirSync(path.join(root, locale, 'articles')).filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => ({ path: `${locale}/articles/${f}`, locale })));
  return [...jp, ...intl];
}
function extractSections(html) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '';
  const body = article.replace(/<!-- discovery-diary:start -->[\s\S]*?<!-- discovery-diary:end -->/g, '')
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '').replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
  const headings = [...body.matchAll(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi)];
  const sections = headings.map((m, i) => ({ id: m[2].match(/\bid=["']([^"']+)/)?.[1] || '', heading: text(m[3]),
    text: text(body.slice(m.index + m[0].length, headings[i + 1]?.index ?? body.length)).slice(0, 12000) }))
    .filter(s => s.text && !/関連記事|著者|公式参照|確認に使用|Related|Sources|About the author|관련 글|참고 자료|相關文章|參考資料/i.test(s.heading));
  const intro = text(body.slice(0, headings[0]?.index ?? body.length));
  if (intro) sections.unshift({ id: html.match(/<h1\b[^>]*\bid=["']([^"']+)/i)?.[1] || 'article-title', heading: text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''), text: intro });
  return sections;
}
const scopeCopy = {
  en: 'Language: English · US reference. Offers depend on your Google Play country and account.',
  ko: '표시 언어: 한국어 · 대한민국 기준. 혜택은 Google Play 국가와 계정에 따라 달라집니다.',
  tw: '顯示語言：繁體中文 · 台灣條件。優惠依 Google Play 國家／地區與帳號而定。'
};
const diaryCopy = {
  ja: ['受け取った結果を今週の日記に残す', '受取後のポイントや賞品を記録できます。記録はこの端末に保存され、Google Playとは連携しません。', '今週の日記を開く'],
  en: ['Keep a record of this week’s reward', 'After claiming in Google Play, record the points or prize here. Your diary stays on this device and does not connect to your Google account.', 'Open this week’s diary'],
  ko: ['이번 주에 받은 혜택을 기록해 두세요', 'Google Play에서 받은 포인트나 경품을 기록할 수 있습니다. 기록은 이 기기에 저장되며 Google 계정과 연결되지 않습니다.', '이번 주 기록 열기'],
  tw: ['記下這週領到的獎勵', '在 Google Play 領取後，可以在這裡記錄點數或獎品。紀錄只儲存在此裝置，不會連結 Google 帳戶。', '開啟本週紀錄']
};
function syncArticleDiscovery(root) {
  const entries = articleEntries(root), indexes = { ja: [], en: [], ko: [], tw: [] };
  const hubs = ['blog/index.html', ...['en', 'ko', 'tw'].map(l => `${l}/articles/index.html`)];
  for (const entry of entries) {
    const file = path.join(root, entry.path); let html = fs.readFileSync(file, 'utf8'); const before = html;
    html = html.replace(/\s*<p class="article-region-scope">[\s\S]*?<\/p>/g, '');
    if (entry.locale !== 'ja') {
      html = html.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, '$1\n<p class="article-region-scope">' + scopeCopy[entry.locale] + '</p>');
    }
    html = html.replace(/<h1\b([^>]*)>/i, (tag, attrs) => /\bid\s*=/.test(attrs) ? tag : '<h1' + attrs + ' id="article-title">');
    // 既存アンカーを維持し、見出しへ安定した直リンク先を補う。
    let index = 0;
    html = html.replace(/(<article\b[^>]*>)([\s\S]*?)(<\/article>)/i, (_, start, body, end) => {
      const used = new Set([...body.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
      return start + body.replace(/<h([23])\b([^>]*)>/gi, (tag, level, attrs) => {
        if (/\bid\s*=/.test(attrs)) return tag;
        do { index++; } while (used.has('article-section-' + index));
        used.add('article-section-' + index);
        return `<h${level}${attrs} id="article-section-${index}">`;
      }) + end;
    });
    html = html.replace(/\s*<!-- discovery-diary:start -->[\s\S]*?<!-- discovery-diary:end -->/g, '');
    if (classifyArticleRole(entry.path) === 'retention' && /weekly-reward/.test(entry.path)) {
      const copy = diaryCopy[entry.locale], home = entry.locale === 'ja' ? '/' : `/${entry.locale}/`;
      const block = `\n<!-- discovery-diary:start --><aside class="article-diary-link"><h2>${copy[0]}</h2><p>${copy[1]}</p><a href="${home}?mode=diary&amp;week=current" data-diary-entry>${copy[2]}</a></aside><!-- discovery-diary:end -->\n`;
      html = html.replace('</article>', block + '</article>');
    }
    if (html !== before) fs.writeFileSync(file, html);
    indexes[entry.locale].push({ path: '/' + entry.path, title: text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || entry.title || ''),
      description: entry.description || text(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || ''),
      category: entry.category || '', tags: entry.tags || [], role: classifyArticleRole(entry.path), sections: extractSections(html) });
  }
  for (const [locale, articles] of Object.entries(indexes)) {
    const target = locale === 'ja' ? 'blog/article-search-index.json' : `${locale}/articles/article-search-index.json`;
    const file = path.join(root, target), output = JSON.stringify({ version: 1, locale, articles });
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) fs.writeFileSync(file, output);
  }
  for (const relative of [...entries.map(e => e.path), ...hubs]) {
    const file = path.join(root, relative); let html = fs.readFileSync(file, 'utf8'); const before = html;
    html = html.replace(/\s*<!-- discovery-assets:start -->[\s\S]*?<!-- discovery-assets:end -->/g, '');
    const scripts = ['js/article-search.js', 'js/reading-library.js'].map(asset => `<script defer src="/${asset}?v=${createRevision(path.join(root, asset))}"></script>`).join('\n');
    const assets = `\n<!-- discovery-assets:start -->\n<link rel="stylesheet" href="/articles/article-discovery.css?v=${createRevision(path.join(root, 'articles/article-discovery.css'))}">\n${scripts}\n<!-- discovery-assets:end -->\n`;
    html = html.replace('</head>', assets + '</head>');
    if (html !== before) fs.writeFileSync(file, html);
  }
  return entries.length;
}
module.exports = { text, articleEntries, extractSections, syncArticleDiscovery };
if (require.main === module) console.log('Article discovery:', syncArticleDiscovery(path.resolve(__dirname, '..')));
