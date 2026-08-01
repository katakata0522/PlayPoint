'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const DATE = '2026-08-02';

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content, 'utf8');
}

function replaceRequired(text, pattern, replacement, label, expected = 1) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = [...text.matchAll(new RegExp(pattern.source, flags))];
  if (matches.length !== expected) {
    throw new Error(`${label}: expected ${expected} match(es), found ${matches.length}`);
  }
  return text.replace(pattern, replacement);
}

function replaceTextRequired(text, before, after, label, minimum = 1) {
  const count = text.split(before).length - 1;
  if (count < minimum) throw new Error(`${label}: expected at least ${minimum} occurrence(s), found ${count}`);
  return text.split(before).join(after);
}

function updateJapaneseArticle(file) {
  let html = read(file);
  html = replaceRequired(html, /(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}(T00:00:00\+09:00" \/>)/, `$1${DATE}$2`, `${file} article:modified_time`);
  html = replaceRequired(html, /(<p class="hero-meta">)\d{4}\/\d{2}\/\d{2}( 更新)/, `$1${DATE.replaceAll('-', '/')}$2`, `${file} hero date`);
  html = replaceRequired(html, /最終公式確認日：\d{4}年\d{1,2}月\d{1,2}日/, '最終公式確認日：2026年8月2日', `${file} official check date`);
  html = replaceRequired(html, /("dateModified":")\d{4}-\d{2}-\d{2}("[,}])/, `$1${DATE}$2`, `${file} JSON-LD dateModified`);
  write(file, html.endsWith('\n') ? html : `${html}\n`);
}

function updateIntlNewArticle(file, locale) {
  let html = read(file);
  html = replaceRequired(html, /(<meta name="last-modified" content=")\d{4}-\d{2}-\d{2}(">)/, `$1${DATE}$2`, `${file} last-modified`);
  html = replaceRequired(html, /("dateModified":")\d{4}-\d{2}-\d{2}("[,}])/, `$1${DATE}$2`, `${file} JSON-LD dateModified`);
  if (locale === 'en') {
    html = replaceRequired(html, /(<p class="hero-meta">Updated )\d{4}-\d{2}-\d{2}/, `$1${DATE}`, `${file} hero date`);
    html = replaceRequired(html, /Official information checked on \d{4}-\d{2}-\d{2}/, `Official information checked on ${DATE}`, `${file} official check date`);
  } else if (locale === 'ko') {
    html = replaceRequired(html, /(<p class="hero-meta">업데이트 )\d{4}-\d{2}-\d{2}/, `$1${DATE}`, `${file} hero date`);
    html = replaceRequired(html, /공식 정보 확인일: \d{4}-\d{2}-\d{2}/, `공식 정보 확인일: ${DATE}`, `${file} official check date`);
  } else {
    html = replaceRequired(html, /(<p class="hero-meta">更新 )\d{4}-\d{2}-\d{2}/, `$1${DATE}`, `${file} hero date`);
    html = replaceRequired(html, /官方資訊確認日：\d{4}-\d{2}-\d{2}/, `官方資訊確認日：${DATE}`, `${file} official check date`);
  }
  write(file, html.endsWith('\n') ? html : `${html}\n`);
}

