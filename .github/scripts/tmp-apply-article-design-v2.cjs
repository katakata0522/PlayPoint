'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, String(content).replace(/\r\n/g, '\n'), 'utf8');
}

function replaceOnce(content, needle, replacement, relativePath) {
  if (!content.includes(needle)) throw new Error(`${relativePath}: patch anchor not found`);
  return content.replace(needle, replacement);
}

function replaceMarkedSection(content, start, end, section) {
  const pattern = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'm');
  const normalized = `${start}\n${section.trim()}\n${end}\n`;
  return pattern.test(content)
    ? content.replace(pattern, normalized)
    : `${content.trimEnd()}\n\n${normalized}`;
}

const cssStart = '/* ARTICLE_DESIGN_SYSTEM_V2_START */';
const cssEnd = '/* ARTICLE_DESIGN_SYSTEM_V2_END */';
const designCss = String.raw`
/*
 * Article Design System 2.0
 *
 * Preserve historical compatibility layers while making shared CSS the final
 * visual contract. Prioritize fast scanning: answer, conditions, next action.
 */
:root {
--article-ds-text: #0f172a;
--article-ds-muted: #64748b;
--article-ds-border: #dbe3ec;
--article-ds-surface: #ffffff;
--article-ds-soft: #f8fafc;
--article-ds-marker: #fde68a;
--article-ds-focus: #0b57d0;
}

body .main-content-column .hero-badge,
body .main-card .hero-badge {
border-radius: 999px;
border-color: var(--article-ds-border);
background: var(--article-accent-soft, #f0f7fa);
color: var(--article-accent-dark, #0e3746);
padding: 4px 9px;
margin-bottom: 10px;
letter-spacing: 0.01em;
}
body .main-content-column .hero-meta,
body .main-card .hero-meta {
color: var(--article-ds-muted);
border-bottom-color: var(--article-ds-border);
margin-bottom: 20px;
}

body .content > .section > h2,
body .content > section.section > h2,
body .content > .related-links-section > h2,
body .content > .contextual-guide-links > h2,
body .content > .article-related-guides > h2,
body .content > .faq-section > h2 {
background: linear-gradient(90deg, var(--article-accent-soft, #f0f7fa) 0%, #ffffff 100%) !important;
color: var(--article-ds-text) !important;
border: 1px solid var(--article-ds-border) !important;
border-left: 5px solid var(--article-accent, #164e63) !important;
border-radius: 8px !important;
box-shadow: none !important;
padding: 11px 14px !important;
margin: 38px 0 18px !important;
font-size: 1.16rem !important;
line-height: 1.5 !important;
text-wrap: balance;
scroll-margin-top: 24px;
}
body .content > .section > h3 {
background: transparent !important;
color: var(--article-ds-text) !important;
border: 0 !important;
border-left: 3px solid var(--article-accent, #164e63) !important;
padding: 3px 0 3px 12px !important;
margin: 28px 0 14px !important;
box-shadow: none !important;
}

body .content > .answer-box,
body .content > .editorial-answer {
position: relative;
background: linear-gradient(135deg, var(--article-accent-soft, #f0f7fa) 0%, #ffffff 82%) !important;
border: 1px solid var(--article-ds-border) !important;
border-left: 5px solid var(--article-accent, #164e63) !important;
border-radius: 10px !important;
padding: 18px 20px 18px 54px !important;
margin: 16px 0 !important;
color: #1f2937;
box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05) !important;
text-align: left !important;
}
body .content > .answer-box::before,
body .content > .editorial-answer::before {
content: "✓" !important;
position: absolute;
top: 18px;
left: 17px;
display: grid;
place-items: center;
width: 25px;
height: 25px;
border-radius: 50%;
background: var(--article-accent, #164e63);
color: #ffffff;
font-size: 14px;
font-weight: 900;
line-height: 1;
}
body .content > .answer-box > h2,
body .content > .editorial-answer > h2 {
display: block !important;
background: none !important;
color: var(--article-accent-dark, #0e3746) !important;
border: 0 !important;
border-radius: 0 !important;
padding: 0 !important;
margin: 0 0 8px !important;
box-shadow: none !important;
font-size: 1.04rem !important;
line-height: 1.55 !important;
}
body .content > .answer-box > p:last-child,
body .content > .editorial-answer > p:last-child {
margin-bottom: 0;
}

body .content > .intro {
background: transparent !important;
color: #334155 !important;
border: 0 !important;
border-left: 3px solid var(--article-accent, #164e63) !important;
border-radius: 0 !important;
padding: 3px 0 3px 14px !important;
margin: 14px 0 18px !important;
box-shadow: none !important;
text-align: left !important;
font-size: 1rem !important;
line-height: 1.8 !important;
}
body .content > .answer-box + .intro,
body .content > .editorial-answer + .intro {
margin-top: -2px !important;
}

body .content > .summary-box {
background: var(--article-ds-soft) !important;
color: #334155 !important;
border: 1px solid var(--article-ds-border) !important;
border-radius: 9px !important;
padding: 14px 16px !important;
margin: 16px 0 22px !important;
box-shadow: none !important;
}
body .content > .summary-box > h2 {
display: block !important;
background: none !important;
color: var(--article-ds-text) !important;
border: 0 !important;
padding: 0 0 8px !important;
margin: 0 0 10px !important;
box-shadow: none !important;
font-size: 0.98rem !important;
line-height: 1.5 !important;
}
body .content > .summary-box > ul {
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 7px 20px;
padding-left: 1.25rem;
margin: 0;
}
body .content > .summary-box li {
margin: 0;
line-height: 1.65;
}

body .content > .intro > strong:first-child,
body .content > .answer-box > p:first-of-type strong,
body .content > .editorial-answer > p:first-of-type strong {
background-image: linear-gradient(transparent 58%, var(--article-ds-marker) 58%);
-webkit-box-decoration-break: clone;
box-decoration-break: clone;
padding: 0 0.08em;
}
body .content .marker-yellow {
background-image: linear-gradient(transparent 58%, #fde68a 58%);
-webkit-box-decoration-break: clone;
box-decoration-break: clone;
}
body .content .marker-blue {
background-image: linear-gradient(transparent 58%, #bae6fd 58%);
-webkit-box-decoration-break: clone;
box-decoration-break: clone;
}
body .content .marker-red {
background-image: linear-gradient(transparent 58%, #fecdd3 58%);
-webkit-box-decoration-break: clone;
box-decoration-break: clone;
}

body .content .table-card,
body .content .table-wrap {
border: 1px solid var(--article-ds-border);
border-radius: 10px;
background: var(--article-ds-surface);
box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
scrollbar-width: thin;
overscroll-behavior-inline: contain;
}
body .content .table-card table,
body .content .table-wrap table {
margin: 0;
box-shadow: none;
}
body .content .table-card th,
body .content .table-wrap th {
background: var(--article-accent-soft, #f0f7fa);
color: var(--article-ds-text);
}
body .content .table-card tbody tr:nth-child(even) td,
body .content .table-wrap tbody tr:nth-child(even) td {
background: #fbfdff;
}
@media (hover: hover) {
body .content .table-card tbody tr:hover td,
body .content .table-wrap tbody tr:hover td {
background: #f8fafc;
}
}

body .content .related-links-section > ul,
body .content .contextual-guide-links > ul,
body .content .article-related-guides > ul {
list-style: none;
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 10px;
padding-left: 0;
margin-bottom: 0;
}
body .content .related-links-section > ul > li,
body .content .contextual-guide-links > ul > li,
body .content .article-related-guides > ul > li {
margin: 0;
}
body .content .related-links-section > ul > li > a,
body .content .contextual-guide-links > ul > li > a,
body .content .article-related-guides > ul > li > a {
display: flex;
align-items: center;
min-height: 58px;
padding: 12px 14px;
border: 1px solid var(--article-ds-border);
border-radius: 8px;
background: #ffffff;
color: var(--cocoon-link, #0284c7);
font-weight: 700;
line-height: 1.55;
text-decoration: none !important;
box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
text-wrap: pretty;
}
@media (hover: hover) {
body .content .related-links-section > ul > li > a:hover,
body .content .contextual-guide-links > ul > li > a:hover,
body .content .article-related-guides > ul > li > a:hover {
border-color: #94a3b8;
box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08);
transform: translateY(-1px);
}
}

body .content p,
body .content li {
text-wrap: pretty;
}
body .content a:focus-visible,
body .content button:focus-visible,
body .content summary:focus-visible {
outline: 3px solid var(--article-ds-focus);
outline-offset: 3px;
border-radius: 4px;
}

@media (max-width: 860px) {
body .content > .section > h2,
body .content > section.section > h2,
body .content > .related-links-section > h2,
body .content > .contextual-guide-links > h2,
body .content > .article-related-guides > h2,
body .content > .faq-section > h2 {
margin: 30px 0 15px !important;
padding: 10px 12px !important;
font-size: 1.08rem !important;
}
body .content > .answer-box,
body .content > .editorial-answer {
padding: 15px 14px 15px 48px !important;
border-radius: 8px !important;
}
body .content > .answer-box::before,
body .content > .editorial-answer::before {
top: 15px;
left: 13px;
width: 24px;
height: 24px;
}
body .content > .summary-box > ul,
body .content .related-links-section > ul,
body .content .contextual-guide-links > ul,
body .content .article-related-guides > ul {
grid-template-columns: 1fr;
}
body .content .related-links-section > ul > li > a,
body .content .contextual-guide-links > ul > li > a,
body .content .article-related-guides > ul > li > a {
min-height: 54px;
}
}

@media (prefers-reduced-motion: reduce) {
body .content a,
body .content button,
body .content summary {
scroll-behavior: auto !important;
transition-duration: 0.01ms !important;
}
}
`;
write('articles/article-shared.css', replaceMarkedSection(read('articles/article-shared.css'), cssStart, cssEnd, designCss));

