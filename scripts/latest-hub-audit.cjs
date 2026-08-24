'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_OFFICIAL_ANSWERS = Object.freeze([
  '9077312',
  '9077192',
  '9080348',
  '9077247'
]);
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function extractVerificationDate(html) {
  const match = html.match(/<time\s+data-latest-verified\s+datetime="(\d{4}-\d{2}-\d{2})"/i);
  if (!match) {
    throw new Error('最新情報ハブに公式情報の最終確認日がありません');
  }
  return match[1];
}

function extractNextCheckDates(html) {
  const dates = [...html.matchAll(/次回確認目安:\s*(\d{4}-\d{2}-\d{2})頃/g)]
    .map(match => match[1]);

  if (dates.length === 0) {
    throw new Error('最新情報ハブに次回確認目安がありません');
  }

  return [...new Set(dates)];
}

function getLatestHubVerificationDate(rootDir) {
  const latestPath = path.join(rootDir, 'latest', 'index.html');
  return extractVerificationDate(fs.readFileSync(latestPath, 'utf8'));
}

function parseDateOnly(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`確認日を日付として解析できません: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`確認日を日付として解析できません: ${value}`);
  }

  return date;
}

function getJstDateOnly(now) {
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()));
}

function validateLatestHub(html, options = {}) {
  const verificationDate = extractVerificationDate(html);
  const nextCheckDates = extractNextCheckDates(html);
  const requiredText = [
    '公開公式情報で確認',
    'アカウント内で確認',
    '未確認情報',
    'data-source-scope="public"',
    'data-source-scope="account"'
  ];

  for (const text of requiredText) {
    if (!html.includes(text)) {
      throw new Error(`最新情報ハブの確認範囲表示が不足しています: ${text}`);
    }
  }

  for (const answerId of REQUIRED_OFFICIAL_ANSWERS) {
    if (!html.includes(`support.google.com/googleplay/answer/${answerId}`)) {
      throw new Error(`最新情報ハブの公式参照が不足しています: ${answerId}`);
    }
  }

  const verifiedAt = parseDateOnly(verificationDate);
  for (const nextCheckDate of nextCheckDates) {
    const nextCheckAt = parseDateOnly(nextCheckDate);
    if (nextCheckAt.getTime() < verifiedAt.getTime()) {
      throw new Error(`最新情報ハブの次回確認目安が最終確認日より前です: ${nextCheckDate}`);
    }
  }

  if (options.enforceFreshness === true || options.enforceNextCheckDates === true) {
    const now = options.now instanceof Date ? options.now : new Date();
    const todayJst = getJstDateOnly(now);

    if (verifiedAt.getTime() > todayJst.getTime()) {
      throw new Error(`最新情報ハブの確認日が未来です: ${verificationDate}`);
    }

    if (options.enforceFreshness === true) {
      const maxAgeDays = Number.isFinite(options.maxAgeDays) ? options.maxAgeDays : 14;
      const ageDays = Math.floor((todayJst.getTime() - verifiedAt.getTime()) / DAY_MS);
      if (ageDays > maxAgeDays) {
        throw new Error(`最新情報ハブの公式確認から${ageDays}日経過しています（上限${maxAgeDays}日）`);
      }
    }

    if (options.enforceNextCheckDates === true) {
      for (const nextCheckDate of nextCheckDates) {
        const nextCheckAt = parseDateOnly(nextCheckDate);
        const overdueDays = Math.floor((todayJst.getTime() - nextCheckAt.getTime()) / DAY_MS);
        if (overdueDays > 0) {
          throw new Error(`最新情報ハブの次回確認目安を${overdueDays}日超過しています: ${nextCheckDate}`);
        }
      }
    }
  }

  return { verificationDate, nextCheckDates };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const verificationDate = getLatestHubVerificationDate(root);
  const html = fs.readFileSync(path.join(root, 'latest', 'index.html'), 'utf8');
  validateLatestHub(html, {
    enforceFreshness: process.argv.includes('--fresh'),
    enforceNextCheckDates: process.argv.includes('--next-check'),
    maxAgeDays: 14
  });
  console.log(`最新情報ハブ検証成功: ${verificationDate}`);
}

module.exports = {
  REQUIRED_OFFICIAL_ANSWERS,
  extractNextCheckDates,
  extractVerificationDate,
  getLatestHubVerificationDate,
  validateLatestHub
};
