'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { CONTENT_DATE_OVERRIDES } = require('../scripts/html-sync.cjs');
const {
  extractVerificationDate,
  validateLatestHub
} = require('../scripts/latest-hub-audit.cjs');

const root = path.resolve(__dirname, '..');
const latestPath = path.join(root, 'latest', 'index.html');
// node --test はテストファイル同士を並列実行するため、生成系テストが公開HTMLを
// 一時的に触ってもこの契約テストの入力が途中で変わらないよう、起動時に1回だけ読む。
const latestHtml = fs.readFileSync(latestPath, 'utf8');
const verificationDate = extractVerificationDate(latestHtml);

function addUtcDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function verificationDateAsUtcNoon(value) {
  return new Date(`${value}T12:00:00Z`);
}

test('最新情報ハブは確認範囲・公式参照・確認日・次回確認目安を明示する', () => {
  const result = validateLatestHub(latestHtml);

  assert.equal(result.verificationDate, verificationDate);
  assert.ok(result.nextCheckDates.length > 0, '次回確認目安が抽出できません');
  assert.ok(result.nextCheckDates.every(date => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  assert.ok(latestHtml.includes(`<meta name="last-modified" content="${verificationDate}">`));
  assert.match(latestHtml, new RegExp(`"dateModified"\\s*:\\s*"${verificationDate}"`));
  assert.ok(latestHtml.includes(`最終更新: <time datetime="${verificationDate}">${verificationDate}</time>`));
  assert.match(latestHtml, /<header[^>]*>[\s\S]*?<nav class="eng-nav"/);
});

test('最新情報ハブは週次3制度とクエストを別項目として扱う', () => {
  assert.ok(latestHtml.includes('通常週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('スーパー週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('Play Pass週次｜公開公式情報で確認'));
  assert.ok(latestHtml.includes('クエスト｜対象者はアカウント内で確認'));
  assert.ok(latestHtml.includes('../articles/2026-07-31-super-weekly-reward.html'));
  assert.ok(latestHtml.includes('../articles/2026-07-31-google-play-quests.html'));
});

test('生成処理は公開ページの公式確認日を正本として使い、確認していない日に進めない', () => {
  const contentDatesSource = fs.readFileSync(path.join(root, 'scripts', 'content-dates.cjs'), 'utf8');

  assert.equal(CONTENT_DATE_OVERRIDES['latest/index.html'], verificationDate);
  assert.match(
    contentDatesSource,
    /'latest\/index\.html': LATEST_HUB_VERIFICATION_DATE/,
    'latest hub content date should be derived from the verified date instead of a second date literal'
  );
  assert.doesNotMatch(
    contentDatesSource,
    /'latest\/index\.html': '\d{4}-\d{2}-\d{2}'/,
    'content-dates.cjs must not duplicate the latest hub verification date literal'
  );
});

test('鮮度検査は確認日から14日を超えた状態を検出する', () => {
  const staleNow = addUtcDays(verificationDateAsUtcNoon(verificationDate), 15);

  assert.throws(
    () => validateLatestHub(latestHtml, {
      enforceFreshness: true,
      maxAgeDays: 14,
      now: staleNow
    }),
    /公式確認から15日経過/
  );
});

test('次回確認目安の期限超過は明示的な監視時だけ失敗させる', () => {
  const result = validateLatestHub(latestHtml);
  const latestNextCheck = result.nextCheckDates
    .map(date => new Date(`${date}T00:00:00Z`))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const overdueNow = addUtcDays(latestNextCheck, 1);

  assert.doesNotThrow(() => validateLatestHub(latestHtml, {
    enforceFreshness: true,
    maxAgeDays: 365,
    now: overdueNow
  }));

  assert.throws(
    () => validateLatestHub(latestHtml, {
      enforceFreshness: true,
      enforceNextCheckDates: true,
      maxAgeDays: 365,
      now: overdueNow
    }),
    /次回確認目安を\d+日超過/
  );
});

test('次回確認目安は公式確認日より前に設定できない', () => {
  const previousDay = addUtcDays(new Date(`${verificationDate}T00:00:00Z`), -1)
    .toISOString()
    .slice(0, 10);
  const invalidHtml = latestHtml.replace(/次回確認目安:\s*\d{4}-\d{2}-\d{2}頃/, `次回確認目安: ${previousDay}頃`);

  assert.throws(
    () => validateLatestHub(invalidHtml),
    /次回確認目安が最終確認日より前/
  );
});

test('鮮度検査は日本時間の日付をUTC前日の未来日と誤判定しない', () => {
  const justAfterMidnightJst = new Date(`${verificationDate}T00:30:00+09:00`);

  assert.doesNotThrow(() => validateLatestHub(latestHtml, {
    enforceFreshness: true,
    maxAgeDays: 14,
    now: justAfterMidnightJst
  }));
});

test('運用手順は日付だけの更新と個別オファーの一般化を禁止する', () => {
  const guide = fs.readFileSync(path.join(root, 'docs', 'LATEST_HUB_MAINTENANCE.md'), 'utf8');

  assert.ok(guide.includes('確認せずに日付だけを更新しない'));
  assert.ok(guide.includes('個別オファーを全利用者向けの情報として掲載しない'));
  assert.ok(guide.includes('latest/index.html'));
  assert.ok(guide.includes('CONTENT_DATE_OVERRIDES'));
});

test('最新情報ハブの共通計測はサイトルートの同意管理を読み込む', () => {
  const components = fs.readFileSync(path.join(root, 'blog', 'components.js'), 'utf8');

  assert.match(components, /const isLatestPage = window\.location\.pathname\.includes\('\/latest\/'\);/);
  assert.match(components, /isArticlePageTop \|\| isBlogPage \|\| isLatestPage/);
});
