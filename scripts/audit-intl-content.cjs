'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const snapshotPath = path.join(root, 'docs/data/intl-content-demand-2026-09-03.json');
const outputPath = path.join(root, 'docs/INTL_CONTENT_AUDIT_2026-09-03.md');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const locales = ['en', 'ko', 'tw'];

function stripHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchOne(html, regex) {
  return html.match(regex)?.[1]?.trim() || '';
}

function uniqueOfficialSources(html) {
  const urls = [...html.matchAll(/href="(https:\/\/(?:support\.google\.com\/googleplay|play\.google\.com)[^"]+)"/g)].map(m => m[1]);
  return [...new Set(urls)].length;
}

function answerBeforeCalculator(html) {
  const calc = html.indexOf('data-generated-intl-article-prompt="true"');
  if (calc < 0) return false;
  const candidates = [
    html.indexOf('class="intro"'),
    html.indexOf('class="section answer-box"'),
    html.search(/id="[^"]*(?:quick|answer|check)[^"]*"/i)
  ].filter(index => index >= 0);
  if (!candidates.length) return false;
  return Math.min(...candidates) < calc;
}

function structuralScore(html) {
  let score = 0;
  if (answerBeforeCalculator(html)) score += 2;
  if (/<table\b/i.test(html)) score += 1;
  if (/FAQPage|<h2>FAQ<\/h2>|<h2[^>]*>FAQ<\/h2>/i.test(html)) score += 1;
  if (/related-links-section|관련 가이드|相關指南|Related guides/i.test(html)) score += 1;
  if (uniqueOfficialSources(html) > 0) score += 1;
  if (/callout|answer-box|table-wrap/i.test(html)) score += 1;
  return score;
}

function classification(relativeUrl, demand) {
  if (demand?.priority) return demand.priority;
  if (!demand) return 'M';
  if ((demand.organicSessions || 0) >= 10 && (demand.engagementRate || 0) < 55) return 'C';
  if ((demand.organicSessions || 0) >= 5) return 'B';
  return 'M';
}

const rows = [];
for (const locale of locales) {
  const dir = path.join(root, locale, 'articles');
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.html') && name !== 'index.html').sort()) {
    const relativePath = `${locale}/articles/${name}`;
    const relativeUrl = `/${relativePath}`;
    const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const demand = snapshot.pages[relativeUrl] || null;
    rows.push({
      locale: locale.toUpperCase(),
      relativePath,
      relativeUrl,
      title: matchOne(html, /<title>([^<]+)<\/title>/i),
      modified: matchOne(html, /<meta name="last-modified" content="([^"]+)">/i) || '-',
      priority: classification(relativeUrl, demand),
      action: demand?.action || 'monitor',
      organicSessions: demand?.organicSessions ?? 0,
      engagementRate: demand?.engagementRate ?? null,
      avgEngagementSec: demand?.avgEngagementSec ?? null,
      sourceCount: uniqueOfficialSources(html),
      answerFirst: answerBeforeCalculator(html),
      hasTable: /<table\b/i.test(html),
      hasFaq: /FAQPage|<h2>FAQ<\/h2>|<h2[^>]*>FAQ<\/h2>/i.test(html),
      hasRelated: /related-links-section|관련 가이드|相關指南|Related guides/i.test(html),
      textChars: stripHtml(html).length,
      structuralScore: structuralScore(html),
      gsc: demand?.gsc || ''
    });
  }
}

const order = { C: 0, B: 1, A: 2, M: 3 };
const priorityRows = rows
  .filter(row => row.priority === 'C' || row.priority === 'B')
  .sort((a, b) => (order[a.priority] - order[b.priority]) || (b.organicSessions - a.organicSessions) || a.relativePath.localeCompare(b.relativePath));

const counts = rows.reduce((acc, row) => {
  acc[row.priority] = (acc[row.priority] || 0) + 1;
  return acc;
}, {});

function pct(value) {
  return value == null ? '-' : `${value.toFixed(2)}%`;
}

function yesNo(value) {
  return value ? 'Y' : 'N';
}

