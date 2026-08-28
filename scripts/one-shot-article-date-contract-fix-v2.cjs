'use strict';

// First apply the permanent-code/test patch prepared by the initial one-shot script.
require('./one-shot-article-date-contract-fix.cjs');

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'scripts/article-date-contract.cjs');
const registryPath = path.join(root, 'scripts/article-official-verification-dates.json');

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`hotfix target not found: ${label}`);
  return source.replace(before, after);
}

function fixUnicodeIdempotency() {
  let source = fs.readFileSync(contractPath, 'utf8');
  source = replaceOnce(
    source,
    `    ja: /^(?:📅\\s*)?(?:公開|更新|公式情報確認)\\b|^著者[:：]/,\n    en: /^(?:Published|Updated|Official info checked)\\b/i,\n    ko: /^(?:공개|업데이트|공식 정보 확인)\\b/,\n    tw: /^(?:發布|更新|官方資訊確認)\\b/`,
    `    ja: /^(?:📅\\s*)?(?:公開|更新|公式情報確認)(?:\\s|[:：])|^著者[:：]/,\n    en: /^(?:Published|Updated|Official info checked)\\b/i,\n    ko: /^(?:공개|업데이트|공식 정보 확인)(?:\\s|[:：])/,\n    tw: /^(?:發布|更新|官方資訊確認)(?:\\s|[:：])/`,
    'Unicode generated-label boundaries'
  );
  fs.writeFileSync(contractPath, source, 'utf8');
}

function getMainFile(relativePath) {
  try {
    return execFileSync('git', ['show', `origin/main:${relativePath}`], { cwd: root, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function metaDate(html, name) {
  const tag = String(html).match(new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${escapeRegExp(name)}["'])[^>]*>`, 'i'))?.[0] || '';
  return tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2]?.slice(0, 10) || '';
}

function updateNamedMeta(html, name, value) {
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\bname\\s*=\\s*["']${escapeRegExp(name)}["'])[^>]*>`, 'i');
  const tag = String(html).match(pattern)?.[0];
  if (!tag) return html;
  return String(html).replace(pattern, tag.replace(/\bcontent\s*=\s*(["']).*?\1/i, `content="${value}"`));
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function explicitOfficialDate(html) {
  const isoPatterns = [
    /Official (?:information|info|sources?) (?:checked|verified)(?: on|:)\s*(\d{4}-\d{2}-\d{2})/i,
    /Last official(?: source)? check(?:ed)?(?: on|:)\s*(\d{4}-\d{2}-\d{2})/i,
    /공식[^<\n]{0,40}(?:확인|검증)[^<\n]{0,20}(\d{4}-\d{2}-\d{2})/,
    /官方[^<\n]{0,40}(?:確認|查核|驗證)[^<\n]{0,20}(\d{4}-\d{2}-\d{2})/
  ];
  for (const pattern of isoPatterns) {
    const match = String(html).match(pattern);
    if (match) return match[1];
  }

  const ja = String(html).match(/最終公式確認日：\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (ja) return isoDate(ja[1], ja[2], ja[3]);

  const en = String(html).match(/(?:Official (?:information|info|sources?) (?:checked|verified)|Last official(?: source)? check(?:ed)?)(?: on|:)?\s*([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/i);
  if (en) {
    const months = { january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8, september:9, october:10, november:11, december:12 };
    const month = months[en[1].toLowerCase()];
    if (month) return isoDate(en[3], month, en[2]);
  }

  const ko = String(html).match(/공식[^<\n]{0,40}(?:확인|검증)[^<\n]{0,20}(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (ko) return isoDate(ko[1], ko[2], ko[3]);
  const tw = String(html).match(/官方[^<\n]{0,40}(?:確認|查核|驗證)[^<\n]{0,20}(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (tw) return isoDate(tw[1], tw[2], tw[3]);
  return '';
}

function restoreSemanticSourcesFromMain() {
  execFileSync('git', ['fetch', 'origin', 'main', '--quiet'], { cwd: root, stdio: 'inherit' });
  delete require.cache[require.resolve('./article-date-contract.cjs')];
  const contract = require('./article-date-contract.cjs');
  const articleFiles = contract.getArticleFiles(root);
  const currentRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const nextRegistry = {};
  let semanticModified = 0;
  let explicitOfficial = 0;

  for (const relativePath of articleFiles) {
    const mainHtml = getMainFile(relativePath);
    const currentPath = path.join(root, relativePath);
    let currentHtml = fs.readFileSync(currentPath, 'utf8');
    if (!mainHtml) {
      nextRegistry[relativePath] = currentRegistry[relativePath];
      continue;
    }

    const mainModified = metaDate(mainHtml, 'last-modified')
      || String(contract.extractArticleStructuredData(mainHtml)?.dateModified || '').slice(0, 10);
    if (!mainModified) throw new Error(`missing meaningful modified date in main: ${relativePath}`);
    currentHtml = updateNamedMeta(currentHtml, 'last-modified', mainModified);

    const mainVisible = contract.findVisibleDateMeta(mainHtml);
    const currentVisible = contract.findVisibleDateMeta(currentHtml);
    if (mainVisible && currentVisible) currentHtml = currentHtml.replace(currentVisible.pattern, mainVisible.html);
    fs.writeFileSync(currentPath, currentHtml, 'utf8');

    const explicit = explicitOfficialDate(mainHtml);
    if (explicit) explicitOfficial += 1;
    nextRegistry[relativePath] = explicit || mainModified;
    semanticModified += 1;
  }

  fs.writeFileSync(registryPath, `${JSON.stringify(nextRegistry, null, 2)}\n`, 'utf8');
  console.log(`[date-contract-v2] semantic-modified=${semanticModified}, explicit-official=${explicitOfficial}, articles=${articleFiles.length}`);
}

fixUnicodeIdempotency();
restoreSemanticSourcesFromMain();
