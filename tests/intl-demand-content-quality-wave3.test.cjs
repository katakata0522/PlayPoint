'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function answerBeforeCalculator(html, marker, label) {
  const answer = html.indexOf(marker);
  const calc = html.indexOf('data-generated-intl-article-prompt="true"');
  assert.notEqual(answer, -1, `${label}: answer marker missing`);
  assert.notEqual(calc, -1, `${label}: calculator prompt missing`);
  assert.ok(answer < calc, `${label}: search answer must precede calculator prompt`);
}

test('Korean quests owns generic and troubleshooting intent before the calculator', () => {
  const html = read('ko/articles/google-play-quests.html');
  assert.match(html, /구글 플레이 퀘스트란/);
  assert.match(html, /퀘스트 자체가 안 뜸/);
  assert.match(html, /구매 단계가 완료되지 않음/);
  assert.match(html, /Play 게임즈 프로필/);
  assert.match(html, /취소되거나 환불/);
  assert.match(html, /11534416/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
  answerBeforeCalculator(html, 'id="ko-quest-quick-check"', 'KO quests');
});

test('Korean Super Ticket guide answers acquisition and use intent first', () => {
  const html = read('ko/articles/google-play-points-super-weekly-reward.html');
  assert.match(html, /슈퍼티켓 얻는 법·사용법/);
  assert.match(html, /30일마다 1장/);
  assert.match(html, /90일마다 1장/);
  assert.match(html, /이전 Play Points 보상을 유지하지 못합니다/);
  assert.match(html, /mc_games_editorialmd_product_gpp_swp_super_tickets_fcp/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
  answerBeforeCalculator(html, 'id="ko-super-ticket-answer"', 'KO Super Ticket');
});

test('English gift-card guide owns both conversion and earning questions', () => {
  const html = read('en/articles/google-play-points-gift-cards.html');
  assert.match(html, /Can Google Play Points buy gift cards/i);
  assert.match(html, /cannot use Google Play Points or Google Play balance to buy/i);
  assert.match(html, /Play credit is balance, not a gift card/i);
  assert.match(html, /digital gift-card purchases are not eligible/i);
  assert.match(html, /16585331/);
  assert.match(html, /playpoint:official-verified" content="2026-09-03"/);
  answerBeforeCalculator(html, 'id="gift-card-answer"', 'EN gift cards');
});

test('international content audit covers the complete current EN KO TW inventory', () => {
  const report = read('docs/INTL_CONTENT_AUDIT_2026-09-03.md');
  // Count only complete inventory-table lines; headings and summary tables must never affect coverage.
  const tableRows = report.split('\n').filter(line => /^\| [ABCM] \| (?:EN|KO|TW) \| `\//.test(line));

  for (const locale of ['en', 'ko', 'tw']) {
    const expected = fs.readdirSync(path.join(root, locale, 'articles'))
      .filter(name => name.endsWith('.html') && name !== 'index.html').length;
    const language = locale.toUpperCase();
    const actual = tableRows.filter(line => new RegExp(`^\\| [ABCM] \\| ${language} \\|`).test(line)).length;
    assert.equal(actual, expected, `${locale} inventory count`);
  }

  assert.equal(tableRows.length, 102, 'current EN/KO/TW inventory total');
  assert.match(report, /IN_VALUE/);
  assert.match(report, /EN_BALANCE_CASHOUT/);
});