const architectureStart = '<!-- ARTICLE_DESIGN_SYSTEM_V2_START -->';
const architectureEnd = '<!-- ARTICLE_DESIGN_SYSTEM_V2_END -->';
const architectureSection = String.raw`
## Design System 2.0 の視覚階層

2026-09-11 以降は、旧Cocoon風の「部品を増やす」発想ではなく、読者が短時間で答えと次の行動を拾える視覚階層を article-shared.css の最終契約として持つ。

- Hero は記事タイトルを主役にし、バッジと日付は補助情報に留める。
- .answer-box / .editorial-answer をAbove the foldの最優先回答とする。
- .intro は2つ目の大きなカードにせず、回答を補う短い導入へ縮退する。
- .summary-box は「この記事で分かること」を素早く走査する小型コンポーネントにする。
- 蛍光マーカーは重要箇所だけに使う。本文のstrongを一律装飾しない。
- H2は濃色の全面帯をやめ、カテゴリーアクセント付きの軽い見出しへ統一する。
- 比較表は横スクロール安全性を維持しつつ、ヘッダー・交互行で視線を支援する。
- 関連記事はArticle RoleのNext Jobをカードとして見せる。単なる青文字リストへ戻さない。
- JSが無効でも本文・階層・強調が成立することを必須条件とする。

Article Roleは「何を主導線にするか」を決め、Design Systemは「その主導線をどう読み取れる形にするか」を担当する。Roleを色だけで説明したり、すべてのRoleへ同じCTAを出したりしない。
`;
write('docs/ARTICLE_CSS_ARCHITECTURE.md', replaceMarkedSection(read('docs/ARTICLE_CSS_ARCHITECTURE.md'), architectureStart, architectureEnd, architectureSection));

