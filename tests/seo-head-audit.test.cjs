'use strict';

const assert = require('node:assert');
const path = require('node:path');
const test = require('node:test');
const { auditSeoHeads, formatIssue } = require('../scripts/seo-head-audit.cjs');

const root = path.resolve(__dirname, '..');

test('送信サイトマップの全URLでSEO Headの基本契約を守る', () => {
  const report = auditSeoHeads(root);

  console.log(
    `SEO Head Audit: sitemap=${report.sitemapFiles.length}, urls=${report.submittedUrlCount}, pages=${report.auditedPageCount}, errors=${report.errors.length}, warnings=${report.warnings.length}`
  );
  report.warnings.forEach(issue => console.log(`SEO warning: ${formatIssue(issue)}`));

  assert.deepStrictEqual(
    report.errors.map(formatIssue),
    [],
    `SEO Head監査で${report.errors.length}件のエラーを検出しました`
  );
});