function updateGiftCardArticle(file, locale) {
  let html = read(file);
  html = replaceRequired(html, /(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}(T00:00:00\+09:00" \/>)/, `$1${DATE}$2`, `${file} article:modified_time`);
  html = replaceRequired(html, /("dateModified": ")\d{4}-\d{2}-\d{2}("[,}])/, `$1${DATE}$2`, `${file} JSON-LD dateModified`);

  if (locale === 'en') {
    html = replaceRequired(html, /(<p class="hero-meta">Updated: )\d{4}\/\d{2}\/\d{2}/, `$1${DATE.replaceAll('-', '/')}`, `${file} hero date`);
    const marker = '<p class="small article-note-spacing">Promotion terms can change.';
    if (!html.includes(`Official information checked on ${DATE}.`)) {
      html = replaceTextRequired(html, marker, `<p class="small article-note-spacing">Official information checked on ${DATE}.</p>\n                ${marker}`, `${file} add official check date`);
    }
  } else if (locale === 'ko') {
    html = replaceRequired(html, /(<p class="hero-meta">업데이트: )\d{4}\/\d{2}\/\d{2}/, `$1${DATE.replaceAll('-', '/')}`, `${file} hero date`);
    const marker = '<p class="small article-note-spacing">프로모션 조건은 변경될 수 있습니다.';
    if (!html.includes(`공식 정보 확인일: ${DATE}.`)) {
      html = replaceTextRequired(html, marker, `<p class="small article-note-spacing">공식 정보 확인일: ${DATE}.</p>\n                ${marker}`, `${file} add official check date`);
    }
  } else {
    html = replaceRequired(html, /(<p class="hero-meta">更新：)\d{4}\/\d{2}\/\d{2}/, `$1${DATE.replaceAll('-', '/')}`, `${file} hero date`);
    const marker = '<p class="small article-note-spacing">促銷條件可能變更。';
    if (!html.includes(`官方資訊確認日：${DATE}。`)) {
      html = replaceTextRequired(html, marker, `<p class="small article-note-spacing">官方資訊確認日：${DATE}。</p>\n                ${marker}`, `${file} add official check date`);
    }
  }
  write(file, html);
}

function updateSuperWeeklyFacts() {
  const jaFile = 'articles/2026-07-31-super-weekly-reward.html';
  let ja = read(jaFile);
  const jaNeedle = '            <li>賞品数には限りがあり、追加の資格要件が適用される場合があります。</li>';
  const jaAddition = `${jaNeedle}\n            <li>提供状況はPlayの国・地域やアカウントによって異なり、公式ページや特典画面に表示されない地域では利用できると断定できません。</li>`;
  if (!ja.includes('提供状況はPlayの国・地域やアカウントによって異なり')) {
    ja = replaceTextRequired(ja, jaNeedle, jaAddition, `${jaFile} regional availability`);
  }
  write(jaFile, ja);

  const enFile = 'en/articles/google-play-points-super-weekly-reward.html';
  let en = read(enFile);
  en = replaceTextRequired(en, 'Super Weekly Reward', 'Super Weekly Prize', `${enFile} official terminology`, 5);
  const enNeedle = '<p>Google\'s promotion page says new prizes are available after 12:00 a.m. local time on Friday. Prize sets can differ by level, and the page can show remaining quantities before you claim if your account is eligible.</p>';
  const enAvailability = `${enNeedle}\n      <p>Availability varies by Play country and account. If the official promotion page or perk does not appear, do not assume the Super Weekly Prize is offered in your region.</p>`;
  if (!en.includes('Availability varies by Play country and account.')) {
    en = replaceTextRequired(en, enNeedle, enAvailability, `${enFile} regional availability`);
  }
  write(enFile, en);

  const koFile = 'ko/articles/google-play-points-super-weekly-reward.html';
  let ko = read(koFile);
  const koNeedle = '<p>Google 공식 프로모션은 현지 시간 금요일 오전 0시 이후 새 경품을 이용할 수 있다고 안내합니다. 자격이 있으면 수령 전에 남은 경품 수량이 표시될 수 있고, 등급에 따라 경품 구성이 달라질 수 있습니다.</p>';
  const koAvailability = `${koNeedle}<p>제공 여부는 Play 국가와 계정에 따라 다릅니다. 공식 프로모션 페이지나 혜택 화면이 표시되지 않는다면 해당 지역에서 제공된다고 단정하지 마세요.</p>`;
  if (!ko.includes('제공 여부는 Play 국가와 계정에 따라 다릅니다.')) {
    ko = replaceTextRequired(ko, koNeedle, koAvailability, `${koFile} regional availability`);
  }
  write(koFile, ko);

  const twFile = 'tw/articles/google-play-points-super-weekly-reward.html';
  let tw = read(twFile);
  const twNeedle = '<p>Google 官方活動頁指出，新獎勵會在當地時間週五上午 12:00 開放。符合資格時，領取前可能看得到剩餘獎勵數量，獎品也可能依等級不同。</p>';
  const twAvailability = `${twNeedle}<p>是否提供會依 Play 國家/地區與帳號而異。若官方活動頁或福利畫面沒有顯示，不要直接假設你的地區也能參加。</p>`;
  if (!tw.includes('是否提供會依 Play 國家/地區與帳號而異。')) {
    tw = replaceTextRequired(tw, twNeedle, twAvailability, `${twFile} regional availability`);
  }
  write(twFile, tw);
}

function updateEnglishHub() {
  const file = 'en/articles/index.html';
  let html = read(file);
  html = replaceTextRequired(html, 'Super Weekly Reward eligibility, prize stock and Super Tickets', 'Super Weekly Prize eligibility, prize stock and Super Tickets', `${file} official terminology`);
  html = replaceRequired(html, /(<meta name="last-modified" content=")\d{4}-\d{2}-\d{2}(">)/, `$1${DATE}$2`, `${file} last-modified`);
  html = replaceRequired(html, /(<p class="hero-meta">Last updated )\d{4}-\d{2}-\d{2}/, `$1${DATE}`, `${file} hero date`);
  write(file, html);

  const syncFile = 'scripts/intl-manual-content-sync.cjs';
  let sync = read(syncFile);
  sync = replaceRequired(sync, /(en:\s*\{\s*modifiedAt: ')[^']+(',)/, `$1${DATE}$2`, `${syncFile} EN modifiedAt`);
  sync = replaceTextRequired(sync, 'Super Weekly Reward eligibility, prize stock and Super Tickets', 'Super Weekly Prize eligibility, prize stock and Super Tickets', `${syncFile} EN label`);
  write(syncFile, sync);
}

function updateRegistryAndFeeds() {
  const registryFile = 'blog/articles.json';
  const registry = JSON.parse(read(registryFile));
  for (const id of ['super-weekly-reward', 'google-play-quests']) {
    const article = registry.find(item => item.id === id);
    if (!article) throw new Error(`${registryFile}: missing ${id}`);
    article.modified = DATE;
    if (id === 'super-weekly-reward') {
      article.title = 'Google Play Pointsのスーパーウィークリーリワードとは？Super Ticketの注意点';
    }
  }
  write(registryFile, `${JSON.stringify(registry, null, 2)}\n`);

  let atom = read('atom.xml');
  atom = replaceRequired(atom, /(<feed[\s\S]*?<updated>)\d{4}-\d{2}-\d{2}T12:00:00\+09:00(<\/updated>)/, `$1${DATE}T12:00:00+09:00$2`, 'atom feed updated');
  for (const url of [
    'https://playpoint-sim.com/articles/2026-07-31-super-weekly-reward.html',
    'https://playpoint-sim.com/articles/2026-07-31-google-play-quests.html'
  ]) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(<entry>[\\s\\S]*?<id>${escaped}<\\/id>[\\s\\S]*?<updated>)\\d{4}-\\d{2}-\\d{2}T12:00:00\\+09:00(<\\/updated>[\\s\\S]*?<\\/entry>)`);
    atom = replaceRequired(atom, pattern, `$1${DATE}T12:00:00+09:00$2`, `atom entry ${url}`);
  }
  write('atom.xml', atom);

  let feed = read('feed.xml');
  feed = replaceRequired(feed, /(<lastBuildDate>)[^<]+(<\/lastBuildDate>)/, '$1Sun, 02 Aug 2026 03:00:00 GMT$2', 'RSS lastBuildDate');
  write('feed.xml', feed);
}

function updateUrlLastmod(file, url, date) {
  if (!fs.existsSync(path.join(root, file))) return;
  let xml = read(file);
  if (!xml.includes(`<loc>${url}</loc>`)) return;
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<loc>${escaped}<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`);
  xml = replaceRequired(xml, pattern, `$1${date}$2`, `${file} ${url} lastmod`);
  write(file, xml);
}

function updateSitemaps() {
  const articleUrls = [
    'https://playpoint-sim.com/articles/2026-07-31-super-weekly-reward.html',
    'https://playpoint-sim.com/articles/2026-07-31-google-play-quests.html',
    'https://playpoint-sim.com/en/articles/2026-06-20-discount-gift-cards.html',
    'https://playpoint-sim.com/ko/articles/2026-06-20-discount-gift-cards.html',
    'https://playpoint-sim.com/tw/articles/2026-06-20-discount-gift-cards.html',
    'https://playpoint-sim.com/en/articles/google-play-points-super-weekly-reward.html',
    'https://playpoint-sim.com/en/articles/google-play-quests.html',
    'https://playpoint-sim.com/ko/articles/google-play-points-super-weekly-reward.html',
    'https://playpoint-sim.com/ko/articles/google-play-quests.html',
    'https://playpoint-sim.com/tw/articles/google-play-points-super-weekly-reward.html',
    'https://playpoint-sim.com/tw/articles/google-play-quests.html'
  ];
  const sitemapFiles = ['sitemap.xml', 'blog/sitemap.xml', 'sitemap-intl-guides.xml'];
  for (const file of sitemapFiles) {
    for (const url of articleUrls) updateUrlLastmod(file, url, DATE);
  }
  updateUrlLastmod('sitemap.xml', 'https://playpoint-sim.com/blog/', DATE);
  updateUrlLastmod('blog/sitemap.xml', 'https://playpoint-sim.com/blog/', DATE);
}

updateSuperWeeklyFacts();
updateJapaneseArticle('articles/2026-07-31-super-weekly-reward.html');
updateJapaneseArticle('articles/2026-07-31-google-play-quests.html');

for (const locale of ['en', 'ko', 'tw']) {
  updateIntlNewArticle(`${locale}/articles/google-play-points-super-weekly-reward.html`, locale);
  updateIntlNewArticle(`${locale}/articles/google-play-quests.html`, locale);
  updateGiftCardArticle(`${locale}/articles/2026-06-20-discount-gift-cards.html`, locale);
}

updateEnglishHub();
updateRegistryAndFeeds();
updateSitemaps();

console.log('Finalized facts and verification dates for 11 changed article pages.');