write('docs/ARTICLE_DESIGN_SYSTEM_V2_2026-09-11.md', `# PlayPoint Article Design System 2.0 — 2026-09-11

## 目的

SEOの文章量を増やすのではなく、検索流入した読者が「答え → 条件 → 次の行動」を短時間で拾える記事体験へ統一する。既存のCocoon風設計の良い部分は残し、歴史的に積み重なった重複カードと過剰な視覚重量を整理する。

## 継承するもの

- site header / global nav / breadcrumbs
- 2カラム + モバイル1カラム
- Hero、カテゴリー色、FAQ、著者情報
- 横スクロール可能な比較表
- callout / knowledge boundary
- Article Roleによる主導線の分離

## 復活・進化するもの

- 蛍光マーカー: marker-yellow / marker-blue / marker-red を共通契約として維持し、legacy introや直接回答の編集上重要なstrongにも限定適用する。
- 要点表示: answer-box を最も強い回答面、summary-box を小型の走査面へ整理する。
- 関連記事: Next Jobへのカード型ナビゲーションとして表示する。

## 整理するもの

旧記事では Answer Box → Intro → Summary Box が連続し、本文に入る前に大きな箱が3つ積まれる場合がある。本文や検索回答は削除せず、CSSの視覚階層だけを次のように変える。

1. Answer Box = 主回答
2. Intro = 補助説明（大きな背景カードを廃止）
3. Summary = コンパクトな「分かること」一覧
4. 本文H2 = 濃い全面帯ではなく、アクセント左線 + 淡い背景

## 強調ルール

蛍光マーカーは「重要だから太字」の代替ではない。1画面に何本も出さず、結論の数値・条件、誤解しやすい分岐、比較時に判断を変える条件へ限定する。警告は赤マーカーではなくwarning callout、補足はblue/info calloutを優先する。

## Article Roleとの接続

- calculator_bridge: 計算CTAが主行動。本文の比較・数値を読みやすくする。
- decision_support: 比較表と判断条件、関連記事Next Jobを優先。
- troubleshooting: 直接回答 → 切り分け → 公式確認/次の手順の順番を視覚的に守る。
- retention: 更新理由・今見るべき場所・次回戻る理由を見つけやすくする。
- game_decision: ゲーム固有の購入候補と計算を分けて見せる。
- reference: 直接回答と参照先を主役にし、計算CTAへ無理に寄せない。
- hold: 公開促進のデザイン最適化対象にしない。

## アクセシビリティ / モバイル

- JSなしでも見た目の階層が成立する。
- モバイル横overflowは1px以下を既存Browser smokeで維持する。
- 関連記事カードはモバイル1列。
- :focus-visible を明示する。
- prefers-reduced-motion を尊重する。
- 色だけに意味を依存しない。

## 旧資産の扱い

scripts/validate_articles.py は49記事時代・全記事計算CTA必須・ローカルWindows絶対パスという旧契約のため廃止する。現行の品質保証は、Article Role監査、Design System監査、Node回帰テスト、Chromium smokeを正本とする。

## 変更境界

この導入ではtitle / meta description / H1 / 記事本文の検索回答を意図的に書き換えない。変更するのは共通CSS、品質契約、検証コード、CSS content-hash参照である。
`);

