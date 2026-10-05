'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { nextFor } = require('./japanese-navigation-sidebar.cjs');
const { classifyArticleRole } = require('./article-role-registry.cjs');
const { RELATED_CHOICES } = require('./reader-related-choices.cjs');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const { GUIDE_H1: HUB_TITLE, GUIDE_DESCRIPTION: HUB_DESCRIPTION } = require('./japanese-guide-brand.cjs');
const QUESTIONS = [
  ['Google Play Passって何？', '定額サービスとポイント特典の関係', '/articles/2026-08-16-play-pass-worth-it.html#play-pass-basics'],
  ['ゴールドになると何が変わる？', '必要ポイントとランク別の特典', '/articles/2026-08-05-play-points-levels-guide.html'],
  ['ポイントとPlay残高はどう違う？', '交換に使うポイント・支払いに使う残高', '/articles/2025-12-25-check-balance.html']
];
function replaceBlock(html, key, body, insert) {
  const block = `<!-- ${key}:start -->${body}<!-- ${key}:end -->`;
  const expression = new RegExp(`<!-- ${key}:start -->[\\s\\S]*?<!-- ${key}:end -->`);
  return expression.test(html) ? html.replace(expression, () => block) : insert(html, block);
}
// 見出しの長短は許容し、本文・検索・共有の約束を記事台帳から同期する。
function syncArticleMetadata(html, article) {
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(article.title)}</title>`)
    .replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/, (_all, start, end) => start + escape(article.title) + end);
  const wanted = { description: article.description, 'og:title': article.title, 'twitter:title': article.title,
    'og:description': article.description, 'twitter:description': article.description };
  html = html.replace(/<meta\b[^>]*>/g, tag => {
    const name = tag.match(/(?:name|property)=["']([^"']+)["']/)?.[1];
    if (!Object.hasOwn(wanted, name)) return tag;
    return tag.replace(/content=["'][^"']*["']/, () => `content="${escape(wanted[name])}"`);
  });
  return html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (_all, start, json, end) => {
    const data = JSON.parse(json);
    const update = node => {
      if (!node || typeof node !== 'object') return;
      const types = [].concat(node['@type'] || []);
      if (types.some(type => ['Article', 'BlogPosting', 'NewsArticle'].includes(type))) {
        node.headline = article.title; node.description = article.description;
      }
      if (Array.isArray(node)) node.forEach(update); else Object.values(node).forEach(update);
    };
    update(data); return start + JSON.stringify(data).replaceAll('<', '\\u003c') + end;
  });
}
function syncMetadata(root) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'blog/articles.json'), 'utf8'));
  const calendar = registry.find(article => article.id === 'play-points-calendar-schedule-guide-2026');
  const bestUse = registry.find(article => article.id === 'best-use');
  bestUse.title = 'Google Play Pointsの交換先おすすめ｜使い道・クーポン・Playクレジットを比較';
  calendar.title = 'Play Pointsのお得カレンダー｜毎週・毎月の確認日';
  calendar.listTitle = calendar.title;
  calendar.description = '火曜のSuper Ticket、木曜のPlay Pass特典、金曜の週次リワード、月初の増量案内を確認する日の目安です。対象条件と開催が未確定のイベントを分け、必要な確認日だけカレンダーに保存できます。';
  const pass = registry.find(article => article.id === 'play-pass-worth-it');
  pass.modified = '2026-10-05';
  pass.description = 'Google Play Passの定額サービスとPlay Pointsの違いを説明。日本の木曜週次特典・対象条件を確認し、自分の使い方に合うか判断します。加入によるゴールド付与特典の公式対象国に日本は含まれていません。';
  const jsonFile = path.join(root, 'blog/articles.json');
  const output = JSON.stringify(registry, null, 2) + '\n';
  if (fs.readFileSync(jsonFile, 'utf8') !== output) fs.writeFileSync(jsonFile, output);
  let changed = 0;
  for (const article of registry.filter(a => a.listed !== false)) {
    const file = path.join(root, article.file.replace(/^\.\.\//, ''));
    const before = fs.readFileSync(file, 'utf8'), after = syncArticleMetadata(before, article);
    if (before !== after) { fs.writeFileSync(file, after); changed++; }
  }
  return { registry, changed };
}
function syncReaderFoundations(root, { hubOnly = false } = {}) {
  const { registry } = syncMetadata(root);
  const byId = new Map(registry.map(a => [a.id, a]));
  const catalog = registry.map(a => ({ ...a, path: a.file.replace(/^\.\.\//, ''), href: '/' + a.file.replace(/^\.\.\//, '') }));
  for (const article of registry.filter(a => !hubOnly && a.listed !== false)) {
    const file = path.join(root, article.file.replace(/^\.\.\//, ''));
    let html = fs.readFileSync(file, 'utf8');
    if (article.id === 'play-pass-worth-it') {
      const body = '<section class="section" aria-labelledby="play-pass-basics"><h2 id="play-pass-basics" tabindex="-1">Google Play Passとは？Play Pointsとの違い</h2><p>Google Play Passは、対象のゲーム・アプリを定額で利用するサービスです。対象タイトルを広告やアプリ内購入なしで使えますが、Google Playのすべてのゲームが対象になるわけではありません。</p><p>Google Play Pointsは、対象購入などでポイントを貯めて、クレジットやアイテムなどへ交換するプログラムです。Play Passの定額サービスと、Play Pointsのポイント・ランクは別の仕組みです。加入者向けのポイント特典には、地域や利用状況などの条件があります。</p><p class="reader-source"><a href="https://support.google.com/googleplay/answer/9473027?hl=ja">Google公式：Play Passの内容と対象条件（2026年10月5日確認）</a></p></section>';
      html = replaceBlock(html, 'pass-basics', body, (source, block) => source.replace(/(<section\b[^>]*class="[^"]*answer-box[^\"]*"[^>]*>[\s\S]*?<\/section>)/, '$1' + block));
      if (!html.includes('id="play-pass-basics"')) throw Error('Play Passの基本説明を配置できません');
    }
    const role = classifyArticleRole(article.file.replace(/^\.\.\//, ''));
    const related = (RELATED_CHOICES[article.id] || []).map(id => byId.get(id)).filter(Boolean).map(a => ({ href: '/' + a.file.replace(/^\.\.\//, ''), label: a.listTitle || a.title }));
    const [href, label] = nextFor(role, related, catalog.find(a => a.id === article.id));
    const actions = article.id === 'play-pass-worth-it'
      ? [['/articles/2026-09-19-play-points-calendar-schedule-guide.html#reader-calendar-title', '加入中なら、木曜の確認日を残す'], ['/articles/2025-12-25-weekly-reward.html', '金曜のリワードとの違いを読む']]
      : [[href, label]];
    const body = `<nav class="reader-followthrough" aria-label="読んだ後の確認先"><h2>このあと確認すること</h2><ul>${actions.map(([url, name]) => `<li><a href="${escape(url)}">${escape(name)} →</a></li>`).join('')}</ul><p><a href="/blog/">記事トップから別の疑問を探す</a></p></nav>`;
    html = replaceBlock(html, 'reader-followthrough', body, (source, block) => source.replace(/(<(?:div|section)\b[^>]*class="[^"]*author-profile-box[^\"]*"[^>]*>)/, block + '$1'));
    // 古い相対リンクも、用途が分かる名称に統一する。
    html = html.replace(/(<a\b[^>]*href="(?:\.\.\/blog\/|\/blog\/)"[^>]*>)\s*(?:記事一覧(?:へ)?|攻略記事一覧)\s*(<\/a>)/g, '$1記事トップ$2');
    fs.writeFileSync(file, html);
  }
  const hub = path.join(root, 'blog/index.html'); let html = fs.readFileSync(hub, 'utf8');
  html = html.replace(/(<h1 class="hero-title">)[\s\S]*?(<\/h1>)/, '$1' + HUB_TITLE + '$2');
  html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (_all, start, json, end) => {
    const data = JSON.parse(json);
    if (data['@type'] === 'BreadcrumbList') data.itemListElement = [{ '@type': 'ListItem', position: 1, name: '記事トップ', item: 'https://playpoint-sim.com/blog/' }];
    if (data['@type'] === 'Blog') { data.name = HUB_TITLE; data.description = HUB_DESCRIPTION; }
    return start + JSON.stringify(data) + end;
  });
  const entry = `<p class="reader-hub-intro">Play Pointsの仕組み、ランクの特典、ポイントの使い道を知りたいことから探せます。</p><nav class="reader-entry-questions" aria-label="まず知っておきたいこと">${QUESTIONS.map(([question, reason, href]) => `<a href="${href}"><strong>${question}</strong><span>${reason}</span></a>`).join('')}</nav><section class="reading-resume" data-reading-resume aria-label="前回読んだ記事" hidden></section>`;
  html = replaceBlock(html, 'reader-hub-entry', entry, (source, block) => source.replace(/(<h1 class="hero-title">[\s\S]*?<\/h1>)/, '$1' + block));
  fs.writeFileSync(hub, html);
  for (const relative of ['latest/index.html', 'author/katakata.html']) {
    const file = path.join(root, relative); let body = fs.readFileSync(file, 'utf8');
    body = body.replace(/(<a\b[^>]*href="(?:\.\.\/blog\/|\/blog\/)"[^>]*>)\s*(?:記事一覧(?:へ)?|攻略記事一覧)\s*(<\/a>)/g, '$1記事トップ$2');
    fs.writeFileSync(file, body);
  }
}
module.exports = { HUB_TITLE, HUB_DESCRIPTION, QUESTIONS, syncArticleMetadata, syncMetadata, syncReaderFoundations };
