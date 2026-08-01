'use strict';

const fs = require('node:fs');
const path = require('node:path');

const HUB_CONTENT = {
  en: {
    modifiedAt: '2026-08-01',
    description: 'Browse Google Play Points guides about levels, point timing, promotions, quests, weekly rewards, gift cards, and country-specific checks.',
    links: [
      ['/en/articles/google-play-points-super-weekly-reward.html', 'Super Weekly Reward eligibility, prize stock and Super Tickets'],
      ['/en/articles/google-play-quests.html', 'Google Play quests not appearing or completing']
    ]
  },
  ko: {
    modifiedAt: '2026-08-01',
    description: '등급, 점수 반영, 퀘스트, 주간 리워드, 캠페인, 기프트카드와 국가별 확인 사항을 다루는 Google Play Points 가이드 모음입니다.',
    links: [
      ['/ko/articles/google-play-points-super-weekly-reward.html', '슈퍼 위클리 리워드 대상·재고·슈퍼 티켓'],
      ['/ko/articles/google-play-quests.html', 'Google Play 퀘스트가 표시되거나 완료되지 않을 때']
    ]
  },
  tw: {
    modifiedAt: '2026-08-01',
    description: '瀏覽 Google Play Points 的等級、點數反映、任務、每週獎勵、活動、禮物卡與地區確認指南。',
    links: [
      ['/tw/articles/google-play-points-super-weekly-reward.html', '超級每週獎勵資格、庫存與超級票券'],
      ['/tw/articles/google-play-quests.html', 'Google Play 任務沒有顯示或無法完成']
    ]
  }
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function syncArticleHub(rootDir, locale, config) {
  const file = path.join(rootDir, locale, 'articles', 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  html = html.replace(/<meta name="description" content="[^"]+">/, `<meta name="description" content="${config.description}">`);
  html = html.replace(/<meta name="last-modified" content="\d{4}-\d{2}-\d{2}">/, `<meta name="last-modified" content="${config.modifiedAt}">`);
  html = html.replace(/<meta property="og:description" content="[^"]+">/, `<meta property="og:description" content="${config.description}">`);
  html = html.replace(/("description":\s*)"[^"]+"/, `$1${JSON.stringify(config.description)}`);
  html = html.replace(/(<p class="hero-meta">[^<]*?)\d{4}-\d{2}-\d{2}(<\/p>)/, `$1${config.modifiedAt}$2`);

  for (const [href] of config.links) {
    const duplicate = new RegExp(`\\s*<li><a href="${escapeRegExp(href)}">[\\s\\S]*?<\\/a><\\/li>`, 'g');
    html = html.replace(duplicate, '');
  }

  const listItems = config.links
    .map(([href, label]) => `                <li><a href="${href}">${label}</a></li>`)
    .join('\n');
  const insertionPoint = /(<section class="section related-links-section">\s*<ul>)/;
  if (!insertionPoint.test(html)) {
    throw new Error(`Could not locate the article list in ${path.relative(rootDir, file)}`);
  }
  html = html.replace(insertionPoint, `$1\n${listItems}`);
  fs.writeFileSync(file, html);
}

function syncIntlManualContent(rootDir) {
  for (const [locale, config] of Object.entries(HUB_CONTENT)) {
    syncArticleHub(rootDir, locale, config);
  }
}

module.exports = {
  HUB_CONTENT,
  syncIntlManualContent
};