write('scripts/article-design-system-audit.cjs', String.raw`'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { articleCorpus } = require('./article-role-next-action-audit.cjs');
const { classifyArticleRole, ROLE_DEFINITIONS } = require('./article-role-registry.cjs');

const SHARED_CSS = /<link\b[^>]*href=["'][^"']*article-shared\.css(?:\?[^"']*)?["'][^>]*>/gi;
function count(regex, value) { return (String(value).match(regex) || []).length; }
function hasClass(html, name) { return new RegExp('class=["\\\'][^"\\\']*\\b' + name + '\\b[^"\\\']*["\\\']', 'i').test(html); }

function auditArticleDesignSystem(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  const corpus = articleCorpus(root);
  const roleCounts = Object.fromEntries(Object.keys(ROLE_DEFINITIONS).map(role => [role, 0]));
  const components = { answer: 0, intro: 0, summary: 0, stackedLead: 0, markers: 0, related: 0 };
  const failures = [];
  const warnings = [];

  for (const record of corpus) {
    const file = path.join(root, record.relativePath);
    if (!fs.existsSync(file)) {
      failures.push(record.relativePath + ': article file missing');
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const role = classifyArticleRole(record.relativePath, { listed: record.listed });
    if (!role) {
      failures.push(record.relativePath + ': Article Role is unclassified');
      continue;
    }
    roleCounts[role] += 1;

    const sharedCount = count(SHARED_CSS, html);
    if (sharedCount !== 1) failures.push(record.relativePath + ': article-shared.css link count=' + sharedCount);

    const answer = hasClass(html, 'answer-box') || hasClass(html, 'editorial-answer');
    const intro = hasClass(html, 'intro');
    const summary = hasClass(html, 'summary-box');
    const markerCount = count(/class=["'][^"']*\bmarker-(?:yellow|blue|red)\b[^"']*["']/gi, html);
    const related = /class=["'][^"']*\b(?:related-links-section|contextual-guide-links|article-related-guides)\b[^"']*["']/i.test(html);

    if (answer) components.answer += 1;
    if (intro) components.intro += 1;
    if (summary) components.summary += 1;
    if (answer && intro && summary) components.stackedLead += 1;
    components.markers += markerCount;
    if (related) components.related += 1;
  }

  if (components.stackedLead > 0) warnings.push('legacy answer + intro + summary stacks remain in markup: ' + components.stackedLead + ' (visually compacted by Design System 2.0)');
  if (components.markers === 0) warnings.push('no explicit editorial marker classes remain in article corpus');
  return { articleCount: corpus.length, roleCounts, components, failures, warnings };
}

function print(result) {
  console.log('Article Design System Audit: articles=' + result.articleCount);
  console.log('roles=' + Object.entries(result.roleCounts).map(([role, n]) => role + ':' + n).join(', '));
  console.log('components=' + Object.entries(result.components).map(([name, n]) => name + ':' + n).join(', '));
  console.log('errors=' + result.failures.length + ', warnings=' + result.warnings.length);
  result.failures.forEach(message => console.error('- ERROR: ' + message));
  result.warnings.forEach(message => console.warn('- WARN: ' + message));
}

if (require.main === module) {
  const result = auditArticleDesignSystem(process.cwd());
  print(result);
  if (result.failures.length) process.exitCode = 1;
}
module.exports = { auditArticleDesignSystem, print };
`);