const lines = [];
lines.push('# International Content Audit — 2026-09-03');
lines.push('');
lines.push('## Purpose');
lines.push('');
lines.push('This audit prioritizes **where to invest next**, not whether an article is "good" or "bad" in isolation. It combines a fixed GA4/Search Console snapshot with repeatable HTML structure checks so future audits can be compared on the same basis.');
lines.push('');
lines.push(`- GA4 landing/page period: ${snapshot.ga4Period}`);
lines.push(`- Search Console period: ${snapshot.gscPeriod}`);
lines.push(`- Inventory scanned: ${rows.length} EN/KO/TW article pages`);
lines.push(`- Priority counts: A=${counts.A || 0}, B=${counts.B || 0}, C=${counts.C || 0}, Monitor=${counts.M || 0}`);
lines.push('- HK/IN have no article corpus yet, so their regional gaps are tracked separately below.');
lines.push('');
lines.push('## Priority meaning');
lines.push('');
lines.push('- **A — Maintain / observe:** already strong, or changed today and should be allowed to collect 7–14 days of data before another rewrite.');
lines.push('- **B — Targeted improvement:** demand exists and the page mostly works, but snippet, first answer, internal role, or one decision branch can be sharpened.');
lines.push('- **C — Redesign candidate:** demand exists but CTR/engagement/intent alignment is weak enough to justify deeper work.');
lines.push('- **M — Monitor:** current demand evidence is too small or absent. This is not a quality penalty; it is a resource-allocation decision.');
lines.push('- **N — New intent gap:** no existing article cleanly owns the intent. New content is created only when evidence is strong enough to avoid thin duplication.');
lines.push('');
lines.push('## Quality contract used for review');
lines.push('');
lines.push('High-priority international pages should converge toward: direct answer before calculator CTA; concrete examples; comparison table when a choice exists; troubleshooting branches for error intent; clear boundary between official facts and account-specific state; explicit next action; local search vocabulary; current official source; and internal links that assign one owner page per intent.');
lines.push('');
lines.push('## Current B/C queue');
lines.push('');
lines.push('| Priority | Page | Organic sessions | Engagement | Avg sec | Answer before calc | Structure score / 7 | Action |');
lines.push('|---|---|---:|---:|---:|:---:|---:|---|');
for (const row of priorityRows) {
  lines.push(`| ${row.priority} | \`${row.relativeUrl}\` | ${row.organicSessions} | ${pct(row.engagementRate)} | ${row.avgEngagementSec ?? '-'} | ${yesNo(row.answerFirst)} | ${row.structuralScore} | ${row.action} |`);
}
lines.push('');
lines.push('### Wave 3 selection');
lines.push('');
lines.push('1. **KO quests** — page-one visibility for `구글 플레이 퀘스트` variants but zero clicks in the measured query sample, plus 6s average engagement. Add a Korean search-first diagnostic before any calculator prompt.');
lines.push('2. **KO Super Ticket** — the largest unaddressed Korean intent cluster: generic Super Ticket terms plus `얻는 법` / `사용법`. Front-load acquisition/use rules and the fact that using a ticket replaces the previous Play Points reward.');
lines.push('3. **EN gift cards** — the page currently answers “do gift cards earn points?” while Search Console also exposes “how do Play Points become gift cards?”. One page should own both directions to avoid a duplicate article.');
lines.push('');
lines.push('## New-intent gaps');
lines.push('');
for (const gap of snapshot.gaps) {
  lines.push(`### ${gap.priority} — ${gap.intent}`);
  lines.push('');
  lines.push(`- Evidence: ${gap.evidence}`);
  lines.push(`- Decision: ${gap.decision}`);
  lines.push('');
}
lines.push('## Complete EN / KO / TW inventory');
lines.push('');
lines.push('| P | Lang | Page | Modified | Sessions | ER | Answer first | Table | FAQ | Official sources | Action |');
lines.push('|---|---|---|---|---:|---:|:---:|:---:|:---:|---:|---|');
for (const row of rows.sort((a, b) => (order[a.priority] - order[b.priority]) || (b.organicSessions - a.organicSessions) || a.relativePath.localeCompare(b.relativePath))) {
  lines.push(`| ${row.priority} | ${row.locale} | \`${row.relativeUrl}\` | ${row.modified} | ${row.organicSessions} | ${pct(row.engagementRate)} | ${yesNo(row.answerFirst)} | ${yesNo(row.hasTable)} | ${yesNo(row.hasFaq)} | ${row.sourceCount} | ${row.action} |`);
}
lines.push('');
lines.push('## Re-run');
lines.push('');
lines.push('```bash');
lines.push('node scripts/audit-intl-content.cjs');
lines.push('```');
lines.push('');
lines.push('Refresh the demand snapshot before using this report for a later decision window. Do not compare a freshly edited page against a full prior-month baseline without marking the observation window.');

fs.writeFileSync(outputPath, lines.join('\n') + '\n');
console.log(`[intl-audit] wrote ${path.relative(root, outputPath)} with ${rows.length} article rows`);
