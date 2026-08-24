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
// 実ページの契約確認は起動時のスナップショットで行う。日付ロジックの境界値は
// 下の fixedDateHtml() で固定し、公開ページの日々の更新から単体テストを切り離す。
const latestHtml = fs.readFileSync(latestPath, 'utf8');
const verificationDate = extractVerificationDate(latestHtml);

function fixedDateHtml({ verified = '2026-08-24', nextCheck = '2026-08-28' } = {}) {
  return latestHtml
    .replace(
      /(<time\s+data-latest-verified\s+datetime=")\d{4}-\d{2}-\d{2}("[^>]*>)/i,
      `$1${verified}$2`
    )
    .replace(
      /次回確認目安:\s*\d{4}-\d{2}-\d{2}頃/g,
      `次回確認目安: ${nextCheck}頃`
    );
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
  const html = fixedDateHtml({ verified: '2026-08-01', nextCheck: '2026-08-31' });

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      maxAgeDays: 14,
      now: new Date('2026-08-16T12:00:00+09:00')
    }),
    /公式確認から15日経過/
  );
});

test('次回確認目安の期限超過は明示的な監視時だけ失敗させる', () => {
  const html = fixedDateHtml({ verified: '2026-08-01', nextCheck: '2026-08-10' });
  const overdueNow = new Date('2026-08-11T12:00:00+09:00');

  assert.doesNotThrow(() => validateLatestHub(html, {
    enforceFreshness: true,
    maxAgeDays: 365,
    now: overdueNow
  }));

  assert.throws(
    () => validateLatestHub(html, {
      enforceFreshness: true,
      enforceNextCheckDates: true,
      maxAgeDays: 365,
      now: overdueNow
    }),
    /次回確認目安を1日超過/
  );
});

test('次回確認目安は公式確認日より前に設定できない', () => {
  const invalidHtml = fixedDateHtml({ verified: '2026-08-24', nextCheck: '2026-08-23' });

  assert.throws(
    () => validateLatestHub(invalidHtml),
    /次回確認目安が最終確認日より前/
  );
});

test('鮮度検査は日本時間の日付をUTC前日の未来日と誤判定しない', () => {
  const html = fixedDateHtml({ verified: '2026-08-24', nextCheck: '2026-08-28' });

  assert.doesNotThrow(() => validateLatestHub(html, {
    enforceFreshness: true,
    maxAgeDays: 14,
    now: new Date('2026-08-24T00:30:00+09:00')
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