write('tests/article-design-system.test.cjs', String.raw`'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { auditArticleDesignSystem } = require('../scripts/article-design-system-audit.cjs');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'articles', 'article-shared.css'), 'utf8');

test('Article Design System 2.0 is owned by article-shared.css', () => {
  assert.match(css, /ARTICLE_DESIGN_SYSTEM_V2_START/);
  assert.match(css, /body \.content > \.answer-box/);
  assert.match(css, /body \.content > \.intro > strong:first-child/);
  assert.match(css, /body \.content \.related-links-section > ul/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
});

test('fluorescent marker primitives remain available', () => {
  assert.match(css, /\.marker-yellow[^{]*\{[\s\S]*?#fde68a/i);
  assert.match(css, /\.marker-blue[^{]*\{[\s\S]*?#bae6fd/i);
  assert.match(css, /\.marker-red[^{]*\{[\s\S]*?#fecdd3/i);
  assert.match(css, /box-decoration-break:\s*clone/i);
});

test('all 161 role-classified articles stay on the shared visual contract', () => {
  const result = auditArticleDesignSystem(root);
  assert.equal(result.articleCount, 161);
  assert.deepEqual(result.failures, []);
  assert.ok(result.components.answer > 0);
  assert.ok(result.components.related > 0);
  assert.ok(result.components.stackedLead > 0);
});

test('obsolete 49-article validator is removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'scripts', 'validate_articles.py')), false);
});
`);

write('.github/scripts/article-design-smoke.cjs', String.raw`'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'browser-smoke-artifacts');
const CHROME_PATH = process.env.CHROME_PATH;
const REQUESTED_BASE_URL = (process.env.SMOKE_BASE_URL || '').trim();
const CASES = [
  { key: 'decision-legacy', path: 'articles/2025-12-25-best-use.html', intro: true, summary: true, marker: true, related: true },
  { key: 'troubleshooting-modern', path: 'articles/2026-03-10-play-points-reflection-timing.html', related: true },
  { key: 'retention-quests', path: 'articles/2026-07-31-google-play-quests.html', related: true },
  { key: 'international-decision', path: 'en/articles/google-play-points-earn-free.html', related: true }
];
const VIEWPORTS = [
  { key: 'desktop', width: 1280, height: 900 },
  { key: 'mobile', width: 390, height: 844 }
];
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

function assert(value, message) { if (!value) throw new Error(message); }
function normalizeBaseUrl(value) { const url = new URL(value); if (!url.pathname.endsWith('/')) url.pathname += '/'; url.search = ''; url.hash = ''; return url.href; }

function startLocalServer() {
  const server = http.createServer((request, response) => {
    let pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const absolute = path.resolve(ROOT, '.' + pathname);
    if (!absolute.startsWith(ROOT + path.sep) || absolute.includes(path.sep + '.git' + path.sep)) return response.writeHead(403).end();
    fs.stat(absolute, (error, stat) => {
      if (error || !stat.isFile()) return response.writeHead(404).end();
      response.writeHead(200, { 'cache-control': 'no-store', 'content-type': MIME[path.extname(absolute).toLowerCase()] || 'application/octet-stream' });
      if (request.method === 'HEAD') response.end(); else fs.createReadStream(absolute).pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ baseUrl: 'http://127.0.0.1:' + server.address().port + '/', close: () => new Promise((done, fail) => server.close(error => error ? fail(error) : done())) }));
  });
}

async function inspect(browser, baseUrl, article, viewport) {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: viewport.width, height: viewport.height } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (route.request().resourceType() === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.fulfill({ status: 204, body: '' });
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(new URL(article.path, baseUrl).href, { waitUntil: 'load', timeout: 45000 });
    assert(response && response.ok(), article.key + '/' + viewport.key + ': HTTP failure');
    await page.locator('.content').waitFor({ state: 'attached', timeout: 15000 });
    const result = await page.evaluate(() => {
      const content = document.querySelector('.content');
      const answer = content?.querySelector(':scope > .answer-box, :scope > .editorial-answer');
      const intro = content?.querySelector(':scope > .intro');
      const summary = content?.querySelector(':scope > .summary-box');
      const heading = content?.querySelector(':scope > .section > h2');
      const marker = content?.querySelector(':scope > .intro > strong:first-child');
      const related = content?.querySelector('.related-links-section > ul, .contextual-guide-links > ul, .article-related-guides > ul');
      const shared = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href.includes('article-shared.css'));
      const style = element => element ? getComputedStyle(element) : null;
      const answerStyle = style(answer);
      const introStyle = style(intro);
      const summaryStyle = style(summary);
      const headingStyle = style(heading);
      const markerStyle = style(marker);
      const relatedStyle = style(related);
      return {
        sharedLoaded: Boolean(shared?.sheet),
        answer: answerStyle ? { borderLeftWidth: answerStyle.borderLeftWidth, borderRadius: answerStyle.borderRadius, backgroundImage: answerStyle.backgroundImage } : null,
        intro: introStyle ? { textAlign: introStyle.textAlign, borderLeftWidth: introStyle.borderLeftWidth } : null,
        summary: summaryStyle ? { borderRadius: summaryStyle.borderRadius, borderTopWidth: summaryStyle.borderTopWidth } : null,
        heading: headingStyle ? { backgroundImage: headingStyle.backgroundImage, borderLeftWidth: headingStyle.borderLeftWidth, boxShadow: headingStyle.boxShadow } : null,
        marker: markerStyle ? { backgroundImage: markerStyle.backgroundImage } : null,
        related: relatedStyle ? { display: relatedStyle.display, columns: relatedStyle.gridTemplateColumns } : null,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
      };
    });

    assert(result.sharedLoaded, article.key + '/' + viewport.key + ': article-shared.css not attached');
    assert(result.answer, article.key + '/' + viewport.key + ': answer surface missing');
    assert(parseFloat(result.answer.borderLeftWidth) >= 4, article.key + '/' + viewport.key + ': answer accent missing');
    assert(parseFloat(result.answer.borderRadius) >= 8, article.key + '/' + viewport.key + ': answer radius ' + result.answer.borderRadius);
    assert(result.answer.backgroundImage !== 'none', article.key + '/' + viewport.key + ': answer hierarchy missing');
    assert(result.heading, article.key + '/' + viewport.key + ': section heading missing');
    assert(parseFloat(result.heading.borderLeftWidth) >= 4, article.key + '/' + viewport.key + ': H2 accent missing');
    assert(result.heading.backgroundImage !== 'none', article.key + '/' + viewport.key + ': H2 soft band missing');
    assert(result.heading.boxShadow === 'none', article.key + '/' + viewport.key + ': H2 still has heavy shadow');
    if (article.intro) {
      assert(result.intro, article.key + '/' + viewport.key + ': intro missing');
      assert(result.intro.textAlign === 'left' || result.intro.textAlign === 'start', article.key + '/' + viewport.key + ': intro alignment ' + result.intro.textAlign);
      assert(parseFloat(result.intro.borderLeftWidth) >= 3, article.key + '/' + viewport.key + ': intro accent missing');
    }
    if (article.summary) {
      assert(result.summary, article.key + '/' + viewport.key + ': summary missing');
      assert(parseFloat(result.summary.borderRadius) >= 8, article.key + '/' + viewport.key + ': summary radius ' + result.summary.borderRadius);
      assert(parseFloat(result.summary.borderTopWidth) >= 1, article.key + '/' + viewport.key + ': summary border missing');
    }
    if (article.marker) assert(result.marker && result.marker.backgroundImage.includes('linear-gradient'), article.key + '/' + viewport.key + ': fluorescent emphasis missing');
    if (article.related) {
      assert(result.related && result.related.display === 'grid', article.key + '/' + viewport.key + ': related navigation is not a grid');
      if (viewport.key === 'mobile') assert(!result.related.columns.includes(' '), article.key + '/mobile: related navigation should be one column: ' + result.related.columns);
    }
    if (viewport.key === 'mobile') assert(result.horizontalOverflow <= 1, article.key + '/mobile: horizontal overflow ' + result.horizontalOverflow + 'px');
    console.log('[article-design-smoke] ' + article.key + '/' + viewport.key + ': OK');
  } catch (error) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    try { await page.screenshot({ path: path.join(ARTIFACT_DIR, 'article-design-' + article.key + '-' + viewport.key + '.png'), fullPage: true }); } catch {}
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  assert(CHROME_PATH, 'CHROME_PATH is required');
  const local = REQUESTED_BASE_URL ? null : await startLocalServer();
  const baseUrl = REQUESTED_BASE_URL ? normalizeBaseUrl(REQUESTED_BASE_URL) : local.baseUrl;
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  try {
    for (const article of CASES) for (const viewport of VIEWPORTS) await inspect(browser, baseUrl, article, viewport);
  } finally {
    await browser.close();
    if (local) await local.close();
  }
  console.log('[article-design-smoke] verified ' + CASES.length + ' representative articles across ' + VIEWPORTS.length + ' viewports');
}
main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
`);

let browserWorkflow = read('.github/workflows/browser-smoke.yml');
browserWorkflow = replaceOnce(
  browserWorkflow,
  "      - '.github/scripts/article-css-smoke.cjs'\n",
  "      - '.github/scripts/article-css-smoke.cjs'\n      - '.github/scripts/article-design-smoke.cjs'\n",
  '.github/workflows/browser-smoke.yml'
);
browserWorkflow = browserWorkflow.replaceAll(
  '          node .github/scripts/article-css-smoke.cjs\n          node .github/scripts/mobile-region-layout-smoke.cjs',
  '          node .github/scripts/article-css-smoke.cjs\n          node .github/scripts/article-design-smoke.cjs\n          node .github/scripts/mobile-region-layout-smoke.cjs'
);
if ((browserWorkflow.match(/node \.github\/scripts\/article-design-smoke\.cjs/g) || []).length !== 2) throw new Error('browser-smoke.yml: expected local + production design smoke calls');
write('.github/workflows/browser-smoke.yml', browserWorkflow);

let preflight = read('.github/scripts/preflight.cjs');
preflight = replaceOnce(
  preflight,
  "  runPhase('公開記事の検索意図・内部リンク検証', process.execPath, ['scripts/article-content-navigation-normalize.cjs', '--check']);\n",
  "  runPhase('公開記事の検索意図・内部リンク検証', process.execPath, ['scripts/article-content-navigation-normalize.cjs', '--check']);\n  runPhase('記事Design System 2.0監査', process.execPath, ['scripts/article-design-system-audit.cjs']);\n",
  '.github/scripts/preflight.cjs'
);
write('.github/scripts/preflight.cjs', preflight);

fs.rmSync(path.join(root, 'scripts', 'validate_articles.py'), { force: true });
console.log('Article Design System 2.0 source migration applied.');
